import type {
  BlankChannel, ChannelData, ChannelResponse, Channel,
} from '../slack_types.js';
import workspaceData from './base.js';
import { generateSlackId } from '../slack_util.js';

const { context_team_id: teamId } = workspaceData;

const seedChannelData: ChannelData[] = [
  {
    id: 'C04DFRBRDR9',
    name: 'testing-bots',
    name_normalized: 'testing-bots',
    context_team_id: teamId,
    created: 1669973344,
    updated: 1669973344512,
    creator: 'U04DFR727UK',
    num_members: 3,
  },
  {
    id: 'C04DJCCCSNQ',
    name: 'random',
    created: 1669973282,
    name_normalized: 'random',
    context_team_id: teamId,
    updated: 1669973282559,
    creator: 'U04DFR727UK',
    num_members: 3,
  },
  {
    id: 'C04DUHMUZ3K',
    name: 'general',
    created: 1669973282,
    name_normalized: 'general',
    context_team_id: teamId,
    updated: 1669973282349,
    creator: 'U04DFR727UK',
    num_members: 3,
  },
];

const channelResponse: ChannelResponse = {
  ok: true,
  channels: [],
  response_metadata: {
    next_cursor: '',
    scopes: [
      'chat:write',
      'calls:read',
      'channels:join',
      'commands',
      'groups:read',
      'groups:write',
      'groups:history',
      'reactions:read',
      'reactions:write',
      'channels:history',
      'chat:write.customize',
      'channels:read',
      'users:read',
    ],
    acceptedScopes: ['channels:read', 'groups:read', 'mpim:read', 'im:read', 'read'],
  },
};

const blankChannel: BlankChannel = {
  is_channel: true,
  is_group: false,
  is_im: false,
  is_mpim: false,
  is_private: false,
  is_archived: false,
  is_general: false,
  unlinked: 0,
  is_shared: false,
  is_org_shared: false,
  is_pending_ext_shared: false,
  pending_shared: [],
  parent_conversation: null,
  is_ext_shared: false,
  shared_team_ids: [],
  pending_connected_team_ids: [],
  is_member: true,
  topic: [],
  purpose: [],
  previous_names: [],
  num_members: 3,
};

class Channels {
  private static instance: Channels;

  private channels: Channel[] = [];

  private constructor() {
    this.channels = seedChannelData.map((seed) => ({ ...blankChannel, ...seed }));
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new Channels();
    return this.instance;
  }

  public getChannels() {
    const channelsRes = channelResponse;
    channelsRes.channels = this.channels;
    return channelsRes;
  }

  public getChannelId(channelName: string) {
    const channel = this.channels.find((ch) => ch.name === channelName);
    if (channel !== undefined) {
      return channel.id;
    }
    return undefined;
  }

  public getChannelName(channelId: string) {
    const channel = this.channels.find((ch) => ch.id === channelId);
    if (channel !== undefined) {
      return channel.name;
    }
    return undefined;
  }

  /*
  Creates a channel if there isn't one already
   */
  public createChannel(name: string): 'exists' | 'created' {
    if (this.getChannelId(name) === undefined) {
      const data = {
        id: generateSlackId(11, 'channel'),
        name,
        created: Date.now(),
        name_normalized: name,
        context_team_id: teamId,
        updated: Date.now(),
        creator: 'U04DFR727UK',
        num_members: 3,
      };

      this.channels.push({ ...blankChannel, ...data });
      return 'created';
    }

    return 'exists';
  }
}

export default Channels;
