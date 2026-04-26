//! 同一组件在 props 更新时返回的 VaporWithSetup 子树应重建并反映新的局部值
//!
//! 复现模式：
//! - 组件函数保持不变，仅 props 变化；
//! - 组件内部先把 props 派生成一个局部变量；
//! - 再返回一个 `type: 'vapor'`、其 `setup` 闭包捕获这个局部变量。
//!
//! 若运行时在同组件更新时没有正确重跑/替换返回的 vapor 子树，
//! 第二次渲染仍会看到第一次的局部值。
use js_sys::{Array, Function, Object, Promise, Reflect};
use rue_runtime_vapor::createRue;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use wasm_bindgen_test::*;

/// 通过微任务推进一次事件循环，让 renderBetween 内部副作用落地
async fn tick() {
    let p = Promise::resolve(&JsValue::UNDEFINED);
    let _ = JsFuture::from(p).await;
}

/// 为父节点补全 previousSibling / nextSibling / parentNode，便于范围更新逻辑工作
fn update_siblings(parent: &JsValue) {
    let children =
        Reflect::get(parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr: Array = children.unchecked_into();
    for i in 0..arr.length() {
        let cur = arr.get(i);
        let prev = if i > 0 { arr.get(i - 1) } else { JsValue::NULL };
        let next = if i + 1 < arr.length() {
            arr.get(i + 1)
        } else {
            JsValue::NULL
        };
        let _ = Reflect::set(&cur, &JsValue::from_str("previousSibling"), &prev);
        let _ = Reflect::set(&cur, &JsValue::from_str("nextSibling"), &next);
        let _ = Reflect::set(&cur, &JsValue::from_str("parentNode"), parent);
    }
}

/// 构造一个支持 fragment 插入与 sibling 链接的轻量 JS DomAdapter
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

#[wasm_bindgen_test(async)]
async fn render_between_same_component_props_update_rebuilds_vapor_local_capture() {
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

    let component = Function::new_with_args(
        "props",
        "const label = props.show ? 'OPEN' : ''; \
         return { \
           type: 'vapor', \
           props: { \
             setup() { \
                             return { \
                                 tag: 'fragment', \
                                 children: label ? [{ tag: '#text', text: label, children: [] }] : [] \
                             }; \
             } \
           }, \
           children: [] \
         };",
    );

    let props_closed = Object::new();
    let _ = Reflect::set(
        &props_closed,
        &JsValue::from_str("show"),
        &JsValue::from_bool(false),
    );
    let vnode_closed =
        rue.create_element_wasm(component.clone().into(), props_closed.into(), JsValue::UNDEFINED);
    rue.render_between_wasm(vnode_closed, parent.clone(), start.clone(), end.clone());
    tick().await;
    update_siblings(&parent);

    let props_open = Object::new();
    let _ = Reflect::set(
        &props_open,
        &JsValue::from_str("show"),
        &JsValue::from_bool(true),
    );
    let vnode_open =
        rue.create_element_wasm(component.into(), props_open.into(), JsValue::UNDEFINED);
    rue.render_between_wasm(vnode_open, parent.clone(), start.clone(), end.clone());
    tick().await;
    update_siblings(&parent);

    let arr = Reflect::get(&parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr: Array = arr.unchecked_into();
    let texts: Vec<JsValue> = arr
        .iter()
        .filter(|c| {
            Reflect::get(c, &JsValue::from_str("tag"))
                .unwrap_or(JsValue::UNDEFINED)
                .as_string()
                .unwrap_or_default()
                == "#text"
        })
        .collect();

    assert_eq!(texts.len(), 1, "same component props update should produce one OPEN text node");
    let text = Reflect::get(&texts[0], &JsValue::from_str("text"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(text, "OPEN");
}

#[wasm_bindgen_test(async)]
async fn render_anchor_same_component_props_update_rebuilds_vapor_local_capture() {
    let adapter = make_linked_adapter();
    let rue = createRue(adapter.clone());
    let parent = {
        let f = Reflect::get(&adapter, &JsValue::from_str("createDocumentFragment")).unwrap();
        let func = f.unchecked_ref::<Function>();
        func.call0(&adapter).unwrap()
    };
    let anchor = {
        let f = Reflect::get(&adapter, &JsValue::from_str("createElement")).unwrap();
        let func = f.unchecked_ref::<Function>();
        func.call1(&adapter, &JsValue::from_str("comment_anchor")).unwrap()
    };
    {
        let append = Reflect::get(&adapter, &JsValue::from_str("appendChild")).unwrap();
        let func = append.unchecked_ref::<Function>();
        let _ = func.call2(&adapter, &parent, &anchor);
        update_siblings(&parent);
    }

    let component = Function::new_with_args(
        "props",
        "const label = props.show ? 'OPEN' : ''; \
         return { \
           type: 'vapor', \
           props: { \
             setup() { \
                             return { \
                                 tag: 'fragment', \
                                 children: label ? [{ tag: '#text', text: label, children: [] }] : [] \
                             }; \
             } \
           }, \
           children: [] \
         };",
    );

    let props_closed = Object::new();
    let _ = Reflect::set(
        &props_closed,
        &JsValue::from_str("show"),
        &JsValue::from_bool(false),
    );
    let vnode_closed =
        rue.create_element_wasm(component.clone().into(), props_closed.into(), JsValue::UNDEFINED);
    rue.render_anchor_wasm(vnode_closed, parent.clone(), anchor.clone());
    tick().await;
    update_siblings(&parent);

    let props_open = Object::new();
    let _ = Reflect::set(
        &props_open,
        &JsValue::from_str("show"),
        &JsValue::from_bool(true),
    );
    let vnode_open =
        rue.create_element_wasm(component.into(), props_open.into(), JsValue::UNDEFINED);
    rue.render_anchor_wasm(vnode_open, parent.clone(), anchor.clone());
    tick().await;
    update_siblings(&parent);

    let arr = Reflect::get(&parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr: Array = arr.unchecked_into();
    let texts: Vec<JsValue> = arr
        .iter()
        .filter(|c| {
            Reflect::get(c, &JsValue::from_str("tag"))
                .unwrap_or(JsValue::UNDEFINED)
                .as_string()
                .unwrap_or_default()
                == "#text"
        })
        .collect();

    assert_eq!(texts.len(), 1, "renderAnchor should update same component vapor local capture");
    let text = Reflect::get(&texts[0], &JsValue::from_str("text"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(text, "OPEN");
}

#[wasm_bindgen_test(async)]
async fn render_anchor_component_element_component_toggle_keeps_single_root() {
    let adapter = make_linked_adapter();
    let rue = createRue(adapter.clone());
    let parent = {
        let f = Reflect::get(&adapter, &JsValue::from_str("createDocumentFragment")).unwrap();
        let func = f.unchecked_ref::<Function>();
        func.call0(&adapter).unwrap()
    };
    let anchor = {
        let f = Reflect::get(&adapter, &JsValue::from_str("createElement")).unwrap();
        let func = f.unchecked_ref::<Function>();
        func.call1(&adapter, &JsValue::from_str("comment_anchor")).unwrap()
    };
    {
        let append = Reflect::get(&adapter, &JsValue::from_str("appendChild")).unwrap();
        let func = append.unchecked_ref::<Function>();
        let _ = func.call2(&adapter, &parent, &anchor);
        update_siblings(&parent);
    }

    let code_component = Function::new_no_args(
        "return { type: 'div', props: { className: 'code-root' }, children: ['CODE'] };",
    );
    let code_vnode1 =
        rue.create_element_wasm(code_component.clone().into(), JsValue::UNDEFINED, JsValue::UNDEFINED);
    rue.render_anchor_wasm(code_vnode1, parent.clone(), anchor.clone());
    tick().await;
    update_siblings(&parent);

    let preview_children = Array::new();
    preview_children.push(&JsValue::from_str("PREVIEW"));
    let preview_vnode =
        rue.create_element_wasm(JsValue::from_str("div"), JsValue::UNDEFINED, preview_children.into());
    rue.render_anchor_wasm(preview_vnode, parent.clone(), anchor.clone());
    tick().await;
    update_siblings(&parent);

    let after_preview = Reflect::get(&parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let after_preview: Array = after_preview.unchecked_into();
    let preview_divs: Vec<JsValue> = after_preview
        .iter()
        .filter(|c| {
            Reflect::get(c, &JsValue::from_str("tag"))
                .unwrap_or(JsValue::UNDEFINED)
                .as_string()
                .unwrap_or_default()
                == "div"
        })
        .collect();
    assert_eq!(preview_divs.len(), 1, "component -> element should not leave stale component root");
    let preview_children = Reflect::get(&preview_divs[0], &JsValue::from_str("children"))
        .unwrap_or(Array::new().into());
    let preview_children: Array = preview_children.unchecked_into();
    let preview_text = Reflect::get(&preview_children.get(0), &JsValue::from_str("text"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(preview_text, "PREVIEW");

    let code_vnode2 =
        rue.create_element_wasm(code_component.into(), JsValue::UNDEFINED, JsValue::UNDEFINED);
    rue.render_anchor_wasm(code_vnode2, parent.clone(), anchor.clone());
    tick().await;
    update_siblings(&parent);

    let final_children = Reflect::get(&parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let final_children: Array = final_children.unchecked_into();
    let code_divs: Vec<JsValue> = final_children
        .iter()
        .filter(|c| {
            Reflect::get(c, &JsValue::from_str("tag"))
                .unwrap_or(JsValue::UNDEFINED)
                .as_string()
                .unwrap_or_default()
                == "div"
        })
        .collect();
    assert_eq!(code_divs.len(), 1, "element -> component should not append a second component root");
    let code_children = Reflect::get(&code_divs[0], &JsValue::from_str("children"))
        .unwrap_or(Array::new().into());
    let code_children: Array = code_children.unchecked_into();
    let code_text = Reflect::get(&code_children.get(0), &JsValue::from_str("text"))
        .unwrap_or(JsValue::UNDEFINED)
        .as_string()
        .unwrap_or_default();
    assert_eq!(code_text, "CODE");
}