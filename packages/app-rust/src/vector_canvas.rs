use js_sys::Function;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

pub fn make_vector_element(width: u32, height: u32) -> JsValue {
    let global = js_sys::global();
    let document = js_sys::Reflect::get(&global, &JsValue::from_str("document")).unwrap();
    let ce = js_sys::Reflect::get(&document, &JsValue::from_str("createElement"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let canvas = ce.call1(&document, &JsValue::from_str("canvas")).unwrap();
    let _ = js_sys::Reflect::set(
        &canvas,
        &JsValue::from_str("width"),
        &JsValue::from_f64(width as f64),
    );
    let _ = js_sys::Reflect::set(
        &canvas,
        &JsValue::from_str("height"),
        &JsValue::from_f64(height as f64),
    );
    let get_ctx = js_sys::Reflect::get(&canvas, &JsValue::from_str("getContext"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let ctx = get_ctx
        .call1(&canvas, &JsValue::from_str("2d"))
        .unwrap();
    let _ = js_sys::Reflect::set(
        &ctx,
        &JsValue::from_str("fillStyle"),
        &JsValue::from_str("#1f77b4"),
    );
    let _ = js_sys::Reflect::set(
        &ctx,
        &JsValue::from_str("strokeStyle"),
        &JsValue::from_str("#ff7f0e"),
    );
    let _ = js_sys::Reflect::set(
        &ctx,
        &JsValue::from_str("lineWidth"),
        &JsValue::from_f64(2.0),
    );
    let begin_path = js_sys::Reflect::get(&ctx, &JsValue::from_str("beginPath"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let move_to = js_sys::Reflect::get(&ctx, &JsValue::from_str("moveTo"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let line_to = js_sys::Reflect::get(&ctx, &JsValue::from_str("lineTo"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let arc = js_sys::Reflect::get(&ctx, &JsValue::from_str("arc"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let close_path = js_sys::Reflect::get(&ctx, &JsValue::from_str("closePath"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let fill = js_sys::Reflect::get(&ctx, &JsValue::from_str("fill"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let stroke = js_sys::Reflect::get(&ctx, &JsValue::from_str("stroke"))
        .unwrap()
        .dyn_into::<Function>()
        .unwrap();
    let _ = begin_path.call0(&ctx);
    let _ = move_to.call2(&ctx, &JsValue::from_f64(20.0), &JsValue::from_f64(20.0));
    let _ = line_to.call2(
        &ctx,
        &JsValue::from_f64((width - 20) as f64),
        &JsValue::from_f64(20.0),
    );
    let _ = line_to.call2(
        &ctx,
        &JsValue::from_f64((width - 20) as f64),
        &JsValue::from_f64((height - 20) as f64),
    );
    let _ = line_to.call2(
        &ctx,
        &JsValue::from_f64(20.0),
        &JsValue::from_f64((height - 20) as f64),
    );
    let _ = close_path.call0(&ctx);
    let _ = fill.call0(&ctx);
    let _ = stroke.call0(&ctx);
    let _ = begin_path.call0(&ctx);
    let cx = (width as f64) / 2.0;
    let cy = (height as f64) / 2.0;
    let _ = arc.call5(
        &ctx,
        &JsValue::from_f64(cx),
        &JsValue::from_f64(cy),
        &JsValue::from_f64((width.min(height) as f64) * 0.25),
        &JsValue::from_f64(0.0),
        &JsValue::from_f64(std::f64::consts::PI * 2.0),
    );
    let _ = stroke.call0(&ctx);
    let out = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&out, &JsValue::from_str("vaporElement"), &canvas);
    out.into()
}

