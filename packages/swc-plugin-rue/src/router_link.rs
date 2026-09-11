use swc_core::ecma::ast::*;

/*
RouterLink 必须保留组件 owner：
- Router 按应用容器隔离，RouterLink 需要在组件上下文中解析当前 Router。
- 旧快路径把 RouterLink 改写为原生 `<a>`，并调用组件上的静态导航方法；
  这些静态方法无法安全解析多应用容器，已经从 RouterLink 公共实现中移除。
- 保留这个统一判定入口，让所有 lowering 路径明确回退到组件编译，而不是在各处
  复制 RouterLink 特例。组件本身仍会被编译为直接 DOM 操作。
*/
pub fn rewrite_router_link_fast_path(jsx_el: &JSXElement) -> Option<JSXElement> {
    let _ = jsx_el;
    None
}

#[cfg(test)]
#[path = "router_link_tests.rs"]
mod tests;
