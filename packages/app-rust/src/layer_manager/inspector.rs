use rue_runtime_vapor::SignalHandle;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsValue;

use crate::layer_manager::utils::*;

pub fn render_inspector(
    document: &JsValue,
    inspector: &JsValue,
    state_sig: &SignalHandle,
    handlers: &Rc<RefCell<State>>,
    rerender: &Rc<dyn Fn()>,
) {
    reflect_set(inspector, "innerHTML", &JsValue::from_str(""));
    {
        let mut h = handlers.borrow_mut();
        h.inspector_handlers.clear();
    }
    let selected = state_sig.get_path_js(JsValue::from_str("selected")).as_f64();
    if selected.is_none() {
        let tip = create_element(document, "div");
        set_class(&tip, "text-sm text-base-content/60");
        set_text(&tip, "未选中图层");
        append_child(inspector, &tip);
        return;
    }
    let sel_id = selected.unwrap() as f64;
    let layers = js_sys::Array::from(&state_sig.get_path_js(JsValue::from_str("layers")));
    let len = layers.length();
    let mut layer_obj: Option<JsValue> = None;
    let mut layer_idx: usize = 0;
    for i in 0..len {
        let l = layers.get(i);
        let idv = js_sys::Reflect::get(&l, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED);
        if idv.as_f64().unwrap_or(-1.0) == sel_id {
            let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
            if vis {
                layer_obj = Some(l);
                layer_idx = i as usize;
            }
            break;
        }
    }
    if layer_obj.is_none() {
        let tip = create_element(document, "div");
        set_class(&tip, "text-sm text-base-content/60");
        set_text(&tip, "未选中图层");
        append_child(inspector, &tip);
        return;
    }
    let layer = layer_obj.unwrap();
    let title = create_element(document, "div");
    set_class(&title, "font-semibold mb-2");
    set_text(
        &title,
        &format!(
            "{} 属性",
            match js_sys::Reflect::get(&layer, &JsValue::from_str("kind"))
                .unwrap_or(JsValue::from_str(""))
                .as_string()
                .unwrap_or_default()
                .as_str()
            {
                "rect" => "形状",
                "html" => "HTML 元素",
                _ => "文本",
            }
        ),
    );
    append_child(inspector, &title);

    let form = create_element(document, "div");
    set_class(&form, "grid grid-cols-2 gap-2 items-center");

    let mk_row = |label_text: &str| {
        let lab = create_element(document, "label");
        set_class(&lab, "text-xs opacity-70");
        set_text(&lab, label_text);
        let input = create_element(document, "input");
        set_class(&input, "input input-xs input-bordered w-full");
        (lab, input)
    };

    let (lab_name, inp_name) = mk_row("名称");
    set_attr(&inp_name, "data-field", "name");
    let name_v = js_sys::Reflect::get(&layer, &JsValue::from_str("name")).unwrap_or(JsValue::from_str(""));
    reflect_set(&inp_name, "value", &name_v);
    append_child(&form, &lab_name);
    append_child(&form, &inp_name);
    {
        let state_sig2 = state_sig.clone();
        let handlers2 = handlers.clone();
        let rerender2 = rerender.clone();
        let inp2 = inp_name.clone();
        let idx2 = layer_idx;
        let cb = debounce(
            move |_ev: JsValue| {
                if let Some(v) = input_value(&inp2) {
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.name", idx2)), JsValue::from_str(&v));
                    rerender2();
                }
            },
            120,
        );
        set_oninput(&inp_name, &cb);
        handlers2.borrow_mut().inspector_handlers.push(cb);
    }

    let (lab_color, inp_color) = mk_row("颜色");
    set_attr(&inp_color, "data-field", "color");
    let color_v = js_sys::Reflect::get(&layer, &JsValue::from_str("color")).unwrap_or(JsValue::from_str("#ffffff"));
    reflect_set(&inp_color, "value", &color_v);
    let color_row = create_element(document, "div");
    set_class(&color_row, "flex items-center gap-2");
    let inp_color_picker = create_element(document, "input");
    set_attr(&inp_color_picker, "type", "color");
    set_class(&inp_color_picker, "w-8 h-6 p-0 border-none bg-transparent");
    // 默认将选择器的值设为 hex；如果当前是 rgba 这一步不精确，但保证可用
    reflect_set(&inp_color_picker, "value", &JsValue::from_str("#ffffff"));
    append_child(&color_row, &inp_color_picker);
    append_child(&color_row, &inp_color);
    append_child(&form, &lab_color);
    append_child(&form, &color_row);
    {
        let state_sig2 = state_sig.clone();
        let handlers2 = handlers.clone();
        let rerender2 = rerender.clone();
        let inp2 = inp_color.clone();
        let idx2 = layer_idx;
        let cb = debounce(
            move |_ev: JsValue| {
                if let Some(v) = input_value(&inp2) {
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.color", idx2)), JsValue::from_str(&v));
                    rerender2();
                }
            },
            120,
        );
        set_oninput(&inp_color, &cb);
        handlers2.borrow_mut().inspector_handlers.push(cb);
    }
    {
        let state_sig2 = state_sig.clone();
        let handlers2 = handlers.clone();
        let rerender2 = rerender.clone();
        let inp_text = inp_color.clone();
        let inp_picker2 = inp_color_picker.clone();
        let idx2 = layer_idx;
        let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
            if let Some(v) = input_value(&inp_picker2) {
                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.color", idx2)), JsValue::from_str(&v));
                reflect_set(&inp_text, "value", &JsValue::from_str(&v));
                rerender2();
            }
        }) as Box<dyn FnMut(JsValue)>);
        set_oninput(&inp_color_picker, &cb);
        handlers2.borrow_mut().inspector_handlers.push(cb);
    }
    // 预设调色板（参考常用 Tailwind 颜色）
    let palette = [
        "#ef4444", "#f59e0b", "#eab308", "#10b981", "#22d3ee", "#3b82f6", "#6366f1", "#a78bfa",
        "#f472b6", "#fb7185", "#111827", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb",
    ];
    let palette_row = create_element(document, "div");
    set_class(&palette_row, "col-span-2 flex flex-wrap gap-1 mt-1");
    append_child(&form, &palette_row);
    for hex in palette {
        let chip = create_element(document, "span");
        set_class(&chip, "w-4 h-4 rounded ring-1 ring-base-300 cursor-pointer");
        set_attr(&chip, "title", hex);
        set_attr(&chip, "style", &format!("background: {};", hex));
        {
            let state_sig2 = state_sig.clone();
            let rerender2 = rerender.clone();
            let inp_text = inp_color.clone();
            let inp_picker2 = inp_color_picker.clone();
            let idx2 = layer_idx;
            let hex_s = hex.to_string();
            let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.color", idx2)), JsValue::from_str(&hex_s));
                reflect_set(&inp_text, "value", &JsValue::from_str(&hex_s));
                reflect_set(&inp_picker2, "value", &JsValue::from_str(&hex_s));
                rerender2();
            }) as Box<dyn FnMut(JsValue)>);
            set_onclick(&chip, &cb);
            handlers.borrow_mut().inspector_handlers.push(cb);
        }
        append_child(&palette_row, &chip);
    }

    let (lab_x, inp_x) = mk_row("X 位置");
    set_attr(&inp_x, "data-field", "x");
    let x_v = js_sys::Reflect::get(&layer, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0));
    reflect_set(&inp_x, "value", &x_v);
    append_child(&form, &lab_x);
    append_child(&form, &inp_x);
    {
        let state_sig2 = state_sig.clone();
        let handlers2 = handlers.clone();
        let rerender2 = rerender.clone();
        let inp2 = inp_x.clone();
        let idx2 = layer_idx;
        let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
            if let Some(v) = input_value_f64(&inp2) {
                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.x", idx2)), JsValue::from_f64(v));
                rerender2();
            }
        }) as Box<dyn FnMut(JsValue)>);
        set_onchange(&inp_x, &cb);
        handlers2.borrow_mut().inspector_handlers.push(cb);
    }

    let (lab_y, inp_y) = mk_row("Y 位置");
    set_attr(&inp_y, "data-field", "y");
    let y_v = js_sys::Reflect::get(&layer, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0));
    reflect_set(&inp_y, "value", &y_v);
    append_child(&form, &lab_y);
    append_child(&form, &inp_y);
    {
        let state_sig2 = state_sig.clone();
        let handlers2 = handlers.clone();
        let rerender2 = rerender.clone();
        let inp2 = inp_y.clone();
        let idx2 = layer_idx;
        let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
            if let Some(v) = input_value_f64(&inp2) {
                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.y", idx2)), JsValue::from_f64(v));
                rerender2();
            }
        }) as Box<dyn FnMut(JsValue)>);
        set_onchange(&inp_y, &cb);
        handlers2.borrow_mut().inspector_handlers.push(cb);
    }

    let (lab_w, inp_w) = mk_row("宽度");
    set_attr(&inp_w, "data-field", "w");
    let w_v = js_sys::Reflect::get(&layer, &JsValue::from_str("w")).unwrap_or(JsValue::from_f64(0.0));
    reflect_set(&inp_w, "value", &w_v);
    append_child(&form, &lab_w);
    append_child(&form, &inp_w);
    {
        let state_sig2 = state_sig.clone();
        let handlers2 = handlers.clone();
        let rerender2 = rerender.clone();
        let inp2 = inp_w.clone();
        let idx2 = layer_idx;
        let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
            if let Some(v) = input_value_f64(&inp2) {
                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.w", idx2)), JsValue::from_f64(v));
                rerender2();
            }
        }) as Box<dyn FnMut(JsValue)>);
        set_onchange(&inp_w, &cb);
        handlers2.borrow_mut().inspector_handlers.push(cb);
    }

    let kind_str = js_sys::Reflect::get(&layer, &JsValue::from_str("kind")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
    if kind_str != "rect" && kind_str != "html" {
        let (lab_text, inp_text) = mk_row("文本");
        set_attr(&inp_text, "data-field", "text");
        let text_v = js_sys::Reflect::get(&layer, &JsValue::from_str("text")).unwrap_or(JsValue::from_str(""));
        reflect_set(&inp_text, "value", &text_v);
        append_child(&form, &lab_text);
        append_child(&form, &inp_text);
        {
            let state_sig2 = state_sig.clone();
            let handlers2 = handlers.clone();
            let rerender2 = rerender.clone();
            let inp2 = inp_text.clone();
            let idx2 = layer_idx;
            let cb = debounce(
                move |_ev: JsValue| {
                    if let Some(v) = input_value(&inp2) {
                        state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.text", idx2)), JsValue::from_str(&v));
                        rerender2();
                    }
                },
                120,
            );
            set_oninput(&inp_text, &cb);
            handlers2.borrow_mut().inspector_handlers.push(cb);
        }

        let (lab_fs, inp_fs) = mk_row("字号");
        set_attr(&inp_fs, "data-field", "font_size");
        let fs_v = js_sys::Reflect::get(&layer, &JsValue::from_str("font_size")).unwrap_or(JsValue::from_f64(16.0));
        reflect_set(&inp_fs, "value", &fs_v);
        append_child(&form, &lab_fs);
        append_child(&form, &inp_fs);
        {
            let state_sig2 = state_sig.clone();
            let handlers2 = handlers.clone();
            let rerender2 = rerender.clone();
            let inp2 = inp_fs.clone();
            let idx2 = layer_idx;
            let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                if let Some(v) = input_value_f64(&inp2) {
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.font_size", idx2)), JsValue::from_f64(v.max(1.0)));
                    rerender2();
                }
            }) as Box<dyn FnMut(JsValue)>);
            set_onchange(&inp_fs, &cb);
            handlers2.borrow_mut().inspector_handlers.push(cb);
        }
    }

    if kind_str == "html" {
        let lab_tag = create_element(document, "label");
        set_class(&lab_tag, "text-xs opacity-70");
        set_text(&lab_tag, "HTML标签");
        let sel_tag = create_element(document, "select");
        set_class(&sel_tag, "select select-xs select-bordered w-full");
        let tags = ["div","span","p","button"];
        let cur_tag = js_sys::Reflect::get(&layer, &JsValue::from_str("tag")).unwrap_or(JsValue::from_str("div")).as_string().unwrap_or("div".to_string());
        append_child(&form, &lab_tag);
        append_child(&form, &sel_tag);
        for t in tags {
            let opt = create_element(document, "option");
            set_text(&opt, t);
            if t == cur_tag.as_str() {
                set_attr(&opt, "selected", "true");
            }
            append_child(&sel_tag, &opt);
        }
        {
            let state_sig2 = state_sig.clone();
            let handlers2 = handlers.clone();
            let rerender2 = rerender.clone();
            let sel2 = sel_tag.clone();
            let idx2 = layer_idx;
            let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                if let Some(v) = input_value(&sel2) {
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.tag", idx2)), JsValue::from_str(&v));
                    rerender2();
                }
            }) as Box<dyn FnMut(JsValue)>);
            set_onchange(&sel_tag, &cb);
            handlers2.borrow_mut().inspector_handlers.push(cb);
        }

        let lab_class = create_element(document, "label");
        set_class(&lab_class, "text-xs opacity-70");
        set_text(&lab_class, "类名（Tailwind）");
        let inp_class = create_element(document, "input");
        set_class(&inp_class, "input input-xs input-bordered w-full");
        set_attr(&inp_class, "data-field", "class");
        let class_v = js_sys::Reflect::get(&layer, &JsValue::from_str("class")).unwrap_or(JsValue::from_str(""));
        reflect_set(&inp_class, "value", &class_v);
        append_child(&form, &lab_class);
        append_child(&form, &inp_class);
        {
            let state_sig2 = state_sig.clone();
            let handlers_blur = handlers.clone();
            let rerender2 = rerender.clone();
            let inp2 = inp_class.clone();
            let idx2 = layer_idx;
            let cb_blur = Closure::wrap(Box::new(move |_ev: JsValue| {
                if let Some(v) = input_value(&inp2) {
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.class", idx2)), JsValue::from_str(&v));
                    let rer = rerender2.clone();
                    let tm = Closure::wrap(Box::new(move |_t: JsValue| { rer(); }) as Box<dyn FnMut(JsValue)>);
                    set_timeout(&tm, 0);
                    handlers_blur.borrow_mut().inspector_handlers.push(tm);
                }
            }) as Box<dyn FnMut(JsValue)>);
            set_onblur(&inp_class, &cb_blur);
            handlers.borrow_mut().inspector_handlers.push(cb_blur);
        }
        {
            let state_sig2 = state_sig.clone();
            let handlers_inp = handlers.clone();
            let rerender2 = rerender.clone();
            let inp2 = inp_class.clone();
            let idx2 = layer_idx;
            let cb_inp = debounce(
                move |_ev: JsValue| {
                    if let Some(v) = input_value(&inp2) {
                        state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.class", idx2)), JsValue::from_str(&v));
                        rerender2();
                    }
                },
                150,
            );
            set_oninput(&inp_class, &cb_inp);
            handlers_inp.borrow_mut().inspector_handlers.push(cb_inp);
        }

        let classes_row = create_element(document, "div");
        set_class(&classes_row, "col-span-2 flex flex-wrap gap-1 mt-1");
        {
            let cur = js_sys::Reflect::get(&layer, &JsValue::from_str("class")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
            let tokens: Vec<&str> = cur.split_whitespace().filter(|t| !t.is_empty()).collect();
            for tk in tokens {
                let chip = create_element(document, "span");
                set_class(&chip, "inline-flex items-center gap-1 px-2 h-6 text-xs rounded bg-base-200");
                let txt = create_element(document, "span");
                set_text(&txt, tk);
                let btn = create_element(document, "button");
                set_class(&btn, "btn btn-ghost btn-xs px-1");
                set_text(&btn, "×");
                {
                    let state_sig2 = state_sig.clone();
                    let rerender2 = rerender.clone();
                    let tk2 = tk.to_string();
                    let idx2 = layer_idx;
                    let inp_class2 = inp_class.clone();
                    let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                        let cur = state_sig2.get_path_js(JsValue::from_str(&format!("layers.{}.class", idx2))).as_string().unwrap_or_default();
                        let mut out = Vec::<String>::new();
                        for t in cur.split_whitespace() {
                            if t != tk2 { out.push(t.to_string()); }
                        }
                        let newv = out.join(" ");
                        state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.class", idx2)), JsValue::from_str(&newv));
                        reflect_set(&inp_class2, "value", &JsValue::from_str(&newv));
                        rerender2();
                    }) as Box<dyn FnMut(JsValue)>);
                    set_onclick(&btn, &cb);
                    handlers.borrow_mut().inspector_handlers.push(cb);
                }
                append_child(&chip, &txt);
                append_child(&chip, &btn);
                append_child(&classes_row, &chip);
            }
        }
        append_child(&form, &classes_row);

        let presets_row = create_element(document, "div");
        set_class(&presets_row, "col-span-2 flex flex-wrap gap-1 mt-1");
        append_child(&form, &presets_row);
        let presets = [
            "text-xs","text-sm","text-base","text-lg","font-semibold","font-bold",
            "bg-base-100","bg-base-200","bg-base-300","p-1","p-2","p-3","px-2","py-2",
            "rounded","rounded-md","rounded-lg","shadow","shadow-md","shadow-lg",
            "flex","inline-flex","items-center","justify-center","gap-1","gap-2",
            "w-24","w-32","h-8","h-10","btn","btn-primary","btn-ghost",
        ];
        for cls in presets {
            let chip = create_element(document, "span");
            set_class(&chip, "px-2 h-6 text-xs rounded bg-base-200 cursor-pointer inline-flex items-center");
            set_text(&chip, cls);
            {
                let state_sig2 = state_sig.clone();
                let rerender2 = rerender.clone();
                let idx2 = layer_idx;
                let inp_class2 = inp_class.clone();
                let cls2 = cls.to_string();
                let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                    let cur = state_sig2.get_path_js(JsValue::from_str(&format!("layers.{}.class", idx2))).as_string().unwrap_or_default();
                    let mut toks: Vec<String> = cur.split_whitespace().filter(|t| !t.is_empty()).map(|t| t.to_string()).collect();
                    if !toks.iter().any(|t| t == &cls2) {
                        toks.push(cls2.clone());
                    }
                    let newv = toks.join(" ");
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.class", idx2)), JsValue::from_str(&newv));
                    reflect_set(&inp_class2, "value", &JsValue::from_str(&newv));
                    rerender2();
                }) as Box<dyn FnMut(JsValue)>);
                set_onclick(&chip, &cb);
                handlers.borrow_mut().inspector_handlers.push(cb);
            }
            append_child(&presets_row, &chip);
        }

        let tmpl_label = create_element(document, "label");
        set_class(&tmpl_label, "text-xs opacity-70 col-span-2 mt-2");
        set_text(&tmpl_label, "结构模板");
        append_child(&form, &tmpl_label);
        let tmpl_row = create_element(document, "div");
        set_class(&tmpl_row, "col-span-2 flex flex-wrap gap-1");
        append_child(&form, &tmpl_row);
        {
            let chip = create_element(document, "span");
            set_class(&chip, "px-2 h-6 text-xs rounded bg-base-200 cursor-pointer inline-flex items-center");
            set_text(&chip, "网格色块模板");
            let container_cls = "grid gap-4 xl:grid-cols-4 xl:grid-rows-2".to_string();
            let html_sample = "<div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-primary\"><p class=\"text-neutral-50\">Primary (#3B71CA)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-secondary\"><p class=\"text-neutral-50\">Secondary (#9FA6B2)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-success\"><p class=\"text-neutral-50\">Success (#14A44D)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-danger\"><p class=\"text-neutral-50\">Danger (#DC4C64)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-warning\"><p class=\"text-neutral-50\">Warning (#E4A11B)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-info\"><p class=\"text-neutral-50\">Info (#54B4D3)</p></div><div class=\"flex h-28 w-full items-center justify中心 rounded-lg bg-neutral-50\"><p class=\"text-neutral-800\">Light (#F9FAFB)</p></div><div class=\"flex h-28 w-full items-center justify-center rounded-lg bg-neutral-800 dark:bg-neutral-900\"><p class=\"text-neutral-50\">Dark (#1F2937)</p></div>".to_string();
            {
                let state_sig2 = state_sig.clone();
                let rerender2 = rerender.clone();
                let idx2 = layer_idx;
                let inp_class2 = inp_class.clone();
                let container_cls2 = container_cls.clone();
                let html_sample2 = html_sample.clone();
                let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.class", idx2)), JsValue::from_str(&container_cls2));
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.html", idx2)), JsValue::from_str(&html_sample2));
                    reflect_set(&inp_class2, "value", &JsValue::from_str(&container_cls2));
                    rerender2();
                }) as Box<dyn FnMut(JsValue)>);
                set_onclick(&chip, &cb);
                handlers.borrow_mut().inspector_handlers.push(cb);
            }
            append_child(&tmpl_row, &chip);
        }
        {
            let chip = create_element(document, "span");
            set_class(&chip, "px-2 h-6 text-xs rounded bg-base-200 cursor-pointer inline-flex items-center");
            set_text(&chip, "清空结构");
            {
                let state_sig2 = state_sig.clone();
                let rerender2 = rerender.clone();
                let idx2 = layer_idx;
                let inp_class2 = inp_class.clone();
                let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                    state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.html", idx2)), JsValue::from_str(""));
                    let cur = state_sig2.get_path_js(JsValue::from_str(&format!("layers.{}.class", idx2))).as_string().unwrap_or_default();
                    reflect_set(&inp_class2, "value", &JsValue::from_str(&cur));
                    rerender2();
                }) as Box<dyn FnMut(JsValue)>);
                set_onclick(&chip, &cb);
                handlers.borrow_mut().inspector_handlers.push(cb);
            }
            append_child(&tmpl_row, &chip);
        }

        {
            let state_sig2 = state_sig.clone();
            let handlers_key = handlers.clone();
            let rerender2 = rerender.clone();
            let inp2 = inp_class.clone();
            let idx2 = layer_idx;
            let cb_key = Closure::wrap(Box::new(move |ev: JsValue| {
                let kc = js_sys::Reflect::get(&ev, &JsValue::from_str("key")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
                if kc == "Enter" || kc == " " {
                    if let Some(v) = input_value(&inp2) {
                        let token = v.trim().to_string();
                        if !token.is_empty() {
                            let cur = state_sig2.get_path_js(JsValue::from_str(&format!("layers.{}.class", idx2))).as_string().unwrap_or_default();
                            let mut toks: Vec<String> = cur.split_whitespace().filter(|t| !t.is_empty()).map(|t| t.to_string()).collect();
                            if !toks.iter().any(|t| t == &token) {
                                toks.push(token.clone());
                            }
                            let newv = toks.join(" ");
                            state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.class", idx2)), JsValue::from_str(&newv));
                            reflect_set(&inp2, "value", &JsValue::from_str(""));
                            let rer = rerender2.clone();
                            let tm = Closure::wrap(Box::new(move |_t: JsValue| { rer(); }) as Box<dyn FnMut(JsValue)>);
                            set_timeout(&tm, 0);
                            handlers_key.borrow_mut().inspector_handlers.push(tm);
                        }
                    }
                }
            }) as Box<dyn FnMut(JsValue)>);
            set_onkeydown(&inp_class, &cb_key);
            handlers.borrow_mut().inspector_handlers.push(cb_key);
        }
        {
            let lab_html = create_element(document, "label");
            set_class(&lab_html, "text-xs opacity-70");
            set_text(&lab_html, "HTML 内容");
            let inp_html = create_element(document, "textarea");
            set_class(&inp_html, "textarea textarea-xs textarea-bordered w-full min-h-[100px]");
            set_attr(&inp_html, "data-field", "html");
            let html_v = js_sys::Reflect::get(&layer, &JsValue::from_str("html")).unwrap_or(JsValue::from_str(""));
            reflect_set(&inp_html, "value", &html_v);
            append_child(&form, &lab_html);
            append_child(&form, &inp_html);
            {
                let state_sig2 = state_sig.clone();
                let handlers2 = handlers.clone();
                let rerender2 = rerender.clone();
                let inp2 = inp_html.clone();
                let idx2 = layer_idx;
                let cb = debounce(
                    move |_ev: JsValue| {
                        if let Some(v) = input_value(&inp2) {
                            state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.html", idx2)), JsValue::from_str(&v));
                            rerender2();
                        }
                    },
                    150,
                );
                set_oninput(&inp_html, &cb);
                handlers2.borrow_mut().inspector_handlers.push(cb);
            }
        }
        {
            let lab_pick = create_element(document, "label");
            set_class(&lab_pick, "text-xs opacity-70");
            set_text(&lab_pick, "结构选择模式");
            let btn_pick = create_element(document, "button");
            set_class(&btn_pick, "btn btn-xs");
            let pick_on = state_sig.get_path_js(JsValue::from_str("html_pick_mode")).as_bool().unwrap_or(false);
            set_text(&btn_pick, if pick_on { "关闭" } else { "开启" });
            append_child(&form, &lab_pick);
            append_child(&form, &btn_pick);
            {
                let state_sig2 = state_sig.clone();
                let handlers2 = handlers.clone();
                let rerender2 = rerender.clone();
                let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                    let cur = state_sig2.get_path_js(JsValue::from_str("html_pick_mode")).as_bool().unwrap_or(false);
                    state_sig2.set_path_js(JsValue::from_str("html_pick_mode"), JsValue::from_bool(!cur));
                    rerender2();
                }) as Box<dyn FnMut(JsValue)>);
                set_onclick(&btn_pick, &cb);
                handlers2.borrow_mut().inspector_handlers.push(cb);
            }
        }
        {
            let lab_sel = create_element(document, "label");
            set_class(&lab_sel, "text-xs opacity-70");
            set_text(&lab_sel, "选中结构节点类名");
            let inp_sel_cls = create_element(document, "input");
            set_class(&inp_sel_cls, "input input-xs input-bordered w-full");
            append_child(&form, &lab_sel);
            append_child(&form, &inp_sel_cls);
            {
                let state_sig2 = state_sig.clone();
                let handlers2 = handlers.clone();
                let rerender2 = rerender.clone();
                let idx2 = layer_idx;
                let inp2 = inp_sel_cls.clone();
                let cb = debounce(
                    move |_ev: JsValue| {
                        let cur_html = state_sig2.get_path_js(JsValue::from_str(&format!("layers.{}.html", idx2))).as_string().unwrap_or_default();
                        if cur_html.is_empty() { return; }
                        let global = js_sys::global();
                        let document3 = js_sys::Reflect::get(&global, &JsValue::from_str("document")).unwrap_or(JsValue::UNDEFINED);
                        let container = crate::layer_manager::utils::create_element(&document3, "div");
                        crate::layer_manager::utils::reflect_set(&container, "innerHTML", &JsValue::from_str(&cur_html));
                        let sel = crate::layer_manager::utils::query_selector(&container, "[data-rue-selected]");
                        if !sel.is_undefined() && !sel.is_null() {
                            if let Some(v) = crate::layer_manager::utils::input_value(&inp2) {
                                crate::layer_manager::utils::set_class(&sel, &v);
                                let new_html = js_sys::Reflect::get(&container, &JsValue::from_str("innerHTML")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
                                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.html", idx2)), JsValue::from_str(&new_html));
                                rerender2();
                            }
                        }
                    },
                    150,
                );
                set_oninput(&inp_sel_cls, &cb);
                handlers2.borrow_mut().inspector_handlers.push(cb);
            }
        }
        {
            let lab_sel_t = create_element(document, "label");
            set_class(&lab_sel_t, "text-xs opacity-70");
            set_text(&lab_sel_t, "选中结构节点文本");
            let inp_sel_t = create_element(document, "input");
            set_class(&inp_sel_t, "input input-xs input-bordered w-full");
            append_child(&form, &lab_sel_t);
            append_child(&form, &inp_sel_t);
            {
                let state_sig2 = state_sig.clone();
                let handlers2 = handlers.clone();
                let rerender2 = rerender.clone();
                let idx2 = layer_idx;
                let inp2 = inp_sel_t.clone();
                let cb = debounce(
                    move |_ev: JsValue| {
                        let cur_html = state_sig2.get_path_js(JsValue::from_str(&format!("layers.{}.html", idx2))).as_string().unwrap_or_default();
                        if cur_html.is_empty() { return; }
                        let global = js_sys::global();
                        let document3 = js_sys::Reflect::get(&global, &JsValue::from_str("document")).unwrap_or(JsValue::UNDEFINED);
                        let container = crate::layer_manager::utils::create_element(&document3, "div");
                        crate::layer_manager::utils::reflect_set(&container, "innerHTML", &JsValue::from_str(&cur_html));
                        let sel = crate::layer_manager::utils::query_selector(&container, "[data-rue-selected]");
                        if !sel.is_undefined() && !sel.is_null() {
                            if let Some(v) = crate::layer_manager::utils::input_value(&inp2) {
                                crate::layer_manager::utils::reflect_set(&sel, "textContent", &JsValue::from_str(&v));
                                let new_html = js_sys::Reflect::get(&container, &JsValue::from_str("innerHTML")).unwrap_or(JsValue::from_str("")).as_string().unwrap_or_default();
                                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.html", idx2)), JsValue::from_str(&new_html));
                                rerender2();
                            }
                        }
                    },
                    150,
                );
                set_oninput(&inp_sel_t, &cb);
                handlers2.borrow_mut().inspector_handlers.push(cb);
            }
        }
        let (lab_text2, inp_text2) = mk_row("文本");
        set_attr(&inp_text2, "data-field", "text");
        let text_v2 = js_sys::Reflect::get(&layer, &JsValue::from_str("text")).unwrap_or(JsValue::from_str(""));
        reflect_set(&inp_text2, "value", &text_v2);
        append_child(&form, &lab_text2);
        append_child(&form, &inp_text2);
        {
            let state_sig2 = state_sig.clone();
            let handlers2 = handlers.clone();
            let rerender2 = rerender.clone();
            let inp2 = inp_text2.clone();
            let idx2 = layer_idx;
            let cb = debounce(
                move |_ev: JsValue| {
                    if let Some(v) = input_value(&inp2) {
                        state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.text", idx2)), JsValue::from_str(&v));
                        rerender2();
                    }
                },
                120,
            );
            set_oninput(&inp_text2, &cb);
            handlers2.borrow_mut().inspector_handlers.push(cb);
        }
    }

    let (lab_rot, inp_rot) = mk_row("旋转");
    set_attr(&inp_rot, "data-field", "rotation");
    let rot_v = js_sys::Reflect::get(&layer, &JsValue::from_str("rotation")).unwrap_or(JsValue::from_f64(0.0));
    reflect_set(&inp_rot, "value", &rot_v);
    append_child(&form, &lab_rot);
    append_child(&form, &inp_rot);
    {
        let state_sig2 = state_sig.clone();
        let handlers2 = handlers.clone();
        let rerender2 = rerender.clone();
        let inp2 = inp_rot.clone();
        let idx2 = layer_idx;
        let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
            if let Some(v) = input_value_f64(&inp2) {
                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.rotation", idx2)), JsValue::from_f64(v));
                rerender2();
            }
        }) as Box<dyn FnMut(JsValue)>);
        set_onchange(&inp_rot, &cb);
        handlers2.borrow_mut().inspector_handlers.push(cb);
    }

    append_child(inspector, &form);
}
