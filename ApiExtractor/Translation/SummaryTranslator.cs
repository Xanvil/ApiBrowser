using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Acad.ApiExtractor.Models;

namespace Acad.ApiExtractor.Translation;

public sealed class SummaryTranslator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = true,
    };

    private const string SystemPrompt = """
        你是 AutoCAD .NET API 文档翻译助手。将英文 API 说明翻译为简洁、准确的中文。
        保留类型名、方法名、属性名、命名空间等标识符的英文原文（如 Document、Transaction、Database）。
        只输出 JSON 数组，不要 markdown 代码块，不要额外解释。
        数组元素格式: {"key":"<fullName>","summary":"<中文说明>"}
        """;

    private readonly LlmTranslationOptions _options;
    private readonly object _annotationsLock = new();
    private readonly SemaphoreSlim _fileWriteLock = new(1, 1);
    private long _lastSaveTick;
    private const int SaveMinIntervalMs = 3000;

    public SummaryTranslator(LlmTranslationOptions options) => _options = options;

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_options.InputPath))
            throw new FileNotFoundException($"未找到输入文件: {_options.InputPath}");

        var loadSw = Stopwatch.StartNew();
        Console.WriteLine("正在加载 api-graph.json …");
        var graphJson = await File.ReadAllTextAsync(_options.InputPath, cancellationToken);
        Console.WriteLine($"  读取完成 {graphJson.Length / (1024 * 1024.0):F1} MB，{loadSw.ElapsedMilliseconds} ms");

        var graph = JsonSerializer.Deserialize<ApiGraphDto>(graphJson, JsonOptions)
            ?? throw new InvalidOperationException("api-graph.json 解析失败");
        Console.WriteLine($"  解析 {graph.Nodes.Count} 节点，{loadSw.ElapsedMilliseconds} ms");

        var annotations = LoadOrCreateAnnotations();
        Console.WriteLine($"  已有翻译 {annotations.Entries.Count} 条，{loadSw.ElapsedMilliseconds} ms");
        annotations.SourceModel = _options.Model;
        annotations.TranslatedAt = DateTime.UtcNow.ToString("O");

        var candidates = graph.Nodes
            .Where(n => !string.IsNullOrWhiteSpace(n.Summary))
            .Select(n => new TranslationItem(n.FullName, n.Summary!.Trim()))
            .Where(item => !(_options.SkipExisting && annotations.Entries.ContainsKey(item.FullName)))
            .ToList();

        if (_options.MaxItems > 0)
            candidates = candidates.Take(_options.MaxItems).ToList();

        var batches = candidates
            .Chunk(_options.BatchSize)
            .Select((chunk, index) => new BatchJob(index + 1, chunk.ToList()))
            .ToList();

        Console.WriteLine(
            $"待翻译: {candidates.Count} 条（batch={_options.BatchSize}，并发请求={_options.Concurrency}，model={_options.Model}）");

        if (_options.Rpm > 0 && batches.Count > 0)
        {
            var effectiveRpm = (int)(_options.Rpm * 0.85);
            var rps = Math.Max(1, effectiveRpm / 60);
            var estMinutes = batches.Count / (double)rps / 60;
            Console.WriteLine(
                $"速率限制: {_options.Rpm} RPM（实际 {effectiveRpm}，{rps} 次/秒），约 {batches.Count} 次请求，串行下限 ≥ {estMinutes:F1} 分钟");
        }

        Console.WriteLine($"准备就绪，启动翻译（加载耗时 {loadSw.ElapsedMilliseconds} ms）…");

        if (batches.Count == 0)
        {
            await SaveAnnotationsIfDueAsync(annotations, cancellationToken, force: true);
            Console.WriteLine("无需翻译，已保存。");
            return;
        }

        using var client = new OpenAiCompatibleClient(
            _options.ApiUrl,
            _options.ApiKey,
            _options.Model,
            maxConnections: _options.Concurrency);
        RequestRateLimiter? rateLimiter = _options.Rpm > 0 ? new RequestRateLimiter(_options.Rpm) : null;

        var completedBatches = 0;
        var totalBatches = batches.Count;
        var startedAt = DateTimeOffset.UtcNow;

        var parallelOptions = new ParallelOptions
        {
            MaxDegreeOfParallelism = _options.Concurrency,
            CancellationToken = cancellationToken,
        };

        await Parallel.ForEachAsync(batches, parallelOptions, async (batch, ct) =>
        {
            if (_options.DelayMs > 0)
                await Task.Delay(_options.DelayMs, ct);

            var label = $"批次 {batch.Index}/{totalBatches}（{batch.Items.Count} 条）";
            var translated = await TranslateBatchWithRetryAsync(client, rateLimiter, batch.Items, label, ct);

            lock (_annotationsLock)
            {
                foreach (var (key, summary) in translated)
                {
                    var en = batch.Items.FirstOrDefault(i => i.FullName == key)?.SummaryEn;
                    annotations.Entries[key] = new AnnotationEntry
                    {
                        Summary = summary,
                        SummaryEn = en,
                    };
                }
            }

            try
            {
                await SaveAnnotationsIfDueAsync(annotations, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                Console.WriteLine($"  {label} 保存失败（不影响本批翻译，稍后重试保存）: {ex.Message}");
            }

            var done = Interlocked.Increment(ref completedBatches);
            var elapsed = (DateTimeOffset.UtcNow - startedAt).TotalSeconds;
            var rate = done / Math.Max(elapsed, 0.001);
            Console.WriteLine(
                $"{label} 完成 +{translated.Count} 条 | 进度 {done}/{totalBatches} | 累计 {annotations.Entries.Count} 条 | {rate:F2} 请求/秒");
        });

        await SaveAnnotationsIfDueAsync(annotations, cancellationToken, force: true);

        Console.WriteLine($"完成: {annotations.Entries.Count} 条中文说明");
        Console.WriteLine($"输出: {Path.GetFullPath(_options.OutputPath)}");
    }

    private async Task<Dictionary<string, string>> TranslateBatchWithRetryAsync(
        OpenAiCompatibleClient client,
        RequestRateLimiter? rateLimiter,
        List<TranslationItem> items,
        string label,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 8;
        Exception? lastError = null;
        var rateLimitHits = 0;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                if (rateLimiter != null)
                    await rateLimiter.WaitAsync(cancellationToken);

                Console.WriteLine($"{label} 开始…");
                return await TranslateBatchAsync(client, items, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (LlmRateLimitException ex)
            {
                lastError = ex;
                rateLimitHits++;
                rateLimiter?.ReportRateLimited(ex.RetryAfter);

                var delay = ex.RetryAfter ?? TimeSpan.FromSeconds(Math.Min(120, 15 + 10 * rateLimitHits));
                Console.WriteLine(
                    $"  {label} 速率限制 429，{delay.TotalSeconds:F0}s 后重试 ({attempt}/{maxAttempts})…");
                await Task.Delay(delay, cancellationToken);
            }
            catch (Exception ex) when (IsRateLimitError(ex))
            {
                lastError = ex;
                rateLimitHits++;
                rateLimiter?.ReportRateLimited(null);

                var delay = TimeSpan.FromSeconds(Math.Min(120, 15 + 10 * rateLimitHits));
                Console.WriteLine(
                    $"  {label} 速率限制 429，{delay.TotalSeconds:F0}s 后重试 ({attempt}/{maxAttempts})…");
                await Task.Delay(delay, cancellationToken);
            }
            catch (Exception ex)
            {
                lastError = ex;
                Console.WriteLine($"  {label} 失败 (尝试 {attempt}/{maxAttempts}): {ex.Message}");
                if (attempt < maxAttempts)
                    await Task.Delay(1000 * attempt, cancellationToken);
            }
        }

        throw lastError ?? new InvalidOperationException("翻译批次失败");
    }

    private static bool IsRateLimitError(Exception ex) =>
        ex.Message.Contains("(429)", StringComparison.Ordinal)
        || ex.Message.Contains("速率限制", StringComparison.Ordinal);

    private static async Task<Dictionary<string, string>> TranslateBatchAsync(
        OpenAiCompatibleClient client,
        List<TranslationItem> items,
        CancellationToken cancellationToken)
    {
        var payload = items.Select(i => new { key = i.FullName, summaryEn = i.SummaryEn }).ToList();
        var userPrompt = "请将以下 AutoCAD .NET API 英文说明翻译为中文，按 key 返回 JSON 数组：\n"
            + JsonSerializer.Serialize(payload, JsonOptions);

        var response = await client.CompleteChatAsync(SystemPrompt, userPrompt, cancellationToken);
        return ParseTranslationResponse(response, items);
    }

    private static Dictionary<string, string> ParseTranslationResponse(string response, List<TranslationItem> expected)
    {
        var json = ExtractJsonArray(response);
        using var doc = JsonDocument.Parse(json);
        var result = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var element in doc.RootElement.EnumerateArray())
        {
            if (!element.TryGetProperty("key", out var keyProp))
                continue;
            if (!element.TryGetProperty("summary", out var summaryProp))
                continue;

            var key = keyProp.GetString();
            var summary = summaryProp.GetString()?.Trim();
            if (string.IsNullOrEmpty(key) || string.IsNullOrWhiteSpace(summary))
                continue;

            result[key] = summary;
        }

        if (result.Count == 0)
            throw new InvalidOperationException("LLM 响应中未解析到任何翻译条目");

        var missing = expected.Where(i => !result.ContainsKey(i.FullName)).Select(i => i.FullName).Take(5).ToList();
        if (missing.Count > 0)
            Console.WriteLine($"  警告: 本批 {missing.Count}+ 条未返回翻译，例如: {string.Join(", ", missing)}");

        return result;
    }

    private static string ExtractJsonArray(string text)
    {
        var trimmed = text.Trim();
        var fence = Regex.Match(trimmed, @"```(?:json)?\s*(\[[\s\S]*?\])\s*```", RegexOptions.IgnoreCase);
        if (fence.Success)
            return fence.Groups[1].Value;

        var start = trimmed.IndexOf('[');
        var end = trimmed.LastIndexOf(']');
        if (start >= 0 && end > start)
            return trimmed[start..(end + 1)];

        throw new InvalidOperationException("无法从 LLM 响应中提取 JSON 数组");
    }

    private AnnotationsFile LoadOrCreateAnnotations()
    {
        if (!_options.SkipExisting || !File.Exists(_options.OutputPath))
            return new AnnotationsFile();

        try
        {
            var json = File.ReadAllText(_options.OutputPath);
            return JsonSerializer.Deserialize<AnnotationsFile>(json, JsonOptions) ?? new AnnotationsFile();
        }
        catch
        {
            Console.WriteLine("警告: 无法读取已有 annotations 文件，将新建。");
            return new AnnotationsFile();
        }
    }

    private async Task SaveAnnotationsIfDueAsync(
        AnnotationsFile file,
        CancellationToken cancellationToken,
        bool force = false)
    {
        if (!force)
        {
            var elapsed = Environment.TickCount64 - Interlocked.Read(ref _lastSaveTick);
            if (elapsed >= 0 && elapsed < SaveMinIntervalMs)
                return;
        }

        await _fileWriteLock.WaitAsync(cancellationToken);
        try
        {
            if (!force)
            {
                var elapsed = Environment.TickCount64 - Interlocked.Read(ref _lastSaveTick);
                if (elapsed >= 0 && elapsed < SaveMinIntervalMs)
                    return;
            }

            var path = Path.GetFullPath(_options.OutputPath);
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir))
                Directory.CreateDirectory(dir);

            string json;
            lock (_annotationsLock)
                json = JsonSerializer.Serialize(file, JsonOptions);

            var tmp = path + ".tmp";
            await File.WriteAllTextAsync(tmp, json, cancellationToken);
            File.Move(tmp, path, overwrite: true);
            Interlocked.Exchange(ref _lastSaveTick, Environment.TickCount64);
        }
        finally
        {
            _fileWriteLock.Release();
        }
    }

    private sealed record TranslationItem(string FullName, string SummaryEn);
    private sealed record BatchJob(int Index, List<TranslationItem> Items);
}
