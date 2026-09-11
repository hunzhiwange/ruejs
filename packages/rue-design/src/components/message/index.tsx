import { ToastHolder } from '../toast'
/*
Message 模块概述
- 汇总全局消息组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import { render, useRef, type FC } from '@rue-js/rue'
import Toast, {
  type ToastItemCloseMeta,
  type ToastGetContainer,
  type ToastInset,
  type ToastItemProps,
  type ToastItemType,
  type ToastItemVariant,
  type ToastMessageApi,
  type ToastMessageConfig,
  type ToastPlacement,
  type ToastProps,
  type ToastUseMessageOptions,
} from '../toast'

/** MessageKey 标识键类型。 */
export type MessageKey = string | number
/** MessageType 视觉或语义变体类型。 */
export type MessageType = ToastItemType
/** MessageVariant 视觉或语义变体类型。 */
export type MessageVariant = ToastItemVariant
/** MessagePlacement 位置或方向类型。 */
export type MessagePlacement = Extract<
  ToastPlacement,
  | 'top-start'
  | 'top'
  | 'top-center'
  | 'top-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-center'
  | 'bottom-end'
  | 'center'
>

/** MessageProps 组件属性。 */
export interface MessageProps extends Omit<ToastProps, 'children' | 'placement' | 'inset'> {
  /** 弹出层或内容展示位置。 */
  placement?: MessagePlacement
  /** top 配置项。 */
  top?: number | string
  /** inset 配置项。 */
  inset?: ToastInset
  /** 组件子内容。 */
  children?: any
}

/** MessageItemProps 组件属性。 */
export interface MessageItemProps extends Omit<
  ToastItemProps,
  'title' | 'description' | 'children' | 'open' | 'defaultOpen'
> {
  /** 主体内容。 */
  content?: any
  /** 组件子内容。 */
  children?: any
}

/** MessageOpenConfig 配置对象。 */
export interface MessageOpenConfig extends Omit<MessageItemProps, 'children'> {
  /** 数据项唯一标识。 */
  key?: MessageKey
  /** 组件子内容。 */
  children?: any
}

/** MessageUseMessageOptions 选项配置。 */
export interface MessageUseMessageOptions extends Omit<
  ToastUseMessageOptions,
  'placement' | 'type' | 'showIcon'
> {
  /** 弹出层或内容展示位置。 */
  placement?: MessagePlacement
  /** top 配置项。 */
  top?: number | string
  /** inset 配置项。 */
  inset?: ToastInset
  /** getContainer 配置项。 */
  getContainer?: ToastGetContainer
  /** showIcon 图标内容。 */
  showIcon?: boolean
}

/** MessageConfigOptions 选项配置。 */
export interface MessageConfigOptions extends MessageUseMessageOptions {}

type MessageDurationArg = number | (() => void)
type MessageArgTuple = [content: any, durationOrOnClose?: MessageDurationArg, onClose?: () => void]

/** MessageHandle 接口。 */
export interface MessageHandle extends PromiseLike<boolean> {
  /**  配置项。 */
  (): void
  /** promise 配置项。 */
  promise: Promise<boolean>
}

/** MessageInstance 对外暴露的实例能力。 */
export interface MessageInstance {
  /** 受控打开状态。 */
  open: (config: MessageOpenConfig) => MessageHandle
  /** success 配置项。 */
  success: (...args: MessageArgTuple) => MessageHandle
  /** info 配置项。 */
  info: (...args: MessageArgTuple) => MessageHandle
  /** warning 配置项。 */
  warning: (...args: MessageArgTuple) => MessageHandle
  /** error 配置项。 */
  error: (...args: MessageArgTuple) => MessageHandle
  /** 是否展示加载态。 */
  loading: (...args: MessageArgTuple) => MessageHandle
  /** destroy 配置项。 */
  destroy: (key?: MessageKey) => void
}

/** MESSAGE_ROOT_CLASS 内部常量。 */
const MESSAGE_ROOT_CLASS = 'message'
/** MESSAGE_DEFAULT_GAP 内部常量。 */
const MESSAGE_DEFAULT_GAP = 10
/** MESSAGE_DEFAULT_TOP_OFFSET 内部常量。 */
const MESSAGE_DEFAULT_TOP_OFFSET = 20
/** MESSAGE_DEFAULT_PLACEMENT 内部常量。 */
const MESSAGE_DEFAULT_PLACEMENT: MessagePlacement = 'top'
/** MESSAGE_DEFAULT_LOADING_DURATION 内部常量。 */
const MESSAGE_DEFAULT_LOADING_DURATION = 0
/** MESSAGE_ITEM_CLASS 内部常量。 */
const MESSAGE_ITEM_CLASS =
  'w-auto min-w-[min(16rem,100%)] max-w-[min(38rem,calc(100vw-2rem))] rounded-2xl px-4 py-2.5 shadow-xl'
/** MESSAGE_BODY_CLASS 内部常量。 */
const MESSAGE_BODY_CLASS = 'text-sm leading-5'
/** MESSAGE_CONFIG_KEYS 内部常量。 */
const MESSAGE_CONFIG_KEYS = /*#__PURE__*/ new Set([
  'key',
  'content',
  'children',
  'type',
  'duration',
  'icon',
  'showIcon',
  'variant',
  'className',
  'style',
  'onClose',
  'onClick',
  'closable',
  'pauseOnHover',
  'closeIcon',
  'contentClassName',
  'iconClassName',
  'closeClassName',
  'action',
])

let messageSeed = 0
let globalMessageConfig: MessageConfigOptions = {}
let globalMessageApi: MessageInstance | undefined
let globalMessageMount: HTMLDivElement | undefined

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | false | null | undefined>) => {
  return parts.filter(Boolean).join(' ')
}

/** 转换为 Child Array 的内部工具函数。 */

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: unknown) => value != null && value !== false && value !== ''

/** 判断 Record Like 的内部工具函数。 */
const isRecordLike = (value: any): value is Record<string, any> => {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** looks Like Message Config 的内部工具函数。 */
const looksLikeMessageConfig = (value: any): value is MessageOpenConfig => {
  return isRecordLike(value) && Object.keys(value).some(key => MESSAGE_CONFIG_KEYS.has(key))
}

/** 渲染 Message Body 的内部工具函数。 */
const RenderMessageBody = ({ arg0: content }: { arg0: any }) => {
  if (!hasRenderableContent(content)) return <></>
  return <div className={MESSAGE_BODY_CLASS}>{content}</div>
}

/** 解析 Message Inset 的内部工具函数。 */
const resolveMessageInset = (top?: number | string, inset?: ToastInset) => {
  if (inset != null) return inset
  return { x: 16, y: top ?? MESSAGE_DEFAULT_TOP_OFFSET }
}

/** 归一化 Message Options 的内部工具函数。 */
const normalizeMessageOptions = (
  options: MessageUseMessageOptions = {},
): ToastUseMessageOptions => {
  const {
    placement = MESSAGE_DEFAULT_PLACEMENT,
    top,
    inset,
    gap = MESSAGE_DEFAULT_GAP,
    className,
    ...rest
  } = options

  return {
    placement,
    inset: resolveMessageInset(top, inset),
    gap,
    className: mergeClassNames(MESSAGE_ROOT_CLASS, className),
    ...rest,
  }
}

/** 归一化 Message Config 的内部工具函数。 */
const normalizeMessageConfig = (
  config: MessageOpenConfig,
  fallbackType?: MessageType,
  fallbackDuration?: number | null,
): ToastMessageConfig => {
  const { content, children, type, duration, showIcon, className, contentClassName, ...rest } =
    config
  const resolvedType = type ?? fallbackType ?? 'neutral'
  const resolvedChildren = hasRenderableContent(children) ? children : content

  return {
    ...rest,
    type: resolvedType,
    duration: duration ?? fallbackDuration,
    showIcon: showIcon ?? resolvedType !== 'neutral',
    className: mergeClassNames(MESSAGE_ITEM_CLASS, className),
    contentClassName: mergeClassNames('min-w-0', contentClassName),
    content: resolvedChildren,
  }
}

/** 归一化 Message Args 的内部工具函数。 */
const normalizeMessageArgs = (...args: MessageArgTuple): MessageOpenConfig => {
  if (looksLikeMessageConfig(args[0])) {
    return args[0]
  }

  const [content, durationOrOnClose, onClose] = args
  return {
    content,
    duration: typeof durationOrOnClose === 'number' ? durationOrOnClose : undefined,
    onClose:
      typeof durationOrOnClose === 'function'
        ? durationOrOnClose
        : typeof onClose === 'function'
          ? onClose
          : undefined,
  }
}

/** THEN_KEY 内部常量。 */
const THEN_KEY = ['th', 'en'].join('')

/** attach Message Handle Promise 的内部工具函数。 */
const attachMessageHandlePromise = (handle: MessageHandle, promise: Promise<boolean>) => {
  Object.defineProperty(handle, THEN_KEY, {
    configurable: true,
    writable: true,
    value: (
      onfulfilled?: ((value: boolean) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) => promise.then(onfulfilled, onrejected),
  })
  handle.promise = promise
  return handle
}

/** 创建 Resolved Message Handle 的内部工具函数。 */
const createResolvedMessageHandle = () => {
  const promise = Promise.resolve(true)
  return attachMessageHandlePromise((() => {}) as MessageHandle, promise)
}

/** wrap Message Handle 的内部工具函数。 */
const wrapMessageHandle = (
  openToast: (config: ToastMessageConfig) => () => void,
  config: ToastMessageConfig,
) => {
  let resolved = false
  let closeFn: (() => void) | undefined
  let resolvePromise: (value: boolean) => void = () => {}

  const promise = new Promise<boolean>(resolve => {
    resolvePromise = resolve
  })

  const resolveClose = () => {
    if (resolved) return
    resolved = true
    resolvePromise(true)
  }

  closeFn = openToast({
    ...config,
    onClose: (meta: ToastItemCloseMeta) => {
      config.onClose?.(meta)
      resolveClose()
    },
  })

  const handle = (() => {
    closeFn?.()
    resolveClose()
  }) as MessageHandle

  return attachMessageHandlePromise(handle, promise)
}

/** 创建 Message Instance 的内部工具函数。 */
const createMessageInstance = (toastApi: ToastMessageApi): MessageInstance => {
  const open = (config: MessageOpenConfig) => {
    return wrapMessageHandle(toastApi.open, normalizeMessageConfig(config))
  }

  const createTypedOpen = (type: MessageType, fallbackDuration?: number | null) => {
    return (...args: MessageArgTuple) => {
      const config = normalizeMessageArgs(...args)
      return wrapMessageHandle(
        toastApi.open,
        normalizeMessageConfig(config, type, fallbackDuration),
      )
    }
  }

  return {
    open,
    success: createTypedOpen('success'),
    info: createTypedOpen('info'),
    warning: createTypedOpen('warning'),
    error: createTypedOpen('error'),
    loading: createTypedOpen('loading', MESSAGE_DEFAULT_LOADING_DURATION),
    destroy: toastApi.destroy,
  }
}

/** useMessage 组合式能力入口。 */
export const useMessage = (options: MessageUseMessageOptions = {}) => {
  const [toastApi, contextHolder] = Toast.useMessage(normalizeMessageOptions(options))
  const apiRef = useRef<MessageInstance>()

  if (apiRef.current == null) {
    apiRef.current = createMessageInstance(toastApi)
  }

  return [apiRef.current, contextHolder] as const
}

/** Message Item 的内部工具函数。 */
const MessageItem: FC<MessageItemProps> = ({
  content,
  children,
  type,
  showIcon,
  className,
  contentClassName,
  ...rest
}) => {
  const resolvedType = type ?? 'neutral'
  const resolvedChildren = hasRenderableContent(children) ? children : content

  return (
    <Toast.Item
      {...rest}
      type={resolvedType}
      showIcon={showIcon ?? resolvedType !== 'neutral'}
      className={mergeClassNames(MESSAGE_ITEM_CLASS, className)}
      contentClassName={mergeClassNames('min-w-0', contentClassName)}
    >
      <RenderMessageBody arg0={resolvedChildren} />
    </Toast.Item>
  )
}

/** Message 的内部工具函数。 */
const Message: FC<MessageProps> = ({
  placement = MESSAGE_DEFAULT_PLACEMENT,
  top,
  inset,
  gap = MESSAGE_DEFAULT_GAP,
  className,
  children,
  ...rest
}) => {
  return (
    <Toast
      {...rest}
      placement={placement}
      inset={resolveMessageInset(top, inset)}
      gap={gap}
      className={mergeClassNames(MESSAGE_ROOT_CLASS, className)}
    >
      {children}
    </Toast>
  )
}

/** ensure Global Message Mount 的内部工具函数。 */
const ensureGlobalMessageMount = () => {
  if (typeof document === 'undefined') return null

  if (globalMessageMount && !globalMessageMount.isConnected) {
    globalMessageMount = undefined
    globalMessageApi = undefined
  }

  if (globalMessageMount == null) {
    globalMessageMount = document.createElement('div')
    globalMessageMount.style.display = 'contents'
    globalMessageMount.dataset.rueMessageViewport = 'true'
    document.body.appendChild(globalMessageMount)
  }

  return globalMessageMount
}

/** Global Message Holder 的内部工具函数。 */
const GlobalMessageHolder: FC<{ options: MessageConfigOptions }> = ({ options }) => {
  const [api, holder] = useMessage(options)
  globalMessageApi = api
  return <ToastHolder state={holder} />
}

/** sync Global Message Holder 的内部工具函数。 */
const syncGlobalMessageHolder = () => {
  const mount = ensureGlobalMessageMount()
  if (!mount) return undefined

  if (!globalMessageApi) render(<GlobalMessageHolder options={globalMessageConfig} />, mount)
  return globalMessageApi
}

/** open Global Message 的内部工具函数。 */
const openGlobalMessage = (config: MessageOpenConfig) => {
  const normalizedConfig = {
    ...config,
    key: config.key ?? `rue-message-${messageSeed++}`,
  }
  const api = syncGlobalMessageHolder()

  if (api) {
    return api.open(normalizedConfig)
  }

  return createResolvedMessageHandle()
}

/** destroy Global Message 的内部工具函数。 */
const destroyGlobalMessage = (key?: MessageKey) => {
  const api = syncGlobalMessageHolder()
  if (api) {
    api.destroy(key)
  }
}

/** 设置 Global Message Config 的内部工具函数。 */
const setGlobalMessageConfig = (options: MessageConfigOptions) => {
  globalMessageConfig = {
    ...globalMessageConfig,
    ...options,
  }

  syncGlobalMessageHolder()
}

type MessageCompound = FC<MessageProps> & {
  Item: FC<MessageItemProps>
  useMessage: (options?: MessageUseMessageOptions) => readonly [MessageInstance, any]
  open: (config: MessageOpenConfig) => MessageHandle
  success: (...args: MessageArgTuple) => MessageHandle
  info: (...args: MessageArgTuple) => MessageHandle
  warning: (...args: MessageArgTuple) => MessageHandle
  error: (...args: MessageArgTuple) => MessageHandle
  loading: (...args: MessageArgTuple) => MessageHandle
  destroy: (key?: MessageKey) => void
  config: (options: MessageConfigOptions) => void
}

const MessageCompound: MessageCompound = /*#__PURE__*/ Object.assign(Message, {
  Item: MessageItem,
  useMessage,
  open: openGlobalMessage,
  success: (...args: MessageArgTuple) => {
    return openGlobalMessage({ ...normalizeMessageArgs(...args), type: 'success' })
  },
  info: (...args: MessageArgTuple) => {
    return openGlobalMessage({ ...normalizeMessageArgs(...args), type: 'info' })
  },
  warning: (...args: MessageArgTuple) => {
    return openGlobalMessage({ ...normalizeMessageArgs(...args), type: 'warning' })
  },
  error: (...args: MessageArgTuple) => {
    return openGlobalMessage({ ...normalizeMessageArgs(...args), type: 'error' })
  },
  loading: (...args: MessageArgTuple) => {
    const config = normalizeMessageArgs(...args)
    return openGlobalMessage({
      ...config,
      type: 'loading',
      duration: config.duration ?? MESSAGE_DEFAULT_LOADING_DURATION,
    })
  },
  destroy: destroyGlobalMessage,
  config: setGlobalMessageConfig,
})

/** 默认导出全局消息组件。 */
export default MessageCompound
