use js_sys::{Array, Function, Object, Promise, Reflect};
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

fn set_text(node: &JsValue, text: &str) {
    let _ = Reflect::set(node, &JsValue::from_str("textContent"), &JsValue::from_str(text));
}

fn append_child(parent: &JsValue, child: &JsValue) {
    let append = Reflect::get(parent, &JsValue::from_str("appendChild"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let _ = append.call1(parent, child);
}

fn set_class(node: &JsValue, class_name: &str) {
    let _ = Reflect::set(
        node,
        &JsValue::from_str("className"),
        &JsValue::from_str(class_name),
    );
}

fn create_element(document: &JsValue, tag: &str) -> JsValue {
    let ce = Reflect::get(document, &JsValue::from_str("createElement"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    ce.call1(document, &JsValue::from_str(tag)).unwrap()
}

fn set_attr(node: &JsValue, name: &str, value: &str) {
    let set_attribute = Reflect::get(node, &JsValue::from_str("setAttribute"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let _ = set_attribute.call2(node, &JsValue::from_str(name), &JsValue::from_str(value));
}

fn get_preferred_canvas_format(gpu: &JsValue) -> JsValue {
    if let Ok(v) = Reflect::get(gpu, &JsValue::from_str("getPreferredCanvasFormat")) {
        if v.is_function() {
            if let Ok(f) = v.dyn_into::<Function>() {
                if let Ok(out) = f.call0(gpu) {
                    if !out.is_undefined() && !out.is_null() {
                        return out;
                    }
                }
            }
        }
    }
    JsValue::from_str("bgra8unorm")
}

pub fn make_wgpu_element(width: u32, height: u32) -> JsValue {
    let global = js_sys::global();
    let document = Reflect::get(&global, &JsValue::from_str("document")).unwrap();

    let root = create_element(&document, "div");
    let status = create_element(&document, "div");
    let stage = create_element(&document, "div");
    let canvas = create_element(&document, "canvas");
    let title = create_element(&document, "div");
    let watermark = create_element(&document, "div");

    let _ = Reflect::set(
        &canvas,
        &JsValue::from_str("width"),
        &JsValue::from_f64(width as f64),
    );
    let _ = Reflect::set(
        &canvas,
        &JsValue::from_str("height"),
        &JsValue::from_f64(height as f64),
    );
    set_class(
        &root,
        "inline-block rounded-xl border border-base-300 bg-base-100/60 backdrop-blur p-3 shadow-sm",
    );
    set_class(&status, "text-xs text-base-content/70 mb-2");
    set_class(&stage, "relative rounded-lg overflow-hidden");
    set_class(
        &title,
        "absolute left-3 top-3 text-sm font-semibold text-white drop-shadow",
    );
    set_class(
        &watermark,
        "absolute right-3 bottom-3 text-xs font-semibold text-white/80 drop-shadow",
    );
    set_attr(
        &stage,
        "style",
        "background: radial-gradient(120% 120% at 0% 0%, rgba(99,102,241,.35) 0%, rgba(168,85,247,.20) 45%, rgba(236,72,153,.12) 100%);",
    );
    set_attr(
        &canvas,
        "style",
        "display:block;border-radius:12px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);opacity:.95;",
    );

    set_text(&status, "WebGPU 初始化中…");
    set_text(&title, "Rue WebGPU");
    set_text(&watermark, "后悔药 Rue.js");

    append_child(&root, &status);
    append_child(&root, &stage);
    append_child(&stage, &canvas);
    append_child(&stage, &title);
    append_child(&stage, &watermark);

    let navigator = Reflect::get(&global, &JsValue::from_str("navigator")).unwrap_or(JsValue::UNDEFINED);
    if navigator.is_undefined() || navigator.is_null() {
        set_text(&status, "WebGPU 不可用：navigator 不存在");
        let out = Object::new();
        let _ = Reflect::set(&out, &JsValue::from_str("vaporElement"), &root);
        return out.into();
    }
    let gpu = Reflect::get(&navigator, &JsValue::from_str("gpu")).unwrap_or(JsValue::UNDEFINED);
    if gpu.is_undefined() || gpu.is_null() {
        set_text(&status, "WebGPU 不可用：navigator.gpu 不存在");
        let out = Object::new();
        let _ = Reflect::set(&out, &JsValue::from_str("vaporElement"), &root);
        return out.into();
    }

    let request_adapter = Reflect::get(&gpu, &JsValue::from_str("requestAdapter"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let adapter_promise = request_adapter.call0(&gpu).unwrap().dyn_into::<Promise>().unwrap();

    let status_for_adapter_err = status.clone();
    let on_adapter_err = Closure::wrap(Box::new(move |err: JsValue| {
        let msg = if err.is_string() {
            err.as_string().unwrap_or_default()
        } else {
            js_sys::JSON::stringify(&err)
                .ok()
                .and_then(|v| v.as_string())
                .unwrap_or_else(|| "未知错误".to_string())
        };
        set_text(&status_for_adapter_err, &format!("WebGPU 初始化失败：{}", msg));
    }) as Box<dyn FnMut(JsValue)>);

    let status_for_adapter = status.clone();
    let canvas_for_adapter = canvas.clone();
    let gpu_for_adapter = gpu.clone();
    let on_adapter = Closure::wrap(Box::new(move |adapter: JsValue| {
        if adapter.is_undefined() || adapter.is_null() {
            set_text(&status_for_adapter, "WebGPU 不可用：requestAdapter 返回空");
            return;
        }

        let request_device = Reflect::get(&adapter, &JsValue::from_str("requestDevice"))
            .unwrap()
            .dyn_into::<Function>()
            .unwrap();
        let device_promise: Promise = request_device
            .call0(&adapter)
            .unwrap_or(JsValue::UNDEFINED)
            .dyn_into()
            .unwrap_or_else(|_| Promise::reject(&JsValue::from_str("requestDevice 未返回 Promise")));

        let status_for_device_err = status_for_adapter.clone();
        let on_device_err = Closure::wrap(Box::new(move |err: JsValue| {
            let msg = if err.is_string() {
                err.as_string().unwrap_or_default()
            } else {
                js_sys::JSON::stringify(&err)
                    .ok()
                    .and_then(|v| v.as_string())
                    .unwrap_or_else(|| "未知错误".to_string())
            };
            set_text(&status_for_device_err, &format!("WebGPU 初始化失败：{}", msg));
        }) as Box<dyn FnMut(JsValue)>);

        let status_for_device = status_for_adapter.clone();
        let canvas_for_device = canvas_for_adapter.clone();
        let gpu_for_device = gpu_for_adapter.clone();
        let on_device = Closure::wrap(Box::new(move |device: JsValue| {
            if device.is_undefined() || device.is_null() {
                set_text(&status_for_device, "WebGPU 初始化失败：requestDevice 返回空");
                return;
            }

            let get_ctx = Reflect::get(&canvas_for_device, &JsValue::from_str("getContext"))
                .unwrap()
                .dyn_into::<Function>()
                .unwrap();
            let ctx = get_ctx
                .call1(&canvas_for_device, &JsValue::from_str("webgpu"))
                .unwrap_or(JsValue::UNDEFINED);
            if ctx.is_undefined() || ctx.is_null() {
                set_text(&status_for_device, "WebGPU 不可用：canvas.getContext('webgpu') 失败");
                return;
            }

            let configure = Reflect::get(&ctx, &JsValue::from_str("configure"))
                .unwrap()
                .dyn_into::<Function>()
                .unwrap();
            let config = Object::new();
            let format = get_preferred_canvas_format(&gpu_for_device);
            let _ = Reflect::set(&config, &JsValue::from_str("device"), &device);
            let _ = Reflect::set(&config, &JsValue::from_str("format"), &format);
            let _ = Reflect::set(
                &config,
                &JsValue::from_str("alphaMode"),
                &JsValue::from_str("opaque"),
            );
            let _ = configure.call1(&ctx, &config);

            let create_command_encoder =
                Reflect::get(&device, &JsValue::from_str("createCommandEncoder"))
                    .unwrap()
                    .dyn_into::<Function>()
                    .unwrap();
            let encoder = create_command_encoder.call0(&device).unwrap();

            let get_current_texture = Reflect::get(&ctx, &JsValue::from_str("getCurrentTexture"))
                .unwrap()
                .dyn_into::<Function>()
                .unwrap();
            let texture = get_current_texture.call0(&ctx).unwrap();
            let create_view = Reflect::get(&texture, &JsValue::from_str("createView"))
                .unwrap()
                .dyn_into::<Function>()
                .unwrap();
            let view = create_view.call0(&texture).unwrap();

            let pass_desc = Object::new();
            let attachments = Array::new();
            let attachment = Object::new();
            let clear_value = Object::new();
            let _ = Reflect::set(&attachment, &JsValue::from_str("view"), &view);
            let _ = Reflect::set(&clear_value, &JsValue::from_str("r"), &JsValue::from_f64(0.08));
            let _ = Reflect::set(&clear_value, &JsValue::from_str("g"), &JsValue::from_f64(0.2));
            let _ = Reflect::set(&clear_value, &JsValue::from_str("b"), &JsValue::from_f64(0.35));
            let _ = Reflect::set(&clear_value, &JsValue::from_str("a"), &JsValue::from_f64(1.0));
            let _ = Reflect::set(&attachment, &JsValue::from_str("clearValue"), &clear_value);
            let _ = Reflect::set(&attachment, &JsValue::from_str("loadOp"), &JsValue::from_str("clear"));
            let _ = Reflect::set(&attachment, &JsValue::from_str("storeOp"), &JsValue::from_str("store"));
            attachments.push(&attachment);
            let _ = Reflect::set(&pass_desc, &JsValue::from_str("colorAttachments"), &attachments);

            let begin_render_pass = Reflect::get(&encoder, &JsValue::from_str("beginRenderPass"))
                .unwrap()
                .dyn_into::<Function>()
                .unwrap();
            let pass = begin_render_pass.call1(&encoder, &pass_desc).unwrap();
            let end = Reflect::get(&pass, &JsValue::from_str("end"))
                .unwrap()
                .dyn_into::<Function>()
                .unwrap();
            let _ = end.call0(&pass);

            let finish = Reflect::get(&encoder, &JsValue::from_str("finish"))
                .unwrap()
                .dyn_into::<Function>()
                .unwrap();
            let command_buffer = finish.call0(&encoder).unwrap();
            let submit_list = Array::new();
            submit_list.push(&command_buffer);

            let queue = Reflect::get(&device, &JsValue::from_str("queue")).unwrap();
            let submit = Reflect::get(&queue, &JsValue::from_str("submit"))
                .unwrap()
                .dyn_into::<Function>()
                .unwrap();
            let _ = submit.call1(&queue, &submit_list);

            set_text(&status_for_device, "WebGPU 就绪（已 clear 一帧）");
            set_attr(
                &canvas_for_device,
                "style",
                "display:block;border-radius:12px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.10),0 12px 30px rgba(0,0,0,.25);opacity:1;",
            );
        }) as Box<dyn FnMut(JsValue)>);

        let _ = device_promise.then(&on_device).catch(&on_device_err);
        on_device.forget();
        on_device_err.forget();
    }) as Box<dyn FnMut(JsValue)>);

    let _ = adapter_promise.then(&on_adapter).catch(&on_adapter_err);

    on_adapter.forget();
    on_adapter_err.forget();

    let out = Object::new();
    let _ = Reflect::set(&out, &JsValue::from_str("vaporElement"), &root);
    out.into()
}
