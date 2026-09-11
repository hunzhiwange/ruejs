import * as browserDOM from './dom.browser'
import {
  addHydrationEventListener,
  adoptHydratedNode,
  appendHydrationChild,
  applyHydrationRef,
  clearHydrationRef,
  insertHydrationChild,
  markHydrationStagingNode,
  removeHydrationChild,
  removeHydrationEventListener,
} from './hydration-adoption'

let hydrationStagingDepth = 0

export const withHydrationStaging = <T>(run: () => T): T => {
  hydrationStagingDepth += 1
  try {
    return browserDOM.withHydrationDOMMutations(appendHydrationChild, insertHydrationChild, run)
  } finally {
    hydrationStagingDepth -= 1
  }
}

export const markHydrationStaging = (fragment: DocumentFragment): void => {
  if (hydrationStagingDepth > 0) markHydrationStagingNode(fragment)
}

export const isHydrationStagingActive = (): boolean => hydrationStagingDepth > 0

/** Explicit DOM boundary used only by hydrate-target compiler output. */
export const createComment = (data: string): Comment => browserDOM.createComment(data)
export const createTextNode = (data: string): Text => browserDOM.createTextNode(data)
export const createElement = (tag: string, parent?: Node | null): Element =>
  browserDOM.createElement(tag, parent)
export const appendChild = appendHydrationChild
export const removeChild = removeHydrationChild
export const insertBefore = insertHydrationChild
export const template = (html: string): browserDOM.StaticTemplateGetter => browserDOM.template(html)
export const withDOMHostOperations = <T>(parent: Node | null | undefined, run: () => T): T =>
  browserDOM.withDOMHostOperations(parent, run)

export {
  addHydrationEventListener,
  adoptHydratedNode,
  applyHydrationRef,
  clearHydrationRef,
  removeHydrationEventListener,
}
