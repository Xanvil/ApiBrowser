using System.Reflection;
using Acad.ApiExtractor.Models;

namespace Acad.ApiExtractor;

public sealed class ApiGraphExtractor
{
    private readonly ExtractorManifest _manifest;
    private readonly List<ApiNodeDto> _nodes = [];
    private readonly List<ApiEdgeDto> _edges = [];
    private readonly Dictionary<string, ApiNodeDto> _typeByFullName = new(StringComparer.Ordinal);
    private readonly Dictionary<string, ApiNodeDto> _typeBySimpleName = new(StringComparer.Ordinal);
    private readonly List<(Type Type, XmlDocumentationReader? Xml)> _extractedTypes = [];
    private readonly HashSet<string> _edgeKeys = new(StringComparer.Ordinal);

    private const BindingFlags DeclaredMemberFlags =
        BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly;

    public ApiGraphExtractor(ExtractorManifest manifest) => _manifest = manifest;

    public ApiGraphDto Extract()
    {
        using var session = new MetadataAssemblySession(_manifest);

        foreach (var (assembly, xml, name) in session.Assemblies)
        {
            Console.WriteLine($"提取 {name} …");
            ExtractAssembly(assembly, xml);
        }

        foreach (var (type, _) in _extractedTypes)
            AddInheritanceEdges(type);

        AddTypeReferenceEdges();

        return new ApiGraphDto
        {
            SdkId = _manifest.SdkId,
            DisplayName = _manifest.DisplayName,
            Nodes = _nodes,
            Edges = _edges,
        };
    }

    private void ExtractAssembly(Assembly assembly, XmlDocumentationReader? xml)
    {
        Type[] types;
        try
        {
            types = assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            types = ex.Types.Where(t => t != null).Cast<Type>().ToArray();
            Console.WriteLine($"  警告: 部分类型未能加载，已跳过。");
        }

        foreach (var type in types.OrderBy(t => t.FullName, StringComparer.Ordinal))
        {
            if (!ShouldIncludeType(type))
                continue;

            try
            {
                ExtractType(type, xml);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  跳过类型 {type.FullName}: {ex.Message}");
            }
        }
    }

    private bool ShouldIncludeType(Type type)
    {
        if (type.FullName == null || type.Name.StartsWith('<') || type.IsSpecialName)
            return false;

        if (!type.IsPublic && !type.IsNestedPublic)
            return false;

        var ns = type.Namespace;
        if (string.IsNullOrEmpty(ns))
            return false;

        if (_manifest.ExcludeNamespaces?.Contains(ns) == true)
            return false;

        return _manifest.NamespacePrefixes.Any(prefix => ns.StartsWith(prefix, StringComparison.Ordinal));
    }

    private void ExtractType(Type type, XmlDocumentationReader? xml)
    {
        if (_typeByFullName.ContainsKey(type.FullName!))
            return;

        var kind = type.IsInterface ? "interface" : "type";
        var typeNode = new ApiNodeDto
        {
            Id = ApiIdBuilder.TypeId(type),
            Kind = kind,
            Name = type.Name,
            FullName = type.FullName!,
            Namespace = type.Namespace,
            Summary = xml?.GetTypeSummary(type),
            Modifiers = ApiIdBuilder.GetModifiers(type),
        };

        _nodes.Add(typeNode);
        _typeByFullName[type.FullName!] = typeNode;
        RegisterSimpleName(typeNode);
        _extractedTypes.Add((type, xml));

        foreach (var property in SafeGetProperties(type))
            ExtractProperty(type, property, xml);

        foreach (var method in SafeGetMethods(type))
            ExtractMethod(type, method, xml);

        foreach (var evt in SafeGetEvents(type))
            ExtractEvent(type, evt, xml);
    }

    private static IEnumerable<PropertyInfo> SafeGetProperties(Type type)
    {
        try
        {
            return type.GetProperties(DeclaredMemberFlags)
                .Where(p => p.GetMethod?.IsPublic == true || p.SetMethod?.IsPublic == true);
        }
        catch
        {
            return [];
        }
    }

    private static IEnumerable<MethodInfo> SafeGetMethods(Type type)
    {
        try
        {
            return type.GetMethods(DeclaredMemberFlags).Where(m => m.IsPublic && !m.IsSpecialName);
        }
        catch
        {
            return [];
        }
    }

    private static IEnumerable<EventInfo> SafeGetEvents(Type type)
    {
        try
        {
            return type.GetEvents(DeclaredMemberFlags).Where(e => e.AddMethod?.IsPublic == true);
        }
        catch
        {
            return [];
        }
    }

    private void ExtractProperty(Type declaringType, PropertyInfo property, XmlDocumentationReader? xml)
    {
        try
        {
            var node = new ApiNodeDto
            {
                Id = ApiIdBuilder.PropertyId(declaringType, property.Name),
                Kind = "property",
                Name = property.Name,
                FullName = $"{declaringType.FullName}.{property.Name}",
                PropertyType = ApiIdBuilder.DisplayTypeName(property.PropertyType),
                Signature = $"{ApiIdBuilder.DisplayTypeName(property.PropertyType)} {property.Name} {{ get; }}",
                Summary = xml?.GetMemberSummary(property),
                Modifiers = ApiIdBuilder.GetModifiers(property),
            };

            _nodes.Add(node);
            AddEdgeById("contains", ApiIdBuilder.TypeId(declaringType), node.Id, "属性");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  跳过属性 {declaringType.FullName}.{property.Name}: {ex.Message}");
        }
    }

    private void ExtractMethod(Type declaringType, MethodInfo method, XmlDocumentationReader? xml)
    {
        try
        {
            if (method.IsGenericMethodDefinition)
                return;

            var node = new ApiNodeDto
            {
                Id = ApiIdBuilder.MethodId(method),
                Kind = "method",
                Name = method.Name,
                FullName = $"{declaringType.FullName}.{method.Name}",
                ReturnType = ApiIdBuilder.DisplayTypeName(method.ReturnType),
                Signature = ApiIdBuilder.BuildMethodSignature(method),
                Summary = xml?.GetMemberSummary(method),
                Modifiers = ApiIdBuilder.GetModifiers(method),
            };

            _nodes.Add(node);
            AddEdgeById("contains", ApiIdBuilder.TypeId(declaringType), node.Id, "方法");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  跳过方法 {declaringType.FullName}.{method.Name}: {ex.Message}");
        }
    }

    private void ExtractEvent(Type declaringType, EventInfo evt, XmlDocumentationReader? xml)
    {
        try
        {
            var handlerType = evt.EventHandlerType;
            var node = new ApiNodeDto
            {
                Id = ApiIdBuilder.EventId(declaringType, evt.Name),
                Kind = "event",
                Name = evt.Name,
                FullName = $"{declaringType.FullName}.{evt.Name}",
                Signature = handlerType != null ? $"event {ApiIdBuilder.DisplayTypeName(handlerType)} {evt.Name}" : $"event {evt.Name}",
                Summary = xml?.GetMemberSummary(evt),
                Modifiers = ApiIdBuilder.GetModifiers(evt),
            };

            _nodes.Add(node);
            AddEdgeById("contains", ApiIdBuilder.TypeId(declaringType), node.Id, "事件");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  跳过事件 {declaringType.FullName}.{evt.Name}: {ex.Message}");
        }
    }

    private void AddInheritanceEdges(Type type)
    {
        try
        {
            var sourceId = ApiIdBuilder.TypeId(type);

            if (type.BaseType is { FullName: not null } baseType && baseType.FullName != "System.Object")
            {
                if (_typeByFullName.TryGetValue(baseType.FullName, out var target))
                    AddEdgeById("inherits", sourceId, target.Id, null);
            }

            foreach (var iface in type.GetInterfaces())
            {
                if (iface.FullName != null && _typeByFullName.TryGetValue(iface.FullName, out var target))
                    AddEdgeById("implements", sourceId, target.Id, null);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  跳过继承关系 {type.FullName}: {ex.Message}");
        }
    }

    private void AddTypeReferenceEdges()
    {
        foreach (var node in _nodes)
        {
            if (node.Kind == "property" && !string.IsNullOrEmpty(node.PropertyType))
            {
                var target = ResolveTypeId(node.PropertyType);
                if (target != null)
                    AddEdgeById("usesType", node.Id, target, null);
            }
            else if (node.Kind == "method" && !string.IsNullOrEmpty(node.ReturnType) && node.ReturnType != "void")
            {
                var target = ResolveTypeId(node.ReturnType);
                if (target != null)
                    AddEdgeById("returns", node.Id, target, null);
            }
        }
    }

    private string? ResolveTypeId(string typeName)
    {
        var normalized = typeName.TrimEnd('?');
        if (_typeBySimpleName.TryGetValue(normalized, out var byName))
            return byName.Id;

        var lastSegment = normalized.Split('.').LastOrDefault();
        if (lastSegment != null && _typeBySimpleName.TryGetValue(lastSegment, out byName))
            return byName.Id;

        return null;
    }

    private void RegisterSimpleName(ApiNodeDto typeNode)
    {
        _typeBySimpleName[typeNode.Name] = typeNode;
        _typeBySimpleName[typeNode.FullName] = typeNode;
    }

    private void AddEdgeById(string kind, string sourceId, string targetId, string? label)
    {
        var key = $"{sourceId}|{targetId}|{kind}";
        if (!_edgeKeys.Add(key))
            return;

        _edges.Add(new ApiEdgeDto
        {
            Id = $"{kind}:{sourceId}:{targetId}",
            Kind = kind,
            Source = sourceId,
            Target = targetId,
            Label = label,
        });
    }
}
