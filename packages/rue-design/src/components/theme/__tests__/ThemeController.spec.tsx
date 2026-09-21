import { useThemeRuntime } from '../index'
import { ThemeProvider } from '../index'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, ref, render, setReactiveScheduling } from '@rue-js/rue'
import ThemeController, { ConfigProvider, theme as rueTheme, type ThemeDesignToken } from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ThemeController', () => {
  it('renders the base theme controller input and forwards checked/value', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ThemeController className="toggle" value="synthwave" checked={true} data-testid="theme" />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="theme"]') as HTMLInputElement
      expect(input.type).toBe('checkbox')
      expect(input.value).toBe('synthwave')
      expect(input.checked).toBe(true)
      expect(input.classList.contains('theme-controller')).toBe(true)
      expect(input.classList.contains('toggle')).toBe(true)
    })
  })

  it('supports radio mode and forwards native attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ThemeController
          type="radio"
          name="theme-radios"
          className="radio radio-sm"
          value="retro"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('input.theme-controller') as HTMLInputElement
      expect(input.type).toBe('radio')
      expect(input.name).toBe('theme-radios')
      expect(input.classList.contains('radio')).toBe(true)
      expect(input.classList.contains('radio-sm')).toBe(true)
    })
  })

  it('forwards change events', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(<ThemeController data-testid="controller" onChange={handleChange} />, container),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="controller"]')).toBeTruthy()
    })

    const input = container.querySelector('[data-testid="controller"]') as HTMLInputElement
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('computes merged design tokens with preset, algorithm, and override', () => {
    const token = ThemeController.getDesignToken({
      theme: 'garden',
      algorithm: [ThemeController.darkAlgorithm, ThemeController.compactAlgorithm],
      token: {
        colors: {
          primary: '#112233',
        },
      },
    })

    expect(token.themeName).toBe('garden')
    expect(token.resolvedThemeName).toBe('garden')
    expect(token.appearance).toBe('dark')
    expect(token.density).toBe('compact')
    expect(token.colors.primary).toBe('#112233')
    expect(token.radius.box).toBe('1rem')
    expect(token.size.field).toBe('0.21875rem')
  })

  it('computes component tokens with component algorithm semantics', () => {
    const mirrorPrimaryToSecondary = (inputToken: ThemeDesignToken): ThemeDesignToken => ({
      ...inputToken,
      colors: {
        ...inputToken.colors,
        secondary: inputToken.colors.primary,
      },
      radius: { ...inputToken.radius },
      size: { ...inputToken.size },
      spacing: { ...inputToken.spacing },
      typography: { ...inputToken.typography },
      shadow: { ...inputToken.shadow },
    })

    const disabledAlgorithmToken = ThemeController.getComponentDesignToken('Button', {
      algorithm: mirrorPrimaryToSecondary,
      components: {
        Button: {
          colors: {
            primary: '#aa0000',
          },
        },
      },
    })
    const enabledAlgorithmToken = ThemeController.getComponentDesignToken('Button', {
      algorithm: mirrorPrimaryToSecondary,
      components: {
        Button: {
          algorithm: true,
          colors: {
            primary: '#aa0000',
          },
        },
      },
    })

    expect(disabledAlgorithmToken.colors.primary).toBe('#aa0000')
    expect(disabledAlgorithmToken.colors.secondary).toBe('#2563eb')
    expect(enabledAlgorithmToken.colors.primary).toBe('#aa0000')
    expect(enabledAlgorithmToken.colors.secondary).toBe('#aa0000')
  })

  it('exposes component CSS variables and scoped component style text', () => {
    const runtime = ThemeController.useToken({
      theme: 'garden',
      components: {
        Button: {
          selector: '.demo-button',
          colors: {
            primary: '#123456',
          },
          radius: {
            field: '999px',
          },
        },
        Card: {
          selector: '.demo-card',
          radius: {
            box: '2rem',
          },
        },
      },
    })

    expect(runtime.components.Button.colors.primary).toBe('#123456')
    expect(runtime.componentCssVariables.Button['--color-primary']).toBe('#123456')
    expect(runtime.componentCssVariables.Button['--radius-field']).toBe('999px')
    expect(runtime.components.Card.radius.box).toBe('2rem')
    expect(runtime.componentStyleText).toContain(
      `[data-rue-theme-scope="${runtime.scopeId}"] :where(.demo-button)`,
    )
    expect(runtime.componentStyleText).toContain('--color-primary: #123456')
    expect(runtime.componentStyleText).toContain(':where(.demo-card)')
    expect(runtime.componentStyleText).toContain('--radius-box: 2rem')
  })

  it('renders a scoped provider and exposes runtime token data to render props', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ThemeProvider
          data-testid="theme-scope"
          theme="retro"
          token={{
            colors: {
              primary: '#445566',
            },
          }}
        >
          <ThemeSummary8 />
        </ThemeProvider>,
        container,
      ),
    )

    await waitForContent(() => {
      const scope = container.querySelector('[data-testid="theme-scope"]') as HTMLElement
      const summary = container.querySelector('[data-testid="theme-summary"]')

      expect(scope.getAttribute('data-theme')).toBe('retro')
      expect(scope.getAttribute('data-rue-theme')).toBe('retro')
      expect(scope.style.color).toBe('rgb(63, 44, 31)')
      expect(scope.style.getPropertyValue('--color-primary')).toBe('#445566')
      expect(scope.style.getPropertyValue('--radius-box')).toBe('1.4rem')
      expect(summary?.textContent).toContain('retro|#445566|light')
    })
  })

  it('renders scoped component token CSS inside the provider', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ThemeProvider
          data-testid="component-token-scope"
          theme="night"
          components={{
            Button: {
              selector: '.demo-button',
              colors: {
                primary: '#ff8800',
                primaryContent: '#1c0b00',
              },
              radius: {
                field: '999px',
              },
            },
            Card: {
              selector: '.demo-card',
              radius: {
                box: '2rem',
              },
            },
          }}
        >
          <ThemeSummary7 />
        </ThemeProvider>,
        container,
      ),
    )

    await waitForContent(() => {
      const scope = container.querySelector('[data-testid="component-token-scope"]') as HTMLElement
      const style = scope.querySelector('style[data-rue-theme-components]') as HTMLStyleElement
      const button = container.querySelector('[data-testid="component-button"]')
      const card = container.querySelector('[data-testid="component-card"]')

      expect(scope.getAttribute('data-rue-theme-scope')).toBeTruthy()
      expect(style?.textContent).toContain(':where(.demo-button)')
      expect(style?.textContent).toContain('--color-primary: #ff8800')
      expect(style?.textContent).toContain('--radius-field: 999px')
      expect(style?.textContent).toContain(':where(.demo-card)')
      expect(style?.textContent).toContain('--radius-box: 2rem')
      expect(button?.textContent).toBe('#ff8800')
      expect(card?.textContent).toBe('2rem')
    })
  })

  it('updates scoped component token CSS when a nested token changes', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const radius = ref('1.25rem')

    mountTestApp(container, () =>
      render(
        <ThemeProvider
          data-testid="reactive-component-token-scope"
          components={{
            Card: {
              selector: '.demo-card',
              radius: { box: radius.value },
            },
          }}
        >
          <div className="demo-card" />
        </ThemeProvider>,
        container,
      ),
    )

    const componentStyle = () =>
      container.querySelector(
        '[data-testid="reactive-component-token-scope"] style[data-rue-theme-components]',
      ) as HTMLStyleElement

    await waitForContent(() => {
      expect(componentStyle()?.textContent).toContain('--radius-box: 1.25rem')
    })

    radius.value = '2.5rem'

    await waitForContent(() => {
      expect(componentStyle()?.textContent).toContain('--radius-box: 2.5rem')
      expect(componentStyle()?.textContent).not.toContain('--radius-box: 1.25rem')
      const scope = container.querySelector(
        '[data-testid="reactive-component-token-scope"]',
      ) as HTMLElement
      expect(componentStyle()?.getAttribute('data-rue-theme-components')).toBe(
        scope.dataset.rueThemeScope,
      )
      expect(componentStyle()?.textContent).toContain(
        `[data-rue-theme-scope="${scope.dataset.rueThemeScope}"]`,
      )
    })

    radius.value = '1.2rem'

    await waitForContent(() => {
      const scope = container.querySelector(
        '[data-testid="reactive-component-token-scope"]',
      ) as HTMLElement
      expect(componentStyle()?.getAttribute('data-rue-theme-components')).toBe(
        scope.dataset.rueThemeScope,
      )
      expect(componentStyle()?.textContent).toContain('--radius-box: 1.2rem')
      expect(componentStyle()?.textContent).toContain(
        `[data-rue-theme-scope="${scope.dataset.rueThemeScope}"]`,
      )
    })
  })

  it('keeps the provider scope stable when a computed component config changes', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const radius = ref('1.25rem')

    const ComputedComponentTokens = () => {
      const components = computed(() => ({
        Card: {
          selector: '.demo-card',
          radius: { box: radius.value },
        },
      }))

      return (
        <ThemeProvider data-testid="computed-component-token-scope" components={components.get()}>
          <div className="demo-card" data-testid="computed-component-token-card" />
        </ThemeProvider>
      )
    }

    mountTestApp(container, () => render(<ComputedComponentTokens />, container))

    const scope = container.querySelector(
      '[data-testid="computed-component-token-scope"]',
    ) as HTMLElement
    const card = container.querySelector(
      '[data-testid="computed-component-token-card"]',
    ) as HTMLElement
    const initialScopeId = scope.dataset.rueThemeScope

    await waitForContent(() => {
      expect(getComputedStyle(card).getPropertyValue('--radius-box')).toBe('1.25rem')
    })

    radius.value = '2.5rem'

    await waitForContent(() => {
      const style = scope.querySelector('style[data-rue-theme-components]') as HTMLStyleElement
      expect(scope.dataset.rueThemeScope).toBe(initialScopeId)
      expect(style.getAttribute('data-rue-theme-components')).toBe(initialScopeId)
      expect(style.textContent).toContain(
        `[data-rue-theme-scope="${initialScopeId}"] :where(.demo-card)`,
      )
      expect(getComputedStyle(card).getPropertyValue('--radius-box')).toBe('2.5rem')
    })
  })

  it('preserves render-prop content while scoped component tokens update', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const radius = ref('1.25rem')

    mountTestApp(container, () =>
      render(
        <ThemeProvider
          data-testid="stable-themed-scope"
          components={{ Card: { selector: '.demo-card', radius: { box: radius.value } } }}
          render={runtime => (
            <div data-testid="stable-themed-content">{runtime.components.Card.radius.box}</div>
          )}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="stable-themed-content"]')?.textContent).toBe(
        '1.25rem',
      )
    })
    const initialContent = container.querySelector('[data-testid="stable-themed-content"]')
    const initialScope = container.querySelector('[data-testid="stable-themed-scope"]')

    radius.value = '2.5rem'

    await waitForContent(() => {
      const currentContent = container.querySelector('[data-testid="stable-themed-content"]')
      const currentScope = container.querySelector('[data-testid="stable-themed-scope"]')
      expect(currentScope).toBe(initialScope)
      expect(currentContent).toBe(initialContent)
      expect(currentContent?.textContent).toBe('2.5rem')
    })
  })

  it('derives nested provider tokens from an explicit parent baseToken', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ThemeProvider theme="garden">
          <ThemeSummary6 />
        </ThemeProvider>,
        container,
      ),
    )

    await waitForContent(() => {
      const summary = container.querySelector('[data-testid="nested-base-token-summary"]')

      expect(summary?.textContent).toContain('garden|#2f855a|#202020')
    })
  })

  it('lets descendant components read the nearest provider runtime with useToken', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const ThemeRuntimeReader = () => {
      const runtime = ThemeController.useToken()
      return (
        <span data-testid="theme-runtime-reader">
          {String(runtime.theme)}|{String(runtime.token.colors.primary)}
        </span>
      )
    }

    mountTestApp(container, () =>
      render(
        <ThemeProvider theme="garden">
          <ThemeRuntimeReader />
        </ThemeProvider>,
        container,
      ),
    )

    await waitForContent(() => {
      const summary = container.querySelector('[data-testid="theme-runtime-reader"]')

      expect(summary?.textContent).toContain('garden|#2f855a')
    })
  })

  it('inherits token context for directly nested providers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ThemeProvider theme="garden">
          <ThemeProvider
            data-testid="direct-nested-scope"
            token={{
              colors: {
                secondary: '#202020',
              },
            }}
          >
            <ThemeSummary4 />
          </ThemeProvider>
        </ThemeProvider>,
        container,
      ),
    )

    await waitForContent(() => {
      const summary = container.querySelector('[data-testid="direct-nested-summary"]')

      expect(summary?.textContent).toContain('garden|#2f855a|#202020')
    })
  })

  it('supports cssVar prefix/key aliases and static style extraction', () => {
    const runtime = ThemeController.useToken({
      cssVar: {
        key: 'brand-alpha',
        prefix: 'brand',
      },
      token: {
        colors: {
          primary: '#445566',
        },
      },
      components: {
        Button: {
          colors: {
            primary: '#112233',
          },
        },
      },
    })
    const extractedStyle = ThemeController.extractStyle(
      {
        cssVar: {
          key: 'brand-alpha',
          prefix: 'brand',
        },
        token: {
          colors: {
            primary: '#445566',
          },
        },
        components: {
          Button: {
            colors: {
              primary: '#112233',
            },
          },
        },
      },
      {
        selector: '.brand-alpha-theme',
      },
    )

    expect(runtime.scopeId).toBe('rue-brand-alpha')
    expect(runtime.cssVariables['--color-primary']).toBe('#445566')
    expect(runtime.cssVariables['--brand-color-primary']).toBe('#445566')
    expect(runtime.componentCssVariables.Button['--brand-color-primary']).toBe('#112233')
    expect(extractedStyle).toContain('.brand-alpha-theme')
    expect(extractedStyle).toContain('--brand-color-primary: #445566')
    expect(extractedStyle).toContain('[data-rue-theme-scope="rue-brand-alpha"]')
    expect(extractedStyle).toContain('--brand-color-primary: #112233')
  })

  it('exposes hashId and a useToken tuple', async () => {
    const runtime = ThemeController.useToken({
      cssVar: {
        key: 'tuple-demo',
      },
    })
    const [tupleRuntime, tupleToken, tupleHashId] = ThemeController.useTokenTuple({
      cssVar: {
        key: 'tuple-demo',
      },
    })
    const unHashedRuntime = ThemeController.useToken({
      hashed: false,
    })

    expect(runtime.hashId).toBe('rue-theme-tuple-demo')
    expect(tupleRuntime.scopeId).toBe('rue-tuple-demo')
    expect(tupleToken.themeName).toBe('default')
    expect(tupleHashId).toBe('rue-theme-tuple-demo')
    expect(unHashedRuntime.hashId).toBe('')

    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ThemeProvider data-testid="hashed-scope" cssVar={{ key: 'tuple-demo' }} hashed={false} />,
        container,
      ),
    )

    await waitForContent(() => {
      const scope = container.querySelector('[data-testid="hashed-scope"]') as HTMLElement

      expect(scope.classList.contains('rue-theme-scope')).toBe(true)
      expect(scope.classList.contains('rue-theme-tuple-demo')).toBe(false)
      expect(scope.getAttribute('data-rue-theme-hashed')).toBe('false')
    })
  })

  it('exposes ConfigProvider and theme namespace aliases', async () => {
    const namespaceToken = rueTheme.useToken({
      cssVar: {
        key: 'namespace-demo',
      },
      token: {
        colors: {
          primary: '#334455',
        },
      },
    })

    expect(ThemeController.ConfigProvider).toBe(ConfigProvider)
    expect(ThemeController.theme).toBe(rueTheme)
    expect(namespaceToken.token.colors.primary).toBe('#334455')
    expect(namespaceToken.runtime.scopeId).toBe('rue-namespace-demo')
    expect(namespaceToken.hashId).toBe('rue-theme-namespace-demo')
    expect(rueTheme.getDesignToken({ theme: 'night' }).appearance).toBe('dark')

    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ConfigProvider
          data-testid="config-provider-scope"
          theme="garden"
          components={{
            Button: {
              colors: {
                primary: '#112233',
              },
            },
          }}
        >
          <ThemeSummary3 />
        </ConfigProvider>,
        container,
      ),
    )

    await waitForContent(() => {
      const scope = container.querySelector('[data-testid="config-provider-scope"]') as HTMLElement
      const summary = container.querySelector('[data-testid="config-provider-summary"]')

      expect(scope.getAttribute('data-rue-theme')).toBe('garden')
      expect(scope.classList.contains('rue-theme-scope')).toBe(true)
      expect(summary?.textContent).toContain('garden|#112233')
    })
  })

  it('keeps component tokens available when zeroRuntime suppresses generated style tags', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ThemeProvider
          data-testid="zero-runtime-scope"
          zeroRuntime={true}
          components={{
            Button: {
              colors: {
                primary: '#998877',
              },
            },
          }}
        >
          <ThemeSummary2 />
        </ThemeProvider>,
        container,
      ),
    )

    await waitForContent(() => {
      const scope = container.querySelector('[data-testid="zero-runtime-scope"]') as HTMLElement
      const style = scope.querySelector('style[data-rue-theme-components]')
      const summary = container.querySelector('[data-testid="zero-runtime-summary"]')

      expect(scope.getAttribute('data-rue-theme-zero-runtime')).toBe('true')
      expect(style).toBeNull()
      expect(summary?.textContent).toContain('zero|#998877')
    })
  })

  it('updates scoped provider attributes and CSS variables through JSX bindings', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const DynamicProvider = () => {
      const activeTheme = ref<'retro' | 'night'>('retro')

      return (
        <div>
          <button
            data-testid="switch-theme"
            onClick={() => {
              activeTheme.value = 'night'
            }}
          >
            Theme
          </button>
          <ThemeProvider
            data-testid="dynamic-scope"
            theme={activeTheme.value}
            style={{ borderColor: 'rgb(1, 2, 3)' }}
          >
            <ThemeSummary1 />
          </ThemeProvider>
        </div>
      )
    }

    mountTestApp(container, () => render(<DynamicProvider />, container))

    await waitForContent(() => {
      const scope = container.querySelector('[data-testid="dynamic-scope"]') as HTMLElement
      const summary = container.querySelector('[data-testid="dynamic-summary"]')

      expect(scope.getAttribute('data-theme')).toBe('retro')
      expect(scope.style.getPropertyValue('--color-primary')).toBe('#7b4f2a')
      expect(scope.style.color).toBe('rgb(63, 44, 31)')
      expect(scope.style.borderColor).toBe('rgb(1, 2, 3)')
      expect(summary?.textContent).toContain('retro|#7b4f2a')
    })

    const themeButton = container.querySelector('[data-testid="switch-theme"]') as HTMLButtonElement
    themeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const scope = container.querySelector('[data-testid="dynamic-scope"]') as HTMLElement

      expect(scope.getAttribute('data-theme')).toBe('night')
      expect(scope.style.getPropertyValue('--color-primary')).toBe('#60a5fa')
      expect(scope.style.color).toBe('rgb(226, 232, 240)')
      expect(scope.style.borderColor).toBe('rgb(1, 2, 3)')
    })
  })
})

const ThemeSummary1 = () => {
  const runtime = useThemeRuntime()
  return (
    <span data-testid="dynamic-summary">
      {String(runtime.get().theme)}|{String(runtime.get().token.colors.primary)}
    </span>
  )
}
const ThemeSummary2 = () => {
  const runtime = useThemeRuntime()
  return (
    <span data-testid="zero-runtime-summary">
      {String(
        `${runtime.get().zeroRuntime ? 'zero' : 'runtime'}|${runtime.get().components.Button.colors.primary}`,
      )}
    </span>
  )
}
const ThemeSummary3 = () => {
  const runtime = useThemeRuntime()
  return (
    <span data-testid="config-provider-summary">
      {String(runtime.get().theme)}|{String(runtime.get().components.Button.colors.primary)}
    </span>
  )
}
const ThemeSummary4 = () => {
  const runtime = useThemeRuntime()
  return (
    <span data-testid="direct-nested-summary">
      {String(
        `${runtime.get().theme}|${runtime.get().token.colors.primary}|${runtime.get().token.colors.secondary}`,
      )}
    </span>
  )
}
const ThemeSummary5 = () => {
  const runtime = useThemeRuntime()
  return (
    <span data-testid="nested-base-token-summary">
      {String(
        `${runtime.get().theme}|${runtime.get().token.colors.primary}|${runtime.get().token.colors.secondary}`,
      )}
    </span>
  )
}
const ThemeSummary6 = () => {
  const parentRuntime = useThemeRuntime()
  return (
    <ThemeProvider
      data-testid="nested-base-token-scope"
      baseToken={parentRuntime.get().token}
      token={{
        colors: {
          secondary: '#202020',
        },
      }}
    >
      <ThemeSummary5 />
    </ThemeProvider>
  )
}
const ThemeSummary7 = () => {
  const runtime = useThemeRuntime()
  return (
    <div>
      <button className="demo-button" data-testid="component-button">
        {String(runtime.get().components.Button.colors.primary)}
      </button>
      <div className="demo-card" data-testid="component-card">
        {String(runtime.get().components.Card.radius.box)}
      </div>
    </div>
  )
}
const ThemeSummary8 = () => {
  const runtime = useThemeRuntime()
  return (
    <div data-testid="theme-summary">
      {String(
        `${runtime.get().theme}|${runtime.get().token.colors.primary}|${runtime.get().token.appearance}`,
      )}
    </div>
  )
}
