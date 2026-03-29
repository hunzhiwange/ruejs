//! SWC 插件转换行为测试（spec39）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec39() {
    let src = r##"
import { type FC, ref, useEffect } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlayground'
import Code from '../site/components/Code'

type CommitItem = {
  html_url: string
  sha: string
  author: { html_url: string }
  commit: { author: { name: string; date: string }; message: string }
}

const FetchingData: FC = () => {
  const API_URL = 'https://api.github.com/repos/rust-lang/rust/commits?per_page=10&sha='
  const branches = ['main', 'beta', 'stable'] as const
  const currentBranch = ref<(typeof branches)[number]>(branches[0])
  const commits = ref<CommitItem[]>([])

  const load = (branch: string) => {
    const url = API_URL + branch
    console.info(url)
    fetch(url)
      .then(res => res.json())
      .then(data => {
        commits.value = Array.isArray(data) ? data : []
        console.info(commits.value)
      })
      .catch(e => {
        console.info('请求失败')
        throw e
        commits.value = []
      })
  }

  useEffect(() => {
    console.info(22222)
    load(currentBranch.value)
  }, [currentBranch.value])

  watch(currentBranch, (newVal, oldVal) => {
    console.log('currentBranch.value changed', newVal, oldVal)
  })

  watchEffect(() => {
    console.info('currentBranch.value', currentBranch.value)
  })

  const truncate = (v: string) => {
    const newline = v.indexOf('\n')
    return newline > 0 ? v.slice(0, newline) : v
  }
  const formatDate = (v: string) => v.replace(/T|Z/g, ' ')

  const activeTab = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground type="examples">
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
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[420px] md:h-[620px]">
            <div className="card-body p-0">
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, ref, useEffect } from 'rue-js';

type CommitItem = {
  html_url: string;
  sha: string;
  author: { html_url: string };
  commit: { author: { name: string; date: string }; message: string };
};

const FetchingData: FC = () => {
  const API_URL = 'https://api.github.com/repos/rust-lang/rust/commits?per_page=10&sha=';
  const branches = ['main', 'beta', 'stable'] as const;
  const currentBranch = ref<typeof branches[number]>(branches[0]);
  const commits = ref<CommitItem[]>([]);

  const load = async (branch: string) => {
    const url = API_URL + branch;
    const res = await fetch(url);
    const data = await res.json();
    commits.value = Array.isArray(data) ? data : [];
  };

  useEffect(() => {
    load(currentBranch.value);
  }, [currentBranch.value]);

  const truncate = (v: string) => {
    const newline = v.indexOf('\n');
    return newline > 0 ? v.slice(0, newline) : v;
  };
  const formatDate = (v: string) => v.replace(/T|Z/g, ' ');

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <h1 className="text-2xl font-semibold">
          Latest rust-lang/rust Core Commits（移植自 Vue）
        </h1>
        <div className="flex items-center gap-4">
          {(['main', 'beta', 'stable'] as const).map(branch => (
            <label key={branch} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="branch"
                className="radio"
                value={branch}
                checked={currentBranch.value === branch}
                onChange={() => {
                  currentBranch.value = branch
                }}
              />
              <span className="select-none">{branch}</span>
            </label>
          ))}
        </div>
        <p className="text-gray-700">rust-lang/rust@{currentBranch.value}</p>
        {commits.value.length > 0 && (
          <ul className="space-y-4">
            {commits.value.map(({ html_url, sha, author, commit }) => (
              <li key={sha} className="leading-6">
                <a
                  href={html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="link link-primary"
                >
                  {sha.slice(0, 7)}
                </a>
                <span> - </span>
                <span className="font-medium">{truncate(commit.message)}</span>
                <br />
                <span>by </span>
                <span className="font-semibold">
                  {author && author.html_url ? (
                    <a
                      href={author.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="link link-hover"
                    >
                      {commit.author.name}
                    </a>
                  ) : (
                    <span>{commit.author.name}</span>
                  )}
                </span>
                <span> at </span>
                <span className="font-semibold">{formatDate(commit.author.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FetchingData;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <h1 className="text-2xl font-semibold">
                Latest rust-lang/rust Core Commits（移植自 Vue）
              </h1>
              <div className="flex items-center gap-4">
                {(['main', 'beta', 'stable'] as const).map(branch => (
                  <label key={branch} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="branch"
                      className="radio"
                      value={branch}
                      checked={currentBranch.value === branch}
                      onChange={() => {
                        currentBranch.value = branch
                      }}
                    />
                    <span className="select-none">{branch}</span>
                  </label>
                ))}
              </div>
              <p className="text-gray-700">rust-lang/rust@{currentBranch.value}</p>
              {commits.value.length > 0 && (
                <ul className="space-y-4">
                  {commits.value.map(({ html_url, sha, author, commit }) => (
                    <li key={sha} className="leading-6">
                      <a
                        href={html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="link link-primary"
                      >
                        {sha.slice(0, 7)}
                      </a>
                      <span> - </span>
                      <span className="font-medium">{truncate(commit.message)}</span>
                      <br />
                      <span>by </span>
                      <span className="font-semibold">
                        {author && author.html_url ? (
                          <a
                            href={author.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="link link-hover"
                          >
                            {commit.author.name}
                          </a>
                        ) : (
                          <span>{commit.author.name}</span>
                        )}
                      </span>
                      <span> at </span>
                      <span className="font-semibold">{formatDate(commit.author.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default FetchingData
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, useEffect, watchEffect, _$vaporWithHookId, useSetup } from 'rue-js';
import SidebarPlayground from '../site/SidebarPlayground';
import Code from '../site/components/Code';
type CommitItem = {
    html_url: string;
    sha: string;
    author: {
        html_url: string;
    };
    commit: {
        author: {
            name: string;
            date: string;
        };
        message: string;
    };
};
const FetchingData: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const API_URL = 'https://api.github.com/repos/rust-lang/rust/commits?per_page=10&sha=';
        const branches = [
            'main',
            'beta',
            'stable'
        ] as const;
        const currentBranch = _$vaporWithHookId("ref:1:0", ()=>ref<(typeof branches)[number]>(branches[0]));
        const commits = _$vaporWithHookId("ref:1:1", ()=>ref<CommitItem[]>([]));
        const load = (branch: string)=>{
            const url = API_URL + branch;
            console.info(url);
            fetch(url).then((res)=>res.json()).then((data)=>{
                commits.value = Array.isArray(data) ? data : [];
                console.info(commits.value);
            }).catch((e)=>{
                console.info('请求失败');
                throw e;
                commits.value = [];
            });
        };
        _$vaporWithHookId("useEffect:1:2", ()=>useEffect(()=>{
                console.info(22222);
                load(currentBranch.value);
            }, [
                currentBranch.value
            ]));
        watch(currentBranch, (newVal, oldVal)=>{
            console.log('currentBranch.value changed', newVal, oldVal);
        });
        _$vaporWithHookId("watchEffect:1:3", ()=>watchEffect(()=>{
                console.info('currentBranch.value', currentBranch.value);
            }));
        const truncate = (v: string)=>{
            const newline = v.indexOf('\n');
            return newline > 0 ? v.slice(0, newline) : v;
        };
        const formatDate = (v: string)=>v.replace(/T|Z/g, ' ');
        const activeTab = _$vaporWithHookId("ref:1:4", ()=>ref<'preview' | 'code'>('preview'));
        return {
            API_URL: API_URL,
            branches: branches,
            currentBranch: currentBranch,
            commits: commits,
            load: load,
            truncate: truncate,
            formatDate: formatDate,
            activeTab: activeTab
        };
    }));
    const { API_URL: API_URL, branches: branches, currentBranch: currentBranch, commits: commits, load: load, truncate: truncate, formatDate: formatDate, activeTab: activeTab } = _$useSetup;
    return (<SidebarPlayground type="examples">
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">获取数据（移植自 Vue）</h1>
      <div role="tablist" className="tabs tabs-box">
        <button role="tab" className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`} onClick={()=>{
        activeTab.value = 'preview';
    }}>
          效果
        </button>
        <button role="tab" className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`} onClick={()=>{
        activeTab.value = 'code';
    }}>
          代码
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (<div className="card bg-base-100 shadow overflow-auto h-[420px] md:h-[620px]">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={`import { type FC, ref, useEffect } from 'rue-js';

type CommitItem = {
  html_url: string;
  sha: string;
  author: { html_url: string };
  commit: { author: { name: string; date: string }; message: string };
};

const FetchingData: FC = () => {
  const API_URL = 'https://api.github.com/repos/rust-lang/rust/commits?per_page=10&sha=';
  const branches = ['main', 'beta', 'stable'] as const;
  const currentBranch = ref<typeof branches[number]>(branches[0]);
  const commits = ref<CommitItem[]>([]);

  const load = async (branch: string) => {
    const url = API_URL + branch;
    const res = await fetch(url);
    const data = await res.json();
    commits.value = Array.isArray(data) ? data : [];
  };

  useEffect(() => {
    load(currentBranch.value);
  }, [currentBranch.value]);

  const truncate = (v: string) => {
    const newline = v.indexOf('\n');
    return newline > 0 ? v.slice(0, newline) : v;
  };
  const formatDate = (v: string) => v.replace(/T|Z/g, ' ');

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <h1 className="text-2xl font-semibold">
          Latest rust-lang/rust Core Commits（移植自 Vue）
        </h1>
        <div className="flex items-center gap-4">
          {(['main', 'beta', 'stable'] as const).map(branch => (
            <label key={branch} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="branch"
                className="radio"
                value={branch}
                checked={currentBranch.value === branch}
                onChange={() => {
                  currentBranch.value = branch
                }}
              />
              <span className="select-none">{branch}</span>
            </label>
          ))}
        </div>
        <p className="text-gray-700">rust-lang/rust@{currentBranch.value}</p>
        {commits.value.length > 0 && (
          <ul className="space-y-4">
            {commits.value.map(({ html_url, sha, author, commit }) => (
              <li key={sha} className="leading-6">
                <a
                  href={html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="link link-primary"
                >
                  {sha.slice(0, 7)}
                </a>
                <span> - </span>
                <span className="font-medium">{truncate(commit.message)}</span>
                <br />
                <span>by </span>
                <span className="font-semibold">
                  {author && author.html_url ? (
                    <a
                      href={author.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="link link-hover"
                    >
                      {commit.author.name}
                    </a>
                  ) : (
                    <span>{commit.author.name}</span>
                  )}
                </span>
                <span> at </span>
                <span className="font-semibold">{formatDate(commit.author.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FetchingData;`}/>
            </div>
          </div>)}

        {activeTab.value === 'preview' && (<div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <h1 className="text-2xl font-semibold">
                Latest rust-lang/rust Core Commits（移植自 Vue）
              </h1>
              <div className="flex items-center gap-4">
                {([
        'main',
        'beta',
        'stable'
    ] as const).map((branch)=>(<label key={branch} className="inline-flex items-center gap-2">
                    <input type="radio" name="branch" className="radio" value={branch} checked={currentBranch.value === branch} onChange={()=>{
            currentBranch.value = branch;
        }}/>
                    <span className="select-none">{branch}</span>
                  </label>))}
              </div>
              <p className="text-gray-700">rust-lang/rust@{currentBranch.value}</p>
              {commits.value.length > 0 && (<ul className="space-y-4">
                  {commits.value.map(({ html_url, sha, author, commit })=>(<li key={sha} className="leading-6">
                      <a href={html_url} target="_blank" rel="noreferrer" className="link link-primary">
                        {sha.slice(0, 7)}
                      </a>
                      <span> - </span>
                      <span className="font-medium">{truncate(commit.message)}</span>
                      <br/>
                      <span>by </span>
                      <span className="font-semibold">
                        {author && author.html_url ? (<a href={author.html_url} target="_blank" rel="noreferrer" className="link link-hover">
                            {commit.author.name}
                          </a>) : (<span>{commit.author.name}</span>)}
                      </span>
                      <span> at </span>
                      <span className="font-semibold">{formatDate(commit.author.date)}</span>
                    </li>))}
                </ul>)}
            </div>
          </div>)}
      </div>
    </SidebarPlayground>);
};
export default FetchingData;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec39.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
