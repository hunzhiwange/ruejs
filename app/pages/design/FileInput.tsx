import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import Button from '../../../packages/rue-design/src/components/button/index'
import FileInput from '../../../packages/rue-design/src/components/file-input/index'
import type {
  FileInputChangeInfo,
  FileInputFile,
} from '../../../packages/rue-design/src/components/file-input/index'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

interface FileInputMessageProps {
  message: { value: any }
}

const FileInputMessage: FC<FileInputMessageProps> = ({ message }) => {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 text-sm text-base-content/70">
      {message.value}
    </div>
  )
}

const createImageDataUrl = (label: string, background: string, foreground = '#ffffff') => {
  return `data:image/svg+xml;charset=UTF-8, ${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320">
      <rect width="480" height="320" rx="24" fill="${background}" />
      <circle cx="122" cy="110" r="34" fill="rgba(255, 255, 255, .25)" />
      <path d="M82 232l78-78 68 68 45-45 125 125H82Z" fill="rgba(255, 255, 255, .25)" />
      <text x="240" y="174" text-anchor="middle" font-size="34" font-family="Arial, sans-serif" fill="${foreground}">${label}</text>
    </svg>`,
  )}`
}

const cloneFiles = (files: FileInputFile[]) => files.map(file => ({ ...file }))

const recommendedSeed: FileInputFile[] = [
  {
    uid: 'brief',
    name: 'campaign-brief.pdf',
    status: 'done',
    type: 'application/pdf',
    size: 860 * 1024,
    description: '已归档',
  },
]

const controlledSeed: FileInputFile[] = [
  {
    uid: 'deck',
    name: 'launch-deck.key',
    status: 'ready',
    type: 'application/vnd.apple.keynote',
    size: 4.2 * 1024 * 1024,
    description: '等待上传',
  },
  {
    uid: 'copy',
    name: 'copy-review.docx',
    status: 'done',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 280 * 1024,
    description: '已同步',
  },
]

const pictureSeed: FileInputFile[] = [
  {
    uid: 'cover',
    name: 'cover.png',
    status: 'done',
    type: 'image/png',
    thumbUrl: createImageDataUrl('Cover', '#5b5bd6'),
    description: '封面图',
  },
  {
    uid: 'detail',
    name: 'detail.png',
    status: 'done',
    type: 'image/png',
    thumbUrl: createImageDataUrl('Detail', '#0891b2'),
    description: '细节图',
  },
]

const apiRows: ApiRow[] = [
  {
    prop: 'color / variant / size / ghost',
    description:
      '`color` 对齐 Rue Design 语义色；`variant` 作为颜色写法支持。不传语义 API 时仍直接渲染原生 input。',
    type: 'FileInputColor / FileInputVariant / FileInputSize / boolean',
    defaultValue: '-',
  },
  {
    prop: 'fileList / defaultFileList',
    description:
      '受控与非受控文件列表；条目支持 `uid/name/status/url/thumbUrl/originFileObj/description`。',
    type: 'FileInputFile[]',
    defaultValue: '-',
  },
  {
    prop: 'listType',
    description: '切换文本列表、缩略图列表和图片卡片栅格。',
    type: "'text' | 'picture' | 'picture-card'",
    defaultValue: "'text'",
  },
  {
    prop: 'drag / FileInput.Dragger',
    description: '启用拖拽选区；`FileInput.Dragger` 是 `drag` 的快捷写法。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'showUploadList',
    description: '控制列表显隐，或进一步配置预览/删除图标、extra 和 itemRender。',
    type: 'boolean | FileInputShowUploadList',
    defaultValue: 'true',
  },
  {
    prop: 'beforeUpload',
    description: '选择前拦截或转换文件；返回 `FileInput.LIST_IGNORE` 可阻止文件进入列表。',
    type: '(file, fileList) => boolean | File | Blob | Promise<...>',
    defaultValue: '-',
  },
  {
    prop: 'maxCount / multiple / directory',
    description: '限制数量、开启多选或目录选择；`maxCount=1` 时自动保持最新文件。',
    type: 'number / boolean / boolean',
    defaultValue: '-',
  },
  {
    prop: 'onChange / onPreview / onRemove',
    description: '语义模式下返回 Upload 风格的列表信息，便于业务侧接管上传、预览和删除确认。',
    type: 'function',
    defaultValue: '-',
  },
  {
    prop: 'title / description / hint / buttonText / empty',
    description: '快速定制触发区和空态文案，不必每次都自建包装容器。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'rootClassName / triggerClassName / listClassName / itemClassName',
    description: '语义模式的根容器、触发区、列表和单项样式入口。',
    type: 'string',
    defaultValue: '-',
  },
]

const ApiTable: FC<{ rows: ApiRow[] }> = ({ rows }) => {
  return (
    <div className="not-prose overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>属性</th>
            <th>说明</th>
            <th>类型</th>
            <th>默认值</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.prop}>
              <td>
                <code>{row.prop}</code>
              </td>
              <td>{row.description}</td>
              <td>
                <code>{row.type}</code>
              </td>
              <td>
                <code>{row.defaultValue}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FileInputDemo: FC = () => {
  const tabs = {
    recommended: ref<PreviewTabMode>('preview'),
    controlled: ref<PreviewTabMode>('preview'),
    dragger: ref<PreviewTabMode>('preview'),
    pictureCard: ref<PreviewTabMode>('preview'),
    validation: ref<PreviewTabMode>('preview'),
    basic: ref<PreviewTabMode>('preview'),
    ghost: ref<PreviewTabMode>('preview'),
    fieldset: ref<PreviewTabMode>('preview'),
    sizes: ref<PreviewTabMode>('preview'),
    colors: ref<PreviewTabMode>('preview'),
    disabled: ref<PreviewTabMode>('preview'),
  }

  const controlledFiles = ref<FileInputFile[]>(cloneFiles(controlledSeed))
  const recommendedMessage = ref(
    '适合“先选择，再统一上传”的工作流，默认列表已接近 Upload 的核心体验。',
  )
  const controlledMessage = ref('当前为受控模式，列表变化会先进入业务状态，再决定何时上传。')
  const previewMessage = ref('点击卡片右上角预览按钮，会在这里记录最近一次预览。')
  const validationFiles = ref<FileInputFile[]>([])
  const validationMessage = ref('仅允许 `image/*`，且每个文件不超过 2MB。')

  const handleRecommendedChange = (info: FileInputChangeInfo) => {
    recommendedMessage.value = `最近操作：${info.source} · ${info.file.name} · 当前 ${info.fileList.length} 项`
  }

  const handleControlledChange = (info: FileInputChangeInfo) => {
    controlledFiles.value = info.fileList.map(file => ({
      ...file,
      description: file.description ?? (file.status === 'done' ? '已同步' : '等待上传'),
    }))
    controlledMessage.value = `最近操作：${info.source} · ${info.file.name} · 当前 ${info.fileList.length} 项`
  }

  const handleValidationChange = (info: FileInputChangeInfo) => {
    validationFiles.value = info.fileList
    validationMessage.value = `已接收 ${info.fileList.length} 个文件，最近加入：${info.file.name}`
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>File Input 文件选择</h1>
        <p className="text-sm mt-3 mb-3">
          Rue File Input 展示基础 <code>file-input</code> 样式入口，同时补充更常用的
          文件列表、拖拽、图片卡片、受控/非受控和选择前校验能力。
        </p>

        <div className="not-prose mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              支持优先
            </div>
            <p className="mt-2 mb-0 text-sm text-base-content/70">
              不传语义 API 时，仍然直出原生文件输入框。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
              推荐增强
            </div>
            <div className="mt-2 text-sm font-medium">列表、拖拽、图片卡片</div>
            <p className="mt-2 mb-0 text-sm text-base-content/70">
              把最常见的 Upload 场景收敛到一个组件里，业务只关心列表状态。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">
              业务可接管
            </div>
            <div className="mt-2 text-sm font-medium">拦截、预览、删除都可自定义</div>
            <p className="mt-2 mb-0 text-sm text-base-content/70">
              适合手动上传、服务端校验和媒体素材管理等场景。
            </p>
          </div>
        </div>

        <PreviewBlock
          title="Recommended upload-like"
          tab={tabs.recommended}
          preview={
            <div className="space-y-4">
              <FileInput
                id="recommended-upload-like"
                variant="primary"
                multiple
                maxCount={3}
                accept=".pdf, .png, .mp4, application/pdf, image/png, video/mp4"
                defaultFileList={cloneFiles(recommendedSeed)}
                onChange={(info: FileInputChangeInfo | Event) =>
                  handleRecommendedChange(info as FileInputChangeInfo)
                }
                title="推荐写法：把选择器和列表一起交给组件管理"
                hint="PDF / PNG / MP4，最多 3 个文件"
                buttonText="选择素材"
                showUploadList={{
                  extra: (file: FileInputFile) => file.description ?? '待处理',
                }}
                onPreview={(file: FileInputFile) => {
                  recommendedMessage.value = `最近预览：${file.name}`
                }}
              />
              <FileInputMessage message={recommendedMessage} />
            </div>
          }
          code={`import { FileInput } from '@rue-js/design'
const defaultFileList = [
  {
    uid: 'brief',
    name: 'campaign-brief.pdf',
    status: 'done',
    type: 'application/pdf',
    description: '已归档',
  },
]

<FileInput
  id="recommended-upload-like"
  variant="primary"
  multiple
  maxCount={3}
  accept=".pdf,.png,.mp4,application/pdf,image/png,video/mp4"
  defaultFileList={defaultFileList}
  onChange={info => {
    console.log(info.fileList)
  }}
  title="推荐写法：把选择器和列表一起交给组件管理"
  hint="PDF / PNG / MP4，最多 3 个文件"
  buttonText="选择素材"
  showUploadList={{
    extra: file => file.description ?? '待处理',
  }}
  onPreview={file => {
    console.log('preview', file.name)
  }}
/>`}
        />

        <PreviewBlock
          title="Controlled fileList"
          tab={tabs.controlled}
          preview={
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button color="primary" onClick={() => (controlledFiles.value = [])}>
                  清空列表
                </Button>
                <Button onClick={() => (controlledFiles.value = cloneFiles(controlledSeed))}>
                  恢复示例
                </Button>
              </div>
              <FileInput
                fileList={controlledFiles.value}
                onChange={(info: FileInputChangeInfo | Event) =>
                  handleControlledChange(info as FileInputChangeInfo)
                }
                onRemove={(file: FileInputFile) => {
                  controlledMessage.value = `已请求移除：${file.name}`
                }}
                onPreview={(file: FileInputFile) => {
                  controlledMessage.value = `最近预览：${file.name}`
                }}
                multiple
                title="受控列表"
                buttonText="追加文件"
                hint="由业务状态托管 fileList，适合手动上传流程"
                showUploadList={{
                  extra: (file: FileInputFile) => file.description ?? '待处理',
                }}
              />
              <FileInputMessage message={controlledMessage} />
            </div>
          }
          code={`import { ref } from '@rue-js/rue'
import { FileInput } from '@rue-js/design'
const fileList = ref([
  { uid: 'deck', name: 'launch-deck.key', status: 'ready', description: '等待上传' },
  { uid: 'copy', name: 'copy-review.docx', status: 'done', description: '已同步' },
])

<FileInput
  fileList={fileList.value}
  onChange={info => {
    fileList.value = info.fileList
  }}
  onRemove={file => {
    console.log('remove', file.name)
  }}
  onPreview={file => {
    console.log('preview', file.name)
  }}
  multiple
  title="受控列表"
  buttonText="追加文件"
  hint="由业务状态托管 fileList，适合手动上传流程"
  showUploadList={{
    extra: file => file.description ?? '待处理',
  }}
/>`}
        />

        <PreviewBlock
          title="Dragger"
          tab={tabs.dragger}
          preview={
            <FileInput.Dragger
              multiple
              variant="secondary"
              title="拖拽附件、截图或压缩包到这里"
              description="适合把工单、表单、内容后台里的附件区直接做成拖拽投放面板。"
              hint="支持多文件，列表会自动显示在下方"
              showUploadList={{
                extra: (file: FileInputFile) => file.description ?? '待上传',
              }}
            />
          }
          code={`import { FileInput } from '@rue-js/design'<FileInput.Dragger
  multiple
  variant="secondary"
  title="拖拽附件、截图或压缩包到这里"
  description="适合把工单、表单、内容后台里的附件区直接做成拖拽投放面板。"
  hint="支持多文件，列表会自动显示在下方"
/>`}
        />

        <PreviewBlock
          title="Picture Card"
          tab={tabs.pictureCard}
          preview={
            <div className="space-y-4">
              <FileInput
                listType="picture-card"
                maxCount={6}
                defaultFileList={cloneFiles(pictureSeed)}
                buttonText="添加画面"
                hint="封面图、详情图、海报等都适合用卡片布局"
                onPreview={(file: FileInputFile) => {
                  previewMessage.value = `最近预览：${file.name}`
                }}
                showUploadList={{
                  extra: (file: FileInputFile) => file.description,
                }}
              />
              <FileInputMessage message={previewMessage} />
            </div>
          }
          code={`import { FileInput } from '@rue-js/design'
const fileList = [
  {
    uid: 'cover',
    name: 'cover.png',
    status: 'done',
    thumbUrl: 'https://example.com/cover.png',
    description: '封面图',
  },
]

<FileInput
  listType="picture-card"
  maxCount={6}
  defaultFileList={fileList}
  buttonText="添加画面"
  hint="封面图、详情图、海报等都适合用卡片布局"
  onPreview={file => {
    console.log('preview', file.name)
  }}
  showUploadList={{
    extra: file => file.description,
  }}
/>`}
        />

        <PreviewBlock
          title="beforeUpload Validation"
          tab={tabs.validation}
          preview={
            <div className="space-y-4">
              <FileInput.Dragger
                accept="image/*"
                fileList={validationFiles.value}
                listType="picture"
                multiple
                maxCount={4}
                variant="info"
                title="拖拽或选择图片，选择前校验格式和大小"
                description="把图片拖到这里，或点击选择文件；非法文件不会进入列表。"
                buttonText="添加图片"
                hint="仅 image/*，单个文件不超过 2MB"
                beforeUpload={(file: File) => {
                  if (!file.type?.startsWith('image/')) {
                    validationMessage.value = `已拦截 ${file.name}：只允许图片类型`
                    return FileInput.LIST_IGNORE
                  }
                  if ((file.size ?? 0) > 2 * 1024 * 1024) {
                    validationMessage.value = `已拦截 ${file.name}：超过 2MB`
                    return FileInput.LIST_IGNORE
                  }
                  return true
                }}
                onChange={(info: FileInputChangeInfo | Event) =>
                  handleValidationChange(info as FileInputChangeInfo)
                }
                showUploadList={{
                  extra: (file: FileInputFile) => file.description ?? '通过校验',
                }}
              />
              <FileInputMessage message={validationMessage} />
            </div>
          }
          code={`import { ref } from '@rue-js/rue'
import { FileInput } from '@rue-js/design'
const fileList = ref([])

<FileInput.Dragger
  accept="image/*"
  fileList={fileList.value}
  listType="picture"
  multiple
  maxCount={4}
  variant="info"
  title="拖拽或选择图片，选择前校验格式和大小"
  description="把图片拖到这里，或点击选择文件；非法文件不会进入列表。"
  buttonText="添加图片"
  hint="仅 image/*，单个文件不超过 2MB"
  beforeUpload={file => {
    if (!file.type.startsWith('image/')) {
      return FileInput.LIST_IGNORE
    }
    if (file.size > 2 * 1024 * 1024) {
      return FileInput.LIST_IGNORE
    }
    return true
  }}
  onChange={info => {
    fileList.value = info.fileList
  }}
/>`}
        />

        <PreviewBlock
          title="File input"
          tab={tabs.basic}
          preview={<FileInput />}
          code={`import { FileInput } from '@rue-js/design'<FileInput />`}
        />

        <PreviewBlock
          title="File input ghost"
          tab={tabs.ghost}
          preview={<FileInput ghost />}
          code={`<FileInput ghost />`}
        />

        <PreviewBlock
          title="With fieldset and label"
          tab={tabs.fieldset}
          preview={
            <fieldset className="fieldset w-xs">
              <legend className="fieldset-legend">Pick a file</legend>
              <FileInput />
              <label className="label">Max size 2MB</label>
            </fieldset>
          }
          code={`<fieldset className="fieldset w-xs">
  <legend className="fieldset-legend">Pick a file</legend>
  <FileInput />
  <label className="label">Max size 2MB</label>
</fieldset>`}
        />

        <PreviewBlock
          title="File input sizes"
          tab={tabs.sizes}
          preview={
            <div className="flex w-full max-w-md flex-col items-center gap-4">
              <FileInput size="xs" />
              <FileInput size="sm" />
              <FileInput size="md" />
              <FileInput size="lg" />
              <FileInput size="xl" />
            </div>
          }
          code={`<FileInput size="xs" />
<FileInput size="sm" />
<FileInput size="md" />
<FileInput size="lg" />
<FileInput size="xl" />`}
        />

        <PreviewBlock
          title="File input colors"
          tab={tabs.colors}
          preview={
            <div className="grid gap-2">
              <FileInput color="primary" />
              <FileInput color="secondary" />
              <FileInput color="accent" />
              <FileInput color="neutral" />
              <FileInput color="info" />
              <FileInput color="success" />
              <FileInput color="warning" />
              <FileInput color="error" />
            </div>
          }
          code={`<FileInput color="primary" />
<FileInput color="secondary" />
<FileInput color="accent" />
<FileInput color="neutral" />
<FileInput color="info" />
<FileInput color="success" />
<FileInput color="warning" />
<FileInput color="error" />`}
        />

        <PreviewBlock
          title="Disabled"
          tab={tabs.disabled}
          preview={<FileInput disabled />}
          code={`<FileInput disabled />`}
        />

        <h2 id="file-input-api" className="mt-10">
          API
        </h2>
        <p className="text-sm mt-3 mb-4">
          语义模式尽量贴近 Upload 的核心组织方式，但仍然使用 Rue 的视觉和更轻的心智负担。
        </p>
        <ApiTable rows={apiRows} />

        <h2 className="mt-10">FAQ</h2>
        <div className="not-prose mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-sm font-medium">它会自动上传文件吗？</div>
            <p className="mt-2 mb-0 text-sm text-base-content/70">
              不会。组件负责文件选择、列表展示和交互，真正上传仍建议在业务层根据
              <code>onChange</code> 的结果触发。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-sm font-medium">怎样阻止文件进入列表？</div>
            <p className="mt-2 mb-0 text-sm text-base-content/70">
              在 <code>beforeUpload</code> 中返回 <code>FileInput.LIST_IGNORE</code>
              ，即可把非法文件直接挡在列表外。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-sm font-medium">当前项目需要调整吗？</div>
            <p className="mt-2 mb-0 text-sm text-base-content/70">
              不需要。基础的 <code>variant / size / ghost / disabled</code>{' '}
              写法继续可用，按需切换到语义模式即可。
            </p>
          </div>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default FileInputDemo
