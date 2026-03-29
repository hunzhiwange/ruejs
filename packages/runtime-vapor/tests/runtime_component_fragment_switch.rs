//! 组件片段根在区间渲染中的切换行为测试
//!
//! 使用 JS 侧模拟 DomAdapter，验证在 renderBetween 场景下：
//! - 组件根为 fragment 时，片段子节点被正确插入到锚点之间
//! - 从组件 A 切换到组件 B 后，只保留最新一份 span 文本节点。
use js_sys::{Array, Function, Object, Promise, Reflect};
use rue_runtime_vapor::createRue;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use wasm_bindgen_test::*;
mod common;

/// 利用已解决的 Promise 让事件循环推进一轮
async fn tick() {
    let p = Promise::resolve(&JsValue::UNDEFINED);
    let _ = JsFuture::from(p).await;
}

/// 根据 children 数组补全 previousSibling / nextSibling / parentNode 等链接
fn update_siblings(parent: &JsValue) {
    let children =
        Reflect::get(parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr: Array = children.unchecked_into();
    for i in 0..arr.length() {
        let cur = arr.get(i);
        let prev = if i > 0 { arr.get(i - 1) } else { JsValue::NULL };
        let next = if i + 1 < arr.length() { arr.get(i + 1) } else { JsValue::NULL };
        let _ = Reflect::set(&cur, &JsValue::from_str("previousSibling"), &prev);
        let _ = Reflect::set(&cur, &JsValue::from_str("nextSibling"), &next);
        let _ = Reflect::set(&cur, &JsValue::from_str("parentNode"), parent);
    }
}

/// 构造一个 JS 侧 DomAdapter：fragment 在 append/insert 时会“吃掉”自己，只留下子节点
fn make_adapter_fragment_consumes_children() -> JsValue {
    let obj = Object::new();
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createElement"),
        &Function::new_with_args("tag", "return { tag, children: [] }").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createTextNode"),
        &Function::new_with_args("text", "return { tag: '#text', text, children: [] }").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createDocumentFragment"),
        &Function::new_no_args("return { tag: 'fragment', children: [] }").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("isFragment"),
        &Function::new_with_args("el", "return !!el && el.tag === 'fragment'").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("collectFragmentChildren"),
        &Function::new_with_args("el", "return Array.from(el && el.children || [])").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setTextContent"),
        &Function::new_with_args("el,text", "el.text = text").into(),
    );
    let append_impl = Function::new_with_args(
        "p,c",
        "p.children = p.children||[]; \
         if (c && c.tag === 'fragment') { \
           const list = Array.from(c.children||[]); \
           list.forEach(ch => p.children.push(ch)); \
           c.children = []; \
         } else { \
           p.children.push(c); \
         } \
         return;",
    );
    let _ = Reflect::set(&obj, &JsValue::from_str("appendChild"), &append_impl.into());
    let insert_impl = Function::new_with_args(
        "p,c,b",
        "p.children = p.children||[]; \
         const idx = (p.children||[]).indexOf(b); \
         const at = idx >= 0 ? idx : p.children.length; \
         if (c && c.tag === 'fragment') { \
           const list = Array.from(c.children||[]); \
           p.children.splice(at, 0, ...list); \
           c.children = []; \
         } else { \
           p.children.splice(at, 0, c); \
         } \
         return;",
    );
    let _ = Reflect::set(&obj, &JsValue::from_str("insertBefore"), &insert_impl.into());
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("removeChild"),
        &Function::new_with_args("p,c", "p.children = (p.children||[]).filter(x=>x!==c)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("contains"),
        &Function::new_with_args("p,c", "return p===c || (p.children||[]).includes(c)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setClassName"),
        &Function::new_with_args("el,v", "el.class = v").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("patchStyle"),
        &Function::new_with_args("el,old,newv", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setInnerHTML"),
        &Function::new_with_args("el,html", "el.children=[]; el.text=html").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setValue"),
        &Function::new_with_args("el,v", "el.value = v").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setChecked"),
        &Function::new_with_args("el,b", "el.checked = !!b").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setDisabled"),
        &Function::new_with_args("el,b", "el.disabled = !!b").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("clearRef"),
        &Function::new_with_args("r", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("applyRef"),
        &Function::new_with_args("el,r", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setAttribute"),
        &Function::new_with_args("el,k,v", "el.attrs = el.attrs||{}; el.attrs[k]=v").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("removeAttribute"),
        &Function::new_with_args("el,k", "if(el.attrs) delete el.attrs[k]").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("getTagName"),
        &Function::new_with_args("el", "return el.tag||''").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("addEventListener"),
        &Function::new_with_args("el,evt,h", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("removeEventListener"),
        &Function::new_with_args("el,evt,h", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("hasValueProperty"),
        &Function::new_with_args("el", "return 'value' in el").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("isSelectMultiple"),
        &Function::new_with_args("el", "return el.tag==='SELECT' && !!el.multiple").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("querySelector"),
        &Function::new_with_args("sel", "return { tag: sel, children: [] }").into(),
    );
    obj.into()
}

/// 当组件根为 fragment 且在 renderBetween 范围内切换组件时：
/// - 旧片段子节点被清理
/// - 只保留新组件产生的 span 文本内容
#[wasm_bindgen_test(async)]
async fn render_between_component_switch_fragment_root_in_range() {
    let adapter = make_adapter_fragment_consumes_children();
    let rue = createRue(adapter.clone());
    let parent = {
        let f = Reflect::get(&adapter, &JsValue::from_str("createDocumentFragment")).unwrap();
        let func = f.unchecked_ref::<Function>();
        func.call0(&adapter).unwrap()
    };
    let start = {
        let f = Reflect::get(&adapter, &JsValue::from_str("createElement")).unwrap();
        let func = f.unchecked_ref::<Function>();
        func.call1(&adapter, &JsValue::from_str("comment_start")).unwrap()
    };
    let end = {
        let f = Reflect::get(&adapter, &JsValue::from_str("createElement")).unwrap();
        let func = f.unchecked_ref::<Function>();
        func.call1(&adapter, &JsValue::from_str("comment_end")).unwrap()
    };
    {
        let append = Reflect::get(&adapter, &JsValue::from_str("appendChild")).unwrap();
        let func = append.unchecked_ref::<Function>();
        let _ = func.call2(&adapter, &parent, &start);
        let _ = func.call2(&adapter, &parent, &end);
        update_siblings(&parent);
    }

    let comp_a = Function::new_no_args(
        "return { type: 'fragment', props: {}, children: [ { type: 'span', props: {}, children: ['A'] } ] }",
    );
    let comp_b = Function::new_no_args(
        "return { type: 'fragment', props: {}, children: [ { type: 'span', props: {}, children: ['B'] } ] }",
    );

    let id_a = rue.create_element_wasm(comp_a.into(), JsValue::UNDEFINED, JsValue::UNDEFINED);
    rue.render_between_wasm(id_a, parent.clone(), start.clone(), end.clone());
    tick().await;
    update_siblings(&parent);

    let id_b = rue.create_element_wasm(comp_b.into(), JsValue::UNDEFINED, JsValue::UNDEFINED);
    rue.render_between_wasm(id_b, parent.clone(), start.clone(), end.clone());
    tick().await;
    update_siblings(&parent);

    let children = Reflect::get(&parent, &JsValue::from_str("children")).unwrap();
    let arr: Array = children.unchecked_into();
    let mut span_count = 0u32;
    let mut last_text = String::new();
    for item in arr.iter() {
        let tag = Reflect::get(&item, &JsValue::from_str("tag"))
            .unwrap_or(JsValue::UNDEFINED)
            .as_string()
            .unwrap_or_default();
        if tag == "span" {
            span_count += 1;
            let span_children =
                Reflect::get(&item, &JsValue::from_str("children")).unwrap_or(Array::new().into());
            let span_children: Array = span_children.unchecked_into();
            let text_node = span_children.get(0);
            last_text = Reflect::get(&text_node, &JsValue::from_str("text"))
                .unwrap_or(JsValue::UNDEFINED)
                .as_string()
                .unwrap_or_default();
        }
    }
    assert_eq!(span_count, 1);
    assert_eq!(last_text, "B");
}
