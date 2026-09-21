// @vitest-environment jsdom
import Page from '../../../app/pages/examples/HelloChildren'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'

defineActualExamplePageTest('HelloChildren', Page)
