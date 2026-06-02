namespace Acad.ApiExtractor;

internal static class PathResolver
{
    /// <summary>定位 ApiBrowser/web/public/data 目录（从运行目录向上查找）。</summary>
    public static string ResolveWebDataDir()
    {
        var dir = AppContext.BaseDirectory;
        for (var i = 0; i < 10; i++)
        {
            var candidate = Path.Combine(dir, "web", "public", "data");
            if (Directory.Exists(candidate))
                return Path.GetFullPath(candidate);

            var parent = Directory.GetParent(dir);
            if (parent == null)
                break;
            dir = parent.FullName;
        }

        throw new DirectoryNotFoundException(
            "未找到 web/public/data 目录。请使用 -o 显式指定输出路径。");
    }

    /// <summary>默认输出：data/{product}/{version}/api-graph.json</summary>
    public static string DefaultApiGraphPath(string product = "autocad", string version = "2021") =>
        Path.Combine(ResolveWebDataDir(), product, version, "api-graph.json");

    public static string DefaultAnnotationsPath(string product = "autocad", string version = "2021") =>
        Path.Combine(ResolveWebDataDir(), product, version, "annotations.zh.json");

    public static string VersionDataDir(string product, string version) =>
        Path.Combine(ResolveWebDataDir(), product, version);
}
