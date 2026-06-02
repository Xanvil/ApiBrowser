import { contains, event, method, prop, typeNode, usesType } from '../helpers'
import type { ApiEdge, ApiNode } from '../../types/api'

const TYPE_ID = 'type:DocumentManager'

export const documentManagerType = typeNode(
  TYPE_ID,
  'DocumentManager',
  'Autodesk.AutoCAD.ApplicationServices.DocumentCollection',
  '文档管理器，封装 AcApDocManager；管理所有打开的 Document，提供 MdiActiveDocument 等。实际 CLR 类型为 DocumentCollection。',
)

const properties: ApiNode[] = [
  prop('DocumentManager', 'MdiActiveDocument', 'Document', '当前 MDI 活动文档；无打开图纸时为 null。', ['public']),
  prop('DocumentManager', 'CurrentDocument', 'Document', '当前文档（与活动文档相关）。'),
  prop('DocumentManager', 'Count', 'int', '当前打开的文档数量。'),
  prop('DocumentManager', 'DocumentActivationEnabled', 'bool', '文档激活功能是否启用。'),
  prop('DocumentManager', 'IsApplicationContext', 'bool', '当前代码是否在应用程序上下文中执行。'),
  prop('DocumentManager', 'DefaultFormatForSave', 'DocumentSaveFormat', 'AutoCAD 默认保存格式。'),
]

const methods: ApiNode[] = [
  method('DocumentManager', 'GetDocument', 'Document GetDocument(Database db)', 'Document', '根据 Database 获取对应的 Document。'),
  method('DocumentManager', 'AppContextNewDocument', 'Document AppContextNewDocument(string templateFileName)', 'Document', '在应用上下文中同步新建图纸。'),
  method('DocumentManager', 'AppContextOpenDocument', 'Document AppContextOpenDocument(string fileName)', 'Document', '在应用上下文中同步打开图纸。'),
  method('DocumentManager', 'AppContextRecoverDocument', 'Document AppContextRecoverDocument(string fileName)', 'Document', '在应用上下文中恢复图纸。'),
  method('DocumentManager', 'ExecuteInApplicationContext', 'void ExecuteInApplicationContext(ExecuteInApplicationContextCallback cb, object data)', 'void', '在应用程序上下文中执行回调。'),
  method('DocumentManager', 'GetEnumerator', 'IEnumerator GetEnumerator()', 'IEnumerator', '枚举所有 Document。'),
  method('DocumentManager', 'CopyTo', 'void CopyTo(Document[] array, int index)', 'void', '复制到 Document 数组。'),
  method('DocumentManager', 'GetPendingDocumentForSwitch', 'Document GetPendingDocumentForSwitch()', 'Document', '获取待切换的目标文档。'),
]

const events: ApiNode[] = [
  event('DocumentManager', 'DocumentCreateStarted', '文档创建开始时触发。'),
  event('DocumentManager', 'DocumentCreated', '文档创建完成时触发。'),
  event('DocumentManager', 'DocumentCreationCanceled', '文档创建被取消时触发。'),
  event('DocumentManager', 'DocumentToBeDestroyed', '文档即将销毁时触发。'),
  event('DocumentManager', 'DocumentDestroyed', '文档已销毁时触发。'),
  event('DocumentManager', 'DocumentBecameCurrent', '文档成为当前文档时触发。'),
  event('DocumentManager', 'DocumentToBeActivated', '文档即将激活时触发。'),
  event('DocumentManager', 'DocumentActivated', '文档已激活时触发。'),
  event('DocumentManager', 'DocumentToBeDeactivated', '文档即将停用时触发。'),
  event('DocumentManager', 'DocumentActivationChanged', '文档激活状态变更时触发。'),
  event('DocumentManager', 'DocumentLockModeWillChange', '文档锁定模式即将变更时触发。'),
  event('DocumentManager', 'DocumentLockModeChangeVetoed', '文档锁定模式变更被否决时触发。'),
  event('DocumentManager', 'DocumentLockModeChanged', '文档锁定模式已变更时触发。'),
]

export const documentManagerNodes: ApiNode[] = [
  documentManagerType,
  ...properties,
  ...methods,
  ...events,
]

export const documentManagerEdges: ApiEdge[] = [
  ...properties.map((p) => contains(TYPE_ID, p)),
  ...methods.map((m) => contains(TYPE_ID, m)),
  ...events.map((e) => contains(TYPE_ID, e)),
  usesType(properties[0], 'type:Document'),
  usesType(properties[1], 'type:Document'),
]
