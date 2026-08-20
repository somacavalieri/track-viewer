import { StackClientApp } from '@stackframe/js'
import { remoteEnabled, STACK_PROJECT_ID, STACK_PUBLISHABLE_CLIENT_KEY } from './config'

let app: StackClientApp | null = null

function stack(): StackClientApp {
  if (!app) {
    app = new StackClientApp({
      projectId: STACK_PROJECT_ID!,
      publishableClientKey: STACK_PUBLISHABLE_CLIENT_KEY!,
      tokenStore: 'cookie',
      urls: { emailVerification: window.location.origin },
    })
  }
  return app
}

export async function isAuthed(): Promise<boolean> {
  if (!remoteEnabled) return false
  try {
    return !!(await stack().getUser())
  } catch {
    return false
  }
}

/** Returns null on success, or an error message. */
export async function signIn(email: string, password: string): Promise<string | null> {
  try {
    const result = await stack().signInWithCredential({ email, password, noRedirect: true })
    if (result.status === 'error') {
      return result.error?.message || 'E-mail ou senha incorretos.'
    }
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'Falha ao entrar. Tente novamente.'
  }
}

export async function signOut(): Promise<void> {
  try {
    const user = await stack().getUser()
    await user?.signOut()
  } catch {
    /* session already gone */
  }
}

/** Access token (JWT) for the Neon Data API; null when signed out. */
export async function getToken(): Promise<string | null> {
  if (!remoteEnabled) return null
  try {
    const user = await stack().getUser()
    if (!user) return null
    const json = await user.getAuthJson()
    return json?.accessToken ?? null
  } catch {
    return null
  }
}
