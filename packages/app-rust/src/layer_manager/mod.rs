use js_sys::Function;
use rue_runtime_vapor::{SignalHandle, create_signal, set_reactive_scheduling, watch_signal};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

mod utils;
mod canvas;
mod selection;
mod inspector;
mod pages;
mod list;

use utils::*;
use inspector::render_inspector;
use pages::render_pages;
use list::render_list;

pub fn make_layer_manager_element(width: u32, height: u32) -> JsValue {
    let global = js_sys::global();
    let document = reflect_get(&global, "document");

    let root = create_element(&document, "div");
    set_class(&root, "grid gap-3");

    let header = create_element(&document, "div");
    set_class(&header, "flex items-center justify-between");
    let title = create_element(&document, "div");
    set_class(&title, "font-semibold");
    set_text(&title, "图层管理器");
    let tip = create_element(&document, "div");
    set_class(&tip, "text-xs text-base-content/60");
    set_text(&tip, "简易原型：图层列表 + 画布渲染");
    append_child(&header, &title);
    append_child(&header, &tip);

    let body = create_element(&document, "div");
    set_class(&body, "flex gap-3");

    let sidebar = create_element(&document, "div");
    set_class(&sidebar, "w-64 shrink-0 rounded-xl border border-base-300 bg-base-100");

    let sidebar_top = create_element(&document, "div");
    set_class(&sidebar_top, "p-2 flex gap-2 border-b border-base-300");

    let btn_add_rect = create_element(&document, "button");
    set_class(&btn_add_rect, "btn btn-xs btn-primary flex-1");
    set_text(&btn_add_rect, "+ 矩形");

    let btn_add_text = create_element(&document, "button");
    set_class(&btn_add_text, "btn btn-xs btn-secondary flex-1");
    set_text(&btn_add_text, "+ 文本");
    let btn_add_html = create_element(&document, "button");
    set_class(&btn_add_html, "btn btn-xs btn-accent flex-1");
    set_text(&btn_add_html, "+ HTML");

    append_child(&sidebar_top, &btn_add_rect);
    append_child(&sidebar_top, &btn_add_text);
    append_child(&sidebar_top, &btn_add_html);

    let list = create_element(&document, "div");
    set_class(&list, "p-2 space-y-1 max-h-[360px] overflow-auto");

    let sidebar_bottom = create_element(&document, "div");
    set_class(&sidebar_bottom, "p-2 border-t border-base-300 grid grid-cols-2 gap-2");

    // 删除通用按钮：上移/下移/显隐

    let btn_rename = js_sys::Object::new();
    let btn_delete = js_sys::Object::new();

    // 已移除通用按钮的加入
    let _ = btn_rename;
    let _ = btn_delete;

    append_child(&sidebar, &sidebar_top);
    append_child(&sidebar, &list);
    append_child(&sidebar, &sidebar_bottom);

    let stage = create_element(&document, "div");
    set_class(
        &stage,
        "flex-1 rounded-xl border border-base-300 bg-base-100 p-3",
    );

    let canvas_wrap = create_element(&document, "div");
    set_class(&canvas_wrap, "rounded-lg overflow-hidden relative");
    let w = width as f64;
    let h = height as f64;
    set_attr(
        &canvas_wrap,
        "style",
        &format!("background:none;width:100%;min-height:{}px;", h),
    );

    let canvas = create_element(&document, "canvas");
    set_attr(&canvas, "style", "width:100%;height:100%;display:block;");

    append_child(&canvas_wrap, &canvas);
    let html_overlay = create_element(&document, "div");
    set_class(&html_overlay, "absolute inset-0");
    append_child(&canvas_wrap, &html_overlay);
    append_child(&stage, &canvas_wrap);

    let pages_panel = create_element(&document, "div");
    set_class(&pages_panel, "w-52 shrink-0 rounded-xl border border-base-300 bg-base-100");
    append_child(&body, &pages_panel);
    append_child(&body, &sidebar);
    append_child(&body, &stage);
    let inspector = create_element(&document, "div");
    set_class(
        &inspector,
        "w-64 shrink-0 rounded-xl border border-base-300 bg-base-100 p-2",
    );
    append_child(&body, &inspector);

    append_child(&root, &header);
    append_child(&root, &body);

    let initial_state = {
        let obj = object_new();
        let arr = array_new();
        object_set(&obj, "layers", &arr.clone().into());
        object_set(&obj, "selected", &JsValue::UNDEFINED);
        let selm = array_new();
        object_set(&obj, "selected_multi", &selm.into());
        object_set(&obj, "next_id", &JsValue::from_f64(1.0));
        let pages = array_new();
        let p1 = object_new();
        object_set(&p1, "id", &JsValue::from_f64(1.0));
        object_set(&p1, "name", &JsValue::from_str("页面 1"));
        array_push(&pages, &p1);
        object_set(&obj, "pages", &pages.clone().into());
        object_set(&obj, "current_page", &JsValue::from_f64(1.0));
        object_set(&obj, "next_page_id", &JsValue::from_f64(2.0));
        let vp = object_new();
        object_set(&vp, "offset_x", &JsValue::from_f64(0.0));
        object_set(&vp, "offset_y", &JsValue::from_f64(0.0));
        object_set(&vp, "zoom", &JsValue::from_f64(1.0));
        object_set(&obj, "viewport", &vp);
        object_set(&obj, "use_webgpu", &JsValue::from_bool(true));
        obj
    };
    let state_sig: SignalHandle = create_signal(initial_state, None);
    let state = Rc::new(RefCell::new(State {
        list_handlers: Vec::new(),
        ui_handlers: Vec::new(),
        inspector_handlers: Vec::new(),
        pages_handlers: Vec::new(),
    }));

    set_reactive_scheduling("sync");
    let s_version: SignalHandle = create_signal(JsValue::from_f64(0.0), None);
    let rerender: Rc<dyn Fn()> = Rc::new({
        let s_ver = s_version.clone();
        move || {
            let cur = s_ver.get_js().as_f64().unwrap_or(0.0);
            s_ver.set_js(JsValue::from_f64(cur + 1.0));
        }
    });
    let dragging = Rc::new(RefCell::new(false));
    let move_scheduled = Rc::new(RefCell::new(false));
    let panning = Rc::new(RefCell::new(None::<(f64, f64, f64, f64)>));
    {
        let document2 = document.clone();
        let list2 = list.clone();
        let canvas2 = canvas.clone();
        let handlers2 = state.clone();
        let state_sig2 = state_sig.clone();
        let rerender2 = rerender.clone();
        let inspector2 = inspector.clone();
        let pages_panel2 = pages_panel.clone();
        let html_overlay2 = html_overlay.clone();
        let dragging2 = dragging.clone();
        let canvas_wrap1 = canvas_wrap.clone();
        let cb = wasm_bindgen::closure::Closure::wrap
            (
            Box::new(move |_n: JsValue, _o: JsValue| {
                let active = reflect_get(&document2, "activeElement");
                let mut active_field: Option<String> = None;
                let is_dragging = *dragging2.borrow();
                if !active.is_undefined() && !active.is_null() && !is_dragging {
                    active_field = get_attribute(&active, "data-field");
                }
                if !is_dragging {
                    render_pages(&document2, &pages_panel2, &state_sig2, &handlers2, &rerender2);
                    render_list(&document2, &list2, &state_sig2, &handlers2, &rerender2);
                    render_inspector(&document2, &inspector2, &state_sig2, &handlers2, &rerender2);
                }
                let mut cw = reflect_get(&canvas_wrap1, "clientWidth").as_f64().unwrap_or(0.0);
                let mut ch = reflect_get(&canvas_wrap1, "clientHeight").as_f64().unwrap_or(0.0);
                if cw <= 0.0 { cw = w; }
                if ch <= 0.0 { ch = h; }
                reflect_set(&canvas2, "width", &JsValue::from_f64(cw));
                reflect_set(&canvas2, "height", &JsValue::from_f64(ch));
                canvas::draw_webgpu(&canvas2, cw, ch, &state_sig2);
                reflect_set(&html_overlay2, "innerHTML", &JsValue::from_str(""));
                {
                    let vx = state_sig2.get_path_js(JsValue::from_str("viewport.offset_x")).as_f64().unwrap_or(0.0);
                    let vy = state_sig2.get_path_js(JsValue::from_str("viewport.offset_y")).as_f64().unwrap_or(0.0);
                    let pick_mode = state_sig2.get_path_js(JsValue::from_str("html_pick_mode")).as_bool().unwrap_or(false);
                    reflect_set(&html_overlay2, "style", &JsValue::from_str(if pick_mode { "pointer-events:auto;" } else { "pointer-events:none;" }));
                    let use_wgpu = state_sig2.get_path_js(JsValue::from_str("use_webgpu")).as_bool().unwrap_or(false);
                    let cur_page = state_sig2.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                    let layers = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("layers")));
                    for i in 0..layers.length() {
                        let l = layers.get(i);
                        let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
                        if !vis { continue; }
                        let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
                        if pid != cur_page { continue; }
                        let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
                        if kind != "html" && !(use_wgpu && kind == "text") { continue; }
                        let idv = js_sys::Reflect::get(&l, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED).as_f64().unwrap_or(-1.0);
                        let tag = js_sys::Reflect::get(&l, &JsValue::from_str("tag")).unwrap_or(JsValue::from_str("div")).as_string().unwrap_or("div".to_string());
                        let class = js_sys::Reflect::get(&l, &JsValue::from_str("class")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
                        let text = js_sys::Reflect::get(&l, &JsValue::from_str("text")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
                        let html = js_sys::Reflect::get(&l, &JsValue::from_str("html")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
                        let x = js_sys::Reflect::get(&l, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let y = js_sys::Reflect::get(&l, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let wv = js_sys::Reflect::get(&l, &JsValue::from_str("w")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let hv = js_sys::Reflect::get(&l, &JsValue::from_str("h")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let rot = js_sys::Reflect::get(&l, &JsValue::from_str("rotation")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let el = if use_wgpu && kind == "text" {
                            create_element(&document2, "span")
                        } else {
                            create_element(&document2, &tag)
                        };
                        set_attr(&el, "data-layer-id", &format!("{}", idv as i32));
                        if !class.is_empty() { set_class(&el, &class); }
                        if use_wgpu && kind == "text" {
                            let color = js_sys::Reflect::get(&l, &JsValue::from_str("color")).unwrap_or(JsValue::from_str("#ffffff")).as_string().unwrap_or("#ffffff".to_string());
                            let font_size = js_sys::Reflect::get(&l, &JsValue::from_str("font_size")).unwrap_or(JsValue::from_f64(16.0)).as_f64().unwrap_or(16.0);
                            set_text(&el, &text);
                            let mut style = format!(
                                "position:absolute;left:{}px;top:{}px;transform-origin:top left;transform:rotate({}deg);color:{};font:{}px ui-sans-serif, system-ui;text-shadow:0 1px 1px rgba(0,0,0,.35);",
                                x + vx, y + vy, rot, color, font_size.max(1.0)
                            );
                            if wv > 0.0 { style.push_str(&format!("width:{}px;", wv)); }
                            if hv > 0.0 { style.push_str(&format!("height:{}px;", hv)); }
                            set_attr(&el, "style", &style);
                        } else if !html.is_empty() {
                            reflect_set(&el, "innerHTML", &JsValue::from_str(&html));
                        } else if !text.is_empty() {
                            set_text(&el, &text);
                        }
                        if !(use_wgpu && kind == "text") {
                            let mut style = format!("position:absolute;left:{}px;top:{}px;transform-origin:top left;transform:rotate({}deg);", x + vx, y + vy, rot);
                            if wv > 0.0 { style.push_str(&format!("width:{}px;", wv)); }
                            if hv > 0.0 { style.push_str(&format!("height:{}px;", hv)); }
                            set_attr(&el, "style", &style);
                        }
                        append_child(&html_overlay2, &el);
                        let sel_el = query_selector(&el, "[data-rue-selected]");
                        if !sel_el.is_undefined() && !sel_el.is_null() {
                            let old = get_attribute(&sel_el, "style").unwrap_or_default();
                            let mut nstyle = old;
                            if !nstyle.is_empty() && !nstyle.ends_with(';') { nstyle.push(';'); }
                            nstyle.push_str("outline:2px solid #22d3ee;outline-offset:-2px;");
                            set_attr(&sel_el, "style", &nstyle);
                        }
                    }
                }
                if let Some(field) = active_field {
                    let sel = format!("[data-field=\"{}\"]", field);
                    let input = query_selector(&inspector2, &sel);
                    if !input.is_undefined() && !input.is_null() {
                        focus(&input);
                        set_selection_to_end(&input);
                    }
                }
            }) as Box<dyn FnMut(JsValue, JsValue)>,
        );
        let handler_fn: Function = cb.as_ref().clone().unchecked_into();
        let opts = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &opts,
            &JsValue::from_str("immediate"),
            &JsValue::from_bool(true),
        );
        let _eh = watch_signal(&s_version, handler_fn, Some(opts.into()));
        cb.forget();
    }

    {
        render_pages(&document, &pages_panel, &state_sig, &state, &rerender);
        render_list(&document, &list, &state_sig, &state, &rerender);
        render_inspector(&document, &inspector, &state_sig, &state, &rerender);
        {
            let mut cw = reflect_get(&canvas_wrap, "clientWidth").as_f64().unwrap_or(0.0);
            let mut ch = reflect_get(&canvas_wrap, "clientHeight").as_f64().unwrap_or(0.0);
            if cw <= 0.0 { cw = w; }
            if ch <= 0.0 { ch = h; }
            reflect_set(&canvas, "width", &JsValue::from_f64(cw));
            reflect_set(&canvas, "height", &JsValue::from_f64(ch));
            canvas::draw_webgpu(&canvas, cw, ch, &state_sig);
        }
        {
            let ro = reflect_get(&js_sys::global(), "ResizeObserver");
            if ro.is_function() {
                let ro_ctor = ro.dyn_into::<js_sys::Function>().ok();
                if let Some(ro_ctor) = ro_ctor {
                    let cw2 = canvas_wrap.clone();
                    let c2 = canvas.clone();
                    let st2 = state_sig.clone();
                    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move |_e: JsValue| {
                        let mut cw = reflect_get(&cw2, "clientWidth").as_f64().unwrap_or(0.0);
                        let mut ch = reflect_get(&cw2, "clientHeight").as_f64().unwrap_or(0.0);
                        if cw <= 0.0 { cw = w; }
                        if ch <= 0.0 { ch = h; }
                        if cw > 0.0 && ch > 0.0 {
                            reflect_set(&c2, "width", &JsValue::from_f64(cw));
                            reflect_set(&c2, "height", &JsValue::from_f64(ch));
                            canvas::draw_webgpu(&c2, cw, ch, &st2);
                        }
                    }) as Box<dyn FnMut(JsValue)>);
                    let args = js_sys::Array::new();
                    args.push(cb.as_ref().unchecked_ref());
                    if let Ok(observer) = js_sys::Reflect::construct(&ro_ctor, &args) {
                        if let Ok(observe) = reflect_get(&observer, "observe").dyn_into::<js_sys::Function>() {
                            let _ = observe.call1(&observer, &canvas_wrap);
                        }
                    }
                    cb.forget();
                }
            }
        }
        reflect_set(&html_overlay, "innerHTML", &JsValue::from_str(""));
        {
            let vx = state_sig.get_path_js(JsValue::from_str("viewport.offset_x")).as_f64().unwrap_or(0.0);
            let vy = state_sig.get_path_js(JsValue::from_str("viewport.offset_y")).as_f64().unwrap_or(0.0);
            let use_wgpu = state_sig.get_path_js(JsValue::from_str("use_webgpu")).as_bool().unwrap_or(false);
            let cur_page = state_sig.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
            let layers = js_sys::Array::from(&state_sig.get_path_js(JsValue::from_str("layers")));
            for i in 0..layers.length() {
                let l = layers.get(i);
                let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
                if !vis { continue; }
                let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
                if pid != cur_page { continue; }
                let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
                if kind != "html" && !(use_wgpu && kind == "text") { continue; }
                let tag = js_sys::Reflect::get(&l, &JsValue::from_str("tag")).unwrap_or(JsValue::from_str("div")).as_string().unwrap_or("div".to_string());
                let class = js_sys::Reflect::get(&l, &JsValue::from_str("class")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
                let text = js_sys::Reflect::get(&l, &JsValue::from_str("text")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
                let x = js_sys::Reflect::get(&l, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let y = js_sys::Reflect::get(&l, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let wv = js_sys::Reflect::get(&l, &JsValue::from_str("w")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let hv = js_sys::Reflect::get(&l, &JsValue::from_str("h")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let rot = js_sys::Reflect::get(&l, &JsValue::from_str("rotation")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let el = if use_wgpu && kind == "text" {
                    create_element(&document, "span")
                } else {
                    create_element(&document, &tag)
                };
                if !class.is_empty() { set_class(&el, &class); }
                if use_wgpu && kind == "text" {
                    let color = js_sys::Reflect::get(&l, &JsValue::from_str("color")).unwrap_or(JsValue::from_str("#000000")).as_string().unwrap_or("#000000".to_string());
                    let font_size = js_sys::Reflect::get(&l, &JsValue::from_str("font_size")).unwrap_or(JsValue::from_f64(16.0)).as_f64().unwrap_or(16.0);
                    set_text(&el, &text);
                    let mut style = format!(
                        "position:absolute;left:{}px;top:{}px;transform-origin:top left;transform:rotate({}deg);color:{};font:{}px ui-sans-serif, system-ui;text-shadow:0 1px 1px rgba(0,0,0,.35);",
                        x + vx, y + vy, rot, color, font_size.max(1.0)
                    );
                    if wv > 0.0 { style.push_str(&format!("width:{}px;", wv)); }
                    if hv > 0.0 { style.push_str(&format!("height:{}px;", hv)); }
                    set_attr(&el, "style", &style);
                } else if !text.is_empty() { set_text(&el, &text); }
                if !(use_wgpu && kind == "text") {
                    let mut style = format!("position:absolute;left:{}px;top:{}px;transform-origin:top left;transform:rotate({}deg);", x + vx, y + vy, rot);
                    if wv > 0.0 { style.push_str(&format!("width:{}px;", wv)); }
                    if hv > 0.0 { style.push_str(&format!("height:{}px;", hv)); }
                    set_attr(&el, "style", &style);
                }
                append_child(&html_overlay, &el);
            }
        }
    }

    {
        let mut handlers_mut = state.borrow_mut();


        let rerender_add_rect = rerender.clone();
        let state_sig2 = state_sig.clone();
        let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
            let next_id = state_sig2.get_path_js(JsValue::from_str("next_id")).as_f64().unwrap_or(1.0);
            let id = next_id as u32;
            state_sig2.set_path_js(JsValue::from_str("next_id"), JsValue::from_f64((id + 1) as f64));
            let x = 50.0 + (id as f64 * 17.0) % (w * 0.45);
            let y = 40.0 + (id as f64 * 23.0) % (h * 0.45);
            let layer = {
                let o = object_new();
                object_set(&o, "id", &JsValue::from_f64(id as f64));
                object_set(&o, "name", &JsValue::from_str(&format!("Rect {}", id)));
                object_set(&o, "visible", &JsValue::from_bool(true));
                object_set(&o, "kind", &JsValue::from_str("rect"));
                object_set(&o, "x", &JsValue::from_f64(clamp(x, 12.0, w - 120.0)));
                object_set(&o, "y", &JsValue::from_f64(clamp(y, 12.0, h - 90.0)));
                object_set(&o, "w", &JsValue::from_f64(160.0));
                object_set(&o, "h", &JsValue::from_f64(110.0));
                object_set(&o, "color", &JsValue::from_str(&format!("{}{}", palette_color(id), "cc")));
                object_set(&o, "text", &JsValue::from_str(""));
                object_set(&o, "font_size", &JsValue::from_f64(0.0));
                object_set(&o, "rotation", &JsValue::from_f64(0.0));
                let cp = state_sig2.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                object_set(&o, "page_id", &JsValue::from_f64(cp));
                o
            };
            let cur_layers = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("layers")));
            let new_layers = array_new();
            let len = cur_layers.length();
            for i in 0..len {
                array_push(&new_layers, &cur_layers.get(i));
            }
            array_push(&new_layers, &layer);
            state_sig2.set_path_js(JsValue::from_str("layers"), new_layers.into());
            state_sig2.set_path_js(JsValue::from_str("selected"), JsValue::from_f64(id as f64));
            rerender_add_rect();
        }) as Box<dyn FnMut(JsValue)>);
        set_onclick(&btn_add_rect, &cb);
        handlers_mut.ui_handlers.push(cb);

        let rerender_add_text = rerender.clone();
        let state_sig3 = state_sig.clone();
        let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                let next_id = state_sig3.get_path_js(JsValue::from_str("next_id")).as_f64().unwrap_or(1.0);
                let id = next_id as u32;
                state_sig3.set_path_js(JsValue::from_str("next_id"), JsValue::from_f64((id + 1) as f64));
                let x = 70.0 + (id as f64 * 19.0) % (w * 0.55);
                let y = 70.0 + (id as f64 * 29.0) % (h * 0.55);
                let layer = {
                    let o = object_new();
                    object_set(&o, "id", &JsValue::from_f64(id as f64));
                    object_set(&o, "name", &JsValue::from_str(&format!("Text {}", id)));
                    object_set(&o, "visible", &JsValue::from_bool(true));
                    object_set(&o, "kind", &JsValue::from_str("text"));
                    object_set(&o, "x", &JsValue::from_f64(clamp(x, 12.0, w - 140.0)));
                    object_set(&o, "y", &JsValue::from_f64(clamp(y, 24.0, h - 24.0)));
                    object_set(&o, "w", &JsValue::from_f64(180.0));
                    object_set(&o, "h", &JsValue::from_f64(0.0));
                    object_set(&o, "color", &JsValue::from_str("#000000"));
                    object_set(&o, "text", &JsValue::from_str(&format!("Rue {}", id)));
                    object_set(&o, "font_size", &JsValue::from_f64(16.0));
                    object_set(&o, "rotation", &JsValue::from_f64(0.0));
                    let cp = state_sig3.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                    object_set(&o, "page_id", &JsValue::from_f64(cp));
                    o
                };
                let cur_layers = js_sys::Array::from(&state_sig3.get_path_js(JsValue::from_str("layers")));
                let new_layers = array_new();
                let len = cur_layers.length();
                for i in 0..len {
                    array_push(&new_layers, &cur_layers.get(i));
                }
                array_push(&new_layers, &layer);
                state_sig3.set_path_js(JsValue::from_str("layers"), new_layers.into());
                state_sig3.set_path_js(JsValue::from_str("selected"), JsValue::from_f64(id as f64));
            rerender_add_text();
        }) as Box<dyn FnMut(JsValue)>);
        set_onclick(&btn_add_text, &cb);
        handlers_mut.ui_handlers.push(cb);

        let rerender_add_html = rerender.clone();
        let state_sig4 = state_sig.clone();
        let cb_html = Closure::wrap(Box::new(move |_ev: JsValue| {
            let next_id = state_sig4.get_path_js(JsValue::from_str("next_id")).as_f64().unwrap_or(1.0);
            let id = next_id as u32;
            state_sig4.set_path_js(JsValue::from_str("next_id"), JsValue::from_f64((id + 1) as f64));
            let x = 80.0 + (id as f64 * 21.0) % (w * 0.55);
            let y = 80.0 + (id as f64 * 27.0) % (h * 0.55);
            let layer = {
                let o = object_new();
                object_set(&o, "id", &JsValue::from_f64(id as f64));
                object_set(&o, "name", &JsValue::from_str(&format!("HTML {}", id)));
                object_set(&o, "visible", &JsValue::from_bool(true));
                object_set(&o, "kind", &JsValue::from_str("html"));
                object_set(&o, "tag", &JsValue::from_str("div"));
                object_set(&o, "class", &JsValue::from_str("grid gap-4 xl:grid-cols-4 xl:grid-rows-2"));
                object_set(&o, "text", &JsValue::from_str(""));
                object_set(&o, "html", &JsValue::from_str("<div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-primary\"><p class=\"text-neutral-50\">Primary (#3B71CA)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-secondary\"><p class=\"text-neutral-50\">Secondary (#9FA6B2)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-success\"><p class=\"text-neutral-50\">Success (#14A44D)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-danger\"><p class=\"text-neutral-50\">Danger (#DC4C64)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-warning\"><p class=\"text-neutral-50\">Warning (#E4A11B)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-info\"><p class=\"text-neutral-50\">Info (#54B4D3)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-neutral-50\"><p class=\"text-neutral-800\">Light (#F9FAFB)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-neutral-800 dark:bg-neutral-900\"><p class=\"text-neutral-50\">Dark (#1F2937)</p></div>"));
                object_set(&o, "x", &JsValue::from_f64(clamp(x, 12.0, w - 560.0)));
                object_set(&o, "y", &JsValue::from_f64(clamp(y, 24.0, h - 320.0)));
                object_set(&o, "w", &JsValue::from_f64(560.0));
                object_set(&o, "h", &JsValue::from_f64(320.0));
                object_set(&o, "rotation", &JsValue::from_f64(0.0));
                let cp = state_sig4.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                object_set(&o, "page_id", &JsValue::from_f64(cp));
                o
            };
            let cur_layers = js_sys::Array::from(&state_sig4.get_path_js(JsValue::from_str("layers")));
            let new_layers = array_new();
            let len = cur_layers.length();
            for i in 0..len {
                array_push(&new_layers, &cur_layers.get(i));
            }
            array_push(&new_layers, &layer);
            state_sig4.set_path_js(JsValue::from_str("layers"), new_layers.into());
            state_sig4.set_path_js(JsValue::from_str("selected"), JsValue::from_f64(id as f64));
            rerender_add_html();
        }) as Box<dyn FnMut(JsValue)>);
        set_onclick(&btn_add_html, &cb_html);
        handlers_mut.ui_handlers.push(cb_html);

        // 已移除通用按钮：上移

        // 已移除通用按钮：下移

        // 已移除通用按钮：显隐

        {
            let state_sig2 = state_sig.clone();
            let html_overlay2 = html_overlay.clone();
            let s_version2 = s_version.clone();
            let cb = Closure::wrap(Box::new(move |ev: JsValue| {
                let pick = state_sig2.get_path_js(JsValue::from_str("html_pick_mode")).as_bool().unwrap_or(false);
                if !pick { return; }
                let cur_page = state_sig2.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                let target = js_sys::Reflect::get(&ev, &JsValue::from_str("target")).unwrap_or(JsValue::UNDEFINED);
                if target.is_undefined() || target.is_null() { return; }
                let closest = reflect_get(&target, "closest").dyn_into::<Function>().ok();
                if closest.is_none() { return; }
                let f: Function = closest.unwrap();
                let container = f.call1(&target, &JsValue::from_str("[data-layer-id]")).unwrap_or(JsValue::UNDEFINED);
                if container.is_undefined() || container.is_null() { return; }
                let lid = get_attribute(&container, "data-layer-id").and_then(|s| s.parse::<f64>().ok()).unwrap_or(-1.0);
                if lid < 0.0 { return; }
                let layers = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("layers")));
                let mut idx: Option<usize> = None;
                for i in 0..layers.length() {
                    let l = layers.get(i);
                    let idv = js_sys::Reflect::get(&l, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED).as_f64().unwrap_or(-1.0);
                    let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
                    let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
                    if idv == lid && pid == cur_page && kind == "html" { idx = Some(i as usize); break; }
                }
                if idx.is_none() { return; }
                let idxn = idx.unwrap();
                // clear previous selection
                let query_all = reflect_get(&container, "querySelectorAll").dyn_into::<Function>().unwrap();
                let list = query_all.call1(&container, &JsValue::from_str("[data-rue-selected]")).unwrap_or(JsValue::UNDEFINED);
                if !list.is_undefined() && !list.is_null() {
                    let len = js_sys::Reflect::get(&list, &JsValue::from_str("length")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as i32;
                    let itemf = js_sys::Reflect::get(&list, &JsValue::from_str("item")).unwrap_or(JsValue::UNDEFINED).dyn_into::<Function>().ok();
                    if let Some(it) = itemf {
                        for i in 0..len {
                            let el = it.call1(&list, &JsValue::from_f64(i as f64)).unwrap_or(JsValue::UNDEFINED);
                            if !el.is_undefined() && !el.is_null() {
                                let remove_attr = reflect_get(&el, "removeAttribute").dyn_into::<Function>().unwrap();
                                let _ = remove_attr.call1(&el, &JsValue::from_str("data-rue-selected"));
                            }
                        }
                    }
                }
                let set_attr_f = reflect_get(&target, "setAttribute").dyn_into::<Function>().ok();
                if let Some(sf) = set_attr_f {
                    let _ = sf.call2(&target, &JsValue::from_str("data-rue-selected"), &JsValue::from_str("1"));
                }
                let inner = reflect_get(&container, "innerHTML");
                let html_s = inner.as_string().unwrap_or_default();
                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.html", idxn)), JsValue::from_str(&html_s));
                state_sig2.set_path_js(JsValue::from_str("selected"), JsValue::from_f64(lid));
                let cur = s_version2.get_js().as_f64().unwrap_or(0.0);
                s_version2.set_js(JsValue::from_f64(cur + 1.0));
            }) as Box<dyn FnMut(JsValue)>);
            reflect_set(&html_overlay2, "onclick", cb.as_ref());
            handlers_mut.ui_handlers.push(cb);
        }

        {}
    }

    {
        let state_sig2 = state_sig.clone();
        let rerender2 = rerender.clone();
        let drag = Rc::new(RefCell::new((false, 0.0f64, 0.0f64, 0.0f64, 0.0f64, 0u32)));
        let drag_multi_orig = Rc::new(RefCell::new(Vec::<(u32, f64, f64)>::new()));
        let transform_mode = Rc::new(RefCell::new(None::<(String, u32, f64, f64, f64, f64, f64, f64)>));
        let canvas2 = canvas.clone();
        let on_down = {
            let drag = drag.clone();
            let drag_multi_orig_d = drag_multi_orig.clone();
            let transform_mode_d = transform_mode.clone();
            let state_sig2 = state_sig2.clone();
            let rerender2 = rerender2.clone();
            let cv = canvas2.clone();
            let dragging_d = dragging.clone();
            let panning_d = panning.clone();
            Closure::wrap(Box::new(move |ev: JsValue| {
                let get_rect = reflect_get(&cv, "getBoundingClientRect").dyn_into::<Function>().unwrap();
                let rect = get_rect.call0(&cv).unwrap_or(JsValue::UNDEFINED);
                let left = js_sys::Reflect::get(&rect, &JsValue::from_str("left")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let top = js_sys::Reflect::get(&rect, &JsValue::from_str("top")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let cx = js_sys::Reflect::get(&ev, &JsValue::from_str("clientX")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - left;
                let cy = js_sys::Reflect::get(&ev, &JsValue::from_str("clientY")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - top;
                    let vx = state_sig2.get_path_js(JsValue::from_str("viewport.offset_x")).as_f64().unwrap_or(0.0);
                    let vy = state_sig2.get_path_js(JsValue::from_str("viewport.offset_y")).as_f64().unwrap_or(0.0);
                    let cur_page = state_sig2.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                    let layers = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("layers")));
                    // 如果当前有选中且为矩形，先检测旋转/缩放手柄
                    if let Some(sel_id) = state_sig2.get_path_js(JsValue::from_str("selected")).as_f64() {
                        for i in (0..layers.length()).rev() {
                            let l = layers.get(i);
                            let idv = js_sys::Reflect::get(&l, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED).as_f64().unwrap_or(-1.0);
                            if idv != sel_id { continue; }
                            let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
                            if !vis { break; }
                            let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
                            if pid != cur_page { break; }
                            let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
                            if kind != "rect" && kind != "text" { break; }
                            let x = js_sys::Reflect::get(&l, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                            let y = js_sys::Reflect::get(&l, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                            let mut w = js_sys::Reflect::get(&l, &JsValue::from_str("w")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                            let mut h = js_sys::Reflect::get(&l, &JsValue::from_str("h")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                            if kind == "text" {
                                let fs = js_sys::Reflect::get(&l, &JsValue::from_str("font_size")).unwrap_or(JsValue::from_f64(16.0)).as_f64().unwrap_or(16.0);
                                w = w.max(120.0);
                                h = if h > 0.0 { h } else { (fs + 10.0).max(16.0) };
                            }
                            let rot = js_sys::Reflect::get(&l, &JsValue::from_str("rotation")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                            let rx = x + vx;
                            let ry = y + vy;
                            let cx_box = rx + w * 0.5;
                            let cy_box = ry + h * 0.5;
                            let rot_handle_x = cx_box;
                            let rot_handle_y = ry - 12.0;
                            let dist = ((cx - rot_handle_x).powi(2) + (cy - rot_handle_y).powi(2)).sqrt();
                            if dist <= 10.0 {
                                let start_ang = (cy - cy_box).atan2(cx - cx_box);
                                *transform_mode_d.borrow_mut() = Some(("rotate".to_string(), i, x, y, w, h, rot, start_ang));
                                return;
                            }
                            let hs = 6.0;
                            let in_sq = |px: f64, py: f64| -> bool {
                                cx >= px - hs && cx <= px + hs && cy >= py - hs && cy <= py + hs
                            };
                            let pts = [
                                ("se", rx + w, ry + h),
                                ("s", rx + w * 0.5, ry + h),
                                ("e", rx + w, ry + h * 0.5),
                                ("nw", rx, ry),
                                ("n", rx + w * 0.5, ry),
                                ("w", rx, ry + h * 0.5),
                            ];
                            for (mode, px, py) in pts {
                                if in_sq(px, py) {
                                    *transform_mode_d.borrow_mut() = Some((mode.to_string(), i, x, y, w, h, rot, 0.0));
                                    return;
                                }
                            }
                            break;
                        }
                    }
                    // 命中测试：从顶层往下找当前页面可见图层的包围盒
                    let mut hit_idx: Option<u32> = None;
                    for i in (0..layers.length()).rev() {
                        let l = layers.get(i);
                        let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
                        if !vis { continue; }
                        let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
                        if pid != cur_page { continue; }
                        let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
                        let x = js_sys::Reflect::get(&l, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let y = js_sys::Reflect::get(&l, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let mut w = js_sys::Reflect::get(&l, &JsValue::from_str("w")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let mut h = js_sys::Reflect::get(&l, &JsValue::from_str("h")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        if kind == "text" {
                            w = w.max(120.0);
                            h = 26.0;
                        }
                        let rx = x + vx;
                        let ry = y + vy;
                        if cx >= rx && cx <= rx + w && cy >= ry && cy <= ry + h {
                            hit_idx = Some(i);
                            break;
                        }
                    }
                    if let Some(i) = hit_idx {
                        // 设置选中并准备拖拽该元素
                        let l = layers.get(i);
                        let idv = js_sys::Reflect::get(&l, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED).as_f64().unwrap_or(-1.0);
                        if idv >= 0.0 {
                            state_sig2.set_path_js(JsValue::from_str("selected"), JsValue::from_f64(idv));
                        }
                        let ox = js_sys::Reflect::get(&l, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let oy = js_sys::Reflect::get(&l, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                        let mut d = drag.borrow_mut();
                        d.0 = true;
                        d.1 = cx - vx;
                        d.2 = cy - vy;
                        d.3 = ox;
                        d.4 = oy;
                        d.5 = i;
                        *dragging_d.borrow_mut() = true;
                        drag_multi_orig_d.borrow_mut().clear();
                        let selm = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("selected_multi")));
                        for j in 0..selm.length() {
                            let idm = selm.get(j).as_f64().unwrap_or(-1.0);
                            for k in 0..layers.length() {
                                let lk = layers.get(k);
                                let idk = js_sys::Reflect::get(&lk, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED).as_f64().unwrap_or(-1.0);
                                if idk == idm {
                                    let kx = js_sys::Reflect::get(&lk, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                                    let ky = js_sys::Reflect::get(&lk, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                                    drag_multi_orig_d.borrow_mut().push((k, kx, ky));
                                    break;
                                }
                            }
                        }
                    } else {
                        // 背景拖拽：开始平移视口
                        *panning_d.borrow_mut() = Some((cx, cy, vx, vy));
                        *dragging_d.borrow_mut() = true;
                    }
                rerender2();
            }) as Box<dyn FnMut(JsValue)>)
        };
        let on_move = {
            let drag = drag.clone();
            let drag_multi_orig_m = drag_multi_orig.clone();
            let transform_mode_m = transform_mode.clone();
            let state_sig2 = state_sig2.clone();
            let cv = canvas2.clone();
            let rerender2 = rerender2.clone();
            let move_sched_m = move_scheduled.clone();
            let panning_m = panning.clone();
            Closure::wrap(Box::new(move |ev: JsValue| {
                if let Some((mode, idx, x0, y0, w0, h0, rot0, start_ang)) = transform_mode_m.borrow().clone() {
                    let get_rect = reflect_get(&cv, "getBoundingClientRect").dyn_into::<Function>().unwrap();
                    let rect = get_rect.call0(&cv).unwrap_or(JsValue::UNDEFINED);
                    let left = js_sys::Reflect::get(&rect, &JsValue::from_str("left")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                    let top = js_sys::Reflect::get(&rect, &JsValue::from_str("top")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                    let cx = js_sys::Reflect::get(&ev, &JsValue::from_str("clientX")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - left;
                    let cy = js_sys::Reflect::get(&ev, &JsValue::from_str("clientY")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - top;
                    let vx = state_sig2.get_path_js(JsValue::from_str("viewport.offset_x")).as_f64().unwrap_or(0.0);
                    let vy = state_sig2.get_path_js(JsValue::from_str("viewport.offset_y")).as_f64().unwrap_or(0.0);
                    if mode == "rotate" {
                        let cx_box = x0 + w0 * 0.5 + vx;
                        let cy_box = y0 + h0 * 0.5 + vy;
                        let ang = (cy - cy_box).atan2(cx - cx_box);
                        let delta = ang - start_ang;
                        let deg = rot0 + delta.to_degrees();
                        state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.rotation", idx)), JsValue::from_f64(deg));
                    } else {
                        let mut nx = x0;
                        let mut ny = y0;
                        let mut nw = w0;
                        let mut nh = h0;
                        if mode.contains("e") {
                            nw = (cx - (x0 + vx)).max(8.0);
                        }
                        if mode.contains("s") {
                            nh = (cy - (y0 + vy)).max(8.0);
                        }
                        if mode.contains("w") {
                            let right = x0 + w0;
                            nx = (cx - vx).min(right - 8.0);
                            nw = (right - nx).max(8.0);
                        }
                        if mode.contains("n") {
                            let bottom = y0 + h0;
                            ny = (cy - vy).min(bottom - 8.0);
                            nh = (bottom - ny).max(8.0);
                        }
                        state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.x", idx)), JsValue::from_f64(nx));
                        state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.y", idx)), JsValue::from_f64(ny));
                        state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.w", idx)), JsValue::from_f64(nw));
                        state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.h", idx)), JsValue::from_f64(nh));
                    }
                    rerender2();
                    return;
                }
                if let Some((sx, sy, ovx, ovy)) = *panning_m.borrow() {
                    let get_rect = reflect_get(&cv, "getBoundingClientRect").dyn_into::<Function>().unwrap();
                    let rect = get_rect.call0(&cv).unwrap_or(JsValue::UNDEFINED);
                    let left = js_sys::Reflect::get(&rect, &JsValue::from_str("left")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                    let top = js_sys::Reflect::get(&rect, &JsValue::from_str("top")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                    let cx = js_sys::Reflect::get(&ev, &JsValue::from_str("clientX")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - left;
                    let cy = js_sys::Reflect::get(&ev, &JsValue::from_str("clientY")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - top;
                    let nx = ovx + (cx - sx);
                    let ny = ovy + (cy - sy);
                    state_sig2.set_path_js(JsValue::from_str("viewport.offset_x"), JsValue::from_f64(nx));
                    state_sig2.set_path_js(JsValue::from_str("viewport.offset_y"), JsValue::from_f64(ny));
                    if !*move_sched_m.borrow() {
                        *move_sched_m.borrow_mut() = true;
                        let rer = rerender2.clone();
                        let move_sched_m2 = move_sched_m.clone();
                        let tm = wasm_bindgen::closure::Closure::wrap(Box::new(move |_t: JsValue| {
                            *move_sched_m2.borrow_mut() = false;
                            rer();
                        }) as Box<dyn FnMut(JsValue)>);
                        utils::set_timeout(&tm, 16);
                        tm.forget();
                    }
                    return;
                }
                let d = drag.borrow();
                if !d.0 { return; }
                let get_rect = reflect_get(&cv, "getBoundingClientRect").dyn_into::<Function>().unwrap();
                let rect = get_rect.call0(&cv).unwrap_or(JsValue::UNDEFINED);
                let left = js_sys::Reflect::get(&rect, &JsValue::from_str("left")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let top = js_sys::Reflect::get(&rect, &JsValue::from_str("top")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let cx = js_sys::Reflect::get(&ev, &JsValue::from_str("clientX")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - left;
                let cy = js_sys::Reflect::get(&ev, &JsValue::from_str("clientY")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - top;
                let vx = state_sig2.get_path_js(JsValue::from_str("viewport.offset_x")).as_f64().unwrap_or(0.0);
                let vy = state_sig2.get_path_js(JsValue::from_str("viewport.offset_y")).as_f64().unwrap_or(0.0);
                let dx = (cx - vx) - d.1;
                let dy = (cy - vy) - d.2;
                for (k, ox, oy) in drag_multi_orig_m.borrow().iter() {
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.x", k)), JsValue::from_f64(ox + dx));
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.y", k)), JsValue::from_f64(oy + dy));
                }
                if !*move_sched_m.borrow() {
                    *move_sched_m.borrow_mut() = true;
                    let rer = rerender2.clone();
                    let move_sched_m2 = move_sched_m.clone();
                    let tm = wasm_bindgen::closure::Closure::wrap(Box::new(move |_t: JsValue| {
                        *move_sched_m2.borrow_mut() = false;
                        rer();
                    }) as Box<dyn FnMut(JsValue)>);
                    utils::set_timeout(&tm, 16);
                    tm.forget();
                }
            }) as Box<dyn FnMut(JsValue)>)
        };
        let on_up = {
            let drag = drag.clone();
            let transform_mode_u = transform_mode.clone();
            let dragging_u = dragging.clone();
            let rerender_u = rerender.clone();
            let panning_u = panning.clone();
            Closure::wrap(Box::new(move |_ev: JsValue| {
                let mut d = drag.borrow_mut();
                d.0 = false;
                *transform_mode_u.borrow_mut() = None;
                *dragging_u.borrow_mut() = false;
                *panning_u.borrow_mut() = None;
                rerender_u();
            }) as Box<dyn FnMut(JsValue)>)
        };
        let on_click = {
            let state_sig2 = state_sig.clone();
            let cv = canvas.clone();
            let rerender2 = rerender.clone();
            Closure::wrap(Box::new(move |ev: JsValue| {
                let get_rect = reflect_get(&cv, "getBoundingClientRect").dyn_into::<Function>().unwrap();
                let rect = get_rect.call0(&cv).unwrap_or(JsValue::UNDEFINED);
                let left = js_sys::Reflect::get(&rect, &JsValue::from_str("left")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let top = js_sys::Reflect::get(&rect, &JsValue::from_str("top")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                let cx = js_sys::Reflect::get(&ev, &JsValue::from_str("clientX")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - left;
                let cy = js_sys::Reflect::get(&ev, &JsValue::from_str("clientY")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) - top;
                let vx = state_sig2.get_path_js(JsValue::from_str("viewport.offset_x")).as_f64().unwrap_or(0.0);
                let vy = state_sig2.get_path_js(JsValue::from_str("viewport.offset_y")).as_f64().unwrap_or(0.0);
                let shift = js_sys::Reflect::get(&ev, &JsValue::from_str("shiftKey")).unwrap_or(JsValue::from_bool(false)).as_bool().unwrap_or(false);
                // 命中选择（支持 Shift 多选）
                let cur_page = state_sig2.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                let layers = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("layers")));
                let mut hit_id: Option<f64> = None;
                for i in (0..layers.length()).rev() {
                    let l = layers.get(i);
                    let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
                    if !vis { continue; }
                    let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
                    if pid != cur_page { continue; }
                    let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
                    let x = js_sys::Reflect::get(&l, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                    let y = js_sys::Reflect::get(&l, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                    let mut w = js_sys::Reflect::get(&l, &JsValue::from_str("w")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                    let mut h = js_sys::Reflect::get(&l, &JsValue::from_str("h")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0);
                    if kind == "text" {
                        let fs = js_sys::Reflect::get(&l, &JsValue::from_str("font_size")).unwrap_or(JsValue::from_f64(16.0)).as_f64().unwrap_or(16.0);
                        w = w.max(120.0);
                        h = if h > 0.0 { h } else { (fs + 10.0).max(16.0) };
                    }
                    let rx = x + vx;
                    let ry = y + vy;
                    if cx >= rx && cx <= rx + w && cy >= ry && cy <= ry + h {
                        hit_id = js_sys::Reflect::get(&l, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED).as_f64();
                        break;
                    }
                }
                if let Some(idf) = hit_id {
                    if shift {
                        let selm = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("selected_multi")));
                        // 如果已存在则移除，否则添加
                        let mut exists = false;
                        for i in 0..selm.length() {
                            if selm.get(i).as_f64().unwrap_or(-1.0) == idf {
                                exists = true;
                                break;
                            }
                        }
                        let newm = array_new();
                        if exists {
                            for i in 0..selm.length() {
                                if selm.get(i).as_f64().unwrap_or(-1.0) != idf {
                                    array_push(&newm, &selm.get(i));
                                }
                            }
                        } else {
                            for i in 0..selm.length() { array_push(&newm, &selm.get(i)); }
                            array_push(&newm, &JsValue::from_f64(idf));
                        }
                        state_sig2.set_path_js(JsValue::from_str("selected_multi"), newm.into());
                        // 主选中仍设置为最后命中的
                        state_sig2.set_path_js(JsValue::from_str("selected"), JsValue::from_f64(idf));
                    } else {
                        state_sig2.set_path_js(JsValue::from_str("selected"), JsValue::from_f64(idf));
                        let selm = array_new();
                        array_push(&selm, &JsValue::from_f64(idf));
                        state_sig2.set_path_js(JsValue::from_str("selected_multi"), selm.into());
                    }
                }
                rerender2();
            }) as Box<dyn FnMut(JsValue)>)
        };
        reflect_set(&canvas, "onmousedown", on_down.as_ref());
        reflect_set(&canvas, "onmousemove", on_move.as_ref());
        reflect_set(&canvas, "onmouseup", on_up.as_ref());
        reflect_set(&canvas, "onclick", on_click.as_ref());
        {
            let mut hm = state.borrow_mut();
            hm.ui_handlers.push(on_down);
            hm.ui_handlers.push(on_move);
            hm.ui_handlers.push(on_up);
            hm.ui_handlers.push(on_click);
        }
    }

    let out = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&out, &JsValue::from_str("vaporElement"), &root);
    out.into()
}
