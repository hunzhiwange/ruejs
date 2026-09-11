'use client'

import { type TextCompatNode } from './component-adapter.js'
import { markAppSsrPassthroughComponent } from '../server/app-ssr-passthrough-protocol.js'
import { decodeHashFragment } from './hash-scroll.js'

import { useEffect } from '@rue-js/rue'
import {
  consumeAppRouterScrollIntent,
  getPendingAppRouterScrollIntent,
} from './app-router-scroll-state.js'

const rectProperties = ['bottom', 'height', 'left', 'right', 'top', 'width', 'x', 'y'] as const

function findFirstRouteDomNode(): Element | Text | null {
  if (typeof window === 'undefined') return null

  const textRoot = document.getElementById('__text')
  return textRoot?.firstChild instanceof Element || textRoot?.firstChild instanceof Text
    ? textRoot.firstChild
    : null
}

function shouldSkipElement(element: HTMLElement): boolean {
  const position = getComputedStyle(element).position
  if (position === 'fixed' || position === 'sticky') {
    return true
  }

  const rect = element.getBoundingClientRect()
  return rectProperties.every(property => rect[property] === 0)
}

function topOfElementInViewport(element: HTMLElement, viewportHeight: number): boolean {
  const rects = element.getClientRects()
  if (rects.length === 0) {
    return false
  }

  let elementTop = Number.POSITIVE_INFINITY
  for (const rect of rects) {
    if (rect.top < elementTop) {
      elementTop = rect.top
    }
  }

  return elementTop >= 0 && elementTop <= viewportHeight
}

function getHashFragmentDomNode(hash: string): HTMLElement | null {
  const fragment = decodeHashFragment(hash.startsWith('#') ? hash.slice(1) : hash)
  if (fragment === 'top') {
    return document.body
  }

  const element = document.getElementById(fragment) ?? document.getElementsByName(fragment)[0]
  return element instanceof HTMLElement ? element : null
}

function findTextScrollTarget(node: Element | Text | null): HTMLElement | null {
  if (!(node instanceof Element)) {
    return null
  }

  let target: Element = node
  while (!(target instanceof HTMLElement) || shouldSkipElement(target)) {
    if (target.textElementSibling === null) {
      return null
    }
    target = target.textElementSibling
  }

  return target
}

function scrollToElement(target: HTMLElement, hash: string | null): void {
  if (hash !== null) {
    target.scrollIntoView({ behavior: 'auto' })
    return
  }

  const htmlElement = document.documentElement
  const viewportHeight = htmlElement.clientHeight

  if (topOfElementInViewport(target, viewportHeight)) {
    return
  }

  htmlElement.scrollTop = 0

  if (!topOfElementInViewport(target, viewportHeight)) {
    target.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' })
  }
}

function handlePotentialScroll(): void {
  const intent = getPendingAppRouterScrollIntent()
  if (intent === null) return

  let target: HTMLElement | null
  if (intent.hash !== null) {
    target = getHashFragmentDomNode(intent.hash)
  } else {
    target = findTextScrollTarget(findFirstRouteDomNode())
  }
  if (target === null) return

  const consumed = consumeAppRouterScrollIntent(intent)
  if (consumed === null) return

  scrollToElement(target, consumed.hash)
  // Text's default handler uses plain focus(), but that lets the browser run
  // a second implicit scroll after our explicit navigation scroll. Keep the
  // focus transfer while preserving the scroll position we just chose.
  target.focus({ preventScroll: true })
}

export function AppRouterScrollTarget({ children }: { children: TextCompatNode }) {
  useEffect(() => {
    handlePotentialScroll()
  })

  return <>{children}</>
}

markAppSsrPassthroughComponent(AppRouterScrollTarget)
