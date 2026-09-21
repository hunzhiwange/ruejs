// @vitest-environment jsdom
import Page from '../../../app/pages/examples/HelloWorld'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'

defineActualExamplePageTest('HelloWorld', Page)
