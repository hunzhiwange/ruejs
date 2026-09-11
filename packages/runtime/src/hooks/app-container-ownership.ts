export type AppContainerOwner = object

export interface AppContainerReservation {
  readonly container: Node
  readonly owner: AppContainerOwner
}

interface AppContainerOwnership {
  confirmed: boolean
  owner: AppContainerOwner
  reservation: AppContainerReservation
}

const containerOwnership = new WeakMap<Node, AppContainerOwnership>()
const failedContainers = new WeakMap<Node, unknown>()

export function reserveAppContainer(
  container: Node,
  owner: AppContainerOwner,
): AppContainerReservation | null {
  if (failedContainers.has(container)) throw failedContainers.get(container)
  const current = containerOwnership.get(container)
  if (current?.owner === owner) return null
  if (current) throw new Error('Rue container is already mounted by another app.')

  const reservation = { container, owner }
  containerOwnership.set(container, {
    confirmed: false,
    owner,
    reservation,
  })
  return reservation
}

export function failAppContainer(container: Node, error: unknown): void {
  failedContainers.set(container, error)
}

export function confirmAppContainer(reservation: AppContainerReservation): void {
  const current = containerOwnership.get(reservation.container)
  if (current?.reservation !== reservation) {
    throw new Error('Rue app container reservation is no longer active.')
  }
  current.confirmed = true
}

export function rollbackAppContainer(reservation: AppContainerReservation): void {
  const current = containerOwnership.get(reservation.container)
  if (current?.reservation === reservation && !current.confirmed) {
    containerOwnership.delete(reservation.container)
  }
}

export function releaseAppContainer(container: Node, owner: AppContainerOwner): void {
  if (containerOwnership.get(container)?.owner === owner) {
    containerOwnership.delete(container)
  }
}
