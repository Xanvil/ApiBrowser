import { contains, event, inherits, method, prop, stubType, typeNode, usesType } from '../helpers'
import type { ApiEdge, ApiNode } from '../../types/api'

const TYPE_ID = 'type:Application'
const CORE_ID = 'type:CoreApplication'

export const applicationType = typeNode(
  TYPE_ID,
  'Application',
  'Autodesk.AutoCAD.ApplicationServices.Application',
  'AutoCAD .NET API 根对象；继承 Core.Application，并扩展菜单、状态栏、上下文菜单等 UI 相关成员。插件中常用别名 AcadApp。',
  ['public', 'static'],
)

export const coreApplicationType = stubType(
  CORE_ID,
  'Core.Application',
  'Autodesk.AutoCAD.ApplicationServices.Core.Application',
  '核心 Application 类；提供 DocumentManager、ShowModalWindow(WPF)、系统变量与进程级事件。',
)

// ── 属性（Core + ApplicationServices）──
const properties: ApiNode[] = [
  prop('Application', 'DocumentManager', 'DocumentCollection', '管理所有打开的 Document；插件最常用的入口属性。', ['public', 'static']),
  prop('Application', 'MainWindow', 'Window', 'AutoCAD 主窗口。'),
  prop('Application', 'IsQuiescent', 'bool', '当前是否有命令、LISP 或 ARX 命令正在执行。'),
  prop('Application', 'HasPickFirst', 'bool', '是否存在预选择（PickFirst）集。'),
  prop('Application', 'IsInPlaceServer', 'bool', '是否处于就地嵌入服务器模式。'),
  prop('Application', 'IsInBackgroundMode', 'bool', '是否处于后台模式。'),
  prop('Application', 'Version', 'Version', '当前运行的 AutoCAD 实例版本。'),
  prop('Application', 'UserConfigurationManager', 'UserConfigurationManager', '用户配置管理器。'),
  prop('Application', 'Publisher', 'Publisher', '发布（Plot/Publish）相关对象。'),
  prop('Application', 'LongTransactionManager', 'LongTransactionManager', '长事务管理器。'),
  prop('Application', 'AcadApplication', 'object', '底层 COM AcadApplication 对象。'),
  prop('Application', 'DocumentWindowCollection', 'DocumentWindowCollection', 'DocumentWindow 对象集合。'),
  prop('Application', 'StatusBar', 'StatusBar', 'AutoCAD 状态栏。'),
  prop('Application', 'Preferences', 'Preferences', '应用程序首选项。'),
  prop('Application', 'MenuBar', 'MenuBar', '菜单栏。'),
  prop('Application', 'MenuGroups', 'MenuGroupCollection', '菜单组集合。'),
  prop('Application', 'InfoCenter', 'InfoCenter', 'InfoCenter 工具栏与管理器。'),
]

// ── 方法 ──
const methods: ApiNode[] = [
  method(
    'Application',
    'ShowModalWindow',
    'bool? ShowModalWindow(Window window)',
    'bool?',
    '插件内显示 WPF 模态窗的正确方式；禁止使用 Window.ShowDialog()。',
    ['public', 'static'],
    [`var dialog = new DemoDialog();
bool? ok = AcadApp.ShowModalWindow(dialog);`],
    'ShowModalWindow_WPF',
  ),
  method('Application', 'ShowModalWindow', 'bool? ShowModalWindow(Window window, Window owner)', 'bool?', '带 owner 的 WPF 模态窗重载。', ['public', 'static'], undefined, 'ShowModalWindow_WPF_owner'),
  method('Application', 'ShowModalWindow', 'bool? ShowModalWindow(IntPtr owner, Window window)', 'bool?', '指定 Win32 父窗口句柄的模态窗重载。', ['public', 'static'], undefined, 'ShowModalWindow_IntPtr_WPF'),
  method('Application', 'ShowModelessWindow', 'void ShowModelessWindow(Window window)', 'void', '显示 WPF 非模态窗。', ['public', 'static'], undefined, 'ShowModelessWindow_WPF'),
  method('Application', 'ShowAlertDialog', 'void ShowAlertDialog(string message)', 'void', '显示 Alert 对话框。', ['public', 'static']),
  method('Application', 'Quit', 'void Quit()', 'void', '退出 AutoCAD 应用程序。', ['public', 'static']),
  method('Application', 'SetSystemVariable', 'void SetSystemVariable(string name, object value)', 'void', '设置 AutoCAD 系统变量。', ['public', 'static']),
  method('Application', 'GetSystemVariable', 'object GetSystemVariable(string name)', 'object', '读取 AutoCAD 系统变量。', ['public', 'static']),
  method('Application', 'TryGetSystemVariable', 'bool TryGetSystemVariable(string name, out object value)', 'bool', '安全读取系统变量，失败时不抛异常。', ['public', 'static']),
  method('Application', 'EvaluateDiesel', 'string EvaluateDiesel(string expression)', 'string', '计算 Diesel 表达式。', ['public', 'static']),
  method('Application', 'UpdateScreen', 'void UpdateScreen()', 'void', '刷新屏幕显示。', ['public', 'static']),
  method('Application', 'IsFileLocked', 'bool IsFileLocked(string fileName)', 'bool', '判断文件是否被锁定。', ['public', 'static']),
  method('Application', 'GetWhoHasInfo', 'WhoHasInfo GetWhoHasInfo(string pathname)', 'WhoHasInfo', '获取谁正在编辑指定 DWG 的信息。', ['public', 'static']),
  method('Application', 'Invoke', 'ResultBuffer Invoke(ResultBuffer args)', 'ResultBuffer', '调用 ObjectARX acedInvoke。', ['public', 'static']),
  method('Application', 'LoadJSScript', 'void LoadJSScript(Uri urlJSFile)', 'void', '加载并执行 JavaScript 脚本。', ['public', 'static']),
  method('Application', 'AddDefaultContextMenuExtension', 'void AddDefaultContextMenuExtension(ContextMenuExtension ext)', 'void', '添加默认上下文（右键）菜单扩展。', ['public', 'static']),
  method('Application', 'RemoveDefaultContextMenuExtension', 'void RemoveDefaultContextMenuExtension(ContextMenuExtension ext)', 'void', '移除默认上下文菜单扩展。', ['public', 'static']),
  method('Application', 'AddObjectContextMenuExtension', 'void AddObjectContextMenuExtension(RXClass cls, ContextMenuExtension ext)', 'void', '为指定运行时类添加对象右键菜单。', ['public', 'static']),
  method('Application', 'RemoveObjectContextMenuExtension', 'void RemoveObjectContextMenuExtension(RXClass cls, ContextMenuExtension ext)', 'void', '移除对象右键菜单扩展。', ['public', 'static']),
  method('Application', 'LoadPartialMenu', 'void LoadPartialMenu(string filename)', 'void', '加载部分菜单到当前主菜单。', ['public', 'static']),
  method('Application', 'UnloadPartialMenu', 'void UnloadPartialMenu(string filename)', 'void', '卸载部分菜单。', ['public', 'static']),
  method('Application', 'LoadMainMenu', 'void LoadMainMenu(string filename)', 'void', '更换当前主菜单。', ['public', 'static']),
  method('Application', 'SetCurrentWorkspace', 'void SetCurrentWorkspace(string workspaceName)', 'void', '切换当前工作空间。', ['public', 'static']),
  method('Application', 'ReloadAllMenus', 'void ReloadAllMenus()', 'void', '刷新 UI 以反映菜单变更。', ['public', 'static']),
  method('Application', 'InvokeHelp', 'void InvokeHelp(string fileName, string topic)', 'void', '打开帮助文档指定主题。', ['public', 'static']),
  method('Application', 'InvokeContextHelp', 'void InvokeContextHelp(IntPtr window, int contextId, string helpPrefix)', 'void', '调用上下文帮助。', ['public', 'static']),
  method('Application', 'ToSystemDrawingPoint', 'Point ToSystemDrawingPoint(System.Windows.Point pt)', 'Point', 'WPF Point 转 System.Drawing.Point。', ['public', 'static']),
  method('Application', 'ToSystemDrawingSize', 'Size ToSystemDrawingSize(System.Windows.Size size)', 'Size', 'WPF Size 转 System.Drawing.Size。', ['public', 'static']),
]

// ── 事件 ──
const events: ApiNode[] = [
  event('Application', 'Idle', '应用程序进入空闲状态时触发。'),
  event('Application', 'BeginQuit', 'AutoCAD 开始关闭时触发。'),
  event('Application', 'QuitWillStart', '退出即将开始时触发。'),
  event('Application', 'QuitAborted', '退出被取消时触发。'),
  event('Application', 'BeginCloseAll', '开始关闭所有文档时触发。'),
  event('Application', 'SystemVariableChanging', '系统变量即将变更时触发。'),
  event('Application', 'SystemVariableChanged', '系统变量已变更时触发。'),
  event('Application', 'BeginDoubleClick', '双击开始时触发。'),
  event('Application', 'PreTranslateMessage', '消息翻译前触发。'),
]

export const applicationNodes: ApiNode[] = [
  applicationType,
  coreApplicationType,
  ...properties,
  ...methods,
  ...events,
]

export const applicationEdges: ApiEdge[] = [
  inherits(TYPE_ID, CORE_ID),
  ...properties.map((p) => contains(TYPE_ID, p)),
  ...methods.map((m) => contains(TYPE_ID, m)),
  ...events.map((e) => contains(TYPE_ID, e)),
  usesType(properties[0], 'type:DocumentManager'),
]
