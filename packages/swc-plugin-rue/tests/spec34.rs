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
import { defineMdastPlugin, markdownToHtml } from 'satteri'

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

const CODE_BLOCK_RE = /<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g
const CONTAINER_DIRECTIVE_MARKER_RE = /^([\x20]{0,3}:{3,})[\x20\t]+(tip|info|warning|danger)(?=\s|$)/gm
const DOC_CONTAINER_DIRECTIVES = new Set(['tip', 'info', 'warning', 'danger'])

const docContainerDirectivePlugin = defineMdastPlugin({
  name: 'rue-doc-container-directives',
  containerDirective(node, ctx) {
    if (!DOC_CONTAINER_DIRECTIVES.has(node.name)) {
      ctx.report({
        message: `Unsupported container directive "${node.name}" was ignored.`,
        node,
        severity: 'warning',
      })
      return
    }

    const hProperties: Record<string, string | string[]> = {}
    const classNames = [node.name]

    for (const [key, value] of Object.entries(node.attributes ?? {})) {
      if (value == null) {
        continue
      }
      if (key === 'class') {
        classNames.push(...value.split(/\s+/).filter(Boolean))
        continue
      }
      hProperties[key] = value
    }

    hProperties.className = classNames

    ctx.setProperty(node, 'data', {
      ...(node.data ?? {}),
      hName: 'div',
      hProperties,
    })
  },
})

const markdownOptions = {
  features: {
    headingAttributes: true,
    directive: true,
    smartPunctuation: true,
  },
  mdastPlugins: [docContainerDirectivePlugin],
}

const normalizeContainerDirectiveMarkers = (source: string) =>
  source.replace(CONTAINER_DIRECTIVE_MARKER_RE, '$1$2')

async function mdToHtml(markdown: string): Promise<string> {
  const result = await markdownToHtml(normalizeContainerDirectiveMarkers(markdown), markdownOptions)
  let html = result.html
  const blocks = [...html.matchAll(CODE_BLOCK_RE)]
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
        dangerouslySetInnerHTML={{ __html: html }}
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

    let _expected_fragment = r##"import { useState, useEffect, _$compiledWithHookId, useSetup, _$compiledRoot, _$createComponent, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$createDocumentFragment, _$appendChild, untrack, watchEffect, _$setAttribute, _$addEventListener, _$setClassName, _$setInnerHTML, _$compiledCreateElement, _$compiledRoot } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterLink, useRoute } from '@rue-js/router';
import SidebarPlayground, { SECTIONS_BY_TYPE } from './SidebarPlayground';
import { defineMdastPlugin, markdownToHtml } from 'satteri';
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
const CODE_BLOCK_RE = /<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g;
const CONTAINER_DIRECTIVE_MARKER_RE = /^([\x20]{0,3}:{3,})[\x20\t]+(tip|info|warning|danger)(?=\s|$)/gm;
const DOC_CONTAINER_DIRECTIVES = new Set([
    'tip',
    'info',
    'warning',
    'danger'
]);
const docContainerDirectivePlugin = defineMdastPlugin({
    name: 'rue-doc-container-directives',
    containerDirective (node, ctx) {
        if (!DOC_CONTAINER_DIRECTIVES.has(node.name)) {
            ctx.report({
                message: `Unsupported container directive "${node.name}" was ignored.`,
                node,
                severity: 'warning'
            });
            return;
        }
        const hProperties: Record<string, string | string[]> = {};
        const classNames = [
            node.name
        ];
        for (const [key, value] of Object.entries(node.attributes ?? {})){
            if (value == null) {
                continue;
            }
            if (key === 'class') {
                classNames.push(...value.split(/\s+/).filter(Boolean));
                continue;
            }
            hProperties[key] = value;
        }
        hProperties.className = classNames;
        ctx.setProperty(node, 'data', {
            ...(node.data ?? {}),
            hName: 'div',
            hProperties
        });
    }
});
const markdownOptions = {
    features: {
        headingAttributes: true,
        directive: true,
        smartPunctuation: true
    },
    mdastPlugins: [
        docContainerDirectivePlugin
    ]
};
const normalizeContainerDirectiveMarkers = (source: string)=>source.replace(CONTAINER_DIRECTIVE_MARKER_RE, '$1$2');
async function mdToHtml(markdown: string): Promise<string> {
    const result = await markdownToHtml(normalizeContainerDirectiveMarkers(markdown), markdownOptions);
    let html = result.html;
    const blocks = [
        ...html.matchAll(CODE_BLOCK_RE)
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
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const route = useRoute();
            const docPath = route.value.params?.path as string;
            const [_title, setTitle] = _$compiledWithHookId("useState:1:0", ()=>useState<string>(''));
            const [html, setHtml] = _$compiledWithHookId("useState:1:1", ()=>useState<string>(''));
            const [_results, _setResults] = _$compiledWithHookId("useState:1:2", ()=>useState<{
                    id: string;
                    title: string;
                    snippet: string;
                }[]>([]));
            const { sidebarType, uiBase, docBase } = getContext(route.value.path || '');
            const DOCS_META = SECTIONS_BY_TYPE[sidebarType].flatMap((sec)=>flatten(sec.items));
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
                DOCS_META: DOCS_META
            };
        }));
    const { route: route, docPath: docPath, _title: _title, setTitle: setTitle, html: html, setHtml: setHtml, _results: _results, _setResults: _setResults, sidebarType: sidebarType, uiBase: uiBase, docBase: docBase, DOCS_META: DOCS_META } = _$useSetup;
    _$compiledWithHookId("useEffect:1:3", ()=>useEffect(()=>{
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
    return _$compiledRoot((__rue_parent_context)=>{
        const _root = _$createDocumentFragment();
        const _list6 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list6);
        const __child1 = _$compiledRoot(()=>{
            const _root = _$createDocumentFragment();
            const _el1 = _$createElement("div", _root);
            _$appendChild(_root, _el1);
            _$setClassName(_el1, "prose prose-sm md:prose-base");
            watchEffect(()=>{
                const __obj = ({
                    __html: html
                });
                _$setInnerHTML(_el1, __obj && "__html" in __obj ? __obj.__html : "");
            });
            const _list5 = _$createComment("rue:slot:anchor");
            _$appendChild(_root, _list5);
            watchEffect(()=>{
                const __slot = currentIndex >= 0 ? _$compiledRoot(()=>{
                    const _root = _$createDocumentFragment();
                    const _el2 = _$createElement("div", _root);
                    _$appendChild(_root, _el2);
                    _$setClassName(_el2, "mt-8 flex justify-between");
                    const _list2 = _$createComment("rue:slot:anchor");
                    _$appendChild(_el2, _list2);
                    watchEffect(()=>{
                        const __slot = prev ? _$compiledRoot(()=>{
                            const _root = _$createDocumentFragment();
                            const _el3 = _$createElement("a", _root);
                            _$appendChild(_root, _el3);
                            watchEffect(()=>{
                                _$setAttribute(_el3, "href", String(RouterLink.__rueHref(`${uiBase}/${prev.id}`)));
                            });
                            _$addEventListener(_el3, "click", ((e)=>RouterLink.__rueOnClick(e, `${uiBase}/${prev.id}`, false)));
                            _$addEventListener(_el3, "pointerenter", ((e)=>RouterLink.__rueOnPrefetch(e, `${uiBase}/${prev.id}`, "hover")));
                            _$addEventListener(_el3, "focus", ((e)=>RouterLink.__rueOnPrefetch(e, `${uiBase}/${prev.id}`, "hover")));
                            _$addEventListener(_el3, "pointerdown", ((e)=>RouterLink.__rueOnPrefetch(e, `${uiBase}/${prev.id}`, "hover")));
                            _$addEventListener(_el3, "touchstart", ((e)=>RouterLink.__rueOnPrefetch(e, `${uiBase}/${prev.id}`, "hover")));
                            _$setClassName(_el3, "btn btn-outline btn-sm");
                            _$appendChild(_el3, _$createTextNode("← 上一页："));
                            const _list1 = _$createComment("rue:slot:anchor");
                            _$appendChild(_el3, _list1);
                            watchEffect(()=>{
                                const __slot = (prev.title);
                                untrack(()=>renderAnchor(__slot, _el3, _list1));
                            });
                            return _root;
                        }) : _$compiledRoot((__rue_parent_context)=>{
                            const _root = _$compiledCreateElement("span", __rue_parent_context);
                            return _root;
                        });
                        untrack(()=>renderAnchor(__slot, _el2, _list2));
                    });
                    const _list4 = _$createComment("rue:slot:anchor");
                    _$appendChild(_el2, _list4);
                    watchEffect(()=>{
                        const __slot = next ? _$compiledRoot(()=>{
                            const _root = _$createDocumentFragment();
                            const _el4 = _$createElement("a", _root);
                            _$appendChild(_root, _el4);
                            watchEffect(()=>{
                                _$setAttribute(_el4, "href", String(RouterLink.__rueHref(`${uiBase}/${next.id}`)));
                            });
                            _$addEventListener(_el4, "click", ((e)=>RouterLink.__rueOnClick(e, `${uiBase}/${next.id}`, false)));
                            _$addEventListener(_el4, "pointerenter", ((e)=>RouterLink.__rueOnPrefetch(e, `${uiBase}/${next.id}`, "hover")));
                            _$addEventListener(_el4, "focus", ((e)=>RouterLink.__rueOnPrefetch(e, `${uiBase}/${next.id}`, "hover")));
                            _$addEventListener(_el4, "pointerdown", ((e)=>RouterLink.__rueOnPrefetch(e, `${uiBase}/${next.id}`, "hover")));
                            _$addEventListener(_el4, "touchstart", ((e)=>RouterLink.__rueOnPrefetch(e, `${uiBase}/${next.id}`, "hover")));
                            _$setClassName(_el4, "btn btn-outline btn-sm");
                            _$appendChild(_el4, _$createTextNode("下一页："));
                            const _list3 = _$createComment("rue:slot:anchor");
                            _$appendChild(_el4, _list3);
                            watchEffect(()=>{
                                const __slot = (next.title);
                                untrack(()=>renderAnchor(__slot, _el4, _list3));
                            });
                            _$appendChild(_el4, _$createTextNode(" →"));
                            return _root;
                        }) : _$compiledRoot((__rue_parent_context)=>{
                            const _root = _$compiledCreateElement("span", __rue_parent_context);
                            return _root;
                        });
                        untrack(()=>renderAnchor(__slot, _el2, _list4));
                    });
                    return _root;
                }, true) : "";
                untrack(()=>renderAnchor(__slot, _root, _list5));
            });
            return _root;
        });
        watchEffect(()=>{
            const __slot7 = _$createComponent(SidebarPlayground, {
                type: sidebarType,
                children: __child1
            });
            untrack(()=>renderAnchor(__slot7, _root, _list6));
        });
        return _root;
    });
};
export default DocDetail;"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec34.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("return _$createComponent(SidebarPlayground"));
    assert!(normalized.contains("type: sidebarType"));
    assert!(
        normalized.contains("children: [ __child1, currentIndex >= 0 ? __child2 : undefined ]")
    );
    assert!(!normalized.contains(" h("));
}
