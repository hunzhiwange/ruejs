//! SWC 插件转换行为测试（spec47）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec47() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const About: FC = () => {
  return (
    <div className="max-w-[900px] mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">空白字符处理 Demo（参考 React 行为）</h1>
      <p className="text-base-content/70">
        本页演示浏览器与 JSX 对空白字符（空格、Tab、换行）的处理方式：默认会折叠连续空白；某些场景可用
        {' '}<code className="bg-base-200 px-1 rounded">{'{'}' '{'}'}</code>{' '}或{' '}
        <code className="bg-base-200 px-1 rounded">&nbsp;</code>{' '}来显式插入空格；也可用 CSS
        {' '}<code className="bg-base-200 px-1 rounded">white-space</code>{' '}控制。
      </p>

      <div className="card bg-base-100 border">
        <div className="card-body">
          <h2 className="text-lg font-semibold">1) 默认空白折叠</h2>
          <p className="text-sm text-base-content/70">
            连续空格与换行会被折叠为单个空格，行首/行尾空白通常被忽略。
          </p>
          <div className="mt-3 rounded-box border p-4">
            <p>AA    BB      CC</p>
            <p>
              行首空白：
              {'     '}
              Start
            </p>
            <p>
              多行文本：
              AA
              BB
              CC
            </p>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border">
        <div className="card-body">
          <h2 className="text-lg font-semibold">2) JSX 显式空格 {'{'}' '{'}'}</h2>
          <p className="text-sm text-base-content/70">
            在 JSX 中，跨行或相邻内联元素之间的空白可能被裁剪；可用
            {' '}<code className="bg-base-200 px-1 rounded">{'{'}' '{'}'}</code>{' '}插入一个明确的空格。
          </p>
          <div className="mt-3 rounded-box border p-4">
            <div>
              <span>Foo</span>
              <span>Bar</span>
              <span>Baz</span>
            </div>
            <div className="opacity-70 text-sm">上面三个相邻元素通常会连在一起</div>
            <div className="mt-2">
              <span>Foo</span>
              {' '}
              <span>Bar</span>
              {' '}
              <span>Baz</span>
            </div>
            <div className="opacity-70 text-sm">使用 {'{'}' '{'}'} 显式空格分隔</div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border">
        <div className="card-body">
          <h2 className="text-lg font-semibold">3) 不换行空格 &nbsp;</h2>
          <p className="text-sm text-base-content/70">
            使用 HTML 实体 <code className="bg-base-200 px-1 rounded">&amp;nbsp;</code>{' '}
            可以插入一个不换行空格，避免被折叠或在换行处断开。
          </p>
          <div className="mt-3 rounded-box border p-4">
            <p>
              价格：100&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;USD，编号：AB&nbsp;&nbsp;1234
            </p>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border">
        <div className="card-body">
          <h2 className="text-lg font-semibold">4) CSS white-space 控制</h2>
          <p className="text-sm text-base-content/70">
            通过 CSS 的 <code className="bg-base-200 px-1 rounded">white-space</code>{' '}
            可改变空白处理策略。
          </p>
          <div className="mt-3 grid md:grid-cols-3 gap-3">
            <div className="rounded-box border p-3">
              <div className="text-sm font-semibold mb-1">normal（默认）</div>
              <div style={{ whiteSpace: 'normal' }}>
                A    B      C
                {'\n'}
                line-1
                {'\n'}
                line-2
              </div>
            </div>
            <div className="rounded-box border p-3">
              <div className="text-sm font-semibold mb-1">pre</div>
              <div style={{ whiteSpace: 'pre' }}>
                A    B      C
                {'\n'}
                line-1
                {'\n'}
                line-2
              </div>
            </div>
            <div className="rounded-box border p-3">
              <div className="text-sm font-semibold mb-1">pre-wrap</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                A    B      C
                {'\n'}
                line-1
                {'\n'}
                line-2
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border">
        <div className="card-body">
          <h2 className="text-lg font-semibold">5) inline-block 间隙</h2>
          <p className="text-sm text-base-content/70">
            内联块（inline-block）之间如果在源码里有空格/换行，会产生可见间隙；可通过删除空白或使用
            {' '}<code className="bg-base-200 px-1 rounded">{'{'}' '{'}'}</code>{' '}精控。
          </p>
          <div className="mt-3">
            <div className="rounded-box border p-4">
              <span className="inline-block bg-primary/20 px-3 py-2">Box A</span>
              <span className="inline-block bg-primary/20 px-3 py-2">Box B</span>
            </div>
            <div className="rounded-box border p-4">
              <span className="inline-block bg-primary/20 px-3 py-2">Box A</span> <span className="inline-block bg-primary/20 px-3 py-2">Box B</span>
            </div>
            <div className="opacity-70 text-sm mt-1">上面 A 与 B 之间存在由空白产生的间隙</div>
            <div className="rounded-box border p-4 mt-2">
              <span className="inline-block bg-accent/20 px-3 py-2">Box A</span>{' '}
              <span className="inline-block bg-accent/20 px-3 py-2">Box B</span>
            </div>
            <div className="opacity-70 text-sm mt-1">使用 {'{'}' '{'}'} 显式控制间隙大小</div>
          </div>
        </div>

        <div>
          © {new Date().getFullYear()} Rue.js
        </div>
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
import { type FC, vapor, _$createElement, _$createTextNode, _$setStyle, _$settextContent, _$appendChild, watchEffect, _$createTextWrapper, _$setClassName } from '@rue-js/rue';
const About: FC = ()=>{
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-[900px] mx-auto space-y-8");
        const _el1 = _$createElement("h1");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-2xl font-semibold");
        _$appendChild(_el1, _$createTextNode("空白字符处理 Demo（参考 React 行为）"));
        const _el2 = _$createElement("p");
        _$appendChild(_root, _el2);
        _$setClassName(_el2, "text-base-content/70");
        _$appendChild(_el2, _$createTextNode("本页演示浏览器与 JSX 对空白字符（空格、Tab、换行）的处理方式：默认会折叠连续空白；某些场景可用"));
        const _el3 = _$createTextWrapper(_el2);
        _$appendChild(_el2, _el3);
        _$settextContent(_el3, ' ');
        const _el4 = _$createElement("code");
        _$appendChild(_el2, _el4);
        _$setClassName(_el4, "bg-base-200 px-1 rounded");
        const _el5 = _$createTextWrapper(_el4);
        _$appendChild(_el4, _el5);
        _$settextContent(_el5, '{');
        _$appendChild(_el4, _$createTextNode("' '"));
        const _el6 = _$createTextWrapper(_el4);
        _$appendChild(_el4, _el6);
        _$settextContent(_el6, '}');
        const _el7 = _$createTextWrapper(_el2);
        _$appendChild(_el2, _el7);
        _$settextContent(_el7, ' ');
        _$appendChild(_el2, _$createTextNode("或"));
        const _el8 = _$createTextWrapper(_el2);
        _$appendChild(_el2, _el8);
        _$settextContent(_el8, ' ');
        const _el9 = _$createElement("code");
        _$appendChild(_el2, _el9);
        _$setClassName(_el9, "bg-base-200 px-1 rounded");
        const _el10 = _$createTextWrapper(_el2);
        _$appendChild(_el2, _el10);
        _$settextContent(_el10, ' ');
        _$appendChild(_el2, _$createTextNode("来显式插入空格；也可用 CSS"));
        const _el11 = _$createTextWrapper(_el2);
        _$appendChild(_el2, _el11);
        _$settextContent(_el11, ' ');
        const _el12 = _$createElement("code");
        _$appendChild(_el2, _el12);
        _$setClassName(_el12, "bg-base-200 px-1 rounded");
        _$appendChild(_el12, _$createTextNode("white-space"));
        const _el13 = _$createTextWrapper(_el2);
        _$appendChild(_el2, _el13);
        _$settextContent(_el13, ' ');
        _$appendChild(_el2, _$createTextNode("控制。"));
        const _el14 = _$createElement("div");
        _$appendChild(_root, _el14);
        _$setClassName(_el14, "card bg-base-100 border");
        const _el15 = _$createElement("div");
        _$appendChild(_el14, _el15);
        _$setClassName(_el15, "card-body");
        const _el16 = _$createElement("h2");
        _$appendChild(_el15, _el16);
        _$setClassName(_el16, "text-lg font-semibold");
        _$appendChild(_el16, _$createTextNode("1) 默认空白折叠"));
        const _el17 = _$createElement("p");
        _$appendChild(_el15, _el17);
        _$setClassName(_el17, "text-sm text-base-content/70");
        _$appendChild(_el17, _$createTextNode("连续空格与换行会被折叠为单个空格，行首/行尾空白通常被忽略。"));
        const _el18 = _$createElement("div");
        _$appendChild(_el15, _el18);
        _$setClassName(_el18, "mt-3 rounded-box border p-4");
        const _el19 = _$createElement("p");
        _$appendChild(_el18, _el19);
        _$appendChild(_el19, _$createTextNode("AA    BB      CC"));
        const _el20 = _$createElement("p");
        _$appendChild(_el18, _el20);
        _$appendChild(_el20, _$createTextNode("行首空白： "));
        const _el21 = _$createTextWrapper(_el20);
        _$appendChild(_el20, _el21);
        _$settextContent(_el21, '     ');
        _$appendChild(_el20, _$createTextNode(" Start"));
        const _el22 = _$createElement("p");
        _$appendChild(_el18, _el22);
        _$appendChild(_el22, _$createTextNode("多行文本： AA BB CC"));
        const _el23 = _$createElement("div");
        _$appendChild(_root, _el23);
        _$setClassName(_el23, "card bg-base-100 border");
        const _el24 = _$createElement("div");
        _$appendChild(_el23, _el24);
        _$setClassName(_el24, "card-body");
        const _el25 = _$createElement("h2");
        _$appendChild(_el24, _el25);
        _$setClassName(_el25, "text-lg font-semibold");
        _$appendChild(_el25, _$createTextNode("2) JSX 显式空格 "));
        const _el26 = _$createTextWrapper(_el25);
        _$appendChild(_el25, _el26);
        _$settextContent(_el26, '{');
        _$appendChild(_el25, _$createTextNode("' '"));
        const _el27 = _$createTextWrapper(_el25);
        _$appendChild(_el25, _el27);
        _$settextContent(_el27, '}');
        const _el28 = _$createElement("p");
        _$appendChild(_el24, _el28);
        _$setClassName(_el28, "text-sm text-base-content/70");
        _$appendChild(_el28, _$createTextNode("在 JSX 中，跨行或相邻内联元素之间的空白可能被裁剪；可用"));
        const _el29 = _$createTextWrapper(_el28);
        _$appendChild(_el28, _el29);
        _$settextContent(_el29, ' ');
        const _el30 = _$createElement("code");
        _$appendChild(_el28, _el30);
        _$setClassName(_el30, "bg-base-200 px-1 rounded");
        const _el31 = _$createTextWrapper(_el30);
        _$appendChild(_el30, _el31);
        _$settextContent(_el31, '{');
        _$appendChild(_el30, _$createTextNode("' '"));
        const _el32 = _$createTextWrapper(_el30);
        _$appendChild(_el30, _el32);
        _$settextContent(_el32, '}');
        const _el33 = _$createTextWrapper(_el28);
        _$appendChild(_el28, _el33);
        _$settextContent(_el33, ' ');
        _$appendChild(_el28, _$createTextNode("插入一个明确的空格。"));
        const _el34 = _$createElement("div");
        _$appendChild(_el24, _el34);
        _$setClassName(_el34, "mt-3 rounded-box border p-4");
        const _el35 = _$createElement("div");
        _$appendChild(_el34, _el35);
        const _el36 = _$createElement("span");
        _$appendChild(_el35, _el36);
        _$appendChild(_el36, _$createTextNode("Foo"));
        const _el37 = _$createElement("span");
        _$appendChild(_el35, _el37);
        _$appendChild(_el37, _$createTextNode("Bar"));
        const _el38 = _$createElement("span");
        _$appendChild(_el35, _el38);
        _$appendChild(_el38, _$createTextNode("Baz"));
        const _el39 = _$createElement("div");
        _$appendChild(_el34, _el39);
        _$setClassName(_el39, "opacity-70 text-sm");
        _$appendChild(_el39, _$createTextNode("上面三个相邻元素通常会连在一起"));
        const _el40 = _$createElement("div");
        _$appendChild(_el34, _el40);
        _$setClassName(_el40, "mt-2");
        const _el41 = _$createElement("span");
        _$appendChild(_el40, _el41);
        _$appendChild(_el41, _$createTextNode("Foo"));
        const _el42 = _$createTextWrapper(_el40);
        _$appendChild(_el40, _el42);
        _$settextContent(_el42, ' ');
        const _el43 = _$createElement("span");
        _$appendChild(_el40, _el43);
        _$appendChild(_el43, _$createTextNode("Bar"));
        const _el44 = _$createTextWrapper(_el40);
        _$appendChild(_el40, _el44);
        _$settextContent(_el44, ' ');
        const _el45 = _$createElement("span");
        _$appendChild(_el40, _el45);
        _$appendChild(_el45, _$createTextNode("Baz"));
        const _el46 = _$createElement("div");
        _$appendChild(_el34, _el46);
        _$setClassName(_el46, "opacity-70 text-sm");
        _$appendChild(_el46, _$createTextNode("使用 "));
        const _el47 = _$createTextWrapper(_el46);
        _$appendChild(_el46, _el47);
        _$settextContent(_el47, '{');
        _$appendChild(_el46, _$createTextNode("' '"));
        const _el48 = _$createTextWrapper(_el46);
        _$appendChild(_el46, _el48);
        _$settextContent(_el48, '}');
        _$appendChild(_el46, _$createTextNode(" 显式空格分隔"));
        const _el49 = _$createElement("div");
        _$appendChild(_root, _el49);
        _$setClassName(_el49, "card bg-base-100 border");
        const _el50 = _$createElement("div");
        _$appendChild(_el49, _el50);
        _$setClassName(_el50, "card-body");
        const _el51 = _$createElement("h2");
        _$appendChild(_el50, _el51);
        _$setClassName(_el51, "text-lg font-semibold");
        _$appendChild(_el51, _$createTextNode("3) 不换行空格"));
        const _el52 = _$createElement("p");
        _$appendChild(_el50, _el52);
        _$setClassName(_el52, "text-sm text-base-content/70");
        _$appendChild(_el52, _$createTextNode("使用 HTML 实体"));
        const _el53 = _$createElement("code");
        _$appendChild(_el52, _el53);
        _$setClassName(_el53, "bg-base-200 px-1 rounded");
        _$appendChild(_el53, _$createTextNode("&nbsp;"));
        const _el54 = _$createTextWrapper(_el52);
        _$appendChild(_el52, _el54);
        _$settextContent(_el54, ' ');
        _$appendChild(_el52, _$createTextNode("可以插入一个不换行空格，避免被折叠或在换行处断开。"));
        const _el55 = _$createElement("div");
        _$appendChild(_el50, _el55);
        _$setClassName(_el55, "mt-3 rounded-box border p-4");
        const _el56 = _$createElement("p");
        _$appendChild(_el55, _el56);
        _$appendChild(_el56, _$createTextNode("价格：100      USD，编号：AB  1234"));
        const _el57 = _$createElement("div");
        _$appendChild(_root, _el57);
        _$setClassName(_el57, "card bg-base-100 border");
        const _el58 = _$createElement("div");
        _$appendChild(_el57, _el58);
        _$setClassName(_el58, "card-body");
        const _el59 = _$createElement("h2");
        _$appendChild(_el58, _el59);
        _$setClassName(_el59, "text-lg font-semibold");
        _$appendChild(_el59, _$createTextNode("4) CSS white-space 控制"));
        const _el60 = _$createElement("p");
        _$appendChild(_el58, _el60);
        _$setClassName(_el60, "text-sm text-base-content/70");
        _$appendChild(_el60, _$createTextNode("通过 CSS 的"));
        const _el61 = _$createElement("code");
        _$appendChild(_el60, _el61);
        _$setClassName(_el61, "bg-base-200 px-1 rounded");
        _$appendChild(_el61, _$createTextNode("white-space"));
        const _el62 = _$createTextWrapper(_el60);
        _$appendChild(_el60, _el62);
        _$settextContent(_el62, ' ');
        _$appendChild(_el60, _$createTextNode("可改变空白处理策略。"));
        const _el63 = _$createElement("div");
        _$appendChild(_el58, _el63);
        _$setClassName(_el63, "mt-3 grid md:grid-cols-3 gap-3");
        const _el64 = _$createElement("div");
        _$appendChild(_el63, _el64);
        _$setClassName(_el64, "rounded-box border p-3");
        const _el65 = _$createElement("div");
        _$appendChild(_el64, _el65);
        _$setClassName(_el65, "text-sm font-semibold mb-1");
        _$appendChild(_el65, _$createTextNode("normal（默认）"));
        const _el66 = _$createElement("div");
        _$appendChild(_el64, _el66);
        _$setStyle(_el66, {
            whiteSpace: 'normal'
        });
        _$appendChild(_el66, _$createTextNode("A    B      C "));
        const _el67 = _$createTextWrapper(_el66);
        _$appendChild(_el66, _el67);
        _$settextContent(_el67, '\n');
        _$appendChild(_el66, _$createTextNode(" line-1 "));
        const _el68 = _$createTextWrapper(_el66);
        _$appendChild(_el66, _el68);
        _$settextContent(_el68, '\n');
        _$appendChild(_el66, _$createTextNode(" line-2"));
        const _el69 = _$createElement("div");
        _$appendChild(_el63, _el69);
        _$setClassName(_el69, "rounded-box border p-3");
        const _el70 = _$createElement("div");
        _$appendChild(_el69, _el70);
        _$setClassName(_el70, "text-sm font-semibold mb-1");
        _$appendChild(_el70, _$createTextNode("pre"));
        const _el71 = _$createElement("div");
        _$appendChild(_el69, _el71);
        _$setStyle(_el71, {
            whiteSpace: 'pre'
        });
        _$appendChild(_el71, _$createTextNode("A    B      C "));
        const _el72 = _$createTextWrapper(_el71);
        _$appendChild(_el71, _el72);
        _$settextContent(_el72, '\n');
        _$appendChild(_el71, _$createTextNode(" line-1 "));
        const _el73 = _$createTextWrapper(_el71);
        _$appendChild(_el71, _el73);
        _$settextContent(_el73, '\n');
        _$appendChild(_el71, _$createTextNode(" line-2"));
        const _el74 = _$createElement("div");
        _$appendChild(_el63, _el74);
        _$setClassName(_el74, "rounded-box border p-3");
        const _el75 = _$createElement("div");
        _$appendChild(_el74, _el75);
        _$setClassName(_el75, "text-sm font-semibold mb-1");
        _$appendChild(_el75, _$createTextNode("pre-wrap"));
        const _el76 = _$createElement("div");
        _$appendChild(_el74, _el76);
        _$setStyle(_el76, {
            whiteSpace: 'pre-wrap'
        });
        _$appendChild(_el76, _$createTextNode("A    B      C "));
        const _el77 = _$createTextWrapper(_el76);
        _$appendChild(_el76, _el77);
        _$settextContent(_el77, '\n');
        _$appendChild(_el76, _$createTextNode(" line-1 "));
        const _el78 = _$createTextWrapper(_el76);
        _$appendChild(_el76, _el78);
        _$settextContent(_el78, '\n');
        _$appendChild(_el76, _$createTextNode(" line-2"));
        const _el79 = _$createElement("div");
        _$appendChild(_root, _el79);
        _$setClassName(_el79, "card bg-base-100 border");
        const _el80 = _$createElement("div");
        _$appendChild(_el79, _el80);
        _$setClassName(_el80, "card-body");
        const _el81 = _$createElement("h2");
        _$appendChild(_el80, _el81);
        _$setClassName(_el81, "text-lg font-semibold");
        _$appendChild(_el81, _$createTextNode("5) inline-block 间隙"));
        const _el82 = _$createElement("p");
        _$appendChild(_el80, _el82);
        _$setClassName(_el82, "text-sm text-base-content/70");
        _$appendChild(_el82, _$createTextNode("内联块（inline-block）之间如果在源码里有空格/换行，会产生可见间隙；可通过删除空白或使用"));
        const _el83 = _$createTextWrapper(_el82);
        _$appendChild(_el82, _el83);
        _$settextContent(_el83, ' ');
        const _el84 = _$createElement("code");
        _$appendChild(_el82, _el84);
        _$setClassName(_el84, "bg-base-200 px-1 rounded");
        const _el85 = _$createTextWrapper(_el84);
        _$appendChild(_el84, _el85);
        _$settextContent(_el85, '{');
        _$appendChild(_el84, _$createTextNode("' '"));
        const _el86 = _$createTextWrapper(_el84);
        _$appendChild(_el84, _el86);
        _$settextContent(_el86, '}');
        const _el87 = _$createTextWrapper(_el82);
        _$appendChild(_el82, _el87);
        _$settextContent(_el87, ' ');
        _$appendChild(_el82, _$createTextNode("精控。"));
        const _el88 = _$createElement("div");
        _$appendChild(_el80, _el88);
        _$setClassName(_el88, "mt-3");
        const _el89 = _$createElement("div");
        _$appendChild(_el88, _el89);
        _$setClassName(_el89, "rounded-box border p-4");
        const _el90 = _$createElement("span");
        _$appendChild(_el89, _el90);
        _$setClassName(_el90, "inline-block bg-primary/20 px-3 py-2");
        _$appendChild(_el90, _$createTextNode("Box A"));
        const _el91 = _$createElement("span");
        _$appendChild(_el89, _el91);
        _$setClassName(_el91, "inline-block bg-primary/20 px-3 py-2");
        _$appendChild(_el91, _$createTextNode("Box B"));
        const _el92 = _$createElement("div");
        _$appendChild(_el88, _el92);
        _$setClassName(_el92, "rounded-box border p-4");
        const _el93 = _$createElement("span");
        _$appendChild(_el92, _el93);
        _$setClassName(_el93, "inline-block bg-primary/20 px-3 py-2");
        _$appendChild(_el93, _$createTextNode("Box A"));
        const _el94 = _$createElement("span");
        _$appendChild(_el92, _el94);
        _$setClassName(_el94, "inline-block bg-primary/20 px-3 py-2");
        _$appendChild(_el94, _$createTextNode("Box B"));
        const _el95 = _$createElement("div");
        _$appendChild(_el88, _el95);
        _$setClassName(_el95, "opacity-70 text-sm mt-1");
        _$appendChild(_el95, _$createTextNode("上面 A 与 B 之间存在由空白产生的间隙"));
        const _el96 = _$createElement("div");
        _$appendChild(_el88, _el96);
        _$setClassName(_el96, "rounded-box border p-4 mt-2");
        const _el97 = _$createElement("span");
        _$appendChild(_el96, _el97);
        _$setClassName(_el97, "inline-block bg-accent/20 px-3 py-2");
        _$appendChild(_el97, _$createTextNode("Box A"));
        const _el98 = _$createTextWrapper(_el96);
        _$appendChild(_el96, _el98);
        _$settextContent(_el98, ' ');
        const _el99 = _$createElement("span");
        _$appendChild(_el96, _el99);
        _$setClassName(_el99, "inline-block bg-accent/20 px-3 py-2");
        _$appendChild(_el99, _$createTextNode("Box B"));
        const _el100 = _$createElement("div");
        _$appendChild(_el88, _el100);
        _$setClassName(_el100, "opacity-70 text-sm mt-1");
        _$appendChild(_el100, _$createTextNode("使用 "));
        const _el101 = _$createTextWrapper(_el100);
        _$appendChild(_el100, _el101);
        _$settextContent(_el101, '{');
        _$appendChild(_el100, _$createTextNode("' '"));
        const _el102 = _$createTextWrapper(_el100);
        _$appendChild(_el100, _el102);
        _$settextContent(_el102, '}');
        _$appendChild(_el100, _$createTextNode(" 显式控制间隙大小"));
        const _el103 = _$createElement("div");
        _$appendChild(_el79, _el103);
        _$appendChild(_el103, _$createTextNode("© "));
        const _el104 = _$createTextWrapper(_el103);
        _$appendChild(_el103, _el104);
        watchEffect(()=>{
            _$settextContent(_el104, new Date().getFullYear());
        });
        _$appendChild(_el103, _$createTextNode(" Rue.js"));
        return {
            vaporElement: _root
        };
    });
};
export default About;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec47.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
