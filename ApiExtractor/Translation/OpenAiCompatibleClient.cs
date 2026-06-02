using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Acad.ApiExtractor.Translation;

/// <summary>OpenAI 兼容的 Chat Completions 客户端。</summary>
public sealed class OpenAiCompatibleClient : IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _http;
    private readonly string _endpoint;
    private readonly string _model;

    public OpenAiCompatibleClient(string apiUrl, string apiKey, string model, int maxConnections = 256)
    {
        _model = model;
        _endpoint = NormalizeEndpoint(apiUrl);

        var handler = new SocketsHttpHandler
        {
            MaxConnectionsPerServer = Math.Max(16, maxConnections),
        };

        _http = new HttpClient(handler, disposeHandler: true)
        {
            Timeout = Timeout.InfiniteTimeSpan,
        };
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
    }

    public async Task<string> CompleteChatAsync(string systemPrompt, string userPrompt, CancellationToken cancellationToken = default)
    {
        var payload = new ChatRequest
        {
            Model = _model,
            Temperature = 0.2,
            Messages =
            [
                new ChatMessage { Role = "system", Content = systemPrompt },
                new ChatMessage { Role = "user", Content = userPrompt },
            ],
        };

        var json = JsonSerializer.Serialize(payload, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var response = await _http.PostAsync(_endpoint, content, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var snippet = Truncate(body, 500);
            if ((int)response.StatusCode == 429)
                throw new LlmRateLimitException(429, snippet, ParseRetryAfter(response));

            throw new InvalidOperationException($"LLM 请求失败 ({(int)response.StatusCode}): {snippet}");
        }

        var chat = JsonSerializer.Deserialize<ChatResponse>(body, JsonOptions)
            ?? throw new InvalidOperationException("LLM 响应解析失败");

        var text = chat.Choices?.FirstOrDefault()?.Message?.Content?.Trim();
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException("LLM 返回空内容");

        return text;
    }

    public void Dispose() => _http.Dispose();

    private static string NormalizeEndpoint(string apiUrl)
    {
        var trimmed = apiUrl.Trim().TrimEnd('/');
        if (trimmed.EndsWith("/chat/completions", StringComparison.OrdinalIgnoreCase))
            return trimmed;

        return trimmed + "/chat/completions";
    }

    private static string Truncate(string text, int max) =>
        text.Length <= max ? text : text[..max] + "…";

    private static TimeSpan? ParseRetryAfter(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Retry-After", out var values))
            return null;

        var value = values.FirstOrDefault()?.Trim();
        if (string.IsNullOrEmpty(value))
            return null;

        if (int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var seconds))
            return TimeSpan.FromSeconds(Math.Clamp(seconds, 1, 300));

        if (DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var until))
        {
            var delay = until - DateTimeOffset.UtcNow;
            return delay > TimeSpan.Zero ? delay : TimeSpan.FromSeconds(5);
        }

        return null;
    }

    private sealed class ChatRequest
    {
        public required string Model { get; init; }
        public required List<ChatMessage> Messages { get; init; }
        public double Temperature { get; init; }
    }

    private sealed class ChatMessage
    {
        public required string Role { get; init; }
        public required string Content { get; init; }
    }

    private sealed class ChatResponse
    {
        public List<ChatChoice>? Choices { get; init; }
    }

    private sealed class ChatChoice
    {
        public ChatMessage? Message { get; init; }
    }
}
