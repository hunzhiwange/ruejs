use super::super::Rue;
use super::super::types::MountInput;
use crate::reactive::core::batch_scope;
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::Array;
use wasm_bindgen::JsValue;
use wasm_bindgen::throw_str;

// 静态锚点挂载（render_static）：
// - 使用单个临时锚点作为插入定位，挂载完成后移除该锚点
// - 不写入 range_map，也不保留 start/end 成对注释，适合“父层不会再重跑”的静态子树
// - 常见场景：静态组件、静态 JSX 插槽在编译期已确认不会由父级驱动更新

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    fn sync_static_mount_frag_nodes(&mut self, parent: &A::Element, mounted_nodes: &[A::Element])
    where
        <A as DomAdapter>::Element: Into<JsValue>,
    {
        let parent_js: JsValue = parent.clone().into();
        let arr_val = js_sys::Reflect::get(&parent_js, &JsValue::from_str("__rue_frag_nodes_ref"))
            .unwrap_or(JsValue::UNDEFINED);
        if arr_val.is_undefined() || arr_val.is_null() || !Array::is_array(&arr_val) {
            return;
        }

        let arr = Array::from(&arr_val);
        arr.set_length(0);
        for node in mounted_nodes.iter() {
            let node_js: JsValue = node.clone().into();
            arr.push(&node_js);
        }
    }

    /// 在单个锚点前执行一次性静态 MountInput 挂载，并在成功后移除锚点。
    ///
    /// 默认公开路径直接消费 MountInput；静态挂载只在局部边界记录 mounted state，
    /// 不再经过额外树对象协议。
    pub fn render_static_input(
        &mut self,
        input: MountInput<A>,
        parent: &mut A::Element,
        anchor: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        self.render_static_impl(&input, parent, anchor);
    }

    fn render_static_impl(
        &mut self,
        input: &MountInput<A>,
        parent: &mut A::Element,
        anchor: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if self.crashed || crate::runtime::is_runtime_crashed() {
            if let Some(e) = crate::runtime::last_hook_error() {
                wasm_bindgen::throw_val(e);
            } else if let Some(e) = self.last_error.clone() {
                wasm_bindgen::throw_val(e);
            } else {
                throw_str("Rue runtime crashed");
            }
        }

        if self.get_dom_adapter().is_none() {
            throw_str("Rue runtime: no DOM adapter for renderStatic");
        }

        batch_scope(|| {
            self.call_hooks("before_mount");

            let mut dest_parent = self.resolve_dest_parent_for_end(parent, &anchor);
            let mut mounted_nodes: Vec<A::Element> = Vec::new();
            let mounted = if let Some(mounted) = self.mount_from_input(input) {
                let Some(el) = mounted.host_cloned() else {
                    return;
                };
                if let Some(adapter) = self.get_dom_adapter() {
                    if adapter.is_fragment(&el) {
                        mounted_nodes = mounted.fragment_nodes_cloned();
                        self.insert_fragment_children_preferring_end(
                            &mut dest_parent,
                            &el,
                            &Some(anchor.clone()),
                        );
                    } else {
                        mounted_nodes.push(el.clone());
                        self.insert_new_dom_before_end(&mut dest_parent, &el, &anchor);
                    }
                } else {
                    mounted_nodes.push(el.clone());
                    self.insert_new_dom_before_end(&mut dest_parent, &el, &anchor);
                }
                true
            } else {
                let err_to_handle = if let Some(e) = self.last_error.clone() {
                    e
                } else {
                    js_sys::Error::new("Rue vapor: renderStatic failed (create_real_dom=None)")
                        .into()
                };
                self.handle_error(err_to_handle);
                false
            };

            if let Some(adapter) = self.get_dom_adapter_mut() {
                if adapter.contains(&dest_parent, &anchor) {
                    let mut p2 = dest_parent.clone();
                    adapter.remove_child(&mut p2, &anchor);
                }
            }

            self.sync_static_mount_frag_nodes(parent, &mounted_nodes);

            if mounted {
                self.call_hooks("mounted");
            }
        });
    }
}