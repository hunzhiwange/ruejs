//! 条件渲染转换测试（React 风格，变体 2）
//!
//! 覆盖：ref 状态驱动的 ?: 分支切换与按钮事件更新。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_conditional_jsx_branch2() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const ReactConditionalDemo: FC = () => {
   const show = ref(true)
   const level = ref(1)
   const message = ref('Hello')

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
        <button
          className="rounded-lg border border-blue-500 bg-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200"
          onClick={() => level.value++}
        >
          等级+1
        </button>
        <button
          className="rounded-lg border border-gray-500 bg-gray-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-700 hover:bg-gray-700 focus:ring focus:ring-gray-200"
          onClick={() => (message.value = message.value ? '' : 'Hello')}
        >
          {message.value ? <span className="text-red-600">清空消息</span> : '恢复消息'}
        </button>
      </div>

      {show.value ? (
        <div className="mt-2">
          <p className="text-gray-700">详情区域：仅在 show 为 true 时显示</p>
        </div>
      ) : null}

     {show.value &&
        <div className="mt-2">
          <p className="text-gray-700">详情区域2：仅在 show 为 true 时显示</p>
        </div>}

      <p className="text-gray-700">等级状态：{level.value >= 3 ? <span className="text-red-600">高级</span> : <span className="text-green-600">普通</span>}</p>
      {message.value ? <p className="text-gray-700 bg-gray-100 p-2 rounded-md">消息：{message.value}</p> : null}
    </div>
  )
}

export default ReactConditionalDemo;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/conditional_rendering2.out.js", &out).ok();

    let vapor_import = out
        .split(';')
        .find(|statement| statement.contains("@rue-js/rue/internal/block"))
        .expect("conditional rendering must import the Vapor runtime");
    for helper in ["_$compiledBranchAt", "_$compiledRoot"] {
        assert!(vapor_import.contains(helper), "missing {helper}: {out}");
    }
    assert!(
        out.split(';')
            .any(|statement| statement.contains("_$compiledText")
                && statement.contains("internal/dom")),
        "{out}"
    );
    assert_eq!(out.matches("_$compiledBranchAt(").count(), 5, "{out}");
    assert!(out.contains("if (show.value) return { __rue_compiled_branch_key: true"), "{out}");
    assert!(
        out.contains("if (level.value >= 3) return { __rue_compiled_branch_key: true"),
        "{out}"
    );
    assert!(out.contains(", ()=>message.value)"), "{out}");
    assert!(out.contains("_$createDocumentFragment()"), "{out}");
    assert!(!out.contains("watchEffect"), "{out}");
    assert!(!out.contains("untrack"), "{out}");
}
