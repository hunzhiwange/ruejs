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
    std::fs::write(format!("target/vapor_outputs/{name}.out.js"), utils::strip_marker(&out)).ok();

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

    assert!(out.contains("(step, idx)=>{"), "{out}");
    assert!(out.contains("const y = cPad.t + plotH - step * plotH;"), "{out}");
    assert!(out.contains("_el3.setAttribute(\"y1\", String(__child2_next))"), "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
}

#[test]
/// 覆盖“参数解构 + 局部变量参与 key”的场景。
///
/// 这个用例主要锁 getKey 的作用域修复：
/// - map 参数不是简单 `item`，而是 `({ id, value })`
/// - key 也不是直接写 `id`，而是先经过 `const rowKey = id`
///
/// 当前实现会先把解构参数规范化成 `item` 成员访问，
/// 但仍必须把 key/renderItem 依赖的声明前缀完整保留下来。
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

    assert!(out.contains("rows.map(({ id, value })=>{"), "{out}");
    assert!(out.contains("const rowKey = id;"), "{out}");
    assert!(out.contains("const label = value * 2;"), "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
    let removed_factory = ["_$compiledCreate", "V", "Node", "(__slot)"];
    assert!(!out.contains(&removed_factory.concat()));
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

    assert!(out.contains("const base = row.value * 10;"), "{out}");
    assert!(out.contains("const label = base.toFixed(0);"), "{out}");
    assert!(out.contains("const __child1 = _$compiledRoot("), "{out}");
    assert!(out.contains("const __child2 = _$compiledRoot("), "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
}

#[test]
/// 覆盖“条件 return”的复杂 block 场景。
///
/// 这个用例不是要求 direct _$compiledRoot 快路径继续吃下所有控制流，
/// 而是要求编译器在复杂 block 下切到更保守的 raw-slot fallback：
/// 保留原 if/else 结构，先算出 `__slot`，再直接交给 `renderAnchor(__slot, ...)`。
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

    assert!(out.contains("const label = row.value.toFixed(0);"), "{out}");
    assert!(out.contains("if (row.hot)"), "{out}");
    assert_eq!(out.matches("return _$compiledRoot(").count(), 2, "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
    let removed_factory = ["_$compiledCreate", "V", "Node", "(__slot)"];
    assert!(!out.contains(&removed_factory.concat()));
}

#[test]
/// 覆盖“简单 block 前缀读取外部 ref.value”的场景。
///
/// 这类用法不能把 `const isEditing = ...` 固化在 renderItem 顶层，
/// 否则后续 slot/watchEffect 只会拿到初始快照。
///
/// 当前期望是：把表达式直接内联回 slot watcher，
/// 让 keyed-list 继续走 direct _$compiledRoot 路径，但条件分支本身仍然读取外部 reactive 值。
fn inlines_outer_ref_value_into_slot_watchers() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const rows = [{ id: 1, title: 'A' }]

const Demo: FC = () => {
  const editingId = ref<number | null>(null)
  return (
    <ul>
      {rows.map(row => {
        const isEditing = editingId.value === row.id
        return (
          <li key={row.id}>
            {!isEditing && <button>改名</button>}
            {isEditing && <input value={row.title} />}
          </li>
        )
      })}
    </ul>
  )
}
"##;

    let out = compile(src, "list_block_scope_outer_ref_value");

    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert_eq!(out.matches("_$compiledBranch(").count(), 2, "{out}");
    assert!(out.contains("!(editingId.value === _$rowItem1.get().id)"), "{out}");
    assert!(out.contains("editingId.value === _$rowItem1.get().id"), "{out}");
    assert!(out.contains("_$rowItem1.get().title"), "{out}");
    assert!(!out.contains("renderAnchor("), "{out}");
    assert!(!out.contains("vapor("), "{out}");
    assert!(!out.contains("const isEditing = editingId.value === row.id;"));
}

#[test]
/// 覆盖“简单 block 前缀读取外部 `.get()`”的场景。
///
/// 和 `ref.value` 一样，这类外部响应式读取也不能在 renderItem 顶层提前求值，
/// 而是要直接落进文本/slot watcher 的表达式里。
fn inlines_outer_getter_signal_into_slot_watchers() {
    let src = r##"
import { type FC, computed } from '@rue-js/rue'

const rows = [{ id: 1, title: 'A' }]

const Demo: FC = () => {
  const selectedId = computed(() => 1)
  return (
    <ul>
      {rows.map(row => {
        const isSelected = selectedId.get() === row.id
        return <li key={row.id}>{isSelected ? '已选中' : row.title}</li>
      })}
    </ul>
  )
}
"##;

    let out = compile(src, "list_block_scope_outer_getter_signal");

    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(!out.contains(concat!("direct", "Root:")), "{out}");
    assert!(!out.contains(concat!("compiled", "RowPatch:")), "{out}");
    assert_eq!(
        out.matches("_$compiledRenderEffect(").count(),
        1,
        "safe getter reads should run through the list-level patch effect: {out}"
    );
    assert!(out.contains("_$mountCompiledKeyedRow"), "{out}");
    assert!(out.contains("_$compiledText("), "{out}");
    assert!(out.contains("selectedId.get() === _$rowItem1.get().id"), "{out}");
    assert!(!out.contains("renderAnchor("), "{out}");
    assert!(!out.contains("vapor("), "{out}");
    assert!(!out.contains("const isSelected = selectedId.get() === row.id;"));
}
