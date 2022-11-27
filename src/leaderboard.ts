/**
 * Contains logic for returning the leaderboard.
 */
import type { Request } from 'express';
import type {
  Item,
  Message,
  TopScore,
  UserScore,
  Score,
  KarmaFeed, Event,
} from '@types';
import querystring from 'querystring';
import { isPlural, isUser, maybeLinkItem } from './helpers.js';
import { getChannelName, getUserName, sendEphemeral } from './slack.js';
import {
  getAllChannels,
  getName,
  getUserId,
  retrieveTopScores,
  getAll,
  getAllScoresFromUser as getAllScoresFromUserPoints,
  getKarmaFeed as getKarmaFeedPoints,
} from './points.js';
import { logResponseError } from './app.js';

/**
 * Gets the URL for the full leaderboard, including a token to ensure that it is only viewed by
 * someone who has access to this Slack team.
 */
export const getLeaderboardUrl = (request: Request, channelId: string): string => {
  const hostname = request.headers.host;

  const params = { channel: channelId };
  const protocol = process.env.SCOREBOT_USE_SSL !== '1' ? 'http://' : 'https://';

  return `${protocol}${hostname}/leaderboard?${querystring.stringify(params)}`;
};

const getLeaderboardWeb = (request: Request, channelId: string): string => {
  const params = { channel: channelId };
  const protocol = process.env.SCOREBOT_USE_SSL !== '1' ? 'http://' : 'https://';
  const frontendUrl = process.env.SCOREBOT_LEADERBOARD_URL;

  return `${protocol}${frontendUrl}?${querystring.stringify(params)}`;
};

/**
 * Ranks items by their scores, returning them in a human readable list complete with emoji for the
 * winner. Items which draw will be given the same rank, and the next rank will then be skipped.
 *
 * For example, 2 users on 54 would draw 1st. The next user on 52 would be 3rd, and the final on 34
 * would be 4th.
 */
export const rankItems = async (topScores: TopScore[], itemType = 'users', format = 'slack'): Promise<Item[]> => {
  let lastScore = 0;
  let lastRank = 0;
  let output: string | { rank: number; item: string; score: string; item_id: string; };
  const items: Item[] = [];

  for (let i = 0; i < topScores.length; i += 1) {
    const { item, score } = topScores[i];
    const isUserConfirmed = isUser(item);
    if ((isUserConfirmed && itemType !== 'users') || (!isUser && itemType === 'users')) {
      // eslint-disable-next-line no-continue
      continue;
    }

    let currentItem = '';
    if (isUserConfirmed) {
      // eslint-disable-next-line no-await-in-loop
      currentItem = format === 'slack' ? maybeLinkItem(item) : await getUserName(item);
    }

    const itemTitleCase = currentItem.substring(0, 1).toUpperCase() + currentItem.substring(1);
    const plural = isPlural(score) ? 's' : '';
    // Determine the rank by keeping it the same as the last user if the score is the same, or
    // otherwise setting it to the same as the item count (and adding 1 to deal with 0-base count).
    const rank: number = score === lastScore ? lastRank : items.length + 1;
    switch (format) {
      case 'slack':
        output = `${rank}. ${itemTitleCase} [${score} point${plural}]`;
        // If this is the first item, it's the winner!
        if (!items.length) {
          output += ` ${isUserConfirmed ? ':muscle:' : ':tada:'}`;
        }
        break;
      case 'object':
        output = {
          rank,
          item: itemTitleCase,
          score: `${score} point${plural}`,
          item_id: currentItem,
        };
        break;
      default:
        output = '';
    }

    items.push(output as Item);

    lastRank = rank;
    lastScore = score;
  }

  return items;
};

export const userScores = async (topScores: Score[]): Promise<UserScore[]> => {
  const items: UserScore[] = [];
  let output: UserScore;

  for (const score of topScores) {
    let toUser = score.item;
    let fromUser = score.from_user_id;
    const userScore = score.score;
    let channel = score.channel_id;

    const isUserConfirmed = isUser(toUser);

    if (isUserConfirmed) {
      // eslint-disable-next-line no-await-in-loop
      [toUser, fromUser, channel] = await Promise.all([
        getUserName(toUser),
        getUserName(fromUser),
        getChannelName(channel),
      ]);
    }

    output = {
      toUser,
      fromUser,
      score: userScore,
      channel: `#${channel}`,
    };

    items.push(output);
    console.log(`OUTPUT: ${JSON.stringify(output)}`);
  }

  return items;
};

/**
 * Retrieves and sends the current partial leaderboard (top scores only) to the requesting Slack
 * channel.
 */
export const getForSlack = async (event: { channel: string; user: string; }, request: Request): Promise<void> => {
  try {
    const limit = 5;
    const scores = await retrieveTopScores(event.channel);
    const users = await rankItems(scores, 'users');

    const messageText = `Here you go. Best people this month in channel <#${event.channel}|${await getChannelName(event.channel)}>.`;
    const bottomMessageText = `Or see the <${getLeaderboardWeb(request, event.channel)}|whole list>.`;
    const noUsers = 'No Users on Leaderboard.';

    let message: Message;
    if (users === undefined || users.length === 0) {
      message = {
        attachments: [
          {
            text: noUsers,
            color: 'danger',
          },
        ],
      };
    } else {
      message = {
        attachments: [
          {
            text: messageText,
            color: 'good', // Slack's 'green' colour.
            fields: [
              {
                value: users.slice(0, limit).join('\n'),
                short: true,
              },
              {
                value: `\n${bottomMessageText}`,
              },
            ],
          },
        ],
      };
    }

    console.log('Sending the leaderboard.');
    await sendEphemeral(message, event.channel, event.user);
  } catch (err) {
    logResponseError(err);
  }
};

/**
 * Retrieves and returns HTML for the full leaderboard, for displaying on the web.
 *
 * @param {object} request The Express request object that resulted in this handler being run.
 * @returns {string} HTML for the browser.
 */
export const getForWeb = async (request: Request): Promise<Item[]> => {
  try {
    const { startDate, endDate, channelId } = request.query as Record<string, string>;
    const scores = await retrieveTopScores(startDate, endDate, channelId);
    const users = await rankItems(scores, 'users', 'object');

    console.log(users);

    return users;
  } catch (err) {
    logResponseError(err);
  }

  return Promise.resolve([]);
};

/**
 * Retrieves and returns all channels, for displaying on the web.
 */
export const getForChannels = async (): Promise<any> => {
  try {
    const channels = await getAllChannels();

    console.log('Sending all Channels!');
    return channels;
  } catch (err) {
    logResponseError(err);
  }

  return Promise.resolve();
};

/**
 * Retrieves all scores from_user_id, for displaying on the web.
 */
export const getAllScoresFromUser = async (request: Request): Promise<UserScore[]> => {
  try {
    const { startDate, endDate, channelId } = request.query as Record<string, string>;
    const fromUsers = await getAllScoresFromUserPoints(startDate, endDate, channelId);

    const users = await userScores(fromUsers);

    console.log('Sending all From Users Scores!');

    return users;
  } catch (err) {
    logResponseError(err);
  }

  return Promise.resolve([]);
};

/**
 * Retrieves all added karma with descriptions, for displaying on the web.
 */
export const getKarmaFeed = async (request: Request): Promise<{ count: number, results: KarmaFeed[] }> => {
  try {
    const {
      itemsPerPage,
      page,
      searchString,
      startDate,
      endDate,
      channelId,
    } = request.query as Record<string, string>;
    const feed = await getKarmaFeedPoints(itemsPerPage, Number(page), searchString, channelId, startDate, endDate);
    console.log('Sending Karma Feed!');

    return feed;
  } catch (err) {
    logResponseError(err);
  }

  return Promise.resolve({
    count: 0,
    results: [],
  });
};

export const getUserProfile = async (request: Request): Promise<any> => {
  try {
    const {
      itemsPerPage,
      page,
      searchString,
      username,
      fromTo,
      channelProfile: channel,
    } = request.query as Record<string, string>;
    const scores = await retrieveTopScores(channel);
    const [users, userId] = await Promise.all([rankItems(scores, 'users', 'object'), getUserId(username)]);

    let userRank = 0;
    for (const el of users) {
      if (el.item_id === userId) {
        userRank = el.rank;
      }
    }

    const [
      nameSurname,
      karmaScore,
      karmaGiven,
      activityChartIn,
      activityChartOut,
      getAllItems,
    ] = await Promise.all([
      getName(username),
      getAll(username, 'from', channel),
      getAll(username, 'to', channel),
      getAll(username, 'from', channel),
      getAll(username, 'to', channel),
      getAll(username, fromTo, channel, itemsPerPage, Number(page), searchString),
    ]);

    // Count Karma Points from users
    const count: Record<string, number> = {};
    karmaScore.feed
      .map((u: KarmaFeed) => u.fromUser)
      .forEach((fromUser) => {
        count[fromUser] = (count[fromUser] || 0) + 1;
      });
    const karmaDivided = Object.entries(count).map(([key, value]) => ({ name: key, value })); // Math.round((value/karmaScore.count) * 100), count: value

    // Count All Received Karma Points by Days
    const countIn: Record<string, number> = {};
    activityChartIn.feed
      .map((d: KarmaFeed) => d.timestamp.toISOString().split('T')[0])
      .forEach((fromUser) => {
        countIn[fromUser] = (countIn[fromUser] || 0) + 1;
      });
    const chartDatesIn = Object.entries(countIn).map(([key, value]) => ({ date: key, received: value, sent: 0 }));

    // Count All Sent Karma Points by Days
    const countOut: Record<string, number> = {};
    activityChartOut.feed
      .map((d: KarmaFeed) => d.timestamp.toISOString().split('T')[0])
      .forEach((fromUser) => {
        countOut[fromUser] = (countOut[fromUser] || 0) + 1;
      });
    const chartDatesOut = Object.entries(countOut).map(([key, value]) => ({ date: key, received: 0, sent: value }));

    // Add Sent & Received Karma by Days Into Array
    const sentReceived = chartDatesIn.concat(chartDatesOut);

    // Combine Sent & Received Karma by Same Days
    const b: Record<string, Record<string, string>> = {};
    const combineDates = [];

    for (const sentReceivedObj of sentReceived) {
      const oa = sentReceivedObj;
      let ob = b[oa.date];

      if (!ob) {
        b[oa.date] = {};
        ob = b[oa.date];
        combineDates.push(ob);
      }

      (Object.keys(oa) as (keyof typeof sentReceivedObj)[]).forEach((k) => {
        if (k === 'date') {
          ob[k] = oa.date;
        } else {
          ob[k] = ((+ob[k] || 0) + +oa[k]).toString();
        }
      });
    }

    // Sort Dates
    combineDates.sort((curr, next) => new Date(curr.date).getTime() - new Date(next.date).getTime());

    console.log('Sending user name and surname.');

    return {
      ...getAllItems,
      nameSurname,
      allKarma: karmaScore.count,
      karmaGiven: karmaGiven.count,
      userRank,
      karmaDivided,
      activity: combineDates,
    };
  } catch (err) {
    logResponseError(err);
  }

  return Promise.resolve();
};

/**
 * The default handler for this command when invoked over Slack.
 */
export const handler = async (event: Event, request: Request): Promise<any> => getForSlack(event, request);
