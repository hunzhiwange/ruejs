use wasm_bindgen::JsValue;

#[allow(dead_code)]
pub fn set_log_enabled(_enabled: bool) {}

#[allow(dead_code)]
pub fn set_log_console(_enabled: bool) {}

#[allow(dead_code)]
pub fn set_log_level(_level: &str) {}

#[allow(dead_code)]
pub fn add_log_include(_filter: &str) {}

#[allow(dead_code)]
pub fn clear_log_include() {}

#[allow(dead_code)]
pub fn add_log_exclude(_filter: &str) {}

#[allow(dead_code)]
pub fn clear_log_exclude() {}

#[allow(dead_code)]
pub fn log(_level: &str, _msg: &str) {}

#[allow(dead_code)]
pub fn log_with_context(_level: &str, _msg: &str, _context: JsValue) {}

#[allow(dead_code)]
pub fn debug(_msg: &str) {}

#[allow(dead_code)]
pub fn info(_msg: &str) {}

#[allow(dead_code)]
pub fn notice(_msg: &str) {}

#[allow(dead_code)]
pub fn warning(_msg: &str) {}

#[allow(dead_code)]
pub fn error(_msg: &str) {}

#[allow(dead_code)]
pub fn critical(_msg: &str) {}

#[allow(dead_code)]
pub fn alert(_msg: &str) {}

#[allow(dead_code)]
pub fn emergency(_msg: &str) {}

#[allow(dead_code)]
pub fn log_js(_label: &str, _values: &[JsValue]) {}

#[allow(dead_code)]
pub fn log_js_value(_label: &str, _value: &JsValue) {}

#[allow(dead_code)]
pub fn log_js_label(_label: &str) {}

#[allow(dead_code)]
pub fn want_log(_level: &str, _hint: &str) -> bool {
    false
}