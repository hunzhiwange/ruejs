import { describe, expect, it, vi } from 'vitest'
import { createDOMPropsCore } from '../src/client-mount-core'
import { _$compiledSpreadAttributes, spreadAttributes } from '../src/compiled-dom-bindings'
import {
  applyDOMRef,
  patchDOMProps,
  setDOMAttribute,
  setDOMClassName,
  setDOMInnerHTML,
  setDOMStyle,
} from '../src/dom/props'
import { flush } from './page-test-utils'

const clientProps = createDOMPropsCore({
  addEventListener: (element, event, handler) => element.addEventListener(event, handler),
})

const readElementState = (element: HTMLElement) => ({
  className: element.getAttribute('class'),
  color: element.style.color,
  backgroundColor: element.style.backgroundColor,
  tone: element.style.getPropertyValue('--tone'),
  title: element.getAttribute('title'),
  html: element.innerHTML,
})

describe('spreadAttributes', () => {
  it.each([
    [
      'static setters',
      (element: HTMLElement, props: Record<string, unknown>) => {
        setDOMClassName(element, props.className)
        setDOMStyle(element, props.style)
        setDOMAttribute(element, 'title', props.title)
        setDOMInnerHTML(element, (props.dangerouslySetInnerHTML as any).__html)
        applyDOMRef(props.ref, element)
      },
    ],
    [
      'client mount',
      (element: HTMLElement, props: Record<string, unknown>) => {
        clientProps.applyDomElementProps(element as any, props)
      },
    ],
    [
      'hydration patch',
      (element: HTMLElement, props: Record<string, unknown>) => {
        patchDOMProps(element, props)
      },
    ],
    [
      'compiled spread',
      (element: HTMLElement, props: Record<string, unknown>) => {
        _$compiledSpreadAttributes(element, props)
      },
    ],
  ] as const)(
    'applies the same class/style/attribute/innerHTML/ref result through %s',
    (_name, apply) => {
      const element = document.createElement('section')
      const ref = { value: null as HTMLElement | null }

      apply(element, {
        className: 'card',
        style: { color: 'red', '--tone': 'warm' },
        title: 'hello',
        dangerouslySetInnerHTML: { __html: '<span>content</span>' },
        ref,
      })

      expect(readElementState(element)).toEqual({
        className: 'card',
        color: 'red',
        backgroundColor: '',
        tone: 'warm',
        title: 'hello',
        html: '<span>content</span>',
      })
      expect(ref.value).toBe(element)
    },
  )

  it.each([
    [
      'hydration patch',
      (element: HTMLElement, next: Record<string, unknown>, previous: Record<string, unknown>) => {
        patchDOMProps(element, next, previous)
      },
    ],
    [
      'compiled spread',
      (element: HTMLElement, next: Record<string, unknown>) => {
        let current = next
        const apply = _$compiledSpreadAttributes(element, () => current)
        return (updated: Record<string, unknown>) => {
          current = updated
          apply()
        }
      },
    ],
  ] as const)(
    'cleans replaced style, event, ref, property and attributes through %s',
    (_name, patch) => {
      const element = document.createElement('input')
      const firstRef = { value: null as HTMLInputElement | null }
      const click = vi.fn()
      const previous = {
        className: 'field',
        style: { color: 'red', backgroundColor: 'blue', '--tone': 'warm' },
        title: 'hello',
        value: 'first',
        checked: true,
        onClick: click,
        ref: firstRef,
      }
      const next = {
        className: 'updated',
        style: { color: 'green' },
      }

      const update = patch(element, previous, {})
      if (typeof update === 'function') update(next)
      else patch(element, next, previous)
      element.click()

      expect(readElementState(element)).toEqual({
        className: 'updated',
        color: 'green',
        backgroundColor: '',
        tone: '',
        title: null,
        html: '',
      })
      expect(element.value).toBe('')
      expect(element.checked).toBe(false)
      expect(firstRef.value).toBeNull()
      expect(click).not.toHaveBeenCalled()
    },
  )

  it.each([
    [
      'shared patch',
      (element: HTMLElement, next: Record<string, unknown>, previous: Record<string, unknown>) => {
        patchDOMProps(element, next, previous)
      },
    ],
    [
      'compiled spread',
      (element: HTMLElement, next: Record<string, unknown>) => {
        let current = next
        const apply = _$compiledSpreadAttributes(element, () => current)
        return (updated: Record<string, unknown>) => {
          current = updated
          apply()
        }
      },
    ],
  ] as const)(
    'keeps custom-element property notification and list/form attributes through %s',
    (_name, patch) => {
      const custom = document.createElement('x-props-consistency')
      const sync = vi.fn()
      ;(custom as any).__rue_custom_element_sync_props__ = sync
      const payload = { id: 1 }

      const update = patch(custom, { payload }, {})
      expect((custom as any).payload).toBe(payload)
      expect(sync).toHaveBeenCalledTimes(1)

      if (typeof update === 'function') update({})
      else patch(custom, {}, { payload })
      expect(Object.prototype.hasOwnProperty.call(custom, 'payload')).toBe(false)
      expect(sync).toHaveBeenCalledTimes(2)

      const input = document.createElement('input')
      const button = document.createElement('button')
      patch(input, { list: 'choices' }, {})
      patch(button, { form: 'editor' }, {})
      expect(input.getAttribute('list')).toBe('choices')
      expect(button.getAttribute('form')).toBe('editor')
    },
  )

  it('keeps independent spread calls on the same element from removing each other', async () => {
    const el = document.createElement('label')

    spreadAttributes(el as any, { 'data-testid': 'root', title: 'Root' })
    spreadAttributes(el as any, {
      'aria-required': undefined,
      'aria-invalid': undefined,
    })

    expect(el.getAttribute('data-testid')).toBe('root')
    expect(el.getAttribute('title')).toBe('Root')
    expect(el.hasAttribute('aria-required')).toBe(false)

    await flush()

    spreadAttributes(el as any, { 'aria-required': 'true', 'aria-invalid': undefined })

    expect(el.getAttribute('data-testid')).toBe('root')
    expect(el.getAttribute('aria-required')).toBe('true')
    expect(el.hasAttribute('aria-invalid')).toBe(false)
  })

  it('still removes stale keys for a single spread source', async () => {
    const el = document.createElement('button')

    spreadAttributes(el as any, { title: 'Save', 'data-state': 'ready' })
    expect(el.getAttribute('title')).toBe('Save')
    expect(el.getAttribute('data-state')).toBe('ready')

    await flush()

    spreadAttributes(el as any, { 'data-state': 'done' })

    expect(el.hasAttribute('title')).toBe(false)
    expect(el.getAttribute('data-state')).toBe('done')
  })

  it('drops stale records when later spread calls disappear', async () => {
    const el = document.createElement('label')

    spreadAttributes(el as any, { 'data-testid': 'root' })
    spreadAttributes(el as any, { title: 'Root title' })
    await flush()

    spreadAttributes(el as any, { 'data-testid': 'root' })
    await flush()

    expect(el.getAttribute('data-testid')).toBe('root')
    expect(el.hasAttribute('title')).toBe(false)
  })

  it('does not let a spread update overwrite explicitly excluded later attributes', async () => {
    const el = document.createElement('main')

    spreadAttributes(el as any, { title: 'spread-one', 'data-phase': 'one' }, ['title'])
    el.setAttribute('title', 'explicit')
    await flush()

    spreadAttributes(el as any, { title: 'spread-two', 'data-phase': 'two' }, ['title'])

    expect(el.getAttribute('title')).toBe('explicit')
    expect(el.getAttribute('data-phase')).toBe('two')
  })
})
