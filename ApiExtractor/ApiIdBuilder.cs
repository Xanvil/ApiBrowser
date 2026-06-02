using System.Reflection;
using System.Text;
using Acad.ApiExtractor.Models;

namespace Acad.ApiExtractor;

public static class ApiIdBuilder
{
    public static string TypeId(Type type) => $"type:{type.FullName}";

    public static string PropertyId(Type declaringType, string name) =>
        $"prop:{declaringType.FullName}.{name}";

    public static string EventId(Type declaringType, string name) =>
        $"event:{declaringType.FullName}.{name}";

    public static string MethodId(MethodInfo method)
    {
        var parameters = method.GetParameters();
        if (parameters.Length == 0)
            return $"method:{method.DeclaringType!.FullName}.{method.Name}";

        var sig = string.Join('_', parameters.Select(p => SimplifyTypeName(p.ParameterType)));
        return $"method:{method.DeclaringType!.FullName}.{method.Name}({sig})";
    }

    public static string DisplayTypeName(Type type)
    {
        if (type == typeof(void))
            return "void";
        if (type.IsByRef)
            return DisplayTypeName(type.GetElementType()!) + (type.Name.EndsWith('&') ? "" : "");
        if (type.IsGenericType)
        {
            var name = type.Name[..type.Name.IndexOf('`', StringComparison.Ordinal)];
            var args = string.Join(", ", type.GetGenericArguments().Select(DisplayTypeName));
            return $"{name}<{args}>";
        }
        if (type.IsArray)
            return DisplayTypeName(type.GetElementType()!) + "[]";

        return type.Name;
    }

    public static string BuildMethodSignature(MethodInfo method)
    {
        var returnType = DisplayTypeName(method.ReturnType);
        var parameters = method.GetParameters();
        var paramList = string.Join(", ", parameters.Select(p => $"{DisplayTypeName(p.ParameterType)} {p.Name}"));
        return $"{returnType} {method.Name}({paramList})";
    }

    public static List<string> GetModifiers(MemberInfo member)
    {
        var modifiers = new List<string>();

        if (member is MethodInfo or PropertyInfo or EventInfo or Type)
        {
            if (IsPublic(member))
                modifiers.Add("public");
            else if (IsProtected(member))
                modifiers.Add("protected");
            else if (IsInternal(member))
                modifiers.Add("internal");
            else if (IsPrivate(member))
                modifiers.Add("private");
        }

        if (member is MethodInfo { IsStatic: true } or PropertyInfo { GetMethod: { IsStatic: true } } or EventInfo { AddMethod: { IsStatic: true } })
            modifiers.Add("static");

        if (member is MethodInfo { IsAbstract: true, IsVirtual: true })
            modifiers.Add("abstract");
        else if (member is MethodInfo { IsVirtual: true })
            modifiers.Add("virtual");

        if (member is Type { IsAbstract: true, IsSealed: true })
            modifiers.Add("static");
        else if (member is Type { IsAbstract: true })
            modifiers.Add("abstract");
        else if (member is Type { IsSealed: true })
            modifiers.Add("sealed");

        return modifiers;
    }

    private static bool IsPublic(MemberInfo member) => member switch
    {
        MethodInfo m => m.IsPublic,
        PropertyInfo p => (p.GetMethod ?? p.SetMethod)?.IsPublic == true,
        EventInfo e => e.AddMethod?.IsPublic == true,
        Type t => t.IsPublic,
        _ => false,
    };

    private static bool IsProtected(MemberInfo member) => member switch
    {
        MethodInfo m => m.IsFamily || m.IsFamilyOrAssembly,
        PropertyInfo p => (p.GetMethod ?? p.SetMethod) is { IsFamily: true } or { IsFamilyOrAssembly: true },
        EventInfo e => e.AddMethod is { IsFamily: true } or { IsFamilyOrAssembly: true },
        Type t => t.IsNestedFamily || t.IsNestedFamORAssem,
        _ => false,
    };

    private static bool IsInternal(MemberInfo member) => member switch
    {
        MethodInfo m => m.IsAssembly || m.IsFamilyOrAssembly,
        PropertyInfo p => (p.GetMethod ?? p.SetMethod) is { IsAssembly: true } or { IsFamilyOrAssembly: true },
        EventInfo e => e.AddMethod is { IsAssembly: true } or { IsFamilyOrAssembly: true },
        Type t => t.IsNestedAssembly || t.IsNestedFamORAssem || (t.IsNotPublic && !t.IsNestedPrivate),
        _ => false,
    };

    private static bool IsPrivate(MemberInfo member) => member switch
    {
        MethodInfo m => m.IsPrivate,
        PropertyInfo p => (p.GetMethod ?? p.SetMethod)?.IsPrivate == true,
        EventInfo e => e.AddMethod?.IsPrivate == true,
        Type t => t.IsNestedPrivate,
        _ => false,
    };

    private static string SimplifyTypeName(Type type)
    {
        var sb = new StringBuilder(DisplayTypeName(type));
        foreach (var ch in Path.GetInvalidFileNameChars())
            sb.Replace(ch, '_');
        sb.Replace('<', '_').Replace('>', '_').Replace(',', '_').Replace(' ', '_');
        return sb.ToString();
    }
}
