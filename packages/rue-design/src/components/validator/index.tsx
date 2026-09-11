/*
Validator 组件概述
- 保留 daisyUI validator / validator-hint 的原生浏览器校验体验。
- 新增 appearance / size / status 语义层，减少手写宿主类名的负担。
- 提供 Field 组合件，统一 label、hint、extra 的常见表单结构。
*/
import type { FC } from '@rue-js/rue'

/** ValidatorHost 类型。 */
export type ValidatorHost = 'input' | 'select' | 'textarea'
/** ValidatorAppearance 类型。 */
export type ValidatorAppearance = 'input' | 'select' | 'textarea' | 'checkbox' | 'toggle'
/** ValidatorHintHost 类型。 */
export type ValidatorHintHost = 'div' | 'p' | 'span'
/** ValidatorFieldHost 类型。 */
export type ValidatorFieldHost = 'div' | 'fieldset'
/** ValidatorSize 尺寸类型。 */
export type ValidatorSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
/** ValidatorStatus 状态类型。 */
export type ValidatorStatus = 'error' | 'success' | 'warning'

/** ValidatorProps 组件属性。 */
export interface ValidatorProps {
  /** 自定义渲染的宿主元素。 */
  as?: ValidatorHost
  /** appearance 配置项。 */
  appearance?: ValidatorAppearance
  /** 组件尺寸。 */
  size?: ValidatorSize
  /** 组件状态。 */
  status?: ValidatorStatus
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ValidatorHintProps 组件属性。 */
export interface ValidatorHintProps {
  /** 自定义渲染的宿主元素。 */
  as?: ValidatorHintHost
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** hideUntilInvalid 配置项。 */
  hideUntilInvalid?: boolean
  /** lines 配置项。 */
  lines?: any[]
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ValidatorFieldProps 组件属性。 */
export interface ValidatorFieldProps extends Omit<ValidatorProps, 'className'> {
  /** fieldAs 配置项。 */
  fieldAs?: ValidatorFieldHost
  /** 根节点附加类名。 */
  className?: string
  /** controlClassName 附加类名。 */
  controlClassName?: string
  /** 展示标签。 */
  label?: any
  /** labelClassName 附加类名。 */
  labelClassName?: string
  /** hint 配置项。 */
  hint?: any
  /** hintAs 配置项。 */
  hintAs?: ValidatorHintHost
  /** hintClassName 附加类名。 */
  hintClassName?: string
  /** hideHintWhenValid 配置项。 */
  hideHintWhenValid?: boolean
  /** 额外操作或补充内容。 */
  extra?: any
  /** extraClassName 附加类名。 */
  extraClassName?: string
  /** requiredMark 配置项。 */
  requiredMark?: boolean
}

/** VALIDATOR_APPEARANCES 内部常量。 */
const VALIDATOR_APPEARANCES: ValidatorAppearance[] = [
  'input',
  'select',
  'textarea',
  'checkbox',
  'toggle',
]

/** join Class Names 的内部工具函数。 */
const joinClassNames = (...classNames: Array<string | undefined | false>) =>
  classNames.filter(Boolean).join(' ')

/** 转换为 Class Token Set 的内部工具函数。 */
const toClassTokenSet = (className?: string) => {
  return new Set(
    (className ?? '')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean),
  )
}

/** detect Appearance From Class Name 的内部工具函数。 */
const detectAppearanceFromClassName = (className?: string) => {
  const tokens = toClassTokenSet(className)
  return VALIDATOR_APPEARANCES.find(candidate => tokens.has(candidate))
}

/** 解析 Appearance 的内部工具函数。 */
const resolveAppearance = (
  as?: ValidatorHost,
  appearance?: ValidatorAppearance,
  className?: string,
): ValidatorAppearance | undefined => {
  if (appearance) return appearance

  const inferred = detectAppearanceFromClassName(className)
  if (inferred) return inferred

  if (as === 'select') return 'select'
  if (as === 'textarea') return 'textarea'
  return undefined
}

/** 解析 Host 的内部工具函数。 */
const resolveHost = (as?: ValidatorHost, appearance?: ValidatorAppearance): ValidatorHost => {
  if (as) return as
  if (appearance === 'select') return 'select'
  if (appearance === 'textarea') return 'textarea'
  return 'input'
}

/** 构建 Validator Class Name 的内部工具函数。 */
const buildValidatorClassName = (
  appearance?: ValidatorAppearance,
  size?: ValidatorSize,
  status?: ValidatorStatus,
  className?: string,
) => {
  const tokens = toClassTokenSet(className)

  return joinClassNames(
    'validator',
    appearance && !tokens.has(appearance) ? appearance : undefined,
    appearance && size && !tokens.has(`${appearance}-${size}`)
      ? `${appearance}-${size}`
      : undefined,
    appearance && status && !tokens.has(`${appearance}-${status}`)
      ? `${appearance}-${status}`
      : undefined,
    className,
  )
}

/** Root 的内部工具函数。 */
const Root: FC<ValidatorProps> = ({
  as,
  appearance,
  size,
  status,
  className,
  children,
  ...rest
}) => {
  const resolvedAppearance = resolveAppearance(as, appearance, className)
  const resolvedHost = resolveHost(as, resolvedAppearance)
  const cls = buildValidatorClassName(resolvedAppearance, size, status, className)

  if (resolvedHost === 'select') {
    return (
      <select {...rest} className={cls}>
        {children}
      </select>
    )
  }

  if (resolvedHost === 'textarea') {
    return (
      <textarea
        {...rest}
        className={cls}
        ref={(element: HTMLTextAreaElement | null) => {
          if (!element) return
          Promise.resolve().then(() => {
            element.value = element.value.trim()
          })
        }}
      >
        {children}
      </textarea>
    )
  }

  return <input {...rest} className={cls} />
}

/** Hint 的内部工具函数。 */
const Hint: FC<ValidatorHintProps> = ({
  as = 'p',
  className,
  children,
  hideUntilInvalid,
  lines,
  ...rest
}) => {
  const cls = joinClassNames('validator-hint', hideUntilInvalid ? 'hidden' : undefined, className)
  const hasLines = !!lines?.length

  if (as === 'div') {
    return (
      <div {...rest} className={cls}>
        {hasLines ? (
          <>
            {' '}
            {(lines ?? []).map((item, index) => (
              <span key={`validator-line-${index}`} className="block" r-text={item}></span>
            ))}{' '}
          </>
        ) : (
          children
        )}
      </div>
    )
  }

  if (as === 'span') {
    return (
      <span {...rest} className={cls}>
        {hasLines ? (
          <>
            {' '}
            {(lines ?? []).map((item, index) => (
              <span key={`validator-line-${index}`} className="block" r-text={item}></span>
            ))}{' '}
          </>
        ) : (
          children
        )}
      </span>
    )
  }

  return (
    <p {...rest} className={cls}>
      {hasLines ? (
        <>
          {' '}
          {(lines ?? []).map((item, index) => (
            <span key={`validator-line-${index}`} className="block" r-text={item}></span>
          ))}{' '}
        </>
      ) : (
        children
      )}
    </p>
  )
}

/** 构建 Field Class Name 的内部工具函数。 */
const buildFieldClassName = (fieldAs: ValidatorFieldHost, className?: string) => {
  return joinClassNames(fieldAs === 'fieldset' ? 'fieldset gap-2' : 'grid gap-2', className)
}

/** Field 的内部工具函数。 */
const Field: FC<ValidatorFieldProps> = ({
  fieldAs = 'fieldset',
  className,
  controlClassName,
  label,
  labelClassName,
  hint,
  hintAs = 'p',
  hintClassName,
  hideHintWhenValid,
  extra,
  extraClassName,
  requiredMark,
  id,
  children,
  ...rest
}) => {
  const controlId = typeof id === 'string' && id.trim() ? id : undefined
  const generatedHintId =
    controlId && hint != null && rest['aria-describedby'] == null ? `${controlId}-hint` : undefined
  const describedBy = rest['aria-describedby'] ?? generatedHintId
  const showRequiredMark = requiredMark ?? rest.required === true
  const fieldCls = buildFieldClassName(fieldAs, className)

  if (fieldAs === 'div') {
    return (
      <div className={fieldCls}>
        {label != null ? (
          <label className={joinClassNames('label', labelClassName)} for={controlId}>
            <span>{label}</span>
            {showRequiredMark ? (
              <span className="text-error" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        <Root {...rest} id={controlId} aria-describedby={describedBy} className={controlClassName}>
          {children}
        </Root>

        {hint != null ? (
          <Hint
            id={generatedHintId}
            as={hintAs}
            className={hintClassName}
            hideUntilInvalid={hideHintWhenValid}
          >
            {Array.isArray(hint) ? (
              <>
                {' '}
                {hint.map((item, index) => (
                  <span key={`validator-line-${index}`} className="block" r-text={item}></span>
                ))}{' '}
              </>
            ) : (
              hint
            )}
          </Hint>
        ) : null}

        {extra != null ? (
          <p className={joinClassNames('label text-xs opacity-70', extraClassName)}>
            {Array.isArray(extra) ? (
              <>
                {' '}
                {extra.map((item, index) => (
                  <span key={`validator-line-${index}`} className="block" r-text={item}></span>
                ))}{' '}
              </>
            ) : (
              extra
            )}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <fieldset className={fieldCls}>
      {label != null ? (
        <label className={joinClassNames('label', labelClassName)} for={controlId}>
          <span>{label}</span>
          {showRequiredMark ? (
            <span className="text-error" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <Root {...rest} id={controlId} aria-describedby={describedBy} className={controlClassName}>
        {children}
      </Root>

      {hint != null ? (
        <Hint
          id={generatedHintId}
          as={hintAs}
          className={hintClassName}
          hideUntilInvalid={hideHintWhenValid}
        >
          {Array.isArray(hint) ? (
            <>
              {' '}
              {hint.map((item, index) => (
                <span key={`validator-line-${index}`} className="block" r-text={item}></span>
              ))}{' '}
            </>
          ) : (
            hint
          )}
        </Hint>
      ) : null}

      {extra != null ? (
        <p className={joinClassNames('label text-xs opacity-70', extraClassName)}>
          {Array.isArray(extra) ? (
            <>
              {' '}
              {extra.map((item, index) => (
                <span key={`validator-line-${index}`} className="block" r-text={item}></span>
              ))}{' '}
            </>
          ) : (
            extra
          )}
        </p>
      ) : null}
    </fieldset>
  )
}

type ValidatorCompound = FC<ValidatorProps> & {
  Hint: FC<ValidatorHintProps>
  Field: FC<ValidatorFieldProps>
}

const ValidatorCompound: ValidatorCompound = /*#__PURE__*/ Object.assign(Root, {
  Hint,
  Field,
})

/** 默认导出校验器组件。 */
export default ValidatorCompound
