declare global {
  namespace NodeJS {
    interface ProcessEnv {
      UNDO_TIME_LIMIT: string;
      SLACK_VERIFICATION_TOKEN: string;
      DATABASE_PORT: string;
    }
  }
}

export interface Event {
  type: string;
  subtype: string;
  text: string;
  user: string;
  channel: string;
}

export interface PlusMinusEventData {
  item: string;
  operation: string;
  description: string;
}

export interface TopScore {
  item: string;
  score: number;
}

export interface GetLastScore {
  score_id: string;
  timestamp: number;
}

export interface Score extends TopScore {
  from_user_id: string,
  channel_id: string,
}

export interface KarmaFeed {
  timestamp: Date,
  toUser: string,
  fromUser: string,
  channel_name: string,
  description: string
}

export interface Item {
  rank: number;
  item: string;
  score: string;
  item_id: string;
}

export interface UserScore {
  toUser: string;
  fromUser: string;
  score: number;
  channel: string;
}

interface Attachment {
  text: string;
  color: string;
  fields?: AttachmentField[];
}

interface AttachmentField {
  value: string;
  short?: boolean;
}

export interface Message {
  attachments: Attachment[];
}

export interface User {
  id: string;
  is_bot: boolean;
  profile: Record<string, string>;
  name: string;
}

export interface Operation {
  probability: number;
  set: string[];
}

export type Nullable<T> = T | null;
