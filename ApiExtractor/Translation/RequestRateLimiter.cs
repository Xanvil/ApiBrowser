namespace Acad.ApiExtractor.Translation;

/// <summary>
/// 双层滑动窗口限速：每秒最多 RPM/60 次，每分钟最多 RPM 次（可留余量）。
/// 收到 429 时全局冷却并自动降速。
/// </summary>
public sealed class RequestRateLimiter
{
    private readonly int _originalMaxPerMinute;
    private int _maxPerMinute;
    private int _maxPerSecond;
    private readonly Queue<DateTimeOffset> _minuteTimestamps = new();
    private readonly Queue<DateTimeOffset> _secondTimestamps = new();
    private readonly object _lock = new();
    private DateTimeOffset _cooldownUntil;
    private int _rateLimitEvents;

    /// <param name="rpm">目标 RPM。</param>
    /// <param name="margin">安全余量，默认 85% 避免踩线上限。</param>
    public RequestRateLimiter(int rpm, double margin = 0.85)
    {
        if (rpm <= 0)
            throw new ArgumentOutOfRangeException(nameof(rpm));

        _originalMaxPerMinute = Math.Max(1, (int)(rpm * margin));
        _maxPerMinute = _originalMaxPerMinute;
        _maxPerSecond = Math.Max(1, _maxPerMinute / 60);
    }

    public int MaxPerSecond => _maxPerSecond;
    public int MaxPerMinute => _maxPerMinute;

    public void ReportRateLimited(TimeSpan? retryAfter = null)
    {
        var events = Interlocked.Increment(ref _rateLimitEvents);
        lock (_lock)
        {
            var penalty = retryAfter ?? TimeSpan.FromSeconds(Math.Min(120, 20 + events * 10));
            var until = DateTimeOffset.UtcNow + penalty;
            if (until > _cooldownUntil)
                _cooldownUntil = until;

            var reducedSecond = Math.Max(1, _maxPerSecond / 2);
            var reducedMinute = Math.Max(reducedSecond * 10, _maxPerMinute / 2);
            if (reducedSecond < _maxPerSecond || reducedMinute < _maxPerMinute)
            {
                _maxPerSecond = reducedSecond;
                _maxPerMinute = reducedMinute;
                Console.WriteLine(
                    $"  速率限制: 检测到 429（第 {events} 次），全局冷却 {penalty.TotalSeconds:F0}s，" +
                    $"降至 {_maxPerSecond} 次/秒 / {_maxPerMinute} 次/分");
            }
        }
    }

    public async Task WaitAsync(CancellationToken cancellationToken = default)
    {
        while (true)
        {
            TimeSpan wait;
            lock (_lock)
            {
                var now = DateTimeOffset.UtcNow;
                Prune(_minuteTimestamps, now, TimeSpan.FromSeconds(60));
                Prune(_secondTimestamps, now, TimeSpan.FromSeconds(1));

                wait = TimeSpan.Zero;

                if (now < _cooldownUntil)
                    wait = _cooldownUntil - now;

                if (_minuteTimestamps.Count >= _maxPerMinute)
                {
                    var minuteWait = TimeSpan.FromSeconds(60) - (now - _minuteTimestamps.Peek()) + TimeSpan.FromMilliseconds(50);
                    if (minuteWait > wait)
                        wait = minuteWait;
                }

                if (_secondTimestamps.Count >= _maxPerSecond)
                {
                    var secondWait = TimeSpan.FromSeconds(1) - (now - _secondTimestamps.Peek()) + TimeSpan.FromMilliseconds(50);
                    if (secondWait > wait)
                        wait = secondWait;
                }

                if (wait <= TimeSpan.Zero)
                {
                    _minuteTimestamps.Enqueue(now);
                    _secondTimestamps.Enqueue(now);
                    return;
                }

                if (wait < TimeSpan.FromMilliseconds(50))
                    wait = TimeSpan.FromMilliseconds(50);
            }

            await Task.Delay(wait, cancellationToken);
        }
    }

    private static void Prune(Queue<DateTimeOffset> queue, DateTimeOffset now, TimeSpan window)
    {
        while (queue.Count > 0 && now - queue.Peek() >= window)
            queue.Dequeue();
    }
}
