/*
Accordion 组件概述
- 数据驱动：支持 items 配置与 children 组合两种写法。
- 状态模型：支持单开、多开、受控与非受控，并兼容原有 open / force 语义。
- 复合能力：items 可直接表达 description / extra / disabled，Title / Content 仍可单独组合。
*/
import type { FC } from '@rue-js/rue'
import { ref, onMounted, onUnmounted } from '@rue-js/rue'

let accordionNameSeed = 0
const radioGroups = new Map<string, Set<(source: object) => void>>()

/** AccordionIcon 类型。 */
export type AccordionIcon = 'arrow' | 'plus'
/** AccordionForce 类型。 */
export type AccordionForce = 'open' | 'close'
/** AccordionUse 类型。 */
export type AccordionUse = 'radio' | 'details'
/** AccordionItemKey 标识键类型。 */
export type AccordionItemKey = string | number

/** AccordionDataItem 数据项结构。 */
export interface AccordionDataItem {
  /** 数据项唯一标识。 */
  key?: AccordionItemKey
  /** 标题内容。 */
  title?: any
  /** 描述内容。 */
  description?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** 主体内容。 */
  content?: any
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** descriptionClassName 附加类名。 */
  descriptionClassName?: string
  /** extraClassName 附加类名。 */
  extraClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** 图标内容。 */
  icon?: AccordionIcon
  /** force 配置项。 */
  force?: AccordionForce
  /** use 配置项。 */
  use?: AccordionUse
  /** 受控打开状态。 */
  open?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
}

/** AccordionChangeContext 事件或渲染上下文。 */
export interface AccordionChangeContext {
  /** 数据项唯一标识。 */
  key: AccordionItemKey
  /** index 配置项。 */
  index: number
  /** 受控打开状态。 */
  open: boolean
  /** item 区域配置。 */
  item?: AccordionDataItem
}

/** AccordionProps 组件属性。 */
export interface AccordionProps {
  /** 图标内容。 */
  icon?: AccordionIcon
  /** force 配置项。 */
  force?: AccordionForce
  /** use 配置项。 */
  use?: AccordionUse
  /** 表单 name 属性或分组名称。 */
  name?: string
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** activeKey 标识键。 */
  activeKey?: AccordionItemKey | null
  /** defaultActiveKey 标识键。 */
  defaultActiveKey?: AccordionItemKey | null
  /** openKeys 标识键集合。 */
  openKeys?: ReadonlyArray<AccordionItemKey>
  /** defaultOpenKeys 标识键集合。 */
  defaultOpenKeys?: ReadonlyArray<AccordionItemKey>
  /** multiple 配置项。 */
  multiple?: boolean
  /** collapsible 配置项。 */
  collapsible?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<AccordionDataItem>
  /** 值或状态变化时触发的回调。 */
  onChange?: (
    nextValue: AccordionItemKey | ReadonlyArray<AccordionItemKey> | null,
    context: AccordionChangeContext,
  ) => void
  /** onToggle 事件回调。 */
  onToggle?: (open: boolean, context: AccordionChangeContext) => void
}

interface NormalizedAccordionItem extends AccordionDataItem {
  key: AccordionItemKey
  index: number
}

interface AccordionPartProps {
  className?: string
  children?: any
  as?: 'div' | 'summary' | 'button'
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (!base) return className ?? ''
  return className ? `${base} ${className}` : base
}

/** unique Keys 的内部工具函数。 */
const uniqueKeys = (keys: ReadonlyArray<AccordionItemKey>) => {
  const next: AccordionItemKey[] = []
  keys.forEach(key => {
    if (!next.some(current => current === key)) {
      next.push(key)
    }
  })
  return next
}

/** 归一化 Open Keys 的内部工具函数。 */
const normalizeOpenKeys = (
  keys: ReadonlyArray<AccordionItemKey> | null | undefined,
  multiple?: boolean,
) => {
  const normalized = uniqueKeys(Array.isArray(keys) ? keys : [])
  return multiple ? normalized : normalized.slice(0, 1)
}

/** key To Array 的内部工具函数。 */
const keyToArray = (key: AccordionItemKey | null | undefined) => {
  return key == null ? [] : [key]
}

/** 判断 Keys 是否相同的内部工具函数。 */
const isSameKeyList = (
  left: ReadonlyArray<AccordionItemKey>,
  right: ReadonlyArray<AccordionItemKey>,
) => {
  if (left.length !== right.length) return false
  return left.every((key, index) => key === right[index])
}

/** 解析 Initial Group Open Keys 的内部工具函数。 */
const resolveInitialGroupOpenKeys = (
  normalizedItems: ReadonlyArray<NormalizedAccordionItem>,
  activeKey: AccordionItemKey | null | undefined,
  defaultActiveKey: AccordionItemKey | null | undefined,
  openKeys: ReadonlyArray<AccordionItemKey> | undefined,
  defaultOpenKeys: ReadonlyArray<AccordionItemKey> | undefined,
  multiple?: boolean,
) => {
  if (openKeys !== undefined) return normalizeOpenKeys(openKeys, multiple)
  if (activeKey !== undefined) return normalizeOpenKeys(keyToArray(activeKey), multiple)
  if (defaultOpenKeys !== undefined) return normalizeOpenKeys(defaultOpenKeys, multiple)
  if (defaultActiveKey !== undefined)
    return normalizeOpenKeys(keyToArray(defaultActiveKey), multiple)
  return normalizeOpenKeys(
    normalizedItems.filter(item => item.open).map(item => item.key),
    multiple,
  )
}

/** 解析 Initial Single Open 的内部工具函数。 */
const resolveInitialSingleOpen = (
  open: boolean | undefined,
  defaultOpen: boolean | undefined,
  force: AccordionForce | undefined,
) => {
  if (force === 'open') return true
  if (force === 'close') return false
  if (typeof open === 'boolean') return open
  if (typeof defaultOpen === 'boolean') return defaultOpen
  return false
}

/** 读取 State Class 的内部工具函数。 */
const getStateClass = (open: boolean, force: AccordionForce | undefined) => {
  if (force === 'open') return 'collapse-open'
  if (force === 'close') return 'collapse-close'
  return open ? 'collapse-open' : 'collapse-close'
}

/** 读取 Accordion Group Roots 的内部工具函数。 */

/** 读取 Direct Accordion Input 的内部工具函数。 */

/** 读取 Direct Accordion Title 的内部工具函数。 */

/** sync Accordion Panel Visual State 的内部工具函数。 */

/** 构建 Group Next Keys 的内部工具函数。 */
const buildGroupNextKeys = (
  currentKeys: ReadonlyArray<AccordionItemKey>,
  key: AccordionItemKey,
  shouldOpen: boolean,
  multiple?: boolean,
  collapsible?: boolean,
) => {
  if (multiple) {
    if (shouldOpen) {
      return uniqueKeys([...currentKeys, key])
    }
    return currentKeys.filter(current => current !== key)
  }

  if (shouldOpen) {
    return [key]
  }

  if (collapsible) {
    return []
  }

  return currentKeys.some(current => current === key) ? [...currentKeys] : [key]
}

/** 判断 Radio Input 的内部工具函数。 */
const isRadioInput = (input: HTMLInputElement | null | undefined) => input?.type === 'radio'

/** 渲染 Header Body 的内部工具函数。 */
const RenderHeaderBody = ({ arg0: item }: { arg0: AccordionDataItem }) => {
  if (item.description == null && item.extra == null) {
    return <>{item.title}</>
  }

  return (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div>{item.title}</div>
        {item.description != null ? (
          <div className={appendClassName('mt-1 text-xs opacity-70', item.descriptionClassName)}>
            {item.description}
          </div>
        ) : null}
      </div>
      {item.extra != null ? (
        <div className={appendClassName('shrink-0 text-xs opacity-70', item.extraClassName)}>
          {item.extra}
        </div>
      ) : null}
    </div>
  )
}

/** 手风琴组件：统一归一化 items 与 children 两种模式的开合状态。 */
const Accordion: FC<AccordionProps> = ({
  icon,
  force,
  use = 'radio',
  name,
  open,
  defaultOpen,
  activeKey,
  defaultActiveKey,
  openKeys,
  defaultOpenKeys,
  multiple,
  collapsible,
  disabled,
  className,
  titleClassName,
  contentClassName,
  children,
  items,
  onChange,
  onToggle,
}) => {
  const normalizedItems: NormalizedAccordionItem[] =
    items?.map((item, index) => ({
      ...item,
      key: item.key ?? index,
      index,
    })) ?? []
  const generatedName = `rue-accordion-${accordionNameSeed++}`
  const uncontrolledSingleOpen = ref(resolveInitialSingleOpen(open, defaultOpen, force))
  const uncontrolledGroupOpenKeys = ref(
    resolveInitialGroupOpenKeys(
      normalizedItems,
      activeKey,
      defaultActiveKey,
      openKeys,
      defaultOpenKeys,
      multiple,
    ),
  )
  const groupName = name ?? generatedName
  const groupMember = {}
  onMounted(() => {
    const members = radioGroups.get(groupName) ?? new Set<(source: object) => void>()
    const closeSibling = (source: object) => {
      if (source !== groupMember && open === undefined && !force)
        uncontrolledSingleOpen.value = false
    }
    members.add(closeSibling)
    radioGroups.set(groupName, members)
    onUnmounted(() => {
      members.delete(closeSibling)
      if (!members.size) radioGroups.delete(groupName)
    })
  })
  const hasItems = normalizedItems.length > 0
  const isGroupControlled = openKeys !== undefined || activeKey !== undefined
  const getCurrentSingleOpen = () => {
    if (force === 'open') return true
    if (force === 'close') return false
    if (open !== undefined) return !!open
    return uncontrolledSingleOpen.value
  }

  const getCurrentGroupOpenKeys = () => {
    if (openKeys !== undefined) return normalizeOpenKeys(openKeys, multiple)
    if (activeKey !== undefined) return normalizeOpenKeys(keyToArray(activeKey), multiple)
    return uncontrolledGroupOpenKeys.value
  }

  const getItemOpen = (item: NormalizedAccordionItem) => {
    const itemForce = item.force ?? force
    if (itemForce === 'open') return true
    if (itemForce === 'close') return false
    return getCurrentGroupOpenKeys().some(key => key === item.key)
  }

  const buildItemClassName = (item: NormalizedAccordionItem) => {
    const itemIcon = item.icon ?? icon
    const itemForce = item.force ?? force
    let itemClassName = appendClassName('collapse', getStateClass(getItemOpen(item), itemForce))
    if (itemIcon === 'arrow') itemClassName += ' collapse-arrow'
    if (itemIcon === 'plus') itemClassName += ' collapse-plus'
    if (className) itemClassName += ` ${className}`
    if (item.className) itemClassName += ` ${item.className}`
    if (disabled || item.disabled) itemClassName += ' opacity-70'
    return itemClassName
  }

  const buildWrapperClassName = () => {
    let wrapperClassName = appendClassName('collapse', getStateClass(getCurrentSingleOpen(), force))
    if (icon === 'arrow') wrapperClassName += ' collapse-arrow'
    if (icon === 'plus') wrapperClassName += ' collapse-plus'
    if (className) wrapperClassName += ` ${className}`
    if (disabled) wrapperClassName += ' opacity-70'
    return wrapperClassName
  }

  const buildStaticWrapperClassName = () => {
    let wrapperClassName = 'collapse'
    if (icon === 'arrow') wrapperClassName += ' collapse-arrow'
    if (icon === 'plus') wrapperClassName += ' collapse-plus'
    if (className) wrapperClassName += ` ${className}`
    if (disabled) wrapperClassName += ' opacity-70'
    return wrapperClassName
  }

  const commitGroupChange = (
    item: NormalizedAccordionItem,
    shouldOpen: boolean,
    source?: Element | null,
  ) => {
    const resolvedForce = item.force ?? force
    if (disabled || item.disabled || resolvedForce) return

    const nextOpenKeys = buildGroupNextKeys(
      getCurrentGroupOpenKeys(),
      item.key,
      shouldOpen,
      multiple,
      collapsible,
    )
    const itemOpen = nextOpenKeys.some(key => key === item.key)

    if (!isGroupControlled) {
      if (!isSameKeyList(uncontrolledGroupOpenKeys.value, nextOpenKeys)) {
        uncontrolledGroupOpenKeys.value = nextOpenKeys
      }
    }

    if (onChange) {
      onChange(multiple ? nextOpenKeys : (nextOpenKeys[0] ?? null), {
        key: item.key,
        index: item.index,
        open: itemOpen,
        item,
      })
    }
  }

  const commitSingleChange = (shouldOpen: boolean, source?: Element | null) => {
    if (disabled || force) return
    if (open === undefined) {
      if (uncontrolledSingleOpen.value !== shouldOpen) {
        uncontrolledSingleOpen.value = shouldOpen
      }
    }
    if (shouldOpen) radioGroups.get(groupName)?.forEach(closeSibling => closeSibling(groupMember))
    if (onToggle) {
      onToggle(shouldOpen, {
        key: groupName,
        index: 0,
        open: shouldOpen,
      })
    }
  }

  if (hasItems) {
    return (
      <>
        {normalizedItems.map(item => {
          const itemUse = item.use ?? use
          const itemIcon = item.icon ?? icon
          const itemForce = item.force ?? force
          const arrowAlignClassName =
            itemIcon === 'arrow' && (item.description != null || item.extra != null)
              ? 'after:top-6'
              : undefined
          const mergedTitleClassName = appendClassName(
            appendClassName('collapse-title', titleClassName),
            appendClassName(item.titleClassName, arrowAlignClassName),
          )
          const mergedContentClassName = appendClassName(
            appendClassName('collapse-content', contentClassName),
            item.contentClassName,
          )

          if (itemUse === 'details') {
            return (
              <details
                className={buildItemClassName(item)}
                open={getItemOpen(item) ? true : undefined}
                key={item.key}
                data-rue-accordion-group={groupName}
                data-rue-accordion-index={String(item.index)}
                data-rue-accordion-force={itemForce}
              >
                <summary
                  className={mergedTitleClassName}
                  aria-expanded={getItemOpen(item) ? 'true' : 'false'}
                  onClick={(event: MouseEvent) => {
                    event.preventDefault()
                    commitGroupChange(item, !getItemOpen(item), event.currentTarget as Element)
                  }}
                >
                  <RenderHeaderBody arg0={item} />
                </summary>
                <div className={mergedContentClassName}>{item.content}</div>
              </details>
            )
          }

          const inputType = multiple ? 'checkbox' : 'radio'

          return (
            <div
              className={buildItemClassName(item)}
              key={item.key}
              data-rue-accordion-group={groupName}
              data-rue-accordion-index={String(item.index)}
              data-rue-accordion-force={itemForce}
            >
              <input
                type={inputType}
                name={inputType === 'radio' ? groupName : undefined}
                checked={getItemOpen(item)}
                disabled={disabled || item.disabled || !!itemForce}
                onClick={(event: MouseEvent) => {
                  const input = event.currentTarget as HTMLInputElement
                  if (!collapsible || !getItemOpen(item) || !isRadioInput(input)) return

                  event.preventDefault()
                  input.checked = false
                  commitGroupChange(item, false, input)
                }}
                onChange={(event: Event) => {
                  const nextOpen = (event.target as HTMLInputElement).checked
                  commitGroupChange(item, nextOpen, event.currentTarget as Element)
                }}
              />
              <div
                className={mergedTitleClassName}
                aria-expanded={getItemOpen(item) ? 'true' : 'false'}
              >
                <RenderHeaderBody arg0={item} />
              </div>
              <div className={mergedContentClassName}>{item.content}</div>
            </div>
          )
        })}
      </>
    )
  }

  if (use === 'details') {
    const isSingleControlled = open !== undefined || force !== undefined
    const initialDetailsOpen = resolveInitialSingleOpen(open, defaultOpen, force)
    return (
      <details
        className={isSingleControlled ? buildWrapperClassName() : buildStaticWrapperClassName()}
        name={groupName}
        open={(isSingleControlled ? getCurrentSingleOpen() : initialDetailsOpen) ? true : undefined}
        data-rue-accordion-group={groupName}
        data-rue-accordion-force={force}
        onToggle={(event: Event) => {
          const target = event.currentTarget as HTMLDetailsElement
          const nextOpen = target.open
          if (disabled || force || open !== undefined) {
            const expectedOpen = getCurrentSingleOpen()
            if (target.open !== expectedOpen) target.open = expectedOpen
            if (onToggle) {
              onToggle(expectedOpen, {
                key: groupName,
                index: 0,
                open: expectedOpen,
              })
            }
            return
          }
          if (onToggle) {
            onToggle(nextOpen, {
              key: groupName,
              index: 0,
              open: nextOpen,
            })
          }
        }}
      >
        {children}
      </details>
    )
  }

  const singleInputType = 'radio'

  return (
    <div
      className={buildWrapperClassName()}
      data-rue-accordion-group={groupName}
      data-rue-accordion-force={force}
    >
      <input
        type={singleInputType}
        name={singleInputType === 'radio' ? groupName : undefined}
        checked={getCurrentSingleOpen()}
        disabled={disabled || !!force}
        onClick={(event: MouseEvent) => {
          const input = event.currentTarget as HTMLInputElement
          if (!collapsible || !getCurrentSingleOpen() || !isRadioInput(input)) return

          event.preventDefault()
          input.checked = false
          commitSingleChange(false, input)
        }}
        onChange={(event: Event) => {
          const nextOpen = (event.target as HTMLInputElement).checked
          commitSingleChange(nextOpen, event.currentTarget as Element)
        }}
      />
      {children}
    </div>
  )
}

/** 标题子组件：兼容 div / summary / button 三种标题容器。 */
const Title: FC<AccordionPartProps> = ({ className, children, as = 'div' }) => {
  const mergedClassName = appendClassName('collapse-title', className)
  if (as === 'summary') {
    return <summary className={mergedClassName}>{children}</summary>
  }
  if (as === 'button') {
    return (
      <button type="button" className={mergedClassName}>
        {children}
      </button>
    )
  }
  return <div className={mergedClassName}>{children}</div>
}

/** 内容子组件：统一输出 collapse-content，便于 children 模式复用。 */
const Content: FC<AccordionPartProps> = ({ className, children }) => {
  return <div className={appendClassName('collapse-content', className)}>{children}</div>
}

type AccordionCompound = FC<AccordionProps> & {
  Title: FC<AccordionPartProps>
  Content: FC<AccordionPartProps>
}

const AccordionCompound: AccordionCompound = /*#__PURE__*/ Object.assign(Accordion, {
  Title,
  Content,
})

/** 默认导出手风琴组件。 */
export default AccordionCompound
