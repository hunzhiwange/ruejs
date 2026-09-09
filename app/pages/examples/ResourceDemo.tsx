import { createResource, type SignalHandle, type FC, ref, signal } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const API_URL = 'https://api.github.com/repos/rust-lang/rust/commits?per_page=3&sha='
const BRANCHES = ['main', 'beta', 'stable'] as const

type Branch = (typeof BRANCHES)[number]

type CommitItem = {
  html_url: string
  sha: string
  author: {
    html_url: string
  } | null
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
}

type CommitResource = ReturnType<typeof createResource<Branch, CommitItem[]>>
type BranchSignal = SignalHandle<Branch>

const SOURCE_CODE = [
  "import { _$compiledRoot } from '@rue-js/rue/internal';",
  "import { createResource, renderAnchor, type SignalHandle, type FC, signal, watchEffect } from '@rue-js/rue';",
  '',
  "const API_URL = 'https://api.github.com/repos/rust-lang/rust/commits?per_page=3&sha=';",
  "const BRANCHES = ['main', 'beta', 'stable'] as const;",
  '',
  'type Branch = (typeof BRANCHES)[number];',
  '',
  'type CommitItem = {',
  '  html_url: string;',
  '  sha: string;',
  '  author: { html_url: string } | null;',
  '  commit: {',
  '    message: string;',
  '    author: {',
  '      name: string;',
  '      date: string;',
  '    };',
  '  };',
  '};',
  '',
  'type CommitResource = ReturnType<typeof createResource<Branch, CommitItem[]>>;',
  'type BranchSignal = SignalHandle<Branch>;',
  '',
  'const truncate = (value: string) => {',
  "  const newline = value.indexOf('\\n');",
  '  return newline > 0 ? value.slice(0, newline) : value;',
  '};',
  '',
  "const formatDate = (value: string) => value.replace(/T|Z/g, ' ');",
  '',
  'const renderResourceResult = (resource: CommitResource) => {',
  '  const error = resource.error.get();',
  '  if (error) {',
  '    return <p>Error: {String(error)}</p>;',
  '  }',
  '',
  '  const commits = resource.data.get();',
  '  return commits?.length ? (',
  '    <ul>',
  '      {commits.map(item => (',
  '        <li key={item.sha}>',
  '          <a href={item.html_url} target="_blank" rel="noreferrer">',
  '            {item.sha.slice(0, 7)}',
  '          </a>',
  '          <span> - </span>',
  '          <span>{truncate(item.commit.message)}</span>',
  '          <br />',
  '          <span>by {item.commit.author.name} at {formatDate(item.commit.author.date)}</span>',
  '        </li>',
  '      ))}',
  '    </ul>',
  '  ) : null;',
  '};',
  '',
  'const PreviewPanel: FC = () => {',
  '  const currentBranch = signal<Branch>(BRANCHES[0]);',
  '  const commits = createResource<Branch, CommitItem[]>(currentBranch, async branch => {',
  '    const response = await fetch(`${API_URL}${branch}`);',
  '    if (!response.ok) {',
  '      throw new Error(`请求失败：${response.status}`);',
  '    }',
  '',
  '    const data = (await response.json()) as CommitItem[];',
  '    return Array.isArray(data) ? data : [];',
  '  });',
  '',
  '  return _$compiledRoot(() => {',
  '    const root = document.createDocumentFragment();',
  "    const anchor = document.createComment('rue:resource-demo-preview-anchor');",
  '    root.appendChild(anchor);',
  '',
  '    watchEffect(() => {',
  '      const parent = (anchor.parentNode || root) as any;',
  '      renderAnchor(',
  '        <div>',
  '          <p>rust@{currentBranch.get()}</p>',
  '          <p>resource.loading = {String(commits.loading.get())}</p>',
  '          {commits.loading.get() && <p>Loading...</p>}',
  '          {!commits.loading.get() && renderResourceResult(commits)}',
  '        </div>,',
  '        parent,',
  '        anchor as any,',
  '      );',
  '    });',
  '',
  '    return root as any;',
  '  }) as any;',
  '};',
].join('\n')

const formatError = (value: unknown) => {
  if (!value) return ''
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  return '请求失败'
}

const truncate = (value: string) => {
  const newline = value.indexOf('\n')
  return newline > 0 ? value.slice(0, newline) : value
}

const formatDate = (value: string) => value.replace(/T|Z/g, ' ')

const renderResourceResult = (resource: CommitResource) => {
  const error = resource.error.get()
  if (error) {
    return (
      <div role="alert" className="alert alert-error alert-soft">
        <span>Error: {formatError(error)}</span>
      </div>
    )
  }

  const commits = resource.data.get()
  return commits?.length ? (
    <ul className="space-y-5">
      {commits.map((item: CommitItem) => (
        <li key={item.sha} className="leading-7">
          <a
            href={item.html_url}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-success hover:underline"
          >
            {item.sha.slice(0, 7)}
          </a>
          <span> - </span>
          <span className="text-base-content">{truncate(item.commit.message)}</span>
          <br />
          <span>by </span>
          <span className="font-semibold">
            <a
              href={item.author?.html_url || item.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-success hover:underline"
            >
              {item.commit.author.name}
            </a>
          </span>
          <span> at </span>
          <span className="font-semibold">{formatDate(item.commit.author.date)}</span>
        </li>
      ))}
    </ul>
  ) : null
}

const renderPreviewCard = (currentBranch: BranchSignal, resource: CommitResource) => {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-4">
        <h2 className="text-2xl font-semibold">Fetching data with createResource</h2>
        <p className="text-sm text-base-content/70">
          此示例按 SolidJS 文档的 createResource Demo 移植到 Rue，并改为复用获取数据示例中的 GitHub
          commits API。
        </p>

        <div className="flex flex-wrap gap-4">
          {BRANCHES.map(branch => (
            <label
              key={branch}
              htmlFor={`resource-${branch}`}
              className="inline-flex items-center gap-2"
            >
              <input
                id={`resource-${branch}`}
                type="radio"
                name="resource-branch"
                className="radio radio-sm radio-success"
                checked={currentBranch.get() === branch}
                onChange={() => {
                  currentBranch.set(branch)
                }}
              />
              <span className="font-medium">{branch}</span>
            </label>
          ))}
        </div>

        <p className="text-sm text-base-content/70">rust@{currentBranch.get()}</p>
        <p className="text-sm text-base-content/70">
          resource.loading = {String(resource.loading.get())}
        </p>

        {resource.loading.get() && (
          <div role="status" className="alert alert-info alert-soft">
            <span>Loading...</span>
          </div>
        )}

        {!resource.loading.get() && renderResourceResult(resource)}
      </div>
    </div>
  )
}

const PreviewPanel: FC = () => {
  const currentBranch = signal<Branch>(BRANCHES[0])
  const resource = createResource<Branch, CommitItem[]>(currentBranch, async branch => {
    const response = await fetch(`${API_URL}${branch}`)
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`)
    }

    const data = (await response.json()) as CommitItem[]
    return Array.isArray(data) ? data : []
  })

  return renderPreviewCard(currentBranch, resource)
}

const ResourceDemo: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">资源（移植自 SolidJS）</h1>

      <div role="tablist" className="tabs tabs-box">
        <button
          role="tab"
          className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          效果
        </button>
        <button
          role="tab"
          className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          代码
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'preview' && <PreviewPanel />}

        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[360px] md:h-[720px]">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={SOURCE_CODE} />
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default ResourceDemo
