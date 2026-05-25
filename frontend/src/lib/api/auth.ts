import type { TokenResponse } from './types'
import { parseError } from './index'

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080'
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? 'crash-game'
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'crash-game-client'

export async function keycloakLogin(username: string, password: string): Promise<TokenResponse> {
  const url = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: KEYCLOAK_CLIENT_ID,
    username,
    password,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<TokenResponse>
}
