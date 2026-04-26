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
      打开状态: {!!open.value ? '是' : '否'}
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
        <li><RouterLink to="/page/about/cond" onMouseDown={() => setOpen(false)}>{!!open.value ? '开' : '关'}</RouterLink></li>
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

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup, vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$appendChild, watchEffect, _$createTextWrapper, _$setAttribute, _$addEventListener } from "@rue-js/rue/vapor";
import { useState, type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const About: FC<{
    theme: string;
    setTheme: (t: string) => void;
}> = (p)=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const [open, setOpen] = _$vaporWithHookId("useState:1:0", ()=>useState<boolean>(false));
            return {
                open: open,
                setOpen: setOpen
            };
        }));
    const { open: open, setOpen: setOpen } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        _$appendChild(_root, _$createTextNode("打开状态: "));
        const _list1 = _$createComment("rue:slot:anchor");
        _$appendChild(_root, _list1);
        watchEffect(()=>{
            const __slot = !!open.value ? '是' : '否';
            renderAnchor(__slot, _root, _list1);
        });
        const _el1 = _$createElement("ul");
        _$appendChild(_root, _el1);
        const _el2 = _$createElement("li");
        _$appendChild(_el1, _el2);
        const _el3 = _$createElement("a");
        _$appendChild(_el2, _el3);
        watchEffect(()=>{
            _$setAttribute(_el3, "href", String(RouterLink.__rueHref("/page/about/faq")));
        });
        _$addEventListener(_el3, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/faq", false)));
        _$addEventListener(_el3, "mousedown", (()=>setOpen(false)));
        _$appendChild(_el3, _$createTextNode("常见问题"));
        const _el4 = _$createElement("li");
        _$appendChild(_el1, _el4);
        const _el5 = _$createElement("a");
        _$appendChild(_el4, _el5);
        watchEffect(()=>{
            _$setAttribute(_el5, "href", String(RouterLink.__rueHref("/page/about/team")));
        });
        _$addEventListener(_el5, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/team", false)));
        _$addEventListener(_el5, "mousedown", (()=>setOpen(false)));
        _$appendChild(_el5, _$createTextNode("团队"));
        const _el6 = _$createElement("li");
        _$appendChild(_el1, _el6);
        const _el7 = _$createElement("a");
        _$appendChild(_el6, _el7);
        watchEffect(()=>{
            _$setAttribute(_el7, "href", String(RouterLink.__rueHref("/page/about/releases")));
        });
        _$addEventListener(_el7, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/releases", false)));
        _$addEventListener(_el7, "mousedown", (()=>setOpen(false)));
        _$appendChild(_el7, _$createTextNode("版本发布"));
        const _el8 = _$createElement("li");
        _$appendChild(_el1, _el8);
        const _el9 = _$createElement("a");
        _$appendChild(_el8, _el9);
        watchEffect(()=>{
            _$setAttribute(_el9, "href", String(RouterLink.__rueHref("/page/about/community-guide")));
        });
        _$addEventListener(_el9, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/community-guide", false)));
        _$addEventListener(_el9, "mousedown", (()=>setOpen(false)));
        _$appendChild(_el9, _$createTextNode("社区指南"));
        const _el10 = _$createElement("li");
        _$appendChild(_el1, _el10);
        const _el11 = _$createElement("a");
        _$appendChild(_el10, _el11);
        watchEffect(()=>{
            _$setAttribute(_el11, "href", String(RouterLink.__rueHref("/page/about/coc")));
        });
        _$addEventListener(_el11, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/coc", false)));
        _$addEventListener(_el11, "mousedown", (()=>setOpen(false)));
        watchEffect(()=>{
            _$setAttribute(_el11, "hello", String(()=>console.log('hello')));
        });
        _$appendChild(_el11, _$createTextNode("行为规范"));
        const _el12 = _$createElement("li");
        _$appendChild(_el1, _el12);
        const _el13 = _$createElement("a");
        _$appendChild(_el12, _el13);
        watchEffect(()=>{
            _$setAttribute(_el13, "href", String(RouterLink.__rueHref("/page/about/privacy")));
        });
        _$addEventListener(_el13, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/privacy", false)));
        _$addEventListener(_el13, "mousedown", (()=>setOpen(false)));
        _$appendChild(_el13, _$createTextNode("隐私政策"));
        const _el14 = _$createElement("li");
        _$appendChild(_el1, _el14);
        const _el15 = _$createElement("a");
        _$appendChild(_el14, _el15);
        watchEffect(()=>{
            _$setAttribute(_el15, "href", String(RouterLink.__rueHref("/page/about/number")));
        });
        _$addEventListener(_el15, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/number", false)));
        _$addEventListener(_el15, "mousedown", (()=>setOpen(false)));
        const _el16 = _$createTextWrapper(_el15);
        _$appendChild(_el15, _el16);
        _$settextContent(_el16, "48");
        const _el17 = _$createElement("li");
        _$appendChild(_el1, _el17);
        const _el18 = _$createElement("a");
        _$appendChild(_el17, _el18);
        watchEffect(()=>{
            _$setAttribute(_el18, "href", String(RouterLink.__rueHref("/page/about/expr")));
        });
        _$addEventListener(_el18, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/expr", false)));
        _$addEventListener(_el18, "mousedown", (()=>setOpen(false)));
        const _el19 = _$createTextWrapper(_el18);
        _$appendChild(_el18, _el19);
        watchEffect(()=>{
            _$settextContent(_el19, 1 + 2);
        });
        const _el20 = _$createElement("li");
        _$appendChild(_el1, _el20);
        const _el21 = _$createElement("a");
        _$appendChild(_el20, _el21);
        watchEffect(()=>{
            _$setAttribute(_el21, "href", String(RouterLink.__rueHref("/page/about/template")));
        });
        _$addEventListener(_el21, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/template", false)));
        _$addEventListener(_el21, "mousedown", (()=>setOpen(false)));
        const _el22 = _$createTextWrapper(_el21);
        _$appendChild(_el21, _el22);
        watchEffect(()=>{
            _$settextContent(_el22, `模板-${p.theme}`);
        });
        const _el23 = _$createElement("li");
        _$appendChild(_el1, _el23);
        const _el24 = _$createElement("a");
        _$appendChild(_el23, _el24);
        watchEffect(()=>{
            _$setAttribute(_el24, "href", String(RouterLink.__rueHref("/page/about/cond")));
        });
        _$addEventListener(_el24, "click", ((e)=>RouterLink.__rueOnClick(e, "/page/about/cond", false)));
        _$addEventListener(_el24, "mousedown", (()=>setOpen(false)));
        const _el25 = _$createTextWrapper(_el24);
        _$appendChild(_el24, _el25);
        watchEffect(()=>{
            _$settextContent(_el25, !!open.value ? '开' : '关');
        });
        const _el26 = _$createElement("div");
        _$appendChild(_root, _el26);
        _$appendChild(_el26, _$createTextNode("© "));
        const _el27 = _$createTextWrapper(_el26);
        _$appendChild(_el26, _el27);
        watchEffect(()=>{
            _$settextContent(_el27, new Date().getFullYear());
        });
        _$appendChild(_el26, _$createTextNode(" Rue js "));
        const _el28 = _$createTextWrapper(_el26);
        _$appendChild(_el26, _el28);
        watchEffect(()=>{
            _$settextContent(_el28, 1 + 1);
        });
        _$appendChild(_el26, _$createTextNode(" hello world 48"));
        return _root;
    });
};
export default About;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec49.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
