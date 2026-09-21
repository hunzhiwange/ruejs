// @vitest-environment jsdom
import IsProxy from '../../../app/pages/examples/IsProxy'
import IsReadonly from '../../../app/pages/examples/IsReadonly'
import ToRef from '../../../app/pages/examples/ToRef'
import ToRefs from '../../../app/pages/examples/ToRefs'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'

defineActualExamplePageTest('ToRef', ToRef)
defineActualExamplePageTest('ToRefs', ToRefs)
defineActualExamplePageTest('IsProxy', IsProxy)
defineActualExamplePageTest('IsReadonly', IsReadonly)
