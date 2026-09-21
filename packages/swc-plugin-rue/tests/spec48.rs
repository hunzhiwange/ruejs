//! SWC 插件转换行为测试（spec48）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec48() {
    let src = r##"
import { useState, type FC } from '@rue-js/rue'
import { RouterLink } from '@rue-js/router';

const About: FC<{ theme: string; setTheme: (t: string) => void }> = p => {
  const [open, setOpen] = useState<boolean>(false)

  return (
    <div>
      打开状态: {!!open ? '是' : '否'}
      <ul>
        <li>
          <RouterLink to="/page/about/faq" onMouseDown={() => setOpen(false)}>
            常见问题
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/about/team" onMouseDown={() => setOpen(false)}>
            团队
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/about/releases" onMouseDown={() => setOpen(false)}>
            版本发布
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/about/community-guide" onMouseDown={() => setOpen(false)}>
            社区指南
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/about/coc" onMouseDown={() => setOpen(false)} hello={() => console.log('hello')}>
            行为规范
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/about/privacy" onMouseDown={() => setOpen(false)}>
            隐私政策
          </RouterLink>
        </li>
      </ul>

      <div>
        © {new Date().getFullYear()} Rue js {1+1} hello world 48
      </div>
    </div>
  )
}

export default About
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _legacy_expected_fragment = r##"
import { useState, _$compiledWithHookId, useSetup, _$compiledRoot, renderAnchor, _$createElement, _$template, _$createTextNode, _$appendChild, onScopeDispose, untrack, watchEffect, _$setAttribute } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const _$getTemplate1 = _$template("<div>打开状态: <!--rue:text-hole:0--><ul><li><!--rue:opaque-hole:1--></li><li><!--rue:opaque-hole:2--></li><li><!--rue:opaque-hole:3--></li><li><!--rue:opaque-hole:4--></li><li><!--rue:opaque-hole:5--></li><li><!--rue:opaque-hole:6--></li></ul><div>© <!--rue:text-hole:7--> Rue js <!--rue:text-hole:8--> hello world 48</div></div>");
const About: FC<{
    theme: string;
    setTheme: (t: string) => void;
}> = (p)=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const [open, setOpen] = _$compiledWithHookId("useState:1:0", ()=>useState<boolean>(false));
            return {
                open: open,
                setOpen: setOpen
            };
        }));
    const { open: open, setOpen: setOpen } = _$useSetup;
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[1];
        const _el2 = _el1.parentNode;
        const _el3 = _root.childNodes[2].childNodes[0].childNodes[0];
        const _el4 = _el3.parentNode;
        const _el5 = _root.childNodes[2].childNodes[1].childNodes[0];
        const _el6 = _el5.parentNode;
        const _el7 = _root.childNodes[2].childNodes[2].childNodes[0];
        const _el8 = _el7.parentNode;
        const _el9 = _root.childNodes[2].childNodes[3].childNodes[0];
        const _el10 = _el9.parentNode;
        const _el11 = _root.childNodes[2].childNodes[4].childNodes[0];
        const _el12 = _el11.parentNode;
        const _el13 = _root.childNodes[2].childNodes[5].childNodes[0];
        const _el14 = _el13.parentNode;
        const _el15 = _root.childNodes[3].childNodes[1];
        const _el16 = _el15.parentNode;
        const _el17 = _root.childNodes[3].childNodes[3];
        const _el18 = _el17.parentNode;
        watchEffect(()=>{
            const __slot = !!open ? '是' : '否';
            untrack(()=>renderAnchor(__slot, _el2, _el1));
        });
        const _el19 = _$createElement("a", _el4);
        _$appendChild(_el4, _el19);
        _el4.insertBefore(_el19, _el3);
        watchEffect(()=>{
            _$setAttribute(_el19, "href", String(RouterLink.__rueHref("/page/about/faq")));
        });
        const _el19_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/faq", false)($event);
        _el19.addEventListener("click", _el19_event_1);
        onScopeDispose(()=>_el19.removeEventListener("click", _el19_event_1));
        const _el19_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/faq", "hover")($event);
        _el19.addEventListener("pointerenter", _el19_event_2);
        onScopeDispose(()=>_el19.removeEventListener("pointerenter", _el19_event_2));
        const _el19_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/faq", "hover")($event);
        _el19.addEventListener("focus", _el19_event_3);
        onScopeDispose(()=>_el19.removeEventListener("focus", _el19_event_3));
        const _el19_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/faq", "hover")($event);
        _el19.addEventListener("pointerdown", _el19_event_4);
        onScopeDispose(()=>_el19.removeEventListener("pointerdown", _el19_event_4));
        const _el19_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/faq", "hover")($event);
        _el19.addEventListener("touchstart", _el19_event_5);
        onScopeDispose(()=>_el19.removeEventListener("touchstart", _el19_event_5));
        const _el19_event_6 = ($event)=>()=>setOpen(false)($event);
        _el19.addEventListener("mousedown", _el19_event_6);
        onScopeDispose(()=>_el19.removeEventListener("mousedown", _el19_event_6));
        _$appendChild(_el19, _$createTextNode("常见问题"));
        const _el20 = _$createElement("a", _el6);
        _$appendChild(_el6, _el20);
        _el6.insertBefore(_el20, _el5);
        watchEffect(()=>{
            _$setAttribute(_el20, "href", String(RouterLink.__rueHref("/page/about/team")));
        });
        const _el20_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/team", false)($event);
        _el20.addEventListener("click", _el20_event_1);
        onScopeDispose(()=>_el20.removeEventListener("click", _el20_event_1));
        const _el20_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/team", "hover")($event);
        _el20.addEventListener("pointerenter", _el20_event_2);
        onScopeDispose(()=>_el20.removeEventListener("pointerenter", _el20_event_2));
        const _el20_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/team", "hover")($event);
        _el20.addEventListener("focus", _el20_event_3);
        onScopeDispose(()=>_el20.removeEventListener("focus", _el20_event_3));
        const _el20_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/team", "hover")($event);
        _el20.addEventListener("pointerdown", _el20_event_4);
        onScopeDispose(()=>_el20.removeEventListener("pointerdown", _el20_event_4));
        const _el20_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/team", "hover")($event);
        _el20.addEventListener("touchstart", _el20_event_5);
        onScopeDispose(()=>_el20.removeEventListener("touchstart", _el20_event_5));
        const _el20_event_6 = ($event)=>()=>setOpen(false)($event);
        _el20.addEventListener("mousedown", _el20_event_6);
        onScopeDispose(()=>_el20.removeEventListener("mousedown", _el20_event_6));
        _$appendChild(_el20, _$createTextNode("团队"));
        const _el21 = _$createElement("a", _el8);
        _$appendChild(_el8, _el21);
        _el8.insertBefore(_el21, _el7);
        watchEffect(()=>{
            _$setAttribute(_el21, "href", String(RouterLink.__rueHref("/page/about/releases")));
        });
        const _el21_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/releases", false)($event);
        _el21.addEventListener("click", _el21_event_1);
        onScopeDispose(()=>_el21.removeEventListener("click", _el21_event_1));
        const _el21_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/releases", "hover")($event);
        _el21.addEventListener("pointerenter", _el21_event_2);
        onScopeDispose(()=>_el21.removeEventListener("pointerenter", _el21_event_2));
        const _el21_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/releases", "hover")($event);
        _el21.addEventListener("focus", _el21_event_3);
        onScopeDispose(()=>_el21.removeEventListener("focus", _el21_event_3));
        const _el21_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/releases", "hover")($event);
        _el21.addEventListener("pointerdown", _el21_event_4);
        onScopeDispose(()=>_el21.removeEventListener("pointerdown", _el21_event_4));
        const _el21_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/releases", "hover")($event);
        _el21.addEventListener("touchstart", _el21_event_5);
        onScopeDispose(()=>_el21.removeEventListener("touchstart", _el21_event_5));
        const _el21_event_6 = ($event)=>()=>setOpen(false)($event);
        _el21.addEventListener("mousedown", _el21_event_6);
        onScopeDispose(()=>_el21.removeEventListener("mousedown", _el21_event_6));
        _$appendChild(_el21, _$createTextNode("版本发布"));
        const _el22 = _$createElement("a", _el10);
        _$appendChild(_el10, _el22);
        _el10.insertBefore(_el22, _el9);
        watchEffect(()=>{
            _$setAttribute(_el22, "href", String(RouterLink.__rueHref("/page/about/community-guide")));
        });
        const _el22_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/community-guide", false)($event);
        _el22.addEventListener("click", _el22_event_1);
        onScopeDispose(()=>_el22.removeEventListener("click", _el22_event_1));
        const _el22_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/community-guide", "hover")($event);
        _el22.addEventListener("pointerenter", _el22_event_2);
        onScopeDispose(()=>_el22.removeEventListener("pointerenter", _el22_event_2));
        const _el22_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/community-guide", "hover")($event);
        _el22.addEventListener("focus", _el22_event_3);
        onScopeDispose(()=>_el22.removeEventListener("focus", _el22_event_3));
        const _el22_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/community-guide", "hover")($event);
        _el22.addEventListener("pointerdown", _el22_event_4);
        onScopeDispose(()=>_el22.removeEventListener("pointerdown", _el22_event_4));
        const _el22_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/community-guide", "hover")($event);
        _el22.addEventListener("touchstart", _el22_event_5);
        onScopeDispose(()=>_el22.removeEventListener("touchstart", _el22_event_5));
        const _el22_event_6 = ($event)=>()=>setOpen(false)($event);
        _el22.addEventListener("mousedown", _el22_event_6);
        onScopeDispose(()=>_el22.removeEventListener("mousedown", _el22_event_6));
        _$appendChild(_el22, _$createTextNode("社区指南"));
        const _el23 = _$createElement("a", _el12);
        _$appendChild(_el12, _el23);
        _el12.insertBefore(_el23, _el11);
        watchEffect(()=>{
            _$setAttribute(_el23, "href", String(RouterLink.__rueHref("/page/about/coc")));
        });
        const _el23_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/coc", false)($event);
        _el23.addEventListener("click", _el23_event_1);
        onScopeDispose(()=>_el23.removeEventListener("click", _el23_event_1));
        const _el23_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/coc", "hover")($event);
        _el23.addEventListener("pointerenter", _el23_event_2);
        onScopeDispose(()=>_el23.removeEventListener("pointerenter", _el23_event_2));
        const _el23_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/coc", "hover")($event);
        _el23.addEventListener("focus", _el23_event_3);
        onScopeDispose(()=>_el23.removeEventListener("focus", _el23_event_3));
        const _el23_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/coc", "hover")($event);
        _el23.addEventListener("pointerdown", _el23_event_4);
        onScopeDispose(()=>_el23.removeEventListener("pointerdown", _el23_event_4));
        const _el23_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/coc", "hover")($event);
        _el23.addEventListener("touchstart", _el23_event_5);
        onScopeDispose(()=>_el23.removeEventListener("touchstart", _el23_event_5));
        const _el23_event_6 = ($event)=>()=>setOpen(false)($event);
        _el23.addEventListener("mousedown", _el23_event_6);
        onScopeDispose(()=>_el23.removeEventListener("mousedown", _el23_event_6));
        watchEffect(()=>{
            _$setAttribute(_el23, "hello", String(()=>console.log('hello')));
        });
        _$appendChild(_el23, _$createTextNode("行为规范"));
        const _el24 = _$createElement("a", _el14);
        _$appendChild(_el14, _el24);
        _el14.insertBefore(_el24, _el13);
        watchEffect(()=>{
            _$setAttribute(_el24, "href", String(RouterLink.__rueHref("/page/about/privacy")));
        });
        const _el24_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/privacy", false)($event);
        _el24.addEventListener("click", _el24_event_1);
        onScopeDispose(()=>_el24.removeEventListener("click", _el24_event_1));
        const _el24_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/privacy", "hover")($event);
        _el24.addEventListener("pointerenter", _el24_event_2);
        onScopeDispose(()=>_el24.removeEventListener("pointerenter", _el24_event_2));
        const _el24_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/privacy", "hover")($event);
        _el24.addEventListener("focus", _el24_event_3);
        onScopeDispose(()=>_el24.removeEventListener("focus", _el24_event_3));
        const _el24_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/privacy", "hover")($event);
        _el24.addEventListener("pointerdown", _el24_event_4);
        onScopeDispose(()=>_el24.removeEventListener("pointerdown", _el24_event_4));
        const _el24_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/privacy", "hover")($event);
        _el24.addEventListener("touchstart", _el24_event_5);
        onScopeDispose(()=>_el24.removeEventListener("touchstart", _el24_event_5));
        const _el24_event_6 = ($event)=>()=>setOpen(false)($event);
        _el24.addEventListener("mousedown", _el24_event_6);
        onScopeDispose(()=>_el24.removeEventListener("mousedown", _el24_event_6));
        _$appendChild(_el24, _$createTextNode("隐私政策"));
        watchEffect(()=>{
            const __slot = new Date().getFullYear();
            untrack(()=>renderAnchor(__slot, _el16, _el15));
        });
        watchEffect(()=>{
            const __slot = 1 + 1;
            untrack(()=>renderAnchor(__slot, _el18, _el17));
        });
        return _root;
    });
};
export default About;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec48.out.js", strip_marker(&out)).ok();
    let output = normalize(&strip_marker(&out));
    assert!(output.contains("_$mountCompiledSlotAt"), "{output}");
    assert_eq!(output.matches("_$compiledComponent(RouterLink").count(), 6, "{output}");
    assert_eq!(output.matches("setOpen(false)").count(), 6, "{output}");
    assert!(output.contains("new Date().getFullYear()"), "{output}");
    assert!(output.contains("_$compiledText(_el26, ()=>1 + 1)"), "{output}");
}
