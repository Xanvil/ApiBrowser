using System.Text.Json;
using System.Text.Json.Serialization;

namespace Acad.ApiExtractor;

/// <summary>扫描 web/public/data 目录并生成 catalog.json（与 web/scripts/scan-catalog.mjs 一致）。</summary>
internal static class CatalogGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = true,
    };

    public static string Generate(string? dataRoot = null)
    {
        dataRoot ??= PathResolver.ResolveWebDataDir();
        var products = ScanProducts(dataRoot);

        if (products.Count == 0)
        {
            var legacy = ScanLegacyRoot(dataRoot);
            if (legacy != null)
                products.Add(legacy);
        }

        products.Sort((a, b) => string.Compare(a.Name, b.Name, StringComparison.Ordinal));

        var catalog = new CatalogDoc
        {
            GeneratedAt = DateTime.UtcNow.ToString("O"),
            Products = products,
        };

        var outPath = Path.Combine(dataRoot, "catalog.json");
        File.WriteAllText(outPath, JsonSerializer.Serialize(catalog, JsonOptions));

        var versionCount = products.Sum(p => p.Versions.Count);
        Console.WriteLine($"目录索引: {outPath}（{products.Count} 产品, {versionCount} 版本）");
        return outPath;
    }

    private static List<CatalogProductDoc> ScanProducts(string dataRoot)
    {
        var products = new List<CatalogProductDoc>();

        foreach (var productDir in Directory.EnumerateDirectories(dataRoot))
        {
            var productId = Path.GetFileName(productDir);
            if (productId.StartsWith('.'))
                continue;

            var product = ScanProduct(dataRoot, productId, productDir);
            if (product != null)
                products.Add(product);
        }

        return products;
    }

    private static CatalogProductDoc? ScanProduct(string dataRoot, string productId, string productDir)
    {
        var productMeta = ReadJson<ProductMetaDoc>(Path.Combine(productDir, "product.json")) ?? new ProductMetaDoc();
        var versions = new List<CatalogVersionDoc>();

        foreach (var versionDir in Directory.EnumerateDirectories(productDir))
        {
            var versionId = Path.GetFileName(versionDir);
            var version = ScanVersion(productId, versionId, versionDir);
            if (version != null)
                versions.Add(version);
        }

        if (versions.Count == 0)
            return null;

        versions.Sort((a, b) => string.Compare(b.Id, a.Id, StringComparison.OrdinalIgnoreCase));

        return new CatalogProductDoc
        {
            Id = productId,
            Name = productMeta.Name ?? TitleCase(productId),
            Vendor = productMeta.Vendor ?? "",
            Accent = productMeta.Accent ?? "#2563eb",
            Description = productMeta.Description ?? "",
            Versions = versions,
        };
    }

    private static CatalogVersionDoc? ScanVersion(string productId, string versionId, string versionDir)
    {
        var graphFile = Path.Combine(versionDir, "api-graph.json");
        var meta = ReadJson<VersionMetaDoc>(Path.Combine(versionDir, "meta.json")) ?? new VersionMetaDoc();
        var hasGraph = File.Exists(graphFile);

        if (!hasGraph && !string.Equals(meta.Status, "planned", StringComparison.OrdinalIgnoreCase))
            return null;

        var urlBase = $"/data/{productId}/{versionId}";
        var annotationsFile = Path.Combine(versionDir, "annotations.zh.json");

        return new CatalogVersionDoc
        {
            Id = versionId,
            DisplayName = meta.DisplayName ?? $"{TitleCase(productId)} {versionId}",
            Platform = meta.Platform ?? "",
            Description = meta.Description ?? "",
            Status = hasGraph ? "available" : "planned",
            GraphUrl = hasGraph ? $"{urlBase}/api-graph.json" : null,
            AnnotationsUrl = File.Exists(annotationsFile) ? $"{urlBase}/annotations.zh.json" : null,
        };
    }

    private static CatalogProductDoc? ScanLegacyRoot(string dataRoot)
    {
        var legacyGraph = Path.Combine(dataRoot, "api-graph.json");
        if (!File.Exists(legacyGraph))
            return null;

        Console.WriteLine("提示: 检测到旧版 data/api-graph.json，请迁移到 data/{product}/{version}/");

        var annotationsFile = Path.Combine(dataRoot, "annotations.zh.json");
        return new CatalogProductDoc
        {
            Id = "autocad",
            Name = "AutoCAD",
            Vendor = "Autodesk",
            Accent = "#c8102e",
            Description = "（旧版根目录数据，建议迁移到 data/autocad/2021/）",
            Versions =
            [
                new CatalogVersionDoc
                {
                    Id = "2021",
                    DisplayName = "AutoCAD .NET 2021",
                    Platform = ".NET",
                    Description = "",
                    Status = "available",
                    GraphUrl = "/data/api-graph.json",
                    AnnotationsUrl = File.Exists(annotationsFile) ? "/data/annotations.zh.json" : null,
                },
            ],
        };
    }

    private static T? ReadJson<T>(string path) where T : class
    {
        if (!File.Exists(path))
            return null;
        try
        {
            return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private static string TitleCase(string id) =>
        string.Join(' ', id.Split('-', '_').Select(s =>
            s.Length > 0 ? char.ToUpperInvariant(s[0]) + s[1..] : s));

    private sealed class CatalogDoc
    {
        public required string GeneratedAt { get; init; }
        public required List<CatalogProductDoc> Products { get; init; }
    }

    private sealed class CatalogProductDoc
    {
        public required string Id { get; init; }
        public required string Name { get; init; }
        public required string Vendor { get; init; }
        public required string Accent { get; init; }
        public required string Description { get; init; }
        public required List<CatalogVersionDoc> Versions { get; init; }
    }

    private sealed class CatalogVersionDoc
    {
        public required string Id { get; init; }
        public required string DisplayName { get; init; }
        public required string Platform { get; init; }
        public required string Description { get; init; }
        public required string Status { get; init; }
        public string? GraphUrl { get; init; }
        public string? AnnotationsUrl { get; init; }
    }

    private sealed class ProductMetaDoc
    {
        public string? Name { get; init; }
        public string? Vendor { get; init; }
        public string? Accent { get; init; }
        public string? Description { get; init; }
    }

    private sealed class VersionMetaDoc
    {
        public string? DisplayName { get; init; }
        public string? Platform { get; init; }
        public string? Description { get; init; }
        public string? Status { get; init; }
    }
}
