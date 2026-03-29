//! 渲染子系统总览
//!
//! - container：面向容器的渲染入口（render），负责首次挂载与后续增量更新
//! - range：在父元素的两个锚点之间渲染（render_between），适用于区间更新
//! - range_ops：render_between 的原子操作集合（解析父、清理区间、插入前端）
//! - helpers：容器与区间的辅助方法（映射维护、props/children 同步、查询工具）
//!
//! 本模块仅汇总并重导出各子模块的主要接口，便于上层统一使用。
mod container;
mod helpers;
mod range;
mod range_ops;

pub use container::*;
pub use range::*;
pub use range_ops::*;
