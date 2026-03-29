//! SWC 插件转换行为测试（spec34）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec34() {
    let src = r##"
import { type FC, useEffect, useState } from '@rue-js/rue'
import { RouterLink, useRoute } from '@rue-js/router'
import SidebarPlayground, { SECTIONS_BY_TYPE } from './SidebarPlayground'
// @ts-ignore
// @ts-expect-error
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
// @ts-expect-error
import container from 'markdown-it-container'
// @ts-expect-error
import attrs from 'markdown-it-attrs'
// @ts-expect-error
import tasklists from 'markdown-it-task-lists'
// @ts-expect-error
import footnote from 'markdown-it-footnote'

// 从 SidebarPlayground 的 SECTIONS_BY_TYPE 派生 DOCS_META，用于上一页/下一页
type MenuItem = { id: string; title: string; href?: string; children?: MenuItem[] }
function flatten(items: MenuItem[]): { id: string; title: string }[] {
  const out: { id: string; title: string }[] = []
  for (const it of items || []) {
    if (it.children && it.children.length) {
      out.push(...it.children.map(c => ({ id: c.id, title: c.title })))
    } else {
      out.push({ id: it.id, title: it.title })
    }
  }
  return out
}
function getContext(pathname: string): {
  sidebarType: 'guide' | 'api' | 'page'
  uiBase: string
  docBase: string
} {
  const isApi = pathname.startsWith('/api/')
  const isPage = pathname.startsWith('/page/')
  const sidebarType = (isApi ? 'api' : isPage ? 'page' : 'guide') as 'guide' | 'api' | 'page'
  const uiBase = isApi ? '/api' : isPage ? '/page' : '/guide'
  const docBase = '/docs'
  return { sidebarType, uiBase, docBase }
}

let __mdParser: MarkdownIt | null = null
async function ensureMd() {
  if (!__mdParser) {
    const md = new MarkdownIt({
      html: true,
      typographer: true,
    })
    md.use(anchor)
    md.use(tasklists)
    md.use(footnote)
    md.use(attrs)
    md.use(container, 'tip')
    md.use(container, 'info')
    md.use(container, 'warning')
    md.use(container, 'danger')
    __mdParser = md
  }
}
async function mdToHtml(md: string): Promise<string> {
  await ensureMd()
  let html = __mdParser!.render(md)
  const re = /<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g
  const blocks = [...html.matchAll(re)]
  if (!blocks.length) return html
  for (const m of blocks) {
    const lang = (m[1] || 'txt').trim() || 'txt'
    const escaped = m[2]
    const code = escaped.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    try {
      const mod = await import('shiki')
      const theme = 'tokyo-night'
      const out = await mod.codeToHtml(code, { lang, theme })
      html = html.replace(m[0], out)
    } catch {}
  }
  return html
}

const DocDetail: FC = () => {
  const route = useRoute()
  const docPath = route.value.params?.path as string
  const [_title, setTitle] = useState<string>('')
  const [html, setHtml] = useState<string>('')
  const [_results, _setResults] = useState<{ id: string; title: string; snippet: string }[]>([])

  const { sidebarType, uiBase, docBase } = getContext(route.value.path || '')
  const DOCS_META = SECTIONS_BY_TYPE[sidebarType].flatMap(sec => flatten(sec.items))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const seg = docPath || ''
      const meta = DOCS_META.find(d => d.id === seg)
      setTitle(meta?.title || seg.split('/').pop() || seg)
      const base = docBase
      const url = import.meta.env.DEV
        ? new URL(`${base}/${docPath}.md?raw`, import.meta.url)
        : `${base}/${docPath}.md`
      console.log(url)
      try {
        const md = await fetch(url as any).then(r => r.text())
        const html = await mdToHtml(md)
        if (!cancelled) setHtml(html)
      } catch {
        if (!cancelled) setHtml(`<p class="text-gray-600">加载文档失败</p>`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [docPath])

  const currentIndex = DOCS_META.findIndex(d => d.id === (docPath || ''))
  const prev = currentIndex > 0 ? DOCS_META[currentIndex - 1] : undefined
  const next =
    currentIndex >= 0 && currentIndex < DOCS_META.length - 1
      ? DOCS_META[currentIndex + 1]
      : undefined

  return (
    <SidebarPlayground type={sidebarType}>
      <div
        className="prose prose-sm md:prose-base"
        dangerouslySetInnerHTML={{ __html: html.value }}
      ></div>
      {currentIndex >= 0 && (
        <div className="mt-8 flex justify-between">
          {prev ? (
            <RouterLink to={`${uiBase}/${prev.id}`} className="btn btn-outline btn-sm">
              ← 上一页：{prev.title}
            </RouterLink>
          ) : (
            <span />
          )}
          {next ? (
            <RouterLink to={`${uiBase}/${next.id}`} className="btn btn-outline btn-sm">
              下一页：{next.title} →
            </RouterLink>
          ) : (
            <span />
          )}
        </div>
      )}
    </SidebarPlayground>
  )
}

export default DocDetail
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, useEffect, useState, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$createTextWrapper, _$vaporCreateVNode, _$setClassName, _$setInnerHTML } from '@rue-js/rue';
import { RouterLink, useRoute } from '@rue-js/router';
import SidebarPlayground, { SECTIONS_BY_TYPE } from './SidebarPlayground';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import container from 'markdown-it-container';
import attrs from 'markdown-it-attrs';
import tasklists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
type MenuItem = {
    id: string;
    title: string;
    href?: string;
    children?: MenuItem[];
};
function flatten(items: MenuItem[]): {
    id: string;
    title: string;
}[] {
    const out: {
        id: string;
        title: string;
    }[] = [];
    for (const it of items || []){
        if (it.children && it.children.length) {
            out.push(...it.children.map((c)=>({
                    id: c.id,
                    title: c.title
                })));
        } else {
            out.push({
                id: it.id,
                title: it.title
            });
        }
    }
    return out;
}
function getContext(pathname: string): {
    sidebarType: 'guide' | 'api' | 'page';
    uiBase: string;
    docBase: string;
} {
    const isApi = pathname.startsWith('/api/');
    const isPage = pathname.startsWith('/page/');
    const sidebarType = (isApi ? 'api' : isPage ? 'page' : 'guide') as 'guide' | 'api' | 'page';
    const uiBase = isApi ? '/api' : isPage ? '/page' : '/guide';
    const docBase = '/docs';
    return {
        sidebarType,
        uiBase,
        docBase
    };
}
let __mdParser: MarkdownIt | null = null;
async function ensureMd() {
    if (!__mdParser) {
        const md = new MarkdownIt({
            html: true,
            typographer: true
        });
        md.use(anchor);
        md.use(tasklists);
        md.use(footnote);
        md.use(attrs);
        md.use(container, 'tip');
        md.use(container, 'info');
        md.use(container, 'warning');
        md.use(container, 'danger');
        __mdParser = md;
    }
}
async function mdToHtml(md: string): Promise<string> {
    await ensureMd();
    let html = __mdParser!.render(md);
    const re = /<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g;
    const blocks = [
        ...html.matchAll(re)
    ];
    if (!blocks.length) return html;
    for (const m of blocks){
        const lang = (m[1] || 'txt').trim() || 'txt';
        const escaped = m[2];
        const code = escaped.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        try {
            const mod = await import('shiki');
            const theme = 'tokyo-night';
            const out = await mod.codeToHtml(code, {
                lang,
                theme
            });
            html = html.replace(m[0], out);
        } catch  {}
    }
    return html;
}
const DocDetail: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const route = useRoute();
            const docPath = route.value.params?.path as string;
            const [_title, setTitle] = _$vaporWithHookId("useState:1:0", ()=>useState<string>(''));
            const [html, setHtml] = _$vaporWithHookId("useState:1:1", ()=>useState<string>(''));
            const [_results, _setResults] = _$vaporWithHookId("useState:1:2", ()=>useState<{
                    id: string;
                    title: string;
                    snippet: string;
                }[]>([]));
            const { sidebarType, uiBase, docBase } = getContext(route.value.path || '');
            const DOCS_META = SECTIONS_BY_TYPE[sidebarType].flatMap((sec)=>flatten(sec.items));
            _$vaporWithHookId("useEffect:1:3", ()=>useEffect(()=>{
                    let cancelled = false;
                    (async ()=>{
                        const seg = docPath || '';
                        const meta = DOCS_META.find((d)=>d.id === seg);
                        setTitle(meta?.title || seg.split('/').pop() || seg);
                        const base = docBase;
                        const url = import.meta.env.DEV ? new URL(`${base}/${docPath}.md?raw`, import.meta.url) : `${base}/${docPath}.md`;
                        console.log(url);
                        try {
                            const md = await fetch(url as any).then((r)=>r.text());
                            const html = await mdToHtml(md);
                            if (!cancelled) setHtml(html);
                        } catch  {
                            if (!cancelled) setHtml(`<p class="text-gray-600">加载文档失败</p>`);
                        }
                    })();
                    return ()=>{
                        cancelled = true;
                    };
                }, [
                    docPath
                ]));
            const currentIndex = DOCS_META.findIndex((d)=>d.id === (docPath || ''));
            const prev = currentIndex > 0 ? DOCS_META[currentIndex - 1] : undefined;
            const next = currentIndex >= 0 && currentIndex < DOCS_META.length - 1 ? DOCS_META[currentIndex + 1] : undefined;
            return {
                route: route,
                docPath: docPath,
                _title: _title,
                setTitle: setTitle,
                html: html,
                setHtml: setHtml,
                _results: _results,
                _setResults: _setResults,
                sidebarType: sidebarType,
                uiBase: uiBase,
                docBase: docBase,
                DOCS_META: DOCS_META,
                currentIndex: currentIndex,
                prev: prev,
                next: next
            };
        }));
    const { route: route, docPath: docPath, _title: _title, setTitle: setTitle, html: html, setHtml: setHtml, _results: _results, _setResults: _setResults, sidebarType: sidebarType, uiBase: uiBase, docBase: docBase, DOCS_META: DOCS_META, currentIndex: currentIndex, prev: prev, next: next } = _$useSetup;
    return vapor(()=>{
        const _root = _$createDocumentFragment();
        const _list1 = _$createComment("rue:component:start");
        const _list2 = _$createComment("rue:component:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        const __child1 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _el1 = _$createElement("div");
            _$appendChild(_root, _el1);
            _$setClassName(_el1, "prose prose-sm md:prose-base");
            watchEffect(()=>{
                const __obj = ({
                    __html: html.value
                });
                _$setInnerHTML(_el1, __obj && "__html" in __obj ? __obj.__html : "");
            });
            const _list3 = _$createComment("rue:slot:start");
            const _list4 = _$createComment("rue:slot:end");
            _$appendChild(_root, _list3);
            _$appendChild(_root, _list4);
            watchEffect(()=>{
                const __slot = currentIndex >= 0 ? vapor(()=>{
                    const _root = _$createDocumentFragment();
                    const _el2 = _$createElement("div");
                    _$appendChild(_root, _el2);
                    _$setClassName(_el2, "mt-8 flex justify-between");
                    const _list8 = _$createComment("rue:slot:start");
                    const _list9 = _$createComment("rue:slot:end");
                    _$appendChild(_el2, _list8);
                    _$appendChild(_el2, _list9);
                    watchEffect(()=>{
                        const __slot = prev ? vapor(()=>{
                            const _root = _$createDocumentFragment();
                            const _list5 = _$createComment("rue:component:start");
                            const _list6 = _$createComment("rue:component:end");
                            _$appendChild(_root, _list5);
                            _$appendChild(_root, _list6);
                            const __child2 = vapor(()=>{
                                const _root = _$createDocumentFragment();
                                _$appendChild(_root, _$createTextNode("← 上一页："));
                                const _el3 = _$createTextWrapper(_root);
                                _$appendChild(_root, _el3);
                                watchEffect(()=>{
                                    _$settextContent(_el3, prev.title);
                                });
                                return {
                                    vaporElement: _root
                                };
                            });
                            watchEffect(()=>{
                                const __slot7 = <RouterLink to={`${uiBase}/${prev.id}`} className="btn btn-outline btn-sm" children={__child2}/>;
                                renderBetween(__slot7, _root, _list5, _list6);
                            });
                            return {
                                vaporElement: _root
                            };
                        }) : vapor(()=>{
                            const _root = _$createDocumentFragment();
                            const _el4 = _$createElement("span");
                            _$appendChild(_root, _el4);
                            return {
                                vaporElement: _root
                            };
                        });
                        const __vnode = _$vaporCreateVNode(__slot);
                        renderBetween(__vnode, _el2, _list8, _list9);
                    });
                    _$appendChild(_el2, _$createTextNode(" "));
                    const _list13 = _$createComment("rue:slot:start");
                    const _list14 = _$createComment("rue:slot:end");
                    _$appendChild(_el2, _list13);
                    _$appendChild(_el2, _list14);
                    watchEffect(()=>{
                        const __slot = next ? vapor(()=>{
                            const _root = _$createDocumentFragment();
                            const _list10 = _$createComment("rue:component:start");
                            const _list11 = _$createComment("rue:component:end");
                            _$appendChild(_root, _list10);
                            _$appendChild(_root, _list11);
                            const __child3 = vapor(()=>{
                                const _root = _$createDocumentFragment();
                                _$appendChild(_root, _$createTextNode("下一页："));
                                const _el5 = _$createTextWrapper(_root);
                                _$appendChild(_root, _el5);
                                watchEffect(()=>{
                                    _$settextContent(_el5, next.title);
                                });
                                _$appendChild(_root, _$createTextNode(" →"));
                                return {
                                    vaporElement: _root
                                };
                            });
                            watchEffect(()=>{
                                const __slot12 = <RouterLink to={`${uiBase}/${next.id}`} className="btn btn-outline btn-sm" children={__child3}/>;
                                renderBetween(__slot12, _root, _list10, _list11);
                            });
                            return {
                                vaporElement: _root
                            };
                        }) : vapor(()=>{
                            const _root = _$createDocumentFragment();
                            const _el6 = _$createElement("span");
                            _$appendChild(_root, _el6);
                            return {
                                vaporElement: _root
                            };
                        });
                        const __vnode = _$vaporCreateVNode(__slot);
                        renderBetween(__vnode, _el2, _list13, _list14);
                    });
                    return {
                        vaporElement: _root
                    };
                }) : "";
                const __vnode = _$vaporCreateVNode(__slot);
                renderBetween(__vnode, _root, _list3, _list4);
            });
            return {
                vaporElement: _root
            };
        });
        watchEffect(()=>{
            const __slot = <SidebarPlayground type={sidebarType} children={__child1}/>;
            renderBetween(__slot, _root, _list1, _list2);
        });
        return {
            vaporElement: _root
        };
    });
};
export default DocDetail;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec34.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
