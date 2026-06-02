import { contains, event, method, prop, typeNode, usesType } from '../helpers'
import type { ApiEdge, ApiNode } from '../../types/api'

const TYPE_ID = 'type:Document'

export const documentType = typeNode(
  TYPE_ID,
  'Document',
  'Autodesk.AutoCAD.ApplicationServices.Document',
  '单张打开中的 DWG 托管包装（AcApDocument）；通过 Database 写图、Editor 交互。',
)

const properties: ApiNode[] = [
  prop('Document', 'Database', 'Database', '该 Document 对应的 DWG 图元数据库。', ['public']),
  prop('Document', 'Editor', 'Editor', '与该图绑定的 Editor（命令行、拾取）。', ['public']),
  prop('Document', 'Name', 'string', '文件名，如 Drawing1.dwg。'),
  prop('Document', 'TransactionManager', 'TransactionManager', '该文档的事务管理器。'),
  prop('Document', 'UserData', 'object', '用户自定义附加数据。'),
  prop('Document', 'GraphicsManager', 'GraphicsManager', '图形管理器。'),
  prop('Document', 'Window', 'DocumentWindow', '该文档关联的窗口对象。'),
  prop('Document', 'CommandInProgress', 'string', '当前正在执行的命令名。'),
  prop('Document', 'FormatForSave', 'DocumentSaveFormat', '保存时使用的格式。'),
  prop('Document', 'IsReadOnly', 'bool', '文档是否只读。'),
  prop('Document', 'IsActive', 'bool', '文档是否为活动文档。'),
  prop('Document', 'IsNamedDrawing', 'bool', '是否为已命名（已保存路径）的图纸。'),
]

const methods: ApiNode[] = [
  method(
    'Document',
    'SendStringToExecute',
    'void SendStringToExecute(string command, bool activate, bool wrapUpInactiveDoc, bool echoCommand)',
    'void',
    '异步向命令队列发送命令字符串；注意文档锁与转义。',
    ['public'],
    [`doc.SendStringToExecute("_.CIRCLE ", true, false, false);`],
  ),
  method('Document', 'LockDocument', 'DocumentLock LockDocument()', 'DocumentLock', '锁定文档以进行跨线程或异步操作。', ['public'], undefined, 'LockDocument_default'),
  method('Document', 'LockDocument', 'DocumentLock LockDocument(DocumentLockMode mode, string globalCommandName, string localCommandName, bool promptIfLocked)', 'DocumentLock', '指定锁定模式锁定文档。', ['public'], undefined, 'LockDocument_mode'),
  method('Document', 'LockMode', 'DocumentLockMode LockMode(bool bIncludeMyLocks)', 'DocumentLockMode', '查询文档锁定模式。', ['public'], undefined, 'LockMode_include'),
  method('Document', 'LockMode', 'DocumentLockMode LockMode()', 'DocumentLockMode', '查询当前文档锁定模式。', ['public'], undefined, 'LockMode_default'),
  method('Document', 'UpgradeDocOpen', 'void UpgradeDocOpen()', 'void', '升级文档打开权限。'),
  method('Document', 'DowngradeDocOpen', 'void DowngradeDocOpen(bool promptIfLocked)', 'void', '降级文档打开权限。'),
  method('Document', 'SetLispSymbol', 'void SetLispSymbol(string name, object value)', 'void', '设置 LISP 符号值。'),
  method('Document', 'GetLispSymbol', 'object GetLispSymbol(string name)', 'object', '读取 LISP 符号值。'),
  method('Document', 'Create', 'Document Create(IntPtr unmanagedPointer)', 'Document', '由非托管指针创建 Document 包装（内部使用）。', ['public', 'static']),
]

const events: ApiNode[] = [
  event('Document', 'CommandWillStart', '命令即将开始时触发。'),
  event('Document', 'CommandEnded', '命令正常结束时触发。'),
  event('Document', 'CommandCancelled', '命令被取消时触发。'),
  event('Document', 'CommandFailed', '命令执行失败时触发。'),
  event('Document', 'UnknownCommand', '未知命令输入时触发。'),
  event('Document', 'LispWillStart', 'LISP 即将开始时触发。'),
  event('Document', 'LispEnded', 'LISP 结束时触发。'),
  event('Document', 'LispCancelled', 'LISP 被取消时触发。'),
  event('Document', 'BeginDocumentClose', '文档开始关闭时触发。'),
  event('Document', 'CloseWillStart', '关闭即将开始时触发。'),
  event('Document', 'CloseAborted', '关闭被取消时触发。'),
  event('Document', 'ImpliedSelectionChanged', '隐式选择集变更时触发。'),
  event('Document', 'ViewChanged', '视图变更时触发。'),
  event('Document', 'LayoutSwitched', '布局已切换时触发。'),
  event('Document', 'LayoutSwitching', '布局即将切换时触发。'),
  event('Document', 'ModelessOperationWillStart', '无模态操作即将开始时触发。'),
  event('Document', 'ModelessOperationEnded', '无模态操作结束时触发。'),
]

export const documentNodes: ApiNode[] = [documentType, ...properties, ...methods, ...events]

export const documentEdges: ApiEdge[] = [
  ...properties.map((p) => contains(TYPE_ID, p)),
  ...methods.map((m) => contains(TYPE_ID, m)),
  ...events.map((e) => contains(TYPE_ID, e)),
  usesType(properties[0], 'type:Database'),
  usesType(properties[1], 'type:Editor'),
]
