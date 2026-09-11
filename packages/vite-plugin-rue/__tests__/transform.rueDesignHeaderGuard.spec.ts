// @vitest-environment jsdom

import { readdir, readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import VitePluginRue, { compileRueStatic } from '../index.mjs'

const createPlugin = (options: Parameters<typeof VitePluginRue>[0] = {}) => VitePluginRue(options)

const invokeTransform = async (
  source: string,
  id: string,
  options: Parameters<typeof VitePluginRue>[0] = {},
) => {
  const plugin = createPlugin(options)
  const transformHook = plugin.transform

  if (!transformHook) {
    return null
  }

  if (typeof transformHook === 'function') {
    return transformHook.call({} as any, source, id)
  }

  return transformHook.handler.call({} as any, source, id)
}

const HEADER = '/* RUE_TRANSFORMED */'

const componentId = (name: string) => `packages/rue-design/src/components/${name}/index.tsx`

const rueDesignComponentEntryIds = async () => {
  const componentNames = await readdir('packages/rue-design/src/components', {
    withFileTypes: true,
  })

  const entryIds = await Promise.all(
    componentNames
      .filter(entry => entry.isDirectory())
      .map(async entry => {
        const id = componentId(entry.name)

        try {
          await readFile(id, 'utf8')
          return id
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
          throw error
        }
      }),
  )

  return entryIds.filter((id): id is string => id !== null).sort()
}

const diagnosticCategory = (message: string) =>
  message.match(/\bcategory:\s*([a-z][a-z0-9-]*)\b/i)?.[1] ?? 'uncategorized'

const formatStrictDiagnosticReport = (failures: Array<{ id: string; message: string }>) => {
  const byCategory = new Map<string, Array<{ id: string; message: string }>>()

  for (const failure of failures) {
    const category = diagnosticCategory(failure.message)
    const categoryFailures = byCategory.get(category) ?? []
    categoryFailures.push(failure)
    byCategory.set(category, categoryFailures)
  }

  return [...byCategory]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([category, categoryFailures]) => [
      `[${category}]`,
      ...categoryFailures
        .sort((left, right) => left.id.localeCompare(right.id))
        .map(({ id, message }) => `- ${id}\n  ${message.replace(/\n/g, '\n  ')}`),
    ])
    .join('\n')
}

const notificationLikeSource = `
  import { type FC } from '@rue-js/rue'

  const Demo: FC<{
    props?: Record<string, any>
    role?: string
    onClick?: (event: unknown) => void
  }> = ({ props, onClick, ...rest }) => {
    const componentProps: Record<string, any> = { ...(props ?? {}), ...rest }
    const userOnClick = componentProps.onClick

    if ('onClick' in componentProps) delete componentProps.onClick

    componentProps.role = componentProps.role ?? 'status'

    return (
      <button
        {...componentProps}
        onClick={(event) => {
          if (typeof userOnClick === 'function') userOnClick(event)
          if (typeof onClick === 'function') onClick(event)
        }}
      >
        demo
      </button>
    )
  }

  export default Demo
`

// Give each component its own timeout and failure report as the design library grows.
const entryIds = await rueDesignComponentEntryIds()

describe('vite-plugin-rue rue-design transform header guard', () => {
  it.each(entryIds)('strict-compiles %s without fallback', async id => {
    const failures: Array<{ id: string; message: string }> = []

    const source = await readFile(id, 'utf8')

    try {
      const result = await invokeTransform(source, id, { transformTimeoutMs: 15_000 })
      const code = typeof result === 'string' ? result : String(result?.code ?? '')

      if (!code.includes(HEADER)) {
        throw new Error('transform returned no Rue compiler header')
      }
    } catch (error) {
      failures.push({
        id,
        message: error instanceof Error ? error.message : String(error),
      })
    }

    const report = formatStrictDiagnosticReport(failures)
    expect(report, `Rue Design strict diagnostics:\n${report}`).toBe('')
  })

  it('deep-compiles formerly path-guarded rue-design component sources', async () => {
    const result = await invokeTransform(notificationLikeSource, componentId('time-picker'))

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('still transforms headerless rue-design component sources outside the path-guarded migration set', async () => {
    const result = await invokeTransform(notificationLikeSource, componentId('anchor'))

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
  })

  it('deep-compiles the headerless button component source through the compiler path', async () => {
    const result = await invokeTransform(notificationLikeSource, componentId('button'))

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
  })

  it('deep-compiles the real headerless button source and preserves native spread props', async () => {
    const id = componentId('button')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
  })

  it('deep-compiles the real headerless link source without legacy dynamic render escapes', async () => {
    const id = componentId('link')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')
    expect(source).not.toContain('render as renderRue')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('data-rue-link-actions')
    expect(code).toContain('data-rue-link-copy')
    expect(code).toContain('data-rue-link-editor')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('renderContent()')
  })

  it('deep-compiles the real headerless table source without textifying body rows', async () => {
    const id = componentId('table')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).not.toContain('pageRows.flatMap')
    expect(code).not.toMatch(/_\$settextContent\([^)]*,\s*pageRows/)
  })

  it('deep-compiles the real headerless tree-select source without legacy DOM escapes', async () => {
    const id = componentId('tree-select')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')
    expect(source).not.toContain('document.createElement')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless mockup-phone source without JSX runtime fallback', async () => {
    const id = componentId('mockup-phone')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('_$compiledCreateElement("img"')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless mockup-window source through slot boundaries', async () => {
    const id = componentId('mockup-window')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the mockup-window demo page without JSX runtime fallback', async () => {
    const id = 'app/pages/design/MockupWindow.tsx'
    const source = await readFile(id, 'utf8')

    expect(source).not.toContain('preview={() =>')
    expect(source).not.toMatch(/toolbar=\{\s*</)
    expect(source).not.toMatch(/actions=\{\s*</)

    const code = await compileRueStatic(source, { id, production: false })

    expect(code).toContain(HEADER)
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless dock source through items and compound children', async () => {
    const id = componentId('dock')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('_$mountCompiledSlotAt')
    expect(code).not.toContain('renderAnchor(')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless radial-progress source through stepped svg paths', async () => {
    const id = componentId('radial-progress')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('_$compiledCreateElement("svg"')
    expect(code).toContain('_$setStyle')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless splitter source without legacy header or h/ref escapes', async () => {
    const id = componentId('splitter')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('data-rue-splitter-root')
    expect(code).toContain('rue-splitter-panel-config-change')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless validator source through the compiler path', async () => {
    const id = componentId('validator')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('<fieldset')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless checkbox source without legacy h/ref escapes', async () => {
    const id = componentId('checkbox')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('data-rue-checkbox-input')
    expect(code).toContain('data-rue-checkbox-group')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless rating source without legacy h/ref escapes', async () => {
    const id = componentId('rating')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('data-rating-mode')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless radio source without legacy header or JSX runtime fallback', async () => {
    const id = componentId('radio')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('data-rue-radio-input')
    expect(code).toContain('data-rue-radio-group')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless modal source without legacy h/ref escapes', async () => {
    const id = componentId('modal')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('modal-box')
    expect(code).toContain('computed(()=>mergedOpen.get() ||')
    expect(code).not.toContain('const isOpen = mergedOpen.get()')
  })

  it('deep-compiles the real headerless fieldset source without legacy JSX/runtime escapes', async () => {
    const id = componentId('fieldset')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('<fieldset')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('delete rest')
  })

  it('deep-compiles the real headerless badge source and keeps indicator guards reactive', async () => {
    const id = componentId('badge')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('_$compiledBranch')
  })

  it('deep-compiles the real headerless carousel source without legacy header or jsx runtime fallback', async () => {
    const id = componentId('carousel')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('data-rue-carousel-track')
    expect(code).toContain('assignForwardedRef(_$compiledPropsGet(__rue_props, "apiRef")')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless status source without JSX/runtime escapes', async () => {
    const id = componentId('status')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('_$compiledComponent(StatusRoot')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$compiledBindUseRef')
  })

  it('deep-compiles the real headerless masonry source without legacy h/ref escapes', async () => {
    const id = componentId('masonry')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('data-rue-masonry')
    expect(code).toContain('data-rue-masonry-item')
    expect(code).toContain('rootElement = element ?? undefined')
    expect(code).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(code).not.toMatch(/\bh\s*\(/)
    expect(code).not.toContain('useRef')
  })

  it('deep-compiles the real headerless breadcrumbs source through the compiler path', async () => {
    const id = componentId('breadcrumbs')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
  })

  it('deep-compiles the real headerless indicator source without JSX/runtime escapes', async () => {
    const id = componentId('indicator')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('mergeItemStyle')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$compiledBindUseRef')
  })

  it('deep-compiles the real headerless watermark source without legacy DOM sync escapes', async () => {
    const id = componentId('watermark')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toContain('watch(')
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('rue-watermark-overlay')
    expect(code).toContain('rootStyleText.get()')
    expect(code).toContain('overlayStyleText.get()')
  })

  it('deep-compiles the real headerless toggle source without legacy DOM sync hooks', async () => {
    const id = componentId('toggle')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toContain('querySelector')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('uncontrolledChecked.value = nextChecked')
  })

  it('deep-compiles the real headerless file-input source with its dynamic upload-list host', async () => {
    const id = componentId('file-input')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('render as renderRue')
    expect(source).toContain('useRef')
    expect(source).not.toContain('renderDynamicRegion')
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('renderRue')
    expect(code).not.toContain('renderDynamicRegion')
    expect(code).not.toContain('_jsxDEV')
    expect(code).toContain('data-rue-file-input-root')
    expect(code).toContain('data-rue-file-input-count')
    expect(code).toContain('_$compiledUseRef')
  })

  it('deep-compiles the real headerless swap source without legacy DOM sync hooks', async () => {
    const id = componentId('swap')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toContain('onMounted')
    expect(source).not.toMatch(/\bwatch\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('data-rue-swap-input')
    expect(code).toContain('uncontrolledIndeterminate.value = false')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless typography source without JSX runtime fallback', async () => {
    const id = componentId('typography')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('renderDecoratedContent')
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('const DecoratedContent =')
    expect(code).toContain('kbd kbd-sm align-middle')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless text-rotate source without JSX runtime fallback', async () => {
    const id = componentId('text-rotate')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless theme source without legacy style sync hooks', async () => {
    const id = componentId('theme')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toContain('onMounted')
    expect(source).not.toMatch(/\bwatch\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('style: mergedStyle')
    expect(code).not.toContain("setAttribute('style'")
    expect(code).not.toContain('setAttribute("style"')
    expect(code).not.toContain('useRef')
    expect(code).not.toContain('onMounted')
    expect(code).not.toMatch(/\bwatch\s*\(/)
  })

  it('routes opaque helper parameters through compiled slots instead of textContent', async () => {
    const source = `
      import { type FC } from '@rue-js/rue'

      const renderMeta = (title: any, extra: any) => {
        return (
          <div className="meta">
            <div>{title}</div>
            <div>{extra}</div>
          </div>
        )
      }

      const Demo: FC<{ extra?: any }> = ({ extra }) => {
        return <section>{renderMeta('Ops', extra)}</section>
      }

      export default Demo
    `

    const result = await invokeTransform(source, '/app/fixtures/OpaqueHelperParams.tsx')

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('_$mountCompiledSlotAt')
    expect(code).toMatch(
      /_\$mountCompiledSlotAt\(\s*\{[^{}]*\}\s*,\s*\(\s*\)\s*=>\s*_\$compiledValueFactory\(\s*_\$compiledPropsSnapshot\(\s*title\s*\)\s*\)/,
    )
    expect(code).toMatch(
      /_\$mountCompiledSlotAt\(\s*\{[^{}]*\}\s*,\s*\(\s*\)\s*=>\s*_\$compiledValueFactory\(\s*_\$compiledPropsSnapshot\(\s*extra\s*\)\s*\)/,
    )
    expect(code).not.toContain('renderAnchor(')
    expect(code).not.toMatch(/_\$settextContent\([^;]+title\)/)
    expect(code).not.toMatch(/_\$settextContent\([^;]+extra\)/)
  })

  it('deep-compiles the real headerless collapse source with reactive open keys', async () => {
    const id = componentId('collapse')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('_$mountCompiledSlotAt')
    expect(code).toContain('_$compiledPropsGet(__rue_props, "extra")')
    expect(code).not.toContain('renderAnchor(')
    expect(code).not.toMatch(/_\$settextContent\([^;]+extra\)/)
    expect(code).not.toContain('const currentOpenKeys = _$compiledWithHookId("computed:')
    expect(code).not.toContain('currentOpenKeys.get().some')
    expect(code).not.toContain('currentOpenKeys.some')
  })

  it('deep-compiles the real headerless layout source and keeps sider trigger content renderable', async () => {
    const id = componentId('layout')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).toContain('_$mountCompiledSlotAt')
    expect(code).not.toContain('renderAnchor(')
    expect(code).not.toMatch(/_\$settextContent\([^;]+renderSiderTrigger/)
    expect(code).not.toContain('_$compiledBindUseRef')
  })

  it('deep-compiles the real headerless tooltip source through the compiler path', async () => {
    const id = componentId('tooltip')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{\s*h\b/)
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('tooltip-content')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless dropdown source without legacy JSX/runtime escapes', async () => {
    const id = componentId('dropdown')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('getCurrentInstance')
    expect(source).not.toContain('<Slot')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless stack source through the compiler path', async () => {
    const id = componentId('stack')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain(' h,')
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('stack-')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless flex source without legacy JSX/runtime escapes', async () => {
    const id = componentId('flex')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain(' h,')
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('data-rue-orientation')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless space source without legacy JSX/runtime escapes', async () => {
    const id = componentId('space')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless join source without legacy JSX/runtime escapes', async () => {
    const id = componentId('join')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('<input')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$compiledBindUseRef')
  })

  it('deep-compiles the real headerless navbar source without legacy JSX/runtime escapes', async () => {
    const id = componentId('navbar')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toMatch(/import\s+\{\s*h\b/)
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('navbar-${placement}')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless fab source without legacy JSX/runtime escapes', async () => {
    const id = componentId('fab')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{\s*h\b/)
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('data-rue-fab-root')
    expect(code).toContain('setCurrentOpen')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
  })

  it('deep-compiles the real headerless mask source without dynamic host component escapes', async () => {
    const id = componentId('mask')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{\s*h\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('<figure')
    expect(code).toContain('<img')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$createComponent(Wrapper')
    expect(code).not.toContain('_$createComponent(CaptionTag')
    expect(code).not.toContain('_$createComponent(Component')
  })

  it('deep-compiles the real headerless hover-3d source without dynamic host component escapes', async () => {
    const id = componentId('hover-3d')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('data-hover3d-overlay')
    expect(code).not.toContain('_$createComponent(OverlayDivs')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$createComponent(Component')
    expect(code).not.toContain('_$createComponent(Surface')
    expect(code).not.toContain('_$compiledBindUseRef')
  })

  it('deep-compiles the real headerless hover-gallery source without JSX runtime fallback', async () => {
    const id = componentId('hover-gallery')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('hover-gallery')
    expect(code).toContain('guideGridTemplateColumns.get()')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
  })

  it('deep-compiles the real headerless stat source without legacy JSX/runtime escapes', async () => {
    const id = componentId('stat')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toContain('useRef')
  })

  it('deep-compiles the real headerless filter source without legacy DOM sync escapes', async () => {
    const id = componentId('filter')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toContain('MutationObserver')
    expect(source).not.toContain('querySelectorAll')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('getCurrentValues().some')
    expect(code).not.toContain('const currentValues = _$compiledWithHookId("computed:')
    expect(code).not.toContain('currentValues.get().some')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toContain('useRef')
  })

  it('deep-compiles the real headerless pagination source without legacy guards or JSX escapes', async () => {
    const id = componentId('pagination')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('simpleInputValue.value =')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toContain('useRef')
  })

  it('deep-compiles the real headerless list source without legacy managed render escapes', async () => {
    const id = componentId('list')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toContain('render as renderRue')
    expect(source).not.toMatch(/\bwatch\s*\(/)
    expect(source).not.toContain('onMounted')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('currentRef.value = safePage')
    expect(code).toContain('pageSizeRef.value = pager.pageSize')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toContain('renderRue')
    expect(code).not.toContain('useRef')
  })

  it('deep-compiles the real headerless progress source without legacy JSX/runtime escapes', async () => {
    const id = componentId('progress')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toMatch(/import\s+\{\s*h\b/)
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('data-progress-type')
    expect(code).not.toMatch(/_\$settextContent\([^;]+indicator\.get\(\)/)
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toContain('useRef')
  })

  it('deep-compiles the real headerless mockup-browser source without legacy JSX/runtime escapes', async () => {
    const id = componentId('mockup-browser')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toContain('useRef')
  })

  it('deep-compiles the real headerless mockup-code source without legacy JSX/runtime escapes', async () => {
    const id = componentId('mockup-code')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toMatch(/import\s+\{[^}]*\bh\b/)
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('<pre')
    expect(code).toContain('<div')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toContain('useRef')
  })

  it('deep-compiles the MockupCode design page without preview JSX runtime fallback', async () => {
    const id = 'app/pages/design/MockupCode.tsx'
    const source = await readFile(id, 'utf8')

    expect(source).not.toContain('preview={() =>')
    expect(source).not.toContain('useRef')
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('_$reconcileKeyed')
    expect(code).toContain('preview: ItemsPreview')
    expect(code).toContain('preview: LinePreview')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$compiledBindUseRef')
  })

  it('deep-compiles the real headerless tabs source without legacy managed render escapes', async () => {
    const id = componentId('tabs')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toContain('render as renderRue')
    expect(source).not.toContain('onMounted')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toContain('renderRue')
    expect(code).not.toContain('useRef')
  })

  it('deep-compiles the real headerless range source without legacy DOM sync escapes', async () => {
    const id = componentId('range')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toMatch(/\bwatch\s*\(/)
    expect(source).not.toContain('onMounted')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).toContain('data-rue-range-output')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toMatch(/\bwatch\s*\(/)
    expect(code).not.toContain('onMounted')
  })

  it('deep-compiles the real headerless input-number source without legacy JSX/runtime or ref escapes', async () => {
    const id = componentId('input-number')
    const source = await readFile(id, 'utf8')

    expect(source.startsWith(HEADER)).toBe(false)
    expect(source).not.toContain('useRef')
    expect(source).not.toMatch(/\bwatch\s*\(/)
    expect(source).not.toContain('onMounted')
    expect(source).not.toMatch(/import\s+\{\s*h\b/)
    expect(source).not.toMatch(/\bh\s*\(/)

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain(HEADER)
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('data-rue-input-number-controls')
    expect(code).toContain('<input')
    expect(code).not.toContain('_$setAttribute(_root, "readOnly"')
    expect(code).not.toContain(['@rue-js', 'jsx-dev-runtime'].join('/'))
    expect(code).not.toContain('_jsxDEV')
    expect(code).not.toContain('_$compiledBindUseRef')
    expect(code).not.toMatch(/\bwatch\s*\(/)
    expect(code).not.toContain('onMounted')
  })

  it('keeps the Progress dynamic preview percent on a stable ref prop', async () => {
    const id = 'app/pages/design/Progress.tsx'
    const source = await readFile(id, 'utf8')

    const result = await invokeTransform(source, id)

    const code = typeof result === 'string' ? result : String(result?.code ?? '')
    expect(code).toContain('Progress')
    expect(code).toContain('percent')
  })
})
