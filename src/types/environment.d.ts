declare global {
    namespace NodeJS {
        interface ProcessEnv {
            UNDO_TIME_LIMIT: number
        }
    }
}

export { }
