import { describe, expect, it, vi } from 'vite-plus/test'
import {
  createAppBrowserActionProtocol,
  createRueBrowserActionProtocol,
} from '../src/server/app-rsc-browser-action-protocol-core.js'
import {
  createAppServerActionProtocol,
  createRueServerActionProtocol,
} from '../src/server/app-rsc-server-action-protocol-core.js'

describe('App action protocols', () => {
  it('delegates browser action operations through an injectable protocol', async () => {
    const actionReferences = {}
    let registeredCallback: ((id: string, args: unknown[]) => Promise<unknown> | unknown) | null =
      null
    const createActionReferenceSet = vi.fn(() => actionReferences)
    const encodeActionArgs = vi.fn(async (value: unknown[]) => {
      expect(value).toEqual(['arg'])
      return 'encoded'
    })
    const setServerCallback = vi.fn(
      (textCallback: (id: string, args: unknown[]) => Promise<unknown> | unknown) => {
        registeredCallback = textCallback
      },
    )
    const protocol = createAppBrowserActionProtocol({
      createActionReferenceSet,
      encodeActionArgs,
      setServerCallback,
    })

    expect(protocol.createActionReferenceSet()).toBe(actionReferences)
    await expect(
      protocol.encodeActionArgs(['arg'], { references: actionReferences }),
    ).resolves.toBe('encoded')
    protocol.setServerCallback(async () => 'result')

    expect(createActionReferenceSet).toHaveBeenCalledTimes(1)
    expect(encodeActionArgs).toHaveBeenCalledWith(['arg'], { references: actionReferences })
    expect(setServerCallback).toHaveBeenCalledTimes(1)
    expect(registeredCallback).toBeTypeOf('function')
    await expect(registeredCallback?.('action-id', [])).resolves.toBe('result')
  })

  it('delegates server action operations through an injectable protocol', async () => {
    const actionReferences = {}
    const body = new FormData()
    const createActionReferenceSet = vi.fn(() => actionReferences)
    const decodeProgressiveAction = vi.fn(async () => 'decoded-action')
    const decodeFormState = vi.fn(async () => 'decoded-form-state')
    const parseActionArgs = vi.fn(async () => ['decoded-reply'])
    const loadServerAction = vi.fn(async () => () => 'loaded-action')
    const protocol = createAppServerActionProtocol({
      createActionReferenceSet,
      decodeProgressiveAction,
      decodeFormState,
      parseActionArgs,
      loadServerAction,
    })

    expect(protocol.createActionReferenceSet()).toBe(actionReferences)
    await expect(protocol.decodeProgressiveAction(body)).resolves.toBe('decoded-action')
    await expect(protocol.decodeFormState('result', body)).resolves.toBe('decoded-form-state')
    await expect(protocol.parseActionArgs(body, { references: actionReferences })).resolves.toEqual(
      ['decoded-reply'],
    )
    await expect(protocol.loadServerAction('action-id')).resolves.toBeTypeOf('function')

    expect(decodeFormState).toHaveBeenCalledWith('result', body)
    expect(parseActionArgs).toHaveBeenCalledWith(body, { references: actionReferences })
    expect(loadServerAction).toHaveBeenCalledWith('action-id')
  })

  it('round-trips Rue fetch action arguments through the neutral protocol', async () => {
    const browserProtocol = createRueBrowserActionProtocol()
    const serverProtocol = createRueServerActionProtocol(async actionId => {
      expect(actionId).toBe('action-id')
      return (name: string, formData: FormData) => `${name}:${formData.get('message')}`
    })
    const formData = new FormData()
    formData.set('message', 'hello')

    const body = await browserProtocol.encodeActionArgs(['Ada', formData])
    const args = await serverProtocol.parseActionArgs(body, {
      references: serverProtocol.createActionReferenceSet(),
    })
    const action = await serverProtocol.loadServerAction('action-id')

    expect(args[0]).toBe('Ada')
    expect(args[1]).toBeInstanceOf(FormData)
    expect((args[1] as FormData).get('message')).toBe('hello')
    expect(await (action as (...args: unknown[]) => unknown)(...args)).toBe('Ada:hello')
  })

  it('decodes progressive Rue action forms from action id fields', async () => {
    const protocol = createRueServerActionProtocol(async actionId => {
      expect(actionId).toBe('progressive-action')
      return (formData: FormData) => formData.get('name')
    })
    const body = new FormData()
    body.set('$RUE_ACTION_ID_progressive-action', '')
    body.set('name', 'Rue')

    const action = await protocol.decodeProgressiveAction(body)

    expect(action).toBeTypeOf('function')
    expect((action as () => unknown)()).toBe('Rue')
  })
})

it('decodes bound progressive state and excludes protocol fields from user FormData', async () => {
  const action = vi.fn((state: { count: number }, data: FormData) => ({
    count: state.count + Number(data.get('step')),
  }))
  const protocol = createRueServerActionProtocol(async () => action)
  const body = new FormData()
  body.set('$RUE_ACTION_ID_counter#add', '')
  body.set(
    '$RUE_ACTION_STATE',
    JSON.stringify({ version: 1, key: 'counter:0', actionId: 'counter#add', state: { count: 2 } }),
  )
  body.set('step', '1')
  const decoded = (await protocol.decodeProgressiveAction(body)) as () => unknown
  const result = await decoded()
  expect(result).toEqual({ count: 3 })
  expect([...action.mock.calls[0]![1].keys()]).toEqual(['step'])
  expect(await protocol.decodeFormState(result, body)).toEqual({
    version: 1,
    key: 'counter:0',
    actionId: 'counter#add',
    state: { count: 3 },
  })
  body.set(
    '$RUE_ACTION_STATE',
    JSON.stringify({ version: 1, key: 'counter:0', actionId: 'other', state: null }),
  )
  await expect(protocol.decodeProgressiveAction(body)).rejects.toThrow(
    'Invalid Rue action state reference',
  )
})
