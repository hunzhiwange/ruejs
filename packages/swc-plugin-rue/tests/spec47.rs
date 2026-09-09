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

    let _expected_fragment = r##"
import { _$compiledRoot, renderAnchor, _$template, _$setStyle, untrack, watchEffect } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template('<div class="max-w-[900px] mx-auto space-y-8"><h1 class="text-2xl font-semibold">空白字符处理 Demo（参考 React 行为）</h1><p class="text-base-content/70">本页演示浏览器与 JSX 对空白字符（空格、Tab、换行）的处理方式：默认会折叠连续空白；某些场景可用 <code class="bg-base-200 px-1 rounded">{\' \'}</code> 或 <code class="bg-base-200 px-1 rounded"></code> 来显式插入空格；也可用 CSS <code class="bg-base-200 px-1 rounded">white-space</code> 控制。</p><div class="card bg-base-100 border"><div class="card-body"><h2 class="text-lg font-semibold">1) 默认空白折叠</h2><p class="text-sm text-base-content/70">连续空格与换行会被折叠为单个空格，行首/行尾空白通常被忽略。</p><div class="mt-3 rounded-box border p-4"><p>AA    BB      CC</p><p>行首空白：       Start</p><p>多行文本： AA BB CC</p></div></div></div><div class="card bg-base-100 border"><div class="card-body"><h2 class="text-lg font-semibold">2) JSX 显式空格 {\' \'}</h2><p class="text-sm text-base-content/70">在 JSX 中，跨行或相邻内联元素之间的空白可能被裁剪；可用 <code class="bg-base-200 px-1 rounded">{\' \'}</code> 插入一个明确的空格。</p><div class="mt-3 rounded-box border p-4"><div><span>Foo</span><span>Bar</span><span>Baz</span></div><div class="opacity-70 text-sm">上面三个相邻元素通常会连在一起</div><div class="mt-2"><span>Foo</span> <span>Bar</span> <span>Baz</span></div><div class="opacity-70 text-sm">使用 {\' \'} 显式空格分隔</div></div></div></div><div class="card bg-base-100 border"><div class="card-body"><h2 class="text-lg font-semibold">3) 不换行空格</h2><p class="text-sm text-base-content/70">使用 HTML 实体 <code class="bg-base-200 px-1 rounded">&amp;nbsp;</code> 可以插入一个不换行空格，避免被折叠或在换行处断开。</p><div class="mt-3 rounded-box border p-4"><p>价格：100      USD，编号：AB  1234</p></div></div></div><div class="card bg-base-100 border"><div class="card-body"><h2 class="text-lg font-semibold">4) CSS white-space 控制</h2><p class="text-sm text-base-content/70">通过 CSS 的 <code class="bg-base-200 px-1 rounded">white-space</code> 可改变空白处理策略。</p><div class="mt-3 grid md:grid-cols-3 gap-3"><div class="rounded-box border p-3"><div class="text-sm font-semibold mb-1">normal（默认）</div><div>A    B      C \n line-1 \n line-2</div></div><div class="rounded-box border p-3"><div class="text-sm font-semibold mb-1">pre</div><div>A    B      C \n line-1 \n line-2</div></div><div class="rounded-box border p-3"><div class="text-sm font-semibold mb-1">pre-wrap</div><div>A    B      C \n line-1 \n line-2</div></div></div></div></div><div class="card bg-base-100 border"><div class="card-body"><h2 class="text-lg font-semibold">5) inline-block 间隙</h2><p class="text-sm text-base-content/70">内联块（inline-block）之间如果在源码里有空格/换行，会产生可见间隙；可通过删除空白或使用 <code class="bg-base-200 px-1 rounded">{\' \'}</code> 精控。</p><div class="mt-3"><div class="rounded-box border p-4"><span class="inline-block bg-primary/20 px-3 py-2">Box A</span><span class="inline-block bg-primary/20 px-3 py-2">Box B</span></div><div class="rounded-box border p-4"><span class="inline-block bg-primary/20 px-3 py-2">Box A</span> <span class="inline-block bg-primary/20 px-3 py-2">Box B</span></div><div class="opacity-70 text-sm mt-1">上面 A 与 B 之间存在由空白产生的间隙</div><div class="rounded-box border p-4 mt-2"><span class="inline-block bg-accent/20 px-3 py-2">Box A</span> <span class="inline-block bg-accent/20 px-3 py-2">Box B</span></div><div class="opacity-70 text-sm mt-1">使用 {\' \'} 显式控制间隙大小</div></div></div><div>© <!--rue:text-hole:0--> Rue.js</div></div></div>');
const About: FC = ()=>{
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[5].childNodes[0].childNodes[2].childNodes[0].childNodes[1];
        const _el2 = _root.childNodes[5].childNodes[0].childNodes[2].childNodes[1].childNodes[1];
        const _el3 = _root.childNodes[5].childNodes[0].childNodes[2].childNodes[2].childNodes[1];
        const _el4 = _root.childNodes[6].childNodes[1].childNodes[1];
        const _el5 = _el4.parentNode;
        _$setStyle(_el1, {
            whiteSpace: 'normal'
        });
        _$setStyle(_el2, {
            whiteSpace: 'pre'
        });
        _$setStyle(_el3, {
            whiteSpace: 'pre-wrap'
        });
        watchEffect(()=>{
            const __slot = new Date().getFullYear();
            untrack(()=>renderAnchor(__slot, _el5, _el4));
        });
        return _root;
    });
};
export default About;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec47.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("AA BB CC"), "{normalized}");
    assert!(normalized.contains("<span>Foo</span> <span>Bar</span>"), "{normalized}");
    assert!(normalized.contains("_$setStyle(_el1, { whiteSpace: 'normal' })"), "{normalized}");
    assert!(normalized.contains("_$setStyle(_el2, { whiteSpace: 'pre' })"), "{normalized}");
    assert!(normalized.contains("_$setStyle(_el3, { whiteSpace: 'pre-wrap' })"), "{normalized}");
    assert!(normalized.contains("effect(()=>"), "{normalized}");
    assert!(normalized.contains("new Date().getFullYear()"), "{normalized}");
}
