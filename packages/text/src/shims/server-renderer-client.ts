function createClientServerRendererError(name: string): Error {
  return new Error(`[text] ${name} is only available in server environments.`)
}

export async function renderToString(): Promise<string> {
  throw createClientServerRendererError('renderToString')
}
