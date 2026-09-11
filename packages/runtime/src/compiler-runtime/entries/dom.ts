// Compiler capability entry: explicit exports from implementation modules only.
export { createElement as _$compiledCreateElement } from '../dom.browser'
export { createDocumentFragment as _$compiledCreateDocumentFragment } from '../dom.browser'
export { createTextNode as _$compiledCreateTextNode } from '../dom.browser'
export { createComment as _$compiledCreateComment } from '../dom.browser'
export { _$compiledSpreadAttributes } from '../../compiled-dom-bindings'
export { appendChild as _$compiledAppendChild } from '../dom.browser'
export { _$compiledText } from '../../runtime-core/compiled'
export { template as _$template } from '../dom.browser'
export {
  createElement as _$createElement,
  createComment as _$createComment,
  createTextNode as _$createTextNode,
  createDocumentFragment as _$createDocumentFragment,
  appendChild as _$appendChild,
  insertBefore as _$insertBefore,
} from '../dom.browser'
export {
  settextContent as _$settextContent,
  createTextWrapper as _$createTextWrapper,
} from '../dom.browser'
export {
  setDOMAttribute as _$setAttribute,
  setDOMChecked as _$setChecked,
  setDOMClassName as _$setClassName,
  setDOMDisabled as _$setDisabled,
  setDOMInnerHTML as _$setInnerHTML,
  setDOMProperty as _$setProperty,
  setDOMStyle as _$setStyle,
  setDOMValue as _$setValue,
} from '../../dom/props'
export { spreadAttributes as _$spreadAttributes } from '../../compiled-dom-bindings'
export const _$compiledShowStyle = (style: unknown, condition: unknown): unknown =>
  typeof style === 'string'
    ? condition
      ? style
      : `${style}; display: none`
    : { ...(style && typeof style === 'object' ? style : {}), display: condition ? '' : 'none' }
export { _$compiledStyleValue } from '../style-value'
export { _$compiledSelectValue } from '../select-value'
