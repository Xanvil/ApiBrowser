using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace Acad.ApiExtractor;

/// <summary>读取程序集配套的 XML 文档注释。</summary>
public sealed class XmlDocumentationReader
{
    private static readonly Regex SummaryRegex = new(
        @"<member name=""([^""]+)"">\s*<summary>(.*?)</summary>",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private readonly Dictionary<string, string> _summaries = new(StringComparer.Ordinal);

    public static XmlDocumentationReader? TryLoad(string assemblyPath)
    {
        var xmlPath = Path.ChangeExtension(assemblyPath, ".xml");
        if (!File.Exists(xmlPath))
            return null;

        var reader = new XmlDocumentationReader();
        reader.Load(xmlPath);
        return reader;
    }

    private void Load(string xmlPath)
    {
        var text = File.ReadAllText(xmlPath);
        try
        {
            LoadFromDocument(XDocument.Parse(text));
        }
        catch (Exception ex) when (ex is System.Xml.XmlException or InvalidOperationException)
        {
            Console.WriteLine($"  警告: XML 解析失败，改用容错模式 ({Path.GetFileName(xmlPath)})");
            LoadFromRegex(text);
        }
    }

    private void LoadFromDocument(XDocument doc)
    {
        foreach (var member in doc.Root?.Elements("members").Elements("member") ?? [])
        {
            var name = member.Attribute("name")?.Value;
            var summary = member.Element("summary")?.Value?.Trim();
            if (!string.IsNullOrEmpty(name) && !string.IsNullOrWhiteSpace(summary))
                _summaries[name] = NormalizeWhitespace(StripTags(summary));
        }
    }

    private void LoadFromRegex(string text)
    {
        foreach (Match match in SummaryRegex.Matches(text))
        {
            var name = match.Groups[1].Value;
            var summary = match.Groups[2].Value.Trim();
            if (!string.IsNullOrWhiteSpace(summary))
                _summaries[name] = NormalizeWhitespace(StripTags(summary));
        }
    }

    public string? GetTypeSummary(Type type) =>
        TryGet($"T:{GetTypeDocName(type)}");

    public string? GetMemberSummary(MemberInfo member) =>
        TryGet(GetMemberDocId(member));

    private string? TryGet(string docId) =>
        _summaries.TryGetValue(docId, out var summary) ? summary : null;

    private static string StripTags(string text) =>
        Regex.Replace(text, "<[^>]+>", " ");

    private static string NormalizeWhitespace(string text) =>
        string.Join(' ', text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    public static string GetMemberDocId(MemberInfo member)
    {
        return member switch
        {
            Type t => $"T:{GetTypeDocName(t)}",
            PropertyInfo p => $"P:{GetTypeDocName(p.DeclaringType!)}.{p.Name}",
            EventInfo e => $"E:{GetTypeDocName(e.DeclaringType!)}.{e.Name}",
            MethodInfo m => BuildMethodDocId(m),
            _ => throw new NotSupportedException($"Unsupported member: {member.MemberType}"),
        };
    }

    private static string BuildMethodDocId(MethodInfo method)
    {
        var sb = new StringBuilder();
        sb.Append("M:").Append(GetTypeDocName(method.DeclaringType!)).Append('.').Append(method.Name);

        if (method.IsGenericMethodDefinition)
        {
            sb.Append("``").Append(method.GetGenericArguments().Length);
        }

        var parameters = method.GetParameters();
        if (parameters.Length > 0)
        {
            sb.Append('(');
            sb.Append(string.Join(',', parameters.Select(p => GetTypeDocName(p.ParameterType))));
            sb.Append(')');
        }

        return sb.ToString();
    }

    private static string GetTypeDocName(Type type)
    {
        if (type.IsGenericTypeDefinition)
            return $"{type.Namespace}.{type.Name}";

        if (type.IsGenericType)
        {
            var baseName = type.FullName![..type.FullName!.IndexOf('`', StringComparison.Ordinal)];
            var args = string.Join(',', type.GetGenericArguments().Select(GetTypeDocName));
            return $"{baseName}{{{args}}}";
        }

        if (type.IsArray)
            return GetTypeDocName(type.GetElementType()!) + "[]";

        if (type.IsByRef)
            return GetTypeDocName(type.GetElementType()!) + "@";

        return type.FullName ?? type.Name;
    }
}
