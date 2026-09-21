//! SWC 插件转换行为测试（spec49）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec49() {
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
        <li><RouterLink to="/page/about/number" onMouseDown={() => setOpen(false)}>{48}</RouterLink></li>
        <li><RouterLink to="/page/about/expr" onMouseDown={() => setOpen(false)}>{1 + 2}</RouterLink></li>
        <li><RouterLink to="/page/about/template" onMouseDown={() => setOpen(false)}>{`模板-${p.theme}`}</RouterLink></li>
        <li><RouterLink to="/page/about/cond" onMouseDown={() => setOpen(false)}>{!!open ? '开' : '关'}</RouterLink></li>
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
import { useState, _$compiledWithHookId, useSetup, _$compiledRoot, renderAnchor, _$createElement, _$template, _$createTextNode, _$settextContent, _$appendChild, onScopeDispose, untrack, watchEffect, _$createTextWrapper, _$setAttribute } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const _$getTemplate1 = _$template("<div>打开状态: <!--rue:text-hole:0--><ul><li><!--rue:opaque-hole:1--></li><li><!--rue:opaque-hole:2--></li><li><!--rue:opaque-hole:3--></li><li><!--rue:opaque-hole:4--></li><li><!--rue:opaque-hole:5--></li><li><!--rue:opaque-hole:6--></li><li><!--rue:opaque-hole:7--></li><li><!--rue:opaque-hole:8--></li><li><!--rue:opaque-hole:9--></li><li><!--rue:opaque-hole:10--></li></ul><div>© <!--rue:text-hole:11--> Rue js <!--rue:text-hole:12--> hello world 48</div></div>");
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
        const _el15 = _root.childNodes[2].childNodes[6].childNodes[0];
        const _el16 = _el15.parentNode;
        const _el17 = _root.childNodes[2].childNodes[7].childNodes[0];
        const _el18 = _el17.parentNode;
        const _el19 = _root.childNodes[2].childNodes[8].childNodes[0];
        const _el20 = _el19.parentNode;
        const _el21 = _root.childNodes[2].childNodes[9].childNodes[0];
        const _el22 = _el21.parentNode;
        const _el23 = _root.childNodes[3].childNodes[1];
        const _el24 = _el23.parentNode;
        const _el25 = _root.childNodes[3].childNodes[3];
        const _el26 = _el25.parentNode;
        watchEffect(()=>{
            const __slot = !!open ? '是' : '否';
            untrack(()=>renderAnchor(__slot, _el2, _el1));
        });
        const _el27 = _$createElement("a", _el4);
        _$appendChild(_el4, _el27);
        _el4.insertBefore(_el27, _el3);
        watchEffect(()=>{
            _$setAttribute(_el27, "href", String(RouterLink.__rueHref("/page/about/faq")));
        });
        const _el27_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/faq", false)($event);
        _el27.addEventListener("click", _el27_event_1);
        onScopeDispose(()=>_el27.removeEventListener("click", _el27_event_1));
        const _el27_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/faq", "hover")($event);
        _el27.addEventListener("pointerenter", _el27_event_2);
        onScopeDispose(()=>_el27.removeEventListener("pointerenter", _el27_event_2));
        const _el27_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/faq", "hover")($event);
        _el27.addEventListener("focus", _el27_event_3);
        onScopeDispose(()=>_el27.removeEventListener("focus", _el27_event_3));
        const _el27_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/faq", "hover")($event);
        _el27.addEventListener("pointerdown", _el27_event_4);
        onScopeDispose(()=>_el27.removeEventListener("pointerdown", _el27_event_4));
        const _el27_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/faq", "hover")($event);
        _el27.addEventListener("touchstart", _el27_event_5);
        onScopeDispose(()=>_el27.removeEventListener("touchstart", _el27_event_5));
        const _el27_event_6 = ($event)=>()=>setOpen(false)($event);
        _el27.addEventListener("mousedown", _el27_event_6);
        onScopeDispose(()=>_el27.removeEventListener("mousedown", _el27_event_6));
        _$appendChild(_el27, _$createTextNode("常见问题"));
        const _el28 = _$createElement("a", _el6);
        _$appendChild(_el6, _el28);
        _el6.insertBefore(_el28, _el5);
        watchEffect(()=>{
            _$setAttribute(_el28, "href", String(RouterLink.__rueHref("/page/about/team")));
        });
        const _el28_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/team", false)($event);
        _el28.addEventListener("click", _el28_event_1);
        onScopeDispose(()=>_el28.removeEventListener("click", _el28_event_1));
        const _el28_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/team", "hover")($event);
        _el28.addEventListener("pointerenter", _el28_event_2);
        onScopeDispose(()=>_el28.removeEventListener("pointerenter", _el28_event_2));
        const _el28_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/team", "hover")($event);
        _el28.addEventListener("focus", _el28_event_3);
        onScopeDispose(()=>_el28.removeEventListener("focus", _el28_event_3));
        const _el28_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/team", "hover")($event);
        _el28.addEventListener("pointerdown", _el28_event_4);
        onScopeDispose(()=>_el28.removeEventListener("pointerdown", _el28_event_4));
        const _el28_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/team", "hover")($event);
        _el28.addEventListener("touchstart", _el28_event_5);
        onScopeDispose(()=>_el28.removeEventListener("touchstart", _el28_event_5));
        const _el28_event_6 = ($event)=>()=>setOpen(false)($event);
        _el28.addEventListener("mousedown", _el28_event_6);
        onScopeDispose(()=>_el28.removeEventListener("mousedown", _el28_event_6));
        _$appendChild(_el28, _$createTextNode("团队"));
        const _el29 = _$createElement("a", _el8);
        _$appendChild(_el8, _el29);
        _el8.insertBefore(_el29, _el7);
        watchEffect(()=>{
            _$setAttribute(_el29, "href", String(RouterLink.__rueHref("/page/about/releases")));
        });
        const _el29_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/releases", false)($event);
        _el29.addEventListener("click", _el29_event_1);
        onScopeDispose(()=>_el29.removeEventListener("click", _el29_event_1));
        const _el29_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/releases", "hover")($event);
        _el29.addEventListener("pointerenter", _el29_event_2);
        onScopeDispose(()=>_el29.removeEventListener("pointerenter", _el29_event_2));
        const _el29_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/releases", "hover")($event);
        _el29.addEventListener("focus", _el29_event_3);
        onScopeDispose(()=>_el29.removeEventListener("focus", _el29_event_3));
        const _el29_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/releases", "hover")($event);
        _el29.addEventListener("pointerdown", _el29_event_4);
        onScopeDispose(()=>_el29.removeEventListener("pointerdown", _el29_event_4));
        const _el29_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/releases", "hover")($event);
        _el29.addEventListener("touchstart", _el29_event_5);
        onScopeDispose(()=>_el29.removeEventListener("touchstart", _el29_event_5));
        const _el29_event_6 = ($event)=>()=>setOpen(false)($event);
        _el29.addEventListener("mousedown", _el29_event_6);
        onScopeDispose(()=>_el29.removeEventListener("mousedown", _el29_event_6));
        _$appendChild(_el29, _$createTextNode("版本发布"));
        const _el30 = _$createElement("a", _el10);
        _$appendChild(_el10, _el30);
        _el10.insertBefore(_el30, _el9);
        watchEffect(()=>{
            _$setAttribute(_el30, "href", String(RouterLink.__rueHref("/page/about/community-guide")));
        });
        const _el30_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/community-guide", false)($event);
        _el30.addEventListener("click", _el30_event_1);
        onScopeDispose(()=>_el30.removeEventListener("click", _el30_event_1));
        const _el30_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/community-guide", "hover")($event);
        _el30.addEventListener("pointerenter", _el30_event_2);
        onScopeDispose(()=>_el30.removeEventListener("pointerenter", _el30_event_2));
        const _el30_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/community-guide", "hover")($event);
        _el30.addEventListener("focus", _el30_event_3);
        onScopeDispose(()=>_el30.removeEventListener("focus", _el30_event_3));
        const _el30_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/community-guide", "hover")($event);
        _el30.addEventListener("pointerdown", _el30_event_4);
        onScopeDispose(()=>_el30.removeEventListener("pointerdown", _el30_event_4));
        const _el30_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/community-guide", "hover")($event);
        _el30.addEventListener("touchstart", _el30_event_5);
        onScopeDispose(()=>_el30.removeEventListener("touchstart", _el30_event_5));
        const _el30_event_6 = ($event)=>()=>setOpen(false)($event);
        _el30.addEventListener("mousedown", _el30_event_6);
        onScopeDispose(()=>_el30.removeEventListener("mousedown", _el30_event_6));
        _$appendChild(_el30, _$createTextNode("社区指南"));
        const _el31 = _$createElement("a", _el12);
        _$appendChild(_el12, _el31);
        _el12.insertBefore(_el31, _el11);
        watchEffect(()=>{
            _$setAttribute(_el31, "href", String(RouterLink.__rueHref("/page/about/coc")));
        });
        const _el31_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/coc", false)($event);
        _el31.addEventListener("click", _el31_event_1);
        onScopeDispose(()=>_el31.removeEventListener("click", _el31_event_1));
        const _el31_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/coc", "hover")($event);
        _el31.addEventListener("pointerenter", _el31_event_2);
        onScopeDispose(()=>_el31.removeEventListener("pointerenter", _el31_event_2));
        const _el31_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/coc", "hover")($event);
        _el31.addEventListener("focus", _el31_event_3);
        onScopeDispose(()=>_el31.removeEventListener("focus", _el31_event_3));
        const _el31_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/coc", "hover")($event);
        _el31.addEventListener("pointerdown", _el31_event_4);
        onScopeDispose(()=>_el31.removeEventListener("pointerdown", _el31_event_4));
        const _el31_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/coc", "hover")($event);
        _el31.addEventListener("touchstart", _el31_event_5);
        onScopeDispose(()=>_el31.removeEventListener("touchstart", _el31_event_5));
        const _el31_event_6 = ($event)=>()=>setOpen(false)($event);
        _el31.addEventListener("mousedown", _el31_event_6);
        onScopeDispose(()=>_el31.removeEventListener("mousedown", _el31_event_6));
        watchEffect(()=>{
            _$setAttribute(_el31, "hello", String(()=>console.log('hello')));
        });
        _$appendChild(_el31, _$createTextNode("行为规范"));
        const _el32 = _$createElement("a", _el14);
        _$appendChild(_el14, _el32);
        _el14.insertBefore(_el32, _el13);
        watchEffect(()=>{
            _$setAttribute(_el32, "href", String(RouterLink.__rueHref("/page/about/privacy")));
        });
        const _el32_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/privacy", false)($event);
        _el32.addEventListener("click", _el32_event_1);
        onScopeDispose(()=>_el32.removeEventListener("click", _el32_event_1));
        const _el32_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/privacy", "hover")($event);
        _el32.addEventListener("pointerenter", _el32_event_2);
        onScopeDispose(()=>_el32.removeEventListener("pointerenter", _el32_event_2));
        const _el32_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/privacy", "hover")($event);
        _el32.addEventListener("focus", _el32_event_3);
        onScopeDispose(()=>_el32.removeEventListener("focus", _el32_event_3));
        const _el32_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/privacy", "hover")($event);
        _el32.addEventListener("pointerdown", _el32_event_4);
        onScopeDispose(()=>_el32.removeEventListener("pointerdown", _el32_event_4));
        const _el32_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/privacy", "hover")($event);
        _el32.addEventListener("touchstart", _el32_event_5);
        onScopeDispose(()=>_el32.removeEventListener("touchstart", _el32_event_5));
        const _el32_event_6 = ($event)=>()=>setOpen(false)($event);
        _el32.addEventListener("mousedown", _el32_event_6);
        onScopeDispose(()=>_el32.removeEventListener("mousedown", _el32_event_6));
        _$appendChild(_el32, _$createTextNode("隐私政策"));
        const _el33 = _$createElement("a", _el16);
        _$appendChild(_el16, _el33);
        _el16.insertBefore(_el33, _el15);
        watchEffect(()=>{
            _$setAttribute(_el33, "href", String(RouterLink.__rueHref("/page/about/number")));
        });
        const _el33_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/number", false)($event);
        _el33.addEventListener("click", _el33_event_1);
        onScopeDispose(()=>_el33.removeEventListener("click", _el33_event_1));
        const _el33_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/number", "hover")($event);
        _el33.addEventListener("pointerenter", _el33_event_2);
        onScopeDispose(()=>_el33.removeEventListener("pointerenter", _el33_event_2));
        const _el33_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/number", "hover")($event);
        _el33.addEventListener("focus", _el33_event_3);
        onScopeDispose(()=>_el33.removeEventListener("focus", _el33_event_3));
        const _el33_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/number", "hover")($event);
        _el33.addEventListener("pointerdown", _el33_event_4);
        onScopeDispose(()=>_el33.removeEventListener("pointerdown", _el33_event_4));
        const _el33_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/number", "hover")($event);
        _el33.addEventListener("touchstart", _el33_event_5);
        onScopeDispose(()=>_el33.removeEventListener("touchstart", _el33_event_5));
        const _el33_event_6 = ($event)=>()=>setOpen(false)($event);
        _el33.addEventListener("mousedown", _el33_event_6);
        onScopeDispose(()=>_el33.removeEventListener("mousedown", _el33_event_6));
        const _el34 = _$createTextWrapper(_el33);
        _$appendChild(_el33, _el34);
        _$settextContent(_el34, "48");
        const _el35 = _$createElement("a", _el18);
        _$appendChild(_el18, _el35);
        _el18.insertBefore(_el35, _el17);
        watchEffect(()=>{
            _$setAttribute(_el35, "href", String(RouterLink.__rueHref("/page/about/expr")));
        });
        const _el35_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/expr", false)($event);
        _el35.addEventListener("click", _el35_event_1);
        onScopeDispose(()=>_el35.removeEventListener("click", _el35_event_1));
        const _el35_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/expr", "hover")($event);
        _el35.addEventListener("pointerenter", _el35_event_2);
        onScopeDispose(()=>_el35.removeEventListener("pointerenter", _el35_event_2));
        const _el35_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/expr", "hover")($event);
        _el35.addEventListener("focus", _el35_event_3);
        onScopeDispose(()=>_el35.removeEventListener("focus", _el35_event_3));
        const _el35_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/expr", "hover")($event);
        _el35.addEventListener("pointerdown", _el35_event_4);
        onScopeDispose(()=>_el35.removeEventListener("pointerdown", _el35_event_4));
        const _el35_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/expr", "hover")($event);
        _el35.addEventListener("touchstart", _el35_event_5);
        onScopeDispose(()=>_el35.removeEventListener("touchstart", _el35_event_5));
        const _el35_event_6 = ($event)=>()=>setOpen(false)($event);
        _el35.addEventListener("mousedown", _el35_event_6);
        onScopeDispose(()=>_el35.removeEventListener("mousedown", _el35_event_6));
        const _el36 = _$createTextWrapper(_el35);
        _$appendChild(_el35, _el36);
        watchEffect(()=>{
            _$settextContent(_el36, 1 + 2);
        });
        const _el37 = _$createElement("a", _el20);
        _$appendChild(_el20, _el37);
        _el20.insertBefore(_el37, _el19);
        watchEffect(()=>{
            _$setAttribute(_el37, "href", String(RouterLink.__rueHref("/page/about/template")));
        });
        const _el37_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/template", false)($event);
        _el37.addEventListener("click", _el37_event_1);
        onScopeDispose(()=>_el37.removeEventListener("click", _el37_event_1));
        const _el37_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/template", "hover")($event);
        _el37.addEventListener("pointerenter", _el37_event_2);
        onScopeDispose(()=>_el37.removeEventListener("pointerenter", _el37_event_2));
        const _el37_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/template", "hover")($event);
        _el37.addEventListener("focus", _el37_event_3);
        onScopeDispose(()=>_el37.removeEventListener("focus", _el37_event_3));
        const _el37_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/template", "hover")($event);
        _el37.addEventListener("pointerdown", _el37_event_4);
        onScopeDispose(()=>_el37.removeEventListener("pointerdown", _el37_event_4));
        const _el37_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/template", "hover")($event);
        _el37.addEventListener("touchstart", _el37_event_5);
        onScopeDispose(()=>_el37.removeEventListener("touchstart", _el37_event_5));
        const _el37_event_6 = ($event)=>()=>setOpen(false)($event);
        _el37.addEventListener("mousedown", _el37_event_6);
        onScopeDispose(()=>_el37.removeEventListener("mousedown", _el37_event_6));
        const _el38 = _$createTextWrapper(_el37);
        _$appendChild(_el37, _el38);
        watchEffect(()=>{
            _$settextContent(_el38, `模板-${p.theme}`);
        });
        const _el39 = _$createElement("a", _el22);
        _$appendChild(_el22, _el39);
        _el22.insertBefore(_el39, _el21);
        watchEffect(()=>{
            _$setAttribute(_el39, "href", String(RouterLink.__rueHref("/page/about/cond")));
        });
        const _el39_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/page/about/cond", false)($event);
        _el39.addEventListener("click", _el39_event_1);
        onScopeDispose(()=>_el39.removeEventListener("click", _el39_event_1));
        const _el39_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/cond", "hover")($event);
        _el39.addEventListener("pointerenter", _el39_event_2);
        onScopeDispose(()=>_el39.removeEventListener("pointerenter", _el39_event_2));
        const _el39_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/cond", "hover")($event);
        _el39.addEventListener("focus", _el39_event_3);
        onScopeDispose(()=>_el39.removeEventListener("focus", _el39_event_3));
        const _el39_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/cond", "hover")($event);
        _el39.addEventListener("pointerdown", _el39_event_4);
        onScopeDispose(()=>_el39.removeEventListener("pointerdown", _el39_event_4));
        const _el39_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/page/about/cond", "hover")($event);
        _el39.addEventListener("touchstart", _el39_event_5);
        onScopeDispose(()=>_el39.removeEventListener("touchstart", _el39_event_5));
        const _el39_event_6 = ($event)=>()=>setOpen(false)($event);
        _el39.addEventListener("mousedown", _el39_event_6);
        onScopeDispose(()=>_el39.removeEventListener("mousedown", _el39_event_6));
        const _el40 = _$createTextWrapper(_el39);
        _$appendChild(_el39, _el40);
        watchEffect(()=>{
            _$settextContent(_el40, !!open ? '开' : '关');
        });
        watchEffect(()=>{
            const __slot = new Date().getFullYear();
            untrack(()=>renderAnchor(__slot, _el24, _el23));
        });
        watchEffect(()=>{
            const __slot = 1 + 1;
            untrack(()=>renderAnchor(__slot, _el26, _el25));
        });
        return _root;
    });
};
export default About;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec49.out.js", strip_marker(&out)).ok();
    let output = normalize(&strip_marker(&out));
    assert!(output.contains("_$mountCompiledSlotAt"), "{output}");
    assert_eq!(
        output.matches("_$compiledComponent(RouterLink").count()
            + output.matches("_$createComponent(RouterLink").count(),
        10,
        "{output}"
    );
    assert_eq!(output.matches("setOpen(false)").count(), 10, "{output}");
    assert!(
        output.contains("_$compiledText(_el37, ()=>!!_$state.get() ? '开' : '关')"),
        "{output}"
    );
    assert!(output.contains("new Date().getFullYear()"), "{output}");
    assert!(output.contains("_$compiledText(_el39, ()=>1 + 1)"), "{output}");
}
