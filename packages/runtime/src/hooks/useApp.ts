import { _$createApp, type AppFactory } from '../compiler-runtime/app'

/** Create an application only from a compiler-produced closed root factory. */
export const useApp = (factory: AppFactory) => _$createApp(factory)
