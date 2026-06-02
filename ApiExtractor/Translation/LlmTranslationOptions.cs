namespace Acad.ApiExtractor.Translation;

public sealed class LlmTranslationOptions
{
    public required string InputPath { get; init; }
    public required string OutputPath { get; init; }
    public required string ApiUrl { get; init; }
    public required string ApiKey { get; init; }
    public required string Model { get; init; }
    public int BatchSize { get; init; } = 15;
    public int MaxItems { get; init; }
    public bool SkipExisting { get; init; } = true;
    public int DelayMs { get; init; }
    /// <summary>每分钟最大请求数；实际发送速率 = Rpm/60 次/秒。</summary>
    public int Rpm { get; init; }
    /// <summary>最大同时 in-flight 的 HTTP 请求数（每批 = 1 次请求）。0 表示按本机能力自动估算。</summary>
    public int Concurrency { get; init; }
    public bool ConcurrencyAuto { get; init; }
    public bool ConcurrencyCappedByRpm { get; init; }
    public int ConcurrencyBeforeRpmCap { get; init; }
}
