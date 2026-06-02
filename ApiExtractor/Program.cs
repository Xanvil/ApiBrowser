using System.Text.Json;
using System.Text.Json.Serialization;
using Acad.ApiExtractor.Models;
using Acad.ApiExtractor.Translation;

namespace Acad.ApiExtractor;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false,
    };

    public static async Task<int> Main(string[] args)
    {
        try
        {
            if (args.Length > 0)
            {
                switch (args[0].ToLowerInvariant())
                {
                    case "translate":
                        return await RunTranslateAsync(args[1..]);
                    case "scan-catalog":
                        return RunScanCatalog(args[1..]);
                    case "help":
                    case "-h":
                    case "--help":
                        PrintHelp();
                        return 0;
                }
            }

            return RunExtract(args);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"错误: {ex.Message}");
            return 1;
        }
    }

    private static int RunExtract(string[] args)
    {
        if (HasHelp(args))
        {
            PrintHelp();
            return 0;
        }

        var (location, graphPath) = DataLocationParser.ParseExtract(args);
        var manifest = LoadManifest(location.ManifestPath);

        Console.WriteLine($"产品/版本: {location.Label}");
        Console.WriteLine($"清单: {location.ManifestPath}");
        Console.WriteLine($"提取 {manifest.DisplayName} …");

        VersionMetaWriter.Ensure(location, manifest);

        var graph = new ApiGraphExtractor(manifest).Extract();

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(graphPath))!);
        File.WriteAllText(graphPath, JsonSerializer.Serialize(graph, JsonOptions));

        var typeCount = graph.Nodes.Count(n => n.Kind is "type" or "interface");
        var memberCount = graph.Nodes.Count - typeCount;
        Console.WriteLine($"完成: {typeCount} 类型, {memberCount} 成员, {graph.Edges.Count} 边");
        Console.WriteLine($"输出: {Path.GetFullPath(graphPath)} ({new FileInfo(graphPath).Length / 1024} KB)");

        CatalogGenerator.Generate(location.DataRoot);
        return 0;
    }

    private static async Task<int> RunTranslateAsync(string[] args)
    {
        if (HasHelp(args))
        {
            PrintHelp();
            return 0;
        }

        var (location, inputPath, outputPath) = DataLocationParser.ParseTranslate(args);
        var options = ParseTranslateOptions(args, inputPath, outputPath);

        Console.WriteLine($"产品/版本: {location.Label}");
        Console.WriteLine($"输入: {Path.GetFullPath(options.InputPath)}");
        Console.WriteLine($"输出: {Path.GetFullPath(options.OutputPath)}");

        if (options.ConcurrencyAuto)
            Console.WriteLine($"并发: {MachineConcurrencyEstimator.Describe(options.Concurrency)}（自动）");
        else
            Console.WriteLine($"并发: {options.Concurrency} 个请求（手动）");
        if (options.ConcurrencyCappedByRpm)
            Console.WriteLine(
                $"  已按 RPM {options.Rpm} 裁剪并发: {options.ConcurrencyBeforeRpmCap} → {options.Concurrency}（上限 RPM/6）");
        if (options.Rpm > 0)
        {
            var effectiveRpm = (int)(options.Rpm * 0.85);
            Console.WriteLine($"速率: {options.Rpm} RPM（实际限速 {effectiveRpm}，约 {effectiveRpm / 60} 次/秒，留 15% 余量）");
        }

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(options.OutputPath))!);

        await new SummaryTranslator(options).RunAsync();

        CatalogGenerator.Generate(location.DataRoot);
        return 0;
    }

    private static int RunScanCatalog(string[] args)
    {
        if (HasHelp(args))
        {
            PrintHelp();
            return 0;
        }

        CatalogGenerator.Generate();
        return 0;
    }

    private static LlmTranslationOptions ParseTranslateOptions(
        string[] args,
        string inputPath,
        string outputPath)
    {
        string? apiUrl = null;
        string? apiKey = null;
        string? model = null;
        string? apiKeyEnv = "API_EXTRACTOR_LLM_KEY";
        var batchSize = 15;
        var maxItems = 0;
        var skipExisting = true;
        var delayMs = 500;
        var rpm = 0;
        var concurrency = 0;
        var concurrencyExplicit = false;
        var delayMsExplicit = false;

        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--api-url" when i + 1 < args.Length:
                    apiUrl = args[++i];
                    break;
                case "--api-key" when i + 1 < args.Length:
                    apiKey = args[++i];
                    break;
                case "--api-key-env" when i + 1 < args.Length:
                    apiKeyEnv = args[++i];
                    break;
                case "--model" when i + 1 < args.Length:
                    model = args[++i];
                    break;
                case "--batch-size" when i + 1 < args.Length:
                    batchSize = int.Parse(args[++i]);
                    break;
                case "--max-items" when i + 1 < args.Length:
                    maxItems = int.Parse(args[++i]);
                    break;
                case "--rpm" when i + 1 < args.Length:
                    rpm = int.Parse(args[++i]);
                    break;
                case "--concurrency" or "-j" when i + 1 < args.Length:
                    concurrency = int.Parse(args[++i]);
                    concurrencyExplicit = true;
                    break;
                case "--delay-ms" when i + 1 < args.Length:
                    delayMs = int.Parse(args[++i]);
                    delayMsExplicit = true;
                    break;
                case "--no-skip-existing":
                    skipExisting = false;
                    break;
            }
        }

        apiKey ??= !string.IsNullOrEmpty(apiKeyEnv) ? Environment.GetEnvironmentVariable(apiKeyEnv) : null;

        if (string.IsNullOrWhiteSpace(apiUrl))
            throw new InvalidOperationException(
                "缺少 --api-url（LLM 接口地址，如 https://aiproxy.bja.sealos.run/v1/chat/completions 或 https://api.openai.com/v1）");
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException($"缺少 --api-key 或环境变量 {apiKeyEnv}");
        if (string.IsNullOrWhiteSpace(model))
            throw new InvalidOperationException("缺少 --model（模型名称）");

        if (rpm > 0 && !delayMsExplicit)
            delayMs = 0;

        var concurrencyAuto = !concurrencyExplicit || concurrency <= 0;
        if (concurrencyAuto)
            concurrency = MachineConcurrencyEstimator.Estimate();

        concurrency = Math.Max(1, concurrency);

        var concurrencyBeforeCap = concurrency;
        if (rpm > 0)
            concurrency = MachineConcurrencyEstimator.ApplyRpmCap(concurrency, rpm);

        return new LlmTranslationOptions
        {
            InputPath = inputPath,
            OutputPath = outputPath,
            ApiUrl = apiUrl,
            ApiKey = apiKey,
            Model = model,
            BatchSize = Math.Max(1, batchSize),
            MaxItems = maxItems,
            SkipExisting = skipExisting,
            DelayMs = Math.Max(0, delayMs),
            Rpm = Math.Max(0, rpm),
            Concurrency = concurrency,
            ConcurrencyAuto = concurrencyAuto,
            ConcurrencyCappedByRpm = rpm > 0 && concurrency < concurrencyBeforeCap,
            ConcurrencyBeforeRpmCap = concurrencyBeforeCap,
        };
    }

    private static ExtractorManifest LoadManifest(string path)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException($"未找到 manifest: {path}");

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<ExtractorManifest>(json, JsonOptions)
            ?? throw new InvalidOperationException("manifest 解析失败");
    }

    private static bool HasHelp(string[] args) =>
        args.Any(a => a is "-h" or "--help" or "help");

    private static void PrintHelp()
    {
        Console.WriteLine("""
            ApiExtractor — 从程序集生成 ApiBrowser 图数据，并支持大模型翻译

            数据目录约定:
              web/public/data/{product}/{version}/api-graph.json
              web/public/data/{product}/{version}/annotations.zh.json
              web/public/data/{product}/product.json          （可选，产品元数据）
              web/public/data/{product}/{version}/meta.json   （可选，版本元数据）
              web/public/data/catalog.json                    （scan-catalog 生成）

            提取清单:
              manifests/{product}/{version}.json

            用法:
              dotnet run --project Acad/ApiBrowser/ApiExtractor -- [extract 选项]
              dotnet run --project Acad/ApiBrowser/ApiExtractor -- translate [选项]
              dotnet run --project Acad/ApiBrowser/ApiExtractor -- scan-catalog

            通用:
              --product <id>          产品目录名（默认 autocad）
              --version <id>          版本目录名（默认 2021）
              -m, --manifest <path>   覆盖默认 manifests/{product}/{version}.json

            extract（默认）:
              -o, --output <path>     覆盖 api-graph.json 输出路径
              完成后自动写入 meta/product.json（若缺失）并刷新 catalog.json

            translate:
              -i, --input <path>      覆盖输入 api-graph.json
              -o, --output <path>     覆盖输出 annotations.zh.json
              --api-url / --api-key / --model / --rpm / --concurrency / --batch-size …
              完成后自动刷新 catalog.json

            scan-catalog:
              扫描 web/public/data 并生成 catalog.json

            示例:
              dotnet run -- --product autocad --version 2021
              dotnet run -- translate --product autocad --version 2021 ^
                --api-url https://aiproxy.bja.sealos.run/v1/chat/completions ^
                --api-key %API_EXTRACTOR_LLM_KEY% --model glm-4-flash --rpm 600
            """);
    }
}
