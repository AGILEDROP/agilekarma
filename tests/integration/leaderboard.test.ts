import {
  afterAll,
  beforeAll, describe, expect, it, vi,
} from 'vitest';
import { WebClient } from '@slack/web-api';
import type { Request } from 'express';
import * as leaderBoard from '../../src/leaderboard.js';
import * as points from '../../src/points.js';
import * as slack from '../../src/slack.js';
import { initMockServer } from '../../src/mock_slack_api/slack_server.js';
import { channels, users } from '../test_users.js';
import { setSlackClient } from '../../src/slack.js';
import { mockApiPort } from '../../config.js';

const describeIf = process.env.VITEST_RUN_INTEGRATION && process.env.SLACK_API_TYPE === 'mock' ? describe : describe.skip;

describeIf('integration tests', () => {
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

  it('gets the list of all users, ranked, from all channels for last month', async () => {
    const startDate = new Date(2022, 12, 1).valueOf() / 1000;
    const endDate = new Date().valueOf() / 1000;

    const req = {
      query: {
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        channelId: 'all',
      } as Record<string, string>,
    } as Request;

    const result = await leaderBoard.getForWeb(req);

    /*
    The way the results are seeded for the test, the winner should be
    users[1] alias lojze, with 5 points
     */
    expect(result[0].rank).toBe(1);
    expect(result[0].item_id).toBe(users[1]);
    expect(result[0].score).toBe('5 points');
  });

  it('gets the leaderboard for web, without parameters', async () => {
    const req = {
      query: {
        // startDate: startDate.toString(),
        // endDate: endDate.toString(),
        //   channelId: 'all',
      } as Record<string, string>,
    } as Request;

    const result = await leaderBoard.getForWeb(req);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('rank');
    expect(result[0]).toHaveProperty('item');
    expect(result[0]).toHaveProperty('score');
    expect(result[0]).toHaveProperty('item_id');
  });

  it('gets all scores for a user in a channel', async () => {
    const startDate = new Date(2022, 12, 1).valueOf() / 1000;
    const endDate = new Date().valueOf() / 1000;
    const channelId = await points.getChannelId('random');

    const req = {
      query: {
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        channelId,
      } as Record<string, string>,
    } as Request;

    const result = await leaderBoard.getAllScoresFromUser(req);

    expect(result.length).toBe(1);
    expect(result[0].channel).toBe('#random');
    expect(result[0].score).toBe(3);
  });

  it('gets karma feed for last month, all channels', async () => {
    const startDate = new Date(2022, 12, 1).valueOf() / 1000;
    const endDate = new Date().valueOf() / 1000;

    const req = {
      query: {
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        channelId: 'all',
      } as Record<string, string>,
    } as Request;

    const result = await leaderBoard.getKarmaFeed(req);

    expect(result.count).toBeTypeOf('number');
    expect(result.count).toBeGreaterThan(0);

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty('timestamp');
    expect(result.results[0]).toHaveProperty('fromUser');
    expect(result.results[0]).toHaveProperty('toUser');
    expect(result.results[0]).toHaveProperty('channel_name');
  });

  it('gets user profile', async () => {
    const req = {
      query: {
        username: users[1],

      } as Record<string, string>,
    } as Request;
    const result = await leaderBoard.getUserProfile(req);

    expect(result.feed.length).toBeGreaterThan(0);
    expect(result.count).toBeGreaterThan(0);
    expect(result).toHaveProperty('nameSurname', users[1]);
    expect(result).toHaveProperty('allKarma', 5);
    expect(result).toHaveProperty('karmaGiven', 2);
    expect(result).toHaveProperty('userRank', 1);
  });

  it('gets the leaderboard for slack', async () => {
    const sendEphemeralSpy = vi.spyOn(slack, 'sendEphemeral');

    const req = {
      query: {
        username: users[1],

      } as Record<string, string>,
    } as Request;

    const userId = await points.getUserId(users[0]);
    const channelId = await points.getChannelId(channels[1]);

    const event = {
      channel: channelId,
      user: userId,
    };

    await leaderBoard.getForSlack(event, req);

    expect(sendEphemeralSpy).toHaveBeenCalledWith(expect.stringContaining(channelId), channelId, userId);
  });

  it('gets all channels', async () => {
    const result = await leaderBoard.getForChannels();

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('channel_id');
    expect(result[0]).toHaveProperty('channel_name');
  });
});
