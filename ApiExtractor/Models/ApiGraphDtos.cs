namespace Acad.ApiExtractor.Models;

public sealed class ApiGraphDto
{
    public required string SdkId { get; init; }
    public required string DisplayName { get; init; }
    public required List<ApiNodeDto> Nodes { get; init; }
    public required List<ApiEdgeDto> Edges { get; init; }
}

public sealed class ApiNodeDto
{
    public required string Id { get; init; }
    public required string Kind { get; init; }
    public required string Name { get; init; }
    public required string FullName { get; init; }
    public string? Namespace { get; init; }
    public string? Summary { get; init; }
    public string? Signature { get; init; }
    public List<string>? Modifiers { get; init; }
    public string? ReturnType { get; init; }
    public string? PropertyType { get; init; }
    public List<string>? Examples { get; init; }
}

public sealed class ApiEdgeDto
{
    public required string Id { get; init; }
    public required string Kind { get; init; }
    public required string Source { get; init; }
    public required string Target { get; init; }
    public string? Label { get; init; }
}

public sealed class ExtractorManifest
{
    public required string SdkId { get; init; }
    public required string DisplayName { get; init; }
    public required List<AssemblyRef> Assemblies { get; init; }
    public required List<string> NamespacePrefixes { get; init; }
    public List<string>? ExcludeNamespaces { get; init; }
    /// <summary>产品目录名，如 autocad。</summary>
    public string? ProductId { get; init; }
    /// <summary>版本目录名，如 2021。</summary>
    public string? VersionId { get; init; }
    public string? ProductName { get; init; }
    public string? Vendor { get; init; }
    public string? Platform { get; init; }
    public string? Description { get; init; }
    public string? ProductDescription { get; init; }
    public string? Accent { get; init; }
}

public sealed class AssemblyRef
{
    public required string Name { get; init; }
    public required string Package { get; init; }
    public required string Version { get; init; }
}
