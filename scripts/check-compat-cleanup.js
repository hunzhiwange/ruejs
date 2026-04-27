import { execFileSync } from 'node:child_process'

const targets = ['packages', 'docs', 'app']
const sharedArgs = [
  '--line-number',
  '--color=never',
  '-g',
  '!docs/plan*/**',
  '-g',
  '!packages/**/dist/**',
  '-g',
  '!packages/**/pkg/**',
  '-g',
  '!packages/**/pkg-node/**',
  '-g',
  '!docs/about/compat-policy.md',
  '-g',
  '!docs/about/releases.md',
  '-g',
  '!docs/guide/migration/renderable-default.md',
]

const checks = [
  {
    name: 'removed compat symbols',
    pattern: String.raw`__rue_vnode_id|RueVNodeHandle|_\$vaporCreateVNode|renderCompat|renderBetweenCompat|renderAnchorCompat|renderStaticCompat|adaptVNodeToRenderableCompat|@rue-js/runtime/compat|@rue-js/rue/compat`,
  },
  {
    name: 'legacy virtual-dom terminology',
    pattern: String.raw`\bVNode\b|__rue_vnode_id|__vnode|vnodeLike|虚拟 DOM|虚拟 dom`,
  },
]

let failed = false

for (const check of checks) {
  try {
    const output = execFileSync('rg', [...sharedArgs, check.pattern, ...targets], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (output.trim()) {
      console.error(`\n[compat-cleanup] Found forbidden matches for ${check.name}:\n`)
      console.error(output)
      failed = true
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 1) {
      continue
    }
    throw error
  }
}

if (failed) {
  process.exit(1)
}

console.log('[compat-cleanup] OK')
