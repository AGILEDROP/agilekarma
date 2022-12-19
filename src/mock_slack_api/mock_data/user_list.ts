import type {
  BlankUser, User, UserData, UserResponse,
} from '../slack_types.js';
import { generateSlackId } from '../slack_util.js';
import workspaceData from './base.js';

const { context_team_id: teamId } = workspaceData;

const seedUserData: UserData[] = [
  {
    id: 'USLACKBOT',
    team_id: 'T04DD0FC16Z',
    name: 'slackbot',
    deleted: false,
    color: '757575',
    real_name: 'Slackbot',
    tz: 'America/Los_Angeles',
    tz_label: 'Pacific Standard Time',
    tz_offset: -28800,
    is_bot: true,
    updated: 0,
  },
  {
    id: 'U04DFR727UK',
    team_id: 'T04DD0FC16Z',
    name: 'janez.kranjski',
    deleted: false,
    color: '9f69e7',
    real_name: 'janes.kranjski',
    tz: 'Europe/Amsterdam',
    tz_label: 'Central European Time',
    tz_offset: 3600,
    updated: 1669973281,
    is_bot: false,
  },
  {
    id: 'U04DPDE7XLP',
    team_id: 'T04DD0FC16Z',
    name: 'bobby',
    deleted: false,
    color: 'e7392d',
    real_name: 'Robert Droptable',
    tz: 'Europe/Amsterdam',
    tz_label: 'Central European Time',
    tz_offset: 3600,
    updated: 1670405426,
    is_bot: false,
  },
  {
    id: 'U04DURLH23T',
    team_id: 'T04DD0FC16Z',
    name: 'agilekarma_bot',
    deleted: false,
    color: '4bbe2e',
    real_name: 'agilekarma bot',
    tz: 'America/Los_Angeles',
    tz_label: 'Pacific Standard Time',
    tz_offset: -28800,
    is_bot: true,
    updated: 1669976780,
  },
];

const blankUser: BlankUser = {
  profile: [],
  is_admin: false,
  is_owner: false,
  is_primary_owner: false,
  is_restricted: false,
  is_ultra_restricted: false,
  is_app_user: false,
  is_email_confirmed: false,
  who_can_share_contact_card: 'EVERYONE',
};

const userResponse: UserResponse = {
  ok: true,
  members: [],
  cache_ts: 1670920328,
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
    acceptedScopes: ['users:read'],
  },
};

class Users {
  private static instance: Users;

  private members: User[] = [];

  private constructor() {
    this.members = seedUserData.map((seed) => ({ ...blankUser, ...seed }));
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new Users();
    return this.instance;
  }

  public getUsers() {
    const usersRes = userResponse;
    usersRes.members = this.members;
    return usersRes;
  }

  public getUserId(userName: string) {
    const user = this.members.find((member) => member.name === userName);
    if (user !== undefined) {
      return user.id;
    }
    return undefined;
  }

  public getUserName(userId: string) {
    const user = this.members.find((member) => member.id === userId);
    if (user !== undefined) {
      return user.name;
    }
    return undefined;
  }

  /*
  Creates a user if it doesn't exist.
   */
  public createUser(name: string, bot?: boolean): 'exists' | 'created' {
    if (this.getUserId(name) === undefined) {
      const data = {
        id: generateSlackId(11, 'user'),
        team_id: teamId,
        name,
        deleted: false,
        color: '757575',
        real_name: name,
        tz: 'America/Los_Angeles',
        tz_label: 'Pacific Standard Time',
        tz_offset: -28800,
        is_bot: bot || false,
        updated: 0,
      };
      this.members.push({ ...blankUser, ...data });
      return 'created';
    }
    return 'exists';
  }
}

export default Users;
