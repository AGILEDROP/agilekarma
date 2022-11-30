/**
 * Handles sending of messages - i.e. outgoing messages - back to Slack, via Slack's Web API. See
 * also ./events.js, which handles incoming messages from subscribed events.
 *
 * TODO: This file should probably be renamed to 'slack.js' so it can handle all other requests to
 *       the Slack APIs rather than just sending.
 *
 * @see https://api.slack.com/web
 */
import type { WebClient } from '@slack/web-api';
import type { Member } from '@slack/web-api/dist/response/UsersListResponse.js';
import type { User } from './types.js';

let slack: WebClient;
let users: Record<string, User>;

/**
 * Injects the Slack client to be used for all outgoing messages.
 */
export const setSlackClient = (client: WebClient) => {
  slack = client;
};

export const memberToUser = (member: Member): User | null => {
  let profile = {};
  if (member.profile) {
    profile = { ...member.profile };
  }

  if (!member.id) {
    return null;
  }

  return {
    id: member.id,
    is_bot: member.is_bot || false,
    name: member.name || '(unknown)',
    profile,
  };
};

/**
 * Retrieves a list of all users in the linked Slack team. Caches it in memory.
 * */
export const getUserList = async () => {
  if (users) {
    return users;
  }

  console.log('Retrieving user list from Slack.');

  users = {};
  const userList = await slack.users.list();

  if (!userList.ok) {
    throw Error('Error occurred retrieving user list from Slack.');
  }

  if (userList.members) {
    for (const member of userList.members) {
      const user = memberToUser(member);
      if (user) {
        users[user.id] = user;
      }
    }
  }

  return users;
};

/**
 * Given a Slack user ID, returns the user's real name or optionally, the user's username. If the
 * user *does not* have a real name set, their username is returned regardless.
 */
export const getUserName = async (userId: string, username = false): Promise<string> => {
  await getUserList();
  let user = users[userId];

  if (!user) {
    // Get new list from slack and match the id.
    const userList = await slack.users.list();
    const member = userList.members?.find((slackUser) => slackUser.id === userId);
    if (member) {
      const convertedUser = memberToUser(member);
      if (convertedUser) {
        user = convertedUser;
      }
    }
  }

  // If still not found return unknown.
  if (!user) {
    return '(unknown)';
  }

  return username || !user.profile.real_name ? user.name : user.profile.real_name;
};

/**
 * Sends a message to a Slack channel.
 */
export const sendMessage = (text: string, channel: string): Promise<void> => {
  const payload = { channel, text };

  return new Promise((resolve, reject) => {
    slack.chat.postMessage(payload).then((data) => {
      if (!data.ok) {
        console.error('Error occurred posting response.');
        reject();
      } else {
        resolve();
      }
    });
  });
};

/**
 * Sends an Ephemeral message to a Slack channel.
 */
export const sendEphemeral = (text: string, channel: string, user: string): Promise<void> => {
  const payload = { channel, text, user };

  return new Promise((resolve, reject) => {
    slack.chat.postEphemeral(payload).then((data: { ok: boolean }) => {
      if (!data.ok) {
        console.error('Error occurred posting response.');
        reject();
      } else {
        resolve();
      }
    });
  });
};

/**
 *
 * Gets the channel name from slack api.
 */
export const getChannelName = async (channelId: string): Promise<string> => {
  const channelList = await slack.conversations.list({
    exclude_archived: true,
    types: 'public_channel,private_channel',
    limit: 1000,
  });
  const channel = channelList.channels?.find((chan) => chan.id === channelId);

  return channel?.name || '(unknown)';
};
