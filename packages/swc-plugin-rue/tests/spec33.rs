//! SWC 插件转换行为测试（spec33）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec33() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const ThemePicker: FC<{ value: string; onChange: (t: string) => void }> = props => {
  const themes = [
    'light',
    'dark',
    'cupcake',
    'bumblebee',
    'emerald',
    'corporate',
    'synthwave',
    'retro',
    'cyberpunk',
    'valentine',
    'halloween',
    'garden',
    'forest',
    'aqua',
    'lofi',
    'pastel',
    'fantasy',
    'wireframe',
    'black',
    'luxury',
    'dracula',
    'cmyk',
    'autumn',
    'business',
    'acid',
    'lemonade',
    'night',
    'coffee',
    'winter',
    'dim',
    'nord',
    'sunset',
  ]
  const labels: Record<string, string> = {
    light: '亮色',
    dark: '暗色',
    cupcake: '纸杯蛋糕',
    bumblebee: '大黄蜂',
    emerald: '祖母绿',
    corporate: '企业',
    synthwave: '合成波',
    retro: '复古',
    cyberpunk: '赛博朋克',
    valentine: '情人节',
    halloween: '万圣节',
    garden: '花园',
    forest: '森林',
    aqua: '海洋蓝',
    lofi: '低保真',
    pastel: '粉彩',
    fantasy: '奇幻',
    wireframe: '线框',
    black: '黑色',
    luxury: '奢华',
    dracula: '德古拉',
    cmyk: 'CMYK',
    autumn: '秋天',
    business: '商务',
    acid: '酸性',
    lemonade: '柠檬水',
    night: '夜间',
    coffee: '咖啡',
    winter: '冬季',
    dim: '昏暗',
    nord: '北欧',
    sunset: '日落',
  }

  return (
    <select
      aria-label="切换主题"
      className="select select-bordered select-sm bg-transparent"
      value={props.value}
      onChange={(e: Event) => props.onChange((e.currentTarget as HTMLSelectElement).value)}
    >
      {themes.map(name => (
        <option key={name} value={name}>
          {labels[name] ? `${labels[name]} (${name})` : name}
        </option>
      ))}
    </select>
  )
}

const HelloWorld: FC = () => {
  const theme = ref('light')
  return (
    <div className="card bg-base-100 border shadow">
      <div className="card-body">
        <h2 className="card-title">你好，世界</h2>
        <p className="text-base-content/70">选择一个主题</p>
        <div className="flex items-center gap-3">
          <ThemePicker
            value={theme.value}
            onChange={t => {
              theme.value = t
              document.documentElement.setAttribute('data-theme', t)
            }}
          />
          <span className="text-sm">当前主题：{theme.value}</span>
        </div>
      </div>
    </div>
  )
}

export default HelloWorld
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporKeyedList, _$createTextWrapper, _$setAttribute, _$addEventListener, _$setClassName, _$setValue } from '@rue-js/rue';
const ThemePicker: FC<{
    value: string;
    onChange: (t: string) => void;
}> = (props)=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const themes = [
                'light',
                'dark',
                'cupcake',
                'bumblebee',
                'emerald',
                'corporate',
                'synthwave',
                'retro',
                'cyberpunk',
                'valentine',
                'halloween',
                'garden',
                'forest',
                'aqua',
                'lofi',
                'pastel',
                'fantasy',
                'wireframe',
                'black',
                'luxury',
                'dracula',
                'cmyk',
                'autumn',
                'business',
                'acid',
                'lemonade',
                'night',
                'coffee',
                'winter',
                'dim',
                'nord',
                'sunset'
            ];
            const labels: Record<string, string> = {
                light: '亮色',
                dark: '暗色',
                cupcake: '纸杯蛋糕',
                bumblebee: '大黄蜂',
                emerald: '祖母绿',
                corporate: '企业',
                synthwave: '合成波',
                retro: '复古',
                cyberpunk: '赛博朋克',
                valentine: '情人节',
                halloween: '万圣节',
                garden: '花园',
                forest: '森林',
                aqua: '海洋蓝',
                lofi: '低保真',
                pastel: '粉彩',
                fantasy: '奇幻',
                wireframe: '线框',
                black: '黑色',
                luxury: '奢华',
                dracula: '德古拉',
                cmyk: 'CMYK',
                autumn: '秋天',
                business: '商务',
                acid: '酸性',
                lemonade: '柠檬水',
                night: '夜间',
                coffee: '咖啡',
                winter: '冬季',
                dim: '昏暗',
                nord: '北欧',
                sunset: '日落'
            };
            return {
                themes: themes,
                labels: labels
            };
        }));
    const { themes: themes, labels: labels } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("select");
        _$setAttribute(_root, "aria-label", "切换主题");
        _$setClassName(_root, "select select-bordered select-sm bg-transparent");
        watchEffect(()=>{
            _$setValue(_root, props.value);
        });
        _$addEventListener(_root, "change", ((e: Event)=>props.onChange((e.currentTarget as HTMLSelectElement).value)));
        const _list1 = _$createComment("rue:list:start");
        const _list2 = _$createComment("rue:list:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        let _map1_elements = new Map;
        watchEffect(()=>{
            const _map1_current = themes || [];
            const _map1_newElements = _$vaporKeyedList({
                items: _map1_current,
                getKey: (name, idx)=>name,
                elements: _map1_elements,
                parent: _list1.parentNode,
                before: _list2,
                start: _list1,
                renderItem: (name, parent, start, end, idx)=>{
                    const __slot = vapor(()=>{
                        const _root = _$createDocumentFragment();
                        const _el1 = _$createElement("option");
                        _$appendChild(_root, _el1);
                        watchEffect(()=>{
                            _$setAttribute(_el1, "key", String((name)));
                        });
                        watchEffect(()=>{
                            _$setValue(_el1, name);
                        });
                        const _el2 = _$createTextWrapper(_el1);
                        _$appendChild(_el1, _el2);
                        watchEffect(()=>{
                            _$settextContent(_el2, labels[name] ? `${labels[name]} (${name})` : name);
                        });
                        return {
                            vaporElement: _root
                        };
                    });
                    renderBetween(__slot, parent, start, end);
                }
            });
            _map1_elements = _map1_newElements;
        });
        return {
            vaporElement: _root
        };
    });
};
const HelloWorld: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const theme = _$vaporWithHookId("ref:1:0", ()=>ref('light'));
            return {
                theme: theme
            };
        }));
    const { theme: theme } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "card bg-base-100 border shadow");
        const _el3 = _$createElement("div");
        _$appendChild(_root, _el3);
        _$setClassName(_el3, "card-body");
        const _el4 = _$createElement("h2");
        _$appendChild(_el3, _el4);
        _$setClassName(_el4, "card-title");
        _$appendChild(_el4, _$createTextNode("你好，世界"));
        const _el5 = _$createElement("p");
        _$appendChild(_el3, _el5);
        _$setClassName(_el5, "text-base-content/70");
        _$appendChild(_el5, _$createTextNode("选择一个主题"));
        const _el6 = _$createElement("div");
        _$appendChild(_el3, _el6);
        _$setClassName(_el6, "flex items-center gap-3");
        const _list3 = _$createComment("rue:component:start");
        const _list4 = _$createComment("rue:component:end");
        _$appendChild(_el6, _list3);
        _$appendChild(_el6, _list4);
        watchEffect(()=>{
            const __slot5 = <ThemePicker value={theme.value} onChange={(t)=>{
                theme.value = t;
                document.documentElement.setAttribute('data-theme', t);
            }}/>;
            renderBetween(__slot5, _el6, _list3, _list4);
        });
        const _el7 = _$createElement("span");
        _$appendChild(_el6, _el7);
        _$setClassName(_el7, "text-sm");
        _$appendChild(_el7, _$createTextNode("当前主题："));
        const _el8 = _$createTextWrapper(_el7);
        _$appendChild(_el7, _el8);
        watchEffect(()=>{
            _$settextContent(_el8, theme.value);
        });
        return {
            vaporElement: _root
        };
    });
};
export default HelloWorld;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec33.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
