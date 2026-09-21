//! SWC 插件转换行为测试（spec13）
//!
//! 覆盖：Markdown 编辑器场景下，ref 与防抖逻辑的转换。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec13() {
    let src = r##"
import { FC, ref } from '@rue-js/rue';
import { markdownToHtml } from 'satteri';

const renderMarkdown = (source: string) => markdownToHtml(source).html;

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 100) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait) as unknown as number;
  };
}

const MarkdownEditor: FC = () => {
  const input = ref<string>('# hello');
  const update = debounce((e: any) => { input.value = (e.target as HTMLTextAreaElement).value; }, 100);
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <div className="grid grid-cols-2 gap-0 h-[360px] md:h-[560px] rounded-xl overflow-hidden ring-1 ring-black/5">
          <textarea
            className="textarea textarea-bordered rounded-none border-r"
            value={input.value}
            onInput={update}
          />
          <div
            className="p-4 overflow-auto"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(input.value) }}
          />
        </div>
      </div>
    </div>
  );
};

export default MarkdownEditor;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { ref, _$compiledWithHookId, useSetup, _$compiledRoot, _$createElement, _$template, _$appendChild, onScopeDispose, watchEffect, _$setClassName, _$setInnerHTML, _$setValue } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { markdownToHtml } from 'satteri';
const _$getTemplate1 = _$template('<div class="card bg-base-100 shadow"><div class="card-body grid gap-4"><div class="grid grid-cols-2 gap-0 h-[360px] md:h-[560px] rounded-xl overflow-hidden ring-1 ring-black/5"><!--rue:opaque-hole:0--><!--rue:opaque-hole:1--></div></div></div>');
const renderMarkdown = (source: string)=>markdownToHtml(source).html;
function debounce<T extends (...args: any[]) => void>(fn: T, wait = 100) {
    let t: number | undefined;
    return (...args: Parameters<T>)=>{
        if (t) clearTimeout(t);
        t = setTimeout(()=>fn(...args), wait) as unknown as number;
    };
}
const MarkdownEditor: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const input = ref<string>('# hello');
            const update = debounce((e: any)=>{
                input.value = (e.target as HTMLTextAreaElement).value;
            }, 100);
            return {
                input: input,
                update: update
            };
        }));
    const { input: input, update: update } = _$useSetup;
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[0].childNodes[0].childNodes[0];
        const _el2 = _el1.parentNode;
        const _el3 = _root.childNodes[0].childNodes[0].childNodes[1];
        const _el4 = _el3.parentNode;
        const _el5 = _$createElement("textarea", _el2);
        _$appendChild(_el2, _el5);
        _el2.insertBefore(_el5, _el1);
        _$setClassName(_el5, "textarea textarea-bordered rounded-none border-r");
        watchEffect(()=>{
            _$setValue(_el5, input.value);
        });
        const _el5_event_2 = ($event)=>update($event);
        _el5.addEventListener("input", _el5_event_2);
        onScopeDispose(()=>_el5.removeEventListener("input", _el5_event_2));
        const _el6 = _$createElement("div", _el4);
        _$appendChild(_el4, _el6);
        _el4.insertBefore(_el6, _el3);
        _$setClassName(_el6, "p-4 overflow-auto");
        watchEffect(()=>{
            const __obj = ({
                __html: renderMarkdown(input.value)
            });
            _$setInnerHTML(_el6, __obj && "__html" in __obj ? __obj.__html : "");
        });
        return _root;
    });
};
export default MarkdownEditor;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec13.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");
    assert!(normalized.contains("_$setValue(_el5, input.value)"), "{normalized}");
    assert!(normalized.contains("_$setInnerHTML"), "{normalized}");
    assert!(normalized.contains("renderMarkdown(input.value)"), "{normalized}");
    assert!(normalized.contains(".addEventListener(\"input\""), "{normalized}");
    assert!(normalized.contains(".removeEventListener(\"input\""), "{normalized}");
    assert!(!normalized.contains("watchEffect"), "{normalized}");
}
