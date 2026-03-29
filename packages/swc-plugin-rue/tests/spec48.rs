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
import { useState, type FC, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$appendChild, watchEffect, _$createTextWrapper, _$vaporCreateVNode } from '@rue-js/rue';
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
        const _list1 = _$createComment("rue:slot:start");
        const _list2 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        watchEffect(()=>{
            const __slot = !!open.value ? '是' : '否';
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list1, _list2);
        });
        const _el1 = _$createElement("ul");
        _$appendChild(_root, _el1);
        const _el2 = _$createElement("li");
        _$appendChild(_el1, _el2);
        const _list3 = _$createComment("rue:component:start");
        const _list4 = _$createComment("rue:component:end");
        _$appendChild(_el2, _list3);
        _$appendChild(_el2, _list4);
        const __child1 = "常见问题";
        const __slot5 = <RouterLink to="/page/about/faq" onMouseDown={()=>setOpen(false)} children={__child1}/>;
        renderBetween(__slot5, _el2, _list3, _list4);
        const _el3 = _$createElement("li");
        _$appendChild(_el1, _el3);
        const _list6 = _$createComment("rue:component:start");
        const _list7 = _$createComment("rue:component:end");
        _$appendChild(_el3, _list6);
        _$appendChild(_el3, _list7);
        const __child2 = "团队";
        const __slot8 = <RouterLink to="/page/about/team" onMouseDown={()=>setOpen(false)} children={__child2}/>;
        renderBetween(__slot8, _el3, _list6, _list7);
        const _el4 = _$createElement("li");
        _$appendChild(_el1, _el4);
        const _list9 = _$createComment("rue:component:start");
        const _list10 = _$createComment("rue:component:end");
        _$appendChild(_el4, _list9);
        _$appendChild(_el4, _list10);
        const __child3 = "版本发布";
        const __slot11 = <RouterLink to="/page/about/releases" onMouseDown={()=>setOpen(false)} children={__child3}/>;
        renderBetween(__slot11, _el4, _list9, _list10);
        const _el5 = _$createElement("li");
        _$appendChild(_el1, _el5);
        const _list12 = _$createComment("rue:component:start");
        const _list13 = _$createComment("rue:component:end");
        _$appendChild(_el5, _list12);
        _$appendChild(_el5, _list13);
        const __child4 = "社区指南";
        const __slot14 = <RouterLink to="/page/about/community-guide" onMouseDown={()=>setOpen(false)} children={__child4}/>;
        renderBetween(__slot14, _el5, _list12, _list13);
        const _el6 = _$createElement("li");
        _$appendChild(_el1, _el6);
        const _list15 = _$createComment("rue:component:start");
        const _list16 = _$createComment("rue:component:end");
        _$appendChild(_el6, _list15);
        _$appendChild(_el6, _list16);
        const __child5 = "行为规范";
        const __slot17 = <RouterLink to="/page/about/coc" onMouseDown={()=>setOpen(false)} hello={()=>console.log('hello')} children={__child5}/>;
        renderBetween(__slot17, _el6, _list15, _list16);
        const _el7 = _$createElement("li");
        _$appendChild(_el1, _el7);
        const _list18 = _$createComment("rue:component:start");
        const _list19 = _$createComment("rue:component:end");
        _$appendChild(_el7, _list18);
        _$appendChild(_el7, _list19);
        const __child6 = "隐私政策";
        const __slot20 = <RouterLink to="/page/about/privacy" onMouseDown={()=>setOpen(false)} children={__child6}/>;
        renderBetween(__slot20, _el7, _list18, _list19);
        const _el8 = _$createElement("div");
        _$appendChild(_root, _el8);
        _$appendChild(_el8, _$createTextNode("© "));
        const _el9 = _$createTextWrapper(_el8);
        _$appendChild(_el8, _el9);
        watchEffect(()=>{
            _$settextContent(_el9, new Date().getFullYear());
        });
        _$appendChild(_el8, _$createTextNode(" Rue js "));
        const _el10 = _$createTextWrapper(_el8);
        _$appendChild(_el8, _el10);
        watchEffect(()=>{
            _$settextContent(_el10, 1 + 1);
        });
        _$appendChild(_el8, _$createTextNode(" hello world 48"));
        return {
            vaporElement: _root
        };
    });
};
export default About;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec48.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
