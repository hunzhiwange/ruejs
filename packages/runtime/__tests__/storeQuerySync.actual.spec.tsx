// @vitest-environment jsdom
import Page from '../../../app/pages/examples/StoreQuerySync'
import { attachRouter, createRouter } from '@rue-js/router'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'

attachRouter(
  createRouter({
    history: {
      location: () => '/examples/store-query-sync',
      push: () => {},
      replace: () => {},
      listen: () => {},
      back: () => {},
    },
    routes: [{ path: '/examples/store-query-sync', component: Page as any }],
  }),
)

defineActualExamplePageTest('StoreQuerySync', Page)
