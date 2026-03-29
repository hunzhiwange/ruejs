use js_sys::Function;
use wasm_bindgen::JsValue;
use wasm_bindgen::JsCast;

use crate::layer_manager::utils::reflect_get;

pub fn draw_selection_overlay(
    pass: &JsValue,
    device: &JsValue,
    queue: &JsValue,
    create_buf: &Function,
    write: &Function,
    bind_group: &JsValue,
    vb: &JsValue,
    pipeline: &JsValue,
    ln_pipeline: &JsValue,
    cir_pipeline: &JsValue,
    vx: f64,
    vy: f64,
    cur_page: f64,
    arr_layers: &js_sys::Array,
    selm: &js_sys::Array,
) {
    if selm.length() == 0 {
        return;
    }
    let mut sel_layers: Vec<JsValue> = Vec::new();
    for j in 0..selm.length() {
        let idf = selm.get(j).as_f64().unwrap_or(-1.0);
        if idf < 0.0 {
            continue;
        }
        for i in 0..arr_layers.length() {
            let l = arr_layers.get(i);
            let idv = js_sys::Reflect::get(&l, &JsValue::from_str("id"))
                .unwrap_or(JsValue::UNDEFINED)
                .as_f64()
                .unwrap_or(-1.0);
            let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible"))
                .unwrap_or(JsValue::from_bool(true))
                .as_bool()
                .unwrap_or(true);
            let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id"))
                .unwrap_or(JsValue::from_f64(1.0))
                .as_f64()
                .unwrap_or(1.0);
            if idv == idf && vis && pid == cur_page {
                sel_layers.push(l);
                break;
            }
        }
    }
    if sel_layers.len() == 0 {
        return;
    }
    let set_pipeline = reflect_get(pass, "setPipeline")
        .dyn_into::<Function>()
        .unwrap();
    let set_vb0 = reflect_get(pass, "setVertexBuffer")
        .dyn_into::<Function>()
        .unwrap();
    let set_bg = reflect_get(pass, "setBindGroup")
        .dyn_into::<Function>()
        .unwrap();
    let draw = reflect_get(pass, "draw").dyn_into::<Function>().unwrap();

    if !ln_pipeline.is_undefined() {
        let ln_stride = 12u32;
        let sel_lines_total = (sel_layers.len() as u32) * 4 * ln_stride;
        let sel_ln = js_sys::Float32Array::new_with_length(sel_lines_total);
        let mut sidx = 0u32;
        for l in sel_layers.iter() {
            let kind = js_sys::Reflect::get(l, &JsValue::from_str("kind"))
                .unwrap_or(JsValue::UNDEFINED)
                .as_string()
                .unwrap_or_default();
            let x = js_sys::Reflect::get(l, &JsValue::from_str("x"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            let y = js_sys::Reflect::get(l, &JsValue::from_str("y"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            let mut wv = js_sys::Reflect::get(l, &JsValue::from_str("w"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            let mut hv = js_sys::Reflect::get(l, &JsValue::from_str("h"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            if kind == "text" {
                let fs = js_sys::Reflect::get(l, &JsValue::from_str("font_size"))
                    .unwrap_or(JsValue::from_f64(16.0))
                    .as_f64()
                    .unwrap_or(16.0);
                wv = wv.max(120.0);
                hv = if hv > 0.0 { hv } else { (fs + 10.0).max(16.0) };
            }
            let rx = x + vx;
            let ry = y + vy;
            let thick = 2.0f32;
            let cr = 34.0f32 / 255.0;
            let cg = 211.0f32 / 255.0;
            let cb = 238.0f32 / 255.0;
            let ca = 1.0f32;
            sel_ln.set_index(sidx, rx as f32);
            sel_ln.set_index(sidx + 1, ry as f32);
            sel_ln.set_index(sidx + 2, (rx + wv) as f32);
            sel_ln.set_index(sidx + 3, ry as f32);
            sel_ln.set_index(sidx + 4, thick);
            sel_ln.set_index(sidx + 5, cr);
            sel_ln.set_index(sidx + 6, cg);
            sel_ln.set_index(sidx + 7, cb);
            sel_ln.set_index(sidx + 8, ca);
            sel_ln.set_index(sidx + 9, 0.0);
            sel_ln.set_index(sidx + 10, 0.0);
            sel_ln.set_index(sidx + 11, 0.0);
            sidx += ln_stride;
            sel_ln.set_index(sidx, (rx + wv) as f32);
            sel_ln.set_index(sidx + 1, ry as f32);
            sel_ln.set_index(sidx + 2, (rx + wv) as f32);
            sel_ln.set_index(sidx + 3, (ry + hv) as f32);
            sel_ln.set_index(sidx + 4, thick);
            sel_ln.set_index(sidx + 5, cr);
            sel_ln.set_index(sidx + 6, cg);
            sel_ln.set_index(sidx + 7, cb);
            sel_ln.set_index(sidx + 8, ca);
            sel_ln.set_index(sidx + 9, 0.0);
            sel_ln.set_index(sidx + 10, 0.0);
            sel_ln.set_index(sidx + 11, 0.0);
            sidx += ln_stride;
            sel_ln.set_index(sidx, rx as f32);
            sel_ln.set_index(sidx + 1, (ry + hv) as f32);
            sel_ln.set_index(sidx + 2, (rx + wv) as f32);
            sel_ln.set_index(sidx + 3, (ry + hv) as f32);
            sel_ln.set_index(sidx + 4, thick);
            sel_ln.set_index(sidx + 5, cr);
            sel_ln.set_index(sidx + 6, cg);
            sel_ln.set_index(sidx + 7, cb);
            sel_ln.set_index(sidx + 8, ca);
            sel_ln.set_index(sidx + 9, 0.0);
            sel_ln.set_index(sidx + 10, 0.0);
            sel_ln.set_index(sidx + 11, 0.0);
            sidx += ln_stride;
            sel_ln.set_index(sidx, rx as f32);
            sel_ln.set_index(sidx + 1, ry as f32);
            sel_ln.set_index(sidx + 2, rx as f32);
            sel_ln.set_index(sidx + 3, (ry + hv) as f32);
            sel_ln.set_index(sidx + 4, thick);
            sel_ln.set_index(sidx + 5, cr);
            sel_ln.set_index(sidx + 6, cg);
            sel_ln.set_index(sidx + 7, cb);
            sel_ln.set_index(sidx + 8, ca);
            sel_ln.set_index(sidx + 9, 0.0);
            sel_ln.set_index(sidx + 10, 0.0);
            sel_ln.set_index(sidx + 11, 0.0);
            sidx += ln_stride;
        }
        if sidx > 0 && !ln_pipeline.is_undefined() {
            let ln_desc = js_sys::Object::new();
            let _ = js_sys::Reflect::set(
                &ln_desc,
                &JsValue::from_str("size"),
                &JsValue::from_f64((sidx as f64) * 4.0),
            );
            let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
            let v = if gb.is_undefined() || gb.is_null() {
                32.0
            } else {
                reflect_get(&gb, "VERTEX").as_f64().unwrap_or(32.0)
            };
            let cd = if gb.is_undefined() || gb.is_null() {
                8.0
            } else {
                reflect_get(&gb, "COPY_DST").as_f64().unwrap_or(8.0)
            };
            let _ = js_sys::Reflect::set(
                &ln_desc,
                &JsValue::from_str("usage"),
                &JsValue::from_f64(v + cd),
            );
            let ln_sel_buf = create_buf.call1(device, &ln_desc).unwrap();
            let _ = write.call3(queue, &ln_sel_buf, &JsValue::from_f64(0.0), &sel_ln);
            let _ = set_pipeline.call1(pass, ln_pipeline);
            let _ = set_vb0.call2(pass, &JsValue::from_f64(0.0), vb);
            let _ = set_vb0.call2(pass, &JsValue::from_f64(1.0), &ln_sel_buf);
            let _ = set_bg.call2(pass, &JsValue::from_f64(0.0), bind_group);
            let inst_cnt = (sidx / ln_stride) as f64;
            let _ = draw.call3(pass, &JsValue::from_f64(4.0), &JsValue::from_f64(inst_cnt), &JsValue::from_f64(0.0));
        }
    }
    if !cir_pipeline.is_undefined() {
        let handle_stride = 10u32;
        let mut hcnt = 0u32;
        let cir_sel = js_sys::Float32Array::new_with_length((sel_layers.len() as u32) * handle_stride);
        for l in sel_layers.iter() {
            let kind = js_sys::Reflect::get(l, &JsValue::from_str("kind"))
                .unwrap_or(JsValue::UNDEFINED)
                .as_string()
                .unwrap_or_default();
            let x = js_sys::Reflect::get(l, &JsValue::from_str("x"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            let y = js_sys::Reflect::get(l, &JsValue::from_str("y"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            let mut wv = js_sys::Reflect::get(l, &JsValue::from_str("w"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            let mut hv = js_sys::Reflect::get(l, &JsValue::from_str("h"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            if kind == "text" {
                let fs = js_sys::Reflect::get(l, &JsValue::from_str("font_size"))
                    .unwrap_or(JsValue::from_f64(16.0))
                    .as_f64()
                    .unwrap_or(16.0);
                wv = wv.max(120.0);
                hv = if hv > 0.0 { hv } else { (fs + 10.0).max(16.0) };
            }
            let rx = x + vx;
            let ry = y + vy;
            let cx_box = rx + wv * 0.5;
            let hy = ry - 12.0;
            let base = hcnt * handle_stride;
            cir_sel.set_index(base, cx_box as f32);
            cir_sel.set_index(base + 1, hy as f32);
            cir_sel.set_index(base + 2, 6.0);
            cir_sel.set_index(base + 3, 6.0);
            cir_sel.set_index(base + 4, 0.0);
            cir_sel.set_index(base + 5, 34.0f32 / 255.0);
            cir_sel.set_index(base + 6, 211.0f32 / 255.0);
            cir_sel.set_index(base + 7, 238.0f32 / 255.0);
            cir_sel.set_index(base + 8, 1.0);
            cir_sel.set_index(base + 9, 0.0);
            hcnt += 1;
        }
        if hcnt > 0 {
            let cir_desc = js_sys::Object::new();
            let _ = js_sys::Reflect::set(
                &cir_desc,
                &JsValue::from_str("size"),
                &JsValue::from_f64((hcnt as f64) * (handle_stride as f64) * 4.0),
            );
            let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
            let v = if gb.is_undefined() || gb.is_null() {
                32.0
            } else {
                reflect_get(&gb, "VERTEX").as_f64().unwrap_or(32.0)
            };
            let cd = if gb.is_undefined() || gb.is_null() {
                8.0
            } else {
                reflect_get(&gb, "COPY_DST").as_f64().unwrap_or(8.0)
            };
            let _ = js_sys::Reflect::set(
                &cir_desc,
                &JsValue::from_str("usage"),
                &JsValue::from_f64(v + cd),
            );
            let cir_sel_buf = create_buf.call1(device, &cir_desc).unwrap();
            let _ = write.call3(queue, &cir_sel_buf, &JsValue::from_f64(0.0), &cir_sel);
            let _ = set_pipeline.call1(pass, cir_pipeline);
            let _ = set_vb0.call2(pass, &JsValue::from_f64(0.0), vb);
            let _ = set_vb0.call2(pass, &JsValue::from_f64(1.0), &cir_sel_buf);
            let _ = set_bg.call2(pass, &JsValue::from_f64(0.0), bind_group);
            let _ = draw.call3(pass, &JsValue::from_f64(4.0), &JsValue::from_f64(hcnt as f64), &JsValue::from_f64(0.0));
        }
    }
    {
        let hsize = 8.0f64;
        let mut rcnt = 0u32;
        let floats_per = 9u32;
        let max_handles = (sel_layers.len() as u32) * 6;
        let rect_sel = js_sys::Float32Array::new_with_length(max_handles * floats_per);
        for l in sel_layers.iter() {
            let kind = js_sys::Reflect::get(l, &JsValue::from_str("kind"))
                .unwrap_or(JsValue::UNDEFINED)
                .as_string()
                .unwrap_or_default();
            let x = js_sys::Reflect::get(l, &JsValue::from_str("x"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            let y = js_sys::Reflect::get(l, &JsValue::from_str("y"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            let mut wv = js_sys::Reflect::get(l, &JsValue::from_str("w"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            let mut hv = js_sys::Reflect::get(l, &JsValue::from_str("h"))
                .unwrap_or(JsValue::from_f64(0.0))
                .as_f64()
                .unwrap_or(0.0);
            if kind == "text" {
                let fs = js_sys::Reflect::get(l, &JsValue::from_str("font_size"))
                    .unwrap_or(JsValue::from_f64(16.0))
                    .as_f64()
                    .unwrap_or(16.0);
                wv = wv.max(120.0);
                hv = if hv > 0.0 { hv } else { (fs + 10.0).max(16.0) };
            }
            let rx = x + vx;
            let ry = y + vy;
            let pts = [
                (rx + wv, ry + hv),
                (rx + wv * 0.5, ry + hv),
                (rx + wv, ry + hv * 0.5),
                (rx, ry),
                (rx + wv * 0.5, ry),
                (rx, ry + hv * 0.5),
            ];
            for (px, py) in pts {
                let base = rcnt * floats_per;
                rect_sel.set_index(base, (px - hsize * 0.5) as f32);
                rect_sel.set_index(base + 1, (py - hsize * 0.5) as f32);
                rect_sel.set_index(base + 2, hsize as f32);
                rect_sel.set_index(base + 3, hsize as f32);
                rect_sel.set_index(base + 4, 0.0);
                rect_sel.set_index(base + 5, 34.0f32 / 255.0);
                rect_sel.set_index(base + 6, 211.0f32 / 255.0);
                rect_sel.set_index(base + 7, 238.0f32 / 255.0);
                rect_sel.set_index(base + 8, 1.0);
                rcnt += 1;
            }
        }
        if rcnt > 0 {
            let desc = js_sys::Object::new();
            let _ = js_sys::Reflect::set(
                &desc,
                &JsValue::from_str("size"),
                &JsValue::from_f64((rcnt as f64) * (floats_per as f64) * 4.0),
            );
            let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
            let v = if gb.is_undefined() || gb.is_null() {
                32.0
            } else {
                reflect_get(&gb, "VERTEX").as_f64().unwrap_or(32.0)
            };
            let cd = if gb.is_undefined() || gb.is_null() {
                8.0
            } else {
                reflect_get(&gb, "COPY_DST").as_f64().unwrap_or(8.0)
            };
            let _ = js_sys::Reflect::set(
                &desc,
                &JsValue::from_str("usage"),
                &JsValue::from_f64(v + cd),
            );
            let rect_sel_buf = create_buf.call1(device, &desc).unwrap();
            let _ = write.call3(queue, &rect_sel_buf, &JsValue::from_f64(0.0), &rect_sel);
            let _ = set_pipeline.call1(pass, pipeline);
            let _ = set_vb0.call2(pass, &JsValue::from_f64(0.0), vb);
            let _ = set_vb0.call2(pass, &JsValue::from_f64(1.0), &rect_sel_buf);
            let _ = set_bg.call2(pass, &JsValue::from_f64(0.0), bind_group);
            let _ = draw.call3(pass, &JsValue::from_f64(4.0), &JsValue::from_f64(rcnt as f64), &JsValue::from_f64(0.0));
        }
    }
}
