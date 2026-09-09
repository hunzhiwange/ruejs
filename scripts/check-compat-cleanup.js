import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const targets = ['packages', 'docs', 'app']
const sharedArgs = [
  '--line-number',
  '--color=never',
  '-g',
  '!docs/plan*/**',
  '-g',
  '!docs/search-index.json',
  '-g',
  '!packages/**/dist/**',
  '-g',
  '!packages/**/pkg/**',
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

// These facades dispatch non-reactive protocols. Keep exceptions at exact files.
const proxyAllowlist = {
  'packages/runtime/src/rue.ts': 'default Rue API facade',
  'packages/router/src/index.tsx': 'route parameter access',
  'packages/rue-rsc/src/plugin.ts': 'RSC module runner',
  'packages/rue-rsc/src/ssr.tsx': 'SSR module access',
  'packages/rue-rsc/src/utils/rpc.ts': 'RPC dispatch',
  'packages/rue-rsc/src/core/rsc.ts': 'RSC client/server references',
  'packages/text/src/build/prerender.ts': 'static parameter lookup',
  'packages/text/src/shims/thenable-params.ts': 'thenable parameter compatibility',
  'packages/text/src/shims/font-google-base.ts': 'font loader compatibility',
  'packages/text/src/shims/headers.ts': 'request headers/cookies compatibility',
  'packages/text/src/shims/server.ts': 'server request compatibility',
  'packages/text/src/shims/slot-core.ts': 'Text context compatibility',
  'packages/text/src/server/app-route-handler-runtime.ts': 'route request compatibility',
}
const removedFiles = [
  'packages/runtime/src/runtime-core/reactive-kernel/reactive.ts',
  'packages/runtime/src/compiled-reactive-compat.ts',
]
for (const file of removedFiles) {
  if (existsSync(file)) {
    console.error(`[compat-cleanup] Removed reactive module restored: ${file}`)
    failed = true
  }
}
const sources = execFileSync(
  'rg',
  [
    '--files',
    'packages',
    '-g',
    '*.ts',
    '-g',
    '*.tsx',
    '-g',
    '!**/dist/**',
    '-g',
    '!**/pkg/**',
    '-g',
    '!**/__tests__/**',
  ],
  { encoding: 'utf8' },
)
for (const file of sources.trim().split('\n')) {
  const source = readFileSync(file, 'utf8')
  if (/\bnew\s+Proxy\b|\bProxy\.revocable\b/.test(source) && !proxyAllowlist[file]) {
    console.error(`[compat-cleanup] Unapproved Proxy: ${file}`)
    failed = true
  }
  if (
    !file.startsWith('packages/text/') &&
    /reactive-kernel\/reactive(?:['".]|$)|compiled-reactive-compat/.test(source)
  ) {
    console.error(`[compat-cleanup] Removed reactive module reference: ${file}`)
    failed = true
  }
  if (
    file.startsWith('packages/runtime/src/') &&
    /\b(?:createReactive|shallowReactive|shallowReadonly|propsReactive|toRaw|toRefs|toRef|isProxy)\b/.test(
      source,
    )
  ) {
    console.error(`[compat-cleanup] Removed reactive API: ${file}`)
    failed = true
  }
  if (
    (file === 'packages/runtime/src/runtime-core/compiled.ts' ||
      file === 'packages/runtime/src/compiler-runtime/compact-reactivity.ts') &&
    /\b(?:subscribers|activeEffect)\s*[:=]|new Set<.*Subscriber.*?>/.test(source)
  ) {
    console.error(`[compat-cleanup] Duplicate subscription graph: ${file}`)
    failed = true
  }
}

if (failed) {
  process.exit(1)
}

console.log('[compat-cleanup] OK')
