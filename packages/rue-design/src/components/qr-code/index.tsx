/*
QRCode 模块概述
- 汇总二维码组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, useRef, watch } from '@rue-js/rue'
import { encodeQrMatrix, type EncodedQrCode, type QRCodeErrorCorrectionLevel } from './encoder'

/** 重导出二维码纠错等级类型，供组件使用方复用编码配置。 */
export type { QRCodeErrorCorrectionLevel } from './encoder'

/** QRCodeType 视觉或语义变体类型。 */
export type QRCodeType = 'canvas' | 'svg'
/** QRCodeStatus 状态类型。 */
export type QRCodeStatus = 'active' | 'expired' | 'loading' | 'scanned'

/** QRCodeLocale 接口。 */
export interface QRCodeLocale {
  /** expired 配置项。 */
  expired?: any
  /** refresh 配置项。 */
  refresh?: any
  /** scanned 配置项。 */
  scanned?: any
  /** 是否展示加载态。 */
  loading?: any
  /** overflow 配置项。 */
  overflow?: any
}

/** QRCodeStatusRenderInfo 接口。 */
export interface QRCodeStatusRenderInfo {
  /** 组件状态。 */
  status: Exclude<QRCodeStatus, 'active'>
  /** locale 配置项。 */
  locale: QRCodeLocale
  /** onRefresh 事件回调。 */
  onRefresh?: () => void
}

/** QRCodeClassNames 局部类名配置。 */
export interface QRCodeClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** frame 配置项。 */
  frame?: string
  /** code 配置项。 */
  code?: string
  /** svg 配置项。 */
  svg?: string
  /** canvas 配置项。 */
  canvas?: string
  /** cover 配置项。 */
  cover?: string
  /** 组件状态。 */
  status?: string
  /** action 配置项。 */
  action?: string
  /** 图标内容。 */
  icon?: string
}

/** QRCodeStyles 局部样式配置。 */
export interface QRCodeStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** frame 配置项。 */
  frame?: Record<string, any>
  /** code 配置项。 */
  code?: Record<string, any>
  /** svg 配置项。 */
  svg?: Record<string, any>
  /** canvas 配置项。 */
  canvas?: Record<string, any>
  /** cover 配置项。 */
  cover?: Record<string, any>
  /** 组件状态。 */
  status?: Record<string, any>
  /** action 配置项。 */
  action?: Record<string, any>
  /** 图标内容。 */
  icon?: Record<string, any>
}

/** QRCodeProps 组件属性。 */
export interface QRCodeProps {
  /** 受控值。 */
  value?: string
  /** 组件类型或语义类型。 */
  type?: QRCodeType
  /** 图标内容。 */
  icon?: string
  /** 组件尺寸。 */
  size?: number
  /** iconSize 尺寸。 */
  iconSize?: number | { width?: number; height?: number }
  /** 组件语义色。 */
  color?: string
  /** bgColor 颜色。 */
  bgColor?: string
  /** errorLevel 配置项。 */
  errorLevel?: QRCodeErrorCorrectionLevel
  /** 组件状态。 */
  status?: QRCodeStatus
  /** bordered 配置项。 */
  bordered?: boolean
  /** onRefresh 事件回调。 */
  onRefresh?: () => void
  /** statusRender 自定义渲染函数。 */
  statusRender?: (info: { locale: QRCodeLocale; onRefresh: () => void }) => any
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** marginSize 尺寸。 */
  marginSize?: number
  /** locale 配置项。 */
  locale?: QRCodeLocale
  /** 按局部区域覆盖的类名集合。 */
  classNames?: QRCodeClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: QRCodeStyles
  /** boostLevel 配置项。 */
  boostLevel?: boolean
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface IconSizeShape {
  width: number
  height: number
}

interface SvgIconLayout {
  x: number
  y: number
  width: number
  height: number
  padding: number
}

/** DEFAULT_LOCALE 内部常量。 */
const DEFAULT_LOCALE: Required<QRCodeLocale> = {
  expired: '二维码已过期',
  refresh: '刷新二维码',
  scanned: '已扫码，等待确认',
  loading: '准备二维码中…',
  overflow: '内容过长，请缩短后重试',
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (...parts: Array<string | undefined | null | false>) =>
  parts.filter(Boolean).join(' ')

/** clamp Number 的内部工具函数。 */
const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

/** 归一化 Icon Size 的内部工具函数。 */
const normalizeIconSize = (iconSize: QRCodeProps['iconSize'], innerSize: number): IconSizeShape => {
  const fallbackSide = clampNumber(Math.round(innerSize * 0.24), 22, Math.round(innerSize * 0.42))

  if (typeof iconSize === 'number') {
    const side = clampNumber(iconSize, 16, Math.round(innerSize * 0.42))
    return { width: side, height: side }
  }

  if (iconSize && typeof iconSize === 'object') {
    return {
      width: clampNumber(iconSize.width ?? fallbackSide, 16, Math.round(innerSize * 0.42)),
      height: clampNumber(iconSize.height ?? fallbackSide, 16, Math.round(innerSize * 0.42)),
    }
  }

  return {
    width: fallbackSide,
    height: fallbackSide,
  }
}

/** 构建 Svg Path 的内部工具函数。 */
const buildSvgPath = (matrix: boolean[][], margin: number) => {
  let path = ''

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    let start = -1

    for (let columnIndex = 0; columnIndex <= matrix.length; columnIndex += 1) {
      const filled = columnIndex < matrix.length ? matrix[rowIndex]![columnIndex]! : false

      if (filled && start < 0) {
        start = columnIndex
      }

      if (!filled && start >= 0) {
        const x = start + margin
        const y = rowIndex + margin
        path += `M${x} ${y}h${columnIndex - start}v1H${x}z`
        start = -1
      }
    }
  }

  return path
}

/** 解析 Svg Icon Layout 的内部工具函数。 */
const resolveSvgIconLayout = (
  totalUnits: number,
  innerSize: number,
  iconSize: IconSizeShape,
): SvgIconLayout => {
  const width = (iconSize.width / innerSize) * totalUnits
  const height = (iconSize.height / innerSize) * totalUnits
  const padding = Math.max(
    (Math.min(iconSize.width, iconSize.height) * 0.18 * totalUnits) / innerSize,
    0.9,
  )

  return {
    x: (totalUnits - width) / 2,
    y: (totalUnits - height) / 2,
    width,
    height,
    padding,
  }
}

/** draw Canvas Icon 的内部工具函数。 */
const drawCanvasIcon = (
  context: CanvasRenderingContext2D,
  pixelSize: number,
  iconSize: IconSizeShape,
  bgColor: string,
  image: CanvasImageSource,
) => {
  const width = Math.max(1, Math.round(iconSize.width))
  const height = Math.max(1, Math.round(iconSize.height))
  const padding = Math.max(4, Math.round(Math.min(width, height) * 0.18))
  const x = Math.round((pixelSize - width) / 2)
  const y = Math.round((pixelSize - height) / 2)

  context.fillStyle = bgColor
  context.fillRect(x - padding, y - padding, width + padding * 2, height + padding * 2)
  context.drawImage(image, x, y, width, height)
}

/** encode Safe 的内部工具函数。 */
const encodeSafe = (
  value: string,
  errorLevel: QRCodeErrorCorrectionLevel,
  boostLevel: boolean,
): { encoded: EncodedQrCode | null; error: Error | null } => {
  try {
    return {
      encoded: encodeQrMatrix(value, { errorLevel, boostLevel }),
      error: null,
    }
  } catch (error) {
    return {
      encoded: null,
      error: error as Error,
    }
  }
}

/** Loading Indicator 的内部工具函数。 */
const LoadingIndicator = () => <span className="loading loading-spinner loading-sm" />

/** Expired Icon 的内部工具函数。 */
const ExpiredIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 1 1-2.34-5.66L20 8V4h-4" />
  </svg>
)

/** Scanned Icon 的内部工具函数。 */
const ScannedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m7 12 3 3 7-7" />
    <circle cx="12" cy="12" r="9" />
  </svg>
)

/** Warning Icon 的内部工具函数。 */
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 4 8 14H4L12 4Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
  </svg>
)

/** Refresh Icon 的内部工具函数。 */
const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 1 1-2.34-5.66L20 8V4h-4" />
  </svg>
)

/** Overflow State 的内部工具函数。 */
const OverflowState: FC<{ locale: Required<QRCodeLocale>; message: string }> = ({
  locale,
  message,
}) => {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex items-center gap-2 text-warning">
        <WarningIcon />
        <span className="text-sm font-semibold text-base-content">{locale.overflow}</span>
      </div>
      <p className="m-0 text-xs opacity-70">{message}</p>
    </div>
  )
}

/** Default Status Content 的内部工具函数。 */
const DefaultStatusContent: FC<QRCodeStatusRenderInfo> = ({ status, locale, onRefresh }) => {
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-2">
        <LoadingIndicator />
        <div className="text-sm font-medium">{locale.loading}</div>
      </div>
    )
  }

  if (status === 'scanned') {
    return (
      <div className="flex flex-col items-center gap-2 text-success">
        <ScannedIcon />
        <div className="text-sm font-medium text-base-content">{locale.scanned}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-warning">
        <ExpiredIcon />
        <span className="text-sm font-medium text-base-content">{locale.expired}</span>
      </div>
      {onRefresh ? (
        <button
          type="button"
          className="btn btn-primary btn-sm rounded-full px-4"
          onClick={onRefresh}
          data-rue-qrcode-refresh="true"
        >
          <RefreshIcon />
          {locale.refresh}
        </button>
      ) : null}
    </div>
  )
}

/** QRCode 的内部工具函数。 */
const QRCode: FC<QRCodeProps> = (
  {
    value,
    type = 'canvas',
    icon,
    size = 160,
    iconSize,
    color = '#111827',
    errorLevel = 'M',
    status = 'active',
    bordered = true,
    onRefresh,
    style,
    className,
    rootClassName,
    bgColor = '#ffffff',
    marginSize = 4,
    locale,
    classNames,
    styles,
    boostLevel = true,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  if (value == null || value === '') {
    return <></>
  }

  const mergedLocale = { ...DEFAULT_LOCALE, ...locale }
  const resolvedSize = Math.max(48, Math.round(size))
  const framePadding = bordered ? Math.max(6, Math.round(resolvedSize * 0.06)) : 0
  const innerSize = Math.max(resolvedSize - framePadding * 2, 24)
  const quietZone = Math.max(0, Math.round(marginSize))
  const radius = Math.max(16, Math.round(resolvedSize * 0.16))
  const normalizedIconSize = normalizeIconSize(iconSize, innerSize)
  const drawTicketRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const { encoded, error } = encodeSafe(String(value), errorLevel, boostLevel)
  const totalUnits = (encoded?.size ?? 21) + quietZone * 2
  const svgPath = encoded ? buildSvgPath(encoded.matrix, quietZone) : ''
  const svgIconLayout = resolveSvgIconLayout(totalUnits, innerSize, normalizedIconSize)
  const shouldShowCover = !!error || status !== 'active'
  const statusInfo: QRCodeStatusRenderInfo | null =
    status !== 'active'
      ? {
          status,
          locale: mergedLocale,
          onRefresh,
        }
      : null

  const drawCanvas = () => {
    const canvas = canvasRef.current

    if (!canvas || type !== 'canvas') {
      return
    }

    const result = encodeSafe(String(value), errorLevel, boostLevel)
    if (!result.encoded) {
      return
    }

    const matrix = result.encoded.matrix
    const pixelRatio = globalThis.devicePixelRatio || 1
    const pixelSize = Math.max(1, Math.round(innerSize * pixelRatio))
    const viewSize = result.encoded.size + quietZone * 2

    canvas.width = pixelSize
    canvas.height = pixelSize
    canvas.style.width = `${innerSize}px`
    canvas.style.height = `${innerSize}px`

    let context: CanvasRenderingContext2D | null = null

    try {
      context = canvas.getContext('2d')
    } catch {
      context = null
    }

    if (!context) {
      return
    }

    const toPixel = (unit: number) => Math.round((unit / viewSize) * pixelSize)

    context.clearRect(0, 0, pixelSize, pixelSize)
    context.fillStyle = bgColor
    context.fillRect(0, 0, pixelSize, pixelSize)
    context.fillStyle = color

    for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < matrix.length; columnIndex += 1) {
        if (!matrix[rowIndex]![columnIndex]) {
          continue
        }

        const left = toPixel(columnIndex + quietZone)
        const top = toPixel(rowIndex + quietZone)
        const right = toPixel(columnIndex + quietZone + 1)
        const bottom = toPixel(rowIndex + quietZone + 1)

        context.fillRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top))
      }
    }

    if (!icon || typeof Image === 'undefined') {
      return
    }

    const drawTicket = (drawTicketRef.current ?? 0) + 1
    drawTicketRef.current = drawTicket

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (drawTicketRef.current !== drawTicket || canvasRef.current !== canvas) {
        return
      }

      try {
        drawCanvasIcon(
          context!,
          pixelSize,
          {
            width: Math.max(1, Math.round(normalizedIconSize.width * pixelRatio)),
            height: Math.max(1, Math.round(normalizedIconSize.height * pixelRatio)),
          },
          bgColor,
          image,
        )
      } catch {
        // ignore cross-origin or draw failures and keep the QR surface available
      }
    }
    image.onerror = () => undefined
    image.src = icon
  }

  const applyCanvasRef = (element: HTMLCanvasElement | null) => {
    canvasRef.current = element

    if (element) {
      drawCanvas()
    }
  }

  onMounted(() => {
    drawCanvas()

    watch(
      () =>
        [
          value,
          type,
          innerSize,
          color,
          bgColor,
          icon ?? '',
          normalizedIconSize.width,
          normalizedIconSize.height,
          quietZone,
          errorLevel,
          boostLevel ? '1' : '0',
        ].join('|'),
      () => {
        drawCanvas()
      },
      { immediate: true },
    )
  })

  return (
    <div
      {...rest}
      className={appendClassName(
        'rue-qrcode relative inline-flex items-center justify-center overflow-hidden border-base-300 text-base-content',
        bordered
          ? 'border bg-base-100 shadow-sm'
          : 'border border-transparent bg-transparent shadow-none',
        className,
        rootClassName,
        classNames?.root,
      )}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${resolvedSize}px`,
        height: `${resolvedSize}px`,
        borderRadius: `${radius}px`,
        overflow: 'hidden',
        ...styles?.root,
        ...style,
      }}
      data-rue-qrcode="true"
      data-rue-qrcode-type={type}
      data-rue-qrcode-status={error ? 'overflow' : status}
    >
      <div
        className={appendClassName(
          'rue-qrcode-frame relative flex items-center justify-center overflow-hidden',
          classNames?.frame,
        )}
        style={{
          width: `${innerSize}px`,
          height: `${innerSize}px`,
          borderRadius: `${Math.max(12, radius - framePadding / 2)}px`,
          backgroundColor: bgColor,
          ...styles?.frame,
        }}
        data-rue-qrcode-frame="true"
      >
        {encoded ? (
          type === 'svg' ? (
            <svg
              viewBox={`0 0 ${totalUnits} ${totalUnits}`}
              width={innerSize}
              height={innerSize}
              className={appendClassName('rue-qrcode-svg block', classNames?.code, classNames?.svg)}
              style={{
                display: 'block',
                width: `${innerSize}px`,
                height: `${innerSize}px`,
                ...styles?.code,
                ...styles?.svg,
              }}
              data-rue-qrcode-svg="true"
              aria-hidden="true"
            >
              <rect x="0" y="0" width={totalUnits} height={totalUnits} fill={bgColor} />
              <path d={svgPath} fill={color} />
              {icon ? (
                <>
                  <rect
                    x={svgIconLayout.x - svgIconLayout.padding}
                    y={svgIconLayout.y - svgIconLayout.padding}
                    width={svgIconLayout.width + svgIconLayout.padding * 2}
                    height={svgIconLayout.height + svgIconLayout.padding * 2}
                    rx={Math.max(svgIconLayout.padding * 0.9, 1.2)}
                    fill={bgColor}
                  />
                  <image
                    href={icon}
                    xlinkHref={icon}
                    x={svgIconLayout.x}
                    y={svgIconLayout.y}
                    width={svgIconLayout.width}
                    height={svgIconLayout.height}
                    preserveAspectRatio="xMidYMid meet"
                    className={appendClassName('rue-qrcode-icon', classNames?.icon)}
                    style={{ ...styles?.icon }}
                  />
                </>
              ) : null}
            </svg>
          ) : (
            <canvas
              ref={applyCanvasRef}
              className={appendClassName(
                'rue-qrcode-canvas block',
                classNames?.code,
                classNames?.canvas,
              )}
              style={{
                display: 'block',
                width: `${innerSize}px`,
                height: `${innerSize}px`,
                ...styles?.code,
                ...styles?.canvas,
              }}
              data-rue-qrcode-canvas="true"
              aria-hidden="true"
            />
          )
        ) : null}
      </div>

      {shouldShowCover ? (
        <div
          className={appendClassName(
            'rue-qrcode-cover absolute inset-0 flex items-center justify-center p-4 text-center',
            classNames?.cover,
          )}
          style={{
            backgroundColor: 'oklch(var(--b1) / 0.82)',
            backdropFilter: 'blur(10px)',
            ...styles?.cover,
          }}
          data-rue-qrcode-cover="true"
        >
          <div
            className={appendClassName(
              'rue-qrcode-status rounded-[20px] border border-base-300 bg-base-100/90 px-4 py-3 shadow-lg',
              classNames?.status,
            )}
            style={{ ...styles?.status }}
          >
            {error ? <OverflowState locale={mergedLocale} message={error.message} /> : null}
            {!error && statusInfo && slots.status ? <>{slots.status}</> : null}
            {!error && statusInfo && !slots.status ? (
              <DefaultStatusContent {...statusInfo} />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** 默认导出二维码组件。 */
export default QRCode
