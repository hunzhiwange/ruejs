import { afterEach } from 'vitest'
import type { AppHandle } from '@rue-js/rue'

const apps = new Map<ParentNode | string, AppHandle>()

export function disposeTestApp(target: ParentNode | string) {
  apps.get(target)?.dispose()
  apps.delete(target)
}

/** Tests own app lifetimes explicitly; each factory uses the real render macro. */
export function mountTestApp(target: ParentNode | string, mount: () => AppHandle) {
  disposeTestApp(target)
  const app = mount()
  apps.set(target, app)
  return app
}

afterEach(() => {
  for (const target of apps.keys()) disposeTestApp(target)
})
