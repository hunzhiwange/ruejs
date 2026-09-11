/*
架构设计总览
- 插件目标：在 Vite transform 阶段使用 SWC + Rue wasm 插件转换 TSX/JSX。
- 转换管线：先预处理 Rue 指令语法，再调用 SWC wasm 插件，最后追加转换标记。
- 指令预处理：把 JSX 解析器无法直接接受的 @ / v-on / v-model / v-slot 等语法改写为安全属性。
- v-model 降级：组件模型降级为 prop + onUpdateX；原生元素模型降级为 value/checked + 事件处理器。
- Vapor 配置：不再向 wasm 插件传递显式开关，由编译器内部固定执行 Vapor 深编译。
- wasm 加载策略：优先使用项目默认路径，并通过环境变量 RUE_SWC_PLUGIN 共享给转换流程。
- 超时策略：开发转换默认放入 worker 线程，超时后终止 worker，避免 Vite 会话被阻塞。
*/
import swc from '@swc/core'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

/** 当前 ESM 模块内使用的 require，用于解析 wasm 插件与 worker 文件路径。 */
const requireFromHere = createRequire(import.meta.url)
/** 已完成 Rue Vapor 转换的源码头标记，避免同一模块被重复处理。 */
const RUE_TRANSFORM_HEADER = '/* RUE_TRANSFORMED */'
/** props 响应式解构转换的辅助头标记，供下游诊断或测试识别。 */
const RUE_REACTIVE_PROPS_DESTRUCTURE_HEADER = '/* RUE_REACTIVE_PROPS_DESTRUCTURED */'
/** Vite 插件名，也会写入转换错误对象，方便 Vite 定位来源。 */
const RUE_VITE_PLUGIN_NAME = '@rue-js/vite-plugin-rue'
const RUE_COMPILER_DIAGNOSTIC_MARKER = '__RUE_COMPILER_DIAGNOSTIC__'
const RUE_COMPILER_INVARIANT_MARKER = '__RUE_COMPILER_INVARIANT__'
/** 默认转换超时时间，避免异常输入让开发服务器长时间无响应。 */
const DEFAULT_TRANSFORM_TIMEOUT_MS = 5000
/** 限制 Vite 并发 transform 时同时创建的 SWC worker 数量。 */
const DEFAULT_TRANSFORM_CONCURRENCY = 8
/** 执行 SWC 转换的 worker 入口文件路径。 */
const TRANSFORM_WORKER_PATH = requireFromHere.resolve('./transform-worker.mjs')
/** Rue island manifest virtual module id. */
export const RUE_ISLAND_MANIFEST_ID = 'virtual:rue-island-manifest'
const RESOLVED_RUE_ISLAND_MANIFEST_ID = `\0${RUE_ISLAND_MANIFEST_ID}`
export const RUE_ISLAND_REGISTRY_ID = 'virtual:rue-island-registry'
const RESOLVED_RUE_ISLAND_REGISTRY_ID = `\0${RUE_ISLAND_REGISTRY_ID}`
export const RUE_ISLAND_CLIENT_ID = 'virtual:rue-island-client'
const RESOLVED_RUE_ISLAND_CLIENT_ID = `\0${RUE_ISLAND_CLIENT_ID}`
export const RUE_SERVER_ISLAND_REGISTRY_ID = 'virtual:rue-server-island-registry'
const RESOLVED_RUE_SERVER_ISLAND_REGISTRY_ID = `\0${RUE_SERVER_ISLAND_REGISTRY_ID}`
const CLIENT_DIRECTIVE_NAMESPACE = 'client'
const CLIENT_DIRECTIVE_STRATEGIES = new Set([
  'load',
  'idle',
  'visible',
  'media',
  'interaction',
  'none',
  'only',
])

/** 判断字符是否可作为 JSX 标签名开头。 */
const isAlpha = ch => /[A-Za-z]/.test(ch)
/** 事件指令内部 token 的历史字符判断，保留给兼容调试。 */
const _isDirectiveEventChar = ch => /[A-Za-z0-9:_-]/.test(ch)
/** 事件指令属性名允许的字符集合。 */
const isEventDirectiveAttrChar = ch => /[A-Za-z0-9:_.-]/.test(ch)
/** slot 指令属性名允许的字符集合。 */
const isSlotDirectiveAttrChar = ch => /[A-Za-z0-9_.-]/.test(ch)
/** v-model 安全属性名前缀，避免 SWC JSX parser 误读 `v-model:*`。 */
const MODEL_DIRECTIVE_SAFE_PREFIX = '__rue_model__'
/** v-model 安全属性名中的 modifiers 分隔标记。 */
const MODEL_DIRECTIVE_SAFE_MODIFIERS_MARKER = '__mods__'
/** v-model 支持的原始修饰符。 */
const rawModelModifierNames = new Set(['trim', 'number', 'lazy'])
/** JSX scoped style 生成的 DOM 作用域属性名前缀。 */
const RUE_SCOPED_STYLE_ATTR_PREFIX = 'data-rue-scope-'
/** v-on / @ 支持识别为修饰符的常见 token。 */
const directiveModifierNames = new Set([
  'stop',
  'prevent',
  'self',
  'once',
  'capture',
  'passive',
  'native',
  'ctrl',
  'shift',
  'alt',
  'meta',
  'exact',
  'enter',
  'tab',
  'delete',
  'esc',
  'space',
  'up',
  'down',
  'left',
  'right',
  'middle',
])
/** 使用连字符写法时允许剥离修饰符的事件名集合。 */
const hyphenModifierEventNames = new Set([
  'click',
  'dblclick',
  'keyup',
  'keydown',
  'keypress',
  'input',
  'change',
  'submit',
  'focus',
  'blur',
  'mousedown',
  'mouseup',
  'mousemove',
  'mouseover',
  'mouseout',
  'mouseenter',
  'mouseleave',
  'wheel',
  'scroll',
  'contextmenu',
  'pointerdown',
  'pointerup',
  'pointermove',
  'touchstart',
  'touchmove',
  'touchend',
])

/** 判断当前位置的 `<` 是否是 JSX 标签起点，而不是小于号或泛型语法。 */
const startsJsxTag = (code, index) => {
  const next = code[index + 1]
  const afterNext = code[index + 2]
  return isAlpha(next || '') || (next === '/' && isAlpha(afterNext || ''))
}

/** 将指令名片段规范为可放入 JSX 属性名的安全 token。 */
const normalizeDirectiveToken = raw => raw.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

/** 判断 SWC 输出中是否出现 props 响应式解构的内部访问形态。 */
const hasReactivePropsDestructureRewrite = code => code.includes('__rue_props.')

/**
 * 读取源码 directive prologue 中的 RSC 指令。
 * Rue 的 SWC 转换会注入运行时 import；这里保留 Text/RSC 对 `use client`
 * 和 `use server` 顶层指令的识别语义。
 */
const readLeadingRscDirective = code => {
  let i = 0
  const len = code.length

  if (code.charCodeAt(0) === 0xfeff) {
    i = 1
  }

  if (code[i] === '#' && code[i + 1] === '!') {
    const nl = code.indexOf('\n', i)
    if (nl === -1) return null
    i = nl + 1
  }

  while (i < len) {
    while (i < len && /\s/.test(code[i] ?? '')) {
      i += 1
    }
    if (i >= len) return null

    if (code[i] === '/' && code[i + 1] === '/') {
      const nl = code.indexOf('\n', i + 2)
      if (nl === -1) return null
      i = nl + 1
      continue
    }

    if (code[i] === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      if (end === -1) return null
      i = end + 2
      continue
    }

    const quote = code[i]
    if (quote !== '"' && quote !== "'") return null

    const closing = code.indexOf(quote, i + 1)
    if (closing === -1) return null

    const directive = code.slice(i + 1, closing)
    if (directive === 'use client' || directive === 'use server') {
      return directive
    }

    i = closing + 1
    while (i < len && (code[i] === ';' || code[i] === ' ' || code[i] === '\t')) {
      i += 1
    }
    if (code[i] === '\r') i += 1
    if (code[i] === '\n') {
      i += 1
      continue
    }
    return null
  }

  return null
}

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const removeStandaloneDirective = (code, directive) => {
  const pattern = new RegExp(
    `(^|\\r?\\n)[\\t ]*(['"])${escapeRegExp(directive)}\\2[\\t ]*;?[\\t ]*(?=\\r?\\n|$)`,
    'g',
  )

  return code.replace(pattern, leading => {
    if (!leading.startsWith('\n') && !leading.startsWith('\r')) {
      return ''
    }
    return leading.match(/^\r?\n/)?.[0] ?? '\n'
  })
}

const preserveRscDirectivePrologue = (source, transformed) => {
  const directive = readLeadingRscDirective(source)
  if (!directive || readLeadingRscDirective(transformed) === directive) {
    return transformed
  }

  const normalized = removeStandaloneDirective(transformed, directive).replace(/^\s+/, '')
  return `${JSON.stringify(directive)};\n${normalized}`
}

/** 判断事件指令 token 是否可视为修饰符。 */
const isDirectiveModifierToken = raw =>
  /^\d+$/.test(raw) || directiveModifierNames.has(raw.toLowerCase())

/**
 * 拆分事件指令名和修饰符。
 * 支持 `click.stop` 以及常见事件的 `click-stop` 写法，同时保留未知连字符事件名。
 */
const splitDirectiveEventAndModifiers = raw => {
  const trimmed = raw.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.includes('.')) {
    const [eventName, ...modifierNames] = trimmed.split('.')
    return { eventName, modifierNames }
  }

  const hyphenTokens = trimmed.split('-').filter(Boolean)
  if (hyphenTokens.length > 1) {
    const modifierNames = []
    let splitIndex = hyphenTokens.length

    while (splitIndex > 1) {
      const nextToken = hyphenTokens[splitIndex - 1]
      if (!isDirectiveModifierToken(nextToken)) {
        break
      }
      modifierNames.unshift(nextToken)
      splitIndex -= 1
    }

    if (modifierNames.length > 0) {
      const eventName = hyphenTokens.slice(0, splitIndex).join('-')
      const normalizedEventName = normalizeDirectiveToken(eventName).toLowerCase()
      if (hyphenModifierEventNames.has(normalizedEventName)) {
        return { eventName, modifierNames }
      }
    }
  }

  return { eventName: trimmed, modifierNames: [] }
}

/** 把 `@click.stop` / `v-on:click-stop` 编码为 SWC 可解析的安全属性名。 */
const buildSafeEventDirectiveName = raw => {
  const parsed = splitDirectiveEventAndModifiers(raw)
  if (!parsed) {
    return null
  }

  const safeEvent = normalizeDirectiveToken(parsed.eventName || '')

  if (!safeEvent) {
    return null
  }

  const safeModifiers = parsed.modifierNames
    .map(modifier => normalizeDirectiveToken(modifier).toLowerCase())
    .filter(Boolean)

  if (safeModifiers.length === 0) {
    return `__rue_on__${safeEvent}`
  }

  return `__rue_on__${safeEvent}__mods__${safeModifiers.join('__')}`
}

/**
 * 拆分 `v-model` 参数与修饰符。
 * 这里先把 `v-model:trim-title` 记录为修饰符 `trim` + 参数 `title`，
 * 后续 AST 阶段再降级为真实 JSX 属性。
 */
const splitModelDirectiveArgumentAndModifiers = raw => {
  const trimmed = raw.trim()

  if (!trimmed) {
    return { argumentName: '', modifierNames: [] }
  }

  if (!trimmed.startsWith(':') || trimmed.includes('.')) {
    return null
  }

  const tokens = trimmed.slice(1).split('-').filter(Boolean)

  if (tokens.length === 0) {
    return null
  }

  const modifierNames = []
  let splitIndex = 0
  while (splitIndex < tokens.length) {
    const nextToken = tokens[splitIndex].toLowerCase()
    if (!rawModelModifierNames.has(nextToken)) {
      break
    }
    modifierNames.push(tokens[splitIndex])
    splitIndex += 1
  }

  const argumentName = tokens.slice(splitIndex).join('-')
  if (!argumentName && modifierNames.length === 0) {
    return null
  }

  return { argumentName, modifierNames }
}

/** 把 `v-model` / `r-model` 编码为 JSX parser 能接受的安全属性名。 */
const buildSafeModelDirectiveName = raw => {
  const parsed = splitModelDirectiveArgumentAndModifiers(raw)
  if (!parsed) {
    return null
  }

  const safeArgument = normalizeDirectiveToken(parsed.argumentName || '')
  const safeModifiers = parsed.modifierNames
    .map(modifier => normalizeDirectiveToken(modifier).toLowerCase())
    .filter(Boolean)

  if (!safeArgument && safeModifiers.length === 0) {
    return MODEL_DIRECTIVE_SAFE_PREFIX
  }

  if (safeModifiers.length === 0) {
    return `${MODEL_DIRECTIVE_SAFE_PREFIX}${safeArgument}`
  }

  return `${MODEL_DIRECTIVE_SAFE_PREFIX}${safeArgument}${MODEL_DIRECTIVE_SAFE_MODIFIERS_MARKER}${safeModifiers.join('__')}`
}

/** 从源码游标位置尝试解析事件指令属性名。 */
const parseEventDirectiveName = (code, index) => {
  if (code[index] === '@' && isAlpha(code[index + 1] || '')) {
    let end = index + 1
    while (end < code.length && isEventDirectiveAttrChar(code[end])) {
      end += 1
    }

    const safeName = buildSafeEventDirectiveName(code.slice(index + 1, end))
    if (!safeName) {
      return null
    }

    return { end, safeName }
  }

  for (const prefix of ['v-on:', 'r-on:']) {
    if (!code.startsWith(prefix, index)) {
      continue
    }

    let end = index + prefix.length
    while (end < code.length && isEventDirectiveAttrChar(code[end])) {
      end += 1
    }

    const safeName = buildSafeEventDirectiveName(code.slice(index + prefix.length, end))
    if (!safeName) {
      return null
    }

    return { end, safeName }
  }

  return null
}

/** 从源码游标位置尝试解析 model 指令属性名。 */
const parseModelDirectiveName = (code, index) => {
  for (const prefix of ['v-model', 'r-model']) {
    if (!code.startsWith(prefix, index)) {
      continue
    }

    let end = index + prefix.length
    while (end < code.length && isEventDirectiveAttrChar(code[end])) {
      end += 1
    }

    const safeName = buildSafeModelDirectiveName(code.slice(index + prefix.length, end))
    if (!safeName) {
      return null
    }

    return { end, safeName }
  }

  return null
}

/** 生成 slot 简写的标准 JSX 属性源码，例如 `#header` -> `slot="header"`。 */
const buildSlotDirectiveReplacement = raw => {
  const slotName = raw.trim()

  if (!slotName) {
    return null
  }

  return `slot=${JSON.stringify(slotName)}`
}

/** 从源码游标位置尝试解析 slot 指令，并返回可直接写入源码的替换片段。 */
const parseSlotDirectiveName = (code, index) => {
  if (code[index] === '#' && isSlotDirectiveAttrChar(code[index + 1] || '')) {
    let end = index + 1
    while (end < code.length && isSlotDirectiveAttrChar(code[end])) {
      end += 1
    }

    const replacement = buildSlotDirectiveReplacement(code.slice(index + 1, end))
    if (!replacement) {
      return null
    }

    return { end, replacement }
  }

  for (const prefix of ['v-slot:', 'r-slot:']) {
    if (!code.startsWith(prefix, index)) {
      continue
    }

    let end = index + prefix.length
    while (end < code.length && isSlotDirectiveAttrChar(code[end])) {
      end += 1
    }

    const replacement = buildSlotDirectiveReplacement(code.slice(index + prefix.length, end))
    if (!replacement) {
      return null
    }

    return { end, replacement }
  }

  return null
}

/** 规范化 v-model 参数名，支持 kebab / snake / colon 写法到 camelCase。 */
const normalizeModelArg = raw => {
  const trimmed = raw.trim().replace(/^[-_:.]+|[-_:.]+$/g, '')
  if (!trimmed) {
    return null
  }

  if (!/[-_:]/.test(trimmed)) {
    return trimmed[0].toLowerCase() + trimmed.slice(1)
  }

  const segments = trimmed.split(/[-_:]+/).filter(Boolean)
  if (segments.length === 0) {
    return null
  }

  const [first, ...rest] = segments
  let normalized = first.toLowerCase()
  for (const segment of rest) {
    const lower = segment.toLowerCase()
    normalized += lower[0].toUpperCase() + lower.slice(1)
  }
  return normalized
}

/** 将 prop 名转为更新回调后缀，例如 `modelValue` -> `ModelValue`。 */
const pascalizePropName = raw => (raw ? raw[0].toUpperCase() + raw.slice(1) : '')

/** 规范化 model 修饰符名称。 */
const normalizeModelModifier = raw => {
  const trimmed = raw.trim().replace(/^[-_:.]+|[-_:.]+$/g, '')
  return trimmed ? trimmed.toLowerCase() : null
}

/** 判断 token 是否是 v-model 原始修饰符。 */
const isRawModelModifierToken = raw => {
  const normalized = normalizeModelModifier(raw)
  return normalized ? rawModelModifierNames.has(normalized) : false
}

/** 解析未经安全编码的 `v-model` 后缀，例如 `:trim-title`。 */
const parseRawModelSuffix = suffix => {
  if (!suffix) {
    return { rawArg: null, modifiers: [] }
  }

  if (suffix.startsWith(':')) {
    if (suffix.includes('.')) {
      return null
    }

    const tokens = suffix.slice(1).split('-').filter(Boolean)

    if (tokens.length === 0) {
      return null
    }

    const modifiers = []
    let splitIndex = 0
    while (splitIndex < tokens.length) {
      const token = tokens[splitIndex]
      if (!isRawModelModifierToken(token)) {
        break
      }
      modifiers.push(normalizeModelModifier(token))
      splitIndex += 1
    }

    const rawArgSource = tokens.slice(splitIndex).join('-')
    if (!rawArgSource && modifiers.length === 0) {
      return null
    }

    const rawArg = rawArgSource ? normalizeModelArg(rawArgSource) : null
    if (rawArgSource && !rawArg) {
      return null
    }

    return {
      rawArg,
      modifiers,
    }
  }

  return null
}

/** 解析安全编码后的 model 指令名，恢复参数名与修饰符列表。 */
const parseSafeModelDirectiveName = raw => {
  if (!raw.startsWith(MODEL_DIRECTIVE_SAFE_PREFIX)) {
    return null
  }

  const rest = raw.slice(MODEL_DIRECTIVE_SAFE_PREFIX.length)
  const splitIndex = rest.indexOf(MODEL_DIRECTIVE_SAFE_MODIFIERS_MARKER)
  const argRaw = splitIndex === -1 ? rest : rest.slice(0, splitIndex)
  const modifierRaw =
    splitIndex === -1 ? '' : rest.slice(splitIndex + MODEL_DIRECTIVE_SAFE_MODIFIERS_MARKER.length)
  const rawArg = argRaw ? normalizeModelArg(argRaw) : null
  if (argRaw && !rawArg) {
    return null
  }

  return {
    rawArg,
    modifiers: modifierRaw
      ? modifierRaw
          .split('__')
          .map(modifier => normalizeModelModifier(modifier))
          .filter(Boolean)
      : [],
  }
}

/** 将任意 model 指令属性名解析为降级所需的 prop、update 回调和 modifiers 信息。 */
const parseModelDirectiveSpecName = rawName => {
  let parsed = null
  if (rawName.startsWith(MODEL_DIRECTIVE_SAFE_PREFIX)) {
    parsed = parseSafeModelDirectiveName(rawName)
  } else if (rawName.startsWith('v-model')) {
    parsed = parseRawModelSuffix(rawName.slice('v-model'.length))
  } else if (rawName.startsWith('r-model')) {
    parsed = parseRawModelSuffix(rawName.slice('r-model'.length))
  }

  if (!parsed) {
    return null
  }

  const propName = parsed.rawArg || 'modelValue'
  return {
    propName,
    updateName: `onUpdate${pascalizePropName(propName)}`,
    modifiersPropName: propName === 'modelValue' ? 'modelModifiers' : `${propName}Modifiers`,
    modifiers: parsed.modifiers,
  }
}

/** 使用 SWC printer 将表达式节点还原成源码片段。 */
const printExprSource = expr => {
  if (!expr) {
    return null
  }

  try {
    const out = swc.printSync(
      {
        type: 'Module',
        span: expr.span,
        body: [
          {
            type: 'ExpressionStatement',
            span: expr.span,
            expression: expr,
          },
        ],
        interpreter: null,
      },
      {},
    )

    return String(out?.code ?? '')
      .trim()
      .replace(/;$/, '')
      .trim()
  } catch {
    return null
  }
}

/** 获取 JSX 标签名文本，兼容成员表达式与命名空间名称。 */
const getJsxNameText = name => {
  if (!name) {
    return ''
  }

  if (name.type === 'Identifier') {
    return name.value
  }

  if (name.type === 'JSXMemberExpression') {
    return `${getJsxNameText(name.object)}.${getJsxNameText(name.property)}`
  }

  if (name.type === 'JSXNamespacedName') {
    return `${getJsxNameText(name.namespace || name.ns)}:${getJsxNameText(name.name)}`
  }

  return ''
}

/** 获取 JSX 属性名文本。 */
const getJsxAttrNameText = name => {
  if (!name) {
    return ''
  }

  if (name.type === 'Identifier') {
    return name.value
  }

  if (name.type === 'JSXNamespacedName') {
    return `${getJsxNameText(name.namespace || name.ns)}:${getJsxNameText(name.name)}`
  }

  return ''
}

/** 获取 JSX 属性值源码，支持字符串字面量和表达式容器。 */
const getJsxAttrValueSource = attr => {
  if (!attr?.value) {
    return null
  }

  if (attr.value.type === 'StringLiteral') {
    return attr.value.raw ?? JSON.stringify(attr.value.value)
  }

  if (attr.value.type === 'JSXExpressionContainer') {
    const expr = attr.value.expression
    if (!expr || expr.type === 'JSXEmptyExpression') {
      return null
    }

    const exprSource = printExprSource(expr)?.trim()
    if (exprSource) {
      return exprSource
    }
  }

  return null
}

const getStaticJsxAttrValue = attr => {
  if (!attr?.value) {
    return true
  }

  if (attr.value.type === 'StringLiteral') {
    return attr.value.value
  }

  if (attr.value.type === 'JSXExpressionContainer') {
    const expr = attr.value.expression
    if (!expr || expr.type === 'JSXEmptyExpression') {
      return true
    }
    if (expr.type === 'StringLiteral') {
      return expr.value
    }
    if (expr.type === 'BooleanLiteral') {
      return expr.value
    }
    if (expr.type === 'ArrayExpression') {
      const values = []
      for (const element of expr.elements ?? []) {
        const item = element?.expression ?? element
        if (item?.type !== 'StringLiteral') {
          return null
        }
        values.push(item.value)
      }
      return values
    }
  }

  return null
}

const getStaticObjectPropertyName = key => {
  if (key?.type === 'Identifier' || key?.type === 'StringLiteral') return key.value
  return null
}

const getStaticOptionValue = value => {
  if (value?.type === 'StringLiteral' || value?.type === 'NumericLiteral') return value.value
  if (
    value?.type === 'UnaryExpression' &&
    value.operator === '-' &&
    value.argument?.type === 'NumericLiteral'
  ) {
    return -value.argument.value
  }
  return undefined
}

const parseStaticDirectiveOptions = (opening, directive, id) => {
  const strategy = directive.strategy
  if (strategy !== 'idle' && strategy !== 'visible') return {}
  const value = directive.attr.value
  if (!value) return {}
  const expression = value.type === 'JSXExpressionContainer' ? value.expression : null
  if (expression?.type === 'BooleanLiteral' && expression.value === true) return {}

  const fail = reason => {
    throw new Error(
      `Invalid client:${strategy} options in ${normalizeModuleId(id)} <${getJsxNameText(opening.name)}>: ${reason}.`,
    )
  }
  if (!expression || expression.type !== 'ObjectExpression') {
    return fail('expected a statically analyzable object')
  }
  if (expression.properties.length !== 1 || expression.properties[0].type !== 'KeyValueProperty') {
    return fail('expected exactly one supported option')
  }

  const property = expression.properties[0]
  const name = getStaticObjectPropertyName(property.key)
  const staticValue = getStaticOptionValue(property.value)
  if (strategy === 'idle') {
    if (
      name !== 'timeout' ||
      typeof staticValue !== 'number' ||
      !Number.isFinite(staticValue) ||
      staticValue < 0
    ) {
      return fail('timeout must be a finite non-negative number')
    }
    return { timeout: staticValue }
  }

  const rootMarginPattern =
    /^\s*-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)(?:\s+-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)){0,3}\s*$/
  if (
    name !== 'rootMargin' ||
    typeof staticValue !== 'string' ||
    !rootMarginPattern.test(staticValue)
  ) {
    return fail('rootMargin must contain one to four static px or % lengths')
  }
  return { rootMargin: staticValue.trim().replace(/\s+/g, ' ') }
}

const getJsxBaseIdentifierName = name => {
  if (!name) {
    return ''
  }
  if (name.type === 'Identifier') {
    return name.value
  }
  if (name.type === 'JSXMemberExpression') {
    return getJsxBaseIdentifierName(name.object)
  }
  if (name.type === 'JSXNamespacedName') {
    return getJsxNameText(name.namespace || name.ns)
  }
  return ''
}

const hashRueIslandId = value => {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

const normalizeModuleId = id => id.split('?')[0]

const getImportBindingManifest = ast => {
  const bindings = new Map()
  for (const item of ast.body ?? []) {
    if (item.type !== 'ImportDeclaration') {
      continue
    }

    const source = item.source?.value
    if (typeof source !== 'string') {
      continue
    }

    for (const specifier of item.specifiers ?? []) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        bindings.set(specifier.local.value, {
          component: source,
          exportName: 'default',
        })
        continue
      }

      if (specifier.type === 'ImportSpecifier') {
        const imported = specifier.imported?.value ?? specifier.local.value
        bindings.set(specifier.local.value, {
          component: source,
          exportName: imported,
        })
        continue
      }

      if (specifier.type === 'ImportNamespaceSpecifier') {
        bindings.set(specifier.local.value, {
          component: source,
          exportName: '*',
        })
      }
    }
  }
  return bindings
}

const collectIdentifierNames = ast => {
  const names = new Set()
  const visit = node => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    if (node.type === 'Identifier' && typeof node.value === 'string') {
      names.add(node.value)
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') visit(value)
    }
  }
  visit(ast)
  return names
}

const getRueIslandDescriptorHelperLocal = ast => {
  for (const item of ast.body ?? []) {
    if (item.type !== 'ImportDeclaration' || item.source?.value !== '@rue-js/runtime/server') {
      continue
    }
    for (const specifier of item.specifiers ?? []) {
      if (
        specifier.type === 'ImportSpecifier' &&
        (specifier.imported?.value ?? specifier.local?.value) === 'CompiledIsland'
      ) {
        return specifier.local.value
      }
    }
  }

  const names = collectIdentifierNames(ast)
  const base = 'RueCompiledIsland'
  let local = base
  let suffix = 1
  while (names.has(local)) {
    local = `${base}${suffix}`
    suffix += 1
  }
  return local
}

const injectRueIslandDescriptorHelper = (ast, local) => {
  let target = null
  for (const item of ast.body ?? []) {
    if (item.type === 'ImportDeclaration' && item.source?.value === '@rue-js/runtime/server') {
      target = item
      break
    }
  }

  const parsedImport = swc.parseSync(
    `import { CompiledIsland as ${local} } from '@rue-js/runtime/server'`,
    { syntax: 'typescript', target: 'es2020' },
  ).body[0]

  if (target) {
    const alreadyImported = target.specifiers.some(
      specifier =>
        specifier.type === 'ImportSpecifier' &&
        (specifier.imported?.value ?? specifier.local?.value) === 'CompiledIsland',
    )
    if (!alreadyImported) {
      target.specifiers.push(parsedImport.specifiers[0])
    }
    return
  }

  let insertionIndex = 0
  while (
    insertionIndex < ast.body.length &&
    ast.body[insertionIndex].type === 'ExpressionStatement' &&
    ast.body[insertionIndex].expression?.type === 'StringLiteral'
  ) {
    insertionIndex += 1
  }
  ast.body.splice(insertionIndex, 0, parsedImport)
}

const parseClientDirectiveAttrName = name => {
  if (!name.startsWith(`${CLIENT_DIRECTIVE_NAMESPACE}:`)) {
    return null
  }

  const strategy = name.slice(CLIENT_DIRECTIVE_NAMESPACE.length + 1)
  if (!CLIENT_DIRECTIVE_STRATEGIES.has(strategy)) {
    return null
  }
  return strategy
}

const getClientDirectiveStrategy = opening => {
  let selected = null
  for (const attr of opening.attributes ?? []) {
    if (attr.type !== 'JSXAttribute') {
      continue
    }
    const strategy = parseClientDirectiveAttrName(getJsxAttrNameText(attr.name))
    if (!strategy) {
      continue
    }
    if (selected) {
      throw new Error(
        `Only one client:* directive is allowed on <${getJsxNameText(opening.name)}> in Rue islands.`,
      )
    }
    selected = { strategy, attr }
  }
  return selected
}

const createRueIslandMetadata = (opening, directive, id, importBindings, index, spanBase = 0) => {
  const tagName = getJsxNameText(opening.name)
  const baseName = getJsxBaseIdentifierName(opening.name)
  const imported = importBindings.get(baseName)
  const normalizedId = normalizeModuleId(id)
  const spanKey = `${
    typeof opening.span?.start === 'number' ? opening.span.start - spanBase : index
  }:${typeof opening.span?.end === 'number' ? opening.span.end - spanBase : index}`
  const hydrate = directive.strategy
  const directiveValue = getStaticJsxAttrValue(directive.attr)
  const schedulerOptions = parseStaticDirectiveOptions(opening, directive, id)
  const entry = {
    id: `rue-${hashRueIslandId(`${normalizedId}:${spanKey}:${tagName}:${index}`)}`,
    component: imported?.component ?? normalizedId,
    entry: hydrate === 'none' ? undefined : (imported?.component ?? normalizedId),
    exportName: imported?.exportName ?? tagName,
    hydrate,
    ...schedulerOptions,
  }

  if (hydrate === 'media') {
    if (typeof directiveValue === 'string') {
      entry.media = directiveValue
    }
  } else if (hydrate === 'interaction') {
    if (typeof directiveValue === 'string' || Array.isArray(directiveValue)) {
      entry.interaction = directiveValue
    }
  }

  return entry
}

const createExpressionFromSource = source => {
  const parsed = swc.parseSync(`const __rueIslandExpression = (${source})`, {
    syntax: 'typescript',
    tsx: true,
    target: 'es2020',
  })
  return parsed.body[0].declarations[0].init
}

const printJsxChildrenSource = children => {
  if (!children || children.length === 0) return null
  const parsed = swc.parseSync('const __rueIslandChildren = <></>', {
    syntax: 'typescript',
    tsx: true,
    target: 'es2020',
  })
  const fragment = parsed.body[0].declarations[0].init
  fragment.children = children
  return printExprSource(fragment)
}

const readJsxAttributeValueSource = attr => {
  if (!attr.value) return 'true'
  if (attr.value.type === 'StringLiteral') return JSON.stringify(attr.value.value)
  if (attr.value.type === 'JSXExpressionContainer') {
    if (!attr.value.expression || attr.value.expression.type === 'JSXEmptyExpression') return null
    return printExprSource(attr.value.expression)
  }
  return printExprSource(attr.value)
}

const createIslandDescriptorExpression = (element, directive, metadata, helperLocal) => {
  const props = []
  let fallbackSource = null

  for (const attr of element.opening.attributes ?? []) {
    if (attr.type === 'SpreadElement') {
      const source = printExprSource(attr.arguments)
      if (source) props.push(`...(${source})`)
      continue
    }
    if (attr.type !== 'JSXAttribute') continue

    const name = getJsxAttrNameText(attr.name)
    if (parseClientDirectiveAttrName(name)) continue

    const valueSource = readJsxAttributeValueSource(attr)
    if (valueSource == null) continue
    if (directive.strategy === 'only' && name === 'fallback') {
      fallbackSource = valueSource
      continue
    }
    props.push(`${JSON.stringify(name)}: ${valueSource}`)
  }

  const childrenSource = printJsxChildrenSource(element.children)
  if (childrenSource) {
    props.push(`children: ${childrenSource}`)
  }

  const fields = [
    `component: ${getJsxNameText(element.opening.name)}`,
    `props: { ${props.join(', ')} }`,
  ]
  if (fallbackSource) fields.push(`fallback: ${fallbackSource}`)
  fields.push(`metadata: ${JSON.stringify(metadata)}`)

  return createExpressionFromSource(`<${helperLocal} {...{ ${fields.join(', ')} }} />`)
}

const getClientDirectiveSpread = opening => {
  for (const attr of opening.attributes ?? []) {
    if (attr.type !== 'SpreadElement') continue
    const source = printExprSource(attr.arguments)
    if (source?.includes('client:')) return attr
  }
  return null
}

const assertSupportedIslandTarget = (opening, imported, id) => {
  const tagName = getJsxNameText(opening.name)
  const location = `${normalizeModuleId(id)} <${tagName}>`
  if (opening.name?.type === 'JSXMemberExpression' || opening.name?.type === 'JSXNamespacedName') {
    throw new Error(`Rue client islands do not support namespace or member targets at ${location}.`)
  }
  if (/^[a-z]/.test(tagName)) {
    throw new Error(`Rue client islands cannot target a native element at ${location}.`)
  }
  if (!imported || imported.exportName === '*') {
    throw new Error(`Rue client islands require a direct default or named import at ${location}.`)
  }
}

const transformClientDirectiveAttributes = (code, id = '', serverGraph = true) => {
  if (!code.includes('client:')) {
    return { code, islands: [] }
  }

  let ast
  try {
    ast = swc.parseSync(code, { syntax: 'typescript', tsx: true, target: 'es2020' })
  } catch {
    return { code, islands: [] }
  }

  const importBindings = getImportBindingManifest(ast)
  const spanBase = typeof ast.span?.start === 'number' ? ast.span.start : 0
  const islands = []
  let changed = false
  let descriptorCount = 0
  const helperLocal = getRueIslandDescriptorHelperLocal(ast)

  const visit = (node, jsxChild = false) => {
    if (!node || typeof node !== 'object') {
      return node
    }

    if (Array.isArray(node)) {
      return node.map(item => visit(item, jsxChild))
    }

    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === 'object' && key !== 'span') {
        const childContext =
          key === 'children' && (node.type === 'JSXElement' || node.type === 'JSXFragment')
        node[key] = visit(value, childContext)
      }
    }

    if (node.type !== 'JSXElement') return node

    const tagName = getJsxNameText(node.opening.name)
    if (getClientDirectiveSpread(node.opening)) {
      throw new Error(
        `Rue client directives cannot be supplied through a spread at ${normalizeModuleId(id)} <${tagName}>.`,
      )
    }

    const directive = getClientDirectiveStrategy(node.opening)
    if (!directive) return node

    node.opening.attributes = node.opening.attributes.filter(
      attr =>
        attr.type !== 'JSXAttribute' ||
        !parseClientDirectiveAttrName(getJsxAttrNameText(attr.name)),
    )
    changed = true

    if (directive.strategy === 'none') {
      return node
    }

    const baseName = getJsxBaseIdentifierName(node.opening.name)
    const imported = importBindings.get(baseName)
    assertSupportedIslandTarget(node.opening, imported, id)
    const metadata = createRueIslandMetadata(
      node.opening,
      directive,
      id,
      importBindings,
      islands.length,
      spanBase,
    )
    islands.push(metadata)
    if (!serverGraph) return node
    descriptorCount += 1
    const expression = createIslandDescriptorExpression(node, directive, metadata, helperLocal)
    if (!jsxChild) return expression
    return {
      type: 'JSXExpressionContainer',
      span: node.span,
      expression,
    }
  }

  ast = visit(ast)

  if (descriptorCount > 0) {
    injectRueIslandDescriptorHelper(ast, helperLocal)
  }

  if (!changed) {
    return { code, islands: [] }
  }

  return {
    code: swc.printSync(ast, {}).code,
    islands,
  }
}

const getRueServerIslandDescriptorHelperLocal = ast => {
  for (const item of ast.body ?? []) {
    if (item.type !== 'ImportDeclaration' || item.source?.value !== '@rue-js/runtime/server') {
      continue
    }
    for (const specifier of item.specifiers ?? []) {
      if (
        specifier.type === 'ImportSpecifier' &&
        (specifier.imported?.value ?? specifier.local?.value) === 'CompiledServerIsland'
      ) {
        return specifier.local.value
      }
    }
  }

  const names = collectIdentifierNames(ast)
  const base = 'RueCompiledServerIsland'
  let local = base
  let suffix = 1
  while (names.has(local)) {
    local = `${base}${suffix}`
    suffix += 1
  }
  return local
}

const injectRueServerIslandDescriptorHelper = (ast, local) => {
  let target = null
  for (const item of ast.body ?? []) {
    if (item.type === 'ImportDeclaration' && item.source?.value === '@rue-js/runtime/server') {
      target = item
      break
    }
  }

  const parsedImport = swc.parseSync(
    `import { CompiledServerIsland as ${local} } from '@rue-js/runtime/server'`,
    { syntax: 'typescript', target: 'es2020' },
  ).body[0]
  if (target) {
    target.specifiers.push(parsedImport.specifiers[0])
    return
  }

  let insertionIndex = 0
  while (
    insertionIndex < ast.body.length &&
    ast.body[insertionIndex].type === 'ExpressionStatement' &&
    ast.body[insertionIndex].expression?.type === 'StringLiteral'
  ) {
    insertionIndex += 1
  }
  ast.body.splice(insertionIndex, 0, parsedImport)
}

const getServerDeferDirective = opening =>
  (opening.attributes ?? []).find(
    attr => attr.type === 'JSXAttribute' && getJsxAttrNameText(attr.name) === 'server:defer',
  ) ?? null

const assertSupportedServerIslandTarget = (opening, imported, id) => {
  const tagName = getJsxNameText(opening.name)
  const location = `${normalizeModuleId(id)} <${tagName}>`
  if (opening.name?.type === 'JSXMemberExpression' || opening.name?.type === 'JSXNamespacedName') {
    throw new Error(`Rue server islands do not support namespace or member targets at ${location}.`)
  }
  if (/^[a-z]/.test(tagName)) {
    throw new Error(`Rue server islands cannot target a native element at ${location}.`)
  }
  if (!imported || imported.exportName === '*') {
    throw new Error(`Rue server islands require a direct default or named import at ${location}.`)
  }
}

const createServerIslandDescriptorExpression = (element, id, helperLocal) => {
  const props = []
  let fallbackSource = 'null'
  for (const attr of element.opening.attributes ?? []) {
    if (attr.type === 'SpreadElement') {
      const source = printExprSource(attr.arguments)
      if (source) props.push(`...(${source})`)
      continue
    }
    if (attr.type !== 'JSXAttribute') continue
    const name = getJsxAttrNameText(attr.name)
    if (name === 'server:defer') continue
    const valueSource = readJsxAttributeValueSource(attr)
    if (valueSource == null) continue
    if (name === 'fallback') {
      fallbackSource = valueSource
      continue
    }
    props.push(`${JSON.stringify(name)}: ${valueSource}`)
  }

  const childrenSource = printJsxChildrenSource(element.children)
  if (childrenSource) props.push(`children: ${childrenSource}`)
  return createExpressionFromSource(
    `<${helperLocal} id={${JSON.stringify(id)}} props={{ ${props.join(', ')} }} fallback={${fallbackSource}} />`,
  )
}

const createServerIslandFallbackExpression = element => {
  const fallback = (element.opening.attributes ?? []).find(
    attr => attr.type === 'JSXAttribute' && getJsxAttrNameText(attr.name) === 'fallback',
  )
  if (!fallback) return createExpressionFromSource('null')
  const source = readJsxAttributeValueSource(fallback)
  return createExpressionFromSource(source ?? 'null')
}

const collectRuntimeIdentifierNames = ast => {
  const names = new Set()
  const visit = node => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    if (node.type === 'ImportDeclaration') return
    if (node.type === 'Identifier' && typeof node.value === 'string') names.add(node.value)
    for (const [key, value] of Object.entries(node)) {
      if (key !== 'span' && value && typeof value === 'object') visit(value)
    }
  }
  visit(ast)
  return names
}

const removeUnusedServerIslandImports = (ast, deferredBindings) => {
  const referenced = collectRuntimeIdentifierNames(ast)
  ast.body = ast.body.filter(item => {
    if (item.type !== 'ImportDeclaration') return true
    item.specifiers = (item.specifiers ?? []).filter(specifier => {
      const local = specifier.local?.value
      return !deferredBindings.has(local) || referenced.has(local)
    })
    return item.specifiers.length > 0
  })
}

const transformServerDirectiveAttributes = (code, id = '', serverGraph = false) => {
  if (!code.includes('server:defer')) return { code, serverIslands: [] }

  let ast
  try {
    ast = swc.parseSync(code, { syntax: 'typescript', tsx: true, target: 'es2020' })
  } catch {
    return { code, serverIslands: [] }
  }

  const importBindings = getImportBindingManifest(ast)
  const helperLocal = getRueServerIslandDescriptorHelperLocal(ast)
  const serverIslands = []
  const deferredBindings = new Set()
  let changed = false
  let descriptorCount = 0

  const visit = (node, jsxChild = false) => {
    if (!node || typeof node !== 'object') return node
    if (Array.isArray(node)) return node.map(item => visit(item, jsxChild))

    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === 'object' && key !== 'span') {
        const childContext =
          key === 'children' && (node.type === 'JSXElement' || node.type === 'JSXFragment')
        node[key] = visit(value, childContext)
      }
    }
    if (node.type !== 'JSXElement') return node

    const directive = getServerDeferDirective(node.opening)
    if (!directive) return node
    const tagName = getJsxNameText(node.opening.name)
    if (getClientDirectiveStrategy(node.opening)) {
      throw new Error(
        `Rue server:defer cannot be combined with client:* at ${normalizeModuleId(id)} <${tagName}>.`,
      )
    }

    const baseName = getJsxBaseIdentifierName(node.opening.name)
    const imported = importBindings.get(baseName)
    assertSupportedServerIslandTarget(node.opening, imported, id)
    const islandId = `rue-server-${hashRueIslandId(
      `${normalizeModuleId(id)}:${imported.component}:${imported.exportName}`,
    )}`
    serverIslands.push({
      id: islandId,
      component: imported.component,
      exportName: imported.exportName,
    })
    deferredBindings.add(baseName)
    changed = true

    const expression = serverGraph
      ? createServerIslandDescriptorExpression(node, islandId, helperLocal)
      : createServerIslandFallbackExpression(node)
    if (serverGraph) descriptorCount += 1
    if (!jsxChild) return expression
    return { type: 'JSXExpressionContainer', span: node.span, expression }
  }

  ast = visit(ast)
  removeUnusedServerIslandImports(ast, deferredBindings)
  if (descriptorCount > 0) injectRueServerIslandDescriptorHelper(ast, helperLocal)
  if (!changed) return { code, serverIslands: [] }
  return { code: swc.printSync(ast, {}).code, serverIslands }
}

/** 在 opening element 中查找第一个命中的 JSX 属性。 */
const findJsxAttr = (opening, names) =>
  opening.attributes.find(
    attr => attr.type === 'JSXAttribute' && names.includes(getJsxAttrNameText(attr.name)),
  )

/** 静态推断简单表达式的真假值，无法确定时返回 undefined。 */
const getStaticTruthiness = expr => {
  if (!expr) {
    return undefined
  }

  switch (expr.type) {
    case 'StringLiteral':
      return expr.value !== ''
    case 'NumericLiteral':
      return expr.value !== 0 && !Number.isNaN(expr.value)
    case 'BooleanLiteral':
      return expr.value
    case 'NullLiteral':
      return false
    case 'Identifier':
      return expr.value === 'undefined' ? false : undefined
    case 'UnaryExpression':
      return expr.operator === 'void' ? false : undefined
    default:
      return undefined
  }
}

/** 判断 JSX 属性在静态层面是否为真值。 */
const hasTruthyJsxAttr = (opening, name) => {
  const attr = findJsxAttr(opening, [name])
  if (!attr) {
    return false
  }

  if (!attr.value) {
    return true
  }

  if (attr.value.type === 'StringLiteral') {
    return attr.value.value !== ''
  }

  if (attr.value.type === 'JSXExpressionContainer') {
    return getStaticTruthiness(attr.value.expression) ?? true
  }

  return true
}

/** 读取静态字符串 JSX 属性值。 */
const getStaticStringJsxAttr = (opening, name) => {
  const attr = findJsxAttr(opening, [name])
  if (!attr?.value) {
    return null
  }

  if (attr.value.type === 'StringLiteral') {
    return attr.value.value
  }

  if (
    attr.value.type === 'JSXExpressionContainer' &&
    attr.value.expression?.type === 'StringLiteral'
  ) {
    return attr.value.expression.value
  }

  return null
}

/** 根据原生标签和属性推断 v-model 应该使用的 DOM 模型类型。 */
const getNativeModelKind = opening => {
  const tag = getJsxNameText(opening.name).toLowerCase()

  switch (tag) {
    case 'textarea':
      return { kind: 'TextArea' }
    case 'select':
      return { kind: 'Select', multiple: hasTruthyJsxAttr(opening, 'multiple') }
    case 'input': {
      const inputType = (getStaticStringJsxAttr(opening, 'type') || 'text').toLowerCase()
      switch (inputType) {
        case 'checkbox':
          return { kind: 'Checkbox' }
        case 'radio':
          return { kind: 'Radio' }
        case 'number':
        case 'range':
          return {
            kind: 'TextInput',
            targetType: 'HTMLInputElement',
            eventName: 'onInput',
            autoNumber: true,
          }
        default:
          return {
            kind: 'TextInput',
            targetType: 'HTMLInputElement',
            eventName: 'onInput',
            autoNumber: false,
          }
      }
    }
    default:
      return {
        kind: 'TextInput',
        targetType: 'HTMLInputElement',
        eventName: 'onInput',
        autoNumber: false,
      }
  }
}

/** 构造传给组件的 model modifiers 对象源码。 */
const buildModelModifiersObjectSource = modifiers =>
  `{${modifiers.map(modifier => `${JSON.stringify(modifier)}: true`).join(', ')}}`

/** 将组件上的 v-model 降级为 prop、onUpdateX 和可选 modifiers 属性。 */
const buildComponentModelAttrSources = (spec, modelSource) => {
  const attrs = [
    `${spec.propName}={${modelSource}}`,
    `${spec.updateName}={(value) => (${modelSource} = value)}`,
  ]
  if (spec.modifiers.length > 0) {
    attrs.push(`${spec.modifiersPropName}={${buildModelModifiersObjectSource(spec.modifiers)}}`)
  }
  return attrs
}

/** 构造文本类输入的赋值处理器源码，包含 trim / number 修饰符处理。 */
const buildTextModelHandlerSource = (modelSource, valueSource, trim, number) => {
  let body = `let value = ${valueSource};`
  if (trim) {
    body += 'value = value.trim();'
  }
  if (number) {
    body += 'const parsed = parseFloat(value);value = Number.isNaN(parsed) ? value : parsed;'
  }
  body += `${modelSource} = value;`
  return `($event) => { ${body} }`
}

/** 构造 checkbox 的 checked 表达式，兼容数组、Set 与标量模型值。 */
const buildCheckboxCheckedSource = (modelSource, valueSource, trueValueSource) => {
  const scalar = trueValueSource
    ? `(${modelSource}) === (${trueValueSource})`
    : `!!(${modelSource})`
  return `Array.isArray(${modelSource}) ? ${modelSource}.includes(${valueSource}) : ${modelSource} instanceof Set ? ${modelSource}.has(${valueSource}) : ${scalar}`
}

/** 构造 checkbox 的 change 处理器，按模型类型写回数组、Set 或标量。 */
const buildCheckboxHandlerSource = (modelSource, valueSource, trueValueSource, falseValueSource) =>
  `($event) => { const checked = ($event.target as HTMLInputElement).checked; const value = ${valueSource}; if (Array.isArray(${modelSource})) { ${modelSource} = checked ? (${modelSource}.includes(value) ? ${modelSource} : ${modelSource}.concat([value])) : ${modelSource}.filter(item => item !== value); return; } if (${modelSource} instanceof Set) { ${modelSource} = checked ? new Set([...${modelSource}, value]) : new Set(Array.from(${modelSource}).filter(item => item !== value)); return; } ${modelSource} = checked ? ${trueValueSource} : ${falseValueSource}; }`

/** 构造 radio 的 checked 表达式。 */
const buildRadioCheckedSource = (modelSource, valueSource) =>
  `(${modelSource}) === (${valueSource})`

/** 构造 radio 的 change 处理器，仅在选中时写回模型。 */
const buildRadioHandlerSource = (modelSource, valueSource) =>
  `($event) => { if (($event.target as HTMLInputElement).checked) { ${modelSource} = ${valueSource}; } }`

/** 构造 multiple select 的 change 处理器，输出选中 option 值数组。 */
const buildSelectMultipleHandlerSource = (modelSource, trim, number) => {
  const mapper =
    trim || number
      ? `Array.from(($event.target as HTMLSelectElement).selectedOptions).map(option => { let value = option.value;${trim ? 'value = value.trim();' : ''}${number ? 'const parsed = parseFloat(value);value = Number.isNaN(parsed) ? value : parsed;' : ''}return value; })`
      : 'Array.from(($event.target as HTMLSelectElement).selectedOptions).map(option => option.value)'

  return `($event) => { ${modelSource} = ${mapper}; }`
}

/** 根据原生元素类型生成 v-model 降级后的 JSX 属性源码列表。 */
const buildNativeModelAttrSources = (opening, spec, modelSource) => {
  const trim = spec.modifiers.includes('trim')
  const lazy = spec.modifiers.includes('lazy')
  const explicitNumber = spec.modifiers.includes('number')
  const valueSource = getJsxAttrValueSource(findJsxAttr(opening, ['value']))
  const checkedValueSource = valueSource ?? '"on"'
  const trueValueSource =
    getJsxAttrValueSource(findJsxAttr(opening, ['true-value', 'trueValue'])) ?? 'true'
  const falseValueSource =
    getJsxAttrValueSource(findJsxAttr(opening, ['false-value', 'falseValue'])) ?? 'false'
  const kind = getNativeModelKind(opening)

  switch (kind.kind) {
    case 'TextInput': {
      const eventName = lazy ? 'onChange' : kind.eventName
      const number = explicitNumber || kind.autoNumber
      const domValueSource = `($event.target as ${kind.targetType}).value`
      return [
        `value={${modelSource}}`,
        `${eventName}={${buildTextModelHandlerSource(modelSource, domValueSource, trim, number)}}`,
      ]
    }
    case 'TextArea': {
      const eventName = lazy ? 'onChange' : 'onInput'
      return [
        `value={${modelSource}}`,
        `${eventName}={${buildTextModelHandlerSource(modelSource, '($event.target as HTMLTextAreaElement).value', trim, explicitNumber)}}`,
      ]
    }
    case 'Select': {
      if (kind.multiple) {
        return [
          `value={${modelSource}}`,
          `onChange={${buildSelectMultipleHandlerSource(modelSource, trim, explicitNumber)}}`,
        ]
      }

      return [
        `value={${modelSource}}`,
        `onChange={${buildTextModelHandlerSource(modelSource, '($event.target as HTMLSelectElement).value', trim, explicitNumber)}}`,
      ]
    }
    case 'Checkbox': {
      const trueValueAttr = getJsxAttrValueSource(findJsxAttr(opening, ['true-value', 'trueValue']))
      return [
        `checked={${buildCheckboxCheckedSource(modelSource, checkedValueSource, trueValueAttr)}}`,
        `onChange={${buildCheckboxHandlerSource(modelSource, valueSource ?? '($event.target as HTMLInputElement).value', trueValueSource, falseValueSource)}}`,
      ]
    }
    case 'Radio':
      return [
        `checked={${buildRadioCheckedSource(modelSource, checkedValueSource)}}`,
        `onChange={${buildRadioHandlerSource(modelSource, valueSource ?? '($event.target as HTMLInputElement).value')}}`,
      ]
    default:
      return []
  }
}

/** 将生成的属性源码重新解析为 SWC JSXAttribute 节点。 */
const parseOpeningAttributeNodes = (tagSource, attrSources) => {
  if (attrSources.length === 0) {
    return []
  }

  const helperSource = `const __rue_model_lowered = <${tagSource} ${attrSources.join(' ')} />`
  const helperAst = swc.parseSync(helperSource, {
    syntax: 'typescript',
    tsx: true,
    target: 'es2020',
  })
  return helperAst.body[0].declarations[0].init.opening.attributes
}

/** 从属性源码中提取属性名，用于替换已有同名属性。 */
const getAttrNameFromSource = attrSource => attrSource.match(/^[^\s=]+/)?.[0] || ''

/** 判断 JSX opening element 是否是组件，而不是小写原生元素。 */
const isComponentOpening = opening => {
  if (opening.name.type !== 'Identifier') {
    return true
  }
  const name = getJsxNameText(opening.name)
  return !!name && /^[A-Z]/.test(name)
}

/** 降级单个 JSX opening element 上的 model 指令属性。 */
const lowerModelDirectiveAttributesInOpening = opening => {
  const directives = opening.attributes
    .filter(attr => attr.type === 'JSXAttribute')
    .map(attr => ({
      attr,
      name: getJsxAttrNameText(attr.name),
      spec: parseModelDirectiveSpecName(getJsxAttrNameText(attr.name)),
      modelSource: getJsxAttrValueSource(attr) ?? 'undefined',
    }))
    .filter(entry => entry.spec)

  if (directives.length === 0) {
    return false
  }

  const tagSource = getJsxNameText(opening.name)
  const generatedAttrSources = isComponentOpening(opening)
    ? directives.flatMap(({ spec, modelSource }) =>
        buildComponentModelAttrSources(spec, modelSource),
      )
    : buildNativeModelAttrSources(opening, directives[0].spec, directives[0].modelSource)

  const namesToReplace = new Set(generatedAttrSources.map(getAttrNameFromSource).filter(Boolean))
  const generatedAttrs = parseOpeningAttributeNodes(tagSource, generatedAttrSources)

  opening.attributes = opening.attributes
    .filter(attr => {
      if (attr.type !== 'JSXAttribute') {
        return true
      }

      const attrName = getJsxAttrNameText(attr.name)
      return !parseModelDirectiveSpecName(attrName) && !namesToReplace.has(attrName)
    })
    .concat(generatedAttrs)

  return true
}

/** 遍历 SWC AST，将所有 v-model / r-model 指令降级为普通 JSX 属性。 */
const lowerModelDirectiveAttributes = code => {
  if (
    !code.includes('v-model') &&
    !code.includes('r-model') &&
    !code.includes(MODEL_DIRECTIVE_SAFE_PREFIX)
  ) {
    return code
  }

  let ast
  try {
    ast = swc.parseSync(code, { syntax: 'typescript', tsx: true, target: 'es2020' })
  } catch {
    return code
  }

  let changed = false

  const visit = node => {
    if (!node || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item)
      }
      return
    }

    if (node.type === 'JSXOpeningElement') {
      changed = lowerModelDirectiveAttributesInOpening(node) || changed
    }

    for (const value of Object.values(node)) {
      if (!value || typeof value !== 'object') {
        continue
      }
      visit(value)
    }
  }

  visit(ast)

  if (!changed) {
    return code
  }

  return swc.printSync(ast, {}).code
}

/** 为 scoped style 生成稳定、短小的作用域 id。 */
const hashScopedStyleId = value => {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

const isFunctionLikeNode = node =>
  node?.type === 'FunctionDeclaration' ||
  node?.type === 'FunctionExpression' ||
  node?.type === 'ArrowFunctionExpression'

const isNativeJsxElementOpening = opening => {
  if (!opening || opening.name?.type !== 'Identifier') {
    return false
  }

  const name = getJsxNameText(opening.name)
  return !!name && /^[a-z]/.test(name)
}

const isScopedStyleAttr = attr => {
  if (attr?.type !== 'JSXAttribute' || getJsxAttrNameText(attr.name) !== 'scoped') {
    return false
  }

  if (!attr.value) {
    return true
  }

  if (attr.value.type === 'StringLiteral') {
    return attr.value.value.toLowerCase() !== 'false'
  }

  if (attr.value.type === 'JSXExpressionContainer') {
    const expr = attr.value.expression
    if (expr?.type === 'BooleanLiteral') {
      return expr.value
    }
    if (expr?.type === 'StringLiteral') {
      return expr.value.toLowerCase() !== 'false'
    }
  }

  return true
}

const isScopedStyleElement = node =>
  node?.type === 'JSXElement' &&
  getJsxNameText(node.opening?.name).toLowerCase() === 'style' &&
  node.opening.attributes.some(isScopedStyleAttr)

const readStaticStyleCss = element => {
  let css = ''

  for (const child of element.children ?? []) {
    if (child.type === 'JSXText') {
      css += child.value
      continue
    }

    if (child.type !== 'JSXExpressionContainer') {
      return null
    }

    const expr = child.expression
    if (!expr || expr.type === 'JSXEmptyExpression') {
      continue
    }

    if (expr.type === 'StringLiteral') {
      css += expr.value
      continue
    }

    if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
      css += expr.quasis.map(quasi => quasi.cooked ?? quasi.raw ?? '').join('')
      continue
    }

    return null
  }

  return css
}

const parseStyleChildrenFromCss = css => {
  const helperSource = `const __rue_scoped_style = <style>{${JSON.stringify(css)}}</style>`
  const helperAst = swc.parseSync(helperSource, {
    syntax: 'typescript',
    tsx: true,
    target: 'es2020',
  })
  return helperAst.body[0].declarations[0].init.children
}

const buildScopedStyleVarsSource = bindings =>
  `{${bindings
    .map(binding => `${JSON.stringify(binding.name)}: (${binding.expression})`)
    .join(', ')}}`

const buildScopedStyleStringAppendSource = bindings =>
  bindings
    .map(binding => `${JSON.stringify(`${binding.name}: `)} + String(${binding.expression})`)
    .join(' + "; " + ')

const mergeScopedStyleVarsInOpening = (opening, bindings) => {
  if (bindings.length === 0) {
    return false
  }

  const existingStyle = findJsxAttr(opening, ['style'])
  const varsObjectSource = buildScopedStyleVarsSource(bindings)
  let attrSource

  if (!existingStyle) {
    attrSource = `style={${varsObjectSource}}`
  } else {
    const existingStyleSource = getJsxAttrValueSource(existingStyle) ?? 'undefined'
    const styleStringSource = buildScopedStyleStringAppendSource(bindings)
    attrSource = `style={typeof (${existingStyleSource}) === "string" ? [(${existingStyleSource}), ${styleStringSource}].filter(Boolean).join("; ") : { ...(${existingStyleSource} || {}), ...${varsObjectSource} }}`
  }

  const generatedAttrs = parseOpeningAttributeNodes(getJsxNameText(opening.name), [attrSource])
  opening.attributes = opening.attributes
    .filter(attr => attr !== existingStyle)
    .concat(generatedAttrs)
  return true
}

const addScopeAttributeToOpening = (opening, scopeAttrName) => {
  if (findJsxAttr(opening, [scopeAttrName])) {
    return false
  }

  const generatedAttrs = parseOpeningAttributeNodes(getJsxNameText(opening.name), [
    `${scopeAttrName}=""`,
  ])
  opening.attributes = opening.attributes.concat(generatedAttrs)
  return true
}

const findMatchingParen = (source, openIndex) => {
  let quote = null
  let escape = false
  let depth = 0

  for (let index = openIndex; index < source.length; index += 1) {
    const ch = source[index]

    if (quote) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      continue
    }

    if (ch === '(') {
      depth += 1
      continue
    }

    if (ch === ')') {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  return -1
}

const normalizeCssVBindExpression = raw => {
  const trimmed = raw.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

const transformCssVBind = (css, scopeId) => {
  if (!css.includes('v-bind(')) {
    return { css, bindings: [] }
  }

  let output = ''
  let index = 0
  const bindingsByExpression = new Map()

  while (index < css.length) {
    const bindIndex = css.indexOf('v-bind(', index)
    if (bindIndex === -1) {
      output += css.slice(index)
      break
    }

    const openIndex = bindIndex + 'v-bind'.length
    const closeIndex = findMatchingParen(css, openIndex)
    if (closeIndex === -1) {
      output += css.slice(index)
      break
    }

    const expression = normalizeCssVBindExpression(css.slice(openIndex + 1, closeIndex))
    if (!expression) {
      output += css.slice(index, closeIndex + 1)
      index = closeIndex + 1
      continue
    }

    let binding = bindingsByExpression.get(expression)
    if (!binding) {
      binding = {
        expression,
        name: `--rue-v-bind-${scopeId}-${hashScopedStyleId(expression)}`,
      }
      bindingsByExpression.set(expression, binding)
    }

    output += `${css.slice(index, bindIndex)}var(${binding.name})`
    index = closeIndex + 1
  }

  return { css: output, bindings: [...bindingsByExpression.values()] }
}

const findNextCssBlockStart = (css, start) => {
  let quote = null
  let escape = false
  let lineComment = false
  let blockComment = false
  let parenDepth = 0
  let bracketDepth = 0

  for (let index = start; index < css.length; index += 1) {
    const ch = css[index]
    const next = css[index + 1]

    if (lineComment) {
      if (ch === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }

    if (quote) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }

    if (ch === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }

    if (ch === '(') parenDepth += 1
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1
    else if (ch === '[') bracketDepth += 1
    else if (ch === ']' && bracketDepth > 0) bracketDepth -= 1
    else if (ch === '{' && parenDepth === 0 && bracketDepth === 0) return index
  }

  return -1
}

const findMatchingCssBrace = (css, openIndex) => {
  let quote = null
  let escape = false
  let lineComment = false
  let blockComment = false
  let depth = 0

  for (let index = openIndex; index < css.length; index += 1) {
    const ch = css[index]
    const next = css[index + 1]

    if (lineComment) {
      if (ch === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }

    if (quote) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }

    if (ch === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }

    if (ch === '{') {
      depth += 1
      continue
    }

    if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  return -1
}

const splitCssSelectorList = selectorList => {
  const parts = []
  let start = 0
  let quote = null
  let escape = false
  let parenDepth = 0
  let bracketDepth = 0

  for (let index = 0; index < selectorList.length; index += 1) {
    const ch = selectorList[index]

    if (quote) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }

    if (ch === '(') parenDepth += 1
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1
    else if (ch === '[') bracketDepth += 1
    else if (ch === ']' && bracketDepth > 0) bracketDepth -= 1
    else if (ch === ',' && parenDepth === 0 && bracketDepth === 0) {
      parts.push(selectorList.slice(start, index))
      start = index + 1
    }
  }

  parts.push(selectorList.slice(start))
  return parts
}

const findLastTopLevelCombinator = selector => {
  let quote = null
  let escape = false
  let parenDepth = 0
  let bracketDepth = 0
  let last = -1

  for (let index = 0; index < selector.length; index += 1) {
    const ch = selector[index]

    if (quote) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }

    if (ch === '(') parenDepth += 1
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1
    else if (ch === '[') bracketDepth += 1
    else if (ch === ']' && bracketDepth > 0) bracketDepth -= 1
    else if (parenDepth === 0 && bracketDepth === 0 && /[\s>+~]/.test(ch)) {
      last = index
    }
  }

  return last
}

const findFirstTopLevelPseudo = selector => {
  let quote = null
  let escape = false
  let parenDepth = 0
  let bracketDepth = 0

  for (let index = 0; index < selector.length; index += 1) {
    const ch = selector[index]

    if (quote) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }

    if (ch === '(') parenDepth += 1
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1
    else if (ch === '[') bracketDepth += 1
    else if (ch === ']' && bracketDepth > 0) bracketDepth -= 1
    else if (ch === ':' && parenDepth === 0 && bracketDepth === 0) {
      return index
    }
  }

  return -1
}

const findTopLevelFunctionalPseudo = (selector, names) => {
  let quote = null
  let escape = false
  let parenDepth = 0
  let bracketDepth = 0

  for (let index = 0; index < selector.length; index += 1) {
    const ch = selector[index]

    if (quote) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }

    if (ch === '[') {
      bracketDepth += 1
      continue
    }
    if (ch === ']' && bracketDepth > 0) {
      bracketDepth -= 1
      continue
    }
    if (ch === '(') {
      parenDepth += 1
      continue
    }
    if (ch === ')' && parenDepth > 0) {
      parenDepth -= 1
      continue
    }

    if (parenDepth !== 0 || bracketDepth !== 0) {
      continue
    }

    for (const name of names) {
      if (!selector.startsWith(`${name}(`, index)) {
        continue
      }

      const openIndex = index + name.length
      const closeIndex = findMatchingParen(selector, openIndex)
      if (closeIndex !== -1) {
        return {
          name,
          start: index,
          end: closeIndex + 1,
          inner: selector.slice(openIndex + 1, closeIndex),
        }
      }
    }
  }

  return null
}

const findTopLevelDeepCombinator = selector => {
  let quote = null
  let escape = false
  let parenDepth = 0
  let bracketDepth = 0

  for (let index = 0; index < selector.length; index += 1) {
    const ch = selector[index]

    if (quote) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }

    if (ch === '(') parenDepth += 1
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1
    else if (ch === '[') bracketDepth += 1
    else if (ch === ']' && bracketDepth > 0) bracketDepth -= 1

    if (parenDepth !== 0 || bracketDepth !== 0) {
      continue
    }

    for (const token of ['>>>', '/deep/', '::v-deep']) {
      if (selector.startsWith(token, index)) {
        return { start: index, end: index + token.length }
      }
    }
  }

  return null
}

const joinScopedSelectorParts = (before, inner, after, scopeAttrName) => {
  const scopedBefore = before ? appendScopeToSelector(before, scopeAttrName) : `[${scopeAttrName}]`
  const innerSelectors = splitCssSelectorList(inner)
    .map(selector => selector.trim())
    .filter(Boolean)
  const suffix = after.trim()

  if (innerSelectors.length === 0) {
    return scopedBefore
  }

  return innerSelectors
    .map(selector => [scopedBefore, selector, suffix].filter(Boolean).join(' '))
    .join(',')
}

const appendScopeToSelector = (selector, scopeAttrName) => {
  const attrSelector = `[${scopeAttrName}]`
  const lastCombinator = findLastTopLevelCombinator(selector)
  const head = selector.slice(0, lastCombinator + 1)
  const compound = selector.slice(lastCombinator + 1)

  if (!compound.trim()) {
    return `${selector}${attrSelector}`
  }

  const leading = compound.match(/^\s*/)?.[0] ?? ''
  const trailing = compound.match(/\s*$/)?.[0] ?? ''
  let body = compound.slice(leading.length, compound.length - trailing.length)

  if (body === '*') {
    body = attrSelector
    return `${head}${leading}${body}${trailing}`
  }

  const pseudoIndex = findFirstTopLevelPseudo(body)
  const insertionIndex = pseudoIndex === -1 ? body.length : pseudoIndex
  return `${head}${leading}${body.slice(0, insertionIndex)}${attrSelector}${body.slice(insertionIndex)}${trailing}`
}

const scopeSingleSelector = (selector, scopeAttrName) => {
  const leading = selector.match(/^\s*/)?.[0] ?? ''
  const trailing = selector.match(/\s*$/)?.[0] ?? ''
  const body = selector.slice(leading.length, selector.length - trailing.length)

  if (!body) {
    return selector
  }

  const globalPseudo = findTopLevelFunctionalPseudo(body, [':global', '::v-global'])
  if (
    globalPseudo &&
    !body.slice(0, globalPseudo.start).trim() &&
    !body.slice(globalPseudo.end).trim()
  ) {
    return `${leading}${globalPseudo.inner}${trailing}`
  }

  const deepPseudo = findTopLevelFunctionalPseudo(body, [':deep', '::v-deep'])
  if (deepPseudo) {
    return `${leading}${joinScopedSelectorParts(
      body.slice(0, deepPseudo.start).trim(),
      deepPseudo.inner,
      body.slice(deepPseudo.end).trim(),
      scopeAttrName,
    )}${trailing}`
  }

  const slottedPseudo = findTopLevelFunctionalPseudo(body, [':slotted', '::v-slotted'])
  if (slottedPseudo) {
    return `${leading}${joinScopedSelectorParts(
      body.slice(0, slottedPseudo.start).trim(),
      slottedPseudo.inner,
      body.slice(slottedPseudo.end).trim(),
      scopeAttrName,
    )}${trailing}`
  }

  const deepCombinator = findTopLevelDeepCombinator(body)
  if (deepCombinator) {
    return `${leading}${joinScopedSelectorParts(
      body.slice(0, deepCombinator.start).trim(),
      body.slice(deepCombinator.end).trim(),
      '',
      scopeAttrName,
    )}${trailing}`
  }

  return `${leading}${appendScopeToSelector(body, scopeAttrName)}${trailing}`
}

const scopeSelectorList = (selectorList, scopeAttrName) =>
  splitCssSelectorList(selectorList)
    .map(selector => scopeSingleSelector(selector, scopeAttrName))
    .join(',')

const shouldScopeNestedAtRule = prelude =>
  /^@(media|supports|container|layer)\b/i.test(prelude.trim())

const shouldPreserveAtRule = prelude =>
  /^@(?:-webkit-)?keyframes\b/i.test(prelude.trim()) ||
  /^@(font-face|page|property|counter-style)\b/i.test(prelude.trim())

const scopeCssText = (css, scopeAttrName) => {
  let output = ''
  let index = 0

  while (index < css.length) {
    const openIndex = findNextCssBlockStart(css, index)
    if (openIndex === -1) {
      output += css.slice(index)
      break
    }

    const closeIndex = findMatchingCssBrace(css, openIndex)
    if (closeIndex === -1) {
      output += css.slice(index)
      break
    }

    const prelude = css.slice(index, openIndex)
    const body = css.slice(openIndex + 1, closeIndex)
    const trimmedPrelude = prelude.trim()

    if (trimmedPrelude.startsWith('@')) {
      const nextBody =
        shouldScopeNestedAtRule(trimmedPrelude) && !shouldPreserveAtRule(trimmedPrelude)
          ? scopeCssText(body, scopeAttrName)
          : body
      output += `${prelude}{${nextBody}}`
    } else {
      output += `${scopeSelectorList(prelude, scopeAttrName)}{${body}}`
    }

    index = closeIndex + 1
  }

  return output
}

const processScopedStyleOwner = (owner, { id, nextScopeIndex, processedStyles, skipFunctions }) => {
  const entries = []

  const collect = node => {
    if (!node || typeof node !== 'object') {
      return
    }

    if (node !== owner && skipFunctions && isFunctionLikeNode(node)) {
      return
    }

    if (Array.isArray(node)) {
      for (const item of node) collect(item)
      return
    }

    if (isScopedStyleElement(node) && !processedStyles.has(node)) {
      const css = readStaticStyleCss(node)
      if (css != null) {
        entries.push({ element: node, css })
      }
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') {
        collect(value)
      }
    }
  }

  collect(owner)

  if (entries.length === 0) {
    return false
  }

  const scopeIndex = nextScopeIndex.value
  nextScopeIndex.value += 1
  const scopeId = hashScopedStyleId(
    `${id || 'rue-scoped-style'}\n${scopeIndex}\n${entries.map(entry => entry.css).join('\n')}`,
  )
  const scopeAttrName = `${RUE_SCOPED_STYLE_ATTR_PREFIX}${scopeId}`

  const cssVarBindings = []

  for (const entry of entries) {
    const boundCss = transformCssVBind(entry.css, scopeId)
    cssVarBindings.push(...boundCss.bindings)
    entry.element.opening.attributes = entry.element.opening.attributes.filter(
      attr => !isScopedStyleAttr(attr),
    )
    entry.element.children = parseStyleChildrenFromCss(scopeCssText(boundCss.css, scopeAttrName))
    processedStyles.add(entry.element)
  }

  const addScopeAttrs = node => {
    if (!node || typeof node !== 'object') {
      return
    }

    if (node !== owner && skipFunctions && isFunctionLikeNode(node)) {
      return
    }

    if (Array.isArray(node)) {
      for (const item of node) addScopeAttrs(item)
      return
    }

    if (
      node.type === 'JSXElement' &&
      isNativeJsxElementOpening(node.opening) &&
      getJsxNameText(node.opening.name).toLowerCase() !== 'style'
    ) {
      addScopeAttributeToOpening(node.opening, scopeAttrName)
      mergeScopedStyleVarsInOpening(node.opening, cssVarBindings)
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') {
        addScopeAttrs(value)
      }
    }
  }

  addScopeAttrs(owner)
  return true
}

const transformScopedStyle = (code, id = '') => {
  if (!code.includes('<style') || !code.includes('scoped')) {
    return code
  }

  let ast
  try {
    ast = swc.parseSync(code, { syntax: 'typescript', tsx: true, target: 'es2020' })
  } catch {
    return code
  }

  const state = {
    id,
    nextScopeIndex: { value: 0 },
    processedStyles: new WeakSet(),
  }
  let changed = false

  const visitFunctions = node => {
    if (!node || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      for (const item of node) visitFunctions(item)
      return
    }

    if (isFunctionLikeNode(node)) {
      changed =
        processScopedStyleOwner(node, {
          ...state,
          skipFunctions: true,
        }) || changed
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') {
        visitFunctions(value)
      }
    }
  }

  visitFunctions(ast)
  changed =
    processScopedStyleOwner(ast, {
      ...state,
      skipFunctions: true,
    }) || changed

  if (!changed) {
    return code
  }

  return swc.printSync(ast, {}).code
}

/** 判断前一个字符是否允许开启 JSX 属性名。 */
const isJsxAttrBoundary = ch => ch == null || /[\s<]/.test(ch)

/**
 * 在源码字符串层面重写 JSX 指令属性。
 * 该扫描器会跳过普通字符串、注释和表达式内部内容，只在 JSX tag 属性区改写语法。
 */
const rewriteDirectiveAttributes = code => {
  let output = ''
  let index = 0
  let quote = null
  let escape = false
  let lineComment = false
  let blockComment = false
  let inJsxTag = false
  let tagQuote = null
  let tagEscape = false
  let tagLineComment = false
  let tagBlockComment = false
  let braceDepth = 0

  while (index < code.length) {
    const ch = code[index]
    const next = code[index + 1]

    if (!inJsxTag) {
      if (lineComment) {
        output += ch
        index += 1
        if (ch === '\n') {
          lineComment = false
        }
        continue
      }

      if (blockComment) {
        output += ch
        index += 1
        if (ch === '*' && next === '/') {
          output += next
          index += 1
          blockComment = false
        }
        continue
      }

      if (quote) {
        output += ch
        index += 1
        if (escape) {
          escape = false
          continue
        }
        if (ch === '\\') {
          escape = true
          continue
        }
        if (ch === quote) {
          quote = null
        }
        continue
      }

      if (ch === '/' && next === '/') {
        output += '//'
        index += 2
        lineComment = true
        continue
      }

      if (ch === '/' && next === '*') {
        output += '/*'
        index += 2
        blockComment = true
        continue
      }

      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch
        output += ch
        index += 1
        continue
      }

      if (ch === '<' && startsJsxTag(code, index)) {
        inJsxTag = true
        tagQuote = null
        tagEscape = false
        tagLineComment = false
        tagBlockComment = false
        braceDepth = 0
      }

      output += ch
      index += 1
      continue
    }

    if (tagLineComment) {
      output += ch
      index += 1
      if (ch === '\n') {
        tagLineComment = false
      }
      continue
    }

    if (tagBlockComment) {
      output += ch
      index += 1
      if (ch === '*' && next === '/') {
        output += next
        index += 1
        tagBlockComment = false
      }
      continue
    }

    if (tagQuote) {
      output += ch
      index += 1
      if (tagEscape) {
        tagEscape = false
        continue
      }
      if (ch === '\\') {
        tagEscape = true
        continue
      }
      if (ch === tagQuote) {
        tagQuote = null
      }
      continue
    }

    if (braceDepth > 0 && ch === '/' && next === '/') {
      output += '//'
      index += 2
      tagLineComment = true
      continue
    }

    if (braceDepth > 0 && ch === '/' && next === '*') {
      output += '/*'
      index += 2
      tagBlockComment = true
      continue
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      tagQuote = ch
      output += ch
      index += 1
      continue
    }

    if (braceDepth === 0 && isJsxAttrBoundary(code[index - 1])) {
      const slotDirective = parseSlotDirectiveName(code, index)
      if (slotDirective) {
        let spaceEnd = slotDirective.end
        while (spaceEnd < code.length && /\s/.test(code[spaceEnd])) {
          spaceEnd += 1
        }
        if (code[spaceEnd] !== '=') {
          output += slotDirective.replacement
          index = slotDirective.end
          continue
        }
      }

      const directive = parseEventDirectiveName(code, index)
      if (directive) {
        let spaceEnd = directive.end
        while (spaceEnd < code.length && /\s/.test(code[spaceEnd])) {
          spaceEnd += 1
        }
        if (code[spaceEnd] === '=') {
          output += directive.safeName
          index = directive.end
          continue
        }
      }

      const modelDirective = parseModelDirectiveName(code, index)
      if (modelDirective) {
        let spaceEnd = modelDirective.end
        while (spaceEnd < code.length && /\s/.test(code[spaceEnd])) {
          spaceEnd += 1
        }
        if (code[spaceEnd] === '=') {
          output += modelDirective.safeName
          index = modelDirective.end
          continue
        }
      }
    }

    if (ch === '{') {
      braceDepth += 1
      output += ch
      index += 1
      continue
    }

    if (ch === '}' && braceDepth > 0) {
      braceDepth -= 1
      output += ch
      index += 1
      continue
    }

    if (ch === '>' && braceDepth === 0) {
      inJsxTag = false
      output += ch
      index += 1
      continue
    }

    output += ch
    index += 1
  }

  return output
}

/** 给错误对象打上 Rue 转换标记，便于上层避免重复包裹。 */
const tagRueTransformError = (error, code) => {
  if (error && typeof error === 'object') {
    error.code = code
    error.plugin = RUE_VITE_PLUGIN_NAME
    error.__rueTransformError = true
  }
  return error
}

/** 判断错误是否已经由 Rue 转换流程包装过。 */
const isRueTransformError = error => !!error?.__rueTransformError

/** 从任意抛出值中提取可读错误信息。 */
const getErrorMessage = error => {
  if (!error) {
    return 'Unknown error'
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  return String(error)
}

/** Decode the structured invariant payload embedded in an SWC wasm failure. */
const extractCompilerInvariantPayload = error => {
  const message = getErrorMessage(error)
  const markerIndex = message.indexOf(RUE_COMPILER_INVARIANT_MARKER)
  if (markerIndex < 0) return null

  const payloadStart = message.indexOf('{', markerIndex + RUE_COMPILER_INVARIANT_MARKER.length)
  if (payloadStart < 0) return null

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = payloadStart; index < message.length; index += 1) {
    const character = message[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }
    if (character === '"') {
      inString = true
    } else if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(message.slice(payloadStart, index + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/** Convert the compiler's closed-ABI failure into a stable Vite-facing hard error. */
const createCompilerInvariantError = ({ error, source, id }) => {
  const payload = extractCompilerInvariantPayload(error)
  if (
    !payload ||
    typeof payload.category !== 'string' ||
    typeof payload.helper !== 'string' ||
    typeof payload.start !== 'number' ||
    typeof payload.end !== 'number' ||
    typeof payload.message !== 'string'
  ) {
    return null
  }

  const { line, column } = sourcePosition(source, { start: payload.start })
  const invariant = tagRueTransformError(
    new Error(
      `[${RUE_VITE_PLUGIN_NAME}] Rue compiler invariant failed for ${id}:${line}:${column}.\n` +
        `category: ${payload.category}\nhelper: ${payload.helper}\nreason: ${payload.message}`,
    ),
    'RUE_COMPILER_INVARIANT',
  )
  Object.assign(invariant, {
    category: payload.category,
    helper: payload.helper,
    reason: payload.message,
    start: payload.start,
    end: payload.end,
    file: id,
    line,
    column,
    loc: { file: id, line, column },
  })
  if (error?.stack) {
    invariant.stack = `${invariant.stack}\nCaused by:\n${error.stack}`
  }
  return invariant
}

/** 为某个转换阶段创建带上下文和提示文案的错误。 */
const createStageError = ({ id, stage, error, hint }) => {
  const parts = [`[${RUE_VITE_PLUGIN_NAME}] ${stage} failed for ${id}.`, getErrorMessage(error)]

  if (hint) {
    parts.push(hint)
  }

  const wrapped = tagRueTransformError(new Error(parts.join('\n')), 'RUE_TRANSFORM_ERROR')
  if (error?.stack) {
    wrapped.stack = `${wrapped.stack}\nCaused by:\n${error.stack}`
  }
  return wrapped
}

/** 创建 SWC 转换超时错误。 */
const createTimeoutError = ({ id, timeoutMs }) =>
  tagRueTransformError(
    new Error(
      `[${RUE_VITE_PLUGIN_NAME}] SWC transform timed out after ${timeoutMs}ms for ${id}.\nThe compiler worker was terminated to keep the Vite session responsive.\nThis usually means the current file contains malformed or unsupported syntax that sent the Rue SWC transform down a bad path. You can raise the limit with transformTimeoutMs if needed.`,
    ),
    'RUE_TRANSFORM_TIMEOUT',
  )

/** 为 Promise 或同步任务添加超时保护。 */
const withTransformTimeout = (task, { id, timeoutMs }) => {
  if (!(timeoutMs > 0)) {
    return Promise.resolve(task)
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(createTimeoutError({ id, timeoutMs }))
    }, timeoutMs)

    Promise.resolve(task).then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/** 创建一个轻量任务队列，避免 Vite 为每个并发模块同时创建独立 worker。 */
const createTransformLimiter = concurrency => {
  const parsedConcurrency = Number(concurrency)
  const limit =
    Number.isInteger(parsedConcurrency) && parsedConcurrency > 0
      ? parsedConcurrency
      : DEFAULT_TRANSFORM_CONCURRENCY
  const queue = []
  let activeTasks = 0

  const drain = () => {
    while (activeTasks < limit && queue.length > 0) {
      const task = queue.shift()
      activeTasks += 1
      Promise.resolve()
        .then(task.run)
        .then(task.resolve, task.reject)
        .finally(() => {
          activeTasks -= 1
          drain()
        })
    }
  }

  return run =>
    new Promise((resolve, reject) => {
      queue.push({ reject, resolve, run })
      drain()
    })
}

/** 将 worker 线程传回的可序列化错误恢复为 Error 对象。 */
const deserializeWorkerError = rawError => {
  const error = new Error(getErrorMessage(rawError))
  if (rawError?.name) {
    error.name = rawError.name
  }
  if (rawError?.stack) {
    error.stack = rawError.stack
  }
  return error
}

/** 创建 Rue SWC wasm 插件使用的 @swc/core 转换配置。 */
const createSwcTransformOptions = ({
  pluginPath,
  isProduction,
  target = 'client',
  id = 'rue.tsx',
}) => ({
  filename: id,
  jsc: {
    parser: { syntax: 'typescript', tsx: !/\.[cm]?[jt]s(?:\?.*)?$/.test(id) },
    target: 'es2020',
    experimental: {
      runPluginFirst: true,
      plugins: [[pluginPath, { target }]],
    },
  },
  minify: isProduction,
})

/** 在当前线程内直接执行 SWC 转换，主要用于 build 阶段减少 worker 开销。 */
const runSwcTransformInline = async ({ code, pluginPath, isProduction, target, id }) => {
  const out = await swc.transform(
    code,
    createSwcTransformOptions({
      id,
      pluginPath,
      isProduction: isProduction ?? process.env.NODE_ENV === 'production',
      target,
    }),
  )
  return String(out?.code ?? '')
}

const JSX_RUNTIME_SOURCE_RE = /@rue-js\/(?:[^"']*\/)?jsx(?:-dev)?-runtime/
const JSX_RUNTIME_CALLEE_RE = /^_?(?:jsx|jsxs|jsxDEV)$/

const findCompilerOnlyViolation = ast => {
  let violation = null
  const visit = value => {
    if (violation || !value || typeof value !== 'object') return
    if (value.type === 'JSXElement' || value.type === 'JSXFragment') {
      violation = { kind: 'residual JSX', span: value.span }
      return
    }
    if (
      value.type === 'ImportDeclaration' &&
      typeof value.source?.value === 'string' &&
      JSX_RUNTIME_SOURCE_RE.test(value.source.value)
    ) {
      violation = { kind: `forbidden JSX runtime import ${value.source.value}`, span: value.span }
      return
    }
    if (
      value.type === 'CallExpression' &&
      value.callee?.type === 'Identifier' &&
      JSX_RUNTIME_CALLEE_RE.test(value.callee.value)
    ) {
      violation = { kind: `forbidden JSX runtime call ${value.callee.value}`, span: value.span }
      return
    }
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) {
        for (const item of child) visit(item)
      } else {
        visit(child)
      }
    }
  }
  visit(ast)
  return violation
}

const sourcePosition = (code, span) => {
  const byteOffset = Math.max(0, Number(span?.start ?? 1) - 1)
  const prefix = Buffer.from(code).subarray(0, byteOffset).toString()
  const lines = prefix.split(/\r?\n/)
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}

/** Enforce the public compiler contract after every SWC execution path. */
const validateCompilerOnlyOutput = (code, id) => {
  const ast = swc.parseSync(code, {
    syntax: 'typescript',
    tsx: /\.[cm]?tsx(?:\?|$)|\.jsx(?:\?|$)|\.mdx(?:\?|$)/i.test(id),
    target: 'es2020',
  })
  const violation = findCompilerOnlyViolation(ast)
  if (!violation) return code

  const { line, column } = sourcePosition(code, violation.span)
  throw tagRueTransformError(
    new Error(
      `[${RUE_VITE_PLUGIN_NAME}] Rue compiler-only JSX contract failed for ${id}:${line}:${column}.\nThe compiler emitted ${violation.kind}; JSX must be fully consumed by the Rue compiler.`,
    ),
    'RUE_RESIDUAL_JSX',
  )
}

const COMPILER_DIAGNOSTIC_LITERAL_RE =
  /"__RUE_COMPILER_DIAGNOSTIC__(?:\\.|[^"\\])*";?|'__RUE_COMPILER_DIAGNOSTIC__(?:\\.|[^'\\])*';?/g

/** Extract deterministic SWC diagnostic sentinels before any generated code reaches Vite. */
const extractCompilerDiagnostics = (code, source, id) => {
  const diagnostics = []
  const cleanCode = code.replace(COMPILER_DIAGNOSTIC_LITERAL_RE, literal => {
    const encoded = literal.endsWith(';') ? literal.slice(0, -1) : literal
    const marker =
      encoded[0] === '"'
        ? JSON.parse(encoded)
        : encoded.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\')
    const payload = JSON.parse(marker.slice(RUE_COMPILER_DIAGNOSTIC_MARKER.length))
    const { line, column } = sourcePosition(source, { start: payload.start })
    diagnostics.push({ ...payload, file: id, line, column })
    return ''
  })
  diagnostics.sort((left, right) =>
    `${left.file}:${String(left.line).padStart(9, '0')}:${String(left.column).padStart(9, '0')}:${left.category}`.localeCompare(
      `${right.file}:${String(right.line).padStart(9, '0')}:${String(right.column).padStart(9, '0')}:${right.category}`,
    ),
  )
  return { code: cleanCode, diagnostics }
}

const enforceStrictClientDiagnostics = (code, source, id, target, onCompilerDiagnostics) => {
  const extracted = extractCompilerDiagnostics(code, source, id)
  if (target === 'server' || extracted.diagnostics.length === 0) {
    return extracted.code
  }
  onCompilerDiagnostics?.(extracted.diagnostics)
  const details = extracted.diagnostics
    .map(
      diagnostic =>
        `${diagnostic.file}:${diagnostic.line}:${diagnostic.column} category: ${diagnostic.category}\n` +
        `  syntax: ${diagnostic.syntax}\n  suggestion: ${diagnostic.suggestion}`,
    )
    .join('\n')
  throw tagRueTransformError(
    new Error(
      `[${RUE_VITE_PLUGIN_NAME}] Strict client compilation rejected ${extracted.diagnostics.length} compiler fallback(s).\n${details}`,
    ),
    'RUE_STRICT_CLIENT_COMPILE',
  )
}

/** 执行 Rue 指令预处理和 v-model 降级，供 Vite 与静态编译 API 共用。 */
const preprocessRueSource = (code, id = '') => {
  const preprocessed = rewriteDirectiveAttributes(code)
  const loweredModel = lowerModelDirectiveAttributes(preprocessed)
  return transformScopedStyle(loweredModel, id)
}

/**
 * 静态编译 Rue TSX/JSX 源码。
 *
 * 这个 API 面向 SSG、离线代码生成和测试脚本：它不依赖 Vite transform 钩子，
 * 但复用同一套指令预处理与 SWC wasm 插件，输出和 Vite 插件保持一致。
 *
 * @param {string} code 待编译源码。
 * @param {Object} [options] 编译选项。
 * @param {string} [options.id] 文件名，仅用于错误信息。
 * @param {string} [options.pluginPath] Rue SWC wasm 插件路径。
 * @param {boolean} [options.production] 是否按生产模式编译。
 * @param {boolean} [options.includeHeader] 是否附加 Rue 转换头，默认 true。
 * @param {'client' | 'hydrate' | 'server'} [options.target] JSX 编译目标，默认 client。
 * @param {(payload: { code: string, id: string, pluginPath: string, isProduction: boolean, target: 'client' | 'hydrate' | 'server' }) => Promise<string> | string} [options.transformExecutor] 自定义转换执行器，主要用于契约测试。
 * @returns {Promise<string>} 编译后的 JavaScript 源码。
 */
export async function compileRueStatic(code, options = {}) {
  const {
    id = 'rue-static.tsx',
    pluginPath = requireFromHere.resolve('@rue-js/swc-plugin-rue'),
    production = process.env.NODE_ENV === 'production',
    includeHeader = true,
    transformExecutor = runSwcTransformInline,
    target = 'client',
    onCompilerDiagnostics,
  } = options
  if (target !== 'client' && target !== 'hydrate' && target !== 'server') {
    throw new TypeError(`Unknown Rue JSX compiler target: ${String(target)}`)
  }

  let loweredModel
  try {
    const serverDirectiveResult = transformServerDirectiveAttributes(code, id, target === 'server')
    const clientDirectiveResult = transformClientDirectiveAttributes(serverDirectiveResult.code, id, target === 'server')
    loweredModel = preprocessRueSource(clientDirectiveResult.code, id)
  } catch (error) {
    throw createStageError({
      id,
      stage: 'Directive preprocessing',
      error,
      hint: 'The failure happened before SWC started. Check recent directive shorthand or template syntax edits near this file.',
    })
  }

  try {
    const out = await transformExecutor({
      code: loweredModel,
      id,
      pluginPath,
      isProduction: production,
      target,
    })
    const strictOut = enforceStrictClientDiagnostics(
      preserveRscDirectivePrologue(code, String(out ?? '')),
      loweredModel,
      id,
      target,
      onCompilerDiagnostics,
    )
    const normalizedOut = validateCompilerOnlyOutput(strictOut, id)
    if (!includeHeader) {
      return normalizedOut
    }
    const headers = [RUE_TRANSFORM_HEADER]
    if (hasReactivePropsDestructureRewrite(normalizedOut)) {
      headers.push(RUE_REACTIVE_PROPS_DESTRUCTURE_HEADER)
    }
    return `${headers.join('\n')}\n${normalizedOut}`
  } catch (error) {
    const invariant = createCompilerInvariantError({ error, source: code, id })
    if (invariant) throw invariant
    throw createStageError({
      id,
      stage: 'SWC transform',
      error,
      hint: 'The static compiler uses the same Rue SWC wasm plugin as the Vite transform.',
    })
  }
}

const RUE_CUSTOM_ELEMENT_EXTERNALS = ['@rue-js/rue', '@rue-js/runtime', '@rue-js/runtime/internal']

const RUE_CUSTOM_ELEMENT_GLOBALS = {
  '@rue-js/rue': 'Rue',
  '@rue-js/runtime': 'RueRuntime',
  '@rue-js/runtime/internal': 'RueRuntimeInternal',
}

const normalizePluginList = plugins => {
  if (!plugins) {
    return []
  }
  return Array.isArray(plugins) ? plugins.flat().filter(Boolean) : [plugins]
}

const mergeRueExternals = existing => {
  if (!existing) {
    return RUE_CUSTOM_ELEMENT_EXTERNALS
  }
  if (typeof existing === 'function') {
    return (source, importer, isResolved) =>
      RUE_CUSTOM_ELEMENT_EXTERNALS.includes(source) || existing(source, importer, isResolved)
  }
  const existingList = Array.isArray(existing) ? existing : [existing]
  return [...existingList, ...RUE_CUSTOM_ELEMENT_EXTERNALS]
}

const withRueGlobals = output => {
  const applyGlobals = current => ({
    ...current,
    globals: {
      ...RUE_CUSTOM_ELEMENT_GLOBALS,
      ...(current ?? {}).globals,
    },
  })

  return Array.isArray(output) ? output.map(applyGlobals) : applyGlobals(output)
}

/**
 * 创建 Rue Custom Element 库的 Vite 配置。
 *
 * @param {Object} options 配置项。
 * @param {string|string[]|Record<string,string>} options.entry library entry。
 * @param {string} [options.name] UMD/IIFE 全局名。
 * @param {string|Function} [options.fileName] 输出文件名。
 * @param {string[]} [options.formats] Vite library formats，默认 ['es']。
 * @param {boolean} [options.externalRue] 是否 externalize Rue runtime。
 * @param {Object} [options.rue] 传给 VitePluginRue 的选项。
 * @param {Object} [options.vite] 额外 Vite 配置，会被合并进返回值。
 * @returns {import('vite').UserConfig}
 */
export function customElement(options = {}) {
  const {
    entry,
    name = 'RueCustomElements',
    fileName = 'rue-custom-elements',
    formats = ['es'],
    externalRue = false,
    rue = {},
    vite = {},
  } = options

  if (!entry) {
    throw new Error('customElement() requires an entry option.')
  }

  const userBuild = vite.build ?? {}
  const userRollupOptions = userBuild.rollupOptions ?? {}
  const userLib = userBuild.lib && typeof userBuild.lib === 'object' ? userBuild.lib : {}

  return {
    ...vite,
    plugins: [VitePluginRue(rue), ...normalizePluginList(vite.plugins)],
    build: {
      target: 'es2020',
      cssCodeSplit: false,
      ...userBuild,
      lib: {
        entry,
        name,
        fileName,
        formats,
        ...userLib,
      },
      rollupOptions: {
        ...userRollupOptions,
        external: externalRue
          ? mergeRueExternals(userRollupOptions.external)
          : userRollupOptions.external,
        output: externalRue ? withRueGlobals(userRollupOptions.output) : userRollupOptions.output,
      },
    },
  }
}

/** 在 worker 线程内执行 SWC 转换，开发阶段可通过超时终止异常转换。 */
const runSwcTransformInWorker = ({ code, id, pluginPath, timeoutMs, isProduction, target }) =>
  new Promise((resolve, reject) => {
    let settled = false
    let timer = null

    const settle = callback => {
      if (settled) {
        return
      }

      settled = true
      if (timer) {
        clearTimeout(timer)
      }
      callback()
    }

    let worker
    try {
      worker = new Worker(TRANSFORM_WORKER_PATH, {
        type: 'module',
        workerData: {
          id,
          code,
          pluginPath,
          isProduction: isProduction ?? process.env.NODE_ENV === 'production',
          target,
        },
      })
    } catch (error) {
      settle(() => reject(error))
      return
    }

    worker.once('message', message => {
      settle(() => {
        if (message?.error) {
          reject(deserializeWorkerError(message.error))
          return
        }

        resolve(String(message?.code ?? ''))
      })
    })

    worker.once('error', error => {
      settle(() => reject(error))
    })

    worker.once('exit', code => {
      if (settled) {
        return
      }

      const message =
        code === 0
          ? 'SWC transform worker exited before returning a result.'
          : `SWC transform worker exited with code ${code}.`
      settle(() => reject(new Error(message)))
    })

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        void worker.terminate().catch(() => {})
        settle(() => reject(createTimeoutError({ id, timeoutMs })))
      }, timeoutMs)
    }
  })

/**
 * Rue 的 Vite 插件入口。
 *
 * 插件会在 Vite transform 阶段处理 TSX/JSX 模块：
 * 1. 通过 include/exclude 和文件后缀判断是否处理当前模块。
 * 2. 预处理 Rue 指令语法，让源码可以被标准 TSX parser 接受。
 * 3. 调用 Rue SWC wasm 插件完成 JSX/Vapor 编译。
 * 4. 给输出加上 Rue 转换标记，避免后续重复转换。
 *
 * @param {Object} options 插件配置项。
 * @param {string[]} [options.include] 包含路径关键字，任一命中则处理；为空时处理全部 TSX/JSX。
 * @param {string[]} [options.exclude] 排除路径关键字，任一命中则跳过。
 * @param {string[]} [options.includeExtensions] 需要编译的 JSX 源文件扩展名。
 * @param {boolean} [options.debug] 是否输出转换调试日志。
 * @param {number} [options.transformTimeoutMs] SWC 转换超时时间，单位为毫秒。
 * @param {number} [options.transformConcurrency] 同时执行的 SWC 转换数，默认 8。
 * @param {'client' | 'hydrate' | 'server'} [options.target] JSX 编译目标；SSR/RSC 图会自动选择 server。
 * @param {(payload: { code: string, id: string, pluginPath: string, timeoutMs: number, target: 'client' | 'server' }) => Promise<string> | string} [options.transformExecutor] 自定义转换执行器，主要用于测试。
 * @returns {import('vite').Plugin} Vite 插件对象。
 */
export default function VitePluginRue(options = {}) {
  const {
    include = [],
    exclude = [],
    includeExtensions = ['tsx', 'jsx'],
    debug = false,
    transformTimeoutMs = DEFAULT_TRANSFORM_TIMEOUT_MS,
    transformConcurrency = DEFAULT_TRANSFORM_CONCURRENCY,
    transformExecutor = runSwcTransformInWorker,
    target: configuredTarget = 'client',
    onCompilerDiagnostics,
  } = options
  if (
    configuredTarget !== 'client' &&
    configuredTarget !== 'hydrate' &&
    configuredTarget !== 'server'
  ) {
    throw new TypeError(`Unknown Rue JSX compiler target: ${String(configuredTarget)}`)
  }
  const transformExtensionPattern = new RegExp(
    `\\.(${includeExtensions.map(escapeRegExp).join('|')})(?:\\?.*)?$`,
  )
  // 默认始终使用 worker 转换，确保 dev/build 阶段都能通过超时保护终止卡住的编译。
  let activeTransformExecutor = transformExecutor
  let isProductionTransform = process.env.NODE_ENV === 'production'
  let projectRoot = process.cwd()
  const scheduleTransform = createTransformLimiter(transformConcurrency)
  const islandManifestByModule = new Map()
  const serverIslandRegistryByModule = new Map()

  const updateIslandManifest = (id, islands) => {
    const normalizedId = normalizeModuleId(id)
    if (islands.length === 0) {
      islandManifestByModule.delete(normalizedId)
      return
    }
    islandManifestByModule.set(normalizedId, islands)
  }

  const updateServerIslandRegistry = (id, islands) => {
    const normalizedId = normalizeModuleId(id)
    if (islands.length === 0) {
      serverIslandRegistryByModule.delete(normalizedId)
      return
    }
    serverIslandRegistryByModule.set(normalizedId, islands)
  }

  const createIslandManifestModule = () => {
    const manifest = {}
    for (const islands of islandManifestByModule.values()) {
      for (const island of islands) {
        manifest[island.id] = island
      }
    }
    return `export const manifest = ${JSON.stringify(manifest, null, 2)};\nexport default manifest;\n`
  }

  const normalizeRegistryImportSource = (source, ownerId) => {
    if (!source.startsWith('.')) return source.replace(/\\/g, '/')
    return path.resolve(path.dirname(normalizeModuleId(ownerId)), source).replace(/\\/g, '/')
  }

  const getSortedIslandRegistryEntries = () => {
    const entries = []
    for (const [ownerId, islands] of islandManifestByModule.entries()) {
      for (const island of islands) {
        entries.push({
          ...island,
          importSource: normalizeRegistryImportSource(island.component, ownerId),
        })
      }
    }
    return entries.sort((left, right) => left.id.localeCompare(right.id))
  }

  const getIslandCompilerTarget = id => {
    const normalizedId = normalizeModuleId(id)
    const normalizedStem = normalizedId.replace(/\.(?:tsx|jsx)$/, '')
    for (const entry of getSortedIslandRegistryEntries()) {
      if (entry.hydrate === 'none') continue
      const importStem = entry.importSource.replace(/\.(?:tsx|jsx)$/, '')
      if (importStem === normalizedStem) return 'hydrate'
    }
    return 'client'
  }

  const createIslandRegistryModule = () => {
    const entries = getSortedIslandRegistryEntries()
    const importers = entries
      .map(entry => {
        const selectedExport =
          entry.exportName === 'default'
            ? 'module.default'
            : `module[${JSON.stringify(entry.exportName)}]`
        return `  ${JSON.stringify(entry.id)}: async () => {\n    const module = await import(${JSON.stringify(entry.importSource)})\n    return { ...module, default: ${selectedExport} }\n  }`
      })
      .join(',\n')
    return `export const islandImporters = {\n${importers}\n};\nexport const resolveRueIslandModule = id => {\n  const importer = islandImporters[id];\n  if (!importer) throw new Error(\`Unknown Rue island descriptor: \${id}\`);\n  return importer();\n};\nexport default islandImporters;\n`
  }

  const createServerIslandRegistryModule = () => {
    const entries = []
    for (const [ownerId, islands] of serverIslandRegistryByModule.entries()) {
      for (const island of islands) {
        entries.push({
          ...island,
          importSource: normalizeRegistryImportSource(island.component, ownerId),
        })
      }
    }
    entries.sort((left, right) => left.id.localeCompare(right.id))
    const uniqueEntries = Array.from(new Map(entries.map(entry => [entry.id, entry])).values())
    const importers = uniqueEntries
      .map(entry => {
        const selectedExport =
          entry.exportName === 'default'
            ? 'module.default'
            : `module[${JSON.stringify(entry.exportName)}]`
        return `  ${JSON.stringify(entry.id)}: async () => {\n    const module = await import(${JSON.stringify(entry.importSource)})\n    return { ...module, default: ${selectedExport} }\n  }`
      })
      .join(',\n')
    return `export const serverIslandImporters = {\n${importers}\n};\nexport const resolveRueServerIslandModule = id => {\n  const importer = serverIslandImporters[id];\n  if (!importer) throw new Error(\`Unknown Rue server island descriptor: \${id}\`);\n  return importer();\n};\nexport default serverIslandImporters;\n`
  }

  const createIslandClientModule =
    () => `import { startRueIslandLoader } from '@rue-js/runtime/island';
import { manifest } from ${JSON.stringify(RUE_ISLAND_MANIFEST_ID)};
import { resolveRueIslandModule } from ${JSON.stringify(RUE_ISLAND_REGISTRY_ID)};

const hydrationManifest = Object.fromEntries(
  Object.entries(manifest).map(([id, entry]) => [id, { ...entry, entry: id }]),
);

export const startRueIslands = (options = {}) => startRueIslandLoader({
  ...options,
  manifest: options.manifest ?? hydrationManifest,
  resolveModule: options.resolveModule ?? (id => resolveRueIslandModule(id)),
});
`

  /**
   * 判断文件是否命中 include/exclude 规则。
   * @param {string} id 模块路径。
   * @returns {boolean} 是否允许继续转换。
   */
  const isIncluded = id => {
    if (exclude.some(x => id.includes(x))) return false
    if (include.length === 0) return true
    return include.some(x => id.includes(x))
  }

  const excludedScanDirectories = new Set([
    'node_modules',
    'dist',
    'coverage',
    'target',
    'temp',
    'tmp',
  ])

  const scanIslandSourceFiles = async (directory, files) => {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      const filename = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || excludedScanDirectories.has(entry.name)) continue
        await scanIslandSourceFiles(filename, files)
        continue
      }
      if (!entry.isFile() || !/\.(?:tsx|jsx)$/.test(entry.name) || !isIncluded(filename)) continue
      files.push(filename)
    }
  }

  const preIndexIslandSources = async addWatchFile => {
    islandManifestByModule.clear()
    serverIslandRegistryByModule.clear()
    const files = []
    await scanIslandSourceFiles(projectRoot, files)
    for (const filename of files) {
      addWatchFile?.(filename)
      const code = await fs.readFile(filename, 'utf8')
      const serverResult = transformServerDirectiveAttributes(code, filename, true)
      const clientResult = transformClientDirectiveAttributes(serverResult.code, filename)
      updateServerIslandRegistry(filename, serverResult.serverIslands)
      updateIslandManifest(filename, clientResult.islands)
    }
  }

  /**
   * 使用 Rue 指令预处理 + SWC wasm 插件完成代码转换。
   * @param {string} code 输入源码。
   * @param {string} id 模块路径。
   * @param {string} pluginPath SWC wasm 插件路径。
   * @returns {Promise<string>} 转换后的源码，包含 Rue 转换头标记。
   */
  const transformWithSwcPlugin = async (code, id, pluginPath, serverGraph) => {
    let loweredModel
    let islands = []
    let serverIslands = []
    try {
      // 第一阶段先把 JSX parser 无法识别的指令属性改写成安全属性名，
      // 第二阶段借助 SWC AST 将 v-model 安全属性降级成普通 JSX 属性。
      const serverDirectiveResult = transformServerDirectiveAttributes(code, id, serverGraph)
      serverIslands = serverDirectiveResult.serverIslands
      const clientDirectiveResult = transformClientDirectiveAttributes(
        serverDirectiveResult.code,
        id,
        serverGraph || configuredTarget === 'server',
      )
      islands = clientDirectiveResult.islands
      loweredModel = preprocessRueSource(clientDirectiveResult.code, id)
    } catch (error) {
      throw createStageError({
        id,
        stage: 'Directive preprocessing',
        error,
        hint: 'The failure happened before SWC started. Check recent directive shorthand or template syntax edits near this file.',
      })
    }

    try {
      // 第三阶段执行真正的 Rue SWC wasm 转换，并保留超时保护。
      const target =
        serverGraph || configuredTarget === 'server'
          ? 'server'
          : configuredTarget === 'hydrate'
            ? 'hydrate'
            : getIslandCompilerTarget(id)
      const out = await scheduleTransform(() =>
        withTransformTimeout(
          activeTransformExecutor({
            code: loweredModel,
            id,
            pluginPath,
            timeoutMs: transformTimeoutMs,
            isProduction: isProductionTransform,
            target,
          }),
          { id, timeoutMs: transformTimeoutMs },
        ),
      )
      const strictOut = enforceStrictClientDiagnostics(
        preserveRscDirectivePrologue(code, out),
        loweredModel,
        id,
        target,
        onCompilerDiagnostics,
      )
      const normalizedOut = validateCompilerOnlyOutput(strictOut, id)
      // 输出标记用于幂等判断；响应式 props 解构标记用于测试和诊断。
      const headers = [RUE_TRANSFORM_HEADER]
      if (hasReactivePropsDestructureRewrite(normalizedOut)) {
        headers.push(RUE_REACTIVE_PROPS_DESTRUCTURE_HEADER)
      }
      return {
        code: `${headers.join('\n')}\n${normalizedOut}`,
        islands,
        serverIslands,
      }
    } catch (error) {
      const invariant = createCompilerInvariantError({ error, source: code, id })
      if (invariant) throw invariant
      if (isRueTransformError(error)) {
        throw error
      }

      throw createStageError({
        id,
        stage: 'SWC transform',
        error,
        hint: 'The compiler aborted early so Vite can surface the failure instead of leaving a blank page.',
      })
    }
  }

  return {
    /** 插件名称 */
    name: '@rue-js/vite-plugin-rue',
    /** 插件执行阶段：前置，优先于其他转换 */
    enforce: 'pre',
    /**
     * 控制插件应用范围。
     * 当前插件在 serve/build 中都启用，具体模块过滤交给 transform 钩子处理。
     * @returns {boolean} 是否应用插件。
     */
    apply: (_config, { command: _command }) => true,
    async buildStart() {
      await preIndexIslandSources(file => this.addWatchFile?.(file))
    },
    resolveId(id, _importer, resolveOptions) {
      if (/^@rue-js\/rue\/jsx(?:-dev)?-runtime$/.test(id)) {
        throw new Error(
          `[${RUE_VITE_PLUGIN_NAME}] Rue compiler required: runtime JSX is unsupported. Compile the original JSX with @rue-js/vite-plugin-rue.`,
        )
      }
      if (id === RUE_ISLAND_MANIFEST_ID) {
        return RESOLVED_RUE_ISLAND_MANIFEST_ID
      }
      if (id === RUE_ISLAND_REGISTRY_ID) {
        return RESOLVED_RUE_ISLAND_REGISTRY_ID
      }
      if (id === RUE_ISLAND_CLIENT_ID) {
        return RESOLVED_RUE_ISLAND_CLIENT_ID
      }
      if (id === RUE_SERVER_ISLAND_REGISTRY_ID) {
        const environmentName = this.environment?.name
        const serverGraph =
          resolveOptions?.ssr === true ||
          environmentName === 'ssr' ||
          environmentName === 'server' ||
          environmentName === 'rsc'
        return serverGraph ? RESOLVED_RUE_SERVER_ISLAND_REGISTRY_ID : null
      }
      return null
    },
    load(id, loadOptions) {
      if (id === RESOLVED_RUE_ISLAND_MANIFEST_ID) {
        return createIslandManifestModule()
      }
      if (id === RESOLVED_RUE_ISLAND_REGISTRY_ID) {
        return createIslandRegistryModule()
      }
      if (id === RESOLVED_RUE_ISLAND_CLIENT_ID) {
        return createIslandClientModule()
      }
      if (id === RESOLVED_RUE_SERVER_ISLAND_REGISTRY_ID) {
        const environmentName = this.environment?.name
        const serverGraph =
          loadOptions?.ssr === true ||
          environmentName === 'ssr' ||
          environmentName === 'server' ||
          environmentName === 'rsc'
        return serverGraph ? createServerIslandRegistryModule() : null
      }
      return null
    },
    watchChange(id, change) {
      if (change.event === 'delete') {
        updateIslandManifest(id, [])
        updateServerIslandRegistry(id, [])
      }
    },
    /**
     * Vite 转换钩子：对命中的 TSX/JSX 模块执行 Rue 编译。
     * @param {string} code 源码。
     * @param {string} id 模块路径。
     * @returns {Promise<{code:string,map:null}|null>} 转换结果或 null 跳过。
     */
    async transform(code, id, transformOptions) {
      // 匹配处理的 JSX 源文件类型；MDX 等上游插件可显式加入。
      const isTsx = transformExtensionPattern.test(id)
      // TS/JS entry modules can contain startup macros without JSX. They must
      // pass through SWC too; ordinary dependency modules remain untouched.
      const isScript = /\.[cm]?[jt]s(?:\?.*)?$/.test(id)
      const hasRueImport =
        !isTsx &&
        isScript &&
        code.includes('@rue-js/rue') &&
        swc
          .parseSync(code, { syntax: 'typescript', tsx: false })
          .body.some(
            item =>
              item.type === 'ImportDeclaration' &&
              !item.typeOnly &&
              (item.source.value === '@rue-js/rue' ||
                JSX_RUNTIME_SOURCE_RE.test(item.source.value)),
          )
      if (!isTsx && !(isScript && hasRueImport)) return null
      if (!isIncluded(id)) {
        validateCompilerOnlyOutput(code, id)
        return null
      }
      // 选择 wasm 插件路径：优先环境变量回退到默认路径
      if (!process.env.RUE_SWC_PLUGIN) {
        process.env.RUE_SWC_PLUGIN = requireFromHere.resolve('@rue-js/swc-plugin-rue')
      }

      // 已包含 RUE 头标记则直接跳过
      if (code.startsWith(RUE_TRANSFORM_HEADER)) {
        validateCompilerOnlyOutput(code, id)
        return null
      }
      const base = code
      const environmentName = this.environment?.name
      const serverGraph =
        configuredTarget === 'server' ||
        transformOptions?.ssr === true ||
        environmentName === 'ssr' ||
        environmentName === 'server' ||
        environmentName === 'rsc'

      let out = null
      // 若找到 wasm 插件路径，则执行转换
      if (process.env.RUE_SWC_PLUGIN) {
        out = await transformWithSwcPlugin(base, id, process.env.RUE_SWC_PLUGIN, serverGraph)
      }

      // 无输出或无变化时跳过
      if (!out || out.code === code) return null
      updateIslandManifest(id, out.islands)
      updateServerIslandRegistry(id, out.serverIslands)

      // 调试日志：提示已转换模块
      if (debug && out.code && out.code !== code) {
        console.log(`[rue-vapor] transformed: ${id}`)
      }
      // 返回转换后的代码与空映射
      return { code: out.code, map: null }
    },
    /** Vite 配置解析完成钩子：默认执行器保持 worker 隔离，避免 build 阶段同步卡住。 */
    configResolved(config) {
      isProductionTransform = config.command === 'build' || process.env.NODE_ENV === 'production'
      projectRoot = config.root ? path.resolve(config.root) : process.cwd()
      activeTransformExecutor = transformExecutor
    },
  }
}
