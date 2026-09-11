'use client'

import { useEffect } from '@rue-js/rue'
import { useRouter } from 'text/navigation'

type RouterAutoscrollControls = {
  push: (href: string) => void
  pushNoScroll: (href: string) => void
}

declare global {
  interface Window {
    __textRouterAutoscroll?: RouterAutoscrollControls
  }
}

export function RouterAutoscrollControls() {
  const router = useRouter()

  useEffect(() => {
    const controls: RouterAutoscrollControls = {
      push: href => router.push(href),
      pushNoScroll: href => router.push(href, { scroll: false }),
    }
    window.__textRouterAutoscroll = controls

    return () => {
      if (window.__textRouterAutoscroll === controls) {
        delete window.__textRouterAutoscroll
      }
    }
  }, [router])

  return <></>
}
