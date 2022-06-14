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

export interface PlusMinusEventData {
  item: string,
  operation: string,
  description: string
}

export interface Score {
  item: string,
  score: number,
  from_user_id: string,
  channel_id: string
}

export interface Item {
  rank: number,
  item: string,
  score: string,
  item_id: string
}

export interface UserScore {
  toUser: string,
  fromUser: string,
  score: number,
  channel: string
}
