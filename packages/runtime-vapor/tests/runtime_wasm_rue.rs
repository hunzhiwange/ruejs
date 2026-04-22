use js_sys::{Array, Function, Object, Promise, Reflect};
use rue_runtime_vapor::createRue;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use wasm_bindgen_test::*;

fn make_adapter() -> JsValue {
    let obj = Object::new();
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createElement"),
        &Function::new_with_args("tag", "return { tag, children: [] }").into(),
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
        &Function::new_with_args(
            "el,old,newv",
            "Object.keys(newv).forEach(k=>{ el.style = el.style||{}; el.style[k]=newv[k]; })",
        )
        .into(),
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

fn js_obj() -> JsValue {
    Object::new().into()
}

// Note: Lifecycle hook registration via WasmRue inside component functions
// would reenter a mutable borrow of the same Rue. End-to-end lifecycle tests
// are covered in Rust unit tests in runtime_render.rs to avoid reentrancy.

async fn tick() {
    let p = Promise::resolve(&JsValue::UNDEFINED);
    let _ = JsFuture::from(p).await;
}

#[wasm_bindgen_test(async)]
async fn wasm_render_async_flush_appends() {
    let adapter = make_adapter();
    let rue = createRue(adapter.clone());
    let container = js_obj();
    // element vnode: <span class="x">hello</span>
    let props = Object::new();
    let _ = Reflect::set(&props, &JsValue::from_str("className"), &JsValue::from_str("x"));
    let children = Array::new();
    children.push(&JsValue::from_str("hello"));
    let id = rue.create_element_wasm(JsValue::from_str("span"), props.into(), children.into());
    rue.render_wasm(id.clone(), container.clone());
    let arr0v =
        Reflect::get(&container, &JsValue::from_str("children")).unwrap_or(JsValue::UNDEFINED);
    let arr0: Array = if arr0v.is_object() { Array::from(&arr0v) } else { Array::new() };
    assert_eq!(arr0.length(), 0);
    tick().await;
    let arv =
        Reflect::get(&container, &JsValue::from_str("children")).unwrap_or(JsValue::UNDEFINED);
    let arr: Array = if arv.is_object() { Array::from(&arv) } else { Array::new() };
    assert_eq!(arr.length(), 1);
    let child = arr.get(0);
    let class = Reflect::get(&child, &JsValue::from_str("class"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(class, "x");
}

#[wasm_bindgen_test(async)]
async fn wasm_render_between_async_insert_and_fallback() {
    let adapter = make_adapter();
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
    }
    // vnode: <span>B</span>
    let children = Array::new();
    children.push(&JsValue::from_str("B"));
    let id =
        rue.create_element_wasm(JsValue::from_str("span"), JsValue::UNDEFINED, children.into());
    rue.render_between_wasm(id.clone(), parent.clone(), start.clone(), end.clone());
    let arr0 = Reflect::get(&parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr0: Array = arr0.unchecked_into();
    assert!(arr0.iter().all(|c| c.is_object()
        && Reflect::get(&c, &JsValue::from_str("tag")).unwrap().as_string().unwrap() != "span"));
    tick().await;
    let arr = Reflect::get(&parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr: Array = arr.unchecked_into();
    assert!(arr.iter().any(|c| {
        Reflect::get(&c, &JsValue::from_str("tag")).unwrap().as_string().unwrap() == "span"
    }));
    // fallback: move end to another parent, next renderBetween should append
    let other = {
        let f = Reflect::get(&adapter, &JsValue::from_str("createDocumentFragment")).unwrap();
        let func = f.unchecked_ref::<Function>();
        func.call0(&adapter).unwrap()
    };
    {
        let append = Reflect::get(&adapter, &JsValue::from_str("appendChild")).unwrap();
        let func = append.unchecked_ref::<Function>();
        let _ = func.call2(&adapter, &other, &end);
    }
    let children2 = Array::new();
    children2.push(&JsValue::from_str("C"));
    let id2 =
        rue.create_element_wasm(JsValue::from_str("span"), JsValue::UNDEFINED, children2.into());
    rue.render_between_wasm(id2.clone(), parent.clone(), start.clone(), end.clone());
    tick().await;
    let arr2 = Reflect::get(&parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr2: Array = arr2.unchecked_into();
    assert!(arr2.iter().any(|c| {
        Reflect::get(&c, &JsValue::from_str("tag")).unwrap().as_string().unwrap() == "span"
    }));
}

#[wasm_bindgen_test]
fn create_rue_sets_global_dom_adapter() {
    let adapter = make_adapter();
    let _rue = createRue(adapter.clone());
    let global = js_sys::global();
    let stored =
        Reflect::get(&global, &JsValue::from_str("__rue_dom")).unwrap_or(JsValue::UNDEFINED);
    assert!(stored.is_object());
}

#[wasm_bindgen_test(async)]
async fn wasm_create_element_function_component_executes_on_render_not_on_create() {
    let adapter = make_adapter();
    let rue = createRue(adapter.clone());
    let container = js_obj();

    let _ =
        Reflect::set(&js_sys::global(), &JsValue::from_str("_fcCount"), &JsValue::from_f64(0.0));
    let fc = Function::new_no_args(
        "globalThis._fcCount = (globalThis._fcCount||0) + 1; return { type: 'div', props: { className: 'ok' }, children: ['x'] }",
    );

    let id = rue.create_element_wasm(fc.into(), JsValue::UNDEFINED, JsValue::UNDEFINED);
    let count0 = Reflect::get(&js_sys::global(), &JsValue::from_str("_fcCount"))
        .unwrap()
        .as_f64()
        .unwrap_or(0.0);
    assert_eq!(count0 as i32, 0);

    rue.render_wasm(id, container.clone());
    tick().await;

    let count1 = Reflect::get(&js_sys::global(), &JsValue::from_str("_fcCount"))
        .unwrap()
        .as_f64()
        .unwrap_or(0.0);
    assert_eq!(count1 as i32, 1);

    let children =
        Reflect::get(&container, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let children: Array = children.unchecked_into();
    assert_eq!(children.length(), 1);
    let el = children.get(0);
    let class = Reflect::get(&el, &JsValue::from_str("class"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(class, "ok");
}

#[wasm_bindgen_test(async)]
async fn wasm_vapor_wasm_renders_host_element() {
    let adapter = make_adapter();
    let rue = createRue(adapter.clone());
    let container = js_obj();

    let setup = Function::new_with_args(
        "",
        "const el = { tag: 'span', children: [] }; return { vaporElement: el }",
    );
    let id = rue.vapor_wasm(setup.into());
    rue.render_wasm(id, container.clone());
    tick().await;

    let children =
        Reflect::get(&container, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let children: Array = children.unchecked_into();
    assert_eq!(children.length(), 1);
    let el = children.get(0);
    let tag = Reflect::get(&el, &JsValue::from_str("tag"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(tag, "span");
}

#[wasm_bindgen_test(async)]
async fn wasm_get_current_container_returns_last_render_container() {
    let adapter = make_adapter();
    let rue = createRue(adapter.clone());
    let container = js_obj();

    let id =
        rue.create_element_wasm(JsValue::from_str("div"), JsValue::UNDEFINED, Array::new().into());
    rue.render_wasm(id, container.clone());
    let got = rue.get_current_container_wasm();
    assert!(got.is_object());
    tick().await;
}

#[wasm_bindgen_test(async)]
async fn wasm_create_element_flattens_nested_array_children() {
    let adapter = make_adapter();
    let rue = createRue(adapter.clone());
    let container = js_obj();

    let child_a_children = Array::new();
    child_a_children.push(&JsValue::from_str("A"));
    let child_a = rue.create_element_wasm(
        JsValue::from_str("span"),
        JsValue::UNDEFINED,
        child_a_children.into(),
    );

    let child_b_children = Array::new();
    child_b_children.push(&JsValue::from_str("B"));
    let child_b = rue.create_element_wasm(
        JsValue::from_str("span"),
        JsValue::UNDEFINED,
        child_b_children.into(),
    );

    let nested = Array::new();
    nested.push(&child_a);
    nested.push(&child_b);

    let parent_children = Array::new();
    parent_children.push(&nested);
    let parent = rue.create_element_wasm(
        JsValue::from_str("div"),
        JsValue::UNDEFINED,
        parent_children.into(),
    );

    rue.render_wasm(parent, container.clone());
    tick().await;

    let children =
        Reflect::get(&container, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let children: Array = children.unchecked_into();
    assert_eq!(children.length(), 1);

    let parent_el = children.get(0);
    let parent_kids =
        Reflect::get(&parent_el, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let parent_kids: Array = parent_kids.unchecked_into();
    assert_eq!(parent_kids.length(), 2);

    let first_tag = Reflect::get(&parent_kids.get(0), &JsValue::from_str("tag"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    let second_tag = Reflect::get(&parent_kids.get(1), &JsValue::from_str("tag"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(first_tag, "span");
    assert_eq!(second_tag, "span");
}
