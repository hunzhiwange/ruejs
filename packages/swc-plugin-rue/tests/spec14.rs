//! SWC 插件转换行为测试（spec14）
//!
//! 覆盖：useEffect 获取远程数据、ref 分支以及列表渲染的转换。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec14() {
    let src = r##"
import { FC, ref, useEffect } from '@rue-js/rue';

type CommitItem = {
  html_url: string;
  sha: string;
  author: { html_url: string };
  commit: { author: { name: string; date: string }; message: string };
};

const FetchingData: FC = () => {
  const API_URL = 'https://api.github.com/repos/rust-lang/rust/commits?per_page=3&sha=';
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
    const newline = v.indexOf('\\n');
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

export default FetchingData;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 期望输出要点对照：
    // - setup：useSetup + _$vaporWithHookId 包裹，生成可追踪作用域与索引
    // - 列表 A：分支上的 ['main','beta','stable'] 使用 keyedList 渲染
    // - 受控 inputs：radio 的 value/checked/onChange 走适配器与事件绑定
    // - 文本插值：_$createTextWrapper + _$settextContent + watch
    // - 条件插槽：commits.length > 0 → vapor 片段；否则 ""；统一转为 vnode 并 renderAnchor
    let expected_fragment = r##"
import { FC, ref, useEffect, _$vaporWithHookId, useSetup, vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporKeyedList, _$createTextWrapper, _$vaporCreateVNode, _$setAttribute, _$addEventListener, _$setClassName, _$setValue, _$setChecked } from '@rue-js/rue';
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
            const API_URL = 'https://api.github.com/repos/rust-lang/rust/commits?per_page=3&sha=';
            const branches = [
                'main',
                'beta',
                'stable'
            ] as const;
            const currentBranch = _$vaporWithHookId("ref:1:0", ()=>ref<typeof branches[number]>(branches[0]));
            const commits = _$vaporWithHookId("ref:1:1", ()=>ref<CommitItem[]>([]));
            const load = async (branch: string)=>{
                const url = API_URL + branch;
                const res = await fetch(url);
                const data = await res.json();
                commits.value = Array.isArray(data) ? data : [];
            };
            _$vaporWithHookId("useEffect:1:2", ()=>useEffect(()=>{
                    load(currentBranch.value);
                }, [
                    currentBranch.value
                ]));
            const truncate = (v: string)=>{
                const newline = v.indexOf('\\n');
                return newline > 0 ? v.slice(0, newline) : v;
            };
            const formatDate = (v: string)=>v.replace(/T|Z/g, ' ');
            return {
                API_URL: API_URL,
                branches: branches,
                currentBranch: currentBranch,
                commits: commits,
                load: load,
                truncate: truncate,
                formatDate: formatDate
            };
        }));
    const { API_URL: API_URL, branches: branches, currentBranch: currentBranch, commits: commits, load: load, truncate: truncate, formatDate: formatDate } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "card bg-base-100 shadow");
        const _el1 = _$createElement("div");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "card-body grid gap-4");
        const _el2 = _$createElement("h1");
        _$appendChild(_el1, _el2);
        _$setClassName(_el2, "text-2xl font-semibold");
        _$appendChild(_el2, _$createTextNode("Latest rust-lang/rust Core Commits（移植自 Vue）"));
        const _el3 = _$createElement("div");
        _$appendChild(_el1, _el3);
        _$setClassName(_el3, "flex items-center gap-4");
        const _list1 = _$createComment("rue:list:start");
        const _list2 = _$createComment("rue:list:end");
        _$appendChild(_el3, _list1);
        _$appendChild(_el3, _list2);
        let _map1_elements = new Map;
        watchEffect(()=>{
            const _map1_current = [
                'main',
                'beta',
                'stable'
            ] as const || [];
            const _map1_newElements = _$vaporKeyedList({
                items: _map1_current,
                getKey: (branch, idx)=>branch,
                elements: _map1_elements,
                parent: _el3,
                before: _list2,
                singleRoot: true,
                start: _list1,
                renderItem: (branch, parent, start, end, idx)=>{
                    const __slot = vapor(()=>{
                        const _root = _$createDocumentFragment();
                        const _el4 = _$createElement("label");
                        _$appendChild(_root, _el4);
                        watchEffect(()=>{
                            _$setAttribute(_el4, "key", String((branch)));
                        });
                        _$setClassName(_el4, "inline-flex items-center gap-2");
                        const _el5 = _$createElement("input");
                        _$appendChild(_el4, _el5);
                        _$setAttribute(_el5, "type", "radio");
                        _$setAttribute(_el5, "name", "branch");
                        _$setClassName(_el5, "radio");
                        watchEffect(()=>{
                            _$setValue(_el5, branch);
                        });
                        watchEffect(()=>{
                            _$setChecked(_el5, !!(currentBranch.value === branch));
                        });
                        _$addEventListener(_el5, "change", (()=>{
                            currentBranch.value = branch;
                        }));
                        const _el6 = _$createElement("span");
                        _$appendChild(_el4, _el6);
                        _$setClassName(_el6, "select-none");
                        const _el7 = _$createTextWrapper(_el6);
                        _$appendChild(_el6, _el7);
                        watchEffect(()=>{
                            _$settextContent(_el7, branch);
                        });
                        return {
                            vaporElement: _root
                        };
                    });
                    renderAnchor(__slot, parent, start);
                }
            });
            _map1_elements = _map1_newElements;
        });
        const _el8 = _$createElement("p");
        _$appendChild(_el1, _el8);
        _$setClassName(_el8, "text-gray-700");
        _$appendChild(_el8, _$createTextNode("rust-lang/rust@"));
        const _el9 = _$createTextWrapper(_el8);
        _$appendChild(_el8, _el9);
        watchEffect(()=>{
            _$settextContent(_el9, currentBranch.value);
        });
        const _list6 = _$createComment("rue:slot:anchor");
        _$appendChild(_el1, _list6);
        watchEffect(()=>{
            const __slot = commits.value.length > 0 ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el10 = _$createElement("ul");
                _$appendChild(_root, _el10);
                _$setClassName(_el10, "space-y-4");
                const _list3 = _$createComment("rue:list:start");
                const _list4 = _$createComment("rue:list:end");
                _$appendChild(_el10, _list3);
                _$appendChild(_el10, _list4);
                let _map2_elements = new Map;
                watchEffect(()=>{
                    const _map2_current = commits.value || [];
                    const _map2_newElements = _$vaporKeyedList({
                        items: _map2_current,
                        getKey: (item, idx)=>{
                            const { html_url, sha, author, commit } = item;
                            return sha;
                        },
                        elements: _map2_elements,
                        parent: _el10,
                        before: _list4,
                        singleRoot: true,
                        start: _list3,
                        renderItem: (item, parent, start, end, idx)=>{
                            const __slot = vapor(()=>{
                                const _root = _$createDocumentFragment();
                                const { html_url, sha, author, commit } = item;
                                const _el11 = _$createElement("li");
                                _$appendChild(_root, _el11);
                                watchEffect(()=>{
                                    _$setAttribute(_el11, "key", String((sha)));
                                });
                                _$setClassName(_el11, "leading-6");
                                const _el12 = _$createElement("a");
                                _$appendChild(_el11, _el12);
                                watchEffect(()=>{
                                    _$setAttribute(_el12, "href", String((html_url)));
                                });
                                _$setAttribute(_el12, "target", "_blank");
                                _$setAttribute(_el12, "rel", "noreferrer");
                                _$setClassName(_el12, "link link-primary");
                                const _el13 = _$createTextWrapper(_el12);
                                _$appendChild(_el12, _el13);
                                watchEffect(()=>{
                                    _$settextContent(_el13, sha.slice(0, 7));
                                });
                                const _el14 = _$createElement("span");
                                _$appendChild(_el11, _el14);
                                _$appendChild(_el14, _$createTextNode("-"));
                                const _el15 = _$createElement("span");
                                _$appendChild(_el11, _el15);
                                _$setClassName(_el15, "font-medium");
                                const _el16 = _$createTextWrapper(_el15);
                                _$appendChild(_el15, _el16);
                                watchEffect(()=>{
                                    _$settextContent(_el16, truncate(commit.message));
                                });
                                const _el17 = _$createElement("br");
                                _$appendChild(_el11, _el17);
                                const _el18 = _$createElement("span");
                                _$appendChild(_el11, _el18);
                                _$appendChild(_el18, _$createTextNode("by"));
                                const _el19 = _$createElement("span");
                                _$appendChild(_el11, _el19);
                                _$setClassName(_el19, "font-semibold");
                                const _list5 = _$createComment("rue:slot:anchor");
                                _$appendChild(_el19, _list5);
                                watchEffect(()=>{
                                    const __slot = author && author.html_url ? vapor(()=>{
                                        const _root = _$createDocumentFragment();
                                        const _el20 = _$createElement("a");
                                        _$appendChild(_root, _el20);
                                        watchEffect(()=>{
                                            _$setAttribute(_el20, "href", String((author.html_url)));
                                        });
                                        _$setAttribute(_el20, "target", "_blank");
                                        _$setAttribute(_el20, "rel", "noreferrer");
                                        _$setClassName(_el20, "link link-hover");
                                        const _el21 = _$createTextWrapper(_el20);
                                        _$appendChild(_el20, _el21);
                                        watchEffect(()=>{
                                            _$settextContent(_el21, commit.author.name);
                                        });
                                        return {
                                            vaporElement: _root
                                        };
                                    }) : vapor(()=>{
                                        const _root = _$createDocumentFragment();
                                        const _el22 = _$createElement("span");
                                        _$appendChild(_root, _el22);
                                        const _el23 = _$createTextWrapper(_el22);
                                        _$appendChild(_el22, _el23);
                                        watchEffect(()=>{
                                            _$settextContent(_el23, commit.author.name);
                                        });
                                        return {
                                            vaporElement: _root
                                        };
                                    });
                                    const __vnode = _$vaporCreateVNode(__slot);
                                    renderAnchor(__vnode, _el19, _list5);
                                });
                                const _el24 = _$createElement("span");
                                _$appendChild(_el11, _el24);
                                _$appendChild(_el24, _$createTextNode("at"));
                                const _el25 = _$createElement("span");
                                _$appendChild(_el11, _el25);
                                _$setClassName(_el25, "font-semibold");
                                const _el26 = _$createTextWrapper(_el25);
                                _$appendChild(_el25, _el26);
                                watchEffect(()=>{
                                    _$settextContent(_el26, formatDate(commit.author.date));
                                });
                                return {
                                    vaporElement: _root
                                };
                            });
                            renderAnchor(__slot, parent, start);
                        }
                    });
                    _map2_elements = _map2_newElements;
                });
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderAnchor(__vnode, _el1, _list6);
        });
        return {
            vaporElement: _root
        };
    });
};
export default FetchingData;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec14.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
