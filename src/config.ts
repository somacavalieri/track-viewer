export const NEON_DATA_API_URL = (import.meta.env.VITE_NEON_DATA_API_URL as string | undefined)?.replace(/\/+$/, '')
export const STACK_PROJECT_ID = import.meta.env.VITE_STACK_PROJECT_ID as string | undefined
export const STACK_PUBLISHABLE_CLIENT_KEY = import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY as string | undefined

/** Sync com Neon ligado apenas quando as três variáveis estão configuradas;
 *  sem elas o app roda 100% local (IndexedDB). */
export const remoteEnabled = Boolean(NEON_DATA_API_URL && STACK_PROJECT_ID && STACK_PUBLISHABLE_CLIENT_KEY)
