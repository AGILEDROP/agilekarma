import fs from 'fs';
import crypto from 'crypto';
import Handlebars from 'handlebars';
import type { Nullable, PlusMinusEventData } from './types.js';
import { getUserName } from './slack.js';
import { secret, verificationToken } from '../config.js';

const templates: Record<string, string> = {};

const ONE_DAY = 60 * 60 * 24;
const TOKEN_TTL = ONE_DAY;
const MILLISECONDS_TO_SECONDS = 1000;

/**
 * Given a message and a list of commands, extracts the first command mentioned in the message.
 * TODO: May need to ensure that commands are whole words, so a smaller command doesn't get
 *       detected inside a larger one.
 */
export const extractCommand = (message: string, commands: string[]): string => {
  let firstLocation = Number.MAX_SAFE_INTEGER;
  let firstCommand = '';

  commands.forEach((command) => {
    const location = message.indexOf(command);
    if (location !== -1 && location < firstLocation) {
      firstLocation = location;
      firstCommand = command;
    }
  });

  return firstCommand;
};

/**
 * Extracts a valid Slack user ID from a string of text.
 */
export const extractUserID = (text: string): string => {
  const match = text.match(/U[A-Z0-9]+/);
  return match ? match[0] : '';
};

/**
 * Gets the user or 'thing' that is being spoken about, and the 'operation' being done on it.
 * We take the operation down to one character, and also support — due to iOS' replacement of --.(i.e. + or -).
 */
export const extractPlusMinusEventData = (text: string): Nullable<PlusMinusEventData> => {
  const data = text.match(/<@([A-Za-z0-9]+)>+\s*(\+{2}|-{2}|—{1}|undo)\s*(.+)?/);
  if (!data || data.length < 3) {
    return null;
  }

  const usernameID = extractUserID(data[1]);
  if (!usernameID) {
    return null;
  }

  let operation = data[2];
  if (operation !== 'undo') {
    operation = data[2].substring(0, 1).replace('—', '-');
  }

  return {
    item: data[1],
    operation,
    description: data[3],
  };
};

/**
 * Generates a time-based token based on secrets from the environment.
 */
export const getTimeBasedToken = (ts: string): string => {
  if (!ts) {
    throw Error('Timestamp not provided when getting time-based token.');
  }

  if (!verificationToken || !secret) {
    throw Error('SLACK_VERIFICATION_TOKEN or SIGNING_SECRET env variable missing.');
  }

  return crypto
    .createHmac('sha256', verificationToken)
    .update(ts + secret)
    .digest('hex');
};

/**
 * Returns the current time as a standard Unix epoch timestamp.
 */
export const getTimestamp = (): number => Math.floor(Date.now() / MILLISECONDS_TO_SECONDS);

/**
 * Determines whether or not a number should be referred to as a plural - eg. anything but 1 or -1.
 */
export const isPlural = (number: number): boolean => Math.abs(number) !== 1;

/**
 * Validates a time-based token to ensure it is both still valid, and that it can be successfully
 * re-hashed using the expected secrets.
 */
export const isTimeBasedTokenStillValid = (token: string, ts: any): boolean => {
  const now = getTimestamp();

  // Don't support tokens too far from the past.
  if (now > parseInt(ts, 10) + TOKEN_TTL) {
    return false;
  }

  // Don't support tokens from the future.
  if (now < ts) {
    return false;
  }

  const hash = getTimeBasedToken(ts);

  return hash === token;
};

/**
 * Determines whether or not a string represents a Slack user ID - eg. U12345678.
 */
export const isUser = (item: string): boolean => !!item.match(/U[A-Z0-9]+/);

/**
 * Takes an item and returns it maybe linked using Slack's 'mrkdwn' format (their own custom
 * version of markdown).
 *
 * @param {string} item A raw 'item' - either a Slack user ID, or the name of a 'thing'.
 * @return {string} The item linked with Slack mrkdwn
 * @see https://api.slack.com/docs/message-formatting#linking_to_channels_and_users
 */
export const maybeLinkItem = (item: string): string => (isUser(item) ? `<@${item}>` : item);

/**
 * Renders HTML for the browser, using Handlebars. Includes a standard header and footer.
 */
export const render = async (templatePath: string, context = {}, request: { query?: { botUser: string } } = {}): Promise<string> => {
  // Retrieve the header and footer HTML, if we don't already have it in memory.
  if (!templates.header) templates.header = fs.readFileSync('src/html/header.html', 'utf8');
  if (!templates.footer) templates.footer = fs.readFileSync('src/html/footer.html', 'utf8');

  // Retrieve the requested template HTML if it is not already in memory.
  if (!templates[templatePath]) {
    console.log(`Retrieving template ${templatePath}.`);
    templates[templatePath] = fs.readFileSync(templatePath, 'utf8');
  }

  const defaults = {
    site_title: request.query?.botUser ? await getUserName(request.query.botUser) : 'Working PlusPlus++',
  };

  const output = templates.header + templates[templatePath] + templates.footer;

  return Handlebars.compile(output)(Object.assign(defaults, context));
};
