namespace Acad.ApiExtractor;

internal static class ManifestResolver
{
    /// <summary>manifests/{product}/{version}.json；autocad/2021 可回退根目录 manifest.json。</summary>
    public static string ResolvePath(string product, string version)
    {
        var baseDir = AppContext.BaseDirectory;
        var specific = Path.Combine(baseDir, "manifests", product, $"{version}.json");
        if (File.Exists(specific))
            return Path.GetFullPath(specific);

        var legacy = Path.Combine(baseDir, "manifest.json");
        if (File.Exists(legacy) && product.Equals("autocad", StringComparison.OrdinalIgnoreCase)
            && version == "2021")
            return Path.GetFullPath(legacy);

        throw new FileNotFoundException(
            $"未找到提取清单: manifests/{product}/{version}.json（请在 ApiExtractor/manifests/ 下添加）");
    }
}
