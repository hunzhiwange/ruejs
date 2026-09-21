// @vitest-environment jsdom
import Page from '../../../app/pages/examples/ReactiveCounter'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'

defineActualExamplePageTest('ReactiveCounter', Page)
