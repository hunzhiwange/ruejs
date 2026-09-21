/*
MockupPhone 模块概述
- 汇总手机样机组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'

/** MockupPhoneTone 语义色类型。 */
export type MockupPhoneTone =
  | 'default'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** MockupPhoneSize 尺寸类型。 */
export type MockupPhoneSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'small'
  | 'middle'
  | 'medium'
  | 'large'

/** MockupPhonePartProps 组件属性。 */
export interface MockupPhonePartProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MockupPhoneCameraConfig 配置对象。 */
export interface MockupPhoneCameraConfig extends MockupPhonePartProps {}

/** MockupPhoneDisplayConfig 配置对象。 */
export interface MockupPhoneDisplayConfig {
  /** 根节点附加类名。 */
  className?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  text?: string
  /** 组件子内容。 */
  children?: any
  /** src 配置项。 */
  src?: string
  /** alt 配置项。 */
  alt?: string
  /** imgClassName 附加类名。 */
  imgClassName?: string
}

/** MockupPhoneRootProps 组件属性。 */
export interface MockupPhoneRootProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件尺寸。 */
  size?: MockupPhoneSize
  /** 组件语义色。 */
  color?: MockupPhoneTone
  /** camera 配置项。 */
  camera?: boolean | MockupPhoneCameraConfig
  /** display 配置项。 */
  display?: MockupPhoneDisplayConfig
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: MockupPhoneSize) => {
  switch (size) {
    case 'xs':
      return 'w-52'
    case 'sm':
    case 'small':
      return 'w-60'
    case 'md':
    case 'medium':
    case 'middle':
      return 'w-72'
    case 'lg':
    case 'large':
      return 'w-80'
    case 'xl':
      return 'w-96'
    default:
      return undefined
  }
}

/** 解析 Tone Class 的内部工具函数。 */
const resolveToneClass = (color?: MockupPhoneTone) => {
  if (!color || color === 'default') {
    return undefined
  }
  return `border-${color}`
}

/** Camera 的内部工具函数。 */
const Camera: FC<MockupPhonePartProps> = ({ className, children, ...rest }) => {
  return (
    <div {...rest} className={mergeClassName('mockup-phone-camera', className)}>
      {children}
    </div>
  )
}

/** Display 的内部工具函数。 */
const Display: FC<MockupPhonePartProps> = ({ className, children, ...rest }) => {
  return (
    <div {...rest} className={mergeClassName('mockup-phone-display', className)}>
      {children}
    </div>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<MockupPhoneRootProps> = ({
  className,
  size,
  color,
  camera,
  display,
  children,
  ...rest
}) => {
  let cls = 'mockup-phone'
  const sizeClass = resolveSizeClass(size)
  const toneClass = resolveToneClass(color)
  if (sizeClass) cls += ` ${sizeClass}`
  if (toneClass) cls += ` ${toneClass}`
  if (className) cls += ` ${className}`

  const showCamera = camera !== false
  const cameraProps = typeof camera === 'object' ? camera : undefined
  const displayAlt = display?.alt ?? 'mockup phone wallpaper'
  const hasDisplayChildren = display?.children != null

  return (
    <div {...rest} className={cls}>
      {display ? (
        <>
          {showCamera ? <Camera {...cameraProps} /> : null}
          <Display className={display.className}>
            {display.src ? (
              <img alt={displayAlt} src={display.src} className={display.imgClassName} />
            ) : null}
            {hasDisplayChildren ? (
              display.contentClassName ? (
                <div className={display.contentClassName}>{display.children}</div>
              ) : (
                display.children
              )
            ) : null}
          </Display>
        </>
      ) : (
        children
      )}
    </div>
  )
}

type MockupPhoneCompound = FC<MockupPhoneRootProps> & {
  Camera: FC<MockupPhonePartProps>
  Display: FC<MockupPhonePartProps>
}

const MockupPhone: MockupPhoneCompound = /*#__PURE__*/ Object.assign(Root, {
  Camera,
  Display,
})

/** 默认导出手机样机组件。 */
export default MockupPhone
