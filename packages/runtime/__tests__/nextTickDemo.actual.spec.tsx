// @vitest-environment jsdom
import Page from '../../../app/pages/examples/NextTick'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'

defineActualExamplePageTest('NextTick', Page)
