const KEYCLOAK_URL = 'http://localhost:8080/realms/crash-game/protocol/openid-connect/token'

function decodeJwtSub(token: string) {
    const payload = token.split('.')[1]
    const decoded = Buffer.from(payload, 'base64').toString('utf8')
    return JSON.parse(decoded).sub
}

export async function getPlayerToken() {
    const res = await fetch(KEYCLOAK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=password&client_id=crash-game-client&username=player&password=player123',
    })
    const data = await res.json() as { access_token?: string; error?: string }
    if (!data.access_token) throw new Error(`Failed to get token: ${data.error}`)
    return data.access_token
}

export async function getPlayerId() {
    const token = await getPlayerToken()
    return decodeJwtSub(token)
}
