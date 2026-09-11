import { Template } from '@rue-js/rue'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from '@rue-js/rue'

import { render, setReactiveScheduling } from '@rue-js/rue'
import Modal from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  Modal.destroyAll()
  document.body.innerHTML = ''
})

describe('Modal', () => {
  it('renders when open is true', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () => render(<Modal open={true}>{'content'}</Modal>, c))

    await waitForContent(() => {
      const root = c.querySelector('.modal.modal-open') as HTMLElement
      expect(root).toBeTruthy()
      const box = c.querySelector('.modal-box') as HTMLElement
      expect(box).toBeTruthy()
      expect(box.textContent).toContain('content')
    })
  })

  it('does not render when open is false', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () => render(<Modal open={false}>{'content'}</Modal>, c))

    await waitForContent(() => {
      expect(c.querySelector('.modal')).toBeNull()
    })
  })

  it('renders title and actions through a footer slot', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Modal open={true} title={'Hello'}>
          <Template slot="footer">
            <button className="btn" id="act">
              Action
            </button>
            <button className="btn">关闭</button>
          </Template>
          <div id={'child'}>{'Body'}</div>
        </Modal>,
        c,
      ),
    )

    await waitForContent(() => {
      const title = c.querySelector('.modal-box') as HTMLElement
      expect(title.textContent).toContain('Hello')
      const actionBtn = c.querySelector('#act') as HTMLElement
      expect(actionBtn).toBeTruthy()
      const body = c.querySelector('#child') as HTMLElement
      expect(body).toBeTruthy()
      expect(body.textContent).toBe('Body')
      expect(c.querySelector('.modal-action')?.textContent).toContain('关闭')
    })
  })

  it('renders default footer buttons and supports confirm loading', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    const onOk = vi.fn()
    const onCancel = vi.fn()
    mountTestApp(c, () =>
      render(
        <Modal
          open={true}
          title={'Publish release'}
          okText={'发布'}
          cancelText={'返回'}
          confirmLoading={true}
          onOk={onOk}
          onCancel={onCancel}
        >
          {'x'}
        </Modal>,
        c,
      ),
    )

    await waitForContent(() => {
      const footerButtons = Array.from(
        c.querySelectorAll('.modal-action .btn'),
      ) as HTMLButtonElement[]
      expect(footerButtons.length).toBe(2)
      expect(footerButtons[0]?.textContent).toContain('返回')
      expect(footerButtons[1]?.textContent).toContain('发布')
      expect(footerButtons[1]?.getAttribute('aria-busy')).toBe('true')
      footerButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onOk).toHaveBeenCalledTimes(0)
    })
  })

  it('triggers onClose from the default close button', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    const spy = vi.fn()
    mountTestApp(c, () =>
      render(
        <Modal open={true} onClose={spy}>
          {'x'}
        </Modal>,
        c,
      ),
    )

    await waitForContent(() => {
      const close = c.querySelector('.modal-action .btn') as HTMLButtonElement
      expect(close).toBeTruthy()
      close.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })

  it('respects maskClosable and keyboard toggles', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    const spy = vi.fn()
    mountTestApp(c, () =>
      render(
        <Modal open={true} onClose={spy} maskClosable={false} keyboard={false}>
          {'x'}
        </Modal>,
        c,
      ),
    )

    await waitForContent(() => {
      const root = c.querySelector('.modal') as HTMLElement
      expect(root).toBeTruthy()
      root.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(spy).toHaveBeenCalledTimes(0)
    })
  })

  it('can keep hidden content mounted with forceRender and destroyOnHidden=false', async () => {
    const c = mountContainer()
    const Demo = () => {
      const open = ref(false)
      return (
        <Modal open={open.value} forceRender destroyOnHidden={false} title="Draft">
          <textarea id="draft" defaultValue="hello" />
        </Modal>
      )
    }

    resetActiveRuntime()
    mountTestApp(c, () => render(<Demo />, c))

    await waitForContent(() => {
      const root = c.querySelector('.modal') as HTMLElement
      expect(root).toBeTruthy()
      expect(root.classList.contains('modal-open')).toBe(false)
      expect(root.getAttribute('aria-hidden')).toBe('true')
      expect(c.querySelector('#draft')).toBeTruthy()
    })
  })

  it('appends custom className to modal-box', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Modal open={true} className={'w-full'}>
          {'x'}
        </Modal>,
        c,
      ),
    )

    await waitForContent(() => {
      const box = c.querySelector('.modal-box') as HTMLElement
      expect(box.classList.contains('w-full')).toBe(true)
    })
  })

  it('renders semantic mask and wrapper hooks', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Modal
          open={true}
          title={'Styled modal'}
          onClose={vi.fn()}
          rootClassName={'root-prop'}
          rootStyle={{ paddingTop: '1px' }}
          wrapClassName={'wrap-prop'}
          wrapProps={{ className: 'wrap-extra', 'data-layout': 'shell' }}
          maskClassName={'mask-prop'}
          classNames={{
            root: 'root-slot',
            mask: 'mask-slot',
            wrapper: 'wrapper-slot',
            container: 'container-slot',
            box: 'box-slot',
            header: 'header-slot',
            title: 'title-slot',
            body: 'body-slot',
            footer: 'footer-slot',
            close: 'close-slot',
          }}
          styles={{
            mask: { opacity: 0.25 },
            wrapper: { alignItems: 'flex-start' },
            container: { maxWidth: '640px' },
            header: { color: 'rgb(255, 0, 0)' },
            title: { letterSpacing: '1px' },
            body: { minHeight: '80px' },
            footer: { justifyContent: 'center' },
            close: { color: 'rgb(0, 0, 255)' },
          }}
        >
          {'content'}
        </Modal>,
        c,
      ),
    )

    await waitForContent(() => {
      const root = c.querySelector('[data-rue-modal-root="true"]') as HTMLElement
      const mask = c.querySelector('[data-rue-modal-mask="true"]') as HTMLElement
      const wrapper = c.querySelector('[data-rue-modal-wrapper="true"]') as HTMLElement
      const container = c.querySelector('[data-rue-modal-container="true"]') as HTMLElement
      const header = c.querySelector('.header-slot') as HTMLElement
      const title = c.querySelector('.title-slot') as HTMLElement
      const body = c.querySelector('.body-slot') as HTMLElement
      const footer = c.querySelector('.footer-slot') as HTMLElement
      const close = c.querySelector('.close-slot') as HTMLElement

      expect(root.classList.contains('root-prop')).toBe(true)
      expect(root.classList.contains('root-slot')).toBe(true)
      expect(root.style.paddingTop).toBe('1px')
      expect(mask.classList.contains('mask-prop')).toBe(true)
      expect(mask.classList.contains('mask-slot')).toBe(true)
      expect(mask.style.opacity).toBe('0.25')
      expect(wrapper.classList.contains('wrap-prop')).toBe(true)
      expect(wrapper.classList.contains('wrap-extra')).toBe(true)
      expect(wrapper.classList.contains('wrapper-slot')).toBe(true)
      expect(wrapper.getAttribute('data-layout')).toBe('shell')
      expect(wrapper.style.alignItems).toBe('flex-start')
      expect(container.classList.contains('container-slot')).toBe(true)
      expect(container.style.maxWidth).toBe('640px')
      expect(header.style.color).toBe('rgb(255, 0, 0)')
      expect(title.style.letterSpacing).toBe('1px')
      expect(body.style.minHeight).toBe('80px')
      expect(footer.style.justifyContent).toBe('center')
      expect(close.style.color).toBe('rgb(0, 0, 255)')
    })
  })

  it('supports a footer slot and disables mask interaction when mask is false', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    const onOk = vi.fn()
    const onClose = vi.fn()
    mountTestApp(c, () =>
      render(
        <Modal open={true} mask={false} onOk={onOk} onClose={onClose}>
          <Template slot="footer">
            <div id="custom-footer">
              <button id="cancel-helper" onClick={onClose}>
                返回上一步
              </button>
              <button id="ok-helper" onClick={onOk}>
                立即发布
              </button>
            </div>
          </Template>
          {'content'}
        </Modal>,
        c,
      ),
    )

    await waitForContent(() => {
      expect(c.querySelector('[data-rue-modal-mask="true"]')).toBeNull()
      const wrapper = c.querySelector('[data-rue-modal-wrapper="true"]') as HTMLElement
      const customFooter = c.querySelector('#custom-footer') as HTMLElement
      const cancel = c.querySelector('#cancel-helper') as HTMLButtonElement
      const ok = c.querySelector('#ok-helper') as HTMLButtonElement

      wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(onClose).toHaveBeenCalledTimes(0)
      expect(customFooter.textContent).toContain('返回上一步')
      expect(customFooter.textContent).toContain('立即发布')

      cancel.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      ok.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onOk).toHaveBeenCalledTimes(1)
    })
  })

  it('renders loading skeleton and hides footer actions', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Modal open={true} title={'Loading modal'} loading={true} onClose={vi.fn()}>
          {'content'}
        </Modal>,
        c,
      ),
    )

    await waitForContent(() => {
      const loadingBody = c.querySelector('[data-rue-modal-loading="true"]') as HTMLElement
      const body = c.querySelector('.space-y-4') as HTMLElement
      expect(loadingBody).toBeTruthy()
      expect(body.getAttribute('aria-busy')).toBe('true')
      expect(c.querySelector('.modal-action')).toBeNull()
      expect(c.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
    })
  })

  it('teleports to a custom container when getContainer is provided', async () => {
    const c = mountContainer()
    const target = document.createElement('div')
    target.id = 'modal-target'
    document.body.appendChild(target)
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Modal open={true} title={'Portal modal'} getContainer={target}>
          {'content'}
        </Modal>,
        c,
      ),
    )

    await waitForContent(() => {
      expect(c.querySelector('.modal')).toBeNull()
      const teleportedRoot = target.querySelector('[data-rue-modal-root="true"]') as HTMLElement
      expect(teleportedRoot).toBeTruthy()
      expect(teleportedRoot.classList.contains('modal-open')).toBe(true)
      expect(target.textContent).toContain('Portal modal')
      expect(target.textContent).toContain('content')
    })
  })

  it('opens and closes a confirm dialog through the static api', async () => {
    resetActiveRuntime()
    const onOk = vi.fn()
    const afterClose = vi.fn()

    Modal.confirm({
      title: 'Delete draft?',
      content: 'This action cannot be undone.',
      okText: 'Delete',
      cancelText: 'Back',
      onOk,
      afterClose,
    })

    await waitForContent(() => {
      const root = document.body.querySelector('[data-rue-modal-api-type="confirm"]') as HTMLElement
      expect(root).toBeTruthy()
      expect(root.textContent).toContain('Delete draft?')
      expect(root.textContent).toContain('This action cannot be undone.')
    })

    const footerButtons = Array.from(
      document.body.querySelectorAll('[data-rue-modal-api-type="confirm"] .modal-action .btn'),
    ) as HTMLButtonElement[]
    expect(footerButtons.length).toBe(2)
    expect(footerButtons[0]?.textContent).toContain('Back')
    expect(footerButtons[1]?.textContent).toContain('Delete')

    footerButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      expect(onOk).toHaveBeenCalledTimes(1)
      expect(afterClose).toHaveBeenCalledTimes(1)
      expect(document.body.querySelector('[data-rue-modal-api-type="confirm"]')).toBeNull()
    })
  })

  it('updates and destroys a static modal instance', async () => {
    resetActiveRuntime()

    const modal = Modal.info({
      title: 'Preparing',
      content: 'Generating preview...',
    })

    await waitForContent(() => {
      expect(document.body.textContent).toContain('Preparing')
      expect(document.body.textContent).toContain('Generating preview...')
    })

    modal.update(prev => ({
      title: `${prev.title} ready`,
      content: 'Preview is ready.',
    }))

    await waitForContent(() => {
      expect(document.body.textContent).toContain('Preparing ready')
      expect(document.body.textContent).toContain('Preview is ready.')
    })

    modal.destroy()

    await waitForContent(() => {
      expect(document.body.querySelector('[data-rue-modal-api-type="info"]')).toBeNull()
    })
  })

  it('keeps a static confirm dialog open while onOk promise is pending', async () => {
    resetActiveRuntime()
    let resolveOk: () => void = () => {}
    const pending = new Promise<void>(resolve => {
      resolveOk = resolve
    })

    Modal.confirm({
      title: 'Publish release?',
      content: 'The OK button should enter loading state.',
      onOk: () => pending,
    })

    await waitForContent(() => {
      const root = document.body.querySelector('[data-rue-modal-api-type="confirm"]') as HTMLElement
      expect(root).toBeTruthy()
    })

    const footerButtons = Array.from(
      document.body.querySelectorAll('[data-rue-modal-api-type="confirm"] .modal-action .btn'),
    ) as HTMLButtonElement[]
    const okButton = footerButtons[1]
    okButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const currentButtons = Array.from(
        document.body.querySelectorAll('[data-rue-modal-api-type="confirm"] .modal-action .btn'),
      ) as HTMLButtonElement[]
      expect(currentButtons[1]?.getAttribute('aria-busy')).toBe('true')
      expect(document.body.querySelector('[data-rue-modal-api-type="confirm"]')).toBeTruthy()
    })

    resolveOk()
    await Promise.resolve()

    await waitForContent(() => {
      expect(document.body.querySelector('[data-rue-modal-api-type="confirm"]')).toBeNull()
    })
  })

  it('destroys all static modal dialogs', async () => {
    resetActiveRuntime()

    Modal.warning({ title: 'First', content: 'Warning content' })
    Modal.error({ title: 'Second', content: 'Error content' })

    await waitForContent(() => {
      expect(document.body.querySelectorAll('[data-rue-modal-api-type]').length).toBe(2)
    })

    Modal.destroyAll()

    await waitForContent(() => {
      expect(document.body.querySelectorAll('[data-rue-modal-api-type]').length).toBe(0)
    })
  })
})
