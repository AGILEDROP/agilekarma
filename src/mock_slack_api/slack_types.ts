export interface ChannelData {
  id: string
  name: string,
  name_normalized: string,
  context_team_id: string
  created: number,
  updated: number,
  creator: string,
  num_members: number,
}

export interface BlankChannel {
  is_channel: boolean,
  is_group: boolean,
  is_im: boolean,
  is_mpim: boolean,
  is_private: boolean,
  is_archived: boolean,
  is_general: boolean,
  unlinked: number,
  is_shared: boolean,
  is_org_shared: boolean,
  is_pending_ext_shared: boolean,
  pending_shared: [],
  parent_conversation: null | string,
  is_ext_shared: boolean,
  shared_team_ids: [],
  pending_connected_team_ids: [],
  is_member: boolean,
  topic: [],
  purpose: [],
  previous_names: [],
  num_members: number,
}

export type Channel = ChannelData & BlankChannel;

export interface ChannelResponse {
  ok: boolean,
  channels: Channel[],
  response_metadata: {
    next_cursor: string;
    scopes: string[],
    acceptedScopes: string[],
  },
}

export interface UserResponse {
  ok: boolean,
  members: User[],
  cache_ts: number,
  response_metadata: {
    next_cursor: string,
    scopes: string[],
    acceptedScopes: string[],
  },
}

export interface UserData {
  id: string,
  team_id: string,
  name: string,
  color: string,
  real_name: string,
  tz: string,
  tz_label: string,
  tz_offset: number,
  is_bot: boolean,
  updated: number,
  deleted: boolean,
}

export interface BlankUser {
  profile: [],
  is_admin: boolean,
  is_owner: boolean,
  is_primary_owner: boolean,
  is_restricted: boolean,
  is_ultra_restricted: boolean,
  is_app_user: boolean,
  is_email_confirmed: boolean,
  who_can_share_contact_card: string,
}

export type User = UserData & BlankUser;
