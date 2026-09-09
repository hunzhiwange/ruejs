# 任务 6: 闭合组件与 Props 协议

批次：【批次 6】 依赖批次：依赖批次 5

状态：未开始

目的：让函数组件编译成静态 ComponentFactory，删除 class、动态任意组件和通用 renderable 转换。

来源任务：任务 5

预计会话范围：聚焦 component call、props tracking、emit、生命周期和错误边界，不处理 builtin。

## 文件

- 修改：`packages/swc-plugin-rue/src/compiled_component.rs`
- 修改：`packages/swc-plugin-rue/src/element_component.rs`
- 修改：`packages/swc-plugin-rue/src/compiled_props.rs`
- 修改：`packages/runtime/src/compiled-component.ts`
- 修改：`packages/runtime/src/compiled-component-call.ts`
- 修改：`packages/runtime/src/compiled-props.ts`
- 测试：`packages/runtime/__tests__/compiledComponentUpdate.spec.tsx`
- 测试：`packages/runtime/__tests__/componentEmit.actual.spec.tsx`
- 测试：`packages/runtime/__tests__/errorCaptured.spec.ts`

## 上下文

- 当前 component 支持 class render、unknown 返回值、clone/mountable、动态组件和多种 props 读取兼容。
- 新协议只支持被编译器识别的函数组件；动态组件表达式必须编译为显式 factory switch，否则编译错误。

## 测试计划

- 行为：组件 mount/update/dispose、props 精确订阅、emit、hook owner 与错误冒泡在 closed ABI 下工作。
- 失败验证测试：生成代码不得调用 `_$compiledValue`、class 检测或 runtime component resolver。
- 失败验证命令：`pnpm exec vitest run --project unit-jsdom packages/runtime/__tests__/compiledComponentUpdate.spec.tsx packages/runtime/__tests__/compiledProps.direct-access.spec.tsx packages/runtime/__tests__/componentEmit.actual.spec.tsx packages/runtime/__tests__/errorCaptured.spec.ts`
- 预期失败原因：当前组件实现仍接受 unknown/legacy renderable。
- 通过验证命令：同上，并运行 SWC component/props 测试。
- 模拟策略：真实函数组件编译；不模拟组件 runtime。

## 步骤

1. 定义 ComponentFactory(props, slots, owner)→Block 的唯一 ABI。
2. 编译静态组件引用、props getter 与 slot factories。
3. 动态组件降为编译期 switch/branch；无法枚举时报编译错误。
4. 删除 class component、runtime registry、unknown 返回值和 handle 转换。
5. 保持错误边界与生命周期由 owner 链实现，不接入通用 runtime bridge。

## 验证

- 运行：`pnpm --filter @rue-js/swc-plugin-rue test`
- 运行：失败验证命令。
- 运行：`node scripts/compiler-only-runtime-audit.js --scenario component --check`
- 预期：component gzip ≤10 KB 且无 facade、Island、legacy、js-runtime、render-anchor。
- 所需证据：红绿测试、生成 ABI、模块变化、体积和公开破坏项清单。

## 完成

删除旧能力而非提供 deprecated wrapper；不支持的动态模式必须给出编译诊断。
