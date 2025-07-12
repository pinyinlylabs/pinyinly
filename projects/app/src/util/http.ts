// Split send/receive header names to allow backwards compatible renames.
export const httpSessionHeaderTx = `x-pyly-session`;
export const httpSessionHeaderRx = [httpSessionHeaderTx, `x-hhh-session`];
