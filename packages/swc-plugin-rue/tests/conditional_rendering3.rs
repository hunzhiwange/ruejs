//! 条件渲染转换测试（React 风格，变体 3）
//!
//! 覆盖：ref 状态控制下的嵌套三元渲染与 true 兜底。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_conditional_jsx_branch3() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const ReactConditionalDemo: FC = () => {
   const show = ref(true)

  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-purple-600 mb-3">React 风格条件渲染</h2>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          className="rounded-lg border border-gray-700 bg-gray-700 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200"
          onClick={() => (show.value = !show.value)}
        >
          {show.value ? '隐藏详情' : '显示详情'}
        </button>
      </div>

      {show.value ? (
        <div className="mt-2">
          <p className="text-gray-700">详情区域：仅在 show 为 true 时显示</p>
        </div>
      ) : true}

      {show.value ? (
        <div className="mt-2">
          <p className="text-gray-700">详情区域：仅在 show 为 true 时显示</p>
        </div>
      ) : false}

      {show.value ? (
        <div className="mt-2">
          <p className="text-gray-700">详情区域：仅在 show 为 true 时显示</p>
        </div>
      ) : undefined}
    </div>
  )
}

export default ReactConditionalDemo;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let out = utils::normalize(&utils::strip_marker(&utils::emit(apply(program), cm)));

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/conditional_rendering3.out.js", &out).ok();

    let vapor_import = out
        .split(';')
        .find(|statement| statement.contains("@rue-js/rue/internal/block"))
        .expect("conditional rendering must import the Vapor runtime");
    for helper in ["_$compiledBranch", "_$compiledRoot"] {
        assert!(vapor_import.contains(helper), "missing {helper}: {out}");
    }
    assert_eq!(out.matches("_$compiledBranchAt(").count(), 3, "{out}");
    assert_eq!(
        out.matches("if (show.value) return { __rue_compiled_branch_key: true").count(),
        3,
        "{out}"
    );
    assert_eq!(out.matches("_$createDocumentFragment()").count(), 3, "{out}");
    assert!(!out.contains("watchEffect"), "{out}");
    assert!(!out.contains("untrack"), "{out}");
}
