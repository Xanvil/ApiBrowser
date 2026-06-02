namespace Acad.ApiExtractor;

/// <summary>产品 + 版本对应的数据目录与文件路径。</summary>
internal sealed class DataLocation
{
    public required string Product { get; init; }
    public required string Version { get; init; }
    public required string ManifestPath { get; init; }

    public string DataRoot => PathResolver.ResolveWebDataDir();
    public string ProductDir => Path.Combine(DataRoot, Product);
    public string VersionDir => PathResolver.VersionDataDir(Product, Version);
    public string GraphPath => Path.Combine(VersionDir, "api-graph.json");
    public string AnnotationsPath => Path.Combine(VersionDir, "annotations.zh.json");
    public string MetaPath => Path.Combine(VersionDir, "meta.json");
    public string ProductMetaPath => Path.Combine(ProductDir, "product.json");

    public string Label => $"{Product}/{Version}";
}
