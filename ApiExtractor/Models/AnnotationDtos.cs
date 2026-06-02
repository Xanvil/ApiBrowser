namespace Acad.ApiExtractor.Models;

public sealed class AnnotationsFile
{
    public int Version { get; set; } = 1;
    public string? SourceModel { get; set; }
    public string? TranslatedAt { get; set; }
    public Dictionary<string, AnnotationEntry> Entries { get; set; } = new(StringComparer.Ordinal);
}

public sealed class AnnotationEntry
{
    public required string Summary { get; init; }
    public string? SummaryEn { get; init; }
}
