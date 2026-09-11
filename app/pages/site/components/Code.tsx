import { type FC } from '@rue-js/rue'

import CodePlain from './CodePlain'
import CodeShiki from './CodeShiki'
import { type CodeProps } from './CodeShared'

function shouldUsePlainCodeBlock(): boolean {
  return (
    import.meta.env?.SSR === true ||
    import.meta.env?.MODE === 'test' ||
    import.meta.env?.VITEST === true ||
    import.meta.env?.VITEST === 'true' ||
    !!(globalThis as any).vitest
  )
}

const Code: FC<CodeProps> = p => {
  return shouldUsePlainCodeBlock() ? <CodePlain {...p} /> : <CodeShiki {...p} />
}

export default Code
