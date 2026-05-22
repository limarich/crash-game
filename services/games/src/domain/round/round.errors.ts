
export class InvalidStateTransitionError extends Error {
    constructor(from: string, to: string) {
        super(`Invalid state transition from ${from} to ${to}`)
    }
}

export class SeedNotAvailableError extends Error {
    constructor() {
        super('Server seed is not available before crash')
    }
}