/*
通用工具概述
- NO：始终返回 false 的哑函数，用于默认开关、回调占位等。
- extend：浅合并多个对象源（忽略 falsy 源），返回 null 原型对象以避免原型链污染。
*/
/** 始终返回 false 的函数 */
export const NO = () => false

/**
 * 浅合并多个对象
 * - 忽略 null/undefined/false/0 等 falsy 源
 * - 使用 for...in 遍历可枚举属性，不拷贝原型链
 * - 结果对象原型为 null，避免原型属性干扰
 * @param {...any[]} args 源对象列表
 * @returns {Record<string, any>} 合并后的新对象（原型为 null）
 */
export function extend(...args: any[]) {
  const out = Object.create(null)
  for (let i = 0; i < args.length; i++) {
    const src = args[i]
    if (!src) continue
    for (const k in src) {
      out[k] = src[k]
    }
  }
  return out
}
