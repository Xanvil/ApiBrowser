import type { ApiEdge, ApiNode } from '../types/api'

const NS = 'Autodesk.AutoCAD.ApplicationServices'

export function memberId(kind: string, owner: string, name: string): string {
  return `${kind}:${owner}.${name}`
}

export function prop(
  owner: string,
  name: string,
  propertyType: string,
  summary: string,
  modifiers: string[] = ['public'],
): ApiNode {
  return {
    id: memberId('prop', owner, name),
    kind: 'property',
    name,
    fullName: `${owner}.${name}`,
    signature: `${propertyType} ${name} { get; }`,
    propertyType,
    summary,
    modifiers,
  }
}

export function method(
  owner: string,
  name: string,
  signature: string,
  returnType: string,
  summary: string,
  modifiers: string[] = ['public'],
  examples?: string[],
  idKey?: string,
): ApiNode {
  return {
    id: memberId('method', owner, idKey ?? name),
    kind: 'method',
    name,
    fullName: `${owner}.${name}`,
    signature,
    returnType,
    summary,
    modifiers,
    examples,
  }
}

export function event(owner: string, name: string, summary: string): ApiNode {
  return {
    id: memberId('event', owner, name),
    kind: 'event',
    name,
    fullName: `${owner}.${name}`,
    signature: `event EventHandler ${name}`,
    summary,
    modifiers: ['public'],
  }
}

export function typeNode(
  id: string,
  name: string,
  fullName: string,
  summary: string,
  modifiers: string[] = ['public'],
  kind: 'type' | 'interface' = 'type',
): ApiNode {
  return {
    id,
    kind,
    name,
    fullName,
    namespace: NS,
    summary,
    modifiers,
  }
}

export function contains(typeId: string, member: ApiNode, label?: string): ApiEdge {
  const labels: Record<string, string> = {
    property: '属性',
    method: '方法',
    event: '事件',
  }
  return {
    id: `contains:${typeId}:${member.id}`,
    kind: 'contains',
    source: typeId,
    target: member.id,
    label: label ?? labels[member.kind] ?? '成员',
  }
}

export function usesType(propNode: ApiNode, targetTypeId: string): ApiEdge {
  return {
    id: `uses:${propNode.id}:${targetTypeId}`,
    kind: 'usesType',
    source: propNode.id,
    target: targetTypeId,
  }
}

export function inherits(subId: string, baseId: string): ApiEdge {
  return {
    id: `inherits:${subId}:${baseId}`,
    kind: 'inherits',
    source: subId,
    target: baseId,
  }
}

/** 仅用于类型引用的占位类型节点 */
export function stubType(id: string, name: string, fullName: string, summary: string): ApiNode {
  return typeNode(id, name, fullName, summary)
}
