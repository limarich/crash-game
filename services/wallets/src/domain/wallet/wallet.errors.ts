export class InsufficientFundsError extends Error {
    constructor() {
        super('Insufficient funds')
    }
}

export class InvalidBalanceError extends Error {
    constructor() {
        super('Balance must be greater than or equal to zero')
    }
}

export class InvalidCreditAmountError extends Error {
    constructor() {
        super('Credit amount must be greater than zero')
    }
}

export class InvalidDebitAmountError extends Error {
    constructor() {
        super('Debit amount must be greater than zero')
    }
}