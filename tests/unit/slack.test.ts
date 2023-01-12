import {
  describe, expect, it, vi, afterAll, beforeAll,
} from 'vitest';
import { WebClient } from '@slack/web-api';
import * as slack from '../../src/slack.js';

console.error = vi.fn();
console.info = vi.fn();
console.log = vi.fn();
console.warn = vi.fn();

vi.mock('@slack/web-api', () => {
  const mSlack = {
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ok: true }),
      postEphemeral: vi.fn().mockResolvedValue({ ok: true }),
    },
    conversations: {
      list: vi.fn().mockResolvedValue({
        ok: true,
        channels: [
          {
            id: 'C012AB3CD',
            name: 'general',

          }],
      }),
    },
    users: {
      list: vi.fn().mockResolvedValue({
        ok: true,
        members: [
          {
            id: 'U012A3CDE',
            name: 'testuser',
            deleted: false,
            color: '9f69e7',
            real_name: 'Test User',
          }],
      }),
    },
  };
  return { WebClient: vi.fn(() => mSlack) };
});

describe('setSlackClient', () => {
  it('accepts a single parameter (that is later used as the Slack API client)', () => {
    expect(slack.setSlackClient).toHaveLength(1);
  });
});

describe('sendMessage', () => {
  let slackClient: WebClient;
  beforeAll(() => {
    slackClient = new WebClient('12344556789900');
  });

  const payload = {
    text: 'Hello there',
    channel: 'C12345678',
  };

  it('sends message text to a channel', async () => {
    slack.setSlackClient(slackClient);

    await slack.sendMessage(payload.text, payload.channel);

    expect(slackClient.chat.postMessage).toHaveBeenCalledWith(payload);
  });

  it('returns a Promise and resolves it if the message succeeds', async () => {
    slack.setSlackClient(slackClient);

    return slack.sendMessage(payload.text, payload.channel);
  });

  it.fails('returns a Promise and rejects it if the message fails', async () => {
    slack.setSlackClient(slackClient);

    slackClient.chat.postMessage = vi.fn().mockResolvedValueOnce({ ok: false });

    return slack.sendMessage(payload.text, payload.channel);
  });
});

describe('sendEphemeral', () => {
  let slackClient: WebClient;
  beforeAll(() => {
    slackClient = new WebClient('12344556789900');
  });

  const payload = {
    text: 'Hello there',
    channel: 'C12345678',
    user: 'U77123456',
  };

  it('sends an ephemeral message to channel', () => {
    slack.setSlackClient(slackClient);
    return slack.sendEphemeral(payload.text, payload.channel, payload.user);
  });

  it.fails('sends an ephemeral message to channel and rejects if message fails', () => {
    slack.setSlackClient(slackClient);
    slackClient.chat.postEphemeral = vi.fn().mockResolvedValueOnce({ ok: false });
    return slack.sendEphemeral(payload.text, payload.channel, payload.user);
  });
});

describe('getChannelName', () => {
  let slackClient: WebClient;
  beforeAll(() => {
    slackClient = new WebClient('12344556789900');
  });

  const channels = [
    {
      id: 'C012A7777',
      name: 'general',

    },
    {
      id: 'C012AB3CD',
      name: 'random',

    },
  ];

  it('gets the channel name from slack api', async () => {
    slack.setSlackClient(slackClient);

    slackClient.conversations.list = vi.fn().mockResolvedValue({
      ok: true,
      channels,
    });

    const result = await slack.getChannelName(channels[1].id);

    expect(result).toBe(channels[1].name);
  });

  it('returns \'(unknown)\' if the channel is not found', async () => {
    slack.setSlackClient(slackClient);

    slackClient.conversations.list = vi.fn().mockResolvedValue({
      ok: true,
      channels,
    });

    const result = await slack.getChannelName('C18495762');

    expect(result).toBe('(unknown)');
  });
});

describe('getUserList', () => {
  let slackClient: WebClient;
  beforeAll(() => {
    slackClient = new WebClient('12344556789900');
  });

  const members = [
    {
      id: 'U012A3CDE',
      name: 'testuser',
      deleted: false,
      color: '9f69e7',
      real_name: 'Test User',
    },
  ];

  it('calls the slack api to get user list', async () => {
    slack.setSlackClient(slackClient);
    slackClient.users.list = vi.fn().mockResolvedValue({
      ok: true,
      members,
    });

    await slack.getUserName('U012A3CDE');
    expect(slackClient.users.list).toHaveBeenCalled();
  });
});

describe('getUserName', () => {
  let slackClient: WebClient;
  beforeAll(() => {
    slackClient = new WebClient('12344556789900');
  });

  const members = [
    {
      id: 'U012A3CDE',
      name: 'testuser',
      deleted: false,
      color: '9f69e7',
      real_name: 'Test User',
    },
  ];

  it('returns a real name or username', async () => {
    slack.setSlackClient(slackClient);
    slackClient.users.list = vi.fn().mockResolvedValue({
      ok: true,
      members,
    });

    const result = await slack.getUserName('U012A3CDE');
    expect(result).toBe('testuser');
  });
});

describe('memberToUser', () => {
  const members = [
    {
      id: 'U012A3CDE',
      name: 'testuser',
      deleted: false,
      color: '9f69e7',
      real_name: 'Test User',
      profile: {
        avatar_hash: 'ge3b51ca72de',
        status_text: 'Print is dead',
        status_emoji: ':books:',
        real_name: 'Egon Spengler',
        display_name: 'spengler',
        real_name_normalized: 'Egon Spengler',
        display_name_normalized: 'spengler',
        email: 'spengler@ghostbusters.example.com',
        image_24: 'https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg',
        image_32: 'https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg',
        image_48: 'https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg',
        image_72: 'https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg',
        image_192: 'https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg',
        image_512: 'https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg',
        team: 'T012AB3C4',
      },
    },
  ];

  it('converts a member to user', async () => {
    const result = slack.memberToUser(members[0]);
    expect(result).toStrictEqual({
      id: members[0].id, is_bot: false, name: members[0].name, profile: members[0].profile,
    });
  });
});
