// @vitest-environment jsdom
import Page from '../../../app/pages/examples/UseStateCounter'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'

defineActualExamplePageTest('UseStateCounter', Page)
