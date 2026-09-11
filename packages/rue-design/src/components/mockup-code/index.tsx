/*
MockupCode 模块概述
- 汇总代码样机组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'

/** MockupCodeTone 语义色类型。 */
export type MockupCodeTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** MockupCodeLineData 数据项结构。 */
export interface MockupCodeLineData {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 前缀内容。 */
  prefix?: any
  /** code 配置项。 */
  code?: any
  /** 组件子内容。 */
  children?: any
  /** 根节点附加类名。 */
  className?: string
  /** codeClassName 附加类名。 */
  codeClassName?: string
  /** highlight 配置项。 */
  highlight?: boolean
  /** 组件语义色调。 */
  tone?: MockupCodeTone
}

/** MockupCodeProps 组件属性。 */
export interface MockupCodeProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<MockupCodeLineData>
  /** 前缀内容。 */
  prefix?: any
  /** lineNumbers 配置项。 */
  lineNumbers?: boolean
  /** start 配置项。 */
  start?: number
  /** codeClassName 附加类名。 */
  codeClassName?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MockupCodeLineProps 组件属性。 */
export interface MockupCodeLineProps extends Omit<MockupCodeLineData, 'key'> {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** lineNumber 配置项。 */
  lineNumber?: number | string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** join Class Name 的内部工具函数。 */
const joinClassName = (...values: Array<string | undefined | false>) =>
  values.filter(Boolean).join(' ')

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 判断是否存在 Content 的内部工具函数。 */
const hasContent = (value: any): boolean => {
  if (Array.isArray(value)) {
    return value.some(item => hasContent(item))
  }
  return value !== undefined && value !== null && value !== false
}

/** 解析 Tone Class Name 的内部工具函数。 */
const resolveToneClassName = (tone?: MockupCodeTone, highlight?: boolean) => {
  if (!tone && !highlight) return undefined

  if (highlight) {
    switch (tone) {
      case 'neutral':
        return 'bg-neutral text-neutral-content'
      case 'primary':
        return 'bg-primary text-primary-content'
      case 'secondary':
        return 'bg-secondary text-secondary-content'
      case 'accent':
        return 'bg-accent text-accent-content'
      case 'info':
        return 'bg-info text-info-content'
      case 'success':
        return 'bg-success text-success-content'
      case 'warning':
        return 'bg-warning text-warning-content'
      case 'error':
        return 'bg-error text-error-content'
      default:
        return 'bg-base-200'
    }
  }

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

/** 生成单行通用属性的内部工具函数。 */
const createLineProps = ({
  rest,
  resolvedPrefix,
  tone,
  highlight,
  className,
}: {
  rest: Record<string, any>
  resolvedPrefix: any
  tone?: MockupCodeTone
  highlight?: boolean
  className?: string
}) => ({
  ...rest,
  'data-prefix': resolvedPrefix == null ? undefined : String(resolvedPrefix),
  className: joinClassName(resolveToneClassName(tone, highlight), className),
})

/** 生成根节点通用属性的内部工具函数。 */
const createRootProps = ({
  rest,
  className,
}: {
  rest: Record<string, any>
  className?: string
}) => ({
  ...rest,
  className: mergeClassName('mockup-code', className),
})

/** 渲染数据驱动代码行的内部工具函数。 */
const RenderMockupCodeItem = ({
  arg0: item,
  arg1: index,
  arg2: prefix,
  arg3: lineNumbers,
  arg4: start,
  arg5: codeClassName,
}: {
  arg0: MockupCodeLineData
  arg1: number
  arg2: any
  arg3: boolean | undefined
  arg4: number
  arg5: string | undefined
}) => {
  return (
    <Line
      key={item.key ?? index}
      {...item}
      prefix={hasContent(item.prefix) ? item.prefix : prefix}
      lineNumber={lineNumbers ? start + index : undefined}
      codeClassName={item.codeClassName ?? codeClassName}
    />
  )
}

/** Line 的内部工具函数。 */
const Line: FC<MockupCodeLineProps> = ({
  as = 'pre',
  prefix,
  lineNumber,
  code: lineCode,
  children,
  className,
  codeClassName,
  highlight,
  tone,
  ...rest
}) => {
  const lineProps = () =>
    createLineProps({
      rest,
      resolvedPrefix: hasContent(prefix) ? prefix : lineNumber,
      tone,
      highlight,
      className,
    })
  const hasChildren = () => hasContent(children)
  const hasLineCode = () => hasContent(lineCode)

  if (as === 'div') {
    return (
      <div {...lineProps()}>
        {hasChildren() ? (
          children
        ) : hasLineCode() ? (
          <code className={codeClassName}>{lineCode}</code>
        ) : null}
      </div>
    )
  }

  if (as === 'li') {
    return (
      <li {...lineProps()}>
        {hasChildren() ? (
          children
        ) : hasLineCode() ? (
          <code className={codeClassName}>{lineCode}</code>
        ) : null}
      </li>
    )
  }

  if (typeof as === 'function') {
    const Component = as as any
    return Component === 'div' ? (
      <div {...lineProps()}>
        {hasChildren() ? (
          children
        ) : hasLineCode() ? (
          <code className={codeClassName}>{lineCode}</code>
        ) : null}
      </div>
    ) : Component === 'span' ? (
      <span {...lineProps()}>
        {hasChildren() ? (
          children
        ) : hasLineCode() ? (
          <code className={codeClassName}>{lineCode}</code>
        ) : null}
      </span>
    ) : Component === 'pre' ? (
      <pre {...lineProps()}>
        {hasChildren() ? (
          children
        ) : hasLineCode() ? (
          <code className={codeClassName}>{lineCode}</code>
        ) : null}
      </pre>
    ) : Component === 'li' ? (
      <li {...lineProps()}>
        {hasChildren() ? (
          children
        ) : hasLineCode() ? (
          <code className={codeClassName}>{lineCode}</code>
        ) : null}
      </li>
    ) : Component === 'section' ? (
      <section {...lineProps()}>
        {hasChildren() ? (
          children
        ) : hasLineCode() ? (
          <code className={codeClassName}>{lineCode}</code>
        ) : null}
      </section>
    ) : Component === 'article' ? (
      <article {...lineProps()}>
        {hasChildren() ? (
          children
        ) : hasLineCode() ? (
          <code className={codeClassName}>{lineCode}</code>
        ) : null}
      </article>
    ) : (
      <></>
    )
  }

  return (
    <pre {...lineProps()}>
      {hasChildren() ? (
        children
      ) : hasLineCode() ? (
        <code className={codeClassName}>{lineCode}</code>
      ) : null}
    </pre>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<MockupCodeProps> = ({
  as = 'div',
  className,
  children,
  items,
  prefix,
  lineNumbers,
  start = 1,
  codeClassName,
  ...rest
}) => {
  const rootProps = () => createRootProps({ rest, className })

  if (as === 'section') {
    return (
      <section {...rootProps()}>
        {(items ?? []).map((item, index) => (
          <RenderMockupCodeItem
            arg0={item}
            arg1={index}
            arg2={prefix}
            arg3={lineNumbers}
            arg4={start}
            arg5={codeClassName}
          />
        ))}
        {children}
      </section>
    )
  }

  if (as === 'article') {
    return (
      <article {...rootProps()}>
        {(items ?? []).map((item, index) => (
          <RenderMockupCodeItem
            arg0={item}
            arg1={index}
            arg2={prefix}
            arg3={lineNumbers}
            arg4={start}
            arg5={codeClassName}
          />
        ))}
        {children}
      </article>
    )
  }

  if (typeof as === 'function') {
    const Component = as as any
    return Component === 'div' ? (
      <div {...rootProps()}>
        {(items ?? []).map((item, index) => (
          <RenderMockupCodeItem
            arg0={item}
            arg1={index}
            arg2={prefix}
            arg3={lineNumbers}
            arg4={start}
            arg5={codeClassName}
          />
        ))}
        {children}
      </div>
    ) : Component === 'span' ? (
      <span {...rootProps()}>
        {(items ?? []).map((item, index) => (
          <RenderMockupCodeItem
            arg0={item}
            arg1={index}
            arg2={prefix}
            arg3={lineNumbers}
            arg4={start}
            arg5={codeClassName}
          />
        ))}
        {children}
      </span>
    ) : Component === 'pre' ? (
      <pre {...rootProps()}>
        {(items ?? []).map((item, index) => (
          <RenderMockupCodeItem
            arg0={item}
            arg1={index}
            arg2={prefix}
            arg3={lineNumbers}
            arg4={start}
            arg5={codeClassName}
          />
        ))}
        {children}
      </pre>
    ) : Component === 'li' ? (
      <li {...rootProps()}>
        {(items ?? []).map((item, index) => (
          <RenderMockupCodeItem
            arg0={item}
            arg1={index}
            arg2={prefix}
            arg3={lineNumbers}
            arg4={start}
            arg5={codeClassName}
          />
        ))}
        {children}
      </li>
    ) : Component === 'section' ? (
      <section {...rootProps()}>
        {(items ?? []).map((item, index) => (
          <RenderMockupCodeItem
            arg0={item}
            arg1={index}
            arg2={prefix}
            arg3={lineNumbers}
            arg4={start}
            arg5={codeClassName}
          />
        ))}
        {children}
      </section>
    ) : Component === 'article' ? (
      <article {...rootProps()}>
        {(items ?? []).map((item, index) => (
          <RenderMockupCodeItem
            arg0={item}
            arg1={index}
            arg2={prefix}
            arg3={lineNumbers}
            arg4={start}
            arg5={codeClassName}
          />
        ))}
        {children}
      </article>
    ) : (
      <></>
    )
  }

  return (
    <div {...rootProps()}>
      {(items ?? []).map((item, index) => (
        <RenderMockupCodeItem
          arg0={item}
          arg1={index}
          arg2={prefix}
          arg3={lineNumbers}
          arg4={start}
          arg5={codeClassName}
        />
      ))}
      {children}
    </div>
  )
}

type MockupCodeCompound = FC<MockupCodeProps> & {
  Line: FC<MockupCodeLineProps>
}

const MockupCode: MockupCodeCompound = /*#__PURE__*/ Object.assign(Root, {
  Line,
})

/** 默认导出代码样机组件。 */
export default MockupCode
