declare global {
  namespace NodeJS {
    interface ProcessEnv {
      UNDO_TIME_LIMIT: number;
      SLACK_VERIFICATION_TOKEN: string;
      DATABASE_PORT: number
    }
  }
}
export interface Events {
  (
    item?: string,
    operation?: string,
    channel?: string,
    userVoting?: string,
    description?: string
  ): Promise<string>;
}
