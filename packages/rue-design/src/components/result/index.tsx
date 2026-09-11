/*
Result 组件概述
- 参考 antd Result 的 status、title、subTitle、extra、children 主能力，为 Rue 补齐结果反馈入口。
- 视觉上沿用 Rue + daisyUI 的卡片、柔和背景与语义色，不复刻 antd 的插画语言。
- 内置 success/info/warning/error 图标与 403/404/500 异常插画，同时暴露 PRESENTED_IMAGE_* 便于单独复用。
*/
import type { FC } from '@rue-js/rue'

/** ResultTone 语义色类型。 */
export type ResultTone = 'info' | 'success' | 'warning' | 'error'
/** ResultExceptionStatus 状态类型。 */
export type ResultExceptionStatus = 403 | 404 | 500 | '403' | '404' | '500'
/** ResultStatus 状态类型。 */
export type ResultStatus = ResultTone | ResultExceptionStatus
/** ResultVariant 视觉或语义变体类型。 */
export type ResultVariant = 'surface' | 'soft' | 'outline'
/** ResultSize 尺寸类型。 */
export type ResultSize = 'sm' | 'md' | 'lg'
/** ResultAlign 对齐方式类型。 */
export type ResultAlign = 'center' | 'start'

/** ResultProps 组件属性。 */
export interface ResultProps {
  /** 组件状态。 */
  status?: ResultStatus
  /** 图标内容。 */
  icon?: false | null
  /** 标题内容。 */
  title?: string | number
  /** subTitle 配置项。 */
  subTitle?: string | number
  /** 组件子内容。 */
  children?: any
  /** 组件视觉变体。 */
  variant?: ResultVariant
  /** 组件尺寸。 */
  size?: ResultSize
  /** 交叉轴或内容对齐方式。 */
  align?: ResultAlign
  /** showIcon 图标内容。 */
  showIcon?: boolean
  /** bordered 配置项。 */
  bordered?: boolean
  /** role 配置项。 */
  role?: string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** iconClassName 附加类名。 */
  iconClassName?: string
  /** iconStyle 内联样式。 */
  iconStyle?: any
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** contentStyle 内联样式。 */
  contentStyle?: any
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** titleStyle 内联样式。 */
  titleStyle?: any
  /** subTitleClassName 附加类名。 */
  subTitleClassName?: string
  /** subTitleStyle 内联样式。 */
  subTitleStyle?: any
  /** extraClassName 附加类名。 */
  extraClassName?: string
  /** extraStyle 内联样式。 */
  extraStyle?: any
  /** bodyClassName 附加类名。 */
  bodyClassName?: string
  /** bodyStyle 内联样式。 */
  bodyStyle?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ResultPresentedImageProps 组件属性。 */
export interface ResultPresentedImageProps {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件尺寸。 */
  size?: ResultSize
}

/** ResultType 接口。 */
export interface ResultType extends FC<ResultProps> {
  /** PRESENTED_IMAGE_403 配置项。 */
  PRESENTED_IMAGE_403: FC<ResultPresentedImageProps>
  /** PRESENTED_IMAGE_404 配置项。 */
  PRESENTED_IMAGE_404: FC<ResultPresentedImageProps>
  /** PRESENTED_IMAGE_500 配置项。 */
  PRESENTED_IMAGE_500: FC<ResultPresentedImageProps>
}

interface ExceptionMeta {
  label: string
  title: string
  subTitle: string
  scene: string
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** 归一化 Status 的内部工具函数。 */
const normalizeStatus = (status?: ResultStatus) => {
  if (status === undefined || status === null) return 'info'
  return `${status}`
}

/** 判断 Exception Status 的内部工具函数。 */
const isExceptionStatus = (status: string): status is '403' | '404' | '500' => {
  return status === '403' || status === '404' || status === '500'
}

/** 解析 Tone 的内部工具函数。 */
const resolveTone = (status: string): ResultTone => {
  if (status === 'success' || status === 'warning' || status === 'error') return status
  if (status === '403') return 'warning'
  if (status === '500') return 'error'
  return 'info'
}

/** 解析 Variant Class 的内部工具函数。 */
const resolveVariantClass = (variant: ResultVariant, bordered: boolean) => {
  let cls = ''

  if (variant === 'soft') {
    cls += ' bg-base-200/60 shadow-inner'
  } else if (variant === 'outline') {
    cls += ' bg-base-100/70 shadow-none'
  } else {
    cls += ' bg-base-100 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.6)]'
  }

  if (variant === 'outline') {
    cls += ' border-2 border-base-300/80'
  } else if (bordered) {
    cls += ' border border-base-300/70'
  } else {
    cls += ' border border-transparent'
  }

  return cls.trim()
}

/** 解析 Glow Class 的内部工具函数。 */
const resolveGlowClass = (tone: ResultTone) => {
  switch (tone) {
    case 'success':
      return 'bg-success/20'
    case 'warning':
      return 'bg-warning/20'
    case 'error':
      return 'bg-error/20'
    default:
      return 'bg-info/20'
  }
}

/** 解析 Tone Text Class 的内部工具函数。 */
const resolveToneTextClass = (tone: ResultTone) => {
  switch (tone) {
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'error':
      return 'text-error'
    default:
      return 'text-info'
  }
}

/** 解析 Tone Panel Class 的内部工具函数。 */
const resolveTonePanelClass = (tone: ResultTone) => {
  switch (tone) {
    case 'success':
      return 'border-success/15 bg-success/10 text-success'
    case 'warning':
      return 'border-warning/15 bg-warning/10 text-warning'
    case 'error':
      return 'border-error/15 bg-error/10 text-error'
    default:
      return 'border-info/15 bg-info/10 text-info'
  }
}

/** 解析 Title Size Class 的内部工具函数。 */
const resolveTitleSizeClass = (size: ResultSize) => {
  switch (size) {
    case 'sm':
      return 'text-2xl sm:text-[1.8rem]'
    case 'lg':
      return 'text-4xl sm:text-[2.8rem]'
    default:
      return 'text-3xl sm:text-[2.25rem]'
  }
}

/** 解析 Glyph Size Class 的内部工具函数。 */
const resolveGlyphSizeClass = (size: ResultSize) => {
  switch (size) {
    case 'sm':
      return 'size-9'
    case 'lg':
      return 'size-14'
    default:
      return 'size-11'
  }
}

/** 解析 Icon Shell Class 的内部工具函数。 */
const resolveIconShellClass = (size: ResultSize) => {
  switch (size) {
    case 'sm':
      return 'size-20 rounded-[1.5rem]'
    case 'lg':
      return 'size-28 rounded-[2rem]'
    default:
      return 'size-24 rounded-[1.75rem]'
  }
}

/** 解析 Illustration Width Class 的内部工具函数。 */
const resolveIllustrationWidthClass = (size: ResultSize) => {
  switch (size) {
    case 'sm':
      return 'max-w-[16rem]'
    case 'lg':
      return 'max-w-[23rem]'
    default:
      return 'max-w-[19rem]'
  }
}

const exceptionMetaMap: Record<'403' | '404' | '500', ExceptionMeta> = {
  '403': {
    label: '访问受限',
    title: '当前空间暂不可访问',
    subTitle: '权限策略已拦截这次访问请求。请切换账号、申请权限，或返回上一级工作区。',
    scene: 'Permission rules blocked the current request.',
  },
  '404': {
    label: '路径缺失',
    title: '页面没有找到',
    subTitle: '目标页面可能已移动、删除，或地址输入不完整。你可以返回首页重新定位内容。',
    scene: 'The requested route is no longer mapped.',
  },
  '500': {
    label: '服务异常',
    title: '系统刚刚开了个小差',
    subTitle: '服务端返回了异常结果。建议稍后重试，或先把上下文信息发送给维护者。',
    scene: 'The backend returned an unexpected fault.',
  },
}

/** Status Glyph 的内部工具函数。 */
const StatusGlyph: FC<{ status: ResultTone; className?: string }> = ({ status, className }) => {
  if (status === 'success') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
        data-rue-result-glyph="success"
      >
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.4 12.3 2.4 2.4 4.8-5.1" />
      </svg>
    )
  }

  if (status === 'warning') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
        data-rue-result-glyph="warning"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5 20 18.5H4L12 4.5Z" />
        <path strokeLinecap="round" d="M12 9.5v4.8" />
        <circle cx="12" cy="16.9" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (status === 'error') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
        data-rue-result-glyph="error"
      >
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="m9 9 6 6M15 9l-6 6" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      data-rue-result-glyph="info"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 10.2v5.2" />
      <circle cx="12" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Exception Illustration 的内部工具函数。 */
const ExceptionIllustration: FC<
  ResultPresentedImageProps & { status: '403' | '404' | '500'; tone: ResultTone }
> = ({ status, tone, className, style, size = 'md' }) => {
  const meta = exceptionMetaMap[status]

  return (
    <div
      className={appendClassName(
        `relative mx-auto w-full ${resolveIllustrationWidthClass(size)}`,
        className,
      )}
      style={style}
      data-rue-result-illustration={status}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-6 top-4 h-24 rounded-[2rem] blur-2xl opacity-75 ${resolveGlowClass(tone)}`}
      />
      <div className="relative overflow-hidden rounded-[1.8rem] border border-base-300/70 bg-base-200/65 p-4 shadow-inner">
        <div
          aria-hidden="true"
          className="absolute left-4 top-4 h-3 w-20 rounded-full bg-base-100/70"
        />
        <div
          aria-hidden="true"
          className="absolute right-4 top-4 size-10 rounded-full border border-base-100/70 bg-base-100/75"
        />
        <div className="relative rounded-[1.45rem] border border-base-100/80 bg-base-100/90 p-5 shadow-[0_22px_50px_-36px_rgba(15,23,42,0.65)]">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] ${resolveTonePanelClass(tone)}`}
            >
              {String(meta.label)}
            </span>
            <span className="text-[0.68rem] uppercase tracking-[0.28em] opacity-50">
              Rue Result
            </span>
          </div>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div
                className={`text-[4rem] font-black leading-none tracking-[-0.1em] ${resolveToneTextClass(tone)}`}
              >
                {String(status)}
              </div>
              <div className="mt-2 max-w-[13rem] text-xs leading-5 opacity-60">
                {String(meta.scene)}
              </div>
            </div>
            <div
              className={`grid size-16 shrink-0 place-items-center rounded-[1.35rem] border ${resolveTonePanelClass(tone)}`}
            >
              <StatusGlyph status={tone} className="size-7" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 构建 Default Icon 的内部工具函数。 */
const DefaultIcon: FC<{ status: string; tone: ResultTone; size: ResultSize }> = ({
  status,
  tone,
  size,
}) => {
  if (isExceptionStatus(status)) {
    return <ExceptionIllustration status={status} tone={tone} size={size} />
  }

  return (
    <div
      className={`grid place-items-center border ${resolveTonePanelClass(tone)} ${resolveIconShellClass(size)}`}
      data-rue-result-icon="true"
    >
      <StatusGlyph status={tone} className={resolveGlyphSizeClass(size)} />
    </div>
  )
}

/** Presented Image403 的内部工具函数。 */
const PresentedImage403: FC<ResultPresentedImageProps> = props => {
  return <ExceptionIllustration {...props} status="403" tone="warning" />
}

/** Presented Image404 的内部工具函数。 */
const PresentedImage404: FC<ResultPresentedImageProps> = props => {
  return <ExceptionIllustration {...props} status="404" tone="info" />
}

/** Presented Image500 的内部工具函数。 */
const PresentedImage500: FC<ResultPresentedImageProps> = props => {
  return <ExceptionIllustration {...props} status="500" tone="error" />
}

/** Result Base 的内部工具函数。 */
const ResultBase: FC<ResultProps> = (
  {
    status = 'info',
    icon,
    title,
    subTitle,
    children,
    variant = 'surface',
    size = 'md',
    align = 'center',
    showIcon = true,
    bordered = true,
    role = 'status',
    className,
    style,
    iconClassName,
    iconStyle,
    contentClassName,
    contentStyle,
    titleClassName,
    titleStyle,
    subTitleClassName,
    subTitleStyle,
    extraClassName,
    extraStyle,
    bodyClassName,
    bodyStyle,
    ...rest
  }: ResultProps,
  slots: Record<string, any> = {},
) => {
  const normalizedStatus = normalizeStatus(status)
  const tone = resolveTone(normalizedStatus)
  const exceptionMeta = isExceptionStatus(normalizedStatus)
    ? exceptionMetaMap[normalizedStatus]
    : undefined
  const resolvedTitle = title ?? exceptionMeta?.title
  const resolvedSubTitle = subTitle ?? exceptionMeta?.subTitle
  const isIconHidden = showIcon === false || icon === null || icon === false
  const contentAlignmentClass =
    align === 'start' ? 'items-start text-left' : 'items-center text-center'
  const titleAlignmentClass =
    align === 'start' ? 'items-start text-left' : 'items-center text-center'
  const extraAlignmentClass = align === 'start' ? 'justify-start' : 'justify-center'
  const hasBody = hasRenderableContent(children)

  return (
    <section
      role={role}
      className={appendClassName(
        `rue-result relative isolate overflow-hidden rounded-[2rem] px-6 py-7 sm:px-8 ${align === 'start' ? 'text-left' : 'text-center'} ${resolveVariantClass(variant, bordered)}`,
        className,
      )}
      style={style}
      data-rue-status={normalizedStatus}
      data-rue-tone={tone}
      {...rest}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl opacity-50 ${resolveGlowClass(tone)}`}
      />
      <div
        className={appendClassName(
          `relative flex w-full flex-col gap-5 ${contentAlignmentClass}`,
          contentClassName,
        )}
        style={contentStyle}
      >
        {isIconHidden ? null : (
          <div className={iconClassName} style={iconStyle} data-rue-result-icon-slot="true">
            {slots.icon ? (
              slots.icon
            ) : (
              <DefaultIcon status={normalizedStatus} tone={tone} size={size} />
            )}
          </div>
        )}

        {resolvedTitle != null || resolvedSubTitle != null ? (
          <div className={`flex w-full max-w-3xl flex-col gap-2 ${titleAlignmentClass}`}>
            {resolvedTitle != null ? (
              <div
                className={appendClassName(
                  `${resolveTitleSizeClass(size)} font-semibold leading-tight tracking-[-0.02em]`,
                  titleClassName,
                )}
                style={titleStyle}
              >
                {String(resolvedTitle)}
              </div>
            ) : null}
            {resolvedSubTitle != null ? (
              <div
                className={appendClassName(
                  'max-w-2xl text-sm leading-7 text-base-content/70 sm:text-base',
                  subTitleClassName,
                )}
                style={subTitleStyle}
              >
                {String(resolvedSubTitle)}
              </div>
            ) : null}
          </div>
        ) : null}

        {slots.extra != null ? (
          <div
            className={appendClassName(
              `flex w-full flex-wrap gap-3 ${extraAlignmentClass}`,
              extraClassName,
            )}
            style={extraStyle}
            data-rue-result-extra="true"
          >
            {slots.extra}
          </div>
        ) : null}

        {hasBody ? (
          <div
            className={appendClassName(
              'w-full max-w-4xl rounded-[1.5rem] border border-base-200/80 bg-base-100/70 p-5 text-left shadow-inner',
              bodyClassName,
            )}
            style={bodyStyle}
            data-rue-result-body="true"
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  )
}

const Result = /*#__PURE__*/ Object.assign(ResultBase, {
  PRESENTED_IMAGE_403: PresentedImage403,
  PRESENTED_IMAGE_404: PresentedImage404,
  PRESENTED_IMAGE_500: PresentedImage500,
}) as ResultType

/** 默认导出结果页组件。 */
export default Result
