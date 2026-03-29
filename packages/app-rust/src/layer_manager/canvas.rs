use js_sys::{Function, Promise};
use rue_runtime_vapor::SignalHandle;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;

use crate::layer_manager::utils::{reflect_get, reflect_set};
use crate::layer_manager::selection::draw_selection_overlay;

pub fn draw_webgpu(canvas: &JsValue, width: f64, height: f64, state_sig: &SignalHandle) {
    let global = js_sys::global();
    let navigator = reflect_get(&global, "navigator");
    if navigator.is_undefined() || navigator.is_null() {
        return;
    }
    let gpu = reflect_get(&navigator, "gpu");
    if gpu.is_undefined() || gpu.is_null() {
        return;
    }
    let ctx_existing = reflect_get(canvas, "__wgpu_ctx");
    let device_existing = reflect_get(canvas, "__wgpu_device");
    if ctx_existing.is_undefined() || device_existing.is_undefined() {
        let request_adapter = reflect_get(&gpu, "requestAdapter")
            .dyn_into::<Function>()
            .unwrap();
        let adapter_promise = request_adapter
            .call0(&gpu)
            .unwrap_or(JsValue::UNDEFINED)
            .dyn_into::<Promise>()
            .unwrap_or_else(|_| Promise::reject(&JsValue::from_str("requestAdapter 未返回 Promise")));
        let canvas_for_adapter = canvas.clone();
        let gpu_for_adapter = gpu.clone();
        let on_adapter = Closure::wrap(Box::new(move |adapter: JsValue| {
            if adapter.is_undefined() || adapter.is_null() {
                return;
            }
            let request_device = reflect_get(&adapter, "requestDevice")
                .dyn_into::<Function>()
                .unwrap();
             let device_promise = request_device
                 .call0(&adapter)
                 .unwrap_or(JsValue::UNDEFINED)
                 .dyn_into::<Promise>()
                 .unwrap_or_else(|_| Promise::reject(&JsValue::from_str("requestDevice 未返回 Promise")));
             let canvas_for_device = canvas_for_adapter.clone();
             let gpu_for_device = gpu_for_adapter.clone();
            let on_device = Closure::wrap(Box::new(move |device: JsValue| {
                if device.is_undefined() || device.is_null() {
                    return;
                }
                let get_ctx = reflect_get(&canvas_for_device, "getContext")
                    .dyn_into::<Function>()
                    .unwrap();
                let ctx = get_ctx
                    .call1(&canvas_for_device, &JsValue::from_str("webgpu"))
                    .unwrap_or(JsValue::UNDEFINED);
                if ctx.is_undefined() || ctx.is_null() {
                    return;
                }
                let configure = reflect_get(&ctx, "configure")
                    .dyn_into::<Function>()
                    .unwrap();
                let config = js_sys::Object::new();
                let format = {
                    let f = reflect_get(&gpu_for_device, "getPreferredCanvasFormat");
                    if f.is_function() {
                        f.dyn_into::<Function>()
                            .ok()
                            .and_then(|ff| ff.call0(&gpu_for_device).ok())
                            .unwrap_or(JsValue::from_str("bgra8unorm"))
                    } else {
                        JsValue::from_str("bgra8unorm")
                    }
                };
                let _ = js_sys::Reflect::set(&config, &JsValue::from_str("device"), &device);
                let _ = js_sys::Reflect::set(&config, &JsValue::from_str("format"), &format);
                let _ = js_sys::Reflect::set(
                    &config,
                    &JsValue::from_str("alphaMode"),
                    &JsValue::from_str("premultiplied"),
                );
                let _ = configure.call1(&ctx, &config);
                reflect_set(&canvas_for_device, "__wgpu_ctx", &ctx);
                reflect_set(&canvas_for_device, "__wgpu_device", &device);
                reflect_set(&canvas_for_device, "__wgpu_width", &JsValue::from_f64(width));
                reflect_set(&canvas_for_device, "__wgpu_height", &JsValue::from_f64(height));
                reflect_set(&canvas_for_device, "__wgpu_format", &format);
                reflect_set(&canvas_for_device, "__wgpu_ctx", &ctx);
                reflect_set(&canvas_for_device, "__wgpu_device", &device);
                // 首帧直接绘制棋盘格背景
                let bg_wgsl = r#"
struct Uniforms { size: vec2<f32>, offset: vec2<f32> };
@group(0) @binding(0) var<uniform> u: Uniforms;
struct VSOut { @builtin(position) pos: vec4<f32> };
@vertex
fn vs(@location(0) pos: vec2<f32>) -> VSOut {
  var o: VSOut;
  o.pos = vec4<f32>(pos, 0.0, 1.0);
  return o;
}
@fragment
fn fs(@builtin(position) p: vec4<f32>) -> @location(0) vec4<f32> {
  let tile: f32 = 16.0;
  let ix = floor(p.x / tile);
  let iy = floor(p.y / tile);
  let k = i32(ix) + i32(iy);
  if (k % 2 == 0) {
    return vec4<f32>(243.0/255.0, 244.0/255.0, 246.0/255.0, 1.0);
  }
  return vec4<f32>(229.0/255.0, 231.0/255.0, 235.0/255.0, 1.0);
}
"#;
                let create_shader = reflect_get(&device, "createShaderModule").dyn_into::<Function>().unwrap();
                let bg_shader_desc = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&bg_shader_desc, &JsValue::from_str("code"), &JsValue::from_str(bg_wgsl));
                let bg_shader = create_shader.call1(&device, &bg_shader_desc).unwrap();
                let bgl_desc = js_sys::Object::new();
                let entries = js_sys::Array::new();
                let entry = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&entry, &JsValue::from_str("binding"), &JsValue::from_f64(0.0));
                let _ = js_sys::Reflect::set(&entry, &JsValue::from_str("visibility"), &JsValue::from_f64(1.0));
                let buf = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&buf, &JsValue::from_str("type"), &JsValue::from_str("uniform"));
                let _ = js_sys::Reflect::set(&entry, &JsValue::from_str("buffer"), &buf);
                entries.push(&entry);
                let _ = js_sys::Reflect::set(&bgl_desc, &JsValue::from_str("entries"), &entries);
                let create_bgl = reflect_get(&device, "createBindGroupLayout").dyn_into::<Function>().unwrap();
                let bgl = create_bgl.call1(&device, &bgl_desc).unwrap();
                let pl_desc = js_sys::Object::new();
                let pl_entries = js_sys::Array::new();
                let _ = js_sys::Reflect::set(&pl_entries, &JsValue::from_f64(0.0), &bgl);
                let _ = js_sys::Reflect::set(&pl_desc, &JsValue::from_str("bindGroupLayouts"), &pl_entries);
                let create_pl = reflect_get(&device, "createPipelineLayout").dyn_into::<Function>().unwrap();
                let pipeline_layout = create_pl.call1(&device, &pl_desc).unwrap();
                let bg_rp_desc = js_sys::Object::new();
                let bg_vertex = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&bg_vertex, &JsValue::from_str("module"), &bg_shader);
                let _ = js_sys::Reflect::set(&bg_vertex, &JsValue::from_str("entryPoint"), &JsValue::from_str("vs"));
                let bg_buffers = js_sys::Array::new();
                let bg_vb0 = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&bg_vb0, &JsValue::from_str("arrayStride"), &JsValue::from_f64(8.0));
                let _ = js_sys::Reflect::set(&bg_vb0, &JsValue::from_str("stepMode"), &JsValue::from_str("vertex"));
                let bg_vb0_attrs = js_sys::Array::new();
                let bg_a0 = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&bg_a0, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(0.0));
                let _ = js_sys::Reflect::set(&bg_a0, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
                let _ = js_sys::Reflect::set(&bg_a0, &JsValue::from_str("format"), &JsValue::from_str("float32x2"));
                bg_vb0_attrs.push(&bg_a0);
                let _ = js_sys::Reflect::set(&bg_vb0, &JsValue::from_str("attributes"), &bg_vb0_attrs);
                bg_buffers.push(&bg_vb0);
                let _ = js_sys::Reflect::set(&bg_vertex, &JsValue::from_str("buffers"), &bg_buffers);
                let bg_fragment = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&bg_fragment, &JsValue::from_str("module"), &bg_shader);
                let _ = js_sys::Reflect::set(&bg_fragment, &JsValue::from_str("entryPoint"), &JsValue::from_str("fs"));
                let bg_targets = js_sys::Array::new();
                let bg_t0 = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&bg_t0, &JsValue::from_str("format"), &format);
                bg_targets.push(&bg_t0);
                let _ = js_sys::Reflect::set(&bg_fragment, &JsValue::from_str("targets"), &bg_targets);
                let _ = js_sys::Reflect::set(&bg_rp_desc, &JsValue::from_str("layout"), &pipeline_layout);
                let _ = js_sys::Reflect::set(&bg_rp_desc, &JsValue::from_str("vertex"), &bg_vertex);
                let _ = js_sys::Reflect::set(&bg_rp_desc, &JsValue::from_str("fragment"), &bg_fragment);
                let bg_primitive = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&bg_primitive, &JsValue::from_str("topology"), &JsValue::from_str("triangle-strip"));
                let _ = js_sys::Reflect::set(&bg_rp_desc, &JsValue::from_str("primitive"), &bg_primitive);
                let create_rp = reflect_get(&device, "createRenderPipeline").dyn_into::<Function>().unwrap();
                let bg_pipeline = create_rp.call1(&device, &bg_rp_desc).unwrap();
                let vb_data = js_sys::Float32Array::new_with_length(8);
                vb_data.set_index(0, -1.0);
                vb_data.set_index(1, -1.0);
                vb_data.set_index(2, 1.0);
                vb_data.set_index(3, -1.0);
                vb_data.set_index(4, -1.0);
                vb_data.set_index(5, 1.0);
                vb_data.set_index(6, 1.0);
                vb_data.set_index(7, 1.0);
                let buf_desc = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&buf_desc, &JsValue::from_str("size"), &JsValue::from_f64(8.0 * 4.0));
                let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
                let v = if gb.is_undefined() || gb.is_null() {
                    JsValue::from_f64(32.0)
                } else {
                    reflect_get(&gb, "VERTEX")
                };
                let _ = js_sys::Reflect::set(&buf_desc, &JsValue::from_str("usage"), &v);
                let _ = js_sys::Reflect::set(&buf_desc, &JsValue::from_str("mappedAtCreation"), &JsValue::from_bool(true));
                let create_buf = reflect_get(&device, "createBuffer").dyn_into::<Function>().unwrap();
                let vb = create_buf.call1(&device, &buf_desc).unwrap();
                let get_map = reflect_get(&vb, "getMappedRange").dyn_into::<Function>().unwrap();
                let range = get_map.call0(&vb).unwrap();
                let arr = js_sys::Float32Array::new(&range);
                let _ = arr.set(&vb_data, 0);
                let unmap = reflect_get(&vb, "unmap").dyn_into::<Function>().unwrap();
                let _ = unmap.call0(&vb);
                let ub_desc = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&ub_desc, &JsValue::from_str("size"), &JsValue::from_f64(16.0));
                let u = if gb.is_undefined() || gb.is_null() { 64.0 } else { reflect_get(&gb, "UNIFORM").as_f64().unwrap_or(64.0) };
                let cd = if gb.is_undefined() || gb.is_null() { 8.0 } else { reflect_get(&gb, "COPY_DST").as_f64().unwrap_or(8.0) };
                let _ = js_sys::Reflect::set(&ub_desc, &JsValue::from_str("usage"), &JsValue::from_f64(u + cd));
                let ub = create_buf.call1(&device, &ub_desc).unwrap();
                let queue = reflect_get(&device, "queue");
                let write = reflect_get(&queue, "writeBuffer").dyn_into::<Function>().unwrap();
                let ub_arr = js_sys::Float32Array::new_with_length(4);
                ub_arr.set_index(0, width as f32);
                ub_arr.set_index(1, height as f32);
                ub_arr.set_index(2, 0.0);
                ub_arr.set_index(3, 0.0);
                let _ = write.call3(&queue, &ub, &JsValue::from_f64(0.0), &ub_arr);
                let bg_desc = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&bg_desc, &JsValue::from_str("layout"), &bgl);
                let entries2 = js_sys::Array::new();
                let e0 = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&e0, &JsValue::from_str("binding"), &JsValue::from_f64(0.0));
                let res = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&res, &JsValue::from_str("buffer"), &ub);
                let _ = js_sys::Reflect::set(&e0, &JsValue::from_str("resource"), &res);
                entries2.push(&e0);
                let _ = js_sys::Reflect::set(&bg_desc, &JsValue::from_str("entries"), &entries2);
                let create_bg = reflect_get(&device, "createBindGroup").dyn_into::<Function>().unwrap();
                let bind_group = create_bg.call1(&device, &bg_desc).unwrap();
                let create_command_encoder =
                    reflect_get(&device, "createCommandEncoder").dyn_into::<Function>().unwrap();
                let encoder = create_command_encoder.call0(&device).unwrap();
                let get_current_texture =
                    reflect_get(&ctx, "getCurrentTexture").dyn_into::<Function>().unwrap();
                let texture = get_current_texture.call0(&ctx).unwrap();
                let create_view =
                    reflect_get(&texture, "createView").dyn_into::<Function>().unwrap();
                let view = create_view.call0(&texture).unwrap();
                let pass_desc = js_sys::Object::new();
                let attachments = js_sys::Array::new();
                let attachment = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&attachment, &JsValue::from_str("view"), &view);
                let _ = js_sys::Reflect::set(&attachment, &JsValue::from_str("loadOp"), &JsValue::from_str("clear"));
                let _ = js_sys::Reflect::set(&attachment, &JsValue::from_str("storeOp"), &JsValue::from_str("store"));
                let clear_value = js_sys::Object::new();
                let _ = js_sys::Reflect::set(&clear_value, &JsValue::from_str("r"), &JsValue::from_f64(0.96));
                let _ = js_sys::Reflect::set(&clear_value, &JsValue::from_str("g"), &JsValue::from_f64(0.97));
                let _ = js_sys::Reflect::set(&clear_value, &JsValue::from_str("b"), &JsValue::from_f64(0.98));
                let _ = js_sys::Reflect::set(&clear_value, &JsValue::from_str("a"), &JsValue::from_f64(0.0));
                let _ = js_sys::Reflect::set(&attachment, &JsValue::from_str("clearValue"), &clear_value);
                attachments.push(&attachment);
                let _ = js_sys::Reflect::set(&pass_desc, &JsValue::from_str("colorAttachments"), &attachments);
                let begin_render_pass =
                    reflect_get(&encoder, "beginRenderPass").dyn_into::<Function>().unwrap();
                let pass = begin_render_pass.call1(&encoder, &pass_desc).unwrap();
                let set_pipeline = reflect_get(&pass, "setPipeline").dyn_into::<Function>().unwrap();
                let _ = set_pipeline.call1(&pass, &bg_pipeline);
                let set_vb0 = reflect_get(&pass, "setVertexBuffer").dyn_into::<Function>().unwrap();
                let _ = set_vb0.call2(&pass, &JsValue::from_f64(0.0), &vb);
                let set_bg = reflect_get(&pass, "setBindGroup").dyn_into::<Function>().unwrap();
                let _ = set_bg.call2(&pass, &JsValue::from_f64(0.0), &bind_group);
                let draw = reflect_get(&pass, "draw").dyn_into::<Function>().unwrap();
                let _ = draw.call3(&pass, &JsValue::from_f64(4.0), &JsValue::from_f64(1.0), &JsValue::from_f64(0.0));
                let end = reflect_get(&pass, "end").dyn_into::<Function>().unwrap();
                let _ = end.call0(&pass);
                let finish = reflect_get(&encoder, "finish").dyn_into::<Function>().unwrap();
                let command_buffer = finish.call0(&encoder).unwrap();
                let submit_list = js_sys::Array::new();
                submit_list.push(&command_buffer);
                let queue = reflect_get(&device, "queue");
                let submit = reflect_get(&queue, "submit").dyn_into::<Function>().unwrap();
                let _ = submit.call1(&queue, &submit_list);
            }) as Box<dyn FnMut(JsValue)>);
            let _ = device_promise.then(&on_device);
            on_device.forget();
        }) as Box<dyn FnMut(JsValue)>);
        let _ = adapter_promise.then(&on_adapter);
        on_adapter.forget();
        return;
    }
    let ctx = ctx_existing;
    let device = device_existing;
    if ctx.is_undefined() || device.is_undefined() {
        return;
    }
    let _ = setup_or_draw_rects(canvas, &ctx, &device, width, height, state_sig);
}

fn setup_or_draw_rects(
    canvas: &JsValue,
    ctx: &JsValue,
    device: &JsValue,
    width: f64,
    height: f64,
    state_sig: &SignalHandle,
) -> Result<(), JsValue> {
    let pipeline_existing = reflect_get(canvas, "__wgpu_rect_pipeline");
    if pipeline_existing.is_undefined() || pipeline_existing.is_null() {
        let format = {
            let f = reflect_get(canvas, "__wgpu_format");
            if f.is_undefined() || f.is_null() { JsValue::from_str("bgra8unorm") } else { f }
        };
        // 背景棋盘格管线（覆盖整屏）
        let bg_wgsl = r#"
struct Uniforms { size: vec2<f32>, offset: vec2<f32> };
@group(0) @binding(0) var<uniform> u: Uniforms;
struct VSOut { @builtin(position) pos: vec4<f32> };
@vertex
fn vs(@location(0) pos: vec2<f32>) -> VSOut {
  var o: VSOut;
  o.pos = vec4<f32>(pos, 0.0, 1.0);
  return o;
}
@fragment
fn fs(@builtin(position) p: vec4<f32>) -> @location(0) vec4<f32> {
  let tile: f32 = 16.0;
  let ix = floor(p.x / tile);
  let iy = floor(p.y / tile);
  let k = i32(ix) + i32(iy);
  if (k % 2 == 0) {
    return vec4<f32>(243.0/255.0, 244.0/255.0, 246.0/255.0, 1.0);
  }
  return vec4<f32>(229.0/255.0, 231.0/255.0, 235.0/255.0, 1.0);
}
"#;
        let bg_shader_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&bg_shader_desc, &JsValue::from_str("code"), &JsValue::from_str(bg_wgsl));
        let create_shader = reflect_get(device, "createShaderModule").dyn_into::<Function>().unwrap();
        let bg_shader = create_shader.call1(device, &bg_shader_desc)?;

        let vs_wgsl = r#"
struct Uniforms { size: vec2<f32>, offset: vec2<f32> };
struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) color: vec4<f32> };
@group(0) @binding(0) var<uniform> u: Uniforms;
@vertex
fn vs(
  @location(0) pos: vec2<f32>,
  @location(1) inst_xywh: vec4<f32>,
  @location(2) inst_rot: f32,
  @location(3) inst_color: vec4<f32>
) -> VSOut {
  let center = vec2<f32>(inst_xywh.x + inst_xywh.z * 0.5 + u.offset.x, inst_xywh.y + inst_xywh.w * 0.5 + u.offset.y);
  let half = vec2<f32>(inst_xywh.z * 0.5, inst_xywh.w * 0.5);
  let c = cos(inst_rot);
  let s = sin(inst_rot);
  let r = vec2<f32>(
    pos.x * half.x * c - pos.y * half.y * s,
    pos.x * half.x * s + pos.y * half.y * c
  );
  let pixel = center + r;
  let ndc = vec2<f32>(pixel.x / u.size.x * 2.0 - 1.0, 1.0 - pixel.y / u.size.y * 2.0);
  var o: VSOut;
  o.pos = vec4<f32>(ndc, 0.0, 1.0);
  o.color = inst_color;
  return o;
}
@fragment
fn fs(i: VSOut) -> @location(0) vec4<f32> {
  return i.color;
}
"#;
        let shader_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&shader_desc, &JsValue::from_str("code"), &JsValue::from_str(vs_wgsl));
        let create_shader = reflect_get(device, "createShaderModule").dyn_into::<Function>().unwrap();
        let shader = create_shader.call1(device, &shader_desc)?;

        let bgl_desc = js_sys::Object::new();
        let entries = js_sys::Array::new();
        let entry = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&entry, &JsValue::from_str("binding"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&entry, &JsValue::from_str("visibility"), &JsValue::from_f64(1.0));
        let buf = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&buf, &JsValue::from_str("type"), &JsValue::from_str("uniform"));
        let _ = js_sys::Reflect::set(&entry, &JsValue::from_str("buffer"), &buf);
        entries.push(&entry);
        let _ = js_sys::Reflect::set(&bgl_desc, &JsValue::from_str("entries"), &entries);
        let create_bgl = reflect_get(device, "createBindGroupLayout").dyn_into::<Function>().unwrap();
        let bgl = create_bgl.call1(device, &bgl_desc)?;

        let pl_desc = js_sys::Object::new();
        let pl_entries = js_sys::Array::new();
        let _ = js_sys::Reflect::set(&pl_entries, &JsValue::from_f64(0.0), &bgl);
        let _ = js_sys::Reflect::set(&pl_desc, &JsValue::from_str("bindGroupLayouts"), &pl_entries);
        let create_pl = reflect_get(device, "createPipelineLayout").dyn_into::<Function>().unwrap();
        let pipeline_layout = create_pl.call1(device, &pl_desc)?;

        // 背景管线
        let bg_rp_desc = js_sys::Object::new();
        let bg_vertex = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&bg_vertex, &JsValue::from_str("module"), &bg_shader);
        let _ = js_sys::Reflect::set(&bg_vertex, &JsValue::from_str("entryPoint"), &JsValue::from_str("vs"));
        let bg_buffers = js_sys::Array::new();
        let bg_vb0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&bg_vb0, &JsValue::from_str("arrayStride"), &JsValue::from_f64(8.0));
        let _ = js_sys::Reflect::set(&bg_vb0, &JsValue::from_str("stepMode"), &JsValue::from_str("vertex"));
        let bg_vb0_attrs = js_sys::Array::new();
        let bg_a0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&bg_a0, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&bg_a0, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&bg_a0, &JsValue::from_str("format"), &JsValue::from_str("float32x2"));
        bg_vb0_attrs.push(&bg_a0);
        let _ = js_sys::Reflect::set(&bg_vb0, &JsValue::from_str("attributes"), &bg_vb0_attrs);
        bg_buffers.push(&bg_vb0);
        let _ = js_sys::Reflect::set(&bg_vertex, &JsValue::from_str("buffers"), &bg_buffers);
        let bg_fragment = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&bg_fragment, &JsValue::from_str("module"), &bg_shader);
        let _ = js_sys::Reflect::set(&bg_fragment, &JsValue::from_str("entryPoint"), &JsValue::from_str("fs"));
        let bg_targets = js_sys::Array::new();
        let bg_t0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&bg_t0, &JsValue::from_str("format"), &format);
        bg_targets.push(&bg_t0);
        let _ = js_sys::Reflect::set(&bg_fragment, &JsValue::from_str("targets"), &bg_targets);
        let _ = js_sys::Reflect::set(&bg_rp_desc, &JsValue::from_str("layout"), &pipeline_layout);
        let _ = js_sys::Reflect::set(&bg_rp_desc, &JsValue::from_str("vertex"), &bg_vertex);
        let _ = js_sys::Reflect::set(&bg_rp_desc, &JsValue::from_str("fragment"), &bg_fragment);
        let bg_primitive = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&bg_primitive, &JsValue::from_str("topology"), &JsValue::from_str("triangle-strip"));
        let _ = js_sys::Reflect::set(&bg_rp_desc, &JsValue::from_str("primitive"), &bg_primitive);
        let create_rp = reflect_get(device, "createRenderPipeline").dyn_into::<Function>().unwrap();
        let bg_pipeline = create_rp.call1(device, &bg_rp_desc)?;
        reflect_set(canvas, "__wgpu_bg_pipeline", &bg_pipeline);

        let ln_wgsl = r#"
struct Uniforms { size: vec2<f32>, offset: vec2<f32> };
struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) color: vec4<f32> };
@group(0) @binding(0) var<uniform> u: Uniforms;
@vertex
fn vs(
  @location(0) pos: vec2<f32>,
  @location(1) inst_line: vec4<f32>,
  @location(2) inst_thick: f32,
  @location(3) inst_color: vec4<f32>
) -> VSOut {
  let s = vec2<f32>(inst_line.x, inst_line.y) + u.offset;
  let e = vec2<f32>(inst_line.z, inst_line.w) + u.offset;
  let d = normalize(e - s);
  let p = vec2<f32>(-d.y, d.x) * inst_thick * 0.5 * pos.x;
  let t = mix(s, e, (pos.y + 1.0) * 0.5);
  let pixel = t + p;
  let ndc = vec2<f32>(pixel.x / u.size.x * 2.0 - 1.0, 1.0 - pixel.y / u.size.y * 2.0);
  var o: VSOut;
  o.pos = vec4<f32>(ndc, 0.0, 1.0);
  o.color = inst_color;
  return o;
}
@fragment
fn fs(i: VSOut) -> @location(0) vec4<f32> {
  return i.color;
}
"#;
        let ln_shader_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_shader_desc, &JsValue::from_str("code"), &JsValue::from_str(ln_wgsl));
        let ln_shader = create_shader.call1(device, &ln_shader_desc)?;
        let ln_rp_desc = js_sys::Object::new();
        let ln_vertex = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_vertex, &JsValue::from_str("module"), &ln_shader);
        let _ = js_sys::Reflect::set(&ln_vertex, &JsValue::from_str("entryPoint"), &JsValue::from_str("vs"));
        let ln_buffers = js_sys::Array::new();
        let ln_vb0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_vb0, &JsValue::from_str("arrayStride"), &JsValue::from_f64(8.0));
        let _ = js_sys::Reflect::set(&ln_vb0, &JsValue::from_str("stepMode"), &JsValue::from_str("vertex"));
        let ln_vb0_attrs = js_sys::Array::new();
        let ln_a0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_a0, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&ln_a0, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&ln_a0, &JsValue::from_str("format"), &JsValue::from_str("float32x2"));
        ln_vb0_attrs.push(&ln_a0);
        let _ = js_sys::Reflect::set(&ln_vb0, &JsValue::from_str("attributes"), &ln_vb0_attrs);
        ln_buffers.push(&ln_vb0);
        let ln_vb1 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_vb1, &JsValue::from_str("arrayStride"), &JsValue::from_f64(48.0));
        let _ = js_sys::Reflect::set(&ln_vb1, &JsValue::from_str("stepMode"), &JsValue::from_str("instance"));
        let ln_vb1_attrs = js_sys::Array::new();
        let ln_b1 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_b1, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(1.0));
        let _ = js_sys::Reflect::set(&ln_b1, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&ln_b1, &JsValue::from_str("format"), &JsValue::from_str("float32x4"));
        ln_vb1_attrs.push(&ln_b1);
        let ln_b2 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_b2, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(2.0));
        let _ = js_sys::Reflect::set(&ln_b2, &JsValue::from_str("offset"), &JsValue::from_f64(16.0));
        let _ = js_sys::Reflect::set(&ln_b2, &JsValue::from_str("format"), &JsValue::from_str("float32"));
        ln_vb1_attrs.push(&ln_b2);
        let ln_b3 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_b3, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(3.0));
        let _ = js_sys::Reflect::set(&ln_b3, &JsValue::from_str("offset"), &JsValue::from_f64(32.0));
        let _ = js_sys::Reflect::set(&ln_b3, &JsValue::from_str("format"), &JsValue::from_str("float32x4"));
        ln_vb1_attrs.push(&ln_b3);
        let _ = js_sys::Reflect::set(&ln_vb1, &JsValue::from_str("attributes"), &ln_vb1_attrs);
        ln_buffers.push(&ln_vb1);
        let _ = js_sys::Reflect::set(&ln_vertex, &JsValue::from_str("buffers"), &ln_buffers);
        let ln_fragment = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_fragment, &JsValue::from_str("module"), &ln_shader);
        let _ = js_sys::Reflect::set(&ln_fragment, &JsValue::from_str("entryPoint"), &JsValue::from_str("fs"));
        let ln_targets = js_sys::Array::new();
        let ln_t0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_t0, &JsValue::from_str("format"), &format);
        ln_targets.push(&ln_t0);
        let _ = js_sys::Reflect::set(&ln_fragment, &JsValue::from_str("targets"), &ln_targets);
        let _ = js_sys::Reflect::set(&ln_rp_desc, &JsValue::from_str("layout"), &pipeline_layout);
        let _ = js_sys::Reflect::set(&ln_rp_desc, &JsValue::from_str("vertex"), &ln_vertex);
        let ln_primitive = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&ln_primitive, &JsValue::from_str("topology"), &JsValue::from_str("triangle-strip"));
        let _ = js_sys::Reflect::set(&ln_rp_desc, &JsValue::from_str("primitive"), &ln_primitive);
        let _ = js_sys::Reflect::set(&ln_rp_desc, &JsValue::from_str("fragment"), &ln_fragment);
        let ln_pipeline = create_rp.call1(device, &ln_rp_desc)?;
        reflect_set(canvas, "__wgpu_line_pipeline", &ln_pipeline);

        let cir_wgsl = r#"
struct Uniforms { size: vec2<f32>, offset: vec2<f32> };
struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) center: vec2<f32>, @location(2) radii: vec2<f32>, @location(3) rot: f32, @location(4) color: vec4<f32> };
@group(0) @binding(0) var<uniform> u: Uniforms;
@vertex
fn vs(
  @location(0) pos: vec2<f32>,
  @location(1) inst_xy: vec2<f32>,
  @location(2) inst_r: vec2<f32>,
  @location(3) inst_rot: f32,
  @location(4) inst_color: vec4<f32>
) -> VSOut {
  let c = cos(inst_rot);
  let s = sin(inst_rot);
  let p = vec2<f32>(pos.x * inst_r.x, pos.y * inst_r.y);
  let r = vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
  let pixel = inst_xy + u.offset + r;
  let ndc = vec2<f32>(pixel.x / u.size.x * 2.0 - 1.0, 1.0 - pixel.y / u.size.y * 2.0);
  var o: VSOut;
  o.pos = vec4<f32>(ndc, 0.0, 1.0);
  o.uv = pos;
  o.center = inst_xy + u.offset;
  o.radii = inst_r;
  o.rot = inst_rot;
  o.color = inst_color;
  return o;
}
fn bg_color(p: vec2<f32>) -> vec4<f32> {
  let tile: f32 = 16.0;
  let ix = floor(p.x / tile);
  let iy = floor(p.y / tile);
  let k = i32(ix) + i32(iy);
  if (k % 2 == 0) {
    return vec4<f32>(243.0/255.0, 244.0/255.0, 246.0/255.0, 1.0);
  }
  return vec4<f32>(229.0/255.0, 231.0/255.0, 235.0/255.0, 1.0);
}
@fragment
fn fs(i: VSOut) -> @location(0) vec4<f32> {
  let d = vec2<f32>(i.uv.x, i.uv.y);
  let v = (d.x*d.x)/(i.radii.x*i.radii.x) + (d.y*d.y)/(i.radii.y*i.radii.y);
  let m = select(0.0, 1.0, v <= 1.0);
  // 仅在圆形区域内着色；圆外保持透明，避免覆盖背景
  return vec4<f32>(i.color.rgb, i.color.a * m);
}
"#;
        let cir_shader_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_shader_desc, &JsValue::from_str("code"), &JsValue::from_str(cir_wgsl));
        let cir_shader = create_shader.call1(device, &cir_shader_desc)?;
        let cir_rp_desc = js_sys::Object::new();
        let cir_vertex = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_vertex, &JsValue::from_str("module"), &cir_shader);
        let _ = js_sys::Reflect::set(&cir_vertex, &JsValue::from_str("entryPoint"), &JsValue::from_str("vs"));
        let cir_buffers = js_sys::Array::new();
        let cir_vb0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_vb0, &JsValue::from_str("arrayStride"), &JsValue::from_f64(8.0));
        let _ = js_sys::Reflect::set(&cir_vb0, &JsValue::from_str("stepMode"), &JsValue::from_str("vertex"));
        let cir_vb0_attrs = js_sys::Array::new();
        let cir_a0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_a0, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&cir_a0, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&cir_a0, &JsValue::from_str("format"), &JsValue::from_str("float32x2"));
        cir_vb0_attrs.push(&cir_a0);
        let _ = js_sys::Reflect::set(&cir_vb0, &JsValue::from_str("attributes"), &cir_vb0_attrs);
        cir_buffers.push(&cir_vb0);
        let cir_vb1 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_vb1, &JsValue::from_str("arrayStride"), &JsValue::from_f64(40.0));
        let _ = js_sys::Reflect::set(&cir_vb1, &JsValue::from_str("stepMode"), &JsValue::from_str("instance"));
        let cir_vb1_attrs = js_sys::Array::new();
        let cir_b1 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_b1, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(1.0));
        let _ = js_sys::Reflect::set(&cir_b1, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&cir_b1, &JsValue::from_str("format"), &JsValue::from_str("float32x2"));
        cir_vb1_attrs.push(&cir_b1);
        let cir_b2 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_b2, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(2.0));
        let _ = js_sys::Reflect::set(&cir_b2, &JsValue::from_str("offset"), &JsValue::from_f64(8.0));
        let _ = js_sys::Reflect::set(&cir_b2, &JsValue::from_str("format"), &JsValue::from_str("float32x2"));
        cir_vb1_attrs.push(&cir_b2);
        let cir_b3 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_b3, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(3.0));
        let _ = js_sys::Reflect::set(&cir_b3, &JsValue::from_str("offset"), &JsValue::from_f64(16.0));
        let _ = js_sys::Reflect::set(&cir_b3, &JsValue::from_str("format"), &JsValue::from_str("float32"));
        cir_vb1_attrs.push(&cir_b3);
        let cir_b4 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_b4, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(4.0));
        let _ = js_sys::Reflect::set(&cir_b4, &JsValue::from_str("offset"), &JsValue::from_f64(20.0));
        let _ = js_sys::Reflect::set(&cir_b4, &JsValue::from_str("format"), &JsValue::from_str("float32x4"));
        cir_vb1_attrs.push(&cir_b4);
        let _ = js_sys::Reflect::set(&cir_vb1, &JsValue::from_str("attributes"), &cir_vb1_attrs);
        cir_buffers.push(&cir_vb1);
        let _ = js_sys::Reflect::set(&cir_vertex, &JsValue::from_str("buffers"), &cir_buffers);
        let cir_fragment = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_fragment, &JsValue::from_str("module"), &cir_shader);
        let _ = js_sys::Reflect::set(&cir_fragment, &JsValue::from_str("entryPoint"), &JsValue::from_str("fs"));
        let cir_targets = js_sys::Array::new();
        let cir_t0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_t0, &JsValue::from_str("format"), &format);
        cir_targets.push(&cir_t0);
        let _ = js_sys::Reflect::set(&cir_fragment, &JsValue::from_str("targets"), &cir_targets);
        let _ = js_sys::Reflect::set(&cir_rp_desc, &JsValue::from_str("layout"), &pipeline_layout);
        let _ = js_sys::Reflect::set(&cir_rp_desc, &JsValue::from_str("vertex"), &cir_vertex);
        let cir_primitive = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&cir_primitive, &JsValue::from_str("topology"), &JsValue::from_str("triangle-strip"));
        let _ = js_sys::Reflect::set(&cir_rp_desc, &JsValue::from_str("primitive"), &cir_primitive);
        let _ = js_sys::Reflect::set(&cir_rp_desc, &JsValue::from_str("fragment"), &cir_fragment);
        let cir_pipeline = create_rp.call1(device, &cir_rp_desc)?;
        reflect_set(canvas, "__wgpu_circle_pipeline", &cir_pipeline);

        let img_bgl_desc = js_sys::Object::new();
        let img_entries = js_sys::Array::new();
        let e_buf = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&e_buf, &JsValue::from_str("binding"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&e_buf, &JsValue::from_str("visibility"), &JsValue::from_f64(1.0));
        let e_buf_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&e_buf_desc, &JsValue::from_str("type"), &JsValue::from_str("uniform"));
        let _ = js_sys::Reflect::set(&e_buf, &JsValue::from_str("buffer"), &e_buf_desc);
        img_entries.push(&e_buf);
        let e_sampler = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&e_sampler, &JsValue::from_str("binding"), &JsValue::from_f64(1.0));
        let _ = js_sys::Reflect::set(&e_sampler, &JsValue::from_str("visibility"), &JsValue::from_f64(2.0));
        let sampler_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&e_sampler, &JsValue::from_str("sampler"), &sampler_desc);
        img_entries.push(&e_sampler);
        let e_tex = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&e_tex, &JsValue::from_str("binding"), &JsValue::from_f64(2.0));
        let _ = js_sys::Reflect::set(&e_tex, &JsValue::from_str("visibility"), &JsValue::from_f64(2.0));
        let tex_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&tex_desc, &JsValue::from_str("sampleType"), &JsValue::from_str("float"));
        let _ = js_sys::Reflect::set(&e_tex, &JsValue::from_str("texture"), &tex_desc);
        img_entries.push(&e_tex);
        let _ = js_sys::Reflect::set(&img_bgl_desc, &JsValue::from_str("entries"), &img_entries);
        let create_bgl = reflect_get(device, "createBindGroupLayout").dyn_into::<Function>().unwrap();
        let img_bgl = create_bgl.call1(device, &img_bgl_desc)?;
        reflect_set(canvas, "__wgpu_img_bgl", &img_bgl);
        let pl2_desc = js_sys::Object::new();
        let pls = js_sys::Array::new();
        let _ = js_sys::Reflect::set(&pls, &JsValue::from_f64(0.0), &bgl);
        let _ = js_sys::Reflect::set(&pls, &JsValue::from_f64(1.0), &img_bgl);
        let _ = js_sys::Reflect::set(&pl2_desc, &JsValue::from_str("bindGroupLayouts"), &pls);
        let create_pl = reflect_get(device, "createPipelineLayout").dyn_into::<Function>().unwrap();
        let img_pipeline_layout = create_pl.call1(device, &pl2_desc)?;
        let img_wgsl = r#"
struct Uniforms { size: vec2<f32>, offset: vec2<f32> };
struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };
@group(1) @binding(1) var samp: sampler;
@group(1) @binding(2) var tex: texture_2d<f32>;
@group(0) @binding(0) var<uniform> u: Uniforms;
@vertex
fn vs(
  @location(0) pos: vec2<f32>,
  @location(1) inst_xywh: vec4<f32>,
  @location(2) inst_rot: f32
) -> VSOut {
  let c = cos(inst_rot);
  let s = sin(inst_rot);
  let half = vec2<f32>(inst_xywh.z * 0.5, inst_xywh.w * 0.5);
  let r = vec2<f32>(
    pos.x * half.x * c - pos.y * half.y * s,
    pos.x * half.x * s + pos.y * half.y * c
  );
  let center = vec2<f32>(inst_xywh.x + half.x, inst_xywh.y + half.y) + u.offset;
  let pixel = center + r;
  let ndc = vec2<f32>(pixel.x / u.size.x * 2.0 - 1.0, 1.0 - pixel.y / u.size.y * 2.0);
  var o: VSOut;
  o.pos = vec4<f32>(ndc, 0.0, 1.0);
  o.uv = (pos + vec2<f32>(1.0, 1.0)) * 0.5;
  return o;
}
@fragment
fn fs(i: VSOut) -> @location(0) vec4<f32> {
  return textureSample(tex, samp, i.uv);
}
"#;
        let img_shader_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_shader_desc, &JsValue::from_str("code"), &JsValue::from_str(img_wgsl));
        let create_shader = reflect_get(device, "createShaderModule").dyn_into::<Function>().unwrap();
        let img_shader = create_shader.call1(device, &img_shader_desc)?;
        let img_rp_desc = js_sys::Object::new();
        let img_vertex = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_vertex, &JsValue::from_str("module"), &img_shader);
        let _ = js_sys::Reflect::set(&img_vertex, &JsValue::from_str("entryPoint"), &JsValue::from_str("vs"));
        let img_buffers = js_sys::Array::new();
        let img_vb0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_vb0, &JsValue::from_str("arrayStride"), &JsValue::from_f64(8.0));
        let _ = js_sys::Reflect::set(&img_vb0, &JsValue::from_str("stepMode"), &JsValue::from_str("vertex"));
        let img_vb0_attrs = js_sys::Array::new();
        let img_a0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_a0, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&img_a0, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&img_a0, &JsValue::from_str("format"), &JsValue::from_str("float32x2"));
        img_vb0_attrs.push(&img_a0);
        let _ = js_sys::Reflect::set(&img_vb0, &JsValue::from_str("attributes"), &img_vb0_attrs);
        img_buffers.push(&img_vb0);
        let img_vb1 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_vb1, &JsValue::from_str("arrayStride"), &JsValue::from_f64(20.0));
        let _ = js_sys::Reflect::set(&img_vb1, &JsValue::from_str("stepMode"), &JsValue::from_str("instance"));
        let img_vb1_attrs = js_sys::Array::new();
        let img_b1 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_b1, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(1.0));
        let _ = js_sys::Reflect::set(&img_b1, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&img_b1, &JsValue::from_str("format"), &JsValue::from_str("float32x4"));
        img_vb1_attrs.push(&img_b1);
        let img_b2 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_b2, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(2.0));
        let _ = js_sys::Reflect::set(&img_b2, &JsValue::from_str("offset"), &JsValue::from_f64(16.0));
        let _ = js_sys::Reflect::set(&img_b2, &JsValue::from_str("format"), &JsValue::from_str("float32"));
        img_vb1_attrs.push(&img_b2);
        let _ = js_sys::Reflect::set(&img_vb1, &JsValue::from_str("attributes"), &img_vb1_attrs);
        img_buffers.push(&img_vb1);
        let _ = js_sys::Reflect::set(&img_vertex, &JsValue::from_str("buffers"), &img_buffers);
        let img_fragment = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_fragment, &JsValue::from_str("module"), &img_shader);
        let _ = js_sys::Reflect::set(&img_fragment, &JsValue::from_str("entryPoint"), &JsValue::from_str("fs"));
        let img_targets = js_sys::Array::new();
        let img_t0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_t0, &JsValue::from_str("format"), &format);
        img_targets.push(&img_t0);
        let _ = js_sys::Reflect::set(&img_fragment, &JsValue::from_str("targets"), &img_targets);
        let _ = js_sys::Reflect::set(&img_rp_desc, &JsValue::from_str("layout"), &img_pipeline_layout);
        let _ = js_sys::Reflect::set(&img_rp_desc, &JsValue::from_str("vertex"), &img_vertex);
        let _ = js_sys::Reflect::set(&img_rp_desc, &JsValue::from_str("fragment"), &img_fragment);
        let img_primitive = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&img_primitive, &JsValue::from_str("topology"), &JsValue::from_str("triangle-strip"));
        let _ = js_sys::Reflect::set(&img_rp_desc, &JsValue::from_str("primitive"), &img_primitive);
        let create_rp = reflect_get(device, "createRenderPipeline").dyn_into::<Function>().unwrap();
        let img_pipeline = create_rp.call1(device, &img_rp_desc)?;
        reflect_set(canvas, "__wgpu_img_pipeline", &img_pipeline);
        let create_sampler = reflect_get(device, "createSampler").dyn_into::<Function>().unwrap();
        let sampler_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&sampler_desc, &JsValue::from_str("magFilter"), &JsValue::from_str("linear"));
        let _ = js_sys::Reflect::set(&sampler_desc, &JsValue::from_str("minFilter"), &JsValue::from_str("linear"));
        let img_sampler = create_sampler.call1(device, &sampler_desc)?;
        reflect_set(canvas, "__wgpu_img_sampler", &img_sampler);

        let rp_desc = js_sys::Object::new();
        let vertex = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&vertex, &JsValue::from_str("module"), &shader);
        let _ = js_sys::Reflect::set(&vertex, &JsValue::from_str("entryPoint"), &JsValue::from_str("vs"));
        let buffers = js_sys::Array::new();
        let vb0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&vb0, &JsValue::from_str("arrayStride"), &JsValue::from_f64(8.0));
        let _ = js_sys::Reflect::set(&vb0, &JsValue::from_str("stepMode"), &JsValue::from_str("vertex"));
        let vb0_attrs = js_sys::Array::new();
        let a0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&a0, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&a0, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&a0, &JsValue::from_str("format"), &JsValue::from_str("float32x2"));
        vb0_attrs.push(&a0);
        let _ = js_sys::Reflect::set(&vb0, &JsValue::from_str("attributes"), &vb0_attrs);
        buffers.push(&vb0);
        let vb1 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&vb1, &JsValue::from_str("arrayStride"), &JsValue::from_f64(9.0 * 4.0));
        let _ = js_sys::Reflect::set(&vb1, &JsValue::from_str("stepMode"), &JsValue::from_str("instance"));
        let vb1_attrs = js_sys::Array::new();
        let a1 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&a1, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(1.0));
        let _ = js_sys::Reflect::set(&a1, &JsValue::from_str("offset"), &JsValue::from_f64(0.0));
        let _ = js_sys::Reflect::set(&a1, &JsValue::from_str("format"), &JsValue::from_str("float32x4"));
        vb1_attrs.push(&a1);
        let a2 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&a2, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(2.0));
        let _ = js_sys::Reflect::set(&a2, &JsValue::from_str("offset"), &JsValue::from_f64(16.0));
        let _ = js_sys::Reflect::set(&a2, &JsValue::from_str("format"), &JsValue::from_str("float32"));
        vb1_attrs.push(&a2);
        let a3 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&a3, &JsValue::from_str("shaderLocation"), &JsValue::from_f64(3.0));
        let _ = js_sys::Reflect::set(&a3, &JsValue::from_str("offset"), &JsValue::from_f64(20.0));
        let _ = js_sys::Reflect::set(&a3, &JsValue::from_str("format"), &JsValue::from_str("float32x4"));
        vb1_attrs.push(&a3);
        let _ = js_sys::Reflect::set(&vb1, &JsValue::from_str("attributes"), &vb1_attrs);
        buffers.push(&vb1);
        let _ = js_sys::Reflect::set(&vertex, &JsValue::from_str("buffers"), &buffers);
        let primitive = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&primitive, &JsValue::from_str("topology"), &JsValue::from_str("triangle-strip"));
        let fragment = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&fragment, &JsValue::from_str("module"), &shader);
        let _ = js_sys::Reflect::set(&fragment, &JsValue::from_str("entryPoint"), &JsValue::from_str("fs"));
        let frag_targets = js_sys::Array::new();
        let t0 = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&t0, &JsValue::from_str("format"), &format);
        frag_targets.push(&t0);
        let _ = js_sys::Reflect::set(&fragment, &JsValue::from_str("targets"), &frag_targets);
        let _ = js_sys::Reflect::set(&rp_desc, &JsValue::from_str("layout"), &pipeline_layout);
        let _ = js_sys::Reflect::set(&rp_desc, &JsValue::from_str("vertex"), &vertex);
        let _ = js_sys::Reflect::set(&rp_desc, &JsValue::from_str("primitive"), &primitive);
        let _ = js_sys::Reflect::set(&rp_desc, &JsValue::from_str("fragment"), &fragment);
        let create_rp = reflect_get(device, "createRenderPipeline").dyn_into::<Function>().unwrap();
        let pipeline = create_rp.call1(device, &rp_desc)?;
        reflect_set(canvas, "__wgpu_rect_pipeline", &pipeline);
        let vb_data = js_sys::Float32Array::new_with_length(8);
        vb_data.set_index(0, -1.0);
        vb_data.set_index(1, -1.0);
        vb_data.set_index(2, 1.0);
        vb_data.set_index(3, -1.0);
        vb_data.set_index(4, -1.0);
        vb_data.set_index(5, 1.0);
        vb_data.set_index(6, 1.0);
        vb_data.set_index(7, 1.0);
        let buf_desc = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&buf_desc, &JsValue::from_str("size"), &JsValue::from_f64(8.0 * 4.0));
        let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
        let v = if gb.is_undefined() || gb.is_null() {
            JsValue::from_f64(32.0)
        } else {
            reflect_get(&gb, "VERTEX")
        };
        let _ = js_sys::Reflect::set(&buf_desc, &JsValue::from_str("usage"), &v);
        let _ = js_sys::Reflect::set(&buf_desc, &JsValue::from_str("mappedAtCreation"), &JsValue::from_bool(true));
        let create_buf = reflect_get(device, "createBuffer").dyn_into::<Function>().unwrap();
        let vb = create_buf.call1(device, &buf_desc)?;
        let get_map = reflect_get(&vb, "getMappedRange").dyn_into::<Function>().unwrap();
        let range = get_map.call0(&vb)?;
        let arr = js_sys::Float32Array::new(&range);
        let _ = arr.set(&vb_data, 0);
        let unmap = reflect_get(&vb, "unmap").dyn_into::<Function>().unwrap();
        let _ = unmap.call0(&vb);
        reflect_set(canvas, "__wgpu_rect_vb", &vb);
        reflect_set(canvas, "__wgpu_rect_bgl", &bgl);
    }
    let pipeline = reflect_get(canvas, "__wgpu_rect_pipeline");
    let vb = reflect_get(canvas, "__wgpu_rect_vb");
    let bgl = reflect_get(canvas, "__wgpu_rect_bgl");
    let bg_pipeline = reflect_get(canvas, "__wgpu_bg_pipeline");
    let ln_pipeline = reflect_get(canvas, "__wgpu_line_pipeline");
    let cir_pipeline = reflect_get(canvas, "__wgpu_circle_pipeline");
    let img_pipeline = reflect_get(canvas, "__wgpu_img_pipeline");
    let img_bgl = reflect_get(canvas, "__wgpu_img_bgl");
    let img_sampler = reflect_get(canvas, "__wgpu_img_sampler");
    if pipeline.is_undefined() || vb.is_undefined() || bgl.is_undefined() {
        return Ok(());
    }
    let vx = state_sig.get_path_js(JsValue::from_str("viewport.offset_x")).as_f64().unwrap_or(0.0);
    let vy = state_sig.get_path_js(JsValue::from_str("viewport.offset_y")).as_f64().unwrap_or(0.0);
    let cur_page = state_sig.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
    let layers_v = state_sig.get_path_js(JsValue::from_str("layers"));
    let arr_layers = js_sys::Array::from(&layers_v);
    let mut rect_count = 0u32;
    let mut line_count = 0u32;
    let mut cir_count = 0u32;
    let mut img_layers: Vec<JsValue> = Vec::new();
    for i in 0..arr_layers.length() {
        let l = arr_layers.get(i);
        let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
        if !vis { continue; }
        let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
        if pid != cur_page { continue; }
        let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
        if kind == "rect" { rect_count += 1; }
        if kind == "line" { line_count += 1; }
        if kind == "circle" { cir_count += 1; }
        if kind == "image" { img_layers.push(l); }
    }
    let floats_per = 9u32;
    let total = rect_count * floats_per;
    let inst_data = js_sys::Float32Array::new_with_length(total);
    let mut idx = 0u32;
    for i in 0..arr_layers.length() {
        let l = arr_layers.get(i);
        let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
        if !vis { continue; }
        let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
        if pid != cur_page { continue; }
        let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
        if kind != "rect" { continue; }
        let x = js_sys::Reflect::get(&l, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let y = js_sys::Reflect::get(&l, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let wv = js_sys::Reflect::get(&l, &JsValue::from_str("w")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let hv = js_sys::Reflect::get(&l, &JsValue::from_str("h")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let rot = js_sys::Reflect::get(&l, &JsValue::from_str("rotation")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let col_s = js_sys::Reflect::get(&l, &JsValue::from_str("color")).unwrap_or(JsValue::from_str("#ffffff")).as_string().unwrap_or("#ffffff".to_string());
        let (r, g, b, a) = parse_color_rgba(&col_s);
        inst_data.set_index(idx as u32, x);
        inst_data.set_index(idx as u32 + 1, y);
        inst_data.set_index(idx as u32 + 2, wv);
        inst_data.set_index(idx as u32 + 3, hv);
        inst_data.set_index(idx as u32 + 4, rot);
        inst_data.set_index(idx as u32 + 5, r);
        inst_data.set_index(idx as u32 + 6, g);
        inst_data.set_index(idx as u32 + 7, b);
        inst_data.set_index(idx as u32 + 8, a);
        idx += floats_per;
    }
    let buf_desc = js_sys::Object::new();
    let sz = (total as f64) * 4.0;
    let _ = js_sys::Reflect::set(&buf_desc, &JsValue::from_str("size"), &JsValue::from_f64(sz));
    let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
    let v = if gb.is_undefined() || gb.is_null() { 32.0 } else { reflect_get(&gb, "VERTEX").as_f64().unwrap_or(32.0) };
    let cd = if gb.is_undefined() || gb.is_null() { 8.0 } else { reflect_get(&gb, "COPY_DST").as_f64().unwrap_or(8.0) };
    let _ = js_sys::Reflect::set(&buf_desc, &JsValue::from_str("usage"), &JsValue::from_f64(v + cd));
    let create_buf = reflect_get(device, "createBuffer").dyn_into::<Function>().unwrap();
    let inst_buf = create_buf.call1(device, &buf_desc)?;
    let queue = reflect_get(device, "queue");
    let write = reflect_get(&queue, "writeBuffer").dyn_into::<Function>().unwrap();
    let _ = write.call3(&queue, &inst_buf, &JsValue::from_f64(0.0), &inst_data);

    let ln_stride = 12u32;
    let ln_total = line_count * ln_stride;
    let ln_data = js_sys::Float32Array::new_with_length(ln_total);
    let mut lidx = 0u32;
    for i in 0..arr_layers.length() {
        let l = arr_layers.get(i);
        let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
        if !vis { continue; }
        let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
        if pid != cur_page { continue; }
        let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
        if kind != "line" { continue; }
        let x1 = js_sys::Reflect::get(&l, &JsValue::from_str("x1")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let y1 = js_sys::Reflect::get(&l, &JsValue::from_str("y1")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let x2 = js_sys::Reflect::get(&l, &JsValue::from_str("x2")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let y2 = js_sys::Reflect::get(&l, &JsValue::from_str("y2")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let thick = js_sys::Reflect::get(&l, &JsValue::from_str("thick")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0) as f32;
        let col_s = js_sys::Reflect::get(&l, &JsValue::from_str("color")).unwrap_or(JsValue::from_str("#111111")).as_string().unwrap_or("#111111".to_string());
        let (r, g, b, a) = parse_color_rgba(&col_s);
        ln_data.set_index(lidx, x1);
        ln_data.set_index(lidx + 1, y1);
        ln_data.set_index(lidx + 2, x2);
        ln_data.set_index(lidx + 3, y2);
        ln_data.set_index(lidx + 4, thick);
        ln_data.set_index(lidx + 5, r);
        ln_data.set_index(lidx + 6, g);
        ln_data.set_index(lidx + 7, b);
        ln_data.set_index(lidx + 8, a);
        ln_data.set_index(lidx + 9, 0.0);
        ln_data.set_index(lidx + 10, 0.0);
        ln_data.set_index(lidx + 11, 0.0);
        lidx += ln_stride;
    }
    let ln_desc = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&ln_desc, &JsValue::from_str("size"), &JsValue::from_f64((ln_total as f64) * 4.0));
    let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
    let v = if gb.is_undefined() || gb.is_null() { 32.0 } else { reflect_get(&gb, "VERTEX").as_f64().unwrap_or(32.0) };
    let cd = if gb.is_undefined() || gb.is_null() { 8.0 } else { reflect_get(&gb, "COPY_DST").as_f64().unwrap_or(8.0) };
    let _ = js_sys::Reflect::set(&ln_desc, &JsValue::from_str("usage"), &JsValue::from_f64(v + cd));
    let ln_buf = create_buf.call1(device, &ln_desc)?;
    let _ = write.call3(&queue, &ln_buf, &JsValue::from_f64(0.0), &ln_data);

    let cir_stride = 10u32;
    let cir_total = cir_count * cir_stride;
    let cir_data = js_sys::Float32Array::new_with_length(cir_total);
    let mut cidx = 0u32;
    for i in 0..arr_layers.length() {
        let l = arr_layers.get(i);
        let vis = js_sys::Reflect::get(&l, &JsValue::from_str("visible")).unwrap_or(JsValue::from_bool(true)).as_bool().unwrap_or(true);
        if !vis { continue; }
        let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id")).unwrap_or(JsValue::from_f64(1.0)).as_f64().unwrap_or(1.0);
        if pid != cur_page { continue; }
        let kind = js_sys::Reflect::get(&l, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
        if kind != "circle" { continue; }
        let cx = js_sys::Reflect::get(&l, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let cy = js_sys::Reflect::get(&l, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let rx = js_sys::Reflect::get(&l, &JsValue::from_str("rx")).unwrap_or(JsValue::from_f64(30.0)).as_f64().unwrap_or(30.0) as f32;
        let ry = js_sys::Reflect::get(&l, &JsValue::from_str("ry")).unwrap_or(JsValue::from_f64(30.0)).as_f64().unwrap_or(30.0) as f32;
        let rot = js_sys::Reflect::get(&l, &JsValue::from_str("rotation")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
        let col_s = js_sys::Reflect::get(&l, &JsValue::from_str("color")).unwrap_or(JsValue::from_str("#111111")).as_string().unwrap_or("#111111".to_string());
        let (r, g, b, a) = parse_color_rgba(&col_s);
        cir_data.set_index(cidx, cx);
        cir_data.set_index(cidx + 1, cy);
        cir_data.set_index(cidx + 2, rx);
        cir_data.set_index(cidx + 3, ry);
        cir_data.set_index(cidx + 4, rot);
        cir_data.set_index(cidx + 5, r);
        cir_data.set_index(cidx + 6, g);
        cir_data.set_index(cidx + 7, b);
        cir_data.set_index(cidx + 8, a);
        cir_data.set_index(cidx + 9, 0.0);
        cidx += cir_stride;
    }
    let cir_desc = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&cir_desc, &JsValue::from_str("size"), &JsValue::from_f64((cir_total as f64) * 4.0));
    let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
    let v = if gb.is_undefined() || gb.is_null() { 32.0 } else { reflect_get(&gb, "VERTEX").as_f64().unwrap_or(32.0) };
    let cd = if gb.is_undefined() || gb.is_null() { 8.0 } else { reflect_get(&gb, "COPY_DST").as_f64().unwrap_or(8.0) };
    let _ = js_sys::Reflect::set(&cir_desc, &JsValue::from_str("usage"), &JsValue::from_f64(v + cd));
    let cir_buf = create_buf.call1(device, &cir_desc)?;
    let _ = write.call3(&queue, &cir_buf, &JsValue::from_f64(0.0), &cir_data);

    let ub_desc = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&ub_desc, &JsValue::from_str("size"), &JsValue::from_f64(16.0));
    let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
    let u = if gb.is_undefined() || gb.is_null() { 64.0 } else { reflect_get(&gb, "UNIFORM").as_f64().unwrap_or(64.0) };
    let cd = if gb.is_undefined() || gb.is_null() { 8.0 } else { reflect_get(&gb, "COPY_DST").as_f64().unwrap_or(8.0) };
    let _ = js_sys::Reflect::set(&ub_desc, &JsValue::from_str("usage"), &JsValue::from_f64(u + cd));
    let ub = create_buf.call1(device, &ub_desc)?;
    let ub_arr = js_sys::Float32Array::new_with_length(4);
    ub_arr.set_index(0, width as f32);
    ub_arr.set_index(1, height as f32);
    ub_arr.set_index(2, vx as f32);
    ub_arr.set_index(3, vy as f32);
    let _ = write.call3(&queue, &ub, &JsValue::from_f64(0.0), &ub_arr);

    let bg_desc = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&bg_desc, &JsValue::from_str("layout"), &bgl);
    let entries = js_sys::Array::new();
    let e0 = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&e0, &JsValue::from_str("binding"), &JsValue::from_f64(0.0));
    let _ = js_sys::Reflect::set(&e0, &JsValue::from_str("resource"), &js_sys::Object::from(js_sys::Object::new()));
    let res = js_sys::Reflect::get(&e0, &JsValue::from_str("resource")).unwrap();
    let _ = js_sys::Reflect::set(&res, &JsValue::from_str("buffer"), &ub);
    entries.push(&e0);
    let _ = js_sys::Reflect::set(&bg_desc, &JsValue::from_str("entries"), &entries);
    let create_bg = reflect_get(device, "createBindGroup").dyn_into::<Function>().unwrap();
    let bind_group = create_bg.call1(device, &bg_desc)?;

    let create_command_encoder = reflect_get(device, "createCommandEncoder").dyn_into::<Function>().unwrap();
    let encoder = create_command_encoder.call0(device)?;
    let get_current_texture = reflect_get(ctx, "getCurrentTexture").dyn_into::<Function>().unwrap();
    let texture = get_current_texture.call0(ctx)?;
    let create_view = reflect_get(&texture, "createView").dyn_into::<Function>().unwrap();
    let view = create_view.call0(&texture)?;
    let pass_desc = js_sys::Object::new();
    let attachments = js_sys::Array::new();
    let attachment = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&attachment, &JsValue::from_str("view"), &view);
    let _ = js_sys::Reflect::set(&attachment, &JsValue::from_str("loadOp"), &JsValue::from_str("clear"));
    let _ = js_sys::Reflect::set(&attachment, &JsValue::from_str("storeOp"), &JsValue::from_str("store"));
    let clear_value = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&clear_value, &JsValue::from_str("r"), &JsValue::from_f64(0.96));
    let _ = js_sys::Reflect::set(&clear_value, &JsValue::from_str("g"), &JsValue::from_f64(0.97));
    let _ = js_sys::Reflect::set(&clear_value, &JsValue::from_str("b"), &JsValue::from_f64(0.98));
    let _ = js_sys::Reflect::set(&clear_value, &JsValue::from_str("a"), &JsValue::from_f64(0.0));
    let _ = js_sys::Reflect::set(&attachment, &JsValue::from_str("clearValue"), &clear_value);
    attachments.push(&attachment);
    let _ = js_sys::Reflect::set(&pass_desc, &JsValue::from_str("colorAttachments"), &attachments);
    let begin_render_pass = reflect_get(&encoder, "beginRenderPass").dyn_into::<Function>().unwrap();
    let pass = begin_render_pass.call1(&encoder, &pass_desc)?;
    let set_pipeline = reflect_get(&pass, "setPipeline").dyn_into::<Function>().unwrap();
    // 先绘制浅色棋盘格背景
    if !bg_pipeline.is_undefined() && !bg_pipeline.is_null() {
        let _ = set_pipeline.call1(&pass, &bg_pipeline);
        let set_vb0 = reflect_get(&pass, "setVertexBuffer").dyn_into::<Function>().unwrap();
        let _ = set_vb0.call2(&pass, &JsValue::from_f64(0.0), &vb);
        let set_bg = reflect_get(&pass, "setBindGroup").dyn_into::<Function>().unwrap();
    let _ = set_bg.call2(&pass, &JsValue::from_f64(0.0), &bind_group);
    let draw = reflect_get(&pass, "draw").dyn_into::<Function>().unwrap();
    let _ = draw.call3(&pass, &JsValue::from_f64(4.0), &JsValue::from_f64(1.0), &JsValue::from_f64(0.0));
    }
    // 再绘制矩形实例
    let _ = set_pipeline.call1(&pass, &pipeline);
    let set_vb0 = reflect_get(&pass, "setVertexBuffer").dyn_into::<Function>().unwrap();
    let _ = set_vb0.call2(&pass, &JsValue::from_f64(0.0), &vb);
    let _ = set_vb0.call2(&pass, &JsValue::from_f64(1.0), &inst_buf);
    let set_bg = reflect_get(&pass, "setBindGroup").dyn_into::<Function>().unwrap();
    let _ = set_bg.call2(&pass, &JsValue::from_f64(0.0), &bind_group);
    let draw = reflect_get(&pass, "draw").dyn_into::<Function>().unwrap();
    let _ = draw.call3(&pass, &JsValue::from_f64(4.0), &JsValue::from_f64(rect_count as f64), &JsValue::from_f64(0.0));
    if !ln_pipeline.is_undefined() && line_count > 0.0f64 as u32 {
        let _ = set_pipeline.call1(&pass, &ln_pipeline);
        let set_vb0 = reflect_get(&pass, "setVertexBuffer").dyn_into::<Function>().unwrap();
        let _ = set_vb0.call2(&pass, &JsValue::from_f64(0.0), &vb);
        let _ = set_vb0.call2(&pass, &JsValue::from_f64(1.0), &ln_buf);
        let _ = set_bg.call2(&pass, &JsValue::from_f64(0.0), &bind_group);
        let _ = draw.call3(&pass, &JsValue::from_f64(4.0), &JsValue::from_f64(line_count as f64), &JsValue::from_f64(0.0));
    }
    if !cir_pipeline.is_undefined() && cir_count > 0.0f64 as u32 {
        let _ = set_pipeline.call1(&pass, &cir_pipeline);
        let set_vb0 = reflect_get(&pass, "setVertexBuffer").dyn_into::<Function>().unwrap();
        let _ = set_vb0.call2(&pass, &JsValue::from_f64(0.0), &vb);
        let _ = set_vb0.call2(&pass, &JsValue::from_f64(1.0), &cir_buf);
        let _ = set_bg.call2(&pass, &JsValue::from_f64(0.0), &bind_group);
        let _ = draw.call3(&pass, &JsValue::from_f64(4.0), &JsValue::from_f64(cir_count as f64), &JsValue::from_f64(0.0));
    }
    // Selection highlight overlay: outline + rotation/resize handles
    {
        let selm_v = state_sig.get_path_js(JsValue::from_str("selected_multi"));
        let selm = js_sys::Array::from(&selm_v);
        draw_selection_overlay(
            &pass,
            &device,
            &queue,
            &create_buf,
            &write,
            &bind_group,
            &vb,
            &pipeline,
            &ln_pipeline,
            &cir_pipeline,
            vx,
            vy,
            cur_page,
            &arr_layers,
            &selm,
        );
    }
    if !img_pipeline.is_undefined() && !img_bgl.is_undefined() && !img_sampler.is_undefined() && img_layers.len() > 0 {
        let _ = set_pipeline.call1(&pass, &img_pipeline);
        let set_vb0 = reflect_get(&pass, "setVertexBuffer").dyn_into::<Function>().unwrap();
        let _ = set_vb0.call2(&pass, &JsValue::from_f64(0.0), &vb);
        let _ = set_bg.call2(&pass, &JsValue::from_f64(0.0), &bind_group);
    for l in img_layers.into_iter() {
        let src = js_sys::Reflect::get(&l, &JsValue::from_str("src")).unwrap_or(JsValue::UNDEFINED).as_string().unwrap_or_default();
        if src.is_empty() { continue; }
        let tex_view = ensure_image_texture(canvas, device, &src);
        if tex_view.is_undefined() || tex_view.is_null() { continue; }
            let x = js_sys::Reflect::get(&l, &JsValue::from_str("x")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
            let y = js_sys::Reflect::get(&l, &JsValue::from_str("y")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
            let wv = js_sys::Reflect::get(&l, &JsValue::from_str("w")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
            let hv = js_sys::Reflect::get(&l, &JsValue::from_str("h")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
            let rot = js_sys::Reflect::get(&l, &JsValue::from_str("rotation")).unwrap_or(JsValue::from_f64(0.0)).as_f64().unwrap_or(0.0) as f32;
            let img_data = js_sys::Float32Array::new_with_length(5);
            img_data.set_index(0, x as f32);
            img_data.set_index(1, y as f32);
            img_data.set_index(2, wv as f32);
            img_data.set_index(3, hv as f32);
            img_data.set_index(4, rot as f32);
            let img_desc = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&img_desc, &JsValue::from_str("size"), &JsValue::from_f64(5.0 * 4.0));
            let gb = reflect_get(&js_sys::global(), "GPUBufferUsage");
            let v = if gb.is_undefined() || gb.is_null() { 32.0 } else { reflect_get(&gb, "VERTEX").as_f64().unwrap_or(32.0) };
            let cd = if gb.is_undefined() || gb.is_null() { 8.0 } else { reflect_get(&gb, "COPY_DST").as_f64().unwrap_or(8.0) };
            let _ = js_sys::Reflect::set(&img_desc, &JsValue::from_str("usage"), &JsValue::from_f64(v + cd));
            let img_buf = create_buf.call1(device, &img_desc)?;
            let _ = write.call3(&queue, &img_buf, &JsValue::from_f64(0.0), &img_data);
            let set_vb1 = reflect_get(&pass, "setVertexBuffer").dyn_into::<Function>().unwrap();
            let _ = set_vb1.call2(&pass, &JsValue::from_f64(1.0), &img_buf);
            let bg_desc = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&bg_desc, &JsValue::from_str("layout"), &img_bgl);
            let es = js_sys::Array::new();
            let eb = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&eb, &JsValue::from_str("binding"), &JsValue::from_f64(0.0));
            let rb = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&rb, &JsValue::from_str("buffer"), &ub);
            let _ = js_sys::Reflect::set(&eb, &JsValue::from_str("resource"), &rb);
            es.push(&eb);
            let es2 = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&es2, &JsValue::from_str("binding"), &JsValue::from_f64(1.0));
            let _ = js_sys::Reflect::set(&es2, &JsValue::from_str("resource"), &img_sampler);
            es.push(&es2);
            let es3 = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&es3, &JsValue::from_str("binding"), &JsValue::from_f64(2.0));
            let rv = js_sys::Object::new();
            let _ = js_sys::Reflect::set(&rv, &JsValue::from_str("textureView"), &tex_view);
            let _ = js_sys::Reflect::set(&es3, &JsValue::from_str("resource"), &rv);
            es.push(&es3);
            let _ = js_sys::Reflect::set(&bg_desc, &JsValue::from_str("entries"), &es);
            let create_bg = reflect_get(device, "createBindGroup").dyn_into::<Function>().unwrap();
            let img_bind_group = create_bg.call1(device, &bg_desc)?;
            let set_bg1 = reflect_get(&pass, "setBindGroup").dyn_into::<Function>().unwrap();
            let _ = set_bg1.call2(&pass, &JsValue::from_f64(1.0), &img_bind_group);
            let _ = draw.call3(&pass, &JsValue::from_f64(4.0), &JsValue::from_f64(1.0), &JsValue::from_f64(0.0));
        }
    }
    let end = reflect_get(&pass, "end").dyn_into::<Function>().unwrap();
    let _ = end.call0(&pass);
    let finish = reflect_get(&encoder, "finish").dyn_into::<Function>().unwrap();
    let command_buffer = finish.call0(&encoder)?;
    let submit_list = js_sys::Array::new();
    submit_list.push(&command_buffer);
    let submit = reflect_get(&queue, "submit").dyn_into::<Function>().unwrap();
    let _ = submit.call1(&queue, &submit_list);
    Ok(())
}

fn parse_color_rgba(s: &str) -> (f32, f32, f32, f32) {
    let mut r = 1.0f32;
    let mut g = 1.0f32;
    let mut b = 1.0f32;
    let mut a = 1.0f32;
    if s.starts_with('#') {
        let hex = s.trim_start_matches('#');
        let (rr, gg, bb) = if hex.len() == 3 {
            let r1 = u8::from_str_radix(&hex[0..1].repeat(2), 16).unwrap_or(255);
            let g1 = u8::from_str_radix(&hex[1..2].repeat(2), 16).unwrap_or(255);
            let b1 = u8::from_str_radix(&hex[2..3].repeat(2), 16).unwrap_or(255);
            (r1, g1, b1)
        } else if hex.len() >= 6 {
            let r1 = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255);
            let g1 = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255);
            let b1 = u8::from_str_radix(&hex[4..6], 16).unwrap_or(255);
            (r1, g1, b1)
        } else {
            (255, 255, 255)
        };
        r = rr as f32 / 255.0;
        g = gg as f32 / 255.0;
        b = bb as f32 / 255.0;
        a = 1.0;
        return (r, g, b, a);
    }
    let ls = s.to_lowercase();
    if ls.starts_with("rgba(") && ls.ends_with(')') {
        let inner = &ls[5..ls.len() - 1];
        let parts: Vec<&str> = inner.split(',').map(|v| v.trim()).collect();
        if parts.len() >= 4 {
            let rr = parts[0].parse::<f32>().unwrap_or(255.0);
            let gg = parts[1].parse::<f32>().unwrap_or(255.0);
            let bb = parts[2].parse::<f32>().unwrap_or(255.0);
            let aa = parts[3].parse::<f32>().unwrap_or(1.0);
            r = rr / 255.0;
            g = gg / 255.0;
            b = bb / 255.0;
            a = aa;
        }
    } else if ls.starts_with("rgb(") && ls.ends_with(')') {
        let inner = &ls[4..ls.len() - 1];
        let parts: Vec<&str> = inner.split(',').map(|v| v.trim()).collect();
        if parts.len() >= 3 {
            let rr = parts[0].parse::<f32>().unwrap_or(255.0);
            let gg = parts[1].parse::<f32>().unwrap_or(255.0);
            let bb = parts[2].parse::<f32>().unwrap_or(255.0);
            r = rr / 255.0;
            g = gg / 255.0;
            b = bb / 255.0;
            a = 1.0;
        }
    }
    (r, g, b, a)
}

fn ensure_image_texture(canvas: &JsValue, device: &JsValue, src: &str) -> JsValue {
    let key = format!("__wgpu_img_tex::{}", src);
    let existing = reflect_get(canvas, &key);
    if !existing.is_undefined() && !existing.is_null() {
        return existing;
    }
    let global = js_sys::global();
    let document = reflect_get(&global, "document");
    if document.is_undefined() || document.is_null() {
        return JsValue::UNDEFINED;
    }
    let create_el = reflect_get(&document, "createElement").dyn_into::<Function>().unwrap();
    let img = create_el.call1(&document, &JsValue::from_str("img")).unwrap();
    let set_src = reflect_get(&img, "setAttribute").dyn_into::<Function>().unwrap();
    let _ = set_src.call2(&img, &JsValue::from_str("src"), &JsValue::from_str(src));
    let img_for_closure = img.clone();
    let canvas_clone = canvas.clone();
    let device_clone = device.clone();
    let onload = Closure::wrap(Box::new(move |_e: JsValue| {
        let nw = reflect_get(&img_for_closure, "naturalWidth").as_f64().unwrap_or(0.0);
        let nh = reflect_get(&img_for_closure, "naturalHeight").as_f64().unwrap_or(0.0);
        if nw <= 0.0 || nh <= 0.0 {
            return;
        }
        let create_tex = reflect_get(&device_clone, "createTexture").dyn_into::<Function>().unwrap();
        let td = js_sys::Object::new();
        let size = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&size, &JsValue::from_str("width"), &JsValue::from_f64(nw));
        let _ = js_sys::Reflect::set(&size, &JsValue::from_str("height"), &JsValue::from_f64(nh));
        let _ = js_sys::Reflect::set(&td, &JsValue::from_str("size"), &size);
        let _ = js_sys::Reflect::set(&td, &JsValue::from_str("format"), &JsValue::from_str("rgba8unorm"));
        let gt = reflect_get(&js_sys::global(), "GPUTextureUsage");
        let tb = if gt.is_undefined() || gt.is_null() { 4.0 } else { reflect_get(&gt, "TEXTURE_BINDING").as_f64().unwrap_or(4.0) };
        let cd = if gt.is_undefined() || gt.is_null() { 2.0 } else { reflect_get(&gt, "COPY_DST").as_f64().unwrap_or(2.0) };
        let ra = if gt.is_undefined() || gt.is_null() { 16.0 } else { reflect_get(&gt, "RENDER_ATTACHMENT").as_f64().unwrap_or(16.0) };
        let _ = js_sys::Reflect::set(&td, &JsValue::from_str("usage"), &JsValue::from_f64(tb + cd + ra));
        let texture = create_tex.call1(&device_clone, &td).unwrap();
        let queue = reflect_get(&device_clone, "queue");
        let copy = reflect_get(&queue, "copyExternalImageToTexture").dyn_into::<Function>().unwrap();
        let src_obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&src_obj, &JsValue::from_str("source"), &img_for_closure);
        let dst_obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&dst_obj, &JsValue::from_str("texture"), &texture);
        let opts = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&opts, &JsValue::from_str("flipY"), &JsValue::from_bool(false));
        let _ = copy.call3(&queue, &src_obj, &dst_obj, &opts);
        let view = reflect_get(&texture, "createView").dyn_into::<Function>().unwrap().call0(&texture).unwrap();
        let _ = reflect_set(&canvas_clone, &key, &view);
    }) as Box<dyn FnMut(JsValue)>);
    let set_onload = reflect_get(&img, "addEventListener").dyn_into::<Function>().unwrap();
    let _ = set_onload.call2(&img, &JsValue::from_str("load"), onload.as_ref().unchecked_ref());
    onload.forget();
    JsValue::UNDEFINED
}
