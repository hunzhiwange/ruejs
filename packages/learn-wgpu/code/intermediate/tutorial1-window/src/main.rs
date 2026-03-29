use app_surface::AppSurface;
use std::sync::Arc;
use utils::WgpuAppAction;
use winit::keyboard::{Key, NamedKey};
use winit::event::KeyEvent;
use wgpu::util::DeviceExt;
use app_surface::SurfaceFrame;
use glyphon::{
    Attrs, Buffer as GlyphBuffer, Cache, Color, FontSystem, Metrics, Resolution, Shaping,
    SwashCache, TextArea, TextBounds, TextAtlas, TextRenderer, Viewport,
};

#[cfg(target_arch = "wasm32")]
use utils::framework::attach_wgpu_canvas_with;

#[repr(C)]
#[derive(Clone, Copy)]
struct Vertex2D {
    pos: [f32; 2],
}

#[repr(C)]
#[derive(Clone, Copy)]
struct Instance {
    pos: [f32; 2],
    size: [f32; 2],
    color: [f32; 4],
    viewport: [f32; 2],
}

struct SnakeApp {
    app: AppSurface,
    pipeline: wgpu::RenderPipeline,
    vbuf: wgpu::Buffer,
    ibuf: wgpu::Buffer,
    grid_cols: u32,
    grid_rows: u32,
    cell_w: f32,
    cell_h: f32,
    snake: Vec<(i32, i32)>,
    dir: (i32, i32),
    food: (i32, i32),
    acc: f32,
    step: f32,
    rng: u32,
    score: u32,
    paused: bool,
    level: u32,
    // glyphon HUD
    font_system: FontSystem,
    cache: Cache,
    atlas: TextAtlas,
    text_renderer: TextRenderer,
    viewport: Viewport,
    hud_status_buffer: GlyphBuffer,
    hud_help_buffer: GlyphBuffer,
    swash_cache: SwashCache,
}

impl SnakeApp {
    fn reset(&mut self) {
        self.snake.clear();
        let cx = (self.grid_cols / 2) as i32;
        let cy = (self.grid_rows / 2) as i32;
        self.snake.push((cx, cy));
        self.snake.push((cx - 1, cy));
        self.snake.push((cx - 2, cy));
        self.dir = (1, 0);
        self.acc = 0.0;
        self.place_food();
        self.score = 0;
        self.step = Self::base_step(self.level);
        self.update_hud_text();
    }

    fn place_food(&mut self) {
        self.rng = self.rng.wrapping_mul(1664525).wrapping_add(1013904223);
        let mut fx = (self.rng % self.grid_cols) as i32;
        self.rng = self.rng.wrapping_mul(1664525).wrapping_add(1013904223);
        let mut fy = (self.rng % self.grid_rows) as i32;
        let mut tries = 0;
        while self.snake.iter().any(|&(sx, sy)| sx == fx && sy == fy) && tries < 1024 {
            self.rng = self.rng.wrapping_mul(1664525).wrapping_add(1013904223);
            fx = (self.rng % self.grid_cols) as i32;
            self.rng = self.rng.wrapping_mul(1664525).wrapping_add(1013904223);
            fy = (self.rng % self.grid_rows) as i32;
            tries += 1;
        }
        self.food = (fx, fy);
    }

    fn step_once(&mut self) {
        let head = *self.snake.first().unwrap();
        let nh = (head.0 + self.dir.0, head.1 + self.dir.1);
        if nh.0 < 0
            || nh.1 < 0
            || nh.0 >= self.grid_cols as i32
            || nh.1 >= self.grid_rows as i32
            || self.snake.iter().any(|&(x, y)| x == nh.0 && y == nh.1)
        {
            self.reset();
            self.paused = true;
            self.update_hud_text();
            return;
        }
        self.snake.insert(0, nh);
        if nh.0 == self.food.0 && nh.1 == self.food.1 {
            self.place_food();
            self.score += 10;
            let min_step = 0.035;
            self.step = (self.step * 0.97).max(min_step);
            self.update_hud_text();
        } else {
            self.snake.pop();
        }
    }

    fn update_cell_size(&mut self) {
        self.cell_w = self.app.config.width as f32 / self.grid_cols as f32;
        self.cell_h = self.app.config.height as f32 / self.grid_rows as f32;
        self.hud_status_buffer
            .set_size(&mut self.font_system, Some(self.app.config.width as f32), Some(self.app.config.height as f32));
        self.hud_help_buffer
            .set_size(&mut self.font_system, Some(self.app.config.width as f32), Some(self.app.config.height as f32));
        self.viewport.update(&self.app.queue, Resolution {
            width: self.app.config.width,
            height: self.app.config.height,
        });
    }

    fn set_level(&mut self, lvl: u32) {
        self.level = lvl.clamp(1, 4);
        self.step = Self::base_step(self.level);
        self.update_hud_text();
    }

    fn base_step(level: u32) -> f32 {
        match level {
            1 => 0.5, // easy
            2 => 0.3, // normal
            3 => 0.2, // hard
            _ => 0.1, // insane
        }
    }

    fn update_hud_text(&mut self) {
        let speed = 1.0 / self.step;
        let level_name = match self.level {
            1 => "easy",
            2 => "normal",
            3 => "hard",
            _ => "insane",
        };
        let status = if self.paused { "paused" } else { "running" };
        let status_text = format!(
            "Status: {}    Score: {}    Speed: {:.1}/s    Level: {}",
            status, self.score, speed, level_name
        );
        let help_text = "Controls: Arrow Keys move    Space=start/pause    R=restart    1-4=level";
        self.hud_status_buffer.set_text(
            &mut self.font_system,
            &status_text,
            &Attrs::new(),
            Shaping::Advanced,
            None,
        );
        self.hud_status_buffer.shape_until_scroll(&mut self.font_system, false);
        self.hud_help_buffer.set_text(
            &mut self.font_system,
            help_text,
            &Attrs::new(),
            Shaping::Advanced,
            None,
        );
        self.hud_help_buffer.shape_until_scroll(&mut self.font_system, false);
    }
}

impl WgpuAppAction for SnakeApp {
    async fn new(window: Arc<winit::window::Window>) -> Self {
        #[cfg(target_arch = "wasm32")]
        attach_wgpu_canvas_with(&window, "tutorial1-window-wasm-app-container");
        let mut app = AppSurface::new(window).await;
        let format = app.config.format.remove_srgb_suffix();
        app.ctx.update_config_format(format);

        // glyphon HUD resources
        let mut font_system = FontSystem::new();
        // 加载内置字体（WASM 环境无系统字体，需显式提供）
        let font_bytes: &[u8] = include_bytes!("../assets/NotoSans-Regular.ttf");
        font_system.db_mut().load_font_data(font_bytes.to_vec());
        let cache = Cache::new(&app.device);
        let mut atlas = TextAtlas::new(&app.device, &app.queue, &cache, format);
        let text_renderer = TextRenderer::new(
            &mut atlas,
            &app.device,
            wgpu::MultisampleState::default(),
            None,
        );
        let mut viewport = Viewport::new(&app.device, &cache);
        viewport.update(&app.queue, Resolution {
            width: app.config.width,
            height: app.config.height,
        });
        let hud_status_buffer = GlyphBuffer::new(&mut font_system, Metrics::new(18.0, 22.0));
        let hud_help_buffer = GlyphBuffer::new(&mut font_system, Metrics::new(18.0, 22.0));
        let swash_cache = SwashCache::new();

        let vertices: [Vertex2D; 6] = [
            Vertex2D { pos: [0.0, 0.0] },
            Vertex2D { pos: [1.0, 0.0] },
            Vertex2D { pos: [1.0, 1.0] },
            Vertex2D { pos: [0.0, 0.0] },
            Vertex2D { pos: [1.0, 1.0] },
            Vertex2D { pos: [0.0, 1.0] },
        ];
        let vbuf = app
            .device
            .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("snake vbuf"),
                contents: unsafe {
                    std::slice::from_raw_parts(
                        vertices.as_ptr() as *const u8,
                        (vertices.len() * std::mem::size_of::<Vertex2D>()) as usize,
                    )
                },
                usage: wgpu::BufferUsages::VERTEX,
            });

        let shader_src = r#"
struct VSOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@vertex
fn vs_main(
    @location(0) vpos: vec2<f32>,
    @location(1) ipos: vec2<f32>,
    @location(2) isize: vec2<f32>,
    @location(3) color: vec4<f32>,
    @location(4) viewport: vec2<f32>
) -> VSOut {
    let pxy = ipos + vpos * isize;
    let ndc = vec2(pxy.x / viewport.x * 2.0 - 1.0, 1.0 - pxy.y / viewport.y * 2.0);
    return VSOut(vec4(ndc, 0.0, 1.0), color);
}

@fragment
fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
    return color;
}
"#;
        let shader = app
            .device
            .create_shader_module(wgpu::ShaderModuleDescriptor {
                label: Some("snake shader"),
                source: wgpu::ShaderSource::Wgsl(shader_src.into()),
            });

        let v_layout = wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Vertex2D>() as u64,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[
                wgpu::VertexAttribute {
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float32x2,
                    offset: 0,
                },
            ],
        };
        let i_layout = wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Instance>() as u64,
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &[
                wgpu::VertexAttribute {
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x2,
                    offset: 0,
                },
                wgpu::VertexAttribute {
                    shader_location: 2,
                    format: wgpu::VertexFormat::Float32x2,
                    offset: 8,
                },
                wgpu::VertexAttribute {
                    shader_location: 3,
                    format: wgpu::VertexFormat::Float32x4,
                    offset: 16,
                },
                wgpu::VertexAttribute {
                    shader_location: 4,
                    format: wgpu::VertexFormat::Float32x2,
                    offset: 32,
                },
            ],
        };

        let pipeline = app
            .device
            .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some("snake pipeline"),
                layout: None,
                vertex: wgpu::VertexState {
                    module: &shader,
                    entry_point: Some("vs_main"),
                    compilation_options: Default::default(),
                    buffers: &[v_layout, i_layout],
                },
                fragment: Some(wgpu::FragmentState {
                    module: &shader,
                    entry_point: Some("fs_main"),
                    compilation_options: Default::default(),
                    targets: &[Some(wgpu::ColorTargetState {
                        format,
                        blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                        write_mask: wgpu::ColorWrites::ALL,
                    })],
                }),
                primitive: wgpu::PrimitiveState {
                    topology: wgpu::PrimitiveTopology::TriangleList,
                    front_face: wgpu::FrontFace::Ccw,
                    cull_mode: None,
                    polygon_mode: wgpu::PolygonMode::Fill,
                    ..Default::default()
                },
                depth_stencil: None,
                multisample: wgpu::MultisampleState::default(),
                multiview_mask: None,
                cache: None,
            });

        let max_instances =
            (64_u32 * 64_u32) as usize;
        let ibuf = app.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("snake ibuf"),
            size: (max_instances * std::mem::size_of::<Instance>()) as u64,
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let mut s = SnakeApp {
            app,
            pipeline,
            vbuf,
            ibuf,
            grid_cols: 32,
            grid_rows: 32,
            cell_w: 0.0,
            cell_h: 0.0,
            snake: vec![],
            dir: (1, 0),
            food: (0, 0),
            acc: 0.0,
            step: 0.12,
            rng: 1,
            score: 0,
            paused: true,
            level: 2,
            // glyphon HUD
            font_system,
            cache,
            atlas,
            text_renderer,
            viewport,
            hud_status_buffer,
            hud_help_buffer,
            swash_cache,
        };
        s.update_cell_size();
        s.reset();
        s.update_hud_text();
        s
    }

    fn set_window_resized(&mut self, new_size: winit::dpi::PhysicalSize<u32>) {
        if new_size.width == 0 || new_size.height == 0 {
            return;
        }
        self.app
            .resize_surface_by_size((new_size.width, new_size.height));
        self.update_cell_size();
    }

    fn get_size(&self) -> winit::dpi::PhysicalSize<u32> {
        winit::dpi::PhysicalSize::new(self.app.config.width, self.app.config.height)
    }

    fn keyboard_input(&mut self, event: &KeyEvent) -> bool {
        if event.state != winit::event::ElementState::Pressed {
            return false;
        }
        match event.logical_key {
            Key::Named(NamedKey::ArrowLeft) => {
                if self.dir.0 != 1 {
                    self.dir = (-1, 0)
                }
                true
            }
            Key::Named(NamedKey::ArrowRight) => {
                if self.dir.0 != -1 {
                    self.dir = (1, 0)
                }
                true
            }
            Key::Named(NamedKey::ArrowUp) => {
                if self.dir.1 != 1 {
                    self.dir = (0, -1)
                }
                true
            }
            Key::Named(NamedKey::ArrowDown) => {
                if self.dir.1 != -1 {
                    self.dir = (0, 1)
                }
                true
            }
            Key::Named(NamedKey::Space) => {
                self.paused = !self.paused;
                self.update_hud_text();
                true
            }
            Key::Character(ref c) => {
                match c.as_str() {
                    "r" | "R" => {
                        self.reset();
                        true
                    }
                    "s" | "S" => {
                        self.paused = false;
                        self.update_hud_text();
                        true
                    }
                    "p" | "P" => {
                        self.paused = true;
                        self.update_hud_text();
                        true
                    }
                    "1" => {
                        self.set_level(1);
                        true
                    }
                    "2" => {
                        self.set_level(2);
                        true
                    }
                    "3" => {
                        self.set_level(3);
                        true
                    }
                    "4" => {
                        self.set_level(4);
                        true
                    }
                    _ => false,
                }
            }
            _ => false,
        }
    }

    fn update(&mut self, dt: instant::Duration) {
        if self.paused {
            return;
        }
        self.acc += dt.as_secs_f32();
        while self.acc >= self.step {
            self.step_once();
            self.acc -= self.step;
        }
    }

    fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        let output = self.app.surface.get_current_texture()?;
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let mut encoder = self
            .app
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });

        let mut instances: Vec<Instance> = Vec::with_capacity(self.snake.len() + 4);
        let vp = [self.app.config.width as f32, self.app.config.height as f32];
        let status_w = (vp[0] - 12.0).min(520.0);
        let help_w = (vp[0] - 12.0).min(680.0);
        instances.push(Instance {
            pos: [6.0, 6.0],
            size: [status_w, 32.0],
            color: [0.0, 0.0, 0.0, 0.35],
            viewport: vp,
        });
        instances.push(Instance {
            pos: [6.0, 44.0],
            size: [help_w, 32.0],
            color: [0.0, 0.0, 0.0, 0.25],
            viewport: vp,
        });
        for (i, seg) in self.snake.iter().enumerate() {
            let px = *seg;
            let mut color = [0.2, 0.8, 0.3, 1.0];
            if i == 0 {
                color = [0.1, 0.6, 0.2, 1.0];
            }
            instances.push(Instance {
                pos: [
                    px.0 as f32 * self.cell_w + 1.0,
                    px.1 as f32 * self.cell_h + 1.0,
                ],
                size: [self.cell_w - 2.0, self.cell_h - 2.0],
                color,
                viewport: vp,
            });
        }
        instances.push(Instance {
            pos: [
                self.food.0 as f32 * self.cell_w + 2.0,
                self.food.1 as f32 * self.cell_h + 2.0,
            ],
            size: [self.cell_w - 4.0, self.cell_h - 4.0],
            color: [0.9, 0.2, 0.2, 1.0],
            viewport: vp,
        });

        let bytes = unsafe {
            std::slice::from_raw_parts(
                instances.as_ptr() as *const u8,
                instances.len() * std::mem::size_of::<Instance>(),
            )
        };
        self.app.queue.write_buffer(&self.ibuf, 0, bytes);

        let _ = self.text_renderer.prepare(
            &self.app.device,
            &self.app.queue,
            &mut self.font_system,
            &mut self.atlas,
            &self.viewport,
            vec![
                TextArea {
                    buffer: &self.hud_status_buffer,
                    bounds: TextBounds {
                        left: 8,
                        top: 8,
                        right: self.app.config.width as i32,
                        bottom: self.app.config.height as i32,
                    },
                    left: 9.0,
                    top: 9.0,
                    scale: 1.0,
                    default_color: Color::rgb(0, 0, 0),
                    custom_glyphs: Default::default(),
                },
                TextArea {
                    buffer: &self.hud_status_buffer,
                    bounds: TextBounds {
                        left: 8,
                        top: 8,
                        right: self.app.config.width as i32,
                        bottom: self.app.config.height as i32,
                    },
                    left: 8.0,
                    top: 8.0,
                    scale: 1.0,
                    default_color: Color::rgb(255, 255, 255),
                    custom_glyphs: Default::default(),
                },
                TextArea {
                    buffer: &self.hud_help_buffer,
                    bounds: TextBounds {
                        left: 8,
                        top: 44,
                        right: self.app.config.width as i32,
                        bottom: self.app.config.height as i32,
                    },
                    left: 9.0,
                    top: 45.0,
                    scale: 1.0,
                    default_color: Color::rgb(0, 0, 0),
                    custom_glyphs: Default::default(),
                },
                TextArea {
                    buffer: &self.hud_help_buffer,
                    bounds: TextBounds {
                        left: 8,
                        top: 44,
                        right: self.app.config.width as i32,
                        bottom: self.app.config.height as i32,
                    },
                    left: 8.0,
                    top: 44.0,
                    scale: 1.0,
                    default_color: Color::rgb(255, 255, 255),
                    custom_glyphs: Default::default(),
                },
            ],
            &mut self.swash_cache,
        );

        {
            let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("snake rpass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(utils::unpack_u32_to_color(0x0b0f17ff)),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                ..Default::default()
            });
            rpass.set_pipeline(&self.pipeline);
            rpass.set_vertex_buffer(0, self.vbuf.slice(..));
            rpass.set_vertex_buffer(1, self.ibuf.slice(..));
            rpass.draw(0..6, 0..(instances.len() as u32));
            let _ = self.text_renderer.render(&self.atlas, &self.viewport, &mut rpass);
        }

        self.app.queue.submit(Some(encoder.finish()));
        output.present();
        Ok(())
    }
}

fn main() -> Result<(), impl std::error::Error> {
    utils::run::<SnakeApp>("Snake")
}
