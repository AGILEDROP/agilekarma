import {
  afterAll,
  beforeAll, describe, expect, it, vi,
} from 'vitest';

import { WebClient } from '@slack/web-api';
import * as points from '../../src/points.js';
import { initMockServer } from '../../src/mock_slack_api/slack_server.js';
import { channels, users } from '../test_users.js';
import { setSlackClient } from '../../src/slack.js';
import { mockApiPort } from '../../config.js';
import { getUserScore } from '../../src/points.js';

const describeIf = process.env.VITEST_RUN_INTEGRATION && process.env.SLACK_API_TYPE === 'mock' ? describe : describe.skip;

describeIf('points.ts integration tests', () => {
  beforeAll(async () => {
    /*
    Start the mock slack server!
     */
    const isMock = initMockServer();

    if (isMock) {
      setSlackClient(new WebClient('abc1234556', { slackApiUrl: `http://localhost:${mockApiPort}/api/` }));
    }
  });

  afterAll(() => {
    vi.resetModules();
  });

  it('retrieves all scores for the leaderboard', async () => {
    const result = await points.retrieveTopScores();
    expect(result.length).toBe(2);
    /*
    If the db is prepped for integration tests, the result should have the length of 2.
     */
  });

  it('gets user\'s score', async () => {
    const userId = await points.getUserId(users[1]);
    const channelId = await points.getChannelId(channels[0]);

    const result = await points.getUserScore(userId, channelId);
    expect(result[0].score).toBe(3);
  });

  it('updates score for user', async () => {
    const fromUserId = await points.getUserId(users[0]);
    const toUserId = await points.getUserId(users[2]);
    const channelId = await points.getChannelId(channels[0]);

    const prevScore = await points.getUserScore(toUserId, channelId);

    const result = await points.updateScore(toUserId, fromUserId, channelId, 'someDescription');

    const updScore = await points.getUserScore(toUserId, channelId);

    expect(updScore[0].score).toBe(prevScore[0].score + 1);
    expect(result).toBe(updScore[0].score);
  });

  it('gets last score for a user for a channel', async () => {
    const fromUserId = await points.getUserId(users[0]);
    const channelId = await points.getChannelId(channels[0]);
    const result = await points.getLast(fromUserId, channelId);

    expect(result.length).toBe(1);
    expect(result[0].score_id).toBeTypeOf('string');
    expect(result[0].timestamp).toBeTypeOf('object');
  });

  it('creates and removes the last score record from db', async () => {
    const fromUserId = await points.getUserId(users[0]);
    const toUserId = await points.getUserId(users[1]);
    const channelId = await points.getChannelId(channels[0]);

    const beforeUpdate = await getUserScore(toUserId, channelId);

    await points.updateScore(toUserId, fromUserId, channelId, 'to be removed soon');

    const afterUpdate = await getUserScore(toUserId, channelId);

    expect(beforeUpdate[0].score).not.toBe(afterUpdate[0].score);

    await points.undoScore(fromUserId, toUserId, channelId);

    const afterUndo = await getUserScore(toUserId, channelId);

    expect(afterUpdate[0].score).not.toBe(afterUndo[0].score);
    expect(afterUndo[0].score).toBe(beforeUpdate[0].score);
  });

  it('inserts and checks user', async () => {
    const userId = 'U123456789';
    const userName = 'testUser';
    const insRes = await points.insertUser(userId, userName);
    expect(insRes[0]).toBe(0);

    const checkRes = await points.checkUser(userId);
    expect(checkRes[0]).toBe('U');
  });

  it('gets user', async () => {
    const userId = 'U123456789';
    // const userName = 'testUser';

    const result = await points.getUser(userId);
    expect(result[0].user_id).toBe(userId);
  });

  it('gets channel from db', async () => {
    /*
    Creates a channel with specified id and name. Checks if it is in the db.
     */
    const channelId = 'C987654321';
    const channelName = 'someChannel';

    const insertResult = await points.insertChannel(channelId, channelName);
    expect(insertResult[0]).toBe(0);

    const result = await points.getChannel(channelId);
    expect(result[0].channel_id).toBe(channelId);
  });

  it('inserts a channel into the db', async () => {
    const result = await points.insertChannel('C12345678', 'testInsertChannel');
    /*
    Resolves to 0 on success.
     */
    expect(result[0]).toBe(0);
  });

  it('checks if channel exists in db', async () => {
    const result = await points.checkChannel(channels[0]);
    expect(result).toBe(channels[0]);
  });

  it('gets a channel id from name', async () => {
    const result = await points.getChannelId('random');
    expect(result[0]).toBe('C');
  });

  it('retrieves KarmaFeed: with start/end date; all channels', async () => {
    const startDate = new Date(2022, 12, 1).valueOf() / 1000;
    const endDate = new Date().valueOf() / 1000;

    const result = await points.getKarmaFeed(10, 0, users[0], startDate.toString(), endDate.toString(), 'all');
    expect(result.count).toBe(4);
    expect(result.results.length).toBe(4);
  });

  it('retrieves KarmaFeed: with start/end date; one channel', async () => {
    const startDate = new Date(2022, 12, 1).valueOf() / 1000;
    const endDate = new Date().valueOf() / 1000;

    const result = await points.getKarmaFeed(10, 0, users[0], startDate.toString(), endDate.toString(), channels[0]);
    expect(result.count).toBe(3);
    expect(result.results.length).toBe(3);
  });

  it('retrieves KarmaFeed: with start/end date; two channels', async () => {
    const startDate = new Date(2022, 12, 1).valueOf() / 1000;
    const endDate = new Date().valueOf() / 1000;

    const result = await points.getKarmaFeed(10, 0, users[0], startDate.toString(), endDate.toString(), `${channels[0]},${channels[1]}`);
    expect(result.count).toBe(5);
    expect(result.results.length).toBe(5);
  });

  it('gets the count of daily scores by user', async () => {
    const userId = await points.getUserId(users[1]);
    const result = await points.getDailyVotesByUser(userId);
    expect(result).toContainEqual(expect.objectContaining({ 'count(`score_id`)': 2 }));
  });

  it('checks if the user is below daily voting limit', async () => {
    /*
    The daily limit is set to 300 votes per day.
     */
    const result = await points.getDailyUserScore(users[0]);
    expect(result.operation).toBeTruthy();
  });

  it('gets a user name from username', async () => {
    const result = await points.getName(users[0]);
    expect(result).toBe(users[0]);
  });

  it('gets an user id string from the db', async () => {
    const result = await points.getUserId(users[0]);
    expect(typeof result).toBe('string');
    expect(result[0]).toBe('U');
    expect(result.length).toBeGreaterThan(8);
  });

  it('gets all channels', async () => {
    const result = await points.getAllChannels();

    expect(result).toContainEqual(expect.objectContaining({
      channel_name: channels[0],
    }));
    expect(result).toContainEqual(expect.objectContaining({
      channel_name: channels[1],
    }));
    expect(result).toContainEqual(expect.objectContaining({
      channel_name: channels[2],
    }));
  });

  it('gets all "from" scores from a user in a channel', async () => {
    const result = await points.getAll(users[1], 'from', channels[0]);
    expect(result.count).toBe(3);
    expect(result.feed.length).toBe(3);
  });

  it('gets all "to" scores from a user in a channel', async () => {
    const result = await points.getAll(users[0], 'to', channels[0]);
    expect(result.count).toBe(4);
    expect(result.feed.length).toBe(4);
  });

  it('gets all scores for a user, for a channel', async () => {
    const result = await points.getAll(users[0], 'all', channels[0]);
    expect(result.count).toBe(4);
    expect(result.feed.length).toBe(4);
  });

  it('gets all scores for a user, from all channels', async () => {
    const result = await points.getAll(users[0], 'all', 'all');
    expect(result.count).toBe(5);
    expect(result.feed.length).toBe(5);
  });

  it('returns 0 results when no username is passed', async () => {
    const result = await points.getAll(undefined, 'all', 'all');
    expect(result.count).toBe(0);
    expect(result.feed.length).toBe(0);
  });
});
