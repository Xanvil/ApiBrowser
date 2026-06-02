namespace Acad.ApiExtractor;

internal static class DataLocationParser
{
    public static DataLocation Parse(string[] args, bool manifestExplicitDefault = false)
    {
        var product = "autocad";
        var version = "2021";
        string? manifestPath = null;
        var manifestExplicit = manifestExplicitDefault;

        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--product" when i + 1 < args.Length:
                    product = args[++i];
                    break;
                case "--version" when i + 1 < args.Length:
                    version = args[++i];
                    break;
                case "--manifest" or "-m" when i + 1 < args.Length:
                    manifestPath = Path.GetFullPath(args[++i]);
                    manifestExplicit = true;
                    break;
            }
        }

        manifestPath ??= ManifestResolver.ResolvePath(product, version);

        return new DataLocation
        {
            Product = product,
            Version = version,
            ManifestPath = manifestPath,
        };
    }

    /// <summary>解析 extract 参数：支持 -o 覆盖 graph 路径。</summary>
    public static (DataLocation Location, string GraphPath) ParseExtract(string[] args)
    {
        var location = Parse(args);
        var graphPath = location.GraphPath;
        var graphExplicit = false;

        for (var i = 0; i < args.Length; i++)
        {
            if (args[i] is "--output" or "-o" && i + 1 < args.Length)
            {
                graphPath = Path.GetFullPath(args[++i]);
                graphExplicit = true;
            }
        }

        if (!graphExplicit)
            graphPath = location.GraphPath;

        return (location, graphPath);
    }

    /// <summary>解析 translate 参数：支持 -i / -o 覆盖路径。</summary>
    public static (DataLocation Location, string InputPath, string OutputPath) ParseTranslate(string[] args)
    {
        var location = Parse(args);
        var inputPath = location.GraphPath;
        var outputPath = location.AnnotationsPath;
        var inputExplicit = false;
        var outputExplicit = false;

        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--input" or "-i" when i + 1 < args.Length:
                    inputPath = Path.GetFullPath(args[++i]);
                    inputExplicit = true;
                    break;
                case "--output" or "-o" when i + 1 < args.Length:
                    outputPath = Path.GetFullPath(args[++i]);
                    outputExplicit = true;
                    break;
            }
        }

        if (!inputExplicit)
            inputPath = location.GraphPath;
        if (!outputExplicit)
            outputPath = location.AnnotationsPath;

        return (location, inputPath, outputPath);
    }
}
