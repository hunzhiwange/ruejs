/*
HoverGallery 组件概述
- 数据驱动：支持字符串 src、对象项或自定义节点 node。
- 标签：可渲染为 figure 或 div。
*/
import type { FC } from '@rue-js/rue'

/** HoverGalleryItem 数据项结构。 */
export interface HoverGalleryItem {
  /** 数据项唯一标识。 */
  key?: string | number
  /** src 配置项。 */
  src?: string
  /** alt 配置项。 */
  alt?: string
  /** 根节点附加类名。 */
  className?: string
  /** imageClassName 附加类名。 */
  imageClassName?: string
  /** 展示标签。 */
  label?: any
  /** node 配置项。 */
  text?: string
}

/** HoverGalleryFit 类型。 */
export type HoverGalleryFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'

/** HoverGalleryProps 组件属性。 */
export interface HoverGalleryProps {
  /** 自定义渲染的宿主元素。 */
  as?: 'figure' | 'div'
  /** 根节点附加类名。 */
  className?: string
  /** wrapperClassName 附加类名。 */
  wrapperClassName?: string
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<HoverGalleryItem | string | any>
  /** imageClassName 附加类名。 */
  imageClassName?: string
  /** fit 配置项。 */
  fit?: HoverGalleryFit
  /** showGuide 配置项。 */
  showGuide?: boolean
  /** guideLabels 配置项。 */
  guideLabels?: ReadonlyArray<any>
  /** guideClassName 附加类名。 */
  guideClassName?: string
  /** guideItemClassName 附加类名。 */
  guideItemClassName?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedGalleryItem {
  key: string | number
  type: 'image' | 'node'
  src?: string
  alt?: string
  className?: string
  text?: string
  label?: any
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 解析 Fit Class 的内部工具函数。 */
const resolveFitClass = (fit?: HoverGalleryFit) => {
  switch (fit) {
    case 'contain':
      return 'object-contain'
    case 'fill':
      return 'object-fill'
    case 'none':
      return 'object-none'
    case 'scale-down':
      return 'object-scale-down'
    case 'cover':
    default:
      return fit ? 'object-cover' : undefined
  }
}

/** 解析 Image Class Name 的内部工具函数。 */
const resolveImageClassName = (
  fitClass?: string,
  imageClassName?: string,
  className?: string,
  itemImageClassName?: string,
) => {
  return (
    mergeClassName(
      mergeClassName(fitClass ?? '', imageClassName),
      mergeClassName(className ?? '', itemImageClassName),
    ).trim() || undefined
  )
}

/** 归一化 Item 的内部工具函数。 */
const normalizeItem = (
  item: HoverGalleryItem | string,
  index: number,
  fitClass?: string,
  imageClassName?: string,
): NormalizedGalleryItem => {
  if (typeof item === 'string') {
    return {
      key: index,
      type: 'image',
      src: item,
      alt: '',
      className: resolveImageClassName(fitClass, imageClassName),
    }
  }

  if (item && typeof item === 'object') {
    const objectItem = item as HoverGalleryItem

    if (objectItem.text != null) {
      return {
        key: objectItem.key ?? index,
        type: 'node',
        text: objectItem.text,
        label: objectItem.label,
      }
    }

    if (objectItem.src) {
      return {
        key: objectItem.key ?? index,
        type: 'image',
        src: objectItem.src,
        alt: objectItem.alt ?? '',
        className: resolveImageClassName(
          fitClass,
          imageClassName,
          objectItem.className,
          objectItem.imageClassName,
        ),
        label: objectItem.label,
      }
    }
  }

  return {
    key: index,
    type: 'node',
    text: typeof item === 'object' ? item.text : item,
  }
}

/** 归一化 Items 的内部工具函数。 */
const normalizeItems = (
  items: HoverGalleryProps['items'],
  fitClass?: string,
  imageClassName?: string,
): NormalizedGalleryItem[] => {
  if (items && items.length > 0) {
    return items.map((item, index) => normalizeItem(item, index, fitClass, imageClassName))
  }

  return []
}

/**
 * 悬浮画廊：保持 daisyUI 的 hover-gallery 视觉基础，同时补齐数据驱动、图片层配置与引导遮罩。
 */
const HoverGallery: FC<HoverGalleryProps> = ({
  as = 'figure',
  className,
  wrapperClassName,
  children,
  items,
  imageClassName,
  fit,
  showGuide,
  guideLabels,
  guideClassName,
  guideItemClassName,
  ...rest
}) => {
  const fitClass = resolveFitClass(fit)
  const normalizedItems = normalizeItems(items, fitClass, imageClassName)
  const guideCount = normalizedItems.length > 1 ? normalizedItems.length - 1 : 0
  const readGuideItems = () =>
    normalizedItems.slice(1).map((item, index) => ({
      key: item.key,
      text: String(guideLabels?.[index] ?? item.label ?? index + 2),
      className: mergeClassName(
        'from-white/10 via-transparent to-black/10 bg-linear-80 grid place-content-center',
        guideItemClassName,
      ),
    }))
  const galleryClassName = mergeClassName('hover-gallery', className)
  const guideGridTemplateColumns = `repeat(${guideCount}, minmax(0, 1fr))`

  if (!showGuide || guideCount === 0) {
    const directChildren = !items?.length
    if (as === 'div') {
      return (
        <div {...rest} className={galleryClassName}>
          {directChildren ? (
            children
          ) : (
            <>
              {' '}
              {normalizedItems.map((rowArg0: any, rowIndex: number) => (
                <GalleryItem item={rowArg0} />
              ))}{' '}
            </>
          )}
        </div>
      )
    }

    return (
      <figure {...rest} className={galleryClassName}>
        {directChildren ? (
          children
        ) : (
          <>
            {' '}
            {normalizedItems.map((rowArg0: any, rowIndex: number) => (
              <GalleryItem item={rowArg0} />
            ))}{' '}
          </>
        )}
      </figure>
    )
  }

  return (
    <div className={mergeClassName('grid *:[grid-area:1/1]', wrapperClassName)}>
      {as === 'div' ? (
        <div {...rest} className={galleryClassName}>
          {normalizedItems.map((rowArg0: any, rowIndex: number) => (
            <GalleryItem item={rowArg0} />
          ))}
        </div>
      ) : (
        <figure {...rest} className={galleryClassName}>
          {normalizedItems.map((rowArg0: any, rowIndex: number) => (
            <GalleryItem item={rowArg0} />
          ))}
        </figure>
      )}
      <div
        className={mergeClassName(
          'pointer-events-none grid font-mono text-white text-shadow-lg',
          guideClassName,
        )}
        style={{ gridTemplateColumns: guideGridTemplateColumns }}
        aria-hidden="true"
      >
        {readGuideItems().map(item => (
          <div key={item.key} className={item.className}>
            {String(item.text)}
          </div>
        ))}
      </div>
    </div>
  )
}

/** 默认导出悬停画廊组件。 */
export default HoverGallery

const GalleryItem: FC<{ item: NormalizedGalleryItem }> = ({ item }) =>
  item.type === 'image' ? (
    <img src={item.src} alt={item.alt ?? ''} className={item.className} />
  ) : (
    <span style={{ display: 'contents' }}>{String(item.text ?? '')}</span>
  )
