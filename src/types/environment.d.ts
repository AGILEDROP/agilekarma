declare global {
    namespace NodeJS {
        interface ProcessEnv {
            UNDO_TIME_LIMIT: number;
            SLACK_VERIFICATION_TOKEN: number;
        }
    }
}

export { }
