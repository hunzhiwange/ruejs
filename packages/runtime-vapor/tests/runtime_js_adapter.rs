use js_sys::{Array, Function, Object, Reflect};
use rue_runtime_vapor::{DomAdapter, JsDomAdapter};
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

fn adapter_obj_with(methods: &[&str]) -> JsValue {
    let obj = Object::new();
    for key in methods {
        let f = Function::new_no_args("return undefined");
        let _ = Reflect::set(&obj, &JsValue::from_str(key), &f.into());
    }
    obj.into()
}

#[wasm_bindgen_test]
#[should_panic]
fn js_adapter_audit_missing_methods_panics() {
    let missing = adapter_obj_with(&["createElement"]);
    let _ = JsDomAdapter::new(missing);
}

fn make_working_adapter() -> JsDomAdapter {
    let obj = Object::new();
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createElement"),
        &Function::new_with_args("tag", "return { tag }").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createTextNode"),
        &Function::new_with_args("text", "return { tag: '#text', text }").into(),
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
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("appendChild"),
        &Function::new_with_args("p,c", "p.children = p.children||[]; p.children.push(c)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("insertBefore"),
        &Function::new_with_args("p,c,b", "p.children = p.children||[]; p.children.push(c)").into(),
    );
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
        &Function::new_with_args("el,html", "el.children = []; el.text = html").into(),
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
        &Function::new_with_args("sel", "return { tag: sel }").into(),
    );
    JsDomAdapter::new(obj.into())
}

#[wasm_bindgen_test]
fn js_adapter_audit_ok_and_basic_calls() {
    let mut a = make_working_adapter();
    let el = a.create_element("SELECT");
    let t = a.get_tag_name(&el);
    assert_eq!(t, "SELECT");
    let hasv = a.has_value_property(&el);
    assert_eq!(hasv, false);
    let obj = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&obj, &JsValue::from_str("value"), &JsValue::from_str("x"));
    let el2 = obj.into();
    let hasv2 = a.has_value_property(&el2);
    assert_eq!(hasv2, true);
    let m = a.is_select_multiple(&el);
    assert_eq!(m, false);
}

fn setup_global_log() {
    let _ = Reflect::set(&js_sys::global(), &JsValue::from_str("_log"), &Array::new());
}

fn get_log() -> Array {
    Array::from(&Reflect::get(&js_sys::global(), &JsValue::from_str("_log")).unwrap())
}

#[wasm_bindgen_test]
fn js_adapter_events_attributes_and_patch_style_logging() {
    setup_global_log();
    let obj = Object::new();
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createElement"),
        &Function::new_with_args("tag", "return { tag, children: [] }").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("getTagName"),
        &Function::new_with_args("el", "return el.tag||''").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("addEventListener"),
        &Function::new_with_args("el,evt,h", "globalThis._log.push('add:'+evt)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("removeEventListener"),
        &Function::new_with_args("el,evt,h", "globalThis._log.push('rm:'+evt)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setAttribute"),
        &Function::new_with_args("el,k,v", "globalThis._log.push('set:'+k+'='+v)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("removeAttribute"),
        &Function::new_with_args("el,k", "globalThis._log.push('rmattr:'+k)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("patchStyle"),
        &Function::new_with_args(
            "el,old,newv",
            "Object.keys(newv).forEach(k=>globalThis._log.push('style:'+k+'='+newv[k]))",
        )
        .into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setTextContent"),
        &Function::new_with_args("el,text", "el.text=text").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("appendChild"),
        &Function::new_with_args("p,c", "p.children.push(c)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("insertBefore"),
        &Function::new_with_args("p,c,b", "p.children.push(c)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("removeChild"),
        &Function::new_with_args("p,c", "p.children=p.children.filter(x=>x!==c)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("contains"),
        &Function::new_with_args("p,c", "return p===c || (p.children||[]).includes(c)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setClassName"),
        &Function::new_with_args("el,v", "el.class=v").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setInnerHTML"),
        &Function::new_with_args("el,html", "el.children=[]; el.text=html").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createTextNode"),
        &Function::new_with_args("text", "return { tag: '#text', text }").into(),
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
        &JsValue::from_str("setValue"),
        &Function::new_with_args("el,v", "el.value=v").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setChecked"),
        &Function::new_with_args("el,b", "el.checked=!!b").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setDisabled"),
        &Function::new_with_args("el,b", "el.disabled=!!b").into(),
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
        &Function::new_with_args("sel", "return { tag: sel }").into(),
    );
    let mut a = JsDomAdapter::new(obj.into());
    let mut el = a.create_element("div");
    a.add_event_listener(&mut el, "click", JsValue::from_str("h"));
    a.remove_event_listener(&mut el, "click", JsValue::from_str("h"));
    a.set_attribute(&mut el, "data-x", "1");
    a.remove_attribute(&mut el, "data-x");
    let old = std::collections::HashMap::<String, String>::new();
    let mut newm = std::collections::HashMap::<String, String>::new();
    newm.insert("color".into(), "blue".into());
    newm.insert("width".into(), "10".into());
    a.patch_style(&mut el, &old, &newm);
    let log = get_log();
    assert!(log.iter().any(|v| v.as_string().unwrap() == "add:click"));
    assert!(log.iter().any(|v| v.as_string().unwrap() == "rm:click"));
    assert!(log.iter().any(|v| v.as_string().unwrap() == "set:data-x=1"));
    assert!(log.iter().any(|v| v.as_string().unwrap() == "rmattr:data-x"));
    assert!(log.iter().any(|v| v.as_string().unwrap() == "style:color=blue"));
    assert!(log.iter().any(|v| v.as_string().unwrap() == "style:width=10"));
}

#[wasm_bindgen_test]
fn js_adapter_query_selector_none_and_some() {
    setup_global_log();
    // 构造完整适配器（方法齐全），再覆盖 querySelector 返回 undefined
    let base1 = Object::new();
    for (k, fsrc) in [
        ("createElement", "return { tag: 'div', children: [] }"),
        ("createTextNode", "return { tag: '#text', text: '' }"),
        ("createDocumentFragment", "return { tag: 'fragment', children: [] }"),
        ("isFragment", "return !!el && el.tag === 'fragment'"),
        ("collectFragmentChildren", "return Array.from(el && el.children || [])"),
        ("setTextContent", "el.text=text"),
        ("appendChild", "p.children=p.children||[]; p.children.push(c)"),
        ("insertBefore", "p.children=p.children||[]; p.children.push(c)"),
        ("removeChild", "p.children=(p.children||[]).filter(x=>x!==c)"),
        ("contains", "return p===c || (p.children||[]).includes(c)"),
        ("setClassName", "el.class=v"),
        ("patchStyle", "Object.keys(newv).forEach(k=>{el.style=el.style||{};el.style[k]=newv[k]})"),
        ("setInnerHTML", "el.children=[]; el.text=html"),
        ("setValue", "el.value=v"),
        ("setChecked", "el.checked=!!b"),
        ("setDisabled", "el.disabled=!!b"),
        ("clearRef", "return"),
        ("applyRef", "return"),
        ("setAttribute", "el.attrs=el.attrs||{}; el.attrs[k]=v"),
        ("removeAttribute", "if(el.attrs) delete el.attrs[k]"),
        ("getTagName", "return el.tag||''"),
        ("addEventListener", "return"),
        ("removeEventListener", "return"),
        ("hasValueProperty", "return 'value' in el"),
        ("isSelectMultiple", "return el.tag==='SELECT' && !!el.multiple"),
        ("querySelector", "return undefined"),
    ] {
        let _ = Reflect::set(
            &base1,
            &JsValue::from_str(k),
            &Function::new_with_args("el,p,c,b,k,v,old,newv,sel", fsrc).into(),
        );
    }
    let _ = Reflect::set(
        &base1,
        &JsValue::from_str("querySelector"),
        &Function::new_with_args("sel", "return undefined").into(),
    );
    let a1 = JsDomAdapter::new(base1.into());
    assert!(a1.query_selector("#none").is_none());
    // 构造完整适配器（方法齐全），再覆盖 querySelector 返回元素并记录日志
    let base2 = Object::new();
    for (k, fsrc) in [
        ("createElement", "return { tag: 'div', children: [] }"),
        ("createTextNode", "return { tag: '#text', text: '' }"),
        ("createDocumentFragment", "return { tag: 'fragment', children: [] }"),
        ("isFragment", "return !!el && el.tag === 'fragment'"),
        ("collectFragmentChildren", "return Array.from(el && el.children || [])"),
        ("setTextContent", "el.text=text"),
        ("appendChild", "p.children=p.children||[]; p.children.push(c)"),
        ("insertBefore", "p.children=p.children||[]; p.children.push(c)"),
        ("removeChild", "p.children=(p.children||[]).filter(x=>x!==c)"),
        ("contains", "return p===c || (p.children||[]).includes(c)"),
        ("setClassName", "el.class=v"),
        ("patchStyle", "Object.keys(newv).forEach(k=>{el.style=el.style||{};el.style[k]=newv[k]})"),
        ("setInnerHTML", "el.children=[]; el.text=html"),
        ("setValue", "el.value=v"),
        ("setChecked", "el.checked=!!b"),
        ("setDisabled", "el.disabled=!!b"),
        ("clearRef", "return"),
        ("applyRef", "return"),
        ("setAttribute", "el.attrs=el.attrs||{}; el.attrs[k]=v"),
        ("removeAttribute", "if(el.attrs) delete el.attrs[k]"),
        ("getTagName", "return el.tag||''"),
        ("addEventListener", "return"),
        ("removeEventListener", "return"),
        ("hasValueProperty", "return 'value' in el"),
        ("isSelectMultiple", "return el.tag==='SELECT' && !!el.multiple"),
        ("querySelector", "globalThis._log.push('qs:'+sel); return { tag: sel }"),
    ] {
        let _ = Reflect::set(
            &base2,
            &JsValue::from_str(k),
            &Function::new_with_args("el,p,c,b,k,v,old,newv,sel", fsrc).into(),
        );
    }
    let _ = Reflect::set(
        &base2,
        &JsValue::from_str("querySelector"),
        &Function::new_with_args("sel", "globalThis._log.push('qs:'+sel); return { tag: sel }")
            .into(),
    );
    let a2 = JsDomAdapter::new(base2.into());
    let r = a2.query_selector("#x");
    assert!(r.is_some());
    let log = get_log();
    assert!(log.iter().any(|v| v.as_string().unwrap() == "qs:#x"));
}

#[wasm_bindgen_test]
#[should_panic]
fn js_adapter_create_element_returning_undefined_panics() {
    let obj = Object::new();
    for (k, fsrc) in [
        ("createElement", "return undefined"),
        ("createTextNode", "return { tag: '#text', text: '' }"),
        ("createDocumentFragment", "return { tag: 'fragment', children: [] }"),
        ("isFragment", "return !!el && el.tag === 'fragment'"),
        ("collectFragmentChildren", "return Array.from(el && el.children || [])"),
        ("setTextContent", "el.text=text"),
        ("appendChild", "p.children=p.children||[]; p.children.push(c)"),
        ("insertBefore", "p.children=p.children||[]; p.children.push(c)"),
        ("removeChild", "p.children=(p.children||[]).filter(x=>x!==c)"),
        ("contains", "return p===c || (p.children||[]).includes(c)"),
        ("setClassName", "el.class=v"),
        ("patchStyle", "return"),
        ("setInnerHTML", "el.children=[]; el.text=html"),
        ("setValue", "el.value=v"),
        ("setChecked", "el.checked=!!b"),
        ("setDisabled", "el.disabled=!!b"),
        ("clearRef", "return"),
        ("applyRef", "return"),
        ("setAttribute", "el.attrs=el.attrs||{}; el.attrs[k]=v"),
        ("removeAttribute", "if(el.attrs) delete el.attrs[k]"),
        ("getTagName", "return el.tag||''"),
        ("addEventListener", "return"),
        ("removeEventListener", "return"),
        ("hasValueProperty", "return 'value' in el"),
        ("isSelectMultiple", "return el.tag==='SELECT' && !!el.multiple"),
        ("querySelector", "return undefined"),
    ] {
        let args = match k {
            "createElement" => "tag",
            "createTextNode" => "text",
            "createDocumentFragment" => "",
            "isFragment"
            | "collectFragmentChildren"
            | "getTagName"
            | "hasValueProperty"
            | "isSelectMultiple" => "el",
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
            "addEventListener" | "removeEventListener" => "el,evt,h",
            "querySelector" => "sel",
            _ => "",
        };
        let _ =
            Reflect::set(&obj, &JsValue::from_str(k), &Function::new_with_args(args, fsrc).into());
    }
    let mut a = JsDomAdapter::new(obj.into());
    let _ = a.create_element("div");
}

#[wasm_bindgen_test]
fn js_adapter_get_parent_node_uses_method_or_fallback_property() {
    let obj1 = Object::new();
    for (k, fsrc) in [
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
        ("patchStyle", "return"),
        ("setInnerHTML", "el.children=[]; el.text=html"),
        ("setValue", "el.value=v"),
        ("setChecked", "el.checked=!!b"),
        ("setDisabled", "el.disabled=!!b"),
        ("clearRef", "return"),
        ("applyRef", "return"),
        ("setAttribute", "el.attrs=el.attrs||{}; el.attrs[k]=v"),
        ("removeAttribute", "if(el.attrs) delete el.attrs[k]"),
        ("getTagName", "return el.tag||''"),
        ("addEventListener", "return"),
        ("removeEventListener", "return"),
        ("hasValueProperty", "return 'value' in el"),
        ("isSelectMultiple", "return el.tag==='SELECT' && !!el.multiple"),
        ("querySelector", "return undefined"),
        ("getParentNode", "return el._p || null"),
    ] {
        let args = match k {
            "createElement" => "tag",
            "createTextNode" => "text",
            "createDocumentFragment" => "",
            "isFragment"
            | "collectFragmentChildren"
            | "getTagName"
            | "hasValueProperty"
            | "isSelectMultiple"
            | "getParentNode" => "el",
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
            "addEventListener" | "removeEventListener" => "el,evt,h",
            "querySelector" => "sel",
            _ => "",
        };
        let _ =
            Reflect::set(&obj1, &JsValue::from_str(k), &Function::new_with_args(args, fsrc).into());
    }
    let mut a1 = JsDomAdapter::new(obj1.into());
    let parent: JsValue = Object::new().into();
    let child = a1.create_element("div");
    let _ = Reflect::set(&child, &JsValue::from_str("_p"), &parent);
    let got = a1.get_parent_node(&child);
    assert!(got.is_some());

    let obj2 = Object::new();
    for (k, fsrc) in [
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
        ("patchStyle", "return"),
        ("setInnerHTML", "el.children=[]; el.text=html"),
        ("setValue", "el.value=v"),
        ("setChecked", "el.checked=!!b"),
        ("setDisabled", "el.disabled=!!b"),
        ("clearRef", "return"),
        ("applyRef", "return"),
        ("setAttribute", "el.attrs=el.attrs||{}; el.attrs[k]=v"),
        ("removeAttribute", "if(el.attrs) delete el.attrs[k]"),
        ("getTagName", "return el.tag||''"),
        ("addEventListener", "return"),
        ("removeEventListener", "return"),
        ("hasValueProperty", "return 'value' in el"),
        ("isSelectMultiple", "return el.tag==='SELECT' && !!el.multiple"),
        ("querySelector", "return undefined"),
    ] {
        let args = match k {
            "createElement" => "tag",
            "createTextNode" => "text",
            "createDocumentFragment" => "",
            "isFragment"
            | "collectFragmentChildren"
            | "getTagName"
            | "hasValueProperty"
            | "isSelectMultiple" => "el",
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
            "addEventListener" | "removeEventListener" => "el,evt,h",
            "querySelector" => "sel",
            _ => "",
        };
        let _ =
            Reflect::set(&obj2, &JsValue::from_str(k), &Function::new_with_args(args, fsrc).into());
    }
    let mut a2 = JsDomAdapter::new(obj2.into());
    let p2: JsValue = Object::new().into();
    let c2 = a2.create_element("div");
    let _ = Reflect::set(&c2, &JsValue::from_str("parentNode"), &p2);
    let got2 = a2.get_parent_node(&c2);
    assert!(got2.is_some());
}

#[wasm_bindgen_test]
fn js_adapter_replace_child_fallback_calls_insert_before_and_remove_child() {
    let _ = Reflect::set(&js_sys::global(), &JsValue::from_str("_repLog"), &Array::new());
    let obj = Object::new();
    for (k, fsrc) in [
        ("createElement", "return { tag, children: [] }"),
        ("createTextNode", "return { tag: '#text', text }"),
        ("createDocumentFragment", "return { tag: 'fragment', children: [] }"),
        ("isFragment", "return !!el && el.tag === 'fragment'"),
        ("collectFragmentChildren", "return Array.from(el && el.children || [])"),
        ("setTextContent", "el.text=text"),
        ("appendChild", "p.children=p.children||[]; p.children.push(c)"),
        (
            "insertBefore",
            "globalThis._repLog.push('insert'); p.children=p.children||[]; p.children.push(c)",
        ),
        (
            "removeChild",
            "globalThis._repLog.push('remove'); p.children=(p.children||[]).filter(x=>x!==c)",
        ),
        ("contains", "return p===c || (p.children||[]).includes(c)"),
        ("setClassName", "el.class=v"),
        ("patchStyle", "return"),
        ("setInnerHTML", "el.children=[]; el.text=html"),
        ("setValue", "el.value=v"),
        ("setChecked", "el.checked=!!b"),
        ("setDisabled", "el.disabled=!!b"),
        ("clearRef", "return"),
        ("applyRef", "return"),
        ("setAttribute", "el.attrs=el.attrs||{}; el.attrs[k]=v"),
        ("removeAttribute", "if(el.attrs) delete el.attrs[k]"),
        ("getTagName", "return el.tag||''"),
        ("addEventListener", "return"),
        ("removeEventListener", "return"),
        ("hasValueProperty", "return 'value' in el"),
        ("isSelectMultiple", "return el.tag==='SELECT' && !!el.multiple"),
        ("querySelector", "return undefined"),
    ] {
        let args = match k {
            "createElement" => "tag",
            "createTextNode" => "text",
            "createDocumentFragment" => "",
            "isFragment"
            | "collectFragmentChildren"
            | "getTagName"
            | "hasValueProperty"
            | "isSelectMultiple" => "el",
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
            "addEventListener" | "removeEventListener" => "el,evt,h",
            "querySelector" => "sel",
            _ => "",
        };
        let _ =
            Reflect::set(&obj, &JsValue::from_str(k), &Function::new_with_args(args, fsrc).into());
    }
    let mut a = JsDomAdapter::new(obj.into());
    let mut parent = a.create_element("div");
    let oldc = a.create_element("span");
    let newc = a.create_element("b");
    a.append_child(&mut parent, &oldc);
    a.replace_child(&mut parent, &newc, &oldc);
    let log: Array =
        Array::from(&Reflect::get(&js_sys::global(), &JsValue::from_str("_repLog")).unwrap());
    assert!(log.iter().any(|v| v.as_string().unwrap() == "insert"));
    assert!(log.iter().any(|v| v.as_string().unwrap() == "remove"));
}
