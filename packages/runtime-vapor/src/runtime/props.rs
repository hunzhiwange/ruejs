/*
属性补丁（patch_props）与后置修补（post_patch_element）
-----------------------------------------------
运行时在渲染/更新阶段将挂载输入与 mounted snapshot 中记录的 props 翻译为宿主操作：
- 删除旧属性：未出现在新 props 中的键需要被撤销或复位；
- 设置新属性：把新 props 应用到元素；
- 特例处理：className/style/innerHTML/value/checked/disabled/ref/onXxx 等。

设计原则：
- 尽量遵守宿主约定（如 SELECT 的 value 行为、布尔属性的同步）。
- 事件移除与添加在一次补丁中完成，避免重复绑定。
- ref 语义：clear_ref/apply_ref 由适配器实现（可能是函数或对象）。

快速示例（删除逻辑）：
1) 旧 props: { className: "a", style: { color: "red" }, onClick: fn, value: "1", checked: true }
   新 props: {}
   结果：
   - set_class_name(el, "") 清空 class
   - patch_style(el, {}, {}) 清空样式
   - remove_event_listener(el, "click", fn)
   - 对 SELECT:
     - multiple → set_value(el, [])
     - 非 multiple → set_value(el, "")
   - 对其他有 value 属性的元素：
     - set_value(el, "")
     - remove_attribute(el, "value")
   - set_checked(el, false), remove_attribute(el, "checked")
   - set_disabled(el, false), remove_attribute(el, "disabled")
   - clear_ref(old_ref)
   - remove_attribute(el, k) 对除 key/children 外的其他属性

快速示例（设置逻辑）：
1) 新 props: { className: "btn", style: { color: "blue" }, dangerouslySetInnerHTML: { __html: "<b>Hi</b>" } }
   结果：
   - set_class_name(el, "btn")
   - patch_style(el, {}, { color: "blue" })
   - set_inner_html(el, "<b>Hi</b>")
2) 新 props: { value: "x", checked: true, disabled: false, ref: someRef, onInput: handler, data-id: "1" }
   结果：
   - set_value(el, "x")
   - set_checked(el, true)
   - set_disabled(el, false)
   - apply_ref(el, someRef)
   - add_event_listener(el, "input", handler)
   - set_attribute(el, "data-id", "1")
*/
use crate::runtime::dom_adapter::DomAdapter;
use crate::runtime::types::ComponentProps;
use js_sys::{Array, Object, Reflect};
use std::collections::HashMap;
use wasm_bindgen::JsValue;

pub type Props = ComponentProps;

/*
事件速查表（Props → DOM）
--------------------------------
事件归一化规则：
- 任何以 “on” 开头的键都会被视为事件，如 onClick/onInput/onBlur 等
- 事件名转换：去掉前缀 “on”，再转为全小写，例如 onClick → "click"
- 行为：补丁时会先移除旧处理器，再添加新处理器，避免重复绑定

常用事件映射与宿主差异：
- onClick → "click"
  - 鼠标点击或键盘激活（取决于宿主实现与可达性）
- onChange → "change"
  - 文本输入：在用户“提交/失焦/确认”后触发（常晚于 input）
  - 选择类控件（checkbox/select/radio）：选项发生变化时触发
  - 若你需要“实时”监听文本输入，优先使用 onInput
- onInput → "input"
  - 文本输入实时更新（每次字符输入/删除都会触发）
  - 对需即时响应 UI 的场景（搜索、即时校验）更合适
- onBlur → "blur"
  - 元素失焦时触发；注意：blur 不冒泡，如需冒泡行为，浏览器原生是 focusout
- onFocus → "focus"
  - 元素获焦时触发；注意：focus 不冒泡，如需冒泡行为，浏览器原生是 focusin
- onKeydown → "keydown"
  - 键盘按键按下时；常用于捕获组合键（如 Ctrl/Shift 配合）
- onKeyup → "keyup"
  - 键盘按键释放时；与 keydown 搭配做完整键序列处理
- onKeypress → "keypress"
  - 已逐步不推荐；现代浏览器更建议使用 keydown/keyup（测试中仍覆盖 submit-on-enter 的场景）
- onSubmit → "submit"
  - 提交表单时触发；通常与阻止默认行为搭配（preventDefault）以执行自定义提交逻辑
- onChange 与 onInput 的选择建议：
  - 需要“批处理/确认提交”型输入：onChange
  - 需要“即时响应”型输入：onInput

鼠标与指针类（简要）：
- onMouseenter → "mouseenter"（不冒泡）
- onMouseleave → "mouseleave"（不冒泡）
- onMouseover → "mouseover"（冒泡）
- onMouseout → "mouseout"（冒泡）
- onPointerdown/up/move → "pointerdown"/"pointerup"/"pointermove"（更统一的指针事件）

小型示例：
1) 即时输入 + 失焦校验
   new_props = {
     onInput:  handlerInput,   // 实时更新 UI
     onBlur:   handlerBlur,    // 失焦时做最终校验
   }
   应用：
   - remove 旧 onInput（若存在），再 add 新 onInput → "input"
   - remove 旧 onBlur （若存在），再 add 新 onBlur  → "blur"

2) 表单提交 + Enter 快捷键
   new_props = {
     onSubmit:  handlerSubmit,   // 提交表单
     onKeydown: handlerKeydown,  // 捕获 Enter 并 preventDefault，再调用 handlerSubmit
   }

3) 文本输入的“确认后更新”
   new_props = {
     onChange: handlerChange,  // 用户确认/失焦后触发
   }
*/
pub fn patch_props<A: DomAdapter>(
    adapter: &mut A,
    el: &mut A::Element,
    old_props: &Props,
    new_props: &Props,
) -> Result<(), JsValue> {
    // 1) 删除旧属性：新 props 不包含的键需要撤销
    for (key, old_val) in old_props.iter() {
        if !new_props.contains_key(key) {
            if key.starts_with("on") {
                // 事件：移除旧处理器
                // 约定：onClick → "click"，onInput → "input"，统一转小写后去掉前缀 "on"
                // Demo：
                // 旧：{ onClick: fn } 新：{}
                // 调用：remove_event_listener(el, "click", fn)
                let evt = key.to_lowercase()[2..].to_string();
                adapter.remove_event_listener(el, &evt, old_val.clone());
            } else if key == "className" {
                // className 清空
                // Demo：旧 { className: "a" } → 新 {}
                // 调用：set_class_name(el, "")
                adapter.set_class_name(el, "");
            } else if key == "style" {
                // style 清空
                // Demo：旧 { style: { color: "red" } } → 新 {}
                // 调用：patch_style(el, {}, {})
                adapter.patch_style(el, &HashMap::new(), &HashMap::new());
            } else if key == "dangerouslySetInnerHTML" {
                // innerHTML 清空
                // Demo：旧 { dangerouslySetInnerHTML: { __html: "<b>Hi</b>" } } → 新 {}
                // 调用：set_inner_html(el, "")
                adapter.set_inner_html(el, "");
            } else if key == "value" {
                // value 删除逻辑：SELECT 与其他元素有差异
                // Demo：
                // 旧：{ value: "1" } 新：{}
                // 若 tagName === "SELECT":
                //   multiple → set_value(el, [])
                //   非 multiple → set_value(el, "")
                // 若其他并且有 value 属性：
                //   set_value(el, ""), remove_attribute(el, "value")
                if adapter.get_tag_name(el) == "SELECT" {
                    if adapter.is_select_multiple(el) {
                        adapter.set_value(el, JsValue::from(Array::new()));
                    } else {
                        adapter.set_value(el, JsValue::from_str(""));
                    }
                } else if adapter.has_value_property(el) {
                    adapter.set_value(el, JsValue::from_str(""));
                    adapter.remove_attribute(el, "value");
                }
            } else if key == "checked" {
                // checked 复位与属性移除
                // Demo：旧 { checked: true } → 新 {}
                // 调用：set_checked(el, false), remove_attribute(el, "checked")
                adapter.set_checked(el, false);
                adapter.remove_attribute(el, "checked");
            } else if key == "disabled" {
                // disabled 复位与属性移除
                // Demo：旧 { disabled: true } → 新 {}
                // 调用：set_disabled(el, false), remove_attribute(el, "disabled")
                adapter.set_disabled(el, false);
                adapter.remove_attribute(el, "disabled");
            } else if key == "ref" {
                // ref 清除
                // Demo：旧 { ref: r } → 新 {}
                // 调用：clear_ref(r)
                adapter.clear_ref(old_val.clone());
            } else if key != "key" && key != "children" {
                // 其他通用属性移除
                // Demo：旧 { data-id: "1" } → 新 {}
                // 调用：remove_attribute(el, "data-id")
                adapter.remove_attribute(el, key);
            }
        }
    }

    // 2) 设置新属性：遍历新 props，执行相应的宿主操作
    for (key, new_val) in new_props.iter() {
        if key == "className" {
            // Demo：新 { className: "btn" }
            // 调用：set_class_name(el, "btn")
            adapter.set_class_name(el, new_val.as_string().unwrap_or_default().as_str());
        } else if key == "style" {
            // Demo：新 { style: { color: "blue", width: 100 } }
            // 调用：patch_style(el, {}, { color: "blue", width: "100" })
            let ns = js_style_to_map(new_val)?;
            adapter.patch_style(el, &HashMap::new(), &ns);
        } else if key == "dangerouslySetInnerHTML" {
            // Demo：新 { dangerouslySetInnerHTML: { __html: "<i>x</i>" } }
            // 调用：set_inner_html(el, "<i>x</i>")
            let html = extract_inner_html(new_val)?;
            adapter.set_inner_html(el, html.as_str());
        } else if key == "value" {
            // Demo：新 { value: "x" }
            // 调用：set_value(el, "x")
            adapter.set_value(el, new_val.clone());
        } else if key == "checked" {
            // Demo：新 { checked: true }
            // 调用：set_checked(el, true)
            adapter.set_checked(el, new_val.as_bool().unwrap_or(false));
        } else if key == "disabled" {
            // Demo：新 { disabled: false }
            // 调用：set_disabled(el, false)
            adapter.set_disabled(el, new_val.as_bool().unwrap_or(false));
        } else if key == "ref" {
            // Demo：新 { ref: r }
            // 调用：apply_ref(el, r)
            adapter.apply_ref(el, new_val.clone());
        } else if key.starts_with("on") {
            // 事件：先移除旧的，再添加新的，避免重复
            // Demo：旧 { onInput: oldFn } 新 { onInput: newFn }
            // 调用：remove_event_listener(el, "input", oldFn) → add_event_listener(el, "input", newFn)
            let evt = key.to_lowercase()[2..].to_string();
            if let Some(old) = old_props.get(key) {
                adapter.remove_event_listener(el, &evt, old.clone());
            }
            adapter.add_event_listener(el, &evt, new_val.clone());
        } else if key != "key" && key != "children" {
            // 通用属性：以字符串形式写入
            // Demo：新 { data-id: "1" }
            // 调用：set_attribute(el, "data-id", "1")
            adapter.set_attribute(el, key, new_val.as_string().unwrap_or_default().as_str());
        }
    }
    Ok(())
}

pub fn post_patch_element<A: DomAdapter>(
    adapter: &mut A,
    el: &mut A::Element,
    new_props: &Props,
) -> Result<(), JsValue> {
    // 后置修补：某些宿主在属性设置后需要再次同步（如 SELECT 的 value）
    // Demo：新 props { value: "v" } 且 tagName === "SELECT"
    // 调用：set_value(el, "v")
    if adapter.get_tag_name(el) == "SELECT" {
        if let Some(v) = new_props.get("value") {
            adapter.set_value(el, v.clone());
        }
    }
    Ok(())
}

fn js_style_to_map(val: &JsValue) -> Result<HashMap<String, String>, JsValue> {
    // 将 JS 对象样式转换为 HashMap，以便适配器补丁
    // 输入：{ color: "red", width: 100 }
    // 输出：{ "color": "red", "width": "100" }
    let mut map = HashMap::new();
    if val.is_object() {
        let obj = Object::from(val.clone());
        let keys = Object::keys(&obj);
        for i in 0..keys.length() {
            let k = keys.get(i);
            if let Some(ks) = k.as_string() {
                let v = match Reflect::get(&obj, &k) {
                    Ok(v) => v,
                    Err(e) => return Err(e),
                };
                let s = v.as_string().unwrap_or_else(|| {
                    if let Some(n) = v.as_f64() { n.to_string() } else { String::new() }
                });
                map.insert(ks, s);
            }
        }
    }
    Ok(map)
}

fn extract_inner_html(val: &JsValue) -> Result<String, JsValue> {
    // 从 { __html: string } 对象提取原始 HTML 字符串
    // 输入：{ __html: "<b>Hi</b>" } → 输出 "<b>Hi</b>"
    if val.is_object() {
        let obj = Object::from(val.clone());
        let h = match Reflect::get(&obj, &JsValue::from_str("__html")) {
            Ok(v) => v,
            Err(e) => return Err(e),
        };
        return Ok(h.as_string().unwrap_or_default());
    }
    Ok(String::new())
}
