//! 属性补丁与事件处理相关测试
//!
//! 覆盖 className、dangerouslySetInnerHTML、事件监听、value/checked/disabled 等属性的
//! 设置与删除逻辑，并验证选择器与输入元素的特殊行为。
use crate::common::TestAdapter;
use js_sys::{Array, Function, Object, Reflect};
use rue_runtime_vapor::{
    Child, ComponentProps, DomAdapter, JsDomAdapter, Rue, VNodeType, patch_props,
    post_patch_element,
};
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

mod common;

/// 快速构造 ComponentProps
fn props_with(entries: &[(&str, JsValue)]) -> ComponentProps {
    let mut p = ComponentProps::new();
    for (k, v) in entries {
        p.insert((*k).to_string(), v.clone());
    }
    p
}

/// 设置普通属性后再移除，事件记录包含 RemoveAttr
#[wasm_bindgen_test]
fn generic_attribute_set_and_remove() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();
    let p1 = props_with(&[("data-id", JsValue::from_str("a"))]);
    let v1 = rue.create_element(VNodeType::Element("div".into()), Some(p1), vec![]);
    rue.render(v1, &mut container);
    let p2 = ComponentProps::new();
    let v2 = rue.create_element(VNodeType::Element("div".into()), Some(p2), vec![]);
    rue.render(v2, &mut container);
    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(
        events
            .iter()
            .any(|e| matches!(e, crate::common::TestEvent::RemoveAttr(key) if key == "data-id"))
    );
}

/// className 更新后，最终类名为新值
#[wasm_bindgen_test]
fn set_class_name_updates_value() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let p1 = props_with(&[("className", JsValue::from_str("a"))]);
    let v1 = rue.create_element(VNodeType::Element("div".into()), Some(p1), vec![]);
    rue.render(v1, &mut container);
    let p2 = props_with(&[("className", JsValue::from_str("b"))]);
    let v2 = rue.create_element(VNodeType::Element("div".into()), Some(p2), vec![]);
    rue.render(v2, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].class, "b");
}

/// 构造 dangerouslySetInnerHTML 所需的 { __html } 对象
fn inner_html(html: &str) -> JsValue {
    let o = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&o, &JsValue::from_str("__html"), &JsValue::from_str(html));
    o.into()
}

/// innerHTML 更新与切换 children 的行为（文本覆盖与清空 children）
#[wasm_bindgen_test]
fn dangerously_set_inner_html_update_and_toggle_children() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let p1 = props_with(&[("dangerouslySetInnerHTML", inner_html("<b>x</b>"))]);
    let v1 = rue.create_element(VNodeType::Element("div".into()), Some(p1), vec![]);
    rue.render(v1, &mut container);
    let p2 = props_with(&[("dangerouslySetInnerHTML", inner_html("<i>y</i>"))]);
    let v2 = rue.create_element(VNodeType::Element("div".into()), Some(p2), vec![]);
    rue.render(v2, &mut container);
    let children1 = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children1.len(), 1);
    assert_eq!(children1[0].text, "<i>y</i>");
    assert_eq!(children1[0].children.len(), 0);
    let v3 = rue.create_element(
        VNodeType::Element("div".into()),
        Some(ComponentProps::new()),
        vec![Child::<TestAdapter>::Text("z".into())],
    );
    rue.render(v3, &mut container);
    let children2 = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children2.len(), 1);
    assert_eq!(children2[0].text, "");
    assert_eq!(children2[0].children.len(), 1);
    assert_eq!(children2[0].children[0].text, "z");
}

/// 更新事件监听：移除旧监听，然后添加新监听（顺序正确）
#[wasm_bindgen_test]
fn event_listener_is_removed_then_added_on_update() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let p1 = props_with(&[("onClick", JsValue::from_str("h1"))]);
    let v1 = rue.create_element(VNodeType::Element("div".into()), Some(p1), vec![]);
    rue.render(v1, &mut container);

    let p2 = props_with(&[("onClick", JsValue::from_str("h2"))]);
    let v2 = rue.create_element(VNodeType::Element("div".into()), Some(p2), vec![]);
    rue.render(v2, &mut container);

    let events = &rue.get_dom_adapter().unwrap().events;
    let mut rm_idx: Option<usize> = None;
    let mut add_idx: Option<usize> = None;
    for (i, e) in events.iter().enumerate() {
        if rm_idx.is_none() && matches!(e, crate::common::TestEvent::RmEvt(name) if name == "click")
        {
            rm_idx = Some(i);
        }
        if matches!(e, crate::common::TestEvent::AddEvt(name) if name == "click") {
            add_idx = Some(i);
        }
    }
    assert!(rm_idx.is_some());
    assert!(add_idx.is_some());
    assert!(rm_idx.unwrap() < add_idx.unwrap());
}

/// 在 SELECT multiple 元素上删除 value 时，会重置为数组值
#[wasm_bindgen_test]
fn delete_value_on_select_multiple_sets_array_value() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let p1 = props_with(&[("value", JsValue::from_str("x"))]);
    let v1 = rue.create_element(VNodeType::Element("SELECT".into()), Some(p1), vec![]);
    rue.render(v1, &mut container);

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    let select_id = children[0].id;
    rue.get_dom_adapter_mut().unwrap().nodes.get_mut(&select_id).unwrap().multiple = true;

    let v2 = rue.create_element(
        VNodeType::Element("SELECT".into()),
        Some(ComponentProps::new()),
        vec![],
    );
    rue.render(v2, &mut container);

    let events = &rue.get_dom_adapter().unwrap().events;
    assert!(
        events
            .iter()
            .any(|e| matches!(e, crate::common::TestEvent::SetValue(v) if Array::is_array(v)))
    );
}

/// 在单选 SELECT 上删除 value 时，重置为空字符串
#[wasm_bindgen_test]
fn delete_value_on_select_single_sets_empty_string() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let p1 = props_with(&[("value", JsValue::from_str("x"))]);
    let v1 = rue.create_element(VNodeType::Element("SELECT".into()), Some(p1), vec![]);
    rue.render(v1, &mut container);

    let v2 = rue.create_element(
        VNodeType::Element("SELECT".into()),
        Some(ComponentProps::new()),
        vec![],
    );
    rue.render(v2, &mut container);

    let events = &rue.get_dom_adapter().unwrap().events;
    assert!(events.iter().any(|e| matches!(e, crate::common::TestEvent::SetValue(v) if v.as_string().as_deref() == Some(""))));
}

/// 在拥有 value 属性的元素上删除 value：重置为空并移除属性
#[wasm_bindgen_test]
fn delete_value_on_value_element_removes_attribute_and_resets_value() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let p1 = props_with(&[("value", JsValue::from_str("x"))]);
    let v1 = rue.create_element(VNodeType::Element("input".into()), Some(p1), vec![]);
    rue.render(v1, &mut container);

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    let input_id = children[0].id;
    rue.get_dom_adapter_mut().unwrap().nodes.get_mut(&input_id).unwrap().has_value = true;

    let v2 =
        rue.create_element(VNodeType::Element("input".into()), Some(ComponentProps::new()), vec![]);
    rue.render(v2, &mut container);

    let events = &rue.get_dom_adapter().unwrap().events;
    assert!(events.iter().any(|e| matches!(e, crate::common::TestEvent::SetValue(v) if v.as_string().as_deref() == Some(""))));
    assert!(
        events.iter().any(|e| matches!(e, crate::common::TestEvent::RemoveAttr(k) if k == "value"))
    );
}

/// 删除 checked/disabled：重置状态并移除属性
#[wasm_bindgen_test]
fn delete_checked_and_disabled_resets_and_removes_attributes() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let p1 = props_with(&[
        ("checked", JsValue::from_bool(true)),
        ("disabled", JsValue::from_bool(true)),
    ]);
    let v1 = rue.create_element(VNodeType::Element("input".into()), Some(p1), vec![]);
    rue.render(v1, &mut container);

    let v2 =
        rue.create_element(VNodeType::Element("input".into()), Some(ComponentProps::new()), vec![]);
    rue.render(v2, &mut container);

    let events = &rue.get_dom_adapter().unwrap().events;
    assert!(events.iter().any(|e| matches!(e, crate::common::TestEvent::SetChecked(false))));
    assert!(
        events
            .iter()
            .any(|e| matches!(e, crate::common::TestEvent::RemoveAttr(k) if k == "checked"))
    );
    assert!(events.iter().any(|e| matches!(e, crate::common::TestEvent::SetDisabled(false))));
    assert!(
        events
            .iter()
            .any(|e| matches!(e, crate::common::TestEvent::RemoveAttr(k) if k == "disabled"))
    );
}

/// ref 应用后在更新中被清理
#[wasm_bindgen_test]
fn ref_is_applied_and_cleared() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let p1 = props_with(&[("ref", JsValue::from_str("r1"))]);
    let v1 = rue.create_element(VNodeType::Element("div".into()), Some(p1), vec![]);
    rue.render(v1, &mut container);

    let v2 =
        rue.create_element(VNodeType::Element("div".into()), Some(ComponentProps::new()), vec![]);
    rue.render(v2, &mut container);

    let events = &rue.get_dom_adapter().unwrap().events;
    assert!(events.iter().any(|e| matches!(e, crate::common::TestEvent::ApplyRef(v) if v.as_string().as_deref() == Some("r1"))));
    assert!(events.iter().any(|e| matches!(e, crate::common::TestEvent::ClearRef(v) if v.as_string().as_deref() == Some("r1"))));
}

/// 初始化与读取全局日志（用于属性行为断言）
fn setup_global_log() {
    let _ = Reflect::set(&js_sys::global(), &JsValue::from_str("_propsLog"), &Array::new());
}

fn get_global_log() -> Array {
    Array::from(
        &Reflect::get(&js_sys::global(), &JsValue::from_str("_propsLog"))
            .unwrap_or(Array::new().into()),
    )
}

/// 构造带日志记录行为的 JsDomAdapter，覆盖多种属性操作
fn make_logging_js_adapter() -> JsDomAdapter {
    let obj = Object::new();
    for (k, src) in [
        ("createElement", "return { tag, children: [] }"),
        ("createTextNode", "return { tag: '#text', text }"),
        ("createDocumentFragment", "return { tag: 'fragment', children: [] }"),
        ("isFragment", "return !!el && el.tag === 'fragment'"),
        ("collectFragmentChildren", "return Array.from(el && el.children || [])"),
        ("setTextContent", "el.text=text"),
        ("appendChild", "p.children=p.children||[]; p.children.push(c)"),
        ("insertBefore", "p.children=p.children||[]; p.children.push(c)"),
        ("removeChild", "p.children=(p.children||[]).filter(x=>x!==c)"),
        ("contains", "return p===c || (p.children||[]).includes(c)"),
        ("setClassName", "el.class=v"),
        ("setInnerHTML", "el.children=[]; el.text=html"),
        ("setValue", "el.value=v; globalThis._propsLog.push('value:'+String(v))"),
        ("setChecked", "el.checked=!!b; globalThis._propsLog.push('checked:'+String(!!b))"),
        ("setDisabled", "el.disabled=!!b; globalThis._propsLog.push('disabled:'+String(!!b))"),
        ("clearRef", "globalThis._propsLog.push('clearRef')"),
        ("applyRef", "globalThis._propsLog.push('applyRef')"),
        (
            "setAttribute",
            "globalThis._propsLog.push('setAttr:'+k+'='+v); el.attrs=el.attrs||{}; el.attrs[k]=v",
        ),
        (
            "removeAttribute",
            "globalThis._propsLog.push('rmAttr:'+k); if(el.attrs) delete el.attrs[k]",
        ),
        ("getTagName", "return el.tag||''"),
        ("addEventListener", "globalThis._propsLog.push('addEvt:'+evt)"),
        ("removeEventListener", "globalThis._propsLog.push('rmEvt:'+evt)"),
        ("hasValueProperty", "return 'value' in el"),
        ("isSelectMultiple", "return el.tag==='SELECT' && !!el.multiple"),
        ("querySelector", "return undefined"),
        ("patchStyle", "globalThis._propsLog.push('style:'+newv.color+':'+String(newv.width))"),
    ] {
        let args = match k {
            "createElement" => "tag",
            "createTextNode" => "text",
            "setTextContent" => "el,text",
            "appendChild" | "removeChild" => "p,c",
            "insertBefore" => "p,c,b",
            "contains" => "p,c",
            "setClassName" => "el,v",
            "patchStyle" => "el,old,newv",
            "setInnerHTML" => "el,html",
            "setValue" => "el,v",
            "setChecked" | "setDisabled" => "el,b",
            "clearRef" => "r",
            "applyRef" => "el,r",
            "setAttribute" => "el,k,v",
            "removeAttribute" => "el,k",
            "getTagName" => "el",
            "addEventListener" | "removeEventListener" => "el,evt,h",
            "hasValueProperty" | "isSelectMultiple" | "isFragment" => "el",
            "collectFragmentChildren" => "el",
            "querySelector" => "sel",
            _ => "",
        };
        let _ =
            Reflect::set(&obj, &JsValue::from_str(k), &Function::new_with_args(args, src).into());
    }
    JsDomAdapter::new(obj.into())
}

/// patch_props 的 style 对象数值被转为字符串（宽度 10 -> '10'）
#[wasm_bindgen_test]
fn patch_props_style_object_converts_numbers_to_strings() {
    setup_global_log();
    let mut adapter = make_logging_js_adapter();
    let mut el = adapter.create_element("div");
    let old = ComponentProps::new();

    let style_obj = Object::new();
    let _ = Reflect::set(&style_obj, &JsValue::from_str("color"), &JsValue::from_str("blue"));
    let _ = Reflect::set(&style_obj, &JsValue::from_str("width"), &JsValue::from_f64(10.0));

    let mut newp = ComponentProps::new();
    newp.insert("style".into(), style_obj.into());

    patch_props(&mut adapter, &mut el, &old, &newp).unwrap();

    let log = get_global_log();
    assert!(log.iter().any(|v| v.as_string().unwrap() == "style:blue:10"));
}

/// post_patch_element 在 SELECT 上重新应用 value
#[wasm_bindgen_test]
fn post_patch_element_select_reapplies_value() {
    let mut adapter = TestAdapter::default();
    let mut el = adapter.create_element("SELECT");
    let mut newp = ComponentProps::new();
    newp.insert("value".into(), JsValue::from_str("x"));
    post_patch_element(&mut adapter, &mut el, &newp).unwrap();
    assert!(adapter.events.iter().any(|e| matches!(e, crate::common::TestEvent::SetValue(v) if v.as_string().as_deref() == Some("x"))));
}
