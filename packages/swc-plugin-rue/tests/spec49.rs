//! SWC 插件转换行为测试（spec49）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec49() {
    let src = r##"
import { useState, type FC } from 'rue-js'
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
import { useState, type FC, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$createTextWrapper, _$vaporCreateVNode } from 'rue-js';
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
        const _el8 = _$createElement("li");
        _$appendChild(_el1, _el8);
        const _list21 = _$createComment("rue:component:start");
        const _list22 = _$createComment("rue:component:end");
        _$appendChild(_el8, _list21);
        _$appendChild(_el8, _list22);
        const __child7 = 48;
        const __slot23 = <RouterLink to="/page/about/number" onMouseDown={()=>setOpen(false)} children={__child7}/>;
        renderBetween(__slot23, _el8, _list21, _list22);
        const _el9 = _$createElement("li");
        _$appendChild(_el1, _el9);
        const _list24 = _$createComment("rue:component:start");
        const _list25 = _$createComment("rue:component:end");
        _$appendChild(_el9, _list24);
        _$appendChild(_el9, _list25);
        const __child8 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _el10 = _$createTextWrapper(_root);
            _$appendChild(_root, _el10);
            watchEffect(()=>{
                _$settextContent(_el10, 1 + 2);
            });
            return {
                vaporElement: _root
            };
        });
        const __slot26 = <RouterLink to="/page/about/expr" onMouseDown={()=>setOpen(false)} children={__child8}/>;
        renderBetween(__slot26, _el9, _list24, _list25);
        const _el11 = _$createElement("li");
        _$appendChild(_el1, _el11);
        const _list27 = _$createComment("rue:component:start");
        const _list28 = _$createComment("rue:component:end");
        _$appendChild(_el11, _list27);
        _$appendChild(_el11, _list28);
        const __child9 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _el12 = _$createTextWrapper(_root);
            _$appendChild(_root, _el12);
            watchEffect(()=>{
                _$settextContent(_el12, `模板-${p.theme}`);
            });
            return {
                vaporElement: _root
            };
        });
        const __slot29 = <RouterLink to="/page/about/template" onMouseDown={()=>setOpen(false)} children={__child9}/>;
        renderBetween(__slot29, _el11, _list27, _list28);
        const _el13 = _$createElement("li");
        _$appendChild(_el1, _el13);
        const _list30 = _$createComment("rue:component:start");
        const _list31 = _$createComment("rue:component:end");
        _$appendChild(_el13, _list30);
        _$appendChild(_el13, _list31);
        const __child10 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _el14 = _$createTextWrapper(_root);
            _$appendChild(_root, _el14);
            watchEffect(()=>{
                _$settextContent(_el14, !!open.value ? '开' : '关');
            });
            return {
                vaporElement: _root
            };
        });
        const __slot32 = <RouterLink to="/page/about/cond" onMouseDown={()=>setOpen(false)} children={__child10}/>;
        renderBetween(__slot32, _el13, _list30, _list31);
        const _el15 = _$createElement("div");
        _$appendChild(_root, _el15);
        _$appendChild(_el15, _$createTextNode("© "));
        const _el16 = _$createTextWrapper(_el15);
        _$appendChild(_el15, _el16);
        watchEffect(()=>{
            _$settextContent(_el16, new Date().getFullYear());
        });
        _$appendChild(_el15, _$createTextNode(" Rue js "));
        const _el17 = _$createTextWrapper(_el15);
        _$appendChild(_el15, _el17);
        watchEffect(()=>{
            _$settextContent(_el17, 1 + 1);
        });
        _$appendChild(_el15, _$createTextNode(" hello world 48"));
        return {
            vaporElement: _root
        };
    });
};
export default About;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec49.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
