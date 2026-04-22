/*
JsDomAdapter（浏览器/JS 环境适配）
-----------------------------------
该适配器将 DomAdapter 的抽象方法映射到 JS 对象上的同名函数：
- 通过 js_sys::Reflect 在运行时抓取 JS 方法；
- 调用并转换返回值到 JsValue；
- 对必须存在的方法进行审计（new 时检查），确保运行时所有原语可用；
- 在宿主返回 undefined/null 时抛错，帮助尽早定位实现缺失或返回异常。

核心约定：
- inner: 传入的适配器 JS 对象，必须包含一组完整的方法（详见 req 列表）。
- 错误策略：throw_str 会使 wasm 测试直接失败；这是刻意的“及早失败”设计。
- 类型转换：元素类型即为 JsValue；片段 children 用 Array 转 Vec<JsValue>。

最小工作示例（构造 JS 适配器对象）：
const adapter = {
  createElement: (tag) => ({ tag, children: [] }),
  createTextNode: (text) => ({ tag: '#text', text }),
  createDocumentFragment: () => ({ tag: 'fragment', children: [] }),
  isFragment: (el) => !!el && el.tag === 'fragment',
  collectFragmentChildren: (el) => Array.from((el && el.children) || []),
  setTextContent: (el, text) => { el.text = text },
  appendChild: (p, c) => { (p.children ||= []).push(c) },
  insertBefore: (p, c, b) => { (p.children ||= []).push(c) },
  removeChild: (p, c) => { p.children = (p.children || []).filter(x => x !== c) },
  contains: (p, c) => p === c || ((p.children || []).includes(c)),
  setClassName: (el, v) => { el.class = v },
  patchStyle: (el, old, next) => { Object.keys(next).forEach(k => (el.style ||= {}, el.style[k] = next[k])) },
  setInnerHTML: (el, html) => { el.children = []; el.text = html },
  setValue: (el, v) => { el.value = v },
  setChecked: (el, b) => { el.checked = !!b },
  setDisabled: (el, b) => { el.disabled = !!b },
  clearRef: (_r) => {},
  applyRef: (_el, _r) => {},
  setAttribute: (el, k, v) => { (el.attrs ||= {})[k] = v },
  removeAttribute: (el, k) => { if (el.attrs) delete el.attrs[k] },
  getTagName: (el) => el.tag || '',
  addEventListener: (_el, _evt, _h) => {},
  removeEventListener: (_el, _evt, _h) => {},
  hasValueProperty: (el) => ('value' in el),
  isSelectMultiple: (el) => el.tag === 'SELECT' && !!el.multiple,
  querySelector: (sel) => ({ tag: sel, children: [] }),
};
// 传入 wasm：createRue(adapter)
*/
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Array, Function, Object, Reflect};
use std::collections::HashMap;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::throw_str;

#[derive(Clone)]
pub struct JsDomAdapter {
    inner: JsValue,
}

impl JsDomAdapter {
    pub fn new(inner: JsValue) -> Self {
        let adapter = JsDomAdapter { inner };
        {
            let mut missing: Vec<&str> = Vec::new();
            let req = [
                "createElement",
                "createTextNode",
                "createDocumentFragment",
                "isFragment",
                "collectFragmentChildren",
                "setTextContent",
                "appendChild",
                "insertBefore",
                "removeChild",
                "contains",
                "setClassName",
                "patchStyle",
                "setInnerHTML",
                "setValue",
                "setChecked",
                "setDisabled",
                "clearRef",
                "applyRef",
                "setAttribute",
                "removeAttribute",
                "getTagName",
                "addEventListener",
                "removeEventListener",
                "hasValueProperty",
                "isSelectMultiple",
                "querySelector",
            ];
            // 审计：确保每个必需方法已在 JS 适配器对象上定义
            for key in req.iter() {
                let f = Reflect::get(&adapter.inner, &JsValue::from_str(key))
                    .unwrap_or(JsValue::UNDEFINED);
                if !f.is_function() {
                    missing.push(*key);
                }
            }
            if !missing.is_empty() {
                throw_str(&format!(
                    "Rue runtime: dom-adapter missing methods: {}",
                    missing.join(",")
                ));
            } else {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:dom-adapter audit ok") {
                        log("debug", "dom-adapter audit ok");
                    }
                }
            }
        }
        adapter
    }
}

impl DomAdapter for JsDomAdapter {
    type Element = JsValue;

    fn create_element(&mut self, tag: &str) -> Self::Element {
        // 通过 JS 适配器对象的 createElement 构造元素；返回值需非空
        let f = Reflect::get(&self.inner, &JsValue::from_str("createElement"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let ret =
                func.call1(&self.inner, &JsValue::from_str(tag)).unwrap_or(JsValue::UNDEFINED);
            if ret.is_undefined() || ret.is_null() {
                throw_str("Rue runtime: createElement returned undefined/null");
            }
            ret
        } else {
            throw_str("Rue runtime: dom-adapter.createElement not found");
            // diverges
        }
    }
    fn create_text_node(&mut self, text: &str) -> Self::Element {
        // 文本节点创建
        let f = Reflect::get(&self.inner, &JsValue::from_str("createTextNode"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let ret =
                func.call1(&self.inner, &JsValue::from_str(text)).unwrap_or(JsValue::UNDEFINED);
            if ret.is_undefined() || ret.is_null() {
                throw_str("Rue runtime: createTextNode returned undefined/null");
            }
            ret
        } else {
            throw_str("Rue runtime: dom-adapter.createTextNode not found");
            // diverges
        }
    }
    fn create_document_fragment(&mut self) -> Self::Element {
        // 片段创建（常用于批量插入）
        let f = Reflect::get(&self.inner, &JsValue::from_str("createDocumentFragment"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let ret = func.call0(&self.inner).unwrap_or(JsValue::UNDEFINED);
            if ret.is_undefined() || ret.is_null() {
                throw_str("Rue runtime: createDocumentFragment returned undefined/null");
            }
            ret
        } else {
            throw_str("Rue runtime: dom-adapter.createDocumentFragment not found");
            // diverges
        }
    }

    fn is_fragment(&self, el: &Self::Element) -> bool {
        // 判断元素是否为片段
        let f = Reflect::get(&self.inner, &JsValue::from_str("isFragment"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            func.call1(&self.inner, el).unwrap_or(JsValue::FALSE).as_bool().unwrap_or(false)
        } else {
            throw_str("Rue runtime: dom-adapter.isFragment not found");
            // diverges
        }
    }
    fn collect_fragment_children(&self, el: &Self::Element) -> Vec<Self::Element> {
        // 收集片段内部子节点为 Vec<JsValue>
        let f = Reflect::get(&self.inner, &JsValue::from_str("collectFragmentChildren"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let arr = func.call1(&self.inner, el).unwrap_or(Array::new().into());
            let arr: Array = arr.unchecked_into();
            let mut out = Vec::new();
            for i in 0..arr.length() {
                out.push(arr.get(i));
            }
            out
        } else {
            throw_str("Rue runtime: dom-adapter.collectFragmentChildren not found");
            // diverges
        }
    }

    fn set_text_content(&mut self, el: &mut Self::Element, text: &str) {
        // 设置文本内容
        let f = Reflect::get(&self.inner, &JsValue::from_str("setTextContent"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, el, &JsValue::from_str(text));
        } else {
            throw_str("Rue runtime: dom-adapter.setTextContent not found");
            // diverges
        }
    }
    fn append_child(&mut self, parent: &mut Self::Element, child: &Self::Element) {
        // 追加子节点
        let f = Reflect::get(&self.inner, &JsValue::from_str("appendChild"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, parent, child);
        } else {
            throw_str("Rue runtime: dom-adapter.appendChild not found");
            // diverges
        }
    }
    fn insert_before(
        &mut self,
        parent: &mut Self::Element,
        child: &Self::Element,
        before: &Self::Element,
    ) {
        let f = Reflect::get(&self.inner, &JsValue::from_str("insertBefore"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call3(&self.inner, parent, child, before);
        } else {
            throw_str("Rue runtime: dom-adapter.insertBefore not found");
            // diverges
        }
    }
    fn remove_child(&mut self, parent: &mut Self::Element, child: &Self::Element) {
        let f = Reflect::get(&self.inner, &JsValue::from_str("removeChild"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, parent, child);
        } else {
            throw_str("Rue runtime: dom-adapter.removeChild not found");
            // diverges
        }
    }
    fn contains(&self, parent: &Self::Element, child: &Self::Element) -> bool {
        let f =
            Reflect::get(&self.inner, &JsValue::from_str("contains")).unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            func.call2(&self.inner, parent, child)
                .unwrap_or(JsValue::FALSE)
                .as_bool()
                .unwrap_or(false)
        } else {
            throw_str("Rue runtime: dom-adapter.contains not found");
            // diverges
        }
    }
    // 读取父节点：优先使用适配器方法，缺省读取 parentNode
    // - 返回 Some(el) 表示存在父节点；
    // - 返回 None 表示不存在或为根；
    // - 兼容宿主未实现 getParentNode 的情况。
    fn get_parent_node(&self, node: &Self::Element) -> Option<Self::Element> {
        let f = Reflect::get(&self.inner, &JsValue::from_str("getParentNode"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let ret = func.call1(&self.inner, node).unwrap_or(JsValue::UNDEFINED);
            if ret.is_undefined() || ret.is_null() { None } else { Some(ret) }
        } else {
            let ret =
                Reflect::get(node, &JsValue::from_str("parentNode")).unwrap_or(JsValue::UNDEFINED);
            if ret.is_undefined() || ret.is_null() { None } else { Some(ret) }
        }
    }

    fn set_class_name(&mut self, el: &mut Self::Element, value: &str) {
        let f = Reflect::get(&self.inner, &JsValue::from_str("setClassName"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, el, &JsValue::from_str(value));
        } else {
            throw_str("Rue runtime: dom-adapter.setClassName not found");
            // diverges
        }
    }
    fn patch_style(
        &mut self,
        el: &mut Self::Element,
        old_style: &HashMap<String, String>,
        new_style: &HashMap<String, String>,
    ) {
        let js_old = map_to_js_obj(old_style);
        let js_new = map_to_js_obj(new_style);
        let f = Reflect::get(&self.inner, &JsValue::from_str("patchStyle"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call3(&self.inner, el, &js_old, &js_new);
        } else {
            throw_str("Rue runtime: dom-adapter.patchStyle not found");
            // diverges
        }
    }
    fn set_inner_html(&mut self, el: &mut Self::Element, html: &str) {
        let f = Reflect::get(&self.inner, &JsValue::from_str("setInnerHTML"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, el, &JsValue::from_str(html));
        } else {
            throw_str("Rue runtime: dom-adapter.setInnerHTML not found");
            // diverges
        }
    }

    fn set_value(&mut self, el: &mut Self::Element, value: JsValue) {
        let f =
            Reflect::get(&self.inner, &JsValue::from_str("setValue")).unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, el, &value);
        } else {
            throw_str("Rue runtime: dom-adapter.setValue not found");
            // diverges
        }
    }
    fn set_checked(&mut self, el: &mut Self::Element, checked: bool) {
        let f = Reflect::get(&self.inner, &JsValue::from_str("setChecked"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, el, &JsValue::from_bool(checked));
        } else {
            throw_str("Rue runtime: dom-adapter.setChecked not found");
            // diverges
        }
    }
    fn set_disabled(&mut self, el: &mut Self::Element, disabled: bool) {
        let f = Reflect::get(&self.inner, &JsValue::from_str("setDisabled"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, el, &JsValue::from_bool(disabled));
        } else {
            throw_str("Rue runtime: dom-adapter.setDisabled not found");
            // diverges
        }
    }

    fn clear_ref(&mut self, ref_handle: JsValue) {
        let f =
            Reflect::get(&self.inner, &JsValue::from_str("clearRef")).unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call1(&self.inner, &ref_handle);
        } else {
            throw_str("Rue runtime: dom-adapter.clearRef not found");
            // diverges
        }
    }
    fn apply_ref(&mut self, el: &mut Self::Element, ref_handle: JsValue) {
        let f =
            Reflect::get(&self.inner, &JsValue::from_str("applyRef")).unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, el, &ref_handle);
        } else {
            throw_str("Rue runtime: dom-adapter.applyRef not found");
            // diverges
        }
    }

    fn set_attribute(&mut self, el: &mut Self::Element, key: &str, value: &str) {
        let f = Reflect::get(&self.inner, &JsValue::from_str("setAttribute"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call3(&self.inner, el, &JsValue::from_str(key), &JsValue::from_str(value));
        } else {
            throw_str("Rue runtime: dom-adapter.setAttribute not found");
            // diverges
        }
    }
    fn remove_attribute(&mut self, el: &mut Self::Element, key: &str) {
        // 移除属性
        let f = Reflect::get(&self.inner, &JsValue::from_str("removeAttribute"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call2(&self.inner, el, &JsValue::from_str(key));
        } else {
            throw_str("Rue runtime: dom-adapter.removeAttribute not found");
        }
    }
    fn get_tag_name(&self, el: &Self::Element) -> String {
        // 读取标签名
        let f = Reflect::get(&self.inner, &JsValue::from_str("getTagName"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            func.call1(&self.inner, el)
                .unwrap_or(JsValue::from_str(""))
                .as_string()
                .unwrap_or_default()
        } else {
            throw_str("Rue runtime: dom-adapter.getTagName not found");
        }
    }
    // 替换子节点：优先使用宿主 replaceChild
    // - 若 replaceChild 缺失，则退化为 insert_before + remove_child；
    // - 保持调用幂等与容错，便于统一替换路径。
    fn replace_child(
        &mut self,
        parent: &mut Self::Element,
        new_child: &Self::Element,
        old_child: &Self::Element,
    ) {
        let f = Reflect::get(&self.inner, &JsValue::from_str("replaceChild"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call3(&self.inner, parent, new_child, old_child);
        } else {
            self.insert_before(parent, new_child, old_child);
            self.remove_child(parent, old_child);
        }
    }

    fn add_event_listener(&mut self, el: &mut Self::Element, event: &str, handler: JsValue) {
        // 绑定事件监听
        let f = Reflect::get(&self.inner, &JsValue::from_str("addEventListener"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call3(&self.inner, el, &JsValue::from_str(event), &handler);
        } else {
            throw_str("Rue runtime: dom-adapter.addEventListener not found");
        }
    }
    fn remove_event_listener(&mut self, el: &mut Self::Element, event: &str, handler: JsValue) {
        // 移除事件监听
        let f = Reflect::get(&self.inner, &JsValue::from_str("removeEventListener"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let _ = func.call3(&self.inner, el, &JsValue::from_str(event), &handler);
        } else {
            throw_str("Rue runtime: dom-adapter.removeEventListener not found");
        }
    }

    fn has_value_property(&self, el: &Self::Element) -> bool {
        !Reflect::get(el, &JsValue::from_str("value")).unwrap_or(JsValue::UNDEFINED).is_undefined()
    }
    fn is_select_multiple(&self, el: &Self::Element) -> bool {
        let tag = self.get_tag_name(el);
        if tag.to_uppercase() != "SELECT" {
            return false;
        }
        Reflect::get(el, &JsValue::from_str("multiple"))
            .unwrap_or(JsValue::FALSE)
            .as_bool()
            .unwrap_or(false)
    }

    fn query_selector(&self, selector: &str) -> Option<Self::Element> {
        // 选择器：返回匹配到的元素（或 None）
        let f = Reflect::get(&self.inner, &JsValue::from_str("querySelector"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = f.dyn_ref::<Function>() {
            let ret =
                func.call1(&self.inner, &JsValue::from_str(selector)).unwrap_or(JsValue::UNDEFINED);
            if ret.is_undefined() || ret.is_null() { None } else { Some(ret) }
        } else {
            throw_str("Rue runtime: dom-adapter.querySelector not found");
        }
    }
}

fn map_to_js_obj(map: &HashMap<String, String>) -> JsValue {
    // 辅助：Rust HashMap<String,String> → JS 对象
    let obj = Object::new();
    for (k, v) in map.iter() {
        let _ = Reflect::set(&obj, &JsValue::from_str(k), &JsValue::from_str(v));
    }
    obj.into()
}
