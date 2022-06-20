/**
 * Contains logic for returning the leaderboard.
 */

'use strict';


const querystring = require("querystring");
import { Item, Score, UserScore } from '@types';
import { Request } from 'express';
import { isPlural, isUser, maybeLinkItem } from './helpers';
import { getAllChannels, getName, getUserId, retrieveTopScores, getAll } from './points';
import { getChannelName, getUserName, sendEphemeral } from './slack';

/**
 * Gets the URL for the full leaderboard, including a token to ensure that it is only viewed by
 * someone who has access to this Slack team.
 */
export const getLeaderboardUrl = (request: Request, channelId: string): string => {

  const hostname = request.headers.host;

  const params = {
    channel: channelId
  };
  const protocol = process.env.SCOREBOT_USE_SSL !== '1' ? 'http://' : 'https://';
  return protocol + hostname + '/leaderboard?' + querystring.stringify(params);

}; // GetLeaderboardUrl.

const getLeaderboardWeb = (request: Request, channelId: string): string => {

  const params = {
    channel: channelId
  };
  const protocol = process.env.SCOREBOT_USE_SSL !== '1' ? 'http://' : 'https://';
  const frontendUrl = process.env.SCOREBOT_LEADERBOARD_URL;
  return protocol + frontendUrl + '?' + querystring.stringify(params);

}; // GetLeaderboardWeb.

/**
 * Ranks items by their scores, returning them in a human readable list complete with emoji for the
 * winner. Items which draw will be given the same rank, and the next rank will then be skipped.
 *
 * For example, 2 users on 54 would draw 1st. The next user on 52 would be 3rd, and the final on 34
 * would be 4th.
 */
export const rankItems = async (topScores: Score[], itemType = 'users', format = 'slack'): Promise<(string | Item)[]> => {

  let lastScore, lastRank, output;
  let items: (Item | string)[];

  for (const score of topScores) {

    let item = score.item;

    const isUserConfirmed = isUser(score.item) ? true : false;

    // Skip if this item is not the item type we're ranking.
    if (isUserConfirmed && 'users' !== itemType || !isUser && 'users' === itemType) {
      continue;
    }

    // For users, we need to link the item (for Slack) or get their real name (for other formats).
    if (isUserConfirmed) {
      item = (
        'slack' === format ? maybeLinkItem(item) : await getUserName(item)
      );
    }

    const itemTitleCase = item.substring(0, 1).toUpperCase() + item.substring(1),
      plural = isPlural(score.score) ? 's' : '';

    // Determine the rank by keeping it the same as the last user if the score is the same, or
    // otherwise setting it to the same as the item count (and adding 1 to deal with 0-base count).
    const rank: number = score.score === lastScore ? lastRank : items.length + 1;

    switch (format) {
      case 'slack':

        output = (
          rank + '. ' + itemTitleCase + ' [' + score.score + ' point' + plural + ']'
        );

        // If this is the first item, it's the winner!
        if (!items.length) {
          output += ' ' + (isUserConfirmed ? ':muscle:' : ':tada:');
        }

        break;

      case 'object':
        output = {
          rank,
          item: itemTitleCase,
          score: score.score + ' point' + plural,
          item_id: score.item
        };
        break;
    }

    items.push(output);

    lastRank = rank;
    lastScore = score.score;

  } // For scores.

  return items;

}; // RankItems.

export const userScores = async (topScores: Score[]): Promise<UserScore[]> => {

  const items = [];
  let output;

  for (const score of topScores) {

    let toUser = score.item;
    let fromUser = score.from_user_id;
    let userScore = score.score;
    let channel = score.channel_id;

    const isUserConfirmed = isUser(toUser) ? true : false;

    if (isUserConfirmed) {
      toUser = await getUserName(toUser);
      fromUser = await getUserName(fromUser);
      channel = await getChannelName(channel)
    }

    output = {
      toUser: toUser,
      fromUser: fromUser,
      score: userScore,
      channel: '#' + channel
    }

    items.push(output);
    console.log("OUTPUT: " + JSON.stringify(output));

  }

  return items;

}

/**
 * Retrieves and sends the current partial leaderboard (top scores only) to the requesting Slack
 * channel.
 */
export const getForSlack = async (event: { channel: string; user: string; }, request: Request) => {

  try {
    const limit = 5;

    const scores = await retrieveTopScores(undefined, undefined, event.channel),
      users = await rankItems(scores, 'users');

    // Things = await rankItems( scores, 'things' );

    const messageText = (
      'Here you go. Best people this month in channel <#' + event.channel + '|' +
      await getChannelName(event.channel) + '>.'
    );

    const bottomMessageText = (
      'Or see the <' + getLeaderboardWeb(request, event.channel) + '|whole list>. '
    );

    const noUsers = (
      'No Users on Leaderboard.'
    );

    let message;
    if (users === undefined || users.length == 0) {
      message = {
        attachments: [
          {
            text: noUsers,
            color: 'danger'
          }
        ]
      }
    } else {
      message = {
        attachments: [
          {
            text: messageText,
            color: 'good', // Slack's 'green' colour.
            fields: [
              {
                value: users.slice(0, limit).join('\n'),
                short: true
              },
              {
                value: '\n' + bottomMessageText
              }

              // {
              //   title: 'Things',
              //   value: things.slice( 0, limit ).join( '\n' ),
              //   short: true
              // }
            ]
          }
        ]
      };
    }

    console.log('Sending the leaderboard.');
    return sendEphemeral(message, event.channel, event.user);
  } catch (err) {
    console.error(err.message);
  }

}; // GetForSlack.

/**
 * Retrieves and returns HTML for the full leaderboard, for displaying on the web.
 *
 * @param {object} request The Express request object that resulted in this handler being run.
 * @returns {string} HTML for the browser.
 */
export const getForWeb = async (request: Request) => {

  try {

    const startDate = request.query.startDate as string;
    const endDate = request.query.endDate as string;
    const channelId = request.query.channel as string;

    const scores = await retrieveTopScores(startDate, endDate, channelId);
    const users = await rankItems(scores, 'users', 'object');

    console.log(users);
    return users;

  } catch (err) {
    console.error(err.message);
  }

}; // GetForWeb.

/**
 * Retrieves and returns all channels, for displaying on the web.
 */
export const getForChannels = async (request: {}) => {

  try {
    const channels = await getAllChannels();

    console.log('Sending all Channels!');
    return channels;
  } catch (err) {
    console.error(err.message);
  }

}; // GetForChannels.

/**
 * Retrieves all scores from_user_id, for displaying on the web.
 */
export const getAllScoresFromUser = async (request: { query: { startDate: Date; endDate: Date; channel: string; }; }) => {

  try {
    const startDate = request.query.startDate;
    const endDate = request.query.endDate;
    const channelId = request.query.channel;
    // console.log(request.query);
    const fromUsers = await getAllScoresFromUser(startDate, endDate, channelId);
    // console.log("FROMUSERS: " + JSON.stringify(fromUsers));

    const users = await userScores(fromUsers);
    // console.log("USERS: " + JSON.stringify(users));
    // const users = await userScores( fromUsers );

    console.log('Sending all From Users Scores!');
    // console.log("FROM USERS: " + JSON.stringify(users));

    return users;
  } catch (err) {
    console.error(err.message);
  }

}; // getAllScoresFromUser.

/**
 * Retrieves all added karma with descriptions, for displaying on the web.
 */
export const getKarmaFeed = async (request: { query: { itemsPerPage: number; page: number; searchString: string; startDate: Date; endDate: Date; channel: string; }; }) => {

  try {

    const itemsPerPage = request.query.itemsPerPage;
    const page = request.query.page;
    const searchString = request.query.searchString;
    const startDate = request.query.startDate;
    const endDate = request.query.endDate;
    const channelId = request.query.channel;
    const feed = await getKarmaFeed(itemsPerPage, page, searchString, channelId, startDate, endDate);
    console.log('Sending Karma Feed!');

    return feed;

  } catch (err) {
    console.error(err.message);
  }

}; // getKarmaFeed.



export const getUserProfile = async (request: { query: { username: string; fromTo: string; channelProfile: string; itemsPerPage: number; page: number; searchString: string; }; }) => {

  try {
    const username = request.query.username;
    const fromTo = request.query.fromTo;
    const channel = request.query.channelProfile;

    const itemsPerPage = request.query.itemsPerPage;
    const page = request.query.page;
    const searchString = request.query.searchString;

    const scores = await retrieveTopScores(null, null, channel);
    const users = await rankItems(scores, 'users', 'object');
    const userId = await getUserId(username);

    let userRank = 0;
    for (const el of users) {
      if (el.item_id === userId) {
        userRank = el.rank;
      }
    }

    const nameSurname = await getName(username);
    const karmaScore = await getAll(username, 'from', channel);
    const karmaGiven = await getAll(username, 'to', channel);
    const activityChartIn = await getAll(username, 'from', channel);
    const activityChartOut = await getAll(username, 'to', channel);
    const getAllItems = await getAll(username, fromTo, channel, itemsPerPage, page, searchString);


    // Count Karma Points from users
    let count: (string | number)[] = [];
    karmaScore.feed.map((u: { fromUser: string; }) => u.fromUser).forEach((fromUser: number) => { count[fromUser] = (count[fromUser] || 0) + 1 });
    let karmaDivided = Object.entries(count).map(([key, value]) => ({ name: key, value })); //: Math.round((value/karmaScore.count) * 100), count: value 

    // Count All Received Karma Points by Days
    let countIn: (string | number)[] = [];
    activityChartIn.feed.map((d: { timestamp: { toISOString: () => string; }; }) => d.timestamp.toISOString().split('T')[0]).forEach((fromUser: string | number) => { countIn[fromUser] = (countIn[fromUser] || 0) + 1 });
    let chartDatesIn = Object.entries(countIn).map(([key, value]) => ({ date: key, received: value, sent: 0 }));

    // Count All Sent Karma Points by Days
    let countOut: (string | number)[] = [];
    activityChartOut.feed.map((d: { timestamp: { toISOString: () => string; }; }) => d.timestamp.toISOString().split('T')[0]).forEach((fromUser: string | number) => { countOut[fromUser] = (countOut[fromUser] || 0) + 1 });
    let chartDatesOut = Object.entries(countOut).map(([key, value]) => ({ date: key, received: 0, sent: value }));

    // Add Sent & Received Karma by Days Into Array
    let sentReceived = chartDatesIn.concat(chartDatesOut);

    // Combine Sent & Received Karma by Same Days
    let b = {};
    let combineDates = [];

    for (let date in sentReceived) {

      let oa = sentReceived[date];
      let ob = b[oa.date];

      if (!ob) combineDates.push(ob = b[oa.date] = {});

      for (let k in oa) ob[k] = k === 'date' ? oa.date : (ob[k] || 0) + oa[k];

    }

    // Sort Dates
    combineDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('Sending user name and surname.');

    return { ...getAllItems, nameSurname, allKarma: karmaScore.count, karmaGiven: karmaGiven.count, userRank: userRank, karmaDivided: karmaDivided, activity: combineDates };

  } catch (err) {
    console.error(err.message);
  }

} // getUserProfile

/**
 * The default handler for this command when invoked over Slack.
 *
 */
export const handler = async (event: any, request: any) => {
  return getForSlack(event, request);
};

export { };