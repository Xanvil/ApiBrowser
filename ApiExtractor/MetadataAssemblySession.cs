using System.Reflection;
using Acad.ApiExtractor.Models;

namespace Acad.ApiExtractor;

/// <summary>在隔离的元数据上下文中加载程序集，无需解析 WPF 等运行时依赖。</summary>
public sealed class MetadataAssemblySession : IDisposable
{
    private readonly MetadataLoadContext _context;
    private readonly List<(Assembly Assembly, XmlDocumentationReader? Xml, string Name)> _assemblies = [];

    public MetadataAssemblySession(ExtractorManifest manifest)
    {
        var resolverPaths = BuildResolverPaths(manifest);
        _context = new MetadataLoadContext(new PathAssemblyResolver(resolverPaths));

        foreach (var assemblyRef in manifest.Assemblies)
        {
            var path = AssemblyResolver.ResolveAssemblyPath(assemblyRef);
            if (_assemblies.Any(a => string.Equals(a.Name, assemblyRef.Name, StringComparison.OrdinalIgnoreCase)))
                continue;

            var assembly = _context.LoadFromAssemblyPath(path);
            var xml = XmlDocumentationReader.TryLoad(path);
            _assemblies.Add((assembly, xml, assemblyRef.Name));
            Console.WriteLine($"  已加载 {assemblyRef.Name} (metadata)");
        }
    }

    public IEnumerable<(Assembly Assembly, XmlDocumentationReader? Xml, string Name)> Assemblies => _assemblies;

    public void Dispose() => _context.Dispose();

    private static string[] BuildResolverPaths(ExtractorManifest manifest)
    {
        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var assemblyRef in manifest.Assemblies)
        {
            var path = AssemblyResolver.ResolveAssemblyPath(assemblyRef);
            paths.Add(path);

            var dir = Path.GetDirectoryName(path);
            if (dir != null)
            {
                foreach (var dll in Directory.GetFiles(dir, "*.dll"))
                    paths.Add(dll);
            }
        }

        AddReferenceAssemblyPaths(paths);
        AddPackageAssemblyPaths(paths, "system.drawing.common", "8.0.0", "lib", "net8.0");

        return paths.ToArray();
    }

    private static void AddReferenceAssemblyPaths(HashSet<string> paths)
    {
        var nugetRoot = Environment.GetEnvironmentVariable("NUGET_PACKAGES")
            ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".nuget", "packages");

        var refRoot = Path.Combine(
            nugetRoot,
            "microsoft.netframework.referenceassemblies.net48",
            "1.0.3",
            "build",
            ".NETFramework",
            "v4.8");

        if (!Directory.Exists(refRoot))
            return;

        foreach (var dll in Directory.GetFiles(refRoot, "*.dll", SearchOption.AllDirectories))
            paths.Add(dll);
    }

    private static void AddPackageAssemblyPaths(
        HashSet<string> paths,
        string packageFolder,
        string version,
        params string[] subPath)
    {
        var nugetRoot = Environment.GetEnvironmentVariable("NUGET_PACKAGES")
            ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".nuget", "packages");

        var dir = Path.Combine(new[] { nugetRoot, packageFolder, version }.Concat(subPath).ToArray());
        if (!Directory.Exists(dir))
            return;

        foreach (var dll in Directory.GetFiles(dir, "*.dll"))
            paths.Add(dll);
    }
}
