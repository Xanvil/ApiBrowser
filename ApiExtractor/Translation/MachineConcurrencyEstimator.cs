namespace Acad.ApiExtractor.Translation;

/// <summary>根据本机 CPU 与可用内存估算可同时发起的 HTTP 请求数。</summary>
public static class MachineConcurrencyEstimator
{
    private const int MinConcurrency = 64;
    private const int MaxConcurrency = 8192;
    /// <summary>每个 in-flight 请求粗估占用内存（含请求/响应缓冲）。</summary>
    private const long EstimatedBytesPerRequest = 2 * 1024 * 1024;

    public static int ApplyRpmCap(int concurrency, int rpm)
    {
        if (rpm <= 0)
            return concurrency;

        // 保守 in-flight 上限：RPM/6（1800→300，600→100），避免 TPM/并发压垮上游
        var cap = Math.Max(32, rpm / 6);
        return Math.Min(concurrency, cap);
    }

    public static int Estimate()
    {
        var cores = Math.Max(1, Environment.ProcessorCount);
        var byCpu = cores * 64;

        var byMemory = MaxConcurrency;
        try
        {
            var available = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes;
            if (available > 0)
            {
                // 预留约 40% 内存给系统与其他进程
                byMemory = (int)Math.Min(MaxConcurrency, available * 0.6 / EstimatedBytesPerRequest);
            }
        }
        catch
        {
            // 无法读取内存信息时仅按 CPU 估算
        }

        return Math.Clamp(Math.Min(byCpu, byMemory), MinConcurrency, MaxConcurrency);
    }

    public static string Describe(int concurrency)
    {
        var cores = Environment.ProcessorCount;
        long availableMb = 0;
        try
        {
            var bytes = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes;
            if (bytes > 0)
                availableMb = bytes / (1024 * 1024);
        }
        catch
        {
            // ignore
        }

        return availableMb > 0
            ? $"{concurrency}（本机 {cores} 逻辑核，可用内存约 {availableMb} MB）"
            : $"{concurrency}（本机 {cores} 逻辑核）";
    }
}
