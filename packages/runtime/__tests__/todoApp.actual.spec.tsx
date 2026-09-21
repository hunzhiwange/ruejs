// @vitest-environment jsdom
import Page from '../../../app/pages/examples/TodoApp'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'

defineActualExamplePageTest('TodoApp', Page)
