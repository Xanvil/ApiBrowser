using Acad.ApiExtractor.Models;

namespace Acad.ApiExtractor;

public static class AssemblyResolver
{
    public static string ResolveAssemblyPath(AssemblyRef reference)
    {
        var nugetRoot = Environment.GetEnvironmentVariable("NUGET_PACKAGES")
            ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".nuget", "packages");

        var packageFolder = reference.Package.ToLowerInvariant();
        var dllPath = Path.Combine(nugetRoot, packageFolder, reference.Version, "lib", "net47", $"{reference.Name}.dll");

        if (!File.Exists(dllPath))
        {
            throw new FileNotFoundException(
                $"未找到程序集 {reference.Name}。请先执行: dotnet restore Acad/Demo/Demo.csproj\n路径: {dllPath}");
        }

        return dllPath;
    }
}
