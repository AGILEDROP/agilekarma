/**
 * Handles incoming events, using Slack's Events API. See also send.js, which handles outgoing
 * messages sent back to Slack.
 *
 * @see https://api.slack.com/events-api
 */
import camelCase from 'lodash.camelcase';
import type { Request } from 'express';
import type { Event, User } from './types.js';
import { handler } from './leaderboard.js';
import { getRandomMessage } from './messages.js';
import { getOperationName, operations } from './operations.js';
import { getUserList, getUserName, sendEphemeral } from './slack.js';
import { extractCommand, extractPlusMinusEventData, extractUserID } from './helpers.js';
import {
  checkChannel,
  checkUser,
  getDailyUserScore,
  updateScore,
  undoScore,
} from './points.js';
import { logResponseError } from './app.js';

const timeLimit = Math.floor(Number.parseInt(process.env.UNDO_TIME_LIMIT || '600', 10) / 60);

/**
 * Handles an attempt by a user to 'self plus' themselves, which includes both logging the attempt
 * and letting the user know it wasn't successful.
 */
export const handleSelfPlus = (user: string, channel: string): Promise<void> => {
  console.log(`${user} tried to alter their own score.`);
  const message = getRandomMessage(operations.SELF, user);
  return sendEphemeral(message, channel, user);
};

const usersList: { voter: string, user: string }[] = [];

/**
 *
 * Handles a plus or minus against a user, and then notifies the channel of the new score.
 * Processes data. Checks if user, channel exist in the database, if not it creates them and
 * returns the random message.
 */
const processUserData = async (item: string, operation: string, channel:string, userVoting: string, description: string): Promise<string> => {
  const dbUserTo = await checkUser(item);
  const dbUserFrom = await checkUser(userVoting);
  const checkChannelled = await checkChannel(channel);
  const score = await updateScore(dbUserTo, dbUserFrom, checkChannelled, description);
  const operationName = getOperationName(operation);

  const findVoter = usersList.find((user) => user.voter === userVoting);
  if (findVoter) {
    const location = usersList.indexOf(findVoter);
    usersList.splice(location, 1);
  }
  usersList.push({
    voter: userVoting,
    user: item,
  });

  return getRandomMessage(operationName, item, score);
};

/**
 *  Checks if the operation is supported and if the userVoting has reached daily limit
 *  and returns public slack message or sendEphemeral message.
 */
export const handlePlusMinus = async (item: string, operation: string, channel: string, userVoting: string, description: string) => {
  try {
    if (operation === '-') {
      return;
    }

    if (operation === '+') {
      // TODO: implement check for ban.
      let message;
      const userLimit = await getDailyUserScore(userVoting);
      if (userLimit.operation) {
        message = await processUserData(item, operation, channel, userVoting, description);
        await sendEphemeral(message, channel, userVoting);
      } else {
        await sendEphemeral(userLimit.message, channel, userVoting);
      }
    }
  } catch (err) {
    logResponseError(err);
  }
};

/**
 * Undoes last ++
 */
const undoPlus = async (event: Event) => {
  try {
    let message;
    const findVoter = usersList.find((user) => user.voter === event.user);
    if (findVoter) {
      const location = usersList.indexOf(findVoter);
      usersList.splice(location, 1);

      const score = await undoScore(event.user, findVoter.user, event.channel);
      // eslint-disable-next-line no-negated-condition
      if (typeof score !== 'undefined') {
        const operationName = getOperationName('-');
        message = getRandomMessage(operationName, findVoter.user, score);
      } else {
        message = `You can undo only for duration of ${timeLimit} minutes after up voting!`;
      }
    } else {
      message = `<@${event.user}> there is nothing to undo!`;
    }

    await sendEphemeral(message, event.channel, event.user);
  } catch (err) {
    logResponseError(err);
  }
};

/**
 * Sends a random thank you message to the requesting channel.
 */
export const sayThankyou = (event: Event): Promise<void> => {
  const thankyouMessages = [
    'Don\'t mention it!',
    'You\'re welcome.',
    'Pleasure!',
    'No thank YOU!',
    (
      '++ for taking the time to say thanks!\n...'
      + 'just kidding, I can\'t `++` you. But it\'s the thought that counts, right??'
    ),
  ];

  const randomKey = Math.floor(Math.random() * thankyouMessages.length);
  const message = `<@${event.user}> ${thankyouMessages[randomKey]}`;

  return sendEphemeral(message, event.channel, event.user);
};

/**
 * Sends a help message, explaining the bot's commands, to the requesting channel.
 */
export const sendHelp = async (event: { text: string; channel: string; user: string; }): Promise<void> => {
  const botUserID = extractUserID(event.text);
  const userName = await getUserName(botUserID); // 'U01ASBLRRNZ'

  const message = (
    // eslint-disable-next-line prefer-template
    'Sure, here\'s what I can do:\n\n'
    + '• `<@Someone> ++ [reason]`: Add a point to user, optionally you can add a reason.\n'
    + '• `<@' + userName + '> undo`: Undo last added point (only works ' + timeLimit + ' minutes after you gave ++).\n'
    + '• `<@' + userName + '> leaderboard`: Display the leaderboard.\n'
    + '• `<@' + userName + '> help`: Display this message.\n\n'
  );

  return sendEphemeral(message, event.channel, event.user);
};

export const handlers: Record<string, (event: Event, request?: Request) => Promise<void>> = {
  /**
   * Handles standard incoming 'message' events sent from Slack.
   * Assumes basic validation has been done before receiving the event. See handleEvent().
   */
  message: async (event) => {
    // Extract the relevant data from the message text.
    const data = extractPlusMinusEventData(event.text);

    if (!data) {
      return;
    }

    const { item, operation, description } = data;

    const userList = await getUserList();
    const userIsBot = Boolean(Object.values(userList).find((user: User) => user.id === item && user.is_bot));

    if (userIsBot && operation === 'undo') {
      await undoPlus(event);
      return;
    }

    if (!item || !operation || userIsBot) {
      return;
    }

    // Bail if the user is trying to ++ themselves...
    if (item === event.user && operation === '+') {
      await handleSelfPlus(event.user, event.channel);
      return;
    }

    // Otherwise, let's go!
    await handlePlusMinus(item, operation, event.channel, event.user, description);
  },

  /**
   * Handles 'app_mention' events sent from Slack, primarily by looking for known app commands, and
   * then handing the command off for processing..
   */
  appMention: (event, request) => {
    const appCommandHandlers: Record<string, Function> = {
      leaderboard: handler,
      help: sendHelp,
      thx: sayThankyou,
      thanks: sayThankyou,
      thankyou: sayThankyou,
    };

    const validCommands = Object.keys(appCommandHandlers);
    const appCommand = extractCommand(event.text, validCommands);

    if (appCommand) {
      return appCommandHandlers[appCommand](event, request);
    }

    const defaultMessage = (
      'Sorry, I\'m not quite sure what you\'re asking me. I\'m not very smart - there\'s only a '
      + 'few things I\'ve been trained to do. Send me `help` for more details.'
    );

    return sendEphemeral(defaultMessage, event.channel, event.user);
  },
};

/**
 * Determines whether or not incoming events from Slack can be handled by this app, and if so,
 * passes the event off to its handler function.
 */
export const handleEvent = (event: Event, request: Request) => {
  // If the event has no type, something has gone wrong.
  if (typeof event.type === 'undefined') {
    console.warn('Event data missing');
    return;
  }

  // If the event has a subtype, we don't support it.
  // TODO: We could look at this in the future, in particular, the bot_message subtype, which would
  //       allow us to react to messages sent by other bots. However, we'd have to be careful to
  //       filter appropriately, because otherwise we'll also react to messages from ourself.
  //       Because the 'help' output contains commands in it, that could look interesting!
  if (typeof event.subtype !== 'undefined') {
    console.warn(`Unsupported event subtype: ${event.subtype}`);
    return;
  }

  // If there's no text with the event, there's not a lot we can do.
  if (typeof event.text === 'undefined' || !event.text.trim()) {
    console.warn('Event text missing');
    return;
  }

  // Providing we have a handler for the event, let's handle it!
  const eventName = camelCase(event.type);
  if (handlers[eventName] instanceof Function) {
    handlers[eventName](event, request);
  }

  console.warn(`Invalid event received: ${event.type}`);
};
