//! SWC 插件转换行为测试（spec13）
//!
//! 覆盖：Markdown 编辑器场景下，ref 与防抖逻辑的转换。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec13() {
    let src = r##"
import { FC, ref } from '@rue-js/rue';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: true, linkify: true, breaks: true });

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
            className="p-4 overflow-auto prose prose-sm"
            dangerouslySetInnerHTML={{ __html: md.render(input.value) }}
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

    let expected_fragment = r##"
import { FC, ref, _$vaporWithHookId, useSetup, vapor, _$createElement, _$appendChild, watchEffect, _$addEventListener, _$setClassName, _$setInnerHTML, _$setValue } from '@rue-js/rue';
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true
});
function debounce<T extends (...args: any[]) => void>(fn: T, wait = 100) {
    let t: number | undefined;
    return (...args: Parameters<T>)=>{
        if (t) clearTimeout(t);
        t = setTimeout(()=>fn(...args), wait) as unknown as number;
    };
}
const MarkdownEditor: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const input = _$vaporWithHookId("ref:1:0", ()=>ref<string>('# hello'));
            const update = debounce((e: any)=>{
                input.value = (e.target as HTMLTextAreaElement).value;
            }, 100);
            return {
                input: input,
                update: update
            };
        }));
    const { input: input, update: update } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "card bg-base-100 shadow");
        const _el1 = _$createElement("div");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "card-body grid gap-4");
        const _el2 = _$createElement("div");
        _$appendChild(_el1, _el2);
        _$setClassName(_el2, "grid grid-cols-2 gap-0 h-[360px] md:h-[560px] rounded-xl overflow-hidden ring-1 ring-black/5");
        const _el3 = _$createElement("textarea");
        _$appendChild(_el2, _el3);
        _$setClassName(_el3, "textarea textarea-bordered rounded-none border-r");
        watchEffect(()=>{
            _$setValue(_el3, input.value);
        });
        _$addEventListener(_el3, "input", (update));
        const _el4 = _$createElement("div");
        _$appendChild(_el2, _el4);
        _$setClassName(_el4, "p-4 overflow-auto prose prose-sm");
        watchEffect(()=>{
            const __obj = ({
                __html: md.render(input.value)
            });
            _$setInnerHTML(_el4, __obj && "__html" in __obj ? __obj.__html : "");
        });
        return {
            vaporElement: _root
        };
    });
};
export default MarkdownEditor;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec13.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
