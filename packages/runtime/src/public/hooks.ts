/** Public application and async-component hooks facade. */
export { useApp } from '../hooks/useApp'
export {
  useComponent,
  hydrateOnIdle,
  hydrateOnVisible,
  hydrateOnMediaQuery,
  hydrateOnInteraction,
  type AsyncComponentLoader,
  type AsyncComponentOptions,
  type HydrationStrategy,
  type HydrationStrategyFactory,
  type UseComponentOptions,
} from '../hooks/useComponent'
