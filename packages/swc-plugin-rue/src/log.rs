//! 日志模块使用文档
//!
//! 目标：为编译插件提供轻量、可配置的运行时日志，便于调试转换流程。
//!
//! 基本用法：
//! - 级别输出：`debug/info/notice/warning/error/critical/alert/emergency`
//! - 示例：
//!   ```rust
//!   use swc_plugin_rue::log;
//!   log::info("rue-swc: vapor transform start");
//!   log::debug(&format!("attrs: {} items", 3));
//!   ```
//!
//! 配置方法：
//! - 启用/禁用：`log::set_log_enabled(true)`
//! - 级别阈值：`log::set_log_level("info")`（低于该级别不输出）
//! - 控制台输出：`log::set_log_console(true)`
//! - 文件输出：
//!   - 通过环境变量：`RUE_LOG_FILE=target/rue-plugin.log`
//!   - 或代码设置：`log::set_log_file("target/rue-plugin.log")`
//!
//! 过滤：
//! - 包含过滤：`log::add_log_include("vapor")`（仅匹配的消息输出）
//! - 排除过滤：`log::add_log_exclude("imports")`
//! - 清理过滤：`log::clear_log_include()` / `log::clear_log_exclude()`
//!
//! 插值：
//! - 使用键值对替换占位符：
//!   ```rust
//!   use swc_plugin_rue::log;
//!   log::log_with_pairs("info", "phase={phase} file={file}", &[("phase","pre"),("file","a.tsx")]);
//!   ```
//!
//! 设计说明：
//! - 使用 `thread_local!` 存储配置，避免全局可变带来的并发问题；插件运行环境为单线程，访问安全。
//! - 仅依赖标准库：控制台使用 `println!`，文件采用按需追加；避免引入额外依赖影响构建稳定性。
//! - 级别比较采用整数映射，便于阈值控制；包含/排除过滤为简单字符串匹配，满足日常调试需求。
use std::fs::OpenOptions;
use std::io::Write;

thread_local! {
    static LOG_ENABLED: std::cell::RefCell<bool> = std::cell::RefCell::new(false);
    static LOG_CONSOLE: std::cell::RefCell<bool> = std::cell::RefCell::new(false);
    static LOG_LEVEL: std::cell::RefCell<u8> = std::cell::RefCell::new(0);
    static LOG_INCLUDE: std::cell::RefCell<Vec<String>> = std::cell::RefCell::new(Vec::new());
    static LOG_EXCLUDE: std::cell::RefCell<Vec<String>> = std::cell::RefCell::new(Vec::new());
    static LOG_INCLUDE_TOUCHED: std::cell::RefCell<bool> = std::cell::RefCell::new(false);
    static LOG_EXCLUDE_TOUCHED: std::cell::RefCell<bool> = std::cell::RefCell::new(false);
    static LOG_FILE_PATH: std::cell::RefCell<Option<String>> = std::cell::RefCell::new(std::env::var("RUE_LOG_FILE").ok());
}

/// 级别名称映射为数值，便于比较
fn level_to_num(level: &str) -> u8 {
    match level {
        "debug" => 0,
        "info" => 1,
        "notice" => 2,
        "warning" => 3,
        "error" => 4,
        "critical" => 5,
        "alert" => 6,
        "emergency" => 7,
        _ => 0,
    }
}

/// 读取 localStorage 某键的字符串值
#[allow(dead_code)]
fn read_localstorage_value(_key: &str) -> Option<String> {
    None
}

/// 宽松解析布尔值字符串
fn parse_bool(s: &str) -> Option<bool> {
    let v = s.trim().to_ascii_lowercase();
    match v.as_str() {
        "1" | "true" | "yes" | "on" => Some(true),
        "0" | "false" | "no" | "off" => Some(false),
        _ => None,
    }
}

fn sync_log_config_from_env() {
    if let Ok(enabled_str) =
        std::env::var("RUE_LOG_ENABLED").or_else(|_| std::env::var("RUE_LOGS_ENABLED"))
    {
        if let Some(b) = parse_bool(&enabled_str) {
            LOG_ENABLED.with(|e| *e.borrow_mut() = b);
        }
    }
    if let Ok(level_str) =
        std::env::var("RUE_LOG_LEVEL").or_else(|_| std::env::var("RUE_LOGS_LEVEL"))
    {
        let num = level_to_num(&level_str.trim().to_ascii_lowercase());
        LOG_LEVEL.with(|l| *l.borrow_mut() = num);
    }
    // include/exclude 仅在“未通过 API 修改过”时读取环境变量，避免混淆优先级
    let include_touched = LOG_INCLUDE_TOUCHED.with(|t| *t.borrow());
    if !include_touched && std::env::var("RUE_LOG_INCLUDE").is_ok() {
        let inc = std::env::var("RUE_LOG_INCLUDE").unwrap_or_default();
        let vals: Vec<String> = inc
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();
        LOG_INCLUDE.with(|f| {
            let mut w = f.borrow_mut();
            w.clear();
            w.extend(vals);
        });
    }
    let exclude_touched = LOG_EXCLUDE_TOUCHED.with(|t| *t.borrow());
    if !exclude_touched && std::env::var("RUE_LOG_EXCLUDE").is_ok() {
        let exc = std::env::var("RUE_LOG_EXCLUDE").unwrap_or_default();
        let vals: Vec<String> = exc
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();
        LOG_EXCLUDE.with(|f| {
            let mut w = f.borrow_mut();
            w.clear();
            w.extend(vals);
        });
    }
}

/// 判断消息是否应被输出：考虑启用状态、级别阈值、包含/排除过滤
fn should_log(level: u8, msg: &str) -> bool {
    // no-op: local configuration via env or setters
    let enabled = LOG_ENABLED.with(|e| *e.borrow());
    if !enabled {
        return false;
    }
    let min = LOG_LEVEL.with(|l| *l.borrow());
    if level < min {
        return false;
    }
    let includes = LOG_INCLUDE.with(|f| f.borrow().clone());
    if !includes.is_empty() {
        let mut ok = false;
        for s in &includes {
            if msg.contains(s) {
                ok = true;
                break;
            }
        }
        if !ok {
            return false;
        }
    }
    let excludes = LOG_EXCLUDE.with(|f| f.borrow().clone());
    for s in &excludes {
        if msg.contains(s) {
            return false;
        }
    }
    true
}

/// 文本插值：用 `context` 对象中的键替换形如 `{key}` 的占位符
fn interpolate_pairs(mut message: String, pairs: &[(&str, &str)]) -> String {
    for (k, v) in pairs {
        let ph = format!("{{{}}}", k);
        message = message.replace(&ph, v);
    }
    message
}

pub fn set_log_enabled(enabled: bool) {
    LOG_ENABLED.with(|e| *e.borrow_mut() = enabled);
}

pub fn set_log_console(enabled: bool) {
    LOG_CONSOLE.with(|c| *c.borrow_mut() = enabled);
}

pub fn set_log_level(level: &str) {
    let v = level_to_num(level);
    LOG_LEVEL.with(|l| *l.borrow_mut() = v);
}

pub fn add_log_include(filter: &str) {
    LOG_INCLUDE.with(|f| f.borrow_mut().push(filter.to_string()));
    LOG_INCLUDE_TOUCHED.with(|t| *t.borrow_mut() = true);
}

pub fn clear_log_include() {
    LOG_INCLUDE.with(|f| f.borrow_mut().clear());
    LOG_INCLUDE_TOUCHED.with(|t| *t.borrow_mut() = true);
}

pub fn add_log_exclude(filter: &str) {
    LOG_EXCLUDE.with(|f| f.borrow_mut().push(filter.to_string()));
    LOG_EXCLUDE_TOUCHED.with(|t| *t.borrow_mut() = true);
}

pub fn clear_log_exclude() {
    LOG_EXCLUDE.with(|f| f.borrow_mut().clear());
    LOG_EXCLUDE_TOUCHED.with(|t| *t.borrow_mut() = true);
}

pub fn set_log_file(path: &str) {
    LOG_FILE_PATH.with(|p| *p.borrow_mut() = Some(path.to_string()));
}

/// 实际写入日志：按规则检查后输出到 console
fn write(level: &str, msg: &str) {
    sync_log_config_from_env();
    let lv = level_to_num(level);
    if !should_log(lv, msg) {
        return;
    }
    // 规范化输出文本：移除不可见控制字符（保留换行/回车/制表）
    fn sanitize(input: &str) -> String {
        input
            .chars()
            .map(|c| if c.is_control() && c != '\n' && c != '\r' && c != '\t' { ' ' } else { c })
            .collect()
    }
    // 简单时间戳：UNIX 秒
    let ts = match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => format!("{}", d.as_secs()),
        Err(_) => String::from("0"),
    };
    let entry = sanitize(&format!("{} [{}] {}", ts, level, msg));
    let to_console = LOG_CONSOLE.with(|c| *c.borrow());
    if to_console {
        println!("{}", entry);
    }
    let path_opt = LOG_FILE_PATH.with(|p| p.borrow().clone());
    if let Some(path) = path_opt {
        // 若存在文件路径：确保目录存在，使用追加写入；失败则回退为写入新文件
        let p = std::path::Path::new(&path);
        if let Some(parent) = p.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&p) {
            let _ = writeln!(f, "{}", entry);
        } else {
            let _ = std::fs::write(&p, format!("{}\n", entry));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn env_config_drives_logging() {
        std::env::set_var("RUE_LOG_ENABLED", "true");
        std::env::set_var("RUE_LOG_LEVEL", "info");
        std::env::remove_var("RUE_LOG_INCLUDE");
        std::env::remove_var("RUE_LOG_EXCLUDE");
        clear_log_include();
        clear_log_exclude();
        let path = "target/test_log_env.txt";
        std::fs::create_dir_all("target").ok();
        std::fs::remove_file(path).ok();
        set_log_console(false);
        set_log_file(path);
        info("hello env");
        let s = std::fs::read_to_string(path).expect("file");
        assert!(s.contains("[info]"));
        assert!(s.contains("hello env"));
    }

    #[test]
    fn include_exclude_filters() {
        std::env::set_var("RUE_LOG_ENABLED", "true");
        std::env::set_var("RUE_LOG_LEVEL", "debug");
        let path = "target/test_log_filters.txt";
        std::fs::remove_file(path).ok();
        set_log_console(false);
        set_log_file(path);

        std::env::set_var("RUE_LOG_INCLUDE", "only");
        info("hello");
        info("only match");
        let s = std::fs::read_to_string(path).expect("file");
        assert!(s.contains("only match"));
        assert!(!s.contains("hello\n"));

        std::env::set_var("RUE_LOG_INCLUDE", "");
        std::env::set_var("RUE_LOG_EXCLUDE", "ban");
        info("ban content");
        info("ok content");
        let s2 = std::fs::read_to_string(path).expect("file");
        assert!(s2.contains("ok content"));
        assert!(!s2.contains("ban content"));
    }
}

/// 通用日志入口
pub fn log(level: &str, msg: &str) {
    write(level, msg);
}

/// 带上下文插值的日志入口
pub fn log_with_pairs(level: &str, msg: &str, pairs: &[(&str, &str)]) {
    let interpolated = interpolate_pairs(msg.to_string(), pairs);
    write(level, &interpolated);
}

/// debug 级别输出
pub fn debug(msg: &str) {
    write("debug", msg);
}

/// info 级别输出
pub fn info(msg: &str) {
    write("info", msg);
}

/// notice 级别输出
pub fn notice(msg: &str) {
    write("notice", msg);
}

/// warning 级别输出
pub fn warning(msg: &str) {
    write("warning", msg);
}

/// error 级别输出
pub fn error(msg: &str) {
    write("error", msg);
}

/// critical 级别输出
pub fn critical(msg: &str) {
    write("critical", msg);
}

/// alert 级别输出
pub fn alert(msg: &str) {
    write("alert", msg);
}

/// emergency 级别输出
pub fn emergency(msg: &str) {
    write("emergency", msg);
}
