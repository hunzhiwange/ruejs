/*
FileInput 组件概述
- 保留 Rue 当前 `input[type=file] + file-input-*` 的原始样式入口。
- 文件列表、拖拽选择、图片卡片、受控/非受控与 beforeUpload。
- 组件仍聚焦“文件选择与列表编排”，真正的上传请求继续由业务侧处理。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, onUpdated, ref, useRef, useSetup, watch } from '@rue-js/rue'

/** FileInputVariant 视觉或语义变体类型。 */
export type FileInputVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** FileInputColor 语义色类型。 */
export type FileInputColor = 'default' | FileInputVariant
/** FileInputSize 尺寸类型。 */
export type FileInputSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'small'
  | 'middle'
  | 'medium'
  | 'large'
/** FileInputListType 视觉或语义变体类型。 */
export type FileInputListType = 'text' | 'picture' | 'picture-card'
/** FileInputStatus 状态类型。 */
export type FileInputStatus = 'ready' | 'uploading' | 'done' | 'error' | 'removed'

/** FileInputFile 接口。 */
export interface FileInputFile {
  /** uid 配置项。 */
  uid?: string
  /** 表单 name 属性或分组名称。 */
  name: string
  /** 组件状态。 */
  status?: FileInputStatus
  /** 组件尺寸。 */
  size?: number
  /** 组件类型或语义类型。 */
  type?: string
  /** percent 配置项。 */
  percent?: number
  /** url 配置项。 */
  url?: string
  /** thumbUrl 配置项。 */
  thumbUrl?: string
  /** preview 配置项。 */
  preview?: string
  /** lastModified 配置项。 */
  lastModified?: number
  /** originFileObj 配置项。 */
  originFileObj?: File | Blob | null
  /** response 配置项。 */
  response?: any
  /** error 配置项。 */
  error?: any
  /** 描述内容。 */
  description?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FileInputShowUploadList 接口。 */
export interface FileInputShowUploadList {
  /** showPreviewIcon 图标内容。 */
  showPreviewIcon?: boolean
  /** showRemoveIcon 图标内容。 */
  showRemoveIcon?: boolean
  /** 额外操作或补充内容。 */
  extra?: string | number | ((file: FileInputFile) => string | number)
  /** itemRender 自定义渲染函数。 */
}

/** FileInputChangeInfo 接口。 */
export interface FileInputChangeInfo {
  /** file 配置项。 */
  file: FileInputFile
  /** fileList 配置项。 */
  fileList: FileInputFile[]
  /** source 配置项。 */
  source: 'select' | 'drop' | 'remove'
  /** nativeEvent 配置项。 */
  nativeEvent?: Event | DragEvent
}

/** FileInputBeforeUploadResult 类型。 */
export type FileInputBeforeUploadResult =
  | boolean
  | File
  | Blob
  | typeof FILE_INPUT_LIST_IGNORE
  | Promise<boolean | File | Blob | typeof FILE_INPUT_LIST_IGNORE>

/** FileInputBeforeUpload 类型。 */
export type FileInputBeforeUpload = (file: File, fileList: File[]) => FileInputBeforeUploadResult
/** FileInputPreviewHandler 类型。 */
export type FileInputPreviewHandler = (file: FileInputFile) => void | Promise<void>
/** FileInputRemoveHandler 类型。 */
export type FileInputRemoveHandler = (
  file: FileInputFile,
) => boolean | void | Promise<boolean | void>
/** FileInputPreviewFile 类型。 */
export type FileInputPreviewFile = (file: File | Blob) => Promise<string>

/** FileInputProps 组件属性。 */
export interface FileInputProps {
  /** 组件语义色。 */
  color?: FileInputColor
  /** 组件视觉变体；兼容旧版颜色写法。 */
  variant?: FileInputVariant
  /** 组件尺寸。 */
  size?: FileInputSize
  /** ghost 配置项。 */
  ghost?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** triggerClassName 附加类名。 */
  triggerClassName?: string
  /** listClassName 附加类名。 */
  listClassName?: string
  /** itemClassName 附加类名。 */
  itemClassName?: string
  /** drag 配置项。 */
  drag?: boolean
  /** listType 配置项。 */
  listType?: FileInputListType
  /** showUploadList 配置项。 */
  showUploadList?: boolean | FileInputShowUploadList
  /** fileList 配置项。 */
  fileList?: FileInputFile[]
  /** defaultFileList 配置项。 */
  defaultFileList?: FileInputFile[]
  /** maxCount 配置项。 */
  maxCount?: number
  /** 标题内容。 */
  title?: any
  /** 描述内容。 */
  description?: any
  /** hint 配置项。 */
  hint?: any
  /** buttonText 文本内容。 */
  buttonText?: any
  /** empty 配置项。 */
  empty?: any
  /** multiple 配置项。 */
  multiple?: boolean
  /** directory 配置项。 */
  directory?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** openFileDialogOnClick 配置项。 */
  openFileDialogOnClick?: boolean
  /** 组件子内容。 */
  children?: any
  /** beforeUpload 配置项。 */
  beforeUpload?: FileInputBeforeUpload
  /** onPreview 事件回调。 */
  onPreview?: FileInputPreviewHandler
  /** onRemove 事件回调。 */
  onRemove?: FileInputRemoveHandler
  /** previewFile 配置项。 */
  previewFile?: FileInputPreviewFile
  /** 值或状态变化时触发的回调。 */
  onChange?: ((event: Event) => void) | ((info: FileInputChangeInfo) => void)
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

type FileInputCompound = FC<FileInputProps> & {
  Dragger: FC<FileInputProps>
  LIST_IGNORE: typeof FILE_INPUT_LIST_IGNORE
}

/** FILE_INPUT_LIST_IGNORE 内部常量。 */
const FILE_INPUT_LIST_IGNORE = Symbol('RUE_FILE_INPUT_LIST_IGNORE')
let uidSeed = 0
let inputIdSeed = 0

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | undefined | false | null>) => {
  return parts.filter(Boolean).join(' ')
}

/** 判断 Children 是否有可渲染内容。 */
const hasRenderableChildren = (children: any) =>
  children != null && children !== false && children !== ''

/** 解析 Color Tone 的内部工具函数。 */
const resolveColorTone = (
  color?: FileInputColor,
  variant?: FileInputVariant,
): FileInputVariant | undefined => {
  if (color && color !== 'default') return color
  return variant
}

/** 判断 Promise Like 的内部工具函数。 */
const isPromiseLike = <T,>(value: any): value is Promise<T> => {
  return !!value && typeof value === 'object' && typeof value.then === 'function'
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: FileInputSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'middle':
    case 'medium':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 解析 Native Input Size Class 的内部工具函数。 */
const resolveNativeSizeClassName = (size?: FileInputSize) => {
  switch (resolveSizeClass(size)) {
    case 'xs':
      return 'file-input-xs'
    case 'sm':
      return 'file-input-sm'
    case 'md':
      return 'file-input-md'
    case 'lg':
      return 'file-input-lg'
    case 'xl':
      return 'file-input-xl'
    default:
      return undefined
  }
}

/** 解析 Button Size Class 的内部工具函数。 */
const resolveButtonSizeClassName = (size?: FileInputSize) => {
  switch (resolveSizeClass(size)) {
    case 'xs':
      return 'btn-xs'
    case 'sm':
      return 'btn-sm'
    case 'md':
      return 'btn-md'
    case 'lg':
      return 'btn-lg'
    case 'xl':
      return 'btn-xl'
    default:
      return undefined
  }
}

/** 解析 Native Input Color Class 的内部工具函数。 */
const resolveNativeColorClassName = (tone?: FileInputVariant) => {
  switch (tone) {
    case 'neutral':
      return 'file-input-neutral'
    case 'primary':
      return 'file-input-primary'
    case 'secondary':
      return 'file-input-secondary'
    case 'accent':
      return 'file-input-accent'
    case 'info':
      return 'file-input-info'
    case 'success':
      return 'file-input-success'
    case 'warning':
      return 'file-input-warning'
    case 'error':
      return 'file-input-error'
    default:
      return undefined
  }
}

/** 解析 Button Color Class 的内部工具函数。 */
const resolveButtonColorClassName = (tone?: FileInputVariant) => {
  switch (tone) {
    case 'neutral':
      return 'btn-neutral'
    case 'primary':
      return 'btn-primary'
    case 'secondary':
      return 'btn-secondary'
    case 'accent':
      return 'btn-accent'
    case 'info':
      return 'btn-info'
    case 'success':
      return 'btn-success'
    case 'warning':
      return 'btn-warning'
    case 'error':
      return 'btn-error'
    default:
      return undefined
  }
}

/** 解析 Text Color Class 的内部工具函数。 */
const resolveTextColorClassName = (tone?: FileInputVariant) => {
  switch (tone) {
    case 'neutral':
      return 'text-neutral'
    case 'primary':
      return 'text-primary'
    case 'secondary':
      return 'text-secondary'
    case 'accent':
      return 'text-accent'
    case 'info':
      return 'text-info'
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'error':
      return 'text-error'
    default:
      return undefined
  }
}

/** 解析 Dropzone Active Class 的内部工具函数。 */
const resolveDropzoneActiveClassName = (tone?: FileInputVariant) => {
  switch (tone) {
    case 'neutral':
      return 'border-neutral bg-neutral/5'
    case 'primary':
      return 'border-primary bg-primary/5'
    case 'secondary':
      return 'border-secondary bg-secondary/5'
    case 'accent':
      return 'border-accent bg-accent/5'
    case 'info':
      return 'border-info bg-info/5'
    case 'success':
      return 'border-success bg-success/5'
    case 'warning':
      return 'border-warning bg-warning/5'
    case 'error':
      return 'border-error bg-error/5'
    default:
      return 'border-primary bg-primary/5'
  }
}

/** 解析 Dropzone Hover Border Class 的内部工具函数。 */
const resolveDropzoneHoverClassName = (tone?: FileInputVariant) => {
  switch (tone) {
    case 'neutral':
      return 'hover:border-neutral/40 hover:bg-base-200/40'
    case 'primary':
      return 'hover:border-primary/40 hover:bg-base-200/40'
    case 'secondary':
      return 'hover:border-secondary/40 hover:bg-base-200/40'
    case 'accent':
      return 'hover:border-accent/40 hover:bg-base-200/40'
    case 'info':
      return 'hover:border-info/40 hover:bg-base-200/40'
    case 'success':
      return 'hover:border-success/40 hover:bg-base-200/40'
    case 'warning':
      return 'hover:border-warning/40 hover:bg-base-200/40'
    case 'error':
      return 'hover:border-error/40 hover:bg-base-200/40'
    default:
      return 'hover:border-primary/40 hover:bg-base-200/40'
  }
}

/** 解析 Dropzone Icon Color Class 的内部工具函数。 */
const resolveDropzoneIconClassName = (tone?: FileInputVariant) => {
  switch (tone) {
    case 'neutral':
      return 'bg-neutral/10 text-neutral'
    case 'primary':
      return 'bg-primary/10 text-primary'
    case 'secondary':
      return 'bg-secondary/10 text-secondary'
    case 'accent':
      return 'bg-accent/10 text-accent'
    case 'info':
      return 'bg-info/10 text-info'
    case 'success':
      return 'bg-success/10 text-success'
    case 'warning':
      return 'bg-warning/10 text-warning'
    case 'error':
      return 'bg-error/10 text-error'
    default:
      return 'bg-primary/10 text-primary'
  }
}

/** 构建 Native Input Class Name 的内部工具函数。 */
const buildNativeInputClassName = ({
  color,
  variant,
  size,
  ghost,
  className,
}: Pick<FileInputProps, 'color' | 'variant' | 'size' | 'ghost' | 'className'>) => {
  let cls = 'file-input'
  const resolvedTone = resolveColorTone(color, variant)
  const resolvedColorClassName = resolveNativeColorClassName(resolvedTone)
  const resolvedSizeClassName = resolveNativeSizeClassName(size)
  if (resolvedColorClassName) cls += ` ${resolvedColorClassName}`
  if (resolvedSizeClassName) cls += ` ${resolvedSizeClassName}`
  if (ghost) cls += ' file-input-ghost'
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Trigger Button Class Name 的内部工具函数。 */
const buildTriggerButtonClassName = ({
  color,
  variant,
  size,
  ghost,
  className,
}: Pick<FileInputProps, 'color' | 'variant' | 'size' | 'ghost'> & { className?: string }) => {
  let cls = 'btn'
  const resolvedTone = resolveColorTone(color, variant)
  const resolvedColorClassName = resolveButtonColorClassName(resolvedTone)
  const resolvedSizeClassName = resolveButtonSizeClassName(size)
  if (resolvedColorClassName) cls += ` ${resolvedColorClassName}`
  if (resolvedSizeClassName) cls += ` ${resolvedSizeClassName}`
  if (ghost) cls += ' btn-ghost'
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Dropzone Class Name 的内部工具函数。 */
const buildDropzoneClassName = ({
  color,
  variant,
  disabled,
  dragging,
  className,
}: {
  color?: FileInputColor
  variant?: FileInputVariant
  disabled?: boolean
  dragging?: boolean
  className?: string
}) => {
  const resolvedTone = resolveColorTone(color, variant)
  return mergeClassNames(
    'rounded-box border-2 border-dashed bg-base-100 p-5 transition',
    dragging ? resolveDropzoneActiveClassName(resolvedTone) : 'border-base-300',
    resolveTextColorClassName(resolvedTone),
    disabled
      ? 'cursor-not-allowed opacity-60'
      : `cursor-pointer ${resolveDropzoneHoverClassName(resolvedTone)}`,
    className,
  )
}

/** 构建 Status Badge Class Name 的内部工具函数。 */
const buildStatusBadgeClassName = (status?: FileInputStatus) => {
  switch (status) {
    case 'done':
      return 'badge-success'
    case 'error':
      return 'badge-error'
    case 'uploading':
      return 'badge-info'
    case 'removed':
      return 'badge-ghost'
    default:
      return 'badge-ghost'
  }
}

/** 判断 Picture Type 的内部工具函数。 */
const isPictureType = (listType?: FileInputListType) => {
  return listType === 'picture' || listType === 'picture-card'
}

/** 判断 Image Like 的内部工具函数。 */
const isImageLike = (file: FileInputFile) => {
  if (file.type?.startsWith('image/')) return true
  const url = file.thumbUrl ?? file.url ?? file.preview ?? ''
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(url)
}

/** 转义预览页文本的内部工具函数。 */
const escapePreviewHtml = (value: string) => {
  return value.replace(/[&<>"']/g, char => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return char
    }
  })
}

/** 只将原生 Blob 传给 FileReader。 */
const toNativeBlob = (value: unknown): File | Blob | null => {
  if (value == null || typeof Blob === 'undefined') return null
  if (value instanceof Blob) return value
  return null
}

/** 判断 Native File 的内部工具函数。 */
const isNativeFile = (file: File | Blob): file is File => {
  return typeof File !== 'undefined' && file instanceof File
}

/** read File As Data Url 的内部工具函数。 */
const readFileAsDataUrl = (file: File | Blob) => {
  return new Promise<string>((resolve, reject) => {
    const nativeFile = toNativeBlob(file)
    if (!nativeFile) {
      reject(new TypeError('FileInput previewFile expects a File or Blob.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string) ?? '')
    reader.onerror = error => reject(error)
    reader.readAsDataURL(nativeFile)
  })
}

/** default Preview File 的内部工具函数。 */
const defaultPreviewFile: FileInputPreviewFile = file => {
  return readFileAsDataUrl(file)
}

/** 打开预览窗口的内部工具函数。 */
const openPreviewWindow = (file: FileInputFile, previewUrl: string) => {
  if (!previewUrl || typeof window === 'undefined') return
  const previewWindow = window.open('', '_blank')
  if (!previewWindow) return

  try {
    previewWindow.opener = null
  } catch {
    // ignore browsers that disallow mutating opener
  }

  const shouldRenderImage = isImageLike({ ...file, preview: previewUrl })
  if (!shouldRenderImage) {
    previewWindow.location.href = previewUrl
    return
  }

  const title = escapePreviewHtml(file.name || 'Preview')
  const src = escapePreviewHtml(previewUrl)
  previewWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
html,body{margin:0;min-height:100%;background:#111;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
body{display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;}
img{max-width:100%;max-height:100vh;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.35);}
</style>
</head>
<body>
<img src="${src}" alt="${title}">
</body>
</html>`)
  previewWindow.document.close()
}

/** 创建 Uid 的内部工具函数。 */
const createUid = () => {
  uidSeed += 1
  return `rue-file-${uidSeed}`
}

/** clone File Item 的内部工具函数。 */
const cloneFileItem = (file: FileInputFile): FileInputFile => {
  return { ...file }
}

/** 转换为 File Item 的内部工具函数。 */
const toFileItem = (file: File | Blob, fallbackName?: string): FileInputFile => {
  const source = file as File
  const name =
    'name' in source && typeof source.name === 'string' ? source.name : (fallbackName ?? 'file')
  const lastModified =
    'lastModified' in source && typeof source.lastModified === 'number'
      ? source.lastModified
      : undefined

  return {
    uid: createUid(),
    name,
    status: 'ready',
    size: typeof file.size === 'number' ? file.size : undefined,
    type: file.type || undefined,
    lastModified,
    originFileObj: file,
  }
}

/** 归一化 File Item 的内部工具函数。 */
const normalizeFileItem = (file: FileInputFile, index: number): FileInputFile => {
  return {
    status: 'done',
    ...file,
    uid: file.uid ?? `preset-file-${index}-${createUid()}`,
    name: file.name ?? `file-${index + 1}`,
  }
}

/** 归一化 File List 的内部工具函数。 */
const normalizeFileList = (fileList?: FileInputFile[]) => {
  return (fileList ?? []).map((file, index) => normalizeFileItem(cloneFileItem(file), index))
}

type UncontrolledFileListCacheEntry = {
  fileList: FileInputFile[]
  touchedAt: number
}

const MAX_UNCONTROLLED_FILE_LIST_CACHE_SIZE = 100
const UNCONTROLLED_FILE_LIST_CACHE_TTL = 30_000
const uncontrolledFileListCache = /*#__PURE__*/ new Map<string, UncontrolledFileListCacheEntry>()
const controlledFileListVersions = /*#__PURE__*/ new Map<string, number>()
const controlledFileExtraCache = /*#__PURE__*/ new Map<string, Map<string, unknown>>()
let controlledFileListVersionSeed = 0
const controlledFileListSignature = (files: FileInputFile[]) =>
  files
    .map(
      file =>
        `${file.uid ?? ''}:${String(file.name)}:${file.status ?? ''}:${file.description ?? ''}`,
    )
    .join('|')

/** stringify Cache Part 的内部工具函数。 */
const stringifyCachePart = (value: any) => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

/** 创建 Default File List Signature 的内部工具函数。 */
const createDefaultFileListSignature = (fileList?: FileInputFile[]) => {
  return (fileList ?? [])
    .map((file, index) =>
      [
        file.uid ?? '',
        file.name ?? `index-${index}`,
        file.type ?? '',
        file.size ?? '',
        file.status ?? '',
      ].join(':'),
    )
    .join('|')
}

/** 解析 Uncontrolled File List Cache Key 的内部工具函数。 */
const resolveUncontrolledFileListCacheKey = (options: {
  id?: any
  name?: any
  title?: any
  buttonText?: any
  hint?: any
  accept?: any
  listType?: any
  maxCount?: any
  multiple?: any
  directory?: any
  defaultFileList?: FileInputFile[]
}) => {
  if (options.id !== undefined && options.id !== null && options.id !== '') {
    return `id:${String(options.id)}`
  }
  if (typeof options.name === 'string' && options.name) {
    return `name:${options.name}`
  }

  return [
    'auto',
    stringifyCachePart(options.title),
    stringifyCachePart(options.buttonText),
    stringifyCachePart(options.hint),
    stringifyCachePart(options.accept),
    stringifyCachePart(options.listType),
    stringifyCachePart(options.maxCount),
    options.multiple ? 'multiple' : 'single',
    options.directory ? 'directory' : 'file',
    createDefaultFileListSignature(options.defaultFileList),
  ].join('\u001f')
}

/** 读取 Uncontrolled File List Cache 的内部工具函数。 */
const readUncontrolledFileListCache = (cacheKey: string, defaultFileList?: FileInputFile[]) => {
  const cached = uncontrolledFileListCache.get(cacheKey)
  if (!cached) return normalizeFileList(defaultFileList)

  if (Date.now() - cached.touchedAt > UNCONTROLLED_FILE_LIST_CACHE_TTL) {
    uncontrolledFileListCache.delete(cacheKey)
    return normalizeFileList(defaultFileList)
  }

  cached.touchedAt = Date.now()
  return normalizeFileList(cached.fileList)
}

/** 写入 Uncontrolled File List Cache 的内部工具函数。 */
const writeUncontrolledFileListCache = (cacheKey: string, fileList: FileInputFile[]) => {
  uncontrolledFileListCache.set(cacheKey, {
    fileList: fileList.map(cloneFileItem),
    touchedAt: Date.now(),
  })

  if (uncontrolledFileListCache.size <= MAX_UNCONTROLLED_FILE_LIST_CACHE_SIZE) return

  const oldestKey = Array.from(uncontrolledFileListCache.entries()).sort(
    (left, right) => left[1].touchedAt - right[1].touchedAt,
  )[0]?.[0]
  if (oldestKey) uncontrolledFileListCache.delete(oldestKey)
}

/** apply Max Count 的内部工具函数。 */
const applyMaxCount = (fileList: FileInputFile[], maxCount?: number) => {
  if (!maxCount || maxCount <= 0) return fileList
  if (maxCount === 1) return fileList.slice(-1)
  return fileList.slice(-maxCount)
}

/** format File Size 的内部工具函数。 */
const formatFileSize = (size?: number) => {
  if (typeof size !== 'number' || !Number.isFinite(size)) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size >= 1024 * 100 ? 0 : 1)} KB`
  return `${(size / (1024 * 1024)).toFixed(size >= 1024 * 1024 * 10 ? 0 : 1)} MB`
}

/** 判断 Enhanced Mode 的内部工具函数。 */
const isEnhancedMode = (props: FileInputProps) => {
  const hasCustomChildren = hasRenderableChildren(props.children)

  return (
    props.drag === true ||
    hasCustomChildren ||
    props.fileList !== undefined ||
    props.defaultFileList !== undefined ||
    (props.listType !== undefined && props.listType !== 'text') ||
    (props.showUploadList !== undefined && props.showUploadList !== true) ||
    props.maxCount !== undefined ||
    props.beforeUpload !== undefined ||
    props.onPreview !== undefined ||
    props.onRemove !== undefined ||
    props.rootClassName !== undefined ||
    props.triggerClassName !== undefined ||
    props.listClassName !== undefined ||
    props.itemClassName !== undefined ||
    props.title !== undefined ||
    props.description !== undefined ||
    props.hint !== undefined ||
    props.buttonText !== undefined ||
    props.empty !== undefined ||
    props.directory === true ||
    props.openFileDialogOnClick === false
  )
}

/** Default Upload Icon 的内部工具函数。 */
const DefaultUploadIcon: FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={mergeClassNames('size-5', className)}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V5m0 0-4 4m4-4 4 4" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 16.5V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.5"
      />
    </svg>
  )
}

/** Default Plus Icon 的内部工具函数。 */
const DefaultPlusIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** Default File Icon 的内部工具函数。 */
const DefaultFileIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
    </svg>
  )
}

/** Default Image Icon 的内部工具函数。 */
const DefaultImageIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 16-5.5-5.5L7 19" />
    </svg>
  )
}

/** Default Preview Icon 的内部工具函数。 */
const DefaultPreviewIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Default Remove Icon 的内部工具函数。 */
const DefaultRemoveIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 7 10 10M17 7 7 17" />
    </svg>
  )
}

/** File Input Root 的内部工具函数。 */
const FileInputRoot: FC<FileInputProps> = ({
  color,
  variant,
  size,
  ghost,
  className,
  rootClassName,
  triggerClassName,
  listClassName,
  itemClassName,
  drag,
  listType,
  showUploadList,
  fileList,
  defaultFileList,
  maxCount,
  title,
  description,
  hint,
  buttonText,
  empty,
  multiple,
  directory,
  disabled,
  openFileDialogOnClick,
  children,
  beforeUpload,
  onPreview,
  onRemove,
  previewFile,
  onChange,
  id,
  ref: _forwardedRef,
  ...rest
}) => {
  const controlled = fileList !== undefined
  const controlledListSignature = controlled ? controlledFileListSignature(fileList) : ''
  const controlledListVersion = controlled
    ? (controlledFileListVersions.get(controlledListSignature) ??
      (() => {
        const version = ++controlledFileListVersionSeed
        controlledFileListVersions.set(controlledListSignature, version)
        return version
      })())
    : undefined
  const uncontrolledFileListCacheKey = controlled
    ? ''
    : resolveUncontrolledFileListCacheKey({
        id,
        name: rest.name,
        title,
        buttonText,
        hint,
        accept: rest.accept,
        listType,
        maxCount,
        multiple,
        directory,
        defaultFileList,
      })
  const instance = useSetup(() => ({
    inputId: `rue-file-input-control-${inputIdSeed++}`,
    dragging: ref(false),
    currentFileList: ref(
      controlled
        ? normalizeFileList(fileList)
        : readUncontrolledFileListCache(uncontrolledFileListCacheKey, defaultFileList),
    ),
    listVersion: ref(0),
    lastControlledFileList: (controlled ? fileList : undefined) as FileInputFile[] | undefined,
    effectsRegistered: false,
    syncFromProps: (() => false) as () => boolean,
  }))
  const inputId = id ?? instance.inputId
  const enhancedMode = isEnhancedMode({
    color,
    variant,
    size,
    ghost,
    className,
    rootClassName,
    triggerClassName,
    listClassName,
    itemClassName,
    drag,
    listType,
    showUploadList,
    fileList,
    defaultFileList,
    maxCount,
    title,
    description,
    hint,
    buttonText,
    empty,
    multiple,
    directory,
    disabled,
    openFileDialogOnClick,
    children,
    beforeUpload,
    onPreview,
    onRemove,
    previewFile,
    onChange,
  })
  const resolvedListType = listType ?? 'text'
  const resolvedShowUploadList = showUploadList ?? true
  const resolvedOpenFileDialogOnClick = openFileDialogOnClick ?? true
  const resolvedPreviewFile = previewFile ?? defaultPreviewFile

  if (!enhancedMode) {
    return (
      <input
        {...rest}
        id={id}
        type="file"
        multiple={multiple}
        disabled={disabled}
        className={buildNativeInputClassName({ color, variant, size, ghost, className })}
      />
    )
  }

  const inputRef = useRef<HTMLInputElement>()
  const dragging = instance.dragging
  const currentFileList = instance.currentFileList
  const listVersion = instance.listVersion
  const uploadListConfig =
    resolvedShowUploadList && typeof resolvedShowUploadList === 'object'
      ? resolvedShowUploadList
      : undefined
  const listVisible = resolvedShowUploadList !== false
  const showPreviewIcon = uploadListConfig?.showPreviewIcon ?? true
  const showRemoveIcon = uploadListConfig?.showRemoveIcon ?? true
  const acceptsMany = multiple || (typeof maxCount === 'number' && maxCount > 1)
  const hasCustomChildren = hasRenderableChildren(children)
  const triggerOpensPicker =
    !disabled &&
    resolvedOpenFileDialogOnClick &&
    (hasCustomChildren || drag || resolvedListType === 'picture-card')
  const directoryInputProps = directory ? { directory: '', webkitdirectory: '' } : {}

  const assignInputRef = (element: HTMLInputElement | null) => {
    inputRef.current = element ?? undefined
    if (typeof _forwardedRef === 'function') {
      _forwardedRef(element)
      return
    }
    if (_forwardedRef && typeof _forwardedRef === 'object') {
      ;(_forwardedRef as any).current = element ?? undefined
    }
  }

  const syncFromProps = () => {
    if (!controlled) {
      instance.lastControlledFileList = undefined
      return false
    }
    if (fileList === instance.lastControlledFileList) return false

    instance.lastControlledFileList = fileList
    currentFileList.value = normalizeFileList(fileList)
    listVersion.value += 1
    return true
  }

  const updateFileListState = (nextFileList: FileInputFile[]) => {
    currentFileList.value = nextFileList
    if (!controlled) {
      writeUncontrolledFileListCache(uncontrolledFileListCacheKey, nextFileList)
    }
    listVersion.value += 1
  }

  const emitEnhancedChange = (info: FileInputChangeInfo) => {
    if (typeof onChange === 'function') {
      ;(onChange as (info: FileInputChangeInfo) => void)(info)
    }
  }

  const readNativeInput = () => {
    if (typeof document === 'undefined') return null
    return document.getElementById(inputId) as HTMLInputElement | null
  }

  const openPicker = () => {
    if (disabled || !resolvedOpenFileDialogOnClick) return
    ;(inputRef.current ?? readNativeInput())?.click()
  }

  const clearNativeInputValue = (input?: HTMLInputElement | null) => {
    const element = input ?? readNativeInput()
    if (element) {
      element.value = ''
    }
  }

  const resolvePreviewUrl = async (file: FileInputFile) => {
    if (file.thumbUrl) return file.thumbUrl
    if (file.url) return file.url
    if (file.preview) return file.preview
    const originFile = toNativeBlob(file.originFileObj)
    if (!originFile) return ''
    const previewData = await resolvedPreviewFile(originFile)
    file.preview = previewData
    listVersion.value += 1
    return previewData
  }

  const handlePreview = async (file: FileInputFile) => {
    if (onPreview) {
      await onPreview(file)
      return
    }
    const previewUrl = await resolvePreviewUrl(file)
    openPreviewWindow(file, previewUrl)
  }

  const applyRemove = (file: FileInputFile) => {
    const nextFileList = currentFileList.value.filter(
      item => item.uid !== file.uid && item.uid !== undefined,
    )
    if (nextFileList.length !== currentFileList.value.length - 1) {
      console.warn('File removal mismatch detected. Ensure file.uid is valid.')
    }
    updateFileListState(nextFileList)
    emitEnhancedChange({
      file: {
        ...file,
        status: 'removed',
      },
      fileList: nextFileList,
      source: 'remove',
    })
  }

  const handleRemove = (file: FileInputFile) => {
    if (disabled) return
    if (!onRemove) {
      applyRemove(file)
      return
    }

    const result = onRemove(file)
    if (isPromiseLike<boolean | void>(result)) {
      void result.then(removeResult => {
        if (removeResult === false) return
        applyRemove(file)
      })
      return
    }
    if (result === false) return
    applyRemove(file)
  }

  const normalizeSelectedResult = (
    selectedFile: File,
    beforeResult: boolean | File | Blob | typeof FILE_INPUT_LIST_IGNORE,
  ) => {
    if (beforeResult === FILE_INPUT_LIST_IGNORE) return null
    const beforeFile = toNativeBlob(beforeResult)
    if (beforeFile) {
      const transformedFile = isNativeFile(beforeFile)
        ? beforeFile
        : typeof File !== 'undefined'
          ? new File([beforeFile], selectedFile.name, {
              type: beforeFile.type || selectedFile.type,
              lastModified: selectedFile.lastModified,
            })
          : beforeFile
      return toFileItem(transformedFile, selectedFile.name)
    }
    return toFileItem(selectedFile, selectedFile.name)
  }

  const commitSelectedFiles = (
    resolvedFiles: FileInputFile[],
    source: 'select' | 'drop',
    nativeEvent?: Event | DragEvent,
    inputElement?: HTMLInputElement | null,
  ) => {
    if (resolvedFiles.length <= 0) {
      clearNativeInputValue(inputElement)
      return
    }

    const nextFileList = applyMaxCount(
      [...currentFileList.value.map(cloneFileItem), ...resolvedFiles],
      maxCount,
    )
    updateFileListState(nextFileList)
    emitEnhancedChange({
      file: nextFileList[nextFileList.length - 1],
      fileList: nextFileList,
      source,
      nativeEvent,
    })
    clearNativeInputValue(inputElement)
  }

  const buildSelectedList = (
    selectedFiles: File[],
    source: 'select' | 'drop',
    nativeEvent?: Event | DragEvent,
    inputElement?: HTMLInputElement | null,
  ) => {
    const resolvedFiles: FileInputFile[] = []

    const processAt = (index: number): void => {
      if (index >= selectedFiles.length) {
        commitSelectedFiles(resolvedFiles, source, nativeEvent, inputElement)
        return
      }

      const selectedFile = selectedFiles[index]
      if (!beforeUpload) {
        resolvedFiles.push(toFileItem(selectedFile, selectedFile.name))
        processAt(index + 1)
        return
      }

      const beforeResult = beforeUpload(selectedFile, selectedFiles)
      if (isPromiseLike<boolean | File | Blob | typeof FILE_INPUT_LIST_IGNORE>(beforeResult)) {
        void beforeResult.then(asyncResult => {
          const normalized = normalizeSelectedResult(selectedFile, asyncResult)
          if (normalized) resolvedFiles.push(normalized)
          processAt(index + 1)
        })
        return
      }

      const normalized = normalizeSelectedResult(selectedFile, beforeResult)
      if (normalized) resolvedFiles.push(normalized)
      processAt(index + 1)
    }

    processAt(0)
  }

  const handleNativeChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const selectedFiles = Array.from(target?.files ?? [])
    buildSelectedList(selectedFiles, 'select', event, target)
  }

  const handleDragOver = (event: DragEvent) => {
    if (disabled) return
    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
    dragging.value = true
  }

  const handleDragEnter = (event: DragEvent) => {
    handleDragOver(event)
  }

  const handleDragLeave = (event: DragEvent) => {
    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
    const currentTarget = event.currentTarget as HTMLElement | null
    const nextTarget = event.relatedTarget as Node | null
    if (currentTarget && nextTarget && currentTarget.contains(nextTarget)) {
      return
    }
    dragging.value = false
  }

  const handleDrop = (event: DragEvent) => {
    if (disabled) return
    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
    dragging.value = false
    const droppedFiles = Array.from(event.dataTransfer?.files ?? [])
    buildSelectedList(droppedFiles, 'drop', event)
  }

  const RenderFileThumb = ({ arg0: file }: { arg0: FileInputFile }) => {
    const previewUrl = file.thumbUrl ?? file.url ?? file.preview
    if (previewUrl && isImageLike(file)) {
      return <img src={previewUrl} alt={String(file.name)} className="size-full object-cover" />
    }
    return (
      <div className="flex size-full items-center justify-center rounded-box bg-base-200 text-base-content/60">
        {isImageLike(file) ? <DefaultImageIcon /> : <DefaultFileIcon />}
      </div>
    )
  }

  const canPreviewFile = (file: FileInputFile) => {
    return (
      !!onPreview ||
      !!file.thumbUrl ||
      !!file.url ||
      !!file.preview ||
      !!toNativeBlob(file.originFileObj)
    )
  }

  const RenderDefaultListItem = ({
    arg0: file,
    arg1: extraContent,
  }: {
    arg0: FileInputFile
    arg1: any
  }) => {
    const shouldShowPreviewIcon = showPreviewIcon && canPreviewFile(file)

    if (resolvedListType === 'picture-card') {
      return (
        <div
          className={mergeClassNames(
            'group relative flex aspect-square flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm',
            itemClassName,
          )}
        >
          <button
            type="button"
            className="relative flex flex-1 items-center justify-center overflow-hidden bg-base-200/60 text-base-content"
            onClick={() => void handlePreview(file)}
            disabled={disabled || !canPreviewFile(file)}
          >
            <RenderFileThumb arg0={file} />
          </button>
          <div className="border-t border-base-300 px-3 py-2">
            <div className="truncate text-sm font-medium">{String(file.name)}</div>
            {extraContent !== undefined ? (
              <div className="mt-1 text-xs text-base-content/60">{String(extraContent)}</div>
            ) : null}
          </div>
          {(shouldShowPreviewIcon || showRemoveIcon) && !disabled ? (
            <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100">
              {shouldShowPreviewIcon ? (
                <button
                  type="button"
                  className="btn btn-circle btn-xs border-none bg-base-100/90 shadow-sm"
                  aria-label={`Preview ${String(file.name)}`}
                  onClick={(event: MouseEvent) => {
                    if (typeof (event as any).stopPropagation === 'function') {
                      ;(event as any).stopPropagation()
                    }
                    void handlePreview(file)
                  }}
                >
                  <DefaultPreviewIcon />
                </button>
              ) : null}
              {showRemoveIcon ? (
                <button
                  type="button"
                  className="btn btn-circle btn-xs border-none bg-base-100/90 shadow-sm"
                  aria-label={`Remove ${String(file.name)}`}
                  onClick={(event: MouseEvent) => {
                    if (typeof (event as any).stopPropagation === 'function') {
                      ;(event as any).stopPropagation()
                    }
                    void handleRemove(file)
                  }}
                >
                  <DefaultRemoveIcon />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )
    }

    return (
      <div
        className={mergeClassNames(
          'flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3 py-3 shadow-sm',
          itemClassName,
        )}
      >
        {isPictureType(resolvedListType) ? (
          <button
            type="button"
            className="h-14 w-14 shrink-0 overflow-hidden rounded-box"
            onClick={() => void handlePreview(file)}
            disabled={disabled || !canPreviewFile(file)}
          >
            <RenderFileThumb arg0={file} />
          </button>
        ) : (
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-box bg-base-200 text-base-content/65">
            {isImageLike(file) ? <DefaultImageIcon /> : <DefaultFileIcon />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{String(file.name)}</span>
            <span
              className={mergeClassNames('badge badge-sm', buildStatusBadgeClassName(file.status))}
            >
              {String(file.status ?? 'ready')}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-base-content/60">
            {file.type ? <span>{String(file.type)}</span> : null}
            {formatFileSize(file.size) ? <span>{String(formatFileSize(file.size))}</span> : null}
            {extraContent !== undefined ? <span>{String(extraContent)}</span> : null}
          </div>
        </div>
        {(shouldShowPreviewIcon || showRemoveIcon) && !disabled ? (
          <div className="flex shrink-0 items-center gap-1">
            {shouldShowPreviewIcon ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                aria-label={`Preview ${String(file.name)}`}
                onClick={() => void handlePreview(file)}
              >
                <DefaultPreviewIcon />
              </button>
            ) : null}
            {showRemoveIcon ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                aria-label={`Remove ${String(file.name)}`}
                onClick={() => void handleRemove(file)}
              >
                <DefaultRemoveIcon />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  const readExtraContent = (file: FileInputFile) => {
    const extraContent = (() => {
      if (typeof uploadListConfig?.extra !== 'function') return uploadListConfig?.extra
      if (!controlled || !fileList) return uploadListConfig.extra(file)
      let cache = controlledFileExtraCache.get(controlledListSignature)
      if (!cache) {
        cache = /*#__PURE__*/ new Map()
        controlledFileExtraCache.set(controlledListSignature, cache)
      }
      const key = String(file.uid ?? file.name)
      if (cache.has(key)) return cache.get(key)
      const value = uploadListConfig.extra(file)
      cache.set(key, value)
      return value
    })()
    return extraContent
  }

  const RenderDefaultTriggerNode = () => {
    const resolvedTone = resolveColorTone(color, variant)
    if (drag) {
      return (
        <div
          className={buildDropzoneClassName({
            color,
            variant,
            disabled,
            dragging: dragging.value,
            className: triggerClassName,
          })}
        >
          <div className="flex flex-col items-center text-center">
            <span
              className={mergeClassNames(
                'mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full',
                resolveDropzoneIconClassName(resolvedTone),
              )}
            >
              <DefaultUploadIcon className="size-6" />
            </span>
            <div className="text-sm font-semibold text-base-content">
              {String(title ?? '拖拽文件到这里，或点击选择文件')}
            </div>
            <div className="mt-2 max-w-md text-sm text-base-content/65">
              {String(
                description ?? '适合资料、图片和批量附件收集；列表仍交给业务侧决定上传时机。',
              )}
            </div>
            <div className="mt-3 text-xs text-base-content/50">
              {String(hint ?? (acceptsMany ? '支持多文件选择' : '单次选择一个文件'))}
            </div>
          </div>
        </div>
      )
    }

    if (resolvedListType === 'picture-card') {
      return (
        <div
          className={mergeClassNames(
            'flex aspect-square flex-col items-center justify-center rounded-box border border-dashed border-base-300 bg-base-100 p-4 text-center shadow-sm transition',
            disabled
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:border-primary/40 hover:bg-base-200/40',
            triggerClassName,
          )}
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-base-200 text-base-content/70">
            <DefaultPlusIcon />
          </span>
          <div className="mt-3 text-sm font-medium text-base-content">
            {String(buttonText ?? '添加文件')}
          </div>
          <div className="mt-1 text-xs text-base-content/60">
            {String(hint ?? (maxCount ? `最多 ${maxCount} 个` : '支持图片或附件卡片展示'))}
          </div>
        </div>
      )
    }

    return (
      <div
        className={mergeClassNames(
          'flex flex-wrap items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3 shadow-sm',
          triggerClassName,
        )}
      >
        <button
          type="button"
          disabled={disabled || !resolvedOpenFileDialogOnClick}
          className={buildTriggerButtonClassName({
            color,
            variant,
            size,
            ghost,
            className: disabled || !resolvedOpenFileDialogOnClick ? 'btn-disabled' : undefined,
          })}
          aria-disabled={disabled || !resolvedOpenFileDialogOnClick ? 'true' : undefined}
          onClick={openPicker}
        >
          <DefaultUploadIcon />
          <span>{String(buttonText ?? '选择文件')}</span>
        </button>
        <div className="text-sm text-base-content/65">
          <div>{String(title ?? '保持 Rue 的轻量输入风格，同时拥有 Upload 式文件编排能力。')}</div>
          <div className="text-xs text-base-content/50">
            {hint ??
              (acceptsMany ? '可多选、可移除、可受控管理列表' : '可受控管理列表并自定义预览与删除')}
          </div>
        </div>
      </div>
    )
  }

  const RenderAppendTriggerNode = () => {
    if (!hasCustomChildren) return <RenderDefaultTriggerNode />
    return (
      <div
        className={mergeClassNames(
          'flex aspect-square flex-col items-center justify-center rounded-box border border-dashed border-base-300 bg-base-100 p-4 text-center shadow-sm transition hover:border-primary/40 hover:bg-base-200/40',
          triggerClassName,
        )}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-base-200 text-base-content/70">
          <DefaultPlusIcon />
        </span>
        <div className="mt-3 text-sm font-medium text-base-content">
          {String(buttonText ?? '继续添加')}
        </div>
      </div>
    )
  }

  const RenderTriggerRegion = ({ children }: { children?: any }) => {
    if (resolvedListType === 'picture-card' && currentFileList.value.length > 0) return <></>
    return (
      <div
        role={triggerOpensPicker ? 'button' : undefined}
        tabIndex={triggerOpensPicker ? 0 : undefined}
        onClick={triggerOpensPicker ? openPicker : undefined}
        onKeyDown={(event: KeyboardEvent) => {
          const key = (event as any).key
          if ((key === 'Enter' || key === ' ') && !disabled) {
            if (typeof (event as any).preventDefault === 'function') {
              ;(event as any).preventDefault()
            }
            openPicker()
          }
        }}
        onDragEnter={drag ? handleDragEnter : undefined}
        onDragOver={drag ? handleDragOver : undefined}
        onDragLeave={drag ? handleDragLeave : undefined}
        onDrop={drag ? handleDrop : undefined}
      >
        {children}
      </div>
    )
  }

  const RenderAppendTrigger = () => {
    const AppendTriggerNodeView = () => <RenderAppendTriggerNode />
    return (
      <div
        onClick={openPicker}
        onKeyDown={(event: KeyboardEvent) => {
          const key = (event as any).key
          if (key === 'Enter' || key === ' ') {
            if (typeof (event as any).preventDefault === 'function') {
              ;(event as any).preventDefault()
            }
            openPicker()
          }
        }}
        role="button"
        tabIndex={0}
      >
        <AppendTriggerNodeView />
      </div>
    )
  }

  const DynamicRegion = () => {
    const canAppendCard = maxCount ? currentFileList.value.length < maxCount : true
    return (
      <>
        <RenderTriggerRegion>
          <>{hasCustomChildren ? <>{children}</> : <RenderDefaultTriggerNode />}</>
        </RenderTriggerRegion>

        {listVisible ? (
          currentFileList.value.length > 0 ? (
            resolvedListType === 'picture-card' ? (
              <div
                className={mergeClassNames(
                  'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
                  listClassName,
                )}
              >
                {currentFileList.value.map((file, index) => (
                  <div key={file.uid || `fallback-${index}`}>
                    <RenderDefaultListItem arg0={file} arg1={readExtraContent(file)} />
                  </div>
                ))}
                {canAppendCard && !disabled ? <RenderAppendTrigger /> : null}
              </div>
            ) : (
              <div className={mergeClassNames('space-y-3', listClassName)}>
                {currentFileList.value.map((file, index) => (
                  <div key={file.uid || `fallback-${index}`}>
                    <RenderDefaultListItem arg0={file} arg1={readExtraContent(file)} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div
              className={mergeClassNames(
                'rounded-box border border-dashed border-base-300 p-4 text-sm text-base-content/55',
                listClassName,
              )}
            >
              {empty ?? '还没有文件，先选择一个文件开始。'}
            </div>
          )
        ) : null}
      </>
    )
  }

  syncFromProps()
  watch(() => fileList, syncFromProps)

  return (
    <div
      className={mergeClassNames('space-y-4', rootClassName)}
      data-rue-file-input-root="true"
      data-rue-file-input-count={String(currentFileList.value.length)}
      data-rue-file-input-version={String(controlledListVersion ?? listVersion.value)}
    >
      <input
        {...rest}
        ref={assignInputRef}
        id={inputId}
        type="file"
        className={mergeClassNames(
          'sr-only pointer-events-none absolute h-0 w-0 opacity-0',
          className,
        )}
        disabled={disabled}
        multiple={acceptsMany}
        onChange={handleNativeChange}
        {...directoryInputProps}
      />
      <DynamicRegion />
    </div>
  )
}

/** Dragger 的内部工具函数。 */
const Dragger: FC<FileInputProps> = props => {
  return <FileInputRoot {...props} drag />
}

const FileInput: FileInputCompound = /*#__PURE__*/ Object.assign(FileInputRoot, {
  Dragger,
  LIST_IGNORE: FILE_INPUT_LIST_IGNORE as typeof FILE_INPUT_LIST_IGNORE,
})

/** 默认导出文件输入组件。 */
export default FileInput
