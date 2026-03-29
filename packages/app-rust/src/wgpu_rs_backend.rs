use wasm_bindgen::JsValue;
use js_sys::{Reflect, Function, Object};
use wasm_bindgen::JsCast;

fn set_text(node: &JsValue, text: &str) {
    let _ = Reflect::set(node, &JsValue::from_str("textContent"), &JsValue::from_str(text));
}

fn create_element(document: &JsValue, tag: &str) -> JsValue {
    let ce = Reflect::get(document, &JsValue::from_str("createElement")).unwrap().dyn_into::<Function>().unwrap();
    ce.call1(document, &JsValue::from_str(tag)).unwrap()
}

fn append_child(parent: &JsValue, child: &JsValue) {
    let append = Reflect::get(parent, &JsValue::from_str("appendChild")).unwrap().dyn_into::<Function>().unwrap();
    let _ = append.call1(parent, child);
}

fn set_class(node: &JsValue, class_name: &str) {
    let _ = Reflect::set(node, &JsValue::from_str("className"), &JsValue::from_str(class_name));
}

fn set_attr(node: &JsValue, name: &str, value: &str) {
    let set_attribute = Reflect::get(node, &JsValue::from_str("setAttribute")).unwrap().dyn_into::<Function>().unwrap();
    let _ = set_attribute.call2(node, &JsValue::from_str(name), &JsValue::from_str(value));
}

pub fn make_wgpu_rs_element(width: u32, height: u32) -> JsValue {
    #[cfg(not(target_arch = "wasm32"))]
    {
        let o = Object::new();
        let _ = Reflect::set(&o, &JsValue::from_str("error"), &JsValue::from_str("wgpu.rs backend available only on wasm32"));
        return o.into();
    }
    #[cfg(target_arch = "wasm32")]
    {
    use wasm_bindgen::JsCast;
    use wasm_bindgen_futures::spawn_local;
    use web_sys::HtmlCanvasElement;
    use wgpu::{Instance, Backends, DeviceDescriptor, RequestAdapterOptions, CompositeAlphaMode};
    let global = js_sys::global();
    let document = Reflect::get(&global, &JsValue::from_str("document")).unwrap();
    let root = create_element(&document, "div");
    let status = create_element(&document, "div");
    let stage = create_element(&document, "div");
    let canvas = create_element(&document, "canvas");
    set_class(&root, "inline-block rounded-xl border border-base-300 bg-base-100/60 backdrop-blur p-3 shadow-sm");
    set_class(&status, "text-xs text-base-content/70 mb-2");
    set_class(&stage, "relative rounded-lg overflow-hidden");
    set_attr(&canvas, "width", &format!("{}", width));
    set_attr(&canvas, "height", &format!("{}", height));
    set_text(&status, "wgpu.rs 初始化中…");
    append_child(&root, &status);
    append_child(&root, &stage);
    append_child(&stage, &canvas);
    let out = Object::new();
    let _ = Reflect::set(&out, &JsValue::from_str("vaporElement"), &root);
    let _ = Reflect::set(&canvas, &JsValue::from_str("style"), &JsValue::from_str("display:block;border-radius:12px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.10),0 12px 30px rgba(0,0,0,.25);opacity:1;"));
    {
        use wasm_bindgen::JsCast;
        use wasm_bindgen_futures::spawn_local;
        use web_sys::HtmlCanvasElement;
        use wgpu::{util::DeviceExt, Backends, DeviceDescriptor, Instance, RequestAdapterOptions};
        // 预检浏览器 WebGPU 支持
        let navigator = Reflect::get(&global, &JsValue::from_str("navigator")).unwrap_or(JsValue::UNDEFINED);
        let gpu = Reflect::get(&navigator, &JsValue::from_str("gpu")).unwrap_or(JsValue::UNDEFINED);
        if gpu.is_undefined() || gpu.is_null() {
            let _ = Reflect::set(&status, &JsValue::from_str("textContent"), &JsValue::from_str("WebGPU 不可用：navigator.gpu 不存在或被禁用"));
        }
        let canvas_el: HtmlCanvasElement = canvas.clone().dyn_into().unwrap();
        spawn_local(async move {
            let instance = Instance::new(wgpu::InstanceDescriptor {
                backends: Backends::BROWSER_WEBGPU,
                dx12_shader_compiler: Default::default(),
                flags: Default::default(),
                gles_minor_version: Default::default(),
            });
            let surface = match instance.create_surface(wgpu::SurfaceTarget::Canvas(canvas_el)) {
                Ok(s) => s,
                Err(e) => {
                    let _ = Reflect::set(
                        &status,
                        &JsValue::from_str("textContent"),
                        &JsValue::from_str(&format!("Surface 创建失败: {:?}", e)),
                    );
                    return;
                }
            };
            let adapter_opt = instance
                .request_adapter(&RequestAdapterOptions {
                    power_preference: Default::default(),
                    force_fallback_adapter: false,
                    compatible_surface: Some(&surface),
                })
                .await;
            let adapter = if let Some(a) = adapter_opt {
                a
            } else {
                // 回退：不带 compatible_surface 再试一次
                match instance
                    .request_adapter(&RequestAdapterOptions {
                        power_preference: Default::default(),
                        force_fallback_adapter: false,
                        compatible_surface: None,
                    })
                    .await
                {
                    Some(a2) => a2,
                    None => {
                        let _ = Reflect::set(
                            &status,
                            &JsValue::from_str("textContent"),
                            &JsValue::from_str("未找到可用的 Adapter（含回退）"),
                        );
                        return;
                    }
                }
            };
            // 打印适配器信息辅助诊断
            let info = adapter.get_info();
            let caps = surface.get_capabilities(&adapter);
            let fmt0 = caps.formats.get(0).cloned();
            let pm0 = caps.present_modes.get(0).cloned();
            let diag = format!(
                "Adapter: {} | Backend={:?}\nFormats={:?}\nPresentModes={:?}\nSelectedFormat={:?}\nSelectedPresentMode={:?}\nFeatures={:?}",
                info.name,
                info.backend,
                caps.formats,
                caps.present_modes,
                fmt0,
                pm0,
                adapter.features()
            );
            let _ = Reflect::set(&status, &JsValue::from_str("textContent"), &JsValue::from_str(&diag));
            let mut limits = wgpu::Limits::downlevel_webgl2_defaults();
            let device_res = adapter
                .request_device(
                    &DeviceDescriptor {
                        label: None,
                        required_features: Default::default(),
                        required_limits: wgpu::Limits::default(),
                    },
                    None,
                )
                .await;
            let (device, queue, surface, adapter) = if let Ok((d, q)) = device_res {
                (d, q, surface, adapter)
            } else {
                // WebGPU 失败，回退 GL
                let canvas_fallback = canvas.clone().dyn_into::<HtmlCanvasElement>().unwrap();
                let instance_gl = Instance::new(wgpu::InstanceDescriptor {
                    backends: Backends::GL,
                    dx12_shader_compiler: Default::default(),
                    flags: Default::default(),
                    gles_minor_version: Default::default(),
                });
                let surface_gl = match instance_gl.create_surface(wgpu::SurfaceTarget::Canvas(canvas_fallback)) {
                    Ok(s) => s,
                    Err(e) => {
                        let _ = Reflect::set(&status, &JsValue::from_str("textContent"), &JsValue::from_str(&format!("GL Surface 创建失败: {:?}", e)));
                        return;
                    }
                };
                let adapter_gl_opt = instance_gl
                    .request_adapter(&RequestAdapterOptions {
                        power_preference: Default::default(),
                        force_fallback_adapter: false,
                        compatible_surface: Some(&surface_gl),
                    })
                    .await;
                let Some(adapter_gl) = adapter_gl_opt else {
                    let _ = Reflect::set(&status, &JsValue::from_str("textContent"), &JsValue::from_str("未找到 GL Adapter"));
                    return;
                };
                let device_gl = adapter_gl
                    .request_device(
                        &DeviceDescriptor {
                            label: None,
                            required_features: Default::default(),
                            required_limits: wgpu::Limits::downlevel_webgl2_defaults(),
                        },
                        None,
                    )
                    .await;
                match device_gl {
                    Ok((d, q)) => {
                        let info = adapter_gl.get_info();
                        let _ = Reflect::set(
                            &status,
                            &JsValue::from_str("textContent"),
                            &JsValue::from_str(&format!("使用 GL 回退 Adapter: {} / Backend={:?}", info.name, info.backend)),
                        );
                        (d, q, surface_gl, adapter_gl)
                    }
                    Err(e) => {
                        let _ = Reflect::set(&status, &JsValue::from_str("textContent"), &JsValue::from_str(&format!("GL Device 请求失败: {:?}", e)));
                        return;
                    }
                }
            };
            let width_px = width;
            let height_px = height;
            let Some(mut config) = surface.get_default_config(&adapter, width_px, height_px) else {
                let _ = Reflect::set(
                    &status,
                    &JsValue::from_str("textContent"),
                    &JsValue::from_str("Surface 不支持该适配器"),
                );
                return;
            };
            surface.configure(&device, &config);

            let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
                label: Some("text-pixel-shader"),
                source: wgpu::ShaderSource::Wgsl(
                    r#"
struct Uniforms { size: vec2<f32> };
@group(0) @binding(0) var<uniform> u: Uniforms;
struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) color: vec4<f32> };
@vertex
fn vs(@location(0) pos: vec2<f32>, @location(1) inst_xywh: vec4<f32>, @location(2) inst_color: vec4<f32>) -> VSOut {
  // pos: unit rect in [0,1]x[0,1]
  let pixel = vec2<f32>(inst_xywh.x + pos.x * inst_xywh.z, inst_xywh.y + pos.y * inst_xywh.w);
  let ndc = vec2<f32>(pixel.x / u.size.x * 2.0 - 1.0, 1.0 - pixel.y / u.size.y * 2.0);
  var o: VSOut;
  o.pos = vec4<f32>(ndc, 0.0, 1.0);
  o.color = inst_color;
  return o;
}
@fragment
fn fs(i: VSOut) -> @location(0) vec4<f32> { return i.color; }
"#
                    .into(),
                ),
            });

            let vb_data: [f32; 12] = [
                0.0, 0.0, // tri 1
                1.0, 0.0,
                1.0, 1.0,
                0.0, 0.0, // tri 2
                1.0, 1.0,
                0.0, 1.0,
            ];
            let vb = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("unit-rect-vb"),
                contents: bytemuck::cast_slice(&vb_data),
                usage: wgpu::BufferUsages::VERTEX,
            });

            // 5x7 pixel font for letters R, u, e
            let glyph_R: [u8; 35] = [
                1, 1, 1, 1, 0, //
                1, 0, 0, 0, 1, //
                1, 0, 0, 0, 1, //
                1, 1, 1, 1, 0, //
                1, 0, 1, 0, 0, //
                1, 0, 0, 1, 0, //
                1, 0, 0, 0, 1, //
            ];
            let glyph_u: [u8; 35] = [
                1, 0, 0, 0, 1, //
                1, 0, 0, 0, 1, //
                1, 0, 0, 0, 1, //
                1, 0, 0, 0, 1, //
                1, 0, 0, 0, 1, //
                1, 0, 0, 0, 1, //
                0, 1, 1, 1, 0, //
            ];
            let glyph_e: [u8; 35] = [
                0, 1, 1, 1, 0, //
                1, 0, 0, 0, 1, //
                1, 0, 0, 0, 0, //
                1, 1, 1, 0, 0, //
                1, 0, 0, 0, 0, //
                1, 0, 0, 0, 1, //
                0, 1, 1, 1, 0, //
            ];
            let mut instances: Vec<f32> = Vec::new();
            let block_w = 10.0f32;
            let block_h = 12.0f32;
            let start_x = 20.0f32;
            let start_y = 24.0f32;
            let spacing = 8.0f32;
            let color = [0.0f32, 0.0, 0.0, 1.0];
            let letters = [&glyph_R, &glyph_u, &glyph_e];
            for (li, glyph) in letters.iter().enumerate() {
                let base_x = start_x + li as f32 * (5.0 * block_w + spacing);
                for y in 0..7 {
                    for x in 0..5 {
                        let idx = y * 5 + x;
                        if glyph[idx] != 0 {
                            let px = base_x + x as f32 * block_w;
                            let py = start_y + y as f32 * block_h;
                            instances.extend_from_slice(&[px, py, block_w, block_h]);
                            instances.extend_from_slice(&color);
                        }
                    }
                }
            }
            let inst_buf = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("text-instances"),
                contents: bytemuck::cast_slice(&instances),
                usage: wgpu::BufferUsages::VERTEX,
            });
            let inst_stride = (4 + 4) * 4u64; // xywh + rgba

            let ubo = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("uniforms"),
                contents: bytemuck::cast_slice(&[width_px as f32, height_px as f32]),
                usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            });
            let bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("bgl"),
                entries: &[wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                }],
            });
            let bg = device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("bg"),
                layout: &bgl,
                entries: &[wgpu::BindGroupEntry {
                    binding: 0,
                    resource: ubo.as_entire_binding(),
                }],
            });
            let pipeline_layout =
                device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                    label: Some("pl"),
                    bind_group_layouts: &[&bgl],
                    push_constant_ranges: &[],
                });
            let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some("text-pipeline"),
                layout: Some(&pipeline_layout),
                vertex: wgpu::VertexState {
                    module: &shader,
                    entry_point: "vs",
                    compilation_options: wgpu::PipelineCompilationOptions::default(),
                    buffers: &[
                        wgpu::VertexBufferLayout {
                            array_stride: 8,
                            step_mode: wgpu::VertexStepMode::Vertex,
                            attributes: &wgpu::vertex_attr_array![0 => Float32x2],
                        },
                        wgpu::VertexBufferLayout {
                            array_stride: inst_stride,
                            step_mode: wgpu::VertexStepMode::Instance,
                            attributes: &[
                                wgpu::VertexAttribute {
                                    format: wgpu::VertexFormat::Float32x4,
                                    offset: 0,
                                    shader_location: 1,
                                },
                                wgpu::VertexAttribute {
                                    format: wgpu::VertexFormat::Float32x4,
                                    offset: 16,
                                    shader_location: 2,
                                },
                            ],
                        },
                    ],
                },
                fragment: Some(wgpu::FragmentState {
                    module: &shader,
                    entry_point: "fs",
                    compilation_options: wgpu::PipelineCompilationOptions::default(),
                    targets: &[Some(wgpu::ColorTargetState {
                        format: surface.get_capabilities(&adapter).formats[0],
                        blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                        write_mask: wgpu::ColorWrites::ALL,
                    })],
                }),
                primitive: wgpu::PrimitiveState {
                    topology: wgpu::PrimitiveTopology::TriangleList,
                    ..Default::default()
                },
                depth_stencil: None,
                multisample: wgpu::MultisampleState::default(),
                multiview: None,
            });

            let frame = match surface.get_current_texture() {
                Ok(f) => f,
                Err(e) => {
                    let _ = Reflect::set(
                        &status,
                        &JsValue::from_str("textContent"),
                        &JsValue::from_str(&format!("获取当前纹理失败: {:?}", e)),
                    );
                    return;
                }
            };
            let view = frame
                .texture
                .create_view(&wgpu::TextureViewDescriptor::default());
            let mut encoder =
                device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
            {
                let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                    label: Some("rp"),
                    color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                        view: &view,
                        resolve_target: None,
                        ops: wgpu::Operations {
                            load: wgpu::LoadOp::Clear(wgpu::Color {
                                r: 1.0,
                                g: 1.0,
                                b: 1.0,
                                a: 1.0,
                            }),
                            store: wgpu::StoreOp::Store,
                        },
                    })],
                    depth_stencil_attachment: None,
                    timestamp_writes: None,
                    occlusion_query_set: None,
                });
                pass.set_pipeline(&pipeline);
                pass.set_bind_group(0, &bg, &[]);
                pass.set_vertex_buffer(0, vb.slice(..));
                pass.set_vertex_buffer(1, inst_buf.slice(..));
                let instance_count = (instances.len() as u64 / (8)) as u32;
                pass.draw(0..6, 0..instance_count);
            }
            queue.submit(std::iter::once(encoder.finish()));
            frame.present();
            let _ = Reflect::set(
                &status,
                &JsValue::from_str("textContent"),
                &JsValue::from_str("wgpu.rs 文本已渲染（像素字体）"),
            );
        });
    }
    out.into()
}
}
