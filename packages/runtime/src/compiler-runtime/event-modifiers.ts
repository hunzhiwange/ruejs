export const _$compiledWithEventModifiers = <T extends (event: any) => unknown>(
  handler: T,
  modifiers: string[],
): T =>
  ((event: any) => {
    for (const modifier of modifiers) {
      if (modifier === 'stop') event.stopPropagation?.()
      else if (modifier === 'prevent') event.preventDefault?.()
      else if (modifier === 'self' && event.target !== event.currentTarget) return
      else if (['ctrl', 'shift', 'alt', 'meta'].includes(modifier) && !event[`${modifier}Key`])
        return
      else if (modifier === 'enter' && event.key !== 'Enter') return
      else if (/^\d+$/.test(modifier) && Number(modifier) !== (event.keyCode ?? event.which)) return
    }
    return handler(event)
  }) as T
