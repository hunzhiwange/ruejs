/*
ColorPicker 组件概述
- 参考成熟组件库的颜色选择交互，提供受控 / 非受控、格式切换、透明度、预设色与自定义触发器。
- 视觉保持 Rue 当前输入与卡片语言：不复刻特定组件库视觉，只对核心能力做对齐。
- 组件源码保持 TSX 形态，让 Rue 编译器直接参与，不写预转换标记。
*/
import type { FC } from '@rue-js/rue'
import {
  computed,
  Teleport,
  onMounted,
  onUnmounted,
  ref,
  useRef,
  useState,
  watch,
} from '@rue-js/rue'

/** FORMAT_HEX 常量。 */
export const FORMAT_HEX = 'hex'
/** FORMAT_RGB 常量。 */
export const FORMAT_RGB = 'rgb'
/** FORMAT_HSB 常量。 */
export const FORMAT_HSB = 'hsb'
/** COLOR_PICKER_MODE_SINGLE 常量。 */
export const COLOR_PICKER_MODE_SINGLE = 'single'
/** COLOR_PICKER_MODE_GRADIENT 常量。 */
export const COLOR_PICKER_MODE_GRADIENT = 'gradient'

/** ColorFormatType 视觉或语义变体类型。 */
export type ColorFormatType = typeof FORMAT_HEX | typeof FORMAT_RGB | typeof FORMAT_HSB
/** ColorPickerMode 类型。 */
export type ColorPickerMode = typeof COLOR_PICKER_MODE_SINGLE | typeof COLOR_PICKER_MODE_GRADIENT
/** ColorPickerTrigger 类型。 */
export type ColorPickerTrigger = 'click' | 'hover'
/** ColorPickerPlacement 位置或方向类型。 */
export type ColorPickerPlacement =
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'
  | 'left'
  | 'leftTop'
  | 'leftBottom'
  | 'right'
  | 'rightTop'
  | 'rightBottom'
/** ColorPickerSize 尺寸类型。 */
export type ColorPickerSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'small'
  | 'default'
  | 'middle'
  | 'medium'
  | 'large'
/** ColorPickerArrow 类型。 */
export type ColorPickerArrow = boolean | { pointAtCenter?: boolean }
/** ColorPickerGetPopupContainer 类型。 */
export type ColorPickerGetPopupContainer =
  | string
  | HTMLElement
  | false
  | ((triggerNode?: HTMLElement) => string | HTMLElement | false | null | undefined)
/** ColorPickerValue 值类型。 */
export type ColorPickerValue = string | Color | ColorPickerGradientStop[] | null
/** ColorPickerPresetValue 值类型。 */
export type ColorPickerPresetValue = string | Color | ColorPickerGradientStop[]

/** ColorPickerAllowClearConfig 配置对象。 */
export interface ColorPickerAllowClearConfig {
  /** 清空图标。 */
  clearIcon?: any
}

/** ColorPickerPresetItem 数据项结构。 */
export interface ColorPickerPresetItem {
  /** 展示标签。 */
  label: any
  /** colors 配置项。 */
  colors: ColorPickerPresetValue[]
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 数据项唯一标识。 */
  key?: string | number
}

/** ColorPickerGradientStop 接口。 */
export interface ColorPickerGradientStop {
  /** 组件语义色。 */
  color: string | Color
  /** percent 配置项。 */
  percent: number
  /** 元素或数据项标识。 */
  id?: string | number
}

/** ColorPickerClassNames 局部类名配置。 */
export interface ColorPickerClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** trigger 区域配置。 */
  trigger?: string
  /** popup 区域配置。 */
  popup?: string
  /** panel 区域配置。 */
  panel?: string
  /** 主体区域配置。 */
  body?: string
  /** saturation 配置项。 */
  saturation?: string
  /** sliders 配置项。 */
  sliders?: string
  /** formatBar 配置项。 */
  formatBar?: string
  /** valueInput 配置项。 */
  valueInput?: string
  /** presets 配置项。 */
  presets?: string
  /** presetItem 配置项。 */
  presetItem?: string
  /** clear 配置项。 */
  clear?: string
}

/** ColorPickerStyles 局部样式配置。 */
export interface ColorPickerStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** trigger 区域配置。 */
  trigger?: Record<string, any>
  /** popup 区域配置。 */
  popup?: Record<string, any>
  /** panel 区域配置。 */
  panel?: Record<string, any>
  /** 主体区域配置。 */
  body?: Record<string, any>
  /** saturation 配置项。 */
  saturation?: Record<string, any>
  /** sliders 配置项。 */
  sliders?: Record<string, any>
  /** formatBar 配置项。 */
  formatBar?: Record<string, any>
  /** valueInput 配置项。 */
  valueInput?: Record<string, any>
  /** presets 配置项。 */
  presets?: Record<string, any>
}

/** ColorPickerPanelRenderProps 组件属性。 */
export interface ColorPickerPanelRenderProps {
  /** 组件语义色。 */
  color: Color | GradientColor | null
  /** format 配置项。 */
  format: ColorFormatType
  /** mode 配置项。 */
  mode: ColorPickerMode
}

/** ColorPickerProps 组件属性。 */
export interface ColorPickerProps {
  /** 受控值。 */
  value?: ColorPickerValue
  /** 非受控初始值。 */
  defaultValue?: ColorPickerValue
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 弹出层或内容展示位置。 */
  placement?: ColorPickerPlacement
  /** trigger 区域配置。 */
  trigger?: ColorPickerTrigger
  /** format 配置项。 */
  format?: ColorFormatType
  /** defaultFormat 配置项。 */
  defaultFormat?: ColorFormatType
  /** 是否允许一键清空。 */
  allowClear?: boolean | ColorPickerAllowClearConfig
  /** presets 配置项。 */
  presets?: ColorPickerPresetItem[]
  /** mode 配置项。 */
  mode?: ColorPickerMode | ColorPickerMode[]
  /** defaultMode 配置项。 */
  defaultMode?: ColorPickerMode
  /** arrow 配置项。 */
  arrow?: ColorPickerArrow
  /** showText 文本内容。 */
  showText?: boolean | ((color: Color | GradientColor) => string)
  /** 组件尺寸。 */
  size?: ColorPickerSize
  /** disabledAlpha 配置项。 */
  disabledAlpha?: boolean
  /** disabledFormat 配置项。 */
  disabledFormat?: boolean
  /** getPopupContainer 配置项。 */
  getPopupContainer?: ColorPickerGetPopupContainer
  /** autoAdjustOverflow 配置项。 */
  autoAdjustOverflow?: boolean
  /** destroyTooltipOnHide 配置项。 */
  destroyTooltipOnHide?: boolean
  /** destroyOnHidden 配置项。 */
  destroyOnHidden?: boolean
  /** panelRender 自定义渲染函数。 */
  panelRender?: (
    panel: any,
    extra: {
      components: {
        Picker: FC
        Presets: FC
      }
      state: ColorPickerPanelRenderProps
    },
  ) => any
  /** 根节点附加类名。 */
  rootClassName?: string
  /** triggerClassName 附加类名。 */
  triggerClassName?: string
  /** popupClassName 附加类名。 */
  popupClassName?: string
  /** panelClassName 附加类名。 */
  panelClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 按局部区域覆盖的类名集合。 */
  classNames?: ColorPickerClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: ColorPickerStyles
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
  /** onFormatChange 事件回调。 */
  onFormatChange?: (format: ColorFormatType) => void
  /** 值或状态变化时触发的回调。 */
  onChange?: (value: Color | GradientColor | null, css: string) => void
  /** 清空时触发的回调。 */
  onClear?: () => void
  /** onChangeComplete 事件回调。 */
  onChangeComplete?: (value: Color | GradientColor) => void
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface HSBAColor {
  h: number
  s: number
  b: number
  a: number
}

interface RGBAColor {
  r: number
  g: number
  b: number
  a: number
}

interface ColorChannelDrafts {
  hex: string
  r: string
  g: string
  b: string
  h: string
  s: string
  v: string
  a: string
}

interface GradientColorStopState {
  id: string
  color: Color
  percent: number
}

type ColorLike =
  | string
  | Color
  | null
  | undefined
  | Partial<RGBAColor>
  | Partial<HSBAColor>
  | {
      h?: number
      s?: number
      v?: number
      a?: number
    }

/** Rue 全局 runtime 标记，用于组件回调中恢复 active runtime。 */
type RuntimeGlobalRecord = typeof globalThis & {
  __rue?: unknown
}

/** DEFAULT_COLOR 内部常量。 */
const DEFAULT_COLOR = '#1677ff'
/** EMPTY_COLOR_TEXT 内部常量。 */
const EMPTY_COLOR_TEXT = '无色'
/** DEFAULT_GRADIENT_STOPS 内部常量。 */
const DEFAULT_GRADIENT_STOPS: ColorPickerGradientStop[] = [
  { color: 'rgb(16, 142, 233)', percent: 0 },
  { color: 'rgb(135, 208, 104)', percent: 100 },
]
/** DEFAULT_PICKER_MODES 内部常量。 */
const DEFAULT_PICKER_MODES: ColorPickerMode[] = [COLOR_PICKER_MODE_SINGLE]

/** append Class Name 的内部工具函数。 */
const appendClassName = (...parts: Array<string | undefined | null | false>) => {
  return parts.filter(Boolean).join(' ')
}

/** 解析当前 active runtime；优先使用临时 active，其次回退全局 runtime。 */

/** 在用户回调执行期间恢复捕获到的 active runtime，保证回调内 render/watch 归属正确。 */

/** 判断是否存在 Renderable Slot Content 的内部工具函数。 */
const hasRenderableSlotContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** clamp Number 的内部工具函数。 */
const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

/** round To 的内部工具函数。 */
const roundTo = (value: number, precision = 2) => {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

/** pad Hex 的内部工具函数。 */
const padHex = (value: number) => {
  return Math.round(clampNumber(value, 0, 255))
    .toString(16)
    .padStart(2, '0')
}

/** 归一化 Alpha 的内部工具函数。 */
const normalizeAlpha = (value: number) => {
  return clampNumber(roundTo(value, 3), 0, 1)
}

/** 归一化 Hue 的内部工具函数。 */
const normalizeHue = (value: number) => {
  if (!Number.isFinite(value)) return 0
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

/** 归一化 Hsba 的内部工具函数。 */
const normalizeHsba = (
  value: Partial<HSBAColor> | { h?: number; s?: number; v?: number; a?: number },
) => {
  const brightness = 'b' in value ? value.b : (value as { v?: number }).v
  return {
    h: normalizeHue(value.h ?? 0),
    s: clampNumber(value.s ?? 0, 0, 100),
    b: clampNumber(brightness ?? 0, 0, 100),
    a: normalizeAlpha(value.a ?? 1),
  }
}

/** hsba To Rgba 的内部工具函数。 */
const hsbaToRgba = (value: HSBAColor): RGBAColor => {
  const h = normalizeHue(value.h)
  const s = clampNumber(value.s, 0, 100) / 100
  const v = clampNumber(value.b, 0, 100) / 100
  const chroma = v * s
  const segment = h / 60
  const second = chroma * (1 - Math.abs((segment % 2) - 1))

  let red = 0
  let green = 0
  let blue = 0

  if (segment >= 0 && segment < 1) {
    red = chroma
    green = second
  } else if (segment < 2) {
    red = second
    green = chroma
  } else if (segment < 3) {
    green = chroma
    blue = second
  } else if (segment < 4) {
    green = second
    blue = chroma
  } else if (segment < 5) {
    red = second
    blue = chroma
  } else {
    red = chroma
    blue = second
  }

  const match = v - chroma

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
    a: normalizeAlpha(value.a),
  }
}

/** rgba To Hsba 的内部工具函数。 */
const rgbaToHsba = (value: Partial<RGBAColor>): HSBAColor => {
  const red = clampNumber(value.r ?? 0, 0, 255) / 255
  const green = clampNumber(value.g ?? 0, 0, 255) / 255
  const blue = clampNumber(value.b ?? 0, 0, 255) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0

  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6)
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2)
    } else {
      hue = 60 * ((red - green) / delta + 4)
    }
  }

  const saturation = max === 0 ? 0 : (delta / max) * 100

  return {
    h: normalizeHue(hue),
    s: roundTo(saturation, 2),
    b: roundTo(max * 100, 2),
    a: normalizeAlpha(value.a ?? 1),
  }
}

/** parse Hex Color 的内部工具函数。 */
const parseHexColor = (value: string): HSBAColor | null => {
  const normalized = value.replace(/^#/, '').trim()

  if (![3, 4, 6, 8].includes(normalized.length) || /[^0-9a-f]/i.test(normalized)) {
    return null
  }

  const expanded =
    normalized.length === 3 || normalized.length === 4
      ? normalized
          .split('')
          .map(part => `${part}${part}`)
          .join('')
      : normalized

  const red = Number.parseInt(expanded.slice(0, 2), 16)
  const green = Number.parseInt(expanded.slice(2, 4), 16)
  const blue = Number.parseInt(expanded.slice(4, 6), 16)
  const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1

  return rgbaToHsba({ r: red, g: green, b: blue, a: alpha })
}

/** split Numeric Parts 的内部工具函数。 */
const splitNumericParts = (value: string) => {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
}

/** parse Alpha Part 的内部工具函数。 */
const parseAlphaPart = (value?: string) => {
  if (!value) return 1
  if (value.endsWith('%')) {
    return normalizeAlpha(Number.parseFloat(value) / 100)
  }
  return normalizeAlpha(Number.parseFloat(value))
}

/** parse Rgb Color 的内部工具函数。 */
const parseRgbColor = (value: string): HSBAColor | null => {
  const matched = value.trim().match(/^rgba?\((.*)\)$/i)
  if (!matched) return null

  const parts = splitNumericParts(matched[1])
  if (parts.length !== 3 && parts.length !== 4) return null

  const red = Number.parseFloat(parts[0])
  const green = Number.parseFloat(parts[1])
  const blue = Number.parseFloat(parts[2])
  const alpha = parseAlphaPart(parts[3])

  if (![red, green, blue].every(Number.isFinite)) return null

  return rgbaToHsba({ r: red, g: green, b: blue, a: alpha })
}

/** parse Hsb Color 的内部工具函数。 */
const parseHsbColor = (value: string): HSBAColor | null => {
  const matched = value.trim().match(/^hs(v|b)a?\((.*)\)$/i)
  if (!matched) return null

  const parts = splitNumericParts(matched[2])
  if (parts.length !== 3 && parts.length !== 4) return null

  const hue = Number.parseFloat(parts[0])
  const saturation = Number.parseFloat(parts[1])
  const brightness = Number.parseFloat(parts[2])
  const alpha = parseAlphaPart(parts[3])

  if (![hue, saturation, brightness].every(Number.isFinite)) return null

  return normalizeHsba({ h: hue, s: saturation, b: brightness, a: alpha })
}

/** parse Color Input 的内部工具函数。 */
const parseColorInput = (value: ColorLike): HSBAColor | null => {
  if (value == null) return null

  if (value instanceof Color) {
    return value.toHsb()
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (/^#?[0-9a-f]{3,8}$/i.test(trimmed)) {
      return parseHexColor(trimmed)
    }

    if (/^rgba?\(/i.test(trimmed)) {
      return parseRgbColor(trimmed)
    }

    if (/^hs(v|b)a?\(/i.test(trimmed)) {
      return parseHsbColor(trimmed)
    }

    return null
  }

  if ('h' in value || 's' in value || 'v' in value) {
    return normalizeHsba(value as Partial<HSBAColor> & { v?: number })
  }

  if ('r' in value || 'g' in value || 'b' in value) {
    return rgbaToHsba(value as Partial<RGBAColor>)
  }

  return null
}

/** Color 工具类。 */
export class Color {
  private hsba: HSBAColor

  /**  配置项。 */
  constructor(value: ColorLike = DEFAULT_COLOR) {
    this.hsba = normalizeHsba(
      parseColorInput(value) ?? parseColorInput(DEFAULT_COLOR) ?? { h: 215, s: 91, b: 100, a: 1 },
    )
  }

  /** clone 方法。 */
  clone() {
    return new Color(this.hsba)
  }

  /** toHex 方法。 */
  toHex() {
    const rgba = hsbaToRgba(this.hsba)
    const alphaHex = this.hsba.a < 1 ? padHex(this.hsba.a * 255) : ''
    return `${padHex(rgba.r)}${padHex(rgba.g)}${padHex(rgba.b)}${alphaHex}`
  }

  /** toHexString 方法。 */
  toHexString() {
    return `#${this.toHex()}`
  }

  /** toRgb 方法。 */
  toRgb(): RGBAColor {
    return hsbaToRgba(this.hsba)
  }

  /** toRgbString 方法。 */
  toRgbString() {
    const rgb = this.toRgb()
    if (rgb.a < 1) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${roundTo(rgb.a, 3)})`
    }
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  }

  /** toHsb 方法。 */
  toHsb(): HSBAColor {
    return { ...this.hsba }
  }

  /** toHsbString 方法。 */
  toHsbString() {
    if (this.hsba.a < 1) {
      return `hsba(${Math.round(this.hsba.h)}, ${roundTo(this.hsba.s, 1)}%, ${roundTo(this.hsba.b, 1)}%, ${roundTo(this.hsba.a, 3)})`
    }
    return `hsb(${Math.round(this.hsba.h)}, ${roundTo(this.hsba.s, 1)}%, ${roundTo(this.hsba.b, 1)}%)`
  }

  /** toCssString 方法。 */
  toCssString() {
    return this.toRgbString()
  }

  /** withAlpha 方法。 */
  withAlpha(alpha: number) {
    return new Color({ ...this.hsba, a: normalizeAlpha(alpha) })
  }

  /** withHue 方法。 */
  withHue(hue: number) {
    return new Color({ ...this.hsba, h: normalizeHue(hue) })
  }

  /** withSaturationBrightness 方法。 */
  withSaturationBrightness(saturation: number, brightness: number) {
    return new Color({
      ...this.hsba,
      s: clampNumber(saturation, 0, 100),
      b: clampNumber(brightness, 0, 100),
    })
  }
}

/** ensure Color 的内部工具函数。 */
const ensureColor = (value: ColorLike, disabledAlpha?: boolean) => {
  const parsed = parseColorInput(value)
  if (!parsed) return null
  const normalized = disabledAlpha ? { ...parsed, a: 1 } : parsed
  return new Color(normalized)
}

/** strip Alpha If Needed 的内部工具函数。 */
const stripAlphaIfNeeded = (color: Color | null, disabledAlpha?: boolean) => {
  if (!color) return null
  return disabledAlpha ? color.withAlpha(1) : color
}

let gradientStopIdSeed = 0

/** 判断 Gradient Stop Value 的内部工具函数。 */
const isGradientStopValue = (value: unknown): value is ColorPickerGradientStop => {
  return (
    !!value &&
    typeof value === 'object' &&
    'color' in (value as Record<string, unknown>) &&
    'percent' in (value as Record<string, unknown>)
  )
}

/** 判断 Gradient Value 的内部工具函数。 */
const isGradientValue = (value: unknown): value is ColorPickerGradientStop[] => {
  return Array.isArray(value) && value.every(isGradientStopValue)
}

/** 归一化 Gradient Stops 的内部工具函数。 */
const normalizeGradientStops = (value: ColorPickerGradientStop[], disabledAlpha?: boolean) => {
  const normalized = value
    .map(stop => {
      const color = ensureColor(stop.color, disabledAlpha)
      if (!color) return null
      return {
        id: String(stop.id ?? `gradient-stop-${++gradientStopIdSeed}`),
        color,
        percent: clampNumber(stop.percent, 0, 100),
      }
    })
    .filter(Boolean) as GradientColorStopState[]

  if (!normalized.length) return null

  if (normalized.length === 1) {
    const duplicated = normalized[0]
    normalized.push({
      id: `gradient-stop-${++gradientStopIdSeed}`,
      color: duplicated.color.clone(),
      percent: 100,
    })
  }

  normalized.sort((left, right) => left.percent - right.percent)
  return normalized
}

/** GradientColor 工具类。 */
export class GradientColor {
  private stops: GradientColorStopState[]

  /**  配置项。 */
  constructor(value: ColorPickerGradientStop[] = DEFAULT_GRADIENT_STOPS, disabledAlpha?: boolean) {
    this.stops =
      normalizeGradientStops(value, disabledAlpha) ??
      normalizeGradientStops(DEFAULT_GRADIENT_STOPS, disabledAlpha) ??
      []
  }

  /** clone 方法。 */
  clone() {
    return new GradientColor(this.toStops())
  }

  /** toStops 方法。 */
  toStops() {
    return this.stops.map(stop => ({
      id: stop.id,
      color: stop.color.clone(),
      percent: stop.percent,
    }))
  }

  /** toCssString 方法。 */
  toCssString() {
    const stops = this.toStops()
      .sort((left, right) => left.percent - right.percent)
      .map(stop => `${stop.color.toCssString()} ${Math.round(stop.percent)}%`)
      .join(', ')
    return `linear-gradient(90deg, ${stops})`
  }

  /** withStopColor 颜色。 */
  withStopColor(id: string, color: Color) {
    return new GradientColor(
      this.toStops().map(stop => ({
        ...stop,
        color: stop.id === id ? color.clone() : stop.color.clone(),
      })),
    )
  }

  /** withStopPercent 方法。 */
  withStopPercent(id: string, percent: number) {
    return new GradientColor(
      this.toStops().map(stop => ({
        ...stop,
        percent: stop.id === id ? clampNumber(percent, 0, 100) : stop.percent,
      })),
    )
  }

  /** addStop 方法。 */
  addStop(percent: number, color: Color) {
    return new GradientColor([
      ...this.toStops(),
      {
        id: `gradient-stop-${++gradientStopIdSeed}`,
        color: color.clone(),
        percent: clampNumber(percent, 0, 100),
      },
    ])
  }

  /** removeStop 方法。 */
  removeStop(id: string) {
    const nextStops = this.toStops().filter(stop => stop.id !== id)
    if (nextStops.length < 2) return this.clone()
    return new GradientColor(nextStops)
  }
}

/** ensure Gradient Color 的内部工具函数。 */
const ensureGradientColor = (value: unknown, disabledAlpha?: boolean) => {
  if (value instanceof GradientColor) return new GradientColor(value.toStops(), disabledAlpha)
  if (!isGradientValue(value)) return null
  return new GradientColor(value, disabledAlpha)
}

/** 归一化 Modes 的内部工具函数。 */
const normalizeModes = (value?: ColorPickerMode | ColorPickerMode[]) => {
  const modes = Array.isArray(value) ? value : value ? [value] : DEFAULT_PICKER_MODES
  const filtered = modes.filter(
    modeItem => modeItem === COLOR_PICKER_MODE_SINGLE || modeItem === COLOR_PICKER_MODE_GRADIENT,
  )
  return filtered.length ? filtered : DEFAULT_PICKER_MODES
}

/** 读取 Drafts From Color 的内部工具函数。 */
const getDraftsFromColor = (color: Color | null): ColorChannelDrafts => {
  const currentColor = color ?? new Color(DEFAULT_COLOR)
  const rgb = currentColor.toRgb()
  const hsb = currentColor.toHsb()

  return {
    hex: currentColor.toHexString(),
    r: String(rgb.r),
    g: String(rgb.g),
    b: String(rgb.b),
    h: String(Math.round(hsb.h)),
    s: String(Math.round(hsb.s)),
    v: String(Math.round(hsb.b)),
    a: String(Math.round(hsb.a * 100)),
  }
}

/** 判断 Same Draft Inputs 的内部工具函数。 */
const isSameDraftInputs = (left: ColorChannelDrafts, right: ColorChannelDrafts) => {
  return (
    left.hex === right.hex &&
    left.r === right.r &&
    left.g === right.g &&
    left.b === right.b &&
    left.h === right.h &&
    left.s === right.s &&
    left.v === right.v &&
    left.a === right.a
  )
}

/** 解析 Size Tokens 的内部工具函数。 */
const resolveSizeTokens = (size?: ColorPickerSize) => {
  switch (size) {
    case 'xs':
      return {
        triggerClassName: 'min-h-6 px-1.5 py-0.5 text-xs',
        compactTriggerClassName: 'h-6 w-6 p-[2px]',
        swatchSizeClassName: 'size-3',
        compactSwatchSizeClassName: 'size-[0.85rem]',
        popupWidthClassName: 'w-[min(94vw,17rem)]',
      }
    case 'small':
    case 'sm':
      return {
        triggerClassName: 'min-h-8 px-2 py-1 text-xs',
        compactTriggerClassName: 'h-8 w-8 p-[3px]',
        swatchSizeClassName: 'size-3.5',
        compactSwatchSizeClassName: 'size-[1rem]',
        popupWidthClassName: 'w-[min(94vw,18rem)]',
      }
    case 'large':
    case 'lg':
      return {
        triggerClassName: 'min-h-10 px-3 py-2 text-sm',
        compactTriggerClassName: 'h-10 w-10 p-[4px]',
        swatchSizeClassName: 'size-5',
        compactSwatchSizeClassName: 'size-[1.45rem]',
        popupWidthClassName: 'w-[min(94vw,22rem)]',
      }
    case 'xl':
      return {
        triggerClassName: 'min-h-12 px-4 py-2.5 text-base',
        compactTriggerClassName: 'h-12 w-12 p-[5px]',
        swatchSizeClassName: 'size-6',
        compactSwatchSizeClassName: 'size-[1.75rem]',
        popupWidthClassName: 'w-[min(94vw,24rem)]',
      }
    case 'medium':
    case 'middle':
    default:
      return {
        triggerClassName: 'min-h-8 px-2.5 py-1.5 text-sm',
        compactTriggerClassName: 'h-8 w-8 p-[3px]',
        swatchSizeClassName: 'size-4',
        compactSwatchSizeClassName: 'size-[1.15rem]',
        popupWidthClassName: 'w-[min(94vw,20rem)]',
      }
  }
}

interface ColorPickerPlacementLayout {
  direction: 'top' | 'bottom' | 'left' | 'right'
  align: 'start' | 'center' | 'end'
}

/** 解析 Placement Layout 的内部工具函数。 */
const resolvePlacementLayout = (placement: ColorPickerPlacement): ColorPickerPlacementLayout => {
  switch (placement) {
    case 'top':
      return { direction: 'top', align: 'center' }
    case 'topLeft':
      return { direction: 'top', align: 'start' }
    case 'topRight':
      return { direction: 'top', align: 'end' }
    case 'bottom':
      return { direction: 'bottom', align: 'center' }
    case 'bottomRight':
      return { direction: 'bottom', align: 'end' }
    case 'left':
      return { direction: 'left', align: 'center' }
    case 'leftTop':
      return { direction: 'left', align: 'start' }
    case 'leftBottom':
      return { direction: 'left', align: 'end' }
    case 'right':
      return { direction: 'right', align: 'center' }
    case 'rightTop':
      return { direction: 'right', align: 'start' }
    case 'rightBottom':
      return { direction: 'right', align: 'end' }
    case 'bottomLeft':
    default:
      return { direction: 'bottom', align: 'start' }
  }
}

/** 解析 Arrow Enabled 的内部工具函数。 */
const resolveArrowEnabled = (arrow?: ColorPickerArrow) => {
  return arrow !== false
}

/** 解析 Arrow Point At Center 的内部工具函数。 */
const resolveArrowPointAtCenter = (arrow?: ColorPickerArrow) => {
  return typeof arrow === 'object' && !!arrow.pointAtCenter
}

/** 解析 Arrow Class Name 的内部工具函数。 */
const resolveArrowClassName = (placement: ColorPickerPlacement, pointAtCenter: boolean) => {
  const layout = resolvePlacementLayout(placement)

  if (layout.direction === 'top') {
    return appendClassName(
      'bottom-[-6px] border-r border-b',
      pointAtCenter || layout.align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : layout.align === 'end'
          ? 'right-5'
          : 'left-5',
    )
  }

  if (layout.direction === 'bottom') {
    return appendClassName(
      'top-[-6px] border-l border-t',
      pointAtCenter || layout.align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : layout.align === 'end'
          ? 'right-5'
          : 'left-5',
    )
  }

  if (layout.direction === 'left') {
    return appendClassName(
      'right-[-6px] border-r border-t',
      pointAtCenter || layout.align === 'center'
        ? 'top-1/2 -translate-y-1/2'
        : layout.align === 'end'
          ? 'bottom-5'
          : 'top-5',
    )
  }

  return appendClassName(
    'left-[-6px] border-l border-b',
    pointAtCenter || layout.align === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : layout.align === 'end'
        ? 'bottom-5'
        : 'top-5',
  )
}

/** 解析 Container 的内部工具函数。 */
const resolveContainer = (container?: ColorPickerGetPopupContainer, triggerNode?: HTMLElement) => {
  if (typeof container === 'function') return container(triggerNode)
  return container
}

/** format Color Text 的内部工具函数。 */
const formatColorText = (color: Color | null, format: ColorFormatType) => {
  if (!color) return ''
  switch (format) {
    case FORMAT_RGB:
      return color.toRgbString()
    case FORMAT_HSB:
      return color.toHsbString()
    default:
      return color.toHexString()
  }
}

/** 判断 Same Color Value 的内部工具函数。 */
const isSameColorValue = (left: Color | null, right: Color | null) => {
  if (!left || !right) return false
  return left.toHexString() === right.toHexString() && left.toRgbString() === right.toRgbString()
}

/** 判断 Same Gradient Value 的内部工具函数。 */
const isSameGradientValue = (left: GradientColor | null, right: GradientColor | null) => {
  if (!left || !right) return false
  const leftStops = left.toStops()
  const rightStops = right.toStops()
  if (leftStops.length !== rightStops.length) return false

  return leftStops.every((stop, index) => {
    const otherStop = rightStops[index]
    return (
      !!otherStop &&
      Math.round(stop.percent * 100) === Math.round(otherStop.percent * 100) &&
      isSameColorValue(stop.color, otherStop.color)
    )
  })
}

const checkerboardStyle = {
  backgroundImage:
    'linear-gradient(45deg, rgb(148 163 184 / 0.22) 25%, transparent 25%), linear-gradient(-45deg, rgb(148 163 184 / 0.22) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgb(148 163 184 / 0.22) 75%), linear-gradient(-45deg, transparent 75%, rgb(148 163 184 / 0.22) 75%)',
  backgroundSize: '10px 10px',
  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
} as const

const sliderInputClassName =
  'block h-4 w-full cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-base-100 [&::-webkit-slider-thumb]:bg-base-100 [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(15,23,42,0.16),0_3px_10px_rgba(15,23,42,0.2)] [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-0 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-base-100 [&::-moz-range-thumb]:bg-base-100 [&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(15,23,42,0.16),0_3px_10px_rgba(15,23,42,0.2)]'

/** 渲染 Swatch Style 的内部工具函数。 */
const renderSwatchStyle = (color: Color | GradientColor | null) => {
  if (color instanceof GradientColor) {
    return {
      ...checkerboardStyle,
      backgroundImage: `${color.toCssString()}, ${checkerboardStyle.backgroundImage}`,
      backgroundColor: 'transparent',
    }
  }

  return {
    ...checkerboardStyle,
    backgroundColor: color?.toCssString() ?? 'transparent',
  }
}

/** 渲染 Preset Swatch Style 的内部工具函数。 */
const renderPresetSwatchStyle = (color: Color | GradientColor | null) => {
  if (color instanceof GradientColor) {
    return {
      backgroundImage: color.toCssString(),
      backgroundColor: 'transparent',
    }
  }

  return renderSwatchStyle(color)
}

/** HIDDEN_POPUP_STYLE 内部常量。 */
const HIDDEN_POPUP_STYLE = {
  left: '0px',
  top: '0px',
  visibility: 'hidden',
} as const

let colorPickerPopupHostIdSeed = 0

interface RefLike<T> {
  value: T
}

interface PickerSectionRenderContext {
  getColor: () => Color
  getGradient: () => GradientColor | null
  currentMode: RefLike<ColorPickerMode>
  availableModes: ColorPickerMode[]
  activeGradientStopId: RefLike<string>
  currentFormat: RefLike<ColorFormatType>
  allowClear?: boolean
  disabled?: boolean
  disabledFormat?: boolean
  disabledAlpha?: boolean
  classNames?: ColorPickerClassNames
  styles?: ColorPickerStyles
  saturationRef: { current?: HTMLElement }
  startSaturationDrag: (event: PointerEvent) => void
  emitColorChange: (nextColor: Color | null, complete?: boolean) => void
  setModeValue: (nextMode: ColorPickerMode) => void
  setFormatValue: (nextFormat: ColorFormatType) => void
  inputDrafts: RefLike<ColorChannelDrafts>
  inputFocusState: RefLike<Record<string, boolean>>
  requestRender: () => void
  commitDraftInputs: (complete?: boolean) => void
  clearValue: () => void
  updateGradientStopPercent: (nextPercent: number, complete?: boolean) => void
  selectGradientStop: (stopId: string) => void
  addGradientStop: () => void
  removeGradientStop: () => void
}

interface PresetsSectionRenderContext {
  presets: ColorPickerPresetItem[]
  disabledAlpha?: boolean
  currentMode: RefLike<ColorPickerMode>
  availableModes: ColorPickerMode[]
  currentFormat: RefLike<ColorFormatType>
  renderVersion: number
  classNames?: ColorPickerClassNames
  styles?: ColorPickerStyles
  activePresetGroupKey: RefLike<string>
  getActiveColor: () => Color | null
  getActiveGradient: () => GradientColor | null
  emitColorChange: (nextColor: Color | null, complete?: boolean) => void
  emitGradientChange: (nextGradient: GradientColor | null, complete?: boolean) => void
  setModeValue: (nextMode: ColorPickerMode) => void
  requestRender: () => void
}

/** apply Format Value 的内部工具函数。 */
const applyFormatValue = (event: Event, setFormatValue: (nextFormat: ColorFormatType) => void) => {
  setFormatValue((event.currentTarget as HTMLSelectElement).value as ColorFormatType)
}

/** Chevron Icon 的内部工具函数。 */
const ChevronIcon: FC<{ open?: boolean }> = ({ open }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={appendClassName(
        'size-4 transition-transform duration-200',
        open ? 'rotate-180' : '',
      )}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 6 4.5 5 4.5-5" />
    </svg>
  )
}

/** 渲染 Picker Section 的内部工具函数。 */
const PickerSection = ({
  getColor,
  getGradient,
  currentMode,
  availableModes,
  activeGradientStopId,
  currentFormat,
  allowClear,
  disabled,
  disabledFormat,
  disabledAlpha,
  classNames,
  styles,
  saturationRef,
  startSaturationDrag,
  emitColorChange,
  setModeValue,
  setFormatValue,
  inputDrafts,
  inputFocusState,
  requestRender,
  commitDraftInputs,
  clearValue,
  updateGradientStopPercent,
  selectGradientStop,
  addGradientStop,
  removeGradientStop,
}: PickerSectionRenderContext) => {
  const resolveHsb = () => getColor().toHsb()
  const resolveGradientStops = () => getGradient()?.toStops() ?? []
  const resolveActiveGradientStop = () => {
    const gradientStops = resolveGradientStops()
    return gradientStops.find(stop => stop.id === activeGradientStopId.value) ?? gradientStops[0]
  }

  const RenderDraftInput = ({
    arg0: key,
    arg1: label,
    arg2: inputMode = 'numeric',
  }: {
    arg0: keyof ColorChannelDrafts
    arg1: string
    arg2?: 'text' | 'numeric'
  }) => {
    return (
      <label className="grid gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-base-content/45">
          {String(label)}
        </span>
        <input
          type="text"
          inputMode={inputMode}
          value={inputDrafts.value[key]}
          disabled={disabled}
          className={appendClassName(
            'h-8 w-full rounded-[0.65rem] border bg-base-100 px-2 text-[13px] font-medium text-base-content/85 outline-none transition-[border-color,box-shadow] duration-200 ease-out',
            'border-base-300 hover:border-primary/55 focus:border-primary focus:ring-2 focus:ring-primary/15',
            classNames?.valueInput,
          )}
          style={styles?.valueInput}
          onFocus={() => {
            inputFocusState.value = {
              ...inputFocusState.value,
              [key]: true,
            }
          }}
          onInput={(event: Event) => {
            inputDrafts.value = {
              ...inputDrafts.value,
              [key]: (event.currentTarget as HTMLInputElement).value,
            }
          }}
          onBlur={() => {
            inputFocusState.value = {
              ...inputFocusState.value,
              [key]: false,
            }
            requestRender()
            commitDraftInputs()
          }}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              inputFocusState.value = {
                ...inputFocusState.value,
                [key]: false,
              }
              requestRender()
              commitDraftInputs()
            }
          }}
        />
      </label>
    )
  }

  return (
    <div className={appendClassName('space-y-3', classNames?.body)} style={styles?.body}>
      <div className="rounded-[1.1rem] bg-base-100 p-3 text-base-content shadow-[0_16px_36px_rgba(15,23,42,0.12),0_6px_16px_rgba(15,23,42,0.08)]">
        <div className="space-y-3">
          {availableModes.length > 1 ? (
            <div className="inline-flex rounded-[0.8rem] border border-base-300 bg-base-200/60 p-1">
              {availableModes.map(modeItem => (
                <button
                  key={modeItem}
                  type="button"
                  disabled={disabled}
                  className={appendClassName(
                    'rounded-[0.6rem] px-3 py-1.5 text-xs font-medium transition',
                    currentMode.value === modeItem
                      ? 'bg-base-100 text-base-content shadow-sm'
                      : 'text-base-content/55 hover:text-base-content',
                  )}
                  onClick={() => setModeValue(modeItem)}
                >
                  {modeItem === COLOR_PICKER_MODE_GRADIENT ? '渐变色' : '单色'}
                </button>
              ))}
            </div>
          ) : null}

          {currentMode.value === COLOR_PICKER_MODE_GRADIENT && getGradient() ? (
            <div className="space-y-2 rounded-[0.9rem] border border-base-300 bg-base-200/45 p-2.5">
              <div
                className="relative h-4 rounded-full border border-white/70 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]"
                style={renderSwatchStyle(getGradient())}
              >
                {resolveGradientStops().map(stop => (
                  <button
                    key={stop.id}
                    type="button"
                    title={`${Math.round(stop.percent)}%`}
                    className={appendClassName(
                      'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow',
                      activeGradientStopId.value === stop.id ? 'ring-2 ring-primary/35' : '',
                    )}
                    style={{ left: `${stop.percent}%`, background: stop.color.toCssString() }}
                    onClick={() => selectGradientStop(stop.id)}
                  />
                ))}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={String(Math.round(resolveActiveGradientStop()?.percent ?? 0))}
                  disabled={disabled}
                  className="range range-xs block w-full"
                  onInput={(event: Event) => {
                    updateGradientStopPercent(
                      Number.parseFloat((event.currentTarget as HTMLInputElement).value),
                    )
                  }}
                  onChange={(event: Event) => {
                    updateGradientStopPercent(
                      Number.parseFloat((event.currentTarget as HTMLInputElement).value),
                      true,
                    )
                  }}
                />
                <span className="rounded-[0.65rem] border border-base-300 bg-base-100 px-2 py-1 text-center text-xs font-medium text-base-content/85">
                  {String(Math.round(resolveActiveGradientStop()?.percent ?? 0))}%
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-base-content/45">
                  {String(
                    `色标 ${resolveGradientStops().findIndex(stop => stop.id === activeGradientStopId.value) + 1}/${resolveGradientStops().length}`,
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    className="rounded-[0.65rem] border border-base-300 bg-base-100 px-2 py-1 text-xs font-medium text-base-content/85 transition hover:border-primary/55"
                    onClick={addGradientStop}
                  >
                    新增
                  </button>
                  <button
                    type="button"
                    disabled={disabled || resolveGradientStops().length <= 2}
                    className="rounded-[0.65rem] border border-base-300 bg-base-100 px-2 py-1 text-xs font-medium text-base-content/85 transition hover:border-primary/55 disabled:cursor-not-allowed disabled:opacity-45"
                    onClick={removeGradientStop}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div
            ref={(element: HTMLDivElement | null) => {
              saturationRef.current = element ?? undefined
            }}
            className={appendClassName(
              'relative h-[10rem] cursor-crosshair overflow-hidden rounded-[0.8rem] shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]',
              classNames?.saturation,
            )}
            style={{
              backgroundColor: new Color({ h: resolveHsb().h, s: 100, b: 100, a: 1 }).toRgbString(),
              ...styles?.saturation,
            }}
            onPointerDown={startSaturationDrag}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,23,42,0.68)] via-[rgba(15,23,42,0.28)] to-transparent" />
            <div
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.12),0_3px_10px_rgba(15,23,42,0.18)]"
              style={{
                left: `${roundTo(resolveHsb().s, 2)}%`,
                top: `${roundTo(100 - resolveHsb().b, 2)}%`,
              }}
            />
          </div>

          <div className="space-y-3">
            <div
              className={appendClassName(
                'rounded-full bg-base-100 px-[3px] py-[3px] shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]',
                classNames?.sliders,
              )}
              style={styles?.sliders}
            >
              <input
                type="range"
                min="0"
                max="360"
                value={String(roundTo(resolveHsb().h, 2))}
                disabled={disabled}
                className={sliderInputClassName}
                style={{
                  background:
                    'linear-gradient(90deg, rgb(255 0 0), rgb(255 255 0), rgb(0 255 0), rgb(0 255 255), rgb(0 0 255), rgb(255 0 255), rgb(255 0 0))',
                }}
                onInput={(event: Event) => {
                  const hue = Number.parseFloat((event.currentTarget as HTMLInputElement).value)
                  emitColorChange(getColor().withHue(hue))
                }}
                onChange={(event: Event) => {
                  const hue = Number.parseFloat((event.currentTarget as HTMLInputElement).value)
                  emitColorChange(getColor().withHue(hue), true)
                }}
              />
            </div>

            {!disabledAlpha ? (
              <div className="grid grid-cols-[minmax(0,1fr)_1.85rem] items-center gap-2">
                <div
                  className={appendClassName(
                    'rounded-full px-[3px] py-[3px] shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]',
                    classNames?.sliders,
                  )}
                  style={{ ...checkerboardStyle, ...styles?.sliders }}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={String(Math.round(resolveHsb().a * 100))}
                    disabled={disabled}
                    className={sliderInputClassName}
                    style={{
                      background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${getColor().withAlpha(1).toCssString()} 100%)`,
                    }}
                    onInput={(event: Event) => {
                      const alpha =
                        Number.parseFloat((event.currentTarget as HTMLInputElement).value) / 100
                      emitColorChange(getColor().withAlpha(alpha))
                    }}
                    onChange={(event: Event) => {
                      const alpha =
                        Number.parseFloat((event.currentTarget as HTMLInputElement).value) / 100
                      emitColorChange(getColor().withAlpha(alpha), true)
                    }}
                  />
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="当前透明度颜色"
                  className="block h-[1.85rem] w-[1.85rem] rounded-[0.6rem] border border-base-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                  style={renderSwatchStyle(getColor())}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-[3.75rem_minmax(0,1fr)] items-end gap-1.5">
              {!disabledFormat ? (
                <label
                  className={appendClassName('relative block', classNames?.formatBar)}
                  style={styles?.formatBar}
                >
                  <select
                    value={currentFormat.value}
                    disabled={disabled}
                    className="h-8 w-full appearance-none rounded-[0.65rem] border border-base-300 bg-base-100 pl-2.5 pr-7 text-[13px] font-medium uppercase tracking-[0.05em] text-base-content/85 outline-none transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/55 focus:border-primary focus:ring-2 focus:ring-primary/15"
                    onInput={(event: Event) => {
                      applyFormatValue(event, setFormatValue)
                    }}
                    onChange={(event: Event) => {
                      applyFormatValue(event, setFormatValue)
                    }}
                  >
                    <option value={FORMAT_HEX}>HEX</option>
                    <option value={FORMAT_RGB}>RGB</option>
                    <option value={FORMAT_HSB}>HSB</option>
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/45">
                    <ChevronIcon />
                  </span>
                </label>
              ) : (
                <div className="flex h-8 items-center rounded-[0.65rem] border border-base-300 bg-base-100 px-2.5 text-[13px] font-medium uppercase tracking-[0.05em] text-base-content/85">
                  {currentFormat.value}
                </div>
              )}

              {currentFormat.value === FORMAT_HEX ? (
                <RenderDraftInput arg0={'hex'} arg1={'HEX'} arg2={'text'} />
              ) : currentFormat.value === FORMAT_RGB ? (
                <div
                  className={appendClassName(
                    'grid gap-1.5',
                    disabledAlpha ? 'grid-cols-3' : 'grid-cols-4',
                  )}
                >
                  <RenderDraftInput arg0={'r'} arg1={'R'} />
                  <RenderDraftInput arg0={'g'} arg1={'G'} />
                  <RenderDraftInput arg0={'b'} arg1={'B'} />
                  {!disabledAlpha ? <RenderDraftInput arg0={'a'} arg1={'A'} /> : null}
                </div>
              ) : (
                <div
                  className={appendClassName(
                    'grid gap-1.5',
                    disabledAlpha ? 'grid-cols-3' : 'grid-cols-4',
                  )}
                >
                  <RenderDraftInput arg0={'h'} arg1={'H'} />
                  <RenderDraftInput arg0={'s'} arg1={'S'} />
                  <RenderDraftInput arg0={'v'} arg1={'B'} />
                  {!disabledAlpha ? <RenderDraftInput arg0={'a'} arg1={'A'} /> : null}
                </div>
              )}
            </div>

            {allowClear ? (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  data-rue-color-picker-popup-clear="true"
                  disabled={disabled}
                  className="rounded-[0.65rem] border border-base-300 bg-base-100 px-2.5 py-1.5 text-[11px] font-medium text-base-content/72 transition hover:border-error/55 hover:text-error disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={clearValue}
                >
                  清空颜色
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 渲染 Presets Section 的内部工具函数。 */
const PresetsSection = ({
  presets,
  disabledAlpha,
  currentMode: _currentMode,
  availableModes,
  currentFormat,
  renderVersion,
  classNames,
  styles,
  activePresetGroupKey,
  getActiveColor,
  getActiveGradient,
  emitColorChange,
  emitGradientChange,
  setModeValue,
  requestRender,
}: PresetsSectionRenderContext) => {
  const CompiledRow2 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const CompiledRow3 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
      const presetColor = rowArg0
      const colorIndex = rowArg1

      const resolvedGradient = ensureGradientColor(presetColor, disabledAlpha)
      const resolvedColor = resolvedGradient
        ? null
        : ensureColor(presetColor as ColorLike, disabledAlpha)
      if (!resolvedGradient && !resolvedColor) return <></>
      void renderVersion
      const activeColor = getActiveColor()
      const activeGradient = getActiveGradient()
      const previewValue = resolvedGradient ?? resolvedColor
      const isActive = computed(() =>
        resolvedGradient
          ? getActiveGradient()?.toCssString() === resolvedGradient.toCssString() ||
            isSameGradientValue(getActiveGradient(), resolvedGradient)
          : isSameColorValue(getActiveColor(), resolvedColor),
      )

      return (
        <button
          key={`${groupKey}:${colorIndex}`}
          type="button"
          data-rue-color-picker-preset={String(colorIndex)}
          data-rue-color-picker-preset-group={String(index)}
          title={
            resolvedGradient
              ? resolvedGradient.toCssString()
              : formatColorText(resolvedColor, currentFormat.value)
          }
          className={appendClassName(
            'relative flex h-9 w-9 items-center justify-center rounded-[0.85rem] border p-0.5 transition hover:-translate-y-0.5 hover:shadow-sm',
            isActive.get()
              ? 'border-primary bg-primary/10 ring-2 ring-primary/15'
              : 'border-base-300/80',
            classNames?.presetItem,
          )}
        >
          <span
            className="block h-7 w-7 rounded-[0.55rem]"
            style={renderPresetSwatchStyle(previewValue)}
          />
          {isActive.get() ? (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-content shadow-[0_4px_10px_rgba(15,23,42,0.18)]">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="h-2.5 w-2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 8 2.4 2.4L12.5 4.6" />
              </svg>
            </span>
          ) : null}
        </button>
      )
    }

    const group = rowArg0
    const index = rowArg1

    const groupKey = String(group.key ?? index)
    return (
      <section
        key={groupKey}
        className={appendClassName(
          'rounded-[1rem] border border-base-300/75 bg-base-100/80 p-2.5',
          (() => {
            void renderVersion
            return groupKey === resolveActiveKey() ? '' : 'hidden'
          })(),
        )}
      >
        {presets.length <= 1 ? (
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-base-content/45">
            {String(group.label)}
          </div>
        ) : null}
        <div className="grid grid-cols-5 gap-1.5 justify-items-start">
          {group.colors.map((rowArg0: any, rowArg1: number) => (
            <CompiledRow3 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </div>
      </section>
    )
  }

  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const group = rowArg0
    const index = rowArg1

    const key = String(group.key ?? index)
    return (
      <button
        key={key}
        type="button"
        className={appendClassName(
          'rounded-full border px-2.5 py-1 text-xs font-medium transition',
          (() => {
            void renderVersion
            return key === resolveActiveKey()
              ? 'border-primary bg-primary/10 text-primary shadow-sm'
              : 'border-base-300/80 bg-base-100 text-base-content/68 hover:border-primary/55'
          })(),
        )}
        onClick={() => {
          activePresetGroupKey.value = key
          requestRender()
        }}
      >
        {String(group.label)}
      </button>
    )
  }

  if (!presets.length) return <></>

  const resolveActiveKey = () => {
    return presets.find(
      (group, index) => String(group.key ?? index) === activePresetGroupKey.value,
    ) != null
      ? activePresetGroupKey.value
      : String(presets[0].key ?? 0)
  }

  const handlePresetClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest?.('[data-rue-color-picker-preset]') as HTMLButtonElement | null
    if (!button) return
    const groupIndex = Number(button.dataset.rueColorPickerPresetGroup)
    const colorIndex = Number(button.dataset.rueColorPickerPreset)
    const presetColor = presets[groupIndex]?.colors[colorIndex]
    if (presetColor === undefined) return
    const resolvedGradient = ensureGradientColor(presetColor, disabledAlpha)
    if (resolvedGradient) {
      if (availableModes.includes(COLOR_PICKER_MODE_GRADIENT)) {
        emitGradientChange(resolvedGradient, true)
        setModeValue(COLOR_PICKER_MODE_GRADIENT)
      } else {
        emitColorChange(resolvedGradient.toStops()[0]?.color ?? null, true)
      }
      return
    }
    emitColorChange(ensureColor(presetColor as ColorLike, disabledAlpha), true)
  }

  return (
    <div
      className={appendClassName('space-y-2', classNames?.presets)}
      style={styles?.presets}
      onClick={handlePresetClick}
    >
      {presets.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {presets.map((rowArg0: any, rowArg1: number) => (
            <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </div>
      ) : null}

      {presets.map((rowArg0: any, rowArg1: number) => (
        <CompiledRow2 rowArg0={rowArg0} rowArg1={rowArg1} />
      ))}
    </div>
  )
}

/** Color Picker 的内部工具函数。 */
const ColorPicker: FC<ColorPickerProps> = ({
  value,
  defaultValue = DEFAULT_COLOR,
  open,
  defaultOpen = false,
  disabled,
  placement = 'bottomLeft',
  trigger = 'click',
  format,
  defaultFormat = FORMAT_HEX,
  allowClear,
  presets = [],
  mode: modeProp,
  defaultMode,
  arrow = true,
  showText,
  size,
  disabledAlpha,
  disabledFormat,
  getPopupContainer,
  autoAdjustOverflow = true,
  destroyTooltipOnHide,
  destroyOnHidden,
  panelRender,
  rootClassName,
  triggerClassName,
  popupClassName,
  panelClassName,
  className,
  style,
  classNames,
  styles,
  onOpenChange,
  onFormatChange,
  onChange,
  onClear,
  onChangeComplete,
  children,
  ...rest
}) => {
  const isControlledValue = value !== undefined
  const isControlledOpen = open !== undefined
  const isControlledFormat = format !== undefined
  const sizeTokens = resolveSizeTokens(size)
  const availableModes = normalizeModes(modeProp)
  // 回调可能在 DOM 事件委托中触发，捕获 runtime 后可在回调里继续使用 Rue API。
  const withCallbackRuntime = <T,>(runner: () => T) => runner()
  const initialResolvedValue = isControlledValue ? value : defaultValue
  const initialGradientValue = ensureGradientColor(initialResolvedValue, disabledAlpha)
  const resolvedInitialMode =
    (defaultMode && availableModes.includes(defaultMode) ? defaultMode : undefined) ??
    (initialGradientValue && availableModes.includes(COLOR_PICKER_MODE_GRADIENT)
      ? COLOR_PICKER_MODE_GRADIENT
      : availableModes[0])

  const rootRef = useRef<HTMLElement>()
  const triggerRef = useRef<HTMLElement>()
  const popupRef = useRef<HTMLElement>()
  const saturationRef = useRef<HTMLElement>()
  const popupRafRef = useRef<number>()
  const renderRafRef = useRef<number>()
  const renderTimerRef = useRef<number>()
  const hoverCloseTimerRef = useRef<number>()
  const draggingRef = ref<{ stop?: () => void }>({})

  const popupOpen = ref(isControlledOpen ? !!open : !!defaultOpen)
  const currentFormat = ref<ColorFormatType>(format ?? defaultFormat)
  const currentMode = ref<ColorPickerMode>(resolvedInitialMode)
  const showArrow = resolveArrowEnabled(arrow)
  const pointAtCenter = resolveArrowPointAtCenter(arrow)
  const mergedDestroyOnHidden = destroyOnHidden ?? !!destroyTooltipOnHide
  const previewColor = ref<Color | null>(
    isGradientValue(initialResolvedValue)
      ? ensureColor(DEFAULT_COLOR, disabledAlpha)
      : ensureColor(initialResolvedValue, disabledAlpha),
  )
  const previewGradient = ref<GradientColor | null>(initialGradientValue)
  const inputDrafts = ref<ColorChannelDrafts>(getDraftsFromColor(previewColor.value))
  const inputFocusState = ref<Record<string, boolean>>({})
  const activePresetGroupKey = ref('')
  const activeGradientStopId = ref('')
  const popupFloatingStyle = ref<Record<string, any>>(HIDDEN_POPUP_STYLE)
  const [renderVersion, setRenderVersion] = useState(0)
  const popupHostId = ref(`rue-color-picker-popup-${++colorPickerPopupHostIdSeed}`)

  const clearDeferredRender = () => {
    if (typeof window === 'undefined') return
    if (renderTimerRef.current == null) return
    window.clearTimeout(renderTimerRef.current)
    renderTimerRef.current = undefined
  }

  const requestRender = () => {
    clearDeferredRender()
    const bumpRenderVersion = () => {
      setRenderVersion(version => version + 1)
    }
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      withCallbackRuntime(bumpRenderVersion)
      return
    }
    if (renderRafRef.current != null) return
    renderRafRef.current = window.requestAnimationFrame(() => {
      renderRafRef.current = undefined
      withCallbackRuntime(bumpRenderVersion)
    })
  }

  const requestDeferredRender = () => {
    if (typeof window === 'undefined') {
      requestRender()
      return
    }
    if (renderTimerRef.current != null) {
      window.clearTimeout(renderTimerRef.current)
    }
    renderTimerRef.current = window.setTimeout(() => {
      renderTimerRef.current = undefined
      requestRender()
    }, 120) as unknown as number
  }

  const syncPresetState = () => {
    if (!presets.length) {
      activePresetGroupKey.value = ''
      requestRender()
      return
    }

    const currentExists = presets.some(
      (group, index) => String(group.key ?? index) === activePresetGroupKey.value,
    )
    if (!currentExists) {
      const defaultIndex = Math.max(
        0,
        presets.findIndex(group => group.defaultOpen),
      )
      activePresetGroupKey.value = String(presets[defaultIndex]?.key ?? defaultIndex)
    }
    requestRender()
  }

  const getActiveColor = () => {
    if (currentMode.value === COLOR_PICKER_MODE_GRADIENT) {
      const stops = previewGradient.value?.toStops() ?? []
      const activeStop = stops.find(stop => stop.id === activeGradientStopId.value) ?? stops[0]
      return activeStop?.color?.clone() ?? null
    }
    return previewColor.value ? previewColor.value.clone() : null
  }

  const getActiveGradient = () => {
    return previewGradient.value ? previewGradient.value.clone() : null
  }

  const getWorkingColor = () => {
    if (currentMode.value === COLOR_PICKER_MODE_GRADIENT) {
      const stops = (
        previewGradient.value ??
        ensureGradientColor(defaultValue, disabledAlpha) ??
        new GradientColor(DEFAULT_GRADIENT_STOPS, disabledAlpha)
      ).toStops()
      const activeStop = stops.find(stop => stop.id === activeGradientStopId.value) ?? stops[0]
      return activeStop?.color?.clone() ?? new Color(DEFAULT_COLOR)
    }
    const fallbackDefaultColor = isGradientValue(defaultValue)
      ? DEFAULT_COLOR
      : (defaultValue ?? DEFAULT_COLOR)
    return (
      previewColor.value?.clone() ??
      ensureColor(fallbackDefaultColor, disabledAlpha) ??
      new Color(DEFAULT_COLOR)
    )
  }

  const syncGradientStopState = (gradientValue?: GradientColor | null) => {
    const stops = (gradientValue ?? previewGradient.value)?.toStops() ?? []
    if (!stops.length) {
      activeGradientStopId.value = ''
      return
    }
    const matched = stops.find(stop => stop.id === activeGradientStopId.value)
    if (!matched) {
      activeGradientStopId.value = stops[0].id
    }
  }

  const syncDraftInputs = (force = false, deferredRender = false) => {
    const nextDrafts = getDraftsFromColor(getWorkingColor())
    const mergedDrafts: ColorChannelDrafts = { ...inputDrafts.value }
    ;(Object.keys(nextDrafts) as Array<keyof ColorChannelDrafts>).forEach(key => {
      if (force || !inputFocusState.value[key]) {
        mergedDrafts[key] = nextDrafts[key]
      }
    })
    if (isSameDraftInputs(inputDrafts.value, mergedDrafts)) return
    inputDrafts.value = mergedDrafts
    if (deferredRender) {
      requestDeferredRender()
      return
    }
    requestRender()
  }

  const syncValueFromProps = () => {
    const nextResolvedValue = isControlledValue ? value : defaultValue
    const nextGradient = ensureGradientColor(nextResolvedValue, disabledAlpha)
    const nextColor = isGradientValue(nextResolvedValue)
      ? (previewColor.value?.clone() ?? ensureColor(DEFAULT_COLOR, disabledAlpha))
      : ensureColor(nextResolvedValue, disabledAlpha)

    previewColor.value = nextColor ? nextColor.clone() : null
    previewGradient.value = nextGradient ? nextGradient.clone() : null

    if (nextGradient && availableModes.includes(COLOR_PICKER_MODE_GRADIENT)) {
      currentMode.value = COLOR_PICKER_MODE_GRADIENT
    } else if (!availableModes.includes(currentMode.value)) {
      currentMode.value = availableModes[0]
    }

    syncGradientStopState(nextGradient)
    syncDraftInputs(true)
  }

  const setPopupOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      popupFloatingStyle.value = HIDDEN_POPUP_STYLE
    }
    if (!isControlledOpen) {
      popupOpen.value = nextOpen
    }
    requestRender()

    if (nextOpen) {
      schedulePopupPositionSync()
    }
    if (onOpenChange) {
      withCallbackRuntime(() => {
        onOpenChange(nextOpen)
      })
    }
  }

  const setModeValue = (nextMode: ColorPickerMode) => {
    if (!availableModes.includes(nextMode)) return
    currentMode.value = nextMode
    if (nextMode === COLOR_PICKER_MODE_GRADIENT) {
      if (!previewGradient.value) {
        previewGradient.value =
          ensureGradientColor(defaultValue, disabledAlpha) ??
          new GradientColor(DEFAULT_GRADIENT_STOPS, disabledAlpha)
      }
      syncGradientStopState(previewGradient.value)
    }
    syncDraftInputs(true)
  }

  const setFormatValue = (nextFormat: ColorFormatType) => {
    if (nextFormat === currentFormat.value) return
    if (!isControlledFormat) {
      currentFormat.value = nextFormat
    }

    syncDraftInputs(true)
    if (onFormatChange) {
      withCallbackRuntime(() => {
        onFormatChange(nextFormat)
      })
    }
  }

  const emitGradientChange = (nextGradient: GradientColor | null, complete?: boolean) => {
    const previousGradient = previewGradient.value
    const gradientChanged =
      nextGradient || previousGradient
        ? !isSameGradientValue(previousGradient, nextGradient)
        : false

    if (!gradientChanged) {
      if (complete && nextGradient && onChangeComplete) {
        withCallbackRuntime(() => {
          onChangeComplete(nextGradient.clone())
        })
      }
      return
    }

    previewGradient.value = nextGradient ? nextGradient.clone() : null
    syncGradientStopState(nextGradient)
    syncDraftInputs(true, true)

    requestDeferredRender()

    if (onChange) {
      withCallbackRuntime(() => {
        onChange(nextGradient ? nextGradient.clone() : null, nextGradient?.toCssString() ?? '')
      })
    }

    if (complete && nextGradient && onChangeComplete) {
      withCallbackRuntime(() => {
        onChangeComplete(nextGradient.clone())
      })
    }
  }

  const emitColorChange = (nextColor: Color | null, complete?: boolean) => {
    const normalizedColor = stripAlphaIfNeeded(nextColor, disabledAlpha)
    if (currentMode.value === COLOR_PICKER_MODE_GRADIENT) {
      const currentGradient =
        previewGradient.value ??
        ensureGradientColor(defaultValue, disabledAlpha) ??
        new GradientColor(DEFAULT_GRADIENT_STOPS, disabledAlpha)
      const activeStopId = activeGradientStopId.value || currentGradient.toStops()[0]?.id || ''
      if (!activeStopId || !normalizedColor) {
        emitGradientChange(currentGradient, complete)
        return
      }
      emitGradientChange(currentGradient.withStopColor(activeStopId, normalizedColor), complete)
      return
    }

    const previousColor = previewColor.value
    const colorChanged =
      normalizedColor || previousColor ? !isSameColorValue(previousColor, normalizedColor) : false

    if (!colorChanged) {
      if (complete && normalizedColor && onChangeComplete) {
        withCallbackRuntime(() => {
          onChangeComplete(normalizedColor.clone())
        })
      }
      return
    }

    previewColor.value = normalizedColor ? normalizedColor.clone() : null
    syncDraftInputs(true, true)

    requestDeferredRender()
    if (onChange) {
      withCallbackRuntime(() => {
        onChange(
          normalizedColor ? normalizedColor.clone() : null,
          normalizedColor?.toCssString() ?? '',
        )
      })
    }

    if (complete && normalizedColor && onChangeComplete) {
      withCallbackRuntime(() => {
        onChangeComplete(normalizedColor.clone())
      })
    }
  }

  const commitDraftInputs = (complete = true) => {
    const draftAlpha = disabledAlpha
      ? 1
      : clampNumber(Number.parseFloat(inputDrafts.value.a || '100'), 0, 100) / 100

    if (currentFormat.value === FORMAT_HEX) {
      const normalizedHex = inputDrafts.value.hex.trim().startsWith('#')
        ? inputDrafts.value.hex.trim()
        : `#${inputDrafts.value.hex.trim()}`
      const nextColor = ensureColor(normalizedHex, disabledAlpha)
      if (!nextColor) {
        syncDraftInputs(true)
        return
      }
      emitColorChange(disabledAlpha ? nextColor : nextColor.withAlpha(draftAlpha), complete)
      return
    }

    if (currentFormat.value === FORMAT_RGB) {
      const red = Number.parseFloat(inputDrafts.value.r)
      const green = Number.parseFloat(inputDrafts.value.g)
      const blue = Number.parseFloat(inputDrafts.value.b)
      if (![red, green, blue].every(Number.isFinite)) {
        syncDraftInputs(true)
        return
      }
      emitColorChange(new Color({ r: red, g: green, b: blue, a: draftAlpha }), complete)
      return
    }

    const hue = Number.parseFloat(inputDrafts.value.h)
    const saturation = Number.parseFloat(inputDrafts.value.s)
    const brightness = Number.parseFloat(inputDrafts.value.v)
    if (![hue, saturation, brightness].every(Number.isFinite)) {
      syncDraftInputs(true)
      return
    }
    emitColorChange(new Color({ h: hue, s: saturation, b: brightness, a: draftAlpha }), complete)
  }

  const updateGradientStopPercent = (nextPercent: number, complete?: boolean) => {
    const currentGradient =
      previewGradient.value ??
      ensureGradientColor(defaultValue, disabledAlpha) ??
      new GradientColor(DEFAULT_GRADIENT_STOPS, disabledAlpha)
    const activeStopId = activeGradientStopId.value || currentGradient.toStops()[0]?.id || ''
    if (!activeStopId) return
    emitGradientChange(currentGradient.withStopPercent(activeStopId, nextPercent), complete)
  }

  const selectGradientStop = (stopId: string) => {
    activeGradientStopId.value = stopId
    syncDraftInputs(true)
  }

  const addGradientStop = () => {
    const currentGradient =
      previewGradient.value ??
      ensureGradientColor(defaultValue, disabledAlpha) ??
      new GradientColor(DEFAULT_GRADIENT_STOPS, disabledAlpha)
    const stops = currentGradient.toStops()
    const activeIndex = Math.max(
      0,
      stops.findIndex(stop => stop.id === activeGradientStopId.value),
    )
    const currentStop = stops[activeIndex] ?? stops[0]
    const nextStop = stops[activeIndex + 1]
    const nextPercent = nextStop
      ? (currentStop.percent + nextStop.percent) / 2
      : clampNumber(currentStop.percent + 12, 0, 100)
    const previousIds = /*#__PURE__*/ new Set(stops.map(stop => stop.id))
    const nextGradient = currentGradient.addStop(nextPercent, currentStop.color)
    const createdStop = nextGradient.toStops().find(stop => !previousIds.has(stop.id))
    activeGradientStopId.value = createdStop?.id ?? activeGradientStopId.value
    emitGradientChange(nextGradient, true)
  }

  const removeGradientStop = () => {
    const currentGradient = previewGradient.value
    if (!currentGradient) return
    const stops = currentGradient.toStops()
    if (stops.length <= 2) return
    const removeStopId = activeGradientStopId.value
    const activeIndex = Math.max(
      0,
      stops.findIndex(stop => stop.id === removeStopId),
    )
    const fallbackStop = stops[activeIndex + 1] ?? stops[Math.max(0, activeIndex - 1)]
    activeGradientStopId.value = fallbackStop?.id ?? ''
    emitGradientChange(currentGradient.removeStop(removeStopId), true)
  }

  const updateSaturationBrightness = (clientX: number, clientY: number, complete?: boolean) => {
    const host = saturationRef.current
    if (!host) return
    const rect = host.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const horizontalRatio = clampNumber((clientX - rect.left) / rect.width, 0, 1)
    const verticalRatio = clampNumber((clientY - rect.top) / rect.height, 0, 1)
    const baseColor = getWorkingColor().toHsb()
    const nextColor = new Color({
      ...baseColor,
      s: horizontalRatio * 100,
      b: (1 - verticalRatio) * 100,
    })
    emitColorChange(nextColor, complete)
  }

  const startSaturationDrag = (event: PointerEvent) => {
    if (disabled) return
    event.preventDefault()
    updateSaturationBrightness(event.clientX, event.clientY)

    if (typeof window === 'undefined') return

    const handleMove = (moveEvent: PointerEvent) => {
      updateSaturationBrightness(moveEvent.clientX, moveEvent.clientY)
    }

    const handleUp = (upEvent: PointerEvent) => {
      updateSaturationBrightness(upEvent.clientX, upEvent.clientY, true)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      draggingRef.value.stop = undefined
    }

    draggingRef.value.stop = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      draggingRef.value.stop = undefined
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const clearHoverCloseTimer = () => {
    if (typeof window === 'undefined') return
    if (hoverCloseTimerRef.current == null) return
    window.clearTimeout(hoverCloseTimerRef.current)
    hoverCloseTimerRef.current = undefined
  }

  const scheduleHoverClose = () => {
    if (typeof window === 'undefined' || disabled || trigger !== 'hover') return
    clearHoverCloseTimer()
    hoverCloseTimerRef.current = window.setTimeout(() => {
      hoverCloseTimerRef.current = undefined
      setPopupOpen(false)
    }, 90) as unknown as number
  }

  const syncPopupPosition = () => {
    if (typeof window === 'undefined' || !popupOpen.value) return

    const anchor = triggerRef.current ?? rootRef.current
    const popupElement = popupRef.current
    if (!anchor || !popupElement) return

    const anchorRect = anchor.getBoundingClientRect()
    const popupRect = popupElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const spacing = showArrow ? 12 : 8
    const viewportGap = 12
    const layout = resolvePlacementLayout(placement)

    let left = anchorRect.left
    let top = anchorRect.bottom + spacing

    if (layout.direction === 'top' || layout.direction === 'bottom') {
      top =
        layout.direction === 'top'
          ? anchorRect.top - popupRect.height - spacing
          : anchorRect.bottom + spacing
      if (layout.align === 'center') {
        left = anchorRect.left + (anchorRect.width - popupRect.width) / 2
      } else if (layout.align === 'end') {
        left = anchorRect.right - popupRect.width
      }
    } else {
      left =
        layout.direction === 'left'
          ? anchorRect.left - popupRect.width - spacing
          : anchorRect.right + spacing
      if (layout.align === 'center') {
        top = anchorRect.top + (anchorRect.height - popupRect.height) / 2
      } else if (layout.align === 'end') {
        top = anchorRect.bottom - popupRect.height
      } else {
        top = anchorRect.top
      }
    }

    if (autoAdjustOverflow !== false) {
      left = clampNumber(
        left,
        viewportGap,
        Math.max(viewportGap, viewportWidth - popupRect.width - viewportGap),
      )
      top = clampNumber(
        top,
        viewportGap,
        Math.max(viewportGap, viewportHeight - popupRect.height - viewportGap),
      )
    }

    popupFloatingStyle.value = {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      visibility: 'visible',
    }
    popupElement.style.left = `${Math.round(left)}px`
    popupElement.style.top = `${Math.round(top)}px`
    popupElement.style.visibility = 'visible'
  }

  const schedulePopupPositionSync = () => {
    if (typeof window === 'undefined' || !popupOpen.value) return
    if (popupRafRef.current != null) {
      window.cancelAnimationFrame(popupRafRef.current)
    }

    popupRafRef.current = window.requestAnimationFrame(() => {
      popupRafRef.current = undefined
      syncPopupPosition()
    })
  }

  const handleTriggerClick = () => {
    if (disabled || trigger !== 'click') return
    setPopupOpen(!popupOpen.value)
  }

  const clearCurrentValue = () => {
    if (disabled) return
    if (currentMode.value === COLOR_PICKER_MODE_GRADIENT) {
      previewGradient.value = null
    } else {
      previewColor.value = null
    }
    syncDraftInputs(true)

    if (onChange) {
      withCallbackRuntime(() => {
        onChange(null, '')
      })
    }
    if (onClear) {
      withCallbackRuntime(() => {
        onClear()
      })
    }
  }

  const handleClear = (event: MouseEvent) => {
    if (typeof event.preventDefault === 'function') event.preventDefault()
    if (typeof event.stopPropagation === 'function') event.stopPropagation()
    clearCurrentValue()
  }

  const handlePopupClear = () => {
    clearCurrentValue()
    setPopupOpen(false)
  }

  const renderTriggerText = (activeValue: Color | GradientColor | null) => {
    if (typeof showText === 'function') {
      if (!activeValue) return EMPTY_COLOR_TEXT
      return showText(activeValue) ?? EMPTY_COLOR_TEXT
    }
    if (!showText) return null
    if (!activeValue) return EMPTY_COLOR_TEXT
    return activeValue instanceof GradientColor
      ? activeValue.toCssString()
      : formatColorText(activeValue, currentFormat.value)
  }

  const activePreviewValue = computed(() =>
    currentMode.value === COLOR_PICKER_MODE_GRADIENT ? getActiveGradient() : getActiveColor(),
  )
  const pickerSectionContext: PickerSectionRenderContext = {
    getColor: getWorkingColor,
    getGradient: () => (previewGradient.value ? previewGradient.value.clone() : null),
    currentMode,
    availableModes,
    activeGradientStopId,
    currentFormat,
    allowClear: !!allowClear,
    disabled,
    disabledFormat,
    disabledAlpha,
    classNames,
    styles,
    saturationRef,
    startSaturationDrag,
    emitColorChange,
    setModeValue,
    setFormatValue,
    inputDrafts,
    inputFocusState,
    requestRender,
    commitDraftInputs,
    clearValue: handlePopupClear,
    updateGradientStopPercent,
    selectGradientStop,
    addGradientStop,
    removeGradientStop,
  }
  const presetsSectionContext: PresetsSectionRenderContext = {
    presets,
    disabledAlpha,
    currentMode,
    availableModes,
    currentFormat,
    renderVersion,
    classNames,
    styles,
    activePresetGroupKey,
    getActiveColor,
    getActiveGradient,
    emitColorChange,
    emitGradientChange,
    setModeValue,
    requestRender,
  }

  const clearConfig = typeof allowClear === 'object' ? allowClear : undefined
  const hasCustomTrigger = hasRenderableSlotContent(children)
  const usesShowText = showText === true || typeof showText === 'function'
  const compactTrigger = !hasCustomTrigger && !usesShowText
  const resolvedContainer = resolveContainer(
    getPopupContainer,
    triggerRef.current ?? rootRef.current,
  )
  const triggerDisplayText = computed(() =>
    String(renderTriggerText(activePreviewValue.get()) ?? EMPTY_COLOR_TEXT),
  )

  const PopupPanel = () => (
    <div className={appendClassName('space-y-3', panelClassName)}>
      <PickerSection {...pickerSectionContext} />
      <PresetsSection {...presetsSectionContext} />
    </div>
  )

  const assignPopupElement = (element: HTMLDivElement | null) => {
    const previousElement = popupRef.current
    popupRef.current = element ?? undefined
    if (!element || element === previousElement) return

    if (popupOpen.value && !disabled) {
      schedulePopupPositionSync()
    }
  }

  onMounted(() => {
    syncPresetState()
    syncValueFromProps()

    if (typeof window === 'undefined') return

    const handlePointerDown = (event: PointerEvent) => {
      if (!popupOpen.value) return
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      if (popupRef.current?.contains(target)) return
      setPopupOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (!popupOpen.value || event.key !== 'Escape') return
      setPopupOpen(false)
    }

    const handleViewportChange = () => {
      schedulePopupPositionSync()
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    onUnmounted(() => {
      draggingRef.value.stop?.()
      clearHoverCloseTimer()
      clearDeferredRender()
      if (renderRafRef.current != null) {
        window.cancelAnimationFrame(renderRafRef.current)
      }
      if (popupRafRef.current != null) {
        window.cancelAnimationFrame(popupRafRef.current)
      }
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    })
  })

  watch(
    () => value,
    () => {
      syncValueFromProps()
    },
  )

  watch(
    () => defaultValue,
    () => {
      if (!isControlledValue) {
        syncValueFromProps()
      }
    },
  )

  watch(
    () => presets,
    () => {
      syncPresetState()
    },
  )

  watch(
    () => open,
    () => {
      if (open !== undefined) {
        popupOpen.value = !!open
        requestRender()

        if (open) {
          schedulePopupPositionSync()
        }
      }
    },
  )

  watch(
    () => format,
    () => {
      if (format === undefined || currentFormat.value === format) return
      currentFormat.value = format
      syncDraftInputs(true)
    },
  )

  watch(
    () => disabledAlpha,
    () => {
      previewColor.value = stripAlphaIfNeeded(previewColor.value, disabledAlpha)
      previewGradient.value = previewGradient.value
        ? new GradientColor(previewGradient.value.toStops(), disabledAlpha)
        : null
      syncGradientStopState(previewGradient.value)
      syncDraftInputs(true)
    },
  )

  watch(
    () => [
      popupOpen.value,
      placement,
      autoAdjustOverflow,
      showArrow,
      currentMode.value,
      currentFormat.value,
      previewColor.value?.toHexString() ?? 'none',
      previewGradient.value?.toCssString() ?? 'gradient:none',
      activePresetGroupKey.value,
    ],
    () => {
      if (!popupOpen.value) {
        popupFloatingStyle.value = HIDDEN_POPUP_STYLE
        return
      }
      schedulePopupPositionSync()
    },
  )

  const RootNodeView = () => (
    <div
      {...rest}
      ref={(element: HTMLDivElement | null) => {
        rootRef.current = element ?? undefined
      }}
      className={appendClassName(
        'relative inline-flex max-w-full align-top',
        rootClassName,
        classNames?.root,
        className,
      )}
      style={{ ...styles?.root, ...style }}
      data-rue-color-picker="true"
      data-rue-color-picker-version={String(renderVersion)}
      onMouseEnter={() => {
        if (disabled || trigger !== 'hover') return
        clearHoverCloseTimer()
        setPopupOpen(true)
      }}
      onMouseLeave={() => {
        scheduleHoverClose()
      }}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        ref={(element: HTMLDivElement | null) => {
          const changed = triggerRef.current !== (element ?? undefined)
          triggerRef.current = element ?? undefined
          if (changed && element && typeof getPopupContainer === 'function') {
            requestRender()
          }
          if (element && popupOpen.value) {
            schedulePopupPositionSync()
          }
        }}
        aria-expanded={popupOpen.value ? 'true' : 'false'}
        aria-haspopup="dialog"
        aria-controls={popupHostId.value}
        aria-disabled={disabled ? 'true' : undefined}
        data-rue-color-picker-trigger="true"
        className={appendClassName(
          'group relative z-10 flex max-w-full items-center bg-base-100 text-base-content outline-none transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15',
          compactTrigger
            ? appendClassName(
                'justify-center rounded-[0.72rem] border border-base-300 shadow-sm',
                sizeTokens.compactTriggerClassName,
              )
            : appendClassName(
                'gap-2 rounded-[0.72rem] border border-base-300 shadow-sm',
                sizeTokens.triggerClassName,
              ),
          disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
          popupOpen.value ? 'border-primary ring-2 ring-primary/15' : '',
          triggerClassName,
          classNames?.trigger,
        )}
        style={{ ...styles?.trigger }}
        onClick={handleTriggerClick}
        onKeyDown={(event: KeyboardEvent) => {
          if (disabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (trigger === 'click') {
              setPopupOpen(!popupOpen.value)
            } else {
              setPopupOpen(true)
            }
          }
          if (event.key === 'Escape') {
            setPopupOpen(false)
          }
        }}
      >
        <span
          className={appendClassName(
            'relative shrink-0 overflow-hidden border border-base-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
            compactTrigger
              ? appendClassName('rounded-[0.45rem]', sizeTokens.compactSwatchSizeClassName)
              : appendClassName('rounded-[0.45rem]', sizeTokens.swatchSizeClassName),
          )}
          style={renderSwatchStyle(activePreviewValue.get())}
        />

        {!compactTrigger ? (
          <span className="min-w-0 flex-1">
            {hasCustomTrigger ? (
              <span className="block min-w-0 truncate">{children}</span>
            ) : (
              <span
                className="flex min-w-0 items-center text-sm leading-5 text-base-content/85"
                aria-label={triggerDisplayText.get()}
              >
                <span className="truncate">{triggerDisplayText.get()}</span>
              </span>
            )}
          </span>
        ) : null}

        {allowClear && activePreviewValue.get() ? (
          <button
            type="button"
            aria-label="清除颜色"
            className={appendClassName(
              'btn btn-ghost btn-xs rounded-full p-0 text-base-content/55 hover:text-base-content',
              classNames?.clear,
            )}
            onClick={handleClear}
          >
            {clearConfig?.clearIcon ?? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            )}
          </button>
        ) : !compactTrigger && !usesShowText ? (
          <span className="shrink-0 text-base-content/45">
            <ChevronIcon open={popupOpen.value} />
          </span>
        ) : null}
      </div>

      {resolvedContainer === false || resolvedContainer == null ? (
        popupOpen.value || !mergedDestroyOnHidden ? (
          <div
            ref={(element: HTMLDivElement | null) => {
              assignPopupElement(element)
            }}
            id={popupHostId.value}
            data-rue-color-picker-popup-host="true"
            hidden={popupOpen.value && !disabled ? undefined : true}
            aria-hidden={popupOpen.value && !disabled ? 'false' : 'true'}
            data-rue-color-picker-popup-version={String(renderVersion)}
            className={appendClassName(
              'fixed left-0 top-0 z-[1200] pointer-events-auto',
              sizeTokens.popupWidthClassName,
              popupClassName,
              classNames?.popup,
            )}
            style={{
              ...styles?.popup,
              ...popupFloatingStyle.value,
              visibility: popupOpen.value && !disabled ? 'visible' : 'hidden',
            }}
            onMouseEnter={() => {
              clearHoverCloseTimer()
            }}
            onMouseLeave={() => {
              scheduleHoverClose()
            }}
            onPointerDown={(event: PointerEvent) => {
              if (typeof event.stopPropagation === 'function') {
                event.stopPropagation()
              }
            }}
            onClick={(event: MouseEvent) => {
              if (typeof event.stopPropagation === 'function') {
                event.stopPropagation()
              }
            }}
          >
            {showArrow ? (
              <span
                className={appendClassName(
                  'pointer-events-none absolute h-4 w-4 rotate-45 bg-base-100 shadow-[0_6px_18px_rgba(15,23,42,0.08)]',
                  resolveArrowClassName(placement, pointAtCenter),
                )}
              />
            ) : null}

            <div
              className={appendClassName(
                'relative overflow-hidden rounded-[1.1rem] border border-base-300 bg-base-100 p-3 text-base-content shadow-[0_16px_36px_rgba(15,23,42,0.14),0_6px_16px_rgba(15,23,42,0.08)] pointer-events-auto',
                panelClassName,
                classNames?.panel,
              )}
              style={{ ...styles?.panel }}
              data-rue-color-picker-popup="true"
              data-rue-color-picker-panel-version={String(renderVersion)}
            >
              <PopupPanel />
            </div>
          </div>
        ) : null
      ) : popupOpen.value || !mergedDestroyOnHidden ? (
        <Teleport to={resolvedContainer}>
          <div
            ref={(element: HTMLDivElement | null) => {
              assignPopupElement(element)
            }}
            id={popupHostId.value}
            data-rue-color-picker-popup-host="true"
            hidden={popupOpen.value && !disabled ? undefined : true}
            aria-hidden={popupOpen.value && !disabled ? 'false' : 'true'}
            data-rue-color-picker-popup-version={String(renderVersion)}
            className={appendClassName(
              'fixed left-0 top-0 z-[1200] pointer-events-auto',
              sizeTokens.popupWidthClassName,
              popupClassName,
              classNames?.popup,
            )}
            style={{
              ...styles?.popup,
              ...popupFloatingStyle.value,
              visibility: popupOpen.value && !disabled ? 'visible' : 'hidden',
            }}
            onMouseEnter={() => {
              clearHoverCloseTimer()
            }}
            onMouseLeave={() => {
              scheduleHoverClose()
            }}
            onPointerDown={(event: PointerEvent) => {
              if (typeof event.stopPropagation === 'function') {
                event.stopPropagation()
              }
            }}
            onClick={(event: MouseEvent) => {
              if (typeof event.stopPropagation === 'function') {
                event.stopPropagation()
              }
            }}
          >
            {showArrow ? (
              <span
                className={appendClassName(
                  'pointer-events-none absolute h-4 w-4 rotate-45 bg-base-100 shadow-[0_6px_18px_rgba(15,23,42,0.08)]',
                  resolveArrowClassName(placement, pointAtCenter),
                )}
              />
            ) : null}

            <div
              className={appendClassName(
                'relative overflow-hidden rounded-[1.1rem] border border-base-300 bg-base-100 p-3 text-base-content shadow-[0_16px_36px_rgba(15,23,42,0.14),0_6px_16px_rgba(15,23,42,0.08)] pointer-events-auto',
                panelClassName,
                classNames?.panel,
              )}
              style={{ ...styles?.panel }}
              data-rue-color-picker-popup="true"
              data-rue-color-picker-panel-version={String(renderVersion)}
            >
              <PopupPanel />
            </div>
          </div>
        </Teleport>
      ) : null}
    </div>
  )

  return <RootNodeView />
}

/** 默认导出颜色选择器组件。 */
export default ColorPicker
