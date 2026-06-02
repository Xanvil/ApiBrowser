namespace Acad.ApiExtractor.Translation;

/// <summary>LLM 接口返回 429 速率限制。</summary>
public sealed class LlmRateLimitException : Exception
{
    public TimeSpan? RetryAfter { get; }

    public LlmRateLimitException(int statusCode, string body, TimeSpan? retryAfter)
        : base($"LLM 请求失败 ({statusCode}): {body}")
    {
        RetryAfter = retryAfter;
    }
}
