export async function parseError(res: Response): Promise<string> {
    const body = await res.json().catch(() => ({}))
    return body.message ?? body.error_description ?? `HTTP ${res.status}`
}
