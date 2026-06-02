using System.Text.Json;
using System.Text.Json.Serialization;
using Acad.ApiExtractor.Models;

namespace Acad.ApiExtractor;

/// <summary>确保 web/public/data/{product}/{version}/ 下的 meta.json、product.json 存在。</summary>
internal static class VersionMetaWriter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = true,
    };

    public static void Ensure(DataLocation location, ExtractorManifest manifest)
    {
        Directory.CreateDirectory(location.VersionDir);
        Directory.CreateDirectory(location.ProductDir);

        EnsureProductMeta(location, manifest);
        EnsureVersionMeta(location, manifest);
    }

    private static void EnsureProductMeta(DataLocation location, ExtractorManifest manifest)
    {
        if (File.Exists(location.ProductMetaPath))
            return;

        var productName = manifest.ProductName ?? TitleCase(location.Product);
        var doc = new Dictionary<string, object?>
        {
            ["name"] = productName,
            ["vendor"] = manifest.Vendor ?? "",
            ["accent"] = manifest.Accent ?? "#2563eb",
            ["description"] = manifest.ProductDescription ?? $"{productName} API",
        };

        WriteJson(location.ProductMetaPath, doc);
    }

    private static void EnsureVersionMeta(DataLocation location, ExtractorManifest manifest)
    {
        string? displayName = manifest.DisplayName;
        string? platform = manifest.Platform ?? "";
        string? description = manifest.Description ?? "";

        if (File.Exists(location.MetaPath))
        {
            var existing = ReadJson<VersionMetaDoc>(location.MetaPath);
            if (existing != null)
            {
                displayName = existing.DisplayName ?? displayName;
                platform = existing.Platform ?? platform;
                description = existing.Description ?? description;
            }
        }

        WriteJson(location.MetaPath, new VersionMetaDoc
        {
            DisplayName = displayName,
            Platform = platform,
            Description = description,
        });
    }

    private static void WriteJson(string path, object doc) =>
        File.WriteAllText(path, JsonSerializer.Serialize(doc, JsonOptions));

    private static T? ReadJson<T>(string path)
    {
        try
        {
            return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOptions);
        }
        catch
        {
            return default;
        }
    }

    private static string TitleCase(string id) =>
        string.Join(' ', id.Split('-', '_').Select(s =>
            s.Length > 0 ? char.ToUpperInvariant(s[0]) + s[1..] : s));

    private sealed class VersionMetaDoc
    {
        public string? DisplayName { get; init; }
        public string? Platform { get; init; }
        public string? Description { get; init; }
    }
}
