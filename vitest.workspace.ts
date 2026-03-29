import { configDefaults, defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vite.config.ts',
    test: {
      name: 'unit',
      include: ['packages/**/__tests__/*.{test,spec}.{js,ts,jsx,tsx,mjs,cjs}'],
      exclude: [
        ...configDefaults.exclude,
        '**/e2e/**',
        '**/{rue,rue-design,runtime,jsx-runtime}/**',
        'packages/runtime/__tests__/transition-utils.spec.ts',
      ],
    },
  },
  {
    extends: './vite.config.ts',
    test: {
      name: 'unit-jsdom',
      include: [
        'packages/{rue,runtime,jsx-runtime}/**/*.{test,spec}.{js,ts,jsx,tsx,mjs,cjs}',
        'packages/runtime/__tests__/transition-utils.spec.ts',
      ],
      exclude: [...configDefaults.exclude, '**/e2e/**'],
      environment: 'jsdom',
    },
  },
  {
    extends: './vite.config.ts',
    test: {
      name: 'e2e',
      environment: 'jsdom',
      poolOptions: {
        threads: {
          singleThread: !!process.env.CI,
        },
      },
      include: ['packages/rue/__tests__/e2e/*.spec.ts'],
    },
  },
])
