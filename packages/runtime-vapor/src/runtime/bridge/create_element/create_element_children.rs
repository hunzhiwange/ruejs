use super::super::WasmRue;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::MountInputChild;
use js_sys::Array;
use wasm_bindgen::JsValue;

fn push_child_value(
    this: &WasmRue,
    item: JsValue,
    child_vec: &mut Vec<MountInputChild<JsDomAdapter>>,
) {
    if Array::is_array(&item) {
        let nested = Array::from(&item);
        for i in 0..nested.length() {
            push_child_value(this, nested.get(i), child_vec);
        }
        return;
    }

    if let Some(s) = item.as_string() {
        child_vec.push(MountInputChild::<JsDomAdapter>::Text(s));
    } else if let Some(_n) = item.as_f64() {
        // createElement children 路径中的裸数字应始终视为文本内容。
        // 默认 mount handle 现在是带 __rue_mount_id 的对象；若在这里把数字当注册表 id，
        // 会把 <li>{4}</li> 之类的普通文本误判成嵌套节点输入。
        child_vec.push(MountInputChild::<JsDomAdapter>::Text(_n.to_string()));
    } else if item.is_object() {
        if let Some(input) = this.default_mount_input_from_input(&item, false) {
            child_vec.push(MountInputChild::<JsDomAdapter>::Input(input));
        }
    }
}

pub(super) fn build_children_vec_array(
    this: &WasmRue,
    arr: Array,
) -> Vec<MountInputChild<JsDomAdapter>> {
    // 遍历数组项，按类型归一化为 MountInputChild<JsDomAdapter>
    let mut child_vec: Vec<MountInputChild<JsDomAdapter>> = Vec::new();
    for i in 0..arr.length() {
        push_child_value(this, arr.get(i), &mut child_vec);
    }
    child_vec
}

pub(super) fn build_children_vec_single(
    this: &WasmRue,
    item: JsValue,
) -> Vec<MountInputChild<JsDomAdapter>> {
    // 单值 children 的归一化逻辑（与数组分支一致）
    let mut child_vec: Vec<MountInputChild<JsDomAdapter>> = Vec::new();
    push_child_value(this, item, &mut child_vec);
    child_vec
}
