import { type FC, ref, watchEffect } from '@rue-js/rue'
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

const SOURCE_CODE = [
  "import { type FC, ref, watchEffect } from '@rue-js/rue';",
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
  'const truncate = (value: string) => {',
  "  const newline = value.indexOf('\\n');",
  '  return newline > 0 ? value.slice(0, newline) : value;',
  '};',
  '',
  "const formatDate = (value: string) => value.replace(/T|Z/g, ' ');",
  '',
  'const PreviewPanel: FC = () => {',
  '  const currentBranch = ref<Branch>(BRANCHES[0]);',
  '  const commits = ref<CommitItem[]>([]);',
  '  const loading = ref(true);',
  "  const errorMessage = ref('');",
  '  let fetchVersion = 0;',
  '',
  '  watchEffect(() => {',
  '    const branch = currentBranch.value;',
  '    const version = ++fetchVersion;',
  '    loading.value = true;',
  "    errorMessage.value = '';",
  '',
  '    void (async () => {',
  '      try {',
  '        const response = await fetch(`${API_URL}${branch}`);',
  '        if (!response.ok) {',
  '          throw new Error(`GitHub API 返回 ${response.status}`);',
  '        }',
  '',
  '        const data = (await response.json()) as CommitItem[];',
  '        if (version !== fetchVersion) {',
  '          return;',
  '        }',
  '',
  '        commits.value = Array.isArray(data) ? data : [];',
  '      } catch (error) {',
  '        if (version !== fetchVersion) {',
  '          return;',
  '        }',
  '',
  '        commits.value = [];',
  "        errorMessage.value = error instanceof Error ? error.message : '请求失败';",
  '      } finally {',
  '        if (version === fetchVersion) {',
  '          loading.value = false;',
  '        }',
  '      }',
  '    })();',
  '  });',
  '',
  '  return (',
  '    <div className="card bg-base-100 shadow">',
  '      <div className="card-body gap-4">',
  '        <h2 className="text-2xl font-semibold">Latest Rust Lang Commits</h2>',
  '',
  '        <div className="flex flex-wrap gap-4">',
  '          {BRANCHES.map((branch) => (',
  '            <label key={branch} htmlFor={branch} className="inline-flex items-center gap-2">',
  '              <input',
  '                id={branch}',
  '                type="radio"',
  '                name="branch"',
  '                className="radio radio-sm radio-success"',
  '                checked={currentBranch.value === branch}',
  '                onChange={() => {',
  '                  currentBranch.value = branch;',
  '                }}',
  '              />',
  '              <span className="font-medium">{branch}</span>',
  '            </label>',
  '          ))}',
  '        </div>',
  '',
  '        <p className="text-sm text-base-content/70">vuejs/core@{currentBranch.value}</p>',
  '',
  '        {loading.value && <p className="text-base-content/70">加载中...</p>}',
  '',
  '        {!loading.value && errorMessage.value && (',
  '          <div role="alert" className="alert alert-error alert-soft">',
  '            <span>{errorMessage.value}</span>',
  '          </div>',
  '        )}',
  '',
  '        {!loading.value && !errorMessage.value && commits.value.length > 0 && (',
  '          <ul className="space-y-5">',
  '            {commits.value.map((item) => (',
  '              <li key={item.sha} className="leading-7">',
  '                <a',
  '                  href={item.html_url}',
  '                  target="_blank"',
  '                  rel="noreferrer"',
  '                  className="font-mono text-success hover:underline"',
  '                >',
  '                  {item.sha.slice(0, 7)}',
  '                </a>',
  '                <span> - </span>',
  '                <span className="text-base-content">{truncate(item.commit.message)}</span>',
  '                <br />',
  '                <span>by </span>',
  '                <span className="font-semibold">',
  '                  <a',
  '                    href={item.author?.html_url || item.html_url}',
  '                    target="_blank"',
  '                    rel="noreferrer"',
  '                    className="text-success hover:underline"',
  '                  >',
  '                    {item.commit.author.name}',
  '                  </a>',
  '                </span>',
  '                <span> at </span>',
  '                <span className="font-semibold">{formatDate(item.commit.author.date)}</span>',
  '              </li>',
  '            ))}',
  '          </ul>',
  '        )}',
  '      </div>',
  '    </div>',
  '  );',
  '};',
].join('\n')

const truncate = (value: string) => {
  const newline = value.indexOf('\n')
  return newline > 0 ? value.slice(0, newline) : value
}

const formatDate = (value: string) => value.replace(/T|Z/g, ' ')

const PreviewPanel: FC = () => {
  const currentBranch = ref<Branch>(BRANCHES[0])
  const commits = ref<CommitItem[]>([])
  const loading = ref(true)
  const errorMessage = ref('')
  let fetchVersion = 0

  watchEffect(() => {
    const branch = currentBranch.value
    const version = ++fetchVersion
    loading.value = true
    errorMessage.value = ''

    void (async () => {
      try {
        const response = await fetch(`${API_URL}${branch}`)
        if (!response.ok) {
          throw new Error(`GitHub API 返回 ${response.status}`)
        }

        const data = (await response.json()) as CommitItem[]
        if (version !== fetchVersion) {
          return
        }

        commits.value = Array.isArray(data) ? data : []
      } catch (error) {
        if (version !== fetchVersion) {
          return
        }

        commits.value = []
        errorMessage.value = error instanceof Error ? error.message : '请求失败'
      } finally {
        if (version === fetchVersion) {
          loading.value = false
        }
      }
    })()
  })

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-4">
        <h2 className="text-2xl font-semibold">Latest Rust Lang Commits</h2>

        <div className="flex flex-wrap gap-4">
          {BRANCHES.map(branch => (
            <label key={branch} htmlFor={branch} className="inline-flex items-center gap-2">
              <input
                id={branch}
                type="radio"
                name="branch"
                className="radio radio-sm radio-success"
                checked={currentBranch.value === branch}
                onChange={() => {
                  currentBranch.value = branch
                }}
              />
              <span className="font-medium">{branch}</span>
            </label>
          ))}
        </div>

        <p className="text-sm text-base-content/70">vuejs/core@{currentBranch.value}</p>

        {loading.value && <p className="text-base-content/70">加载中...</p>}

        {!loading.value && errorMessage.value && (
          <div role="alert" className="alert alert-error alert-soft">
            <span>{errorMessage.value}</span>
          </div>
        )}

        {!loading.value && !errorMessage.value && commits.value.length > 0 && (
          <ul className="space-y-5">
            {commits.value.map(item => (
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
        )}
      </div>
    </div>
  )
}

const FetchingData: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">获取数据（移植自 Vue）</h1>

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

export default FetchingData
