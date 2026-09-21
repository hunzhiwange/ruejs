// @vitest-environment jsdom
import Page from '../../../app/pages/examples/RenderCounter'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'

defineActualExamplePageTest('RenderCounter', Page)
