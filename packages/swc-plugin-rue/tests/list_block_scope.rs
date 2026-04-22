//! 列表回调为 block body 时，return 之前的局部语句必须保留到 renderItem 中。
use swc_plugin_rue::apply;

mod utils;

/// 编译一段最小 TSX 代码，并把输出落盘到 target/vapor_outputs 方便人工排查。
///
/// 这些回归测试不是只看“通过/失败”，还会在失败时需要人工打开产物比对，
/// 所以这里统一把产物写出来，避免每个测试重复样板代码。
fn compile(src: &str, name: &str) -> String {
  let (program, cm) = utils::parse(src, &format!("{name}.tsx"));
  let program = apply(program);
  let out = utils::emit(program, cm);

  std::fs::create_dir_all("target/vapor_outputs").ok();
  std::fs::write(
    format!("target/vapor_outputs/{name}.out.js"),
    utils::strip_marker(&out),
  )
  .ok();

  out
}

#[test]
/// 覆盖最核心的回归：
/// map callback 是 block body，前面先声明 `const y = ...`，后面 return SVG JSX。
///
/// 这个场景就是之前真实 bug 的最小抽象：
/// 编译器如果只拿 return 里的 JSX，而忘了把 `const y` 带进 renderItem，
/// 运行时就会在属性绑定里引用到未定义的 `y`。
fn preserves_block_scope_statements_inside_list_render_item() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const chartW = 700
const chartH = 220
const cPad = { t: 20, l: 16 }
const plotH = chartH - cPad.t - 36
const maxLatency = 80

const Demo: FC = () => (
  <svg>
    {[0, 0.25, 0.5, 0.75, 1].map(step => {
      const y = cPad.t + plotH - step * plotH
      return (
        <g key={step}>
          <line x1={cPad.l} y1={y} x2={chartW - cPad.r} y2={y} className="bi-grid-line" />
          <text x={cPad.l + 4} y={y - 6} className="bi-grid-label">{(maxLatency * step).toFixed(0)}ms</text>
        </g>
      )
    })}
  </svg>
)
"##;

    let out = compile(src, "list_block_scope");

    assert!(out.contains("renderItem: (step, parent, start, end, idx)=>"));
    assert!(out.contains("const y = cPad.t + plotH - step * plotH;"));
    assert!(!out.contains("getKey: (step, idx)=>{ const y = cPad.t + plotH - step * plotH;"));
    assert!(out.contains("String((y))"));
    assert!(out.contains("String(y - 6)"));
    assert!(out.contains("String((cPad.l))"));
    assert!(out.contains("String(chartW - cPad.r)"));
}

#[test]
/// 覆盖“参数解构 + 局部变量参与 key”的场景。
///
/// 这个用例主要锁 getKey 的作用域修复：
/// - map 参数不是简单 `item`，而是 `({ id, value })`
/// - key 也不是直接写 `id`，而是先经过 `const rowKey = id`
///
/// 只有当 getKey 正确保留了解构和必要声明，才能稳定生成 `return rowKey;`。
fn preserves_destructured_params_and_decl_prefix_for_key_and_render_item() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const rows = [{ id: 'a', value: 1 }]

const Demo: FC = () => (
  <ul>
    {rows.map(({ id, value }) => {
      const rowKey = id
      const label = value * 2
      return <li key={rowKey}>{label}</li>
    })}
  </ul>
)
"##;

    let out = compile(src, "list_block_scope_destructure");

    assert!(out.contains("const rowKey = id;"));
    assert!(out.contains("const label = value * 2;"));
    assert!(out.contains("return rowKey;"));
    assert!(!out.contains("_$vaporCreateVNode(__slot)"));
}

#[test]
/// 覆盖“多个临时变量 + Fragment 返回”的场景。
///
/// 这个测试锁两个边界：
/// 1. 简单声明前缀不止一个时，renderItem 仍然要把它们全部带进去；
/// 2. return 的不是单根原生元素，而是 Fragment，也要继续保留这些局部变量。
fn preserves_multiple_temp_decls_when_returning_fragment() {
    let src = r##"
import { type FC, Fragment } from '@rue-js/rue'

const rows = [{ id: 'a', value: 1 }]

const Demo: FC = () => (
  <div>
    {rows.map(row => {
      const base = row.value * 10
      const label = base.toFixed(0)
      return (
        <Fragment key={row.id}>
          <span>{label}</span>
          <em>{base}</em>
        </Fragment>
      )
    })}
  </div>
)
"##;

    let out = compile(src, "list_block_scope_fragment");

    assert!(out.contains("const base = row.value * 10;"));
    assert!(out.contains("const label = base.toFixed(0);"));
    assert!(out.contains("_$settextContent(_el2, label);"));
    assert!(out.contains("_$settextContent(_el4, base);"));
}

#[test]
/// 覆盖“条件 return”的复杂 block 场景。
///
/// 这个用例不是要求 direct vapor 快路径继续吃下所有控制流，
/// 而是要求编译器在复杂 block 下切到更保守的 vnode fallback：
/// 保留原 if/else 结构，先算出 `__slot`，再走 `_$vaporCreateVNode(__slot)`。
///
/// 这样才能保证多分支 return 的原始语义不被破坏。
fn preserves_conditional_returns_via_slot_fallback() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const rows = [{ id: 'a', hot: true, value: 1 }]

const Demo: FC = () => (
  <ul>
    {rows.map(row => {
      const label = row.value.toFixed(0)
      if (row.hot) {
        return <li key={row.id}>hot {label}</li>
      }
      return <li key={row.id}>{label}</li>
    })}
  </ul>
)
"##;

    let out = compile(src, "list_block_scope_conditional");

    assert!(out.contains("const __slot = (()=>{"));
    assert!(out.contains("if (row.hot) {"));
    assert!(out.contains("_$vaporCreateVNode(__slot)"));
    assert!(!out.contains("getKey: (row, idx)=>{ const label = row.value.toFixed(0);"));
}
