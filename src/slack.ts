/**
 * Handles sending of messages - i.e. outgoing messages - back to Slack, via Slack's Web API. See
 * also ./events.js, which handles incoming messages from subscribed events.
 *
 * TODO: This file should probably be renamed to 'slack.js' so it can handle all other requests to
 *       the Slack APIs rather than just sending.
 *
 * @see https://api.slack.com/web
 */

'use strict';

import { User } from "@types";

let slack: any;
let users: Record<string, User>;

/**
 * Injects the Slack client to be used for all outgoing messages.
 */
export const setSlackClient = (client: any) => {
  slack = client;
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

  for (const user of userList.members) {
    users[user.id] = user;
  }

  return users;

}; // GetUserList.

/**
 * Given a Slack user ID, returns the user's real name or optionally, the user's username. If the
 * user *does not* have a real name set, their username is returned regardless.
 */
export const getUserName = async (userId: string, username = false): Promise<string> => {

  const users = await getUserList();
  let user = users[userId];

  if ('undefined' === typeof user) {

    //Get new list from slack and match the id
    const userList = await slack.users.list();

    user = userList.members.find((user: { id: string; }) => user.id == userId);
  }

  //If still not found return unknown
  if ('undefined' === typeof user) {
    return '(unknown)';
  }

  return username || !user.profile.real_name ? user.name : user.profile.real_name;

};

/**
 * Sends a message to a Slack channel.
 */
export const sendMessage = (text: string, channel: string): Promise<void> => {

  let payload = {
    channel,
    text
  };

  // If 'text' was provided as an object instead, merge it into the payload.
  if ('object' === typeof text) {
    delete payload.text;
    payload = Object.assign(payload, text);
  }

  return new Promise((resolve, reject) => {
    slack.chat.postMessage(payload).then((data: {ok: boolean}) => {

      if (!data.ok) {
        console.error('Error occurred posting response.');
        return reject();
      }

      resolve();

    });

  }); // Return new Promise.
}; // SendMessage.
/**
 * Sends an Ephemeral message to a Slack channel.
 */
export const sendEphemeral = (text: string | object, channel: string, user: string): Promise<void> => {

  let payload = {
    channel,
    text,
    user
  };

  // If 'text' was provided as an object instead, merge it into the payload.
  if ('object' === typeof text) {
    delete payload.text;
    payload = Object.assign(payload, text);
  }

  return new Promise((resolve, reject) => {
    slack.chat.postEphemeral(payload).then((data: {ok: boolean}) => {

      if (!data.ok) {
        console.error('Error occurred posting response.');
        return reject();
      }

      resolve();

    });

  }); // Return new Promise.
}; // SendMessage.

/**
 *
 * Filters the channel array.
 */
function channelFilter(channelData: { id: string }): boolean {
  return this === channelData.id;
}

/**
 *
 * Gets the channel name from slack api.
 */
export const getChannelName = async (channelId: string): Promise<string> => {
  const channelList = await slack.conversations.list({
    // eslint-disable-next-line camelcase
    exclude_archived: true,
    types: 'public_channel,private_channel',
    limit: 1000
  });
  const channel = channelList.channels.filter(channelFilter, channelId);

  if ('undefined' === typeof channel) {
    return '(unknown)';
  }

  return channel[0].name;

};

export { };

