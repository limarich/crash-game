export async function waitFor(
    fn: () => Promise<boolean>,
    timeoutMs = 10_000,
    intervalMs = 300,
) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        if (await fn()) return
        await new Promise(r => setTimeout(r, intervalMs))
    }
    throw new Error(`waitFor timed out after ${timeoutMs}ms`)
}
