# [《学习 wgpu》中文版](https://jinleili.github.io/learn-wgpu-zh/)

![Minimum Rust Version](https://img.shields.io/badge/min%20rust-1.92-green.svg)
[![Build Status](https://github.com/jinleili/learn-wgpu-zh/workflows/Build/badge.svg)](https://github.com/jinleili/learn-wgpu-zh/actions)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jinleili/learn-wgpu-zh/blob/master/LICENSE.MIT)

_为了便于读者的理解，译者选择性的添加了一些内容，并对原文中有歧义或错误的地方进行重新表述。所有的添加与修改均不会做单独标记。_

_翻译时采用了第一人称视角，故，除了带 🆕 标记的章节，教程中的**我**主要指的是原作者 [@sotrh](https://github.com/sotrh)。_

_另外，专有名词在一个段落中第一次出现时做了**加粗**处理，同一段落里反复出现时就不再加粗。_

## 什么是 WebGPU

**WebGPU** 是由 W3C [GPU for the Web](https://www.w3.org/community/gpu/) 社区组所发布的规范，目标是允许网页代码以高性能且安全可靠的方式访问 GPU 功能。它通过借鉴 Vulkan API，并将其转换为宿主硬件上使用的各式 API（如 DirectX、Metal、Vulkan）来实现这一目标。

## wgpu 与 WebGPU 的关系

[wgpu](https://github.com/gfx-rs/wgpu) 是基于 [WebGPU API 规范](https://gpuweb.github.io/gpuweb/)的、跨平台的、安全的、纯 Rust 图形 API。它是 Firefox、Servo 和 Deno 中 WebGPU 整合的核心。

**wgpu** 不仅可以在 Web 环境运行，还可以在 macOS / iOS、Android、Window 和 Linux 等系统上原生运行。

## 为什么选择 Rust

wgpu 实际上提供了 C 语言绑定 ([wgpu-native](https://github.com/gfx-rs/wgpu-native))，你可以写 C/C++ 或其他能与 C 互通的语言来使用它。尽管如此，wgpu 本身是用 Rust 实现的，它便利的 Rust 绑定能减少你使用中的阻碍。更重要的是，Rust 是一门高性能，内存和线程安全且极具生产力的现代底层语言。

在学习本教程之前你需要先熟悉 Rust，因为这里不会详细介绍 Rust 的语法知识。如果对 Rust 还不太熟悉，可以回顾一下 [Rust 教程](https://www.rust-lang.org/zh-CN/learn)或 [Rust 语言圣经](https://course.rs/about-book.html)。另外还需要熟悉 Rust 包管理工具 [Cargo](https://rustwiki.org/zh-CN/cargo/getting-started/index.html)。

## 为什么要学习 wgpu，直接用 JS/TS 搞 WebGPU 开发不香吗？

从 wgpu 及 dawn 这两个主要的 WebGPU 标准的实现库的开发动向可以看出，大量的扩展特性目前只有在 Native 端（Windows、macOS、Linux、iOS、Android）原生运行才能支持。wgpu 更是将 Native 端运行做为首要目标，WebGPU 是做为最低支持的特性集而存在。

使用 wgpu 在桌面及移动端做跨平台原生应用开发的体验极好，甚至我偏向于认为：**WebGPU 更容易在 Native 端得到普及**。因为不用受限于 1.0 标准啥时候发布，用户的浏览器是否支持等问题，现在就可以发布采用了 wgpu 的商业应用。

学习 wgpu 还有另一个重要的优势，那就是可以利用各种强大的桌面端 GPU 调试工具。在开发大型 2D/3D 应用时，通过使用命令记录/回放、帧捕捉、Buffer 视图等功能，可以快速定位 GPU 层代码/数据的性能瓶颈和程序缺陷。相较于仅依靠浏览器提供的有限调试能力，这些工具能够事半功倍，帮助开发者更快地解决问题。

## wgpu/WebGPU 的学习资料是不是很少？

其实不用纠结于 WebGPU 方面的直接学习资料的多少。

WebGPU 就是一套图形接口，绝大部分概念都是各图形接口里通用的，任何一本经典图形学书籍都是我们的学习资料。
要利用好这些经典资料，前提仅仅就是要先学习一套图形接口。因为图形学的书不是使用统一的特定图形接口所写，先学会一个图形接口及常见的概念，然后再去深入学习某个方面的资料就会事半功倍。

## 现在学习 wgpu 是不是为时尚早？

WebGPU 1.0 API 已经稳定，[Google 已经在 2023/4/6 宣布从 Chrome 113 版本开始正式支持 WebGPU](https://developer.chrome.com/blog/webgpu-release/)。

> <img src="docs/public/res/WebGPU-1.0.png" alt="WebGPU Spec 1.0" />
> 补充一下 @Kangz 的话: Web 规范有点滑稽，因为“草案”或“推荐”之类的名称在很大程度上是一个管理细节，实际上<b>对规范是否稳定可用</b>没有任何影响。事实上，W3C 程序建议至少有两个浏览器在规范通过“草案”之前已经发布了兼容的实现，但显然这些浏览器会认为规范相当稳定,然后才愿意发布实现。然而，这确实令开发人员感到困惑，我们对此深表歉意。

## 如何运行示例代码

```sh
# 在桌面环境本地运行
cargo run --bin vertex-animation
cargo run --bin tutorial1-window
```
