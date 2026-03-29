//! 组件在区间渲染（renderBetween）中的重挂载与替换行为测试
//!
//! 验证不同类型（元素/组件/Vapor 片段）在同一范围内的替换逻辑，
//! 包括：强制重挂载覆盖、旧片段子节点清理、文本与元素切换正确。
use js_sys::{Array, Function, Object, Promise, Reflect};
use rue_runtime_vapor::createRue;
use rue_runtime_vapor::{Child, DomAdapter, Rue, VNodeType};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use wasm_bindgen_test::*;
mod common;
use common::TestAdapter;

/// 推进事件循环一轮
async fn tick() {
    let p = Promise::resolve(&JsValue::UNDEFINED);
    let _ = JsFuture::from(p).await;
}

/// 补全 children 的兄弟与父链接，便于断言
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

/// 构造 DomAdapter：节点之间维护 children 链接，便于范围插入/替换验证
fn make_linked_adapter() -> JsValue {
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

/// 渲染元素后，再渲染组件产生的新元素，验证范围内替换为新内容
#[wasm_bindgen_test(async)]
async fn render_between_component_force_remount_replaces_range() {
    let adapter = make_linked_adapter();
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
    let children_a = Array::new();
    children_a.push(&JsValue::from_str("A"));
    let id1 =
        rue.create_element_wasm(JsValue::from_str("span"), JsValue::UNDEFINED, children_a.into());
    rue.render_between_wasm(id1, parent.clone(), start.clone(), end.clone());
    tick().await;
    update_siblings(&parent);
    let comp_func = Function::new_no_args("return { type: 'span', props: {}, children: ['B'] }");
    let id2 = rue.create_element_wasm(comp_func.into(), JsValue::UNDEFINED, JsValue::UNDEFINED);
    rue.render_between_wasm(id2, parent.clone(), start.clone(), end.clone());
    tick().await;
    update_siblings(&parent);

    let arr = Reflect::get(&parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr: Array = arr.unchecked_into();
    let span = arr
        .iter()
        .find(|c| {
            Reflect::get(c, &JsValue::from_str("tag")).unwrap().as_string().unwrap() == "span"
        })
        .unwrap();
    let span_children =
        Reflect::get(&span, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let span_children: Array = span_children.unchecked_into();
    let text_node = span_children.get(0);
    let text = Reflect::get(&text_node, &JsValue::from_str("text"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(text, "B");
}

/// Vapor 片段在同一范围内重挂载时：
/// - 旧文本清理
/// - 只保留新片段文本
#[wasm_bindgen_test(async)]
async fn render_between_vapor_fragment_remount_clears_old_and_inserts_new() {
    let adapter = make_linked_adapter();
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
    let setup_a = Function::new_no_args(
        "const frag = { tag: 'fragment', children: [{ tag: '#text', text: 'A', children: [] }] }; return { vaporElement: frag }",
    );
    let id1 = rue.vapor_wasm(setup_a.into());
    rue.render_between_wasm(id1, parent.clone(), start.clone(), end.clone());
    tick().await;
    update_siblings(&parent);

    let setup_b = Function::new_no_args(
        "const frag = { tag: 'fragment', children: [{ tag: '#text', text: 'B', children: [] }] }; return { vaporElement: frag }",
    );
    let id2 = rue.vapor_wasm(setup_b.into());
    rue.render_between_wasm(id2, parent.clone(), start.clone(), end.clone());
    tick().await;
    update_siblings(&parent);

    let arr = Reflect::get(&parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr: Array = arr.unchecked_into();
    let texts: Vec<JsValue> = arr
        .iter()
        .filter(|c| {
            Reflect::get(c, &JsValue::from_str("tag")).unwrap().as_string().unwrap() == "#text"
        })
        .collect();
    assert_eq!(texts.len(), 1);
    let text = Reflect::get(&texts[0], &JsValue::from_str("text"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(text, "B");
}

/// 元素类型改为文本类型时，旧元素被替换为文本节点
#[wasm_bindgen_test]
fn patch_replacement_type_change_element_to_text() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let vnode1 = rue.create_element(
        VNodeType::Element("div".into()),
        None,
        vec![Child::<TestAdapter>::Text("x".into())],
    );
    rue.render(vnode1, &mut container);
    let vnode2 =
        rue.create_element(VNodeType::Text, None, vec![Child::<TestAdapter>::Text("y".into())]);
    rue.render(vnode2, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].tag, "#text");
    assert_eq!(children[0].text, "y");
}
