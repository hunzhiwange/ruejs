/*
Footer 组件概述
- 保留原有 `children + className` 直出方式，继续兼容 daisyUI 风格拼装。
- 新增结构化 `brand + sections` 模式，便于更清晰地组织品牌区、链接列与自定义内容。
*/
import type { FC } from '@rue-js/rue'

/** FooterDirection 位置或方向类型。 */
export type FooterDirection = 'vertical' | 'horizontal'

/** FooterLinkProps 组件属性。 */
export interface FooterLinkProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 主体内容。 */
  content?: any
  /** 链接地址。 */
  href?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** hover 配置项。 */
  hover?: boolean
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FooterItem 数据项结构。 */
export interface FooterItem extends Omit<FooterLinkProps, 'content'> {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 展示标签。 */
  label?: any
  /** 主体内容。 */
  content?: any
}

/** FooterTitleProps 组件属性。 */
export interface FooterTitleProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 主体内容。 */
  content?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FooterBrandProps 组件属性。 */
export interface FooterBrandProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 主体内容。 */
  content?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FooterSectionProps 组件属性。 */
export interface FooterSectionProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 标题内容。 */
  title?: any
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** 主体内容。 */
  content?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<FooterItem | any>
  /** inline 配置项。 */
  inline?: boolean
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FooterSection 接口。 */
export interface FooterSection extends Omit<FooterSectionProps, 'content'> {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 主体内容。 */
  content?: any
}

/** FooterProps 组件属性。 */
export interface FooterProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 布局方向。 */
  direction?: FooterDirection
  /** center 配置项。 */
  center?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** brand 配置项。 */
  brand?: any
  /** sections 配置项。 */
  sections?: ReadonlyArray<FooterSection>
  /** wrap 配置项。 */
  wrap?: boolean
  /** bordered 配置项。 */
  bordered?: boolean
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** join Class Name 的内部工具函数。 */
const joinClassName = (...values: Array<string | undefined | false>) =>
  values.filter(Boolean).join(' ')

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** Title 的内部工具函数。 */
const Title: FC<FooterTitleProps> = ({ as = 'h6', className, children, content, ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div {...rest} className={joinClassName('footer-title', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={joinClassName('footer-title', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </span>
  ) : Component === 'h6' ? (
    <h6 {...rest} className={joinClassName('footer-title', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </h6>
  ) : Component === 'a' ? (
    <a {...rest} className={joinClassName('footer-title', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </a>
  ) : Component === 'button' ? (
    <button {...rest} className={joinClassName('footer-title', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </button>
  ) : Component === 'label' ? (
    <label {...rest} className={joinClassName('footer-title', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </label>
  ) : Component === 'aside' ? (
    <aside {...rest} className={joinClassName('footer-title', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </aside>
  ) : Component === 'nav' ? (
    <nav {...rest} className={joinClassName('footer-title', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </nav>
  ) : Component === 'footer' ? (
    <footer {...rest} className={joinClassName('footer-title', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </footer>
  ) : (
    <></>
  )
}

/** Link 的内部工具函数。 */
const Link: FC<FooterLinkProps> = ({
  as,
  className,
  children,
  content,
  href,
  target,
  rel,
  hover = true,
  ...rest
}) => {
  const Component = (as ?? (href ? 'a' : 'button')) as any
  const anchorRel = target === '_blank' && !rel ? 'noreferrer' : rel

  if (Component === 'a') {
    return (
      <a
        {...rest}
        href={href}
        target={target}
        rel={anchorRel}
        className={joinClassName('link', hover && 'link-hover', className)}
      >
        {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
      </a>
    )
  }

  if (Component === 'button') {
    return (
      <button
        {...rest}
        type={rest.type ?? 'button'}
        className={joinClassName('link', hover && 'link-hover', className)}
      >
        {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
      </button>
    )
  }

  return Component === 'div' ? (
    <div {...rest} className={joinClassName('link', hover && 'link-hover', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={joinClassName('link', hover && 'link-hover', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </span>
  ) : Component === 'h6' ? (
    <h6 {...rest} className={joinClassName('link', hover && 'link-hover', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </h6>
  ) : Component === 'a' ? (
    <a {...rest} className={joinClassName('link', hover && 'link-hover', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </a>
  ) : Component === 'button' ? (
    <button {...rest} className={joinClassName('link', hover && 'link-hover', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </button>
  ) : Component === 'label' ? (
    <label {...rest} className={joinClassName('link', hover && 'link-hover', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </label>
  ) : Component === 'aside' ? (
    <aside {...rest} className={joinClassName('link', hover && 'link-hover', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </aside>
  ) : Component === 'nav' ? (
    <nav {...rest} className={joinClassName('link', hover && 'link-hover', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </nav>
  ) : Component === 'footer' ? (
    <footer {...rest} className={joinClassName('link', hover && 'link-hover', className)}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </footer>
  ) : (
    <></>
  )
}

/** 判断 Footer Item Config 的内部工具函数。 */
const isFooterItemConfig = (value: any): value is FooterItem => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return (
    'label' in value ||
    'content' in value ||
    'children' in value ||
    'href' in value ||
    'target' in value ||
    'rel' in value ||
    'as' in value ||
    'className' in value ||
    'hover' in value
  )
}

/** 渲染 Footer Item 的内部工具函数。 */
const RenderFooterItem = ({
  arg0: item,
  arg1: index,
}: {
  arg0: FooterItem | any
  arg1: number
}) => {
  if (!hasRenderableContent(item)) return <></>

  if (isFooterItemConfig(item)) {
    const { key, label, content, children, ...rest } = item
    return <Link {...rest} content={content ?? label} />
  }

  return <Link content={item} />
}

/** Brand 的内部工具函数。 */
const Brand: FC<FooterBrandProps> = ({ as = 'aside', className, children, content, ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div {...rest} className={className}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={className}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </span>
  ) : Component === 'h6' ? (
    <h6 {...rest} className={className}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </h6>
  ) : Component === 'a' ? (
    <a {...rest} className={className}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </a>
  ) : Component === 'button' ? (
    <button {...rest} className={className}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </button>
  ) : Component === 'label' ? (
    <label {...rest} className={className}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </label>
  ) : Component === 'aside' ? (
    <aside {...rest} className={className}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </aside>
  ) : Component === 'nav' ? (
    <nav {...rest} className={className}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </nav>
  ) : Component === 'footer' ? (
    <footer {...rest} className={className}>
      {content !== undefined ? <span>{String(content)}</span> : <>{children}</>}
    </footer>
  ) : (
    <></>
  )
}

/** Section 的内部工具函数。 */
const Section: FC<FooterSectionProps> = ({
  as = 'nav',
  className,
  children,
  title,
  titleClassName,
  content,
  items,
  inline,
  contentClassName,
  ...rest
}) => {
  const Component = as as any
  const hasCustomContent = hasRenderableContent(content) || hasRenderableContent(children)

  return Component === 'div' ? (
    <div {...rest} className={className}>
      {hasRenderableContent(title) ? <Title className={titleClassName} content={title} /> : null}
      {hasCustomContent ? (
        (content ?? children)
      ) : inline ? (
        <div className={joinClassName('grid grid-flow-col auto-cols-max gap-4', contentClassName)}>
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}
        </div>
      ) : (
        <>
          {' '}
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}{' '}
        </>
      )}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={className}>
      {hasRenderableContent(title) ? <Title className={titleClassName} content={title} /> : null}
      {hasCustomContent ? (
        (content ?? children)
      ) : inline ? (
        <div className={joinClassName('grid grid-flow-col auto-cols-max gap-4', contentClassName)}>
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}
        </div>
      ) : (
        <>
          {' '}
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}{' '}
        </>
      )}
    </span>
  ) : Component === 'h6' ? (
    <h6 {...rest} className={className}>
      {hasRenderableContent(title) ? <Title className={titleClassName} content={title} /> : null}
      {hasCustomContent ? (
        (content ?? children)
      ) : inline ? (
        <div className={joinClassName('grid grid-flow-col auto-cols-max gap-4', contentClassName)}>
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}
        </div>
      ) : (
        <>
          {' '}
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}{' '}
        </>
      )}
    </h6>
  ) : Component === 'a' ? (
    <a {...rest} className={className}>
      {hasRenderableContent(title) ? <Title className={titleClassName} content={title} /> : null}
      {hasCustomContent ? (
        (content ?? children)
      ) : inline ? (
        <div className={joinClassName('grid grid-flow-col auto-cols-max gap-4', contentClassName)}>
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}
        </div>
      ) : (
        <>
          {' '}
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}{' '}
        </>
      )}
    </a>
  ) : Component === 'button' ? (
    <button {...rest} className={className}>
      {hasRenderableContent(title) ? <Title className={titleClassName} content={title} /> : null}
      {hasCustomContent ? (
        (content ?? children)
      ) : inline ? (
        <div className={joinClassName('grid grid-flow-col auto-cols-max gap-4', contentClassName)}>
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}
        </div>
      ) : (
        <>
          {' '}
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}{' '}
        </>
      )}
    </button>
  ) : Component === 'label' ? (
    <label {...rest} className={className}>
      {hasRenderableContent(title) ? <Title className={titleClassName} content={title} /> : null}
      {hasCustomContent ? (
        (content ?? children)
      ) : inline ? (
        <div className={joinClassName('grid grid-flow-col auto-cols-max gap-4', contentClassName)}>
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}
        </div>
      ) : (
        <>
          {' '}
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}{' '}
        </>
      )}
    </label>
  ) : Component === 'aside' ? (
    <aside {...rest} className={className}>
      {hasRenderableContent(title) ? <Title className={titleClassName} content={title} /> : null}
      {hasCustomContent ? (
        (content ?? children)
      ) : inline ? (
        <div className={joinClassName('grid grid-flow-col auto-cols-max gap-4', contentClassName)}>
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}
        </div>
      ) : (
        <>
          {' '}
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}{' '}
        </>
      )}
    </aside>
  ) : Component === 'nav' ? (
    <nav {...rest} className={className}>
      {hasRenderableContent(title) ? <Title className={titleClassName} content={title} /> : null}
      {hasCustomContent ? (
        (content ?? children)
      ) : inline ? (
        <div className={joinClassName('grid grid-flow-col auto-cols-max gap-4', contentClassName)}>
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}
        </div>
      ) : (
        <>
          {' '}
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}{' '}
        </>
      )}
    </nav>
  ) : Component === 'footer' ? (
    <footer {...rest} className={className}>
      {hasRenderableContent(title) ? <Title className={titleClassName} content={title} /> : null}
      {hasCustomContent ? (
        (content ?? children)
      ) : inline ? (
        <div className={joinClassName('grid grid-flow-col auto-cols-max gap-4', contentClassName)}>
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}
        </div>
      ) : (
        <>
          {' '}
          {(items ?? []).map((item, index) => (
            <RenderFooterItem arg0={item} arg1={index} />
          ))}{' '}
        </>
      )}
    </footer>
  ) : (
    <></>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<FooterProps> = ({
  as = 'footer',
  direction,
  center,
  className,
  children,
  brand,
  sections,
  wrap,
  bordered,
  ...rest
}) => {
  const CompiledRow101 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const section = rowArg0
    const index = rowArg1

    const { key, ...sectionProps } = section
    return <Section {...sectionProps} />
  }

  const CompiledRow8 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const section = rowArg0
    const index = rowArg1

    const { key, ...sectionProps } = section
    return <Section {...sectionProps} />
  }

  const CompiledRow7 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const section = rowArg0
    const index = rowArg1

    const { key, ...sectionProps } = section
    return <Section {...sectionProps} />
  }

  const CompiledRow6 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const section = rowArg0
    const index = rowArg1

    const { key, ...sectionProps } = section
    return <Section {...sectionProps} />
  }

  const CompiledRow5 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const section = rowArg0
    const index = rowArg1

    const { key, ...sectionProps } = section
    return <Section {...sectionProps} />
  }

  const CompiledRow4 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const section = rowArg0
    const index = rowArg1

    const { key, ...sectionProps } = section
    return <Section {...sectionProps} />
  }

  const CompiledRow3 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const section = rowArg0
    const index = rowArg1

    const { key, ...sectionProps } = section
    return <Section {...sectionProps} />
  }

  const CompiledRow2 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const section = rowArg0
    const index = rowArg1

    const { key, ...sectionProps } = section
    return <Section {...sectionProps} />
  }

  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const section = rowArg0
    const index = rowArg1

    const { key, ...sectionProps } = section
    return <Section {...sectionProps} />
  }

  const Component = as as any
  const hasChildren = hasRenderableContent(children)
  const hasStructuredContent = hasRenderableContent(brand) || (sections?.length ?? 0) > 0

  return Component === 'div' ? (
    <div
      {...rest}
      className={joinClassName(
        'footer',
        direction && `footer-${direction}`,
        center && 'footer-center',
        wrap && 'gap-y-6',
        bordered && 'border-t border-base-300',
        className,
      )}
    >
      {hasChildren || !hasStructuredContent ? (
        children
      ) : (
        <>
          {hasRenderableContent(brand) ? <Brand content={brand} /> : null}
          {(sections ?? []).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </>
      )}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={joinClassName(
        'footer',
        direction && `footer-${direction}`,
        center && 'footer-center',
        wrap && 'gap-y-6',
        bordered && 'border-t border-base-300',
        className,
      )}
    >
      {hasChildren || !hasStructuredContent ? (
        children
      ) : (
        <>
          {hasRenderableContent(brand) ? <Brand content={brand} /> : null}
          {(sections ?? []).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow2 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </>
      )}
    </span>
  ) : Component === 'h6' ? (
    <h6
      {...rest}
      className={joinClassName(
        'footer',
        direction && `footer-${direction}`,
        center && 'footer-center',
        wrap && 'gap-y-6',
        bordered && 'border-t border-base-300',
        className,
      )}
    >
      {hasChildren || !hasStructuredContent ? (
        children
      ) : (
        <>
          {hasRenderableContent(brand) ? <Brand content={brand} /> : null}
          {(sections ?? []).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow3 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </>
      )}
    </h6>
  ) : Component === 'a' ? (
    <a
      {...rest}
      className={joinClassName(
        'footer',
        direction && `footer-${direction}`,
        center && 'footer-center',
        wrap && 'gap-y-6',
        bordered && 'border-t border-base-300',
        className,
      )}
    >
      {hasChildren || !hasStructuredContent ? (
        children
      ) : (
        <>
          {hasRenderableContent(brand) ? <Brand content={brand} /> : null}
          {(sections ?? []).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow4 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </>
      )}
    </a>
  ) : Component === 'button' ? (
    <button
      {...rest}
      className={joinClassName(
        'footer',
        direction && `footer-${direction}`,
        center && 'footer-center',
        wrap && 'gap-y-6',
        bordered && 'border-t border-base-300',
        className,
      )}
    >
      {hasChildren || !hasStructuredContent ? (
        children
      ) : (
        <>
          {hasRenderableContent(brand) ? <Brand content={brand} /> : null}
          {(sections ?? []).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow5 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </>
      )}
    </button>
  ) : Component === 'label' ? (
    <label
      {...rest}
      className={joinClassName(
        'footer',
        direction && `footer-${direction}`,
        center && 'footer-center',
        wrap && 'gap-y-6',
        bordered && 'border-t border-base-300',
        className,
      )}
    >
      {hasChildren || !hasStructuredContent ? (
        children
      ) : (
        <>
          {hasRenderableContent(brand) ? <Brand content={brand} /> : null}
          {(sections ?? []).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow6 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </>
      )}
    </label>
  ) : Component === 'aside' ? (
    <aside
      {...rest}
      className={joinClassName(
        'footer',
        direction && `footer-${direction}`,
        center && 'footer-center',
        wrap && 'gap-y-6',
        bordered && 'border-t border-base-300',
        className,
      )}
    >
      {hasChildren || !hasStructuredContent ? (
        children
      ) : (
        <>
          {hasRenderableContent(brand) ? <Brand content={brand} /> : null}
          {(sections ?? []).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow7 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </>
      )}
    </aside>
  ) : Component === 'nav' ? (
    <nav
      {...rest}
      className={joinClassName(
        'footer',
        direction && `footer-${direction}`,
        center && 'footer-center',
        wrap && 'gap-y-6',
        bordered && 'border-t border-base-300',
        className,
      )}
    >
      {hasChildren || !hasStructuredContent ? (
        children
      ) : (
        <>
          {hasRenderableContent(brand) ? <Brand content={brand} /> : null}
          {(sections ?? []).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow8 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </>
      )}
    </nav>
  ) : Component === 'footer' ? (
    <footer
      {...rest}
      className={joinClassName(
        'footer',
        direction && `footer-${direction}`,
        center && 'footer-center',
        wrap && 'gap-y-6',
        bordered && 'border-t border-base-300',
        className,
      )}
    >
      {hasChildren || !hasStructuredContent ? (
        children
      ) : (
        <>
          {hasRenderableContent(brand) ? <Brand content={brand} /> : null}
          {(sections ?? []).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow101 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </>
      )}
    </footer>
  ) : (
    <></>
  )
}

type FooterCompound = FC<FooterProps> & {
  Brand: FC<FooterBrandProps>
  Section: FC<FooterSectionProps>
  Title: FC<FooterTitleProps>
  Link: FC<FooterLinkProps>
}

const Footer: FooterCompound = /*#__PURE__*/ Object.assign(Root, {
  Brand,
  Section,
  Title,
  Link,
})

/** 默认导出页脚组件。 */
export default Footer
