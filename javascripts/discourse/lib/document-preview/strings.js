// Reader-facing text. The rest of this component is written for a Chinese
// forum, so these strings follow it; documentation stays in English.
export const STRINGS = Object.freeze({
  preview: "预览",
  retry: "重试",
  cancel: "取消",
  closePreview: "关闭预览",
  expand: "全屏阅读",
  collapse: "退出全屏",
  download: "下载原文件",
  queued: "等待其他预览完成…",
  downloading: "正在下载文件…",
  parsing: "正在浏览器本地解析…",
  loadingRenderer: "正在加载演示文稿渲染器…",
  rendering: "正在渲染…",
  ready: "已在浏览器本地打开，文件未发送给第三方。",
  cancelled: "已取消预览。",
  disabled: "管理员已关闭 Office 文档预览，请下载原文件查看。",
  externalButton: "用 Microsoft 在线查看器打开",
  externalContinue: "继续，用 Microsoft 打开",
  externalLoading: "正在等待 Microsoft 查看器…",
  externalLoaded:
    "Microsoft 查看器已加载。若查看器内显示错误，表示 Microsoft 无法从公开地址取得此文件。",
  externalFailed: "Microsoft 查看器没有响应。原文件仍可下载。",
  externalUnavailable: "此附件不符合外部查看条件，只能在浏览器本地预览或下载。",
  hiddenSheet: "隐藏",
  sheetTabs: "工作表",
  chartSheet: "这是图表工作表，预览只显示单元格数据，图表不渲染。",
  emptySheet: "此工作表没有数据。",
  formulaNote: "显示的是文件保存时的计算结果；预览不会重新计算公式，也不是可编辑的 Excel。",
  pptxNote: "静态幻灯片预览：动画、切换效果、音频和视频不播放。",
  docxNote: "阅读视图：保留标题、列表、表格、链接和图片；页面版式、字体、页眉页脚、公式和图表不保证还原。",
  truncatedDocument: "文档较长，预览只显示前面部分；完整内容请下载原文件。",
  omittedImage: "［图片未显示］",
});

export const FORMAT_LABELS = Object.freeze({
  docx: "Word 文档",
  xlsx: "Excel 工作簿",
  xls: "Excel 97–2003 工作簿",
  pptx: "PowerPoint 演示文稿",
  doc: "Word 97–2003 文档",
  ppt: "PowerPoint 97–2003 演示文稿",
  docm: "启用宏的 Word 文档",
  xlsm: "启用宏的 Excel 工作簿",
  pptm: "启用宏的 PowerPoint 演示文稿",
});

export const ERROR_MESSAGES = Object.freeze({
  ABORTED: "已取消预览。",
  CORRUPT: "文件已损坏或不是有效的 Office 文件，无法预览。",
  DTD_FORBIDDEN: "文件包含不安全的 XML 声明，已拒绝预览。",
  ENCRYPTED: "文件受密码保护或已加密，无法在浏览器中预览。",
  FORMAT_MISMATCH: "文件内容与扩展名不符，已拒绝预览。",
  HTTP: "无法下载附件（服务器拒绝或文件不存在）。",
  MACRO_ENABLED: "文件包含宏，出于安全考虑不预览。",
  NETWORK: "下载附件时网络中断。",
  NOT_A_FILE: "服务器返回的不是文件（可能需要登录），无法预览。",
  PARSE_FAILED: "文件无法解析，可能使用了预览不支持的功能。",
  RENDERER_UNAVAILABLE: "预览组件加载失败，请稍后重试。",
  TIMEOUT: "解析超时，文件可能过大或过于复杂。",
  TOO_LARGE: "文件或其解压内容超过预览上限，请下载原文件查看。",
  TOO_MANY_PARTS: "文件结构过于复杂，超过预览上限。",
  TOO_MANY_SLIDES: "幻灯片数量超过预览上限，请下载原文件查看。",
  UNSUPPORTED_ZIP: "文件使用了预览不支持的压缩格式。",
  UNTRUSTED_ORIGIN: "附件不在本论坛允许的存储地址上，已拒绝在浏览器中读取。",
  UNTRUSTED_REDIRECT: "附件被重定向到未授权的地址，已停止读取。",
  WORKER_UNAVAILABLE: "浏览器无法启动本地解析器（可能被内容安全策略阻止）。",
});

export const UNSUPPORTED_MESSAGES = Object.freeze({
  doc: "旧版 .doc 格式无法在浏览器中安全解析，请下载后用 Word 或 WPS 打开。",
  ppt: "旧版 .ppt 格式无法在浏览器中安全解析，请下载后用 PowerPoint 或 WPS 打开。",
  docm: "启用宏的文件不提供预览，请确认来源可信后再下载打开。",
  xlsm: "启用宏的文件不提供预览，请确认来源可信后再下载打开。",
  pptm: "启用宏的文件不提供预览，请确认来源可信后再下载打开。",
});

export function externalDisclosure(host) {
  return `Microsoft 的服务器将从 ${host} 下载此文件并在其页面中显示。仅当此文件可以公开访问时才会成功；Microsoft 的隐私条款适用。`;
}

export function truncatedSheetNotice(shownRows, totalRows, shownColumns, totalColumns) {
  const parts = [];

  if (totalRows > shownRows) {
    parts.push(`前 ${shownRows} 行（共 ${totalRows} 行）`);
  }

  if (totalColumns > shownColumns) {
    parts.push(`前 ${shownColumns} 列（共 ${totalColumns} 列）`);
  }

  return parts.length ? `预览只显示${parts.join("、")}，完整内容请下载原文件。` : "";
}

export function slideCountText(count) {
  return `共 ${count} 张幻灯片`;
}

export function tooLargeText(limitMb) {
  return `文件超过 ${limitMb} MiB 的预览上限，请下载原文件查看。`;
}
