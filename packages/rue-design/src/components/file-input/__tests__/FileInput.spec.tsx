import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import FileInput from '../index'
import type { FileInputFile } from '../index'
import {
  click,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

const assignFiles = (input: HTMLInputElement, files: File[]) => {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  })
}

const dispatchDrop = (target: Element, files: File[]) => {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    configurable: true,
    value: { files },
  })
  target.dispatchEvent(event)
}

describe('FileInput', () => {
  it('renders with the base class and enforces type=file', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    mountTestApp(container, () => render(<FileInput />, container))

    await waitForContent(() => {
      const element = container.querySelector('input.file-input') as HTMLInputElement
      expect(element).toBeTruthy()
      expect(element.type).toBe('file')
    })
  })

  it('applies color, size, and ghost modifiers', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    mountTestApp(container, () =>
      render(<FileInput variant="primary" size="lg" ghost />, container),
    )

    await waitForContent(() => {
      const element = container.querySelector('input.file-input') as HTMLInputElement
      expect(element.classList.contains('file-input-primary')).toBe(true)
      expect(element.classList.contains('file-input-lg')).toBe(true)
      expect(element.classList.contains('file-input-ghost')).toBe(true)
    })
  })

  it('applies semantic color classes from the color prop', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const colors = [
      'primary',
      'secondary',
      'accent',
      'neutral',
      'info',
      'success',
      'warning',
      'error',
    ] as const

    mountTestApp(container, () =>
      render(
        <div>
          {colors.map(color => (
            <FileInput color={color} />
          ))}
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const inputs = Array.from(container.querySelectorAll('input.file-input'))
      expect(inputs).toHaveLength(colors.length)
      colors.forEach((color, index) => {
        expect(inputs[index].classList.contains(`file-input-${color}`)).toBe(true)
      })
    })
  })

  it('applies semantic color classes in enhanced and dragger modes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <FileInput color="secondary" title="Enhanced color" buttonText="Choose" />
          <FileInput.Dragger color="accent" title="Drop color" />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Enhanced color')
      expect(container.textContent).toContain('Drop color')
      expect(container.querySelector('.btn-secondary')).toBeTruthy()
      expect(container.querySelector('.text-accent')).toBeTruthy()
      expect(
        Array.from(container.querySelectorAll('[class]')).some(element =>
          element.classList.contains('hover:border-accent/40'),
        ),
      ).toBe(true)
    })
  })

  it('forwards native attrs and appends className', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    mountTestApp(container, () =>
      render(
        <FileInput id="resume" accept=".pdf" multiple disabled className="w-full" />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('input.file-input') as HTMLInputElement
      expect(element.id).toBe('resume')
      expect(element.accept).toBe('.pdf')
      expect(element.multiple).toBe(true)
      expect(element.disabled).toBe(true)
      expect(element.classList.contains('w-full')).toBe(true)
    })
  })

  it('renders upload-style list and supports removing files', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleRemove = vi.fn()

    mountTestApp(container, () =>
      render(
        <FileInput
          defaultFileList={[
            {
              uid: 'resume',
              name: 'resume.pdf',
              status: 'done',
              description: '已同步',
            },
          ]}
          onRemove={file => {
            handleRemove(file.name)
          }}
          title="Upload assets"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('resume.pdf')
      expect(container.querySelector('button[aria-label="Remove resume.pdf"]')).toBeTruthy()
    })

    await click(container.querySelector('button[aria-label="Remove resume.pdf"]'))

    await waitForContent(() => {
      expect(container.textContent).not.toContain('resume.pdf')
    })

    expect(handleRemove).toHaveBeenCalledWith('resume.pdf')
  })

  it('supports beforeUpload ignore and maxCount in enhanced mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <FileInput
          title="Upload gallery"
          listType="picture"
          maxCount={1}
          beforeUpload={file => {
            if (file.name.endsWith('.txt')) {
              return FileInput.LIST_IGNORE
            }
            return true
          }}
          onChange={(info: any) => handleChange(info)}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('input[type="file"]')).toBeTruthy()
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    assignFiles(input, [
      new File(['image'], 'cover.png', { type: 'image/png' }),
      new File(['ignored'], 'notes.txt', { type: 'text/plain' }),
    ])
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(container.textContent).toContain('cover.png')
      expect(container.textContent).not.toContain('notes.txt')
    })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange.mock.calls[0][0].fileList).toHaveLength(1)
    expect(handleChange.mock.calls[0][0].file.name).toBe('cover.png')

    assignFiles(input, [new File(['new'], 'next.png', { type: 'image/png' })])
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(container.textContent).not.toContain('cover.png')
      expect(container.textContent).toContain('next.png')
    })

    expect(handleChange).toHaveBeenCalledTimes(2)
    expect(handleChange.mock.calls[1][0].fileList).toHaveLength(1)
    expect(handleChange.mock.calls[1][0].file.name).toBe('next.png')
  })

  it('forwards accept and ref to the enhanced native picker', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const inputRef = { current: undefined as HTMLInputElement | undefined }

    mountTestApp(container, () =>
      render(<FileInput title="Upload images" accept="image/png" ref={inputRef} />, container),
    )

    await waitForContent(() => {
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.accept).toBe('image/png')
      expect(input.hasAttribute('directory')).toBe(false)
      expect(input.hasAttribute('webkitdirectory')).toBe(false)
      expect(inputRef.current).toBe(input)
    })
  })

  it('only enables native directory picking when directory is true', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <FileInput title="Upload assets" />
          <FileInput title="Upload folder" directory />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelectorAll('input[type="file"]')).toHaveLength(2)
    })

    const [fileInput, directoryInput] = Array.from(
      container.querySelectorAll('input[type="file"]'),
    ) as HTMLInputElement[]

    expect(fileInput.hasAttribute('directory')).toBe(false)
    expect(fileInput.hasAttribute('webkitdirectory')).toBe(false)
    expect(directoryInput.hasAttribute('directory')).toBe(true)
    expect(directoryInput.hasAttribute('webkitdirectory')).toBe(true)
  })

  it('opens the enhanced native picker from the visible trigger button', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <FileInput title="Upload images" buttonText="Choose png" accept=".png,image/png" />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Choose png')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const inputClick = vi.spyOn(input, 'click').mockImplementation(() => {})
    const trigger = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('Choose png'),
    )

    expect(input.accept).toBe('.png,image/png')
    expect(trigger).toBeTruthy()

    await click(trigger as HTMLButtonElement)

    expect(inputClick).toHaveBeenCalledTimes(1)
  })

  it('previews controlled beforeUpload image files in an image window', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const fileList = ref<FileInputFile[]>([])
    const selectedFile = new File(['cover'], 'validated-cover.png', { type: 'image/png' })
    const previewDocument = {
      write: vi.fn(),
      close: vi.fn(),
    }
    const previewWindow = {
      document: previewDocument,
      location: { href: '' },
      opener: window,
    } as unknown as Window
    const openWindow = vi.spyOn(window, 'open').mockReturnValue(previewWindow)

    const ControlledValidationDemo = () => (
      <FileInput.Dragger
        accept="image/*"
        fileList={fileList.value}
        listType="picture"
        beforeUpload={file => (file.type.startsWith('image/') ? true : FileInput.LIST_IGNORE)}
        onChange={(info: any) => {
          fileList.value = info.fileList
        }}
      />
    )

    mountTestApp(container, () => render(<ControlledValidationDemo />, container))

    await waitForContent(() => {
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.accept).toBe('image/*')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    assignFiles(input, [selectedFile])
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(container.textContent).toContain('validated-cover.png')
      expect(
        container.querySelector('button[aria-label="Preview validated-cover.png"]'),
      ).toBeTruthy()
    })

    await click(container.querySelector('button[aria-label="Preview validated-cover.png"]'))

    await waitForContent(() => {
      expect(openWindow).toHaveBeenCalledWith('', '_blank')
      expect(previewDocument.write).toHaveBeenCalledTimes(1)
      expect(previewDocument.close).toHaveBeenCalledTimes(1)
    })

    const writtenHtml = previewDocument.write.mock.calls[0][0] as string
    expect(writtenHtml).toContain('<img')
    expect(writtenHtml).toContain('src="data:image/png')
    expect(writtenHtml).toContain('validated-cover.png')
    expect((previewWindow as any).opener).toBeNull()
  })

  it('adds dropped files in dragger mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <FileInput.Dragger
          multiple
          title="Drop attachments"
          onChange={(info: any) => handleChange(info)}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Drop attachments')
    })

    const dropTarget = container.querySelector('[role="button"]') as HTMLElement
    dispatchDrop(dropTarget, [new File(['issue'], 'issue.zip', { type: 'application/zip' })])

    await waitForContent(() => {
      expect(container.textContent).toContain('issue.zip')
    })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange.mock.calls[0][0].source).toBe('drop')
    expect(handleChange.mock.calls[0][0].file.name).toBe('issue.zip')
  })

  it('opens the native picker from the enhanced picture-list trigger', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<FileInput listType="picture" buttonText="Add image" />, container),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Add image')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const inputClick = vi.spyOn(input, 'click').mockImplementation(() => {})
    const trigger = Array.from(container.querySelectorAll('button')).find(element =>
      element.textContent?.includes('Add image'),
    )

    expect(trigger).toBeTruthy()
    await click(trigger as HTMLButtonElement)

    expect(inputClick).toHaveBeenCalledTimes(1)
  })

  it('opens the native picker from an empty picture-card trigger', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<FileInput listType="picture-card" buttonText="Add image" />, container),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Add image')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const inputClick = vi.spyOn(input, 'click').mockImplementation(() => {})
    const trigger = container.querySelector('[role="button"]')

    expect(trigger).toBeTruthy()
    await click(trigger as HTMLElement)

    expect(inputClick).toHaveBeenCalledTimes(1)
  })

  it('opens the native picker from the append picture-card trigger', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <FileInput
          listType="picture-card"
          maxCount={2}
          defaultFileList={[
            {
              uid: 'cover',
              name: 'cover.png',
              status: 'done',
              type: 'image/png',
              thumbUrl: 'https://example.test/cover.png',
            },
          ]}
          buttonText="Add image"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('cover.png')
      expect(container.textContent).toContain('Add image')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const inputClick = vi.spyOn(input, 'click').mockImplementation(() => {})
    const appendTrigger = Array.from(container.querySelectorAll('[role="button"]')).find(element =>
      element.textContent?.includes('Add image'),
    )

    expect(appendTrigger).toBeTruthy()
    await click(appendTrigger as HTMLElement)

    expect(inputClick).toHaveBeenCalledTimes(1)
  })

  it('adds selected files in picture-card mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <FileInput
          listType="picture-card"
          maxCount={2}
          buttonText="Add image"
          onChange={(info: any) => handleChange(info)}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Add image')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    assignFiles(input, [new File(['cover'], 'new-cover.png', { type: 'image/png' })])
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(container.textContent).toContain('new-cover.png')
    })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange.mock.calls[0][0].source).toBe('select')
    expect(handleChange.mock.calls[0][0].file.name).toBe('new-cover.png')
  })

  it('calls onPreview from upload list preview actions', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handlePreview = vi.fn()

    mountTestApp(container, () =>
      render(
        <FileInput
          defaultFileList={[
            {
              uid: 'cover',
              name: 'cover.png',
              status: 'done',
              type: 'image/png',
              thumbUrl: 'https://example.test/cover.png',
            },
          ]}
          listType="picture-card"
          onPreview={handlePreview}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('button[aria-label="Preview cover.png"]')).toBeTruthy()
    })

    await click(container.querySelector('button[aria-label="Preview cover.png"]'))

    expect(handlePreview).toHaveBeenCalledTimes(1)
    expect(handlePreview.mock.calls[0][0].name).toBe('cover.png')
  })

  it('keeps uncontrolled selected files when preview rerenders the parent', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const previewMessage = ref('idle')

    const PreviewRerenderDemo = () => (
      <div>
        <FileInput
          multiple
          defaultFileList={[
            {
              uid: 'seed',
              name: 'seed.pdf',
              status: 'done',
              description: 'seeded',
            },
          ]}
          title="Recommended upload-like"
          buttonText="Choose assets"
          showUploadList={{
            extra: (file: FileInputFile) => file.description ?? 'pending',
          }}
          onPreview={file => {
            previewMessage.value = `previewed ${file.name}`
          }}
        />
        <output>{previewMessage.value}</output>
      </div>
    )

    mountTestApp(container, () => render(<PreviewRerenderDemo />, container))

    await waitForContent(() => {
      expect(container.textContent).toContain('seed.pdf')
      expect(container.textContent).toContain('Choose assets')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    assignFiles(input, [new File(['cover'], 'fresh-cover.png', { type: 'image/png' })])
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(container.textContent).toContain('seed.pdf')
      expect(container.textContent).toContain('fresh-cover.png')
    })

    await click(container.querySelector('button[aria-label="Preview fresh-cover.png"]'))

    await waitForContent(() => {
      expect(container.textContent).toContain('previewed fresh-cover.png')
      expect(container.textContent).toContain('seed.pdf')
      expect(container.textContent).toContain('fresh-cover.png')
    })
  })

  it('keeps uncontrolled selected files when parent owns the preview message state', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const LocalMessageDemo = () => {
      const previewMessage = ref('idle')
      const defaultFileList = [
        {
          uid: 'seed',
          name: 'seed.pdf',
          status: 'done',
          description: 'seeded',
        },
      ] as FileInputFile[]

      return (
        <div>
          <FileInput
            multiple
            defaultFileList={defaultFileList.map(file => ({ ...file }))}
            title="Recommended upload-like"
            buttonText="Choose assets"
            showUploadList={{
              extra: (file: FileInputFile) => file.description ?? 'pending',
            }}
            onPreview={file => {
              previewMessage.value = `previewed ${file.name}`
            }}
          />
          <output>{previewMessage.value}</output>
        </div>
      )
    }

    mountTestApp(container, () => render(<LocalMessageDemo />, container))

    await waitForContent(() => {
      expect(container.textContent).toContain('seed.pdf')
      expect(container.textContent).toContain('Choose assets')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    assignFiles(input, [new File(['cover'], 'fresh-cover.png', { type: 'image/png' })])
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(container.textContent).toContain('seed.pdf')
      expect(container.textContent).toContain('fresh-cover.png')
    })

    await click(container.querySelector('button[aria-label="Preview fresh-cover.png"]'))

    await waitForContent(() => {
      expect(container.textContent).toContain('previewed fresh-cover.png')
      expect(container.textContent).toContain('seed.pdf')
      expect(container.textContent).toContain('fresh-cover.png')
    })
  })

  it('keeps uncontrolled selected files when onChange rerenders the parent', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const ChangeMessageDemo = () => {
      const changeMessage = ref('idle')
      const defaultFileList = [
        {
          uid: 'seed',
          name: 'seed.pdf',
          status: 'done',
          description: 'seeded',
        },
      ] as FileInputFile[]

      return (
        <div>
          <FileInput
            id="change-message-upload-like"
            multiple
            maxCount={3}
            accept=".pdf,.png,.mp4,application/pdf,image/png,video/mp4"
            defaultFileList={defaultFileList.map(file => ({ ...file }))}
            title="Recommended upload-like"
            buttonText="Choose assets"
            showUploadList={{
              extra: (file: FileInputFile) => file.description ?? 'pending',
            }}
            onChange={(info: any) => {
              changeMessage.value = `changed ${info.file.name} ${info.fileList.length}`
            }}
          />
          <output>{changeMessage.value}</output>
        </div>
      )
    }

    mountTestApp(container, () => render(<ChangeMessageDemo />, container))

    await waitForContent(() => {
      expect(container.textContent).toContain('seed.pdf')
      expect(container.textContent).toContain('Choose assets')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const root = container.querySelector('[data-rue-file-input-root]') as HTMLElement
    assignFiles(input, [
      new File(['cover'], 'fresh-cover.png', { type: 'image/png' }),
      new File(['detail'], 'fresh-detail.png', { type: 'image/png' }),
      new File(['clip'], 'fresh-clip.mp4', { type: 'video/mp4' }),
    ])
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(root.getAttribute('data-rue-file-input-count')).toBe('3')
      expect(container.textContent).toContain('changed fresh-clip.mp4 3')
      expect(container.textContent).not.toContain('seed.pdf')
      expect(container.textContent).toContain('fresh-cover.png')
      expect(container.textContent).toContain('fresh-detail.png')
      expect(container.textContent).toContain('fresh-clip.mp4')
    })

    mountTestApp(container, () => render(<ChangeMessageDemo />, container))

    await waitForContent(() => {
      expect(container.textContent).not.toContain('seed.pdf')
      expect(container.textContent).toContain('fresh-cover.png')
      expect(container.textContent).toContain('fresh-detail.png')
      expect(container.textContent).toContain('fresh-clip.mp4')
    })
  })

  it('syncs controlled selected files without resyncing on preview-only parent rerenders', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const controlledFiles = ref<FileInputFile[]>([
      {
        uid: 'deck',
        name: 'deck.pdf',
        status: 'done',
        description: 'synced',
      },
    ])
    const previewMessage = ref('idle')
    let extraRenderCount = 0
    const handleChange = vi.fn((info: any) => {
      controlledFiles.value = info.fileList.map((file: FileInputFile) => ({
        ...file,
        description: file.description ?? 'pending',
      }))
    })
    const handlePreview = vi.fn((file: FileInputFile) => {
      previewMessage.value = `previewed ${file.name} ${handlePreview.mock.calls.length}`
    })

    const ControlledPreviewDemo = () => (
      <div>
        <FileInput
          multiple
          fileList={controlledFiles.value}
          title="Controlled upload-like"
          buttonText="Append assets"
          showUploadList={{
            extra: (file: FileInputFile) => {
              extraRenderCount += 1
              return file.description ?? 'pending'
            },
          }}
          onChange={handleChange}
          onPreview={handlePreview}
        />
        <output>{previewMessage.value}</output>
      </div>
    )

    mountTestApp(container, () => render(<ControlledPreviewDemo />, container))

    await waitForContent(() => {
      expect(container.textContent).toContain('deck.pdf')
      expect(container.textContent).toContain('Append assets')
    })

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    assignFiles(input, [new File(['fresh'], 'fresh.pdf', { type: 'application/pdf' })])
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(handleChange).toHaveBeenCalledTimes(1)

    await waitForContent(() => {
      expect(container.textContent).toContain('deck.pdf')
      expect(container.textContent).toContain('fresh.pdf')
    })

    const versionAfterAppend = container
      .querySelector('[data-rue-file-input-root="true"]')
      ?.getAttribute('data-rue-file-input-version')
    const extraRenderCountAfterAppend = extraRenderCount

    await click(container.querySelector('button[aria-label="Preview fresh.pdf"]'))
    await click(container.querySelector('button[aria-label="Preview fresh.pdf"]'))

    await waitForContent(() => {
      expect(container.textContent).toContain('previewed fresh.pdf 2')
      expect(container.textContent).toContain('deck.pdf')
      expect(container.textContent).toContain('fresh.pdf')
    })

    const versionAfterPreview = container
      .querySelector('[data-rue-file-input-root="true"]')
      ?.getAttribute('data-rue-file-input-version')

    expect(handlePreview).toHaveBeenCalledTimes(2)
    expect(versionAfterPreview).toBe(versionAfterAppend)
    expect(extraRenderCount).toBe(extraRenderCountAfterAppend)
  })

  it('hides preview actions for files without a preview source', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <FileInput
          defaultFileList={[
            {
              uid: 'brief',
              name: 'brief.pdf',
              status: 'done',
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('brief.pdf')
      expect(container.querySelector('button[aria-label="Preview brief.pdf"]')).toBeNull()
      expect(container.querySelector('button[aria-label="Remove brief.pdf"]')).toBeTruthy()
    })
  })
})
