export class InvalidBetStateError extends Error {
    constructor(from: string, to: string) {
        super(`Invalid bet state transition from ${from} to ${to}`)
    }
}

export class InvalidBetAmountError extends Error {
    constructor(message: string) {
        super(message)
    }
}