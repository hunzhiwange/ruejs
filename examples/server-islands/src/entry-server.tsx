import { type FC } from '@rue-js/rue'
import { renderToString } from '@rue-js/server-renderer'
import { escapeIslandJson } from '@rue-js/server-renderer/island'
import { encodeServerIslandPayload } from '@rue-js/server-renderer/server-island'

import { App } from './App'

export const renderPage = (key: Uint8Array) =>
  renderToString(App, {
    serverIsland: async (id, props, fallback) => {
      const payload = await encodeServerIslandPayload({
        id,
        props,
        expiresAt: Date.now() + 5 * 60_000,
        key,
      })
      return `<rue-server-island data-rue-method="POST" data-rue-endpoint="/_rue/server-island">${fallback}<script type="application/json" data-rue-server-island-payload>${escapeIslandJson(JSON.stringify(payload))}</script></rue-server-island>`
    },
  })

export const renderServerIsland = (
  component: FC<any>,
  props: Record<string, unknown>,
  request: Request,
) => {
  // This demo adapter owns authentication. Production code should validate a real session.
  const username = request.headers.get('cookie')?.includes('session=demo') ? 'Rue user' : 'Guest'
  return renderToString(component, { props: { ...props, username } })
}
