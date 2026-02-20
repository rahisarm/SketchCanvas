export const uid = () => Math.random().toString(36).slice(2, 11)
export const randomSeed = () => Math.floor(Math.random() * 100_000)
