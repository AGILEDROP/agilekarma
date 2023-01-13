import {
  describe, expect, it,
} from 'vitest';
import type { Request } from 'express';
import * as leaderBoard from '../../src/leaderboard.js';
import { leaderboardUrl } from '../../config.js';

describe('leaderboard tests', () => {
  it('gets leaderboard url', () => {
    const hostString = 'mockHost';
    const req = {
      headers: {
        host: hostString,
      },
    } as Request;

    const result = leaderBoard.getLeaderboardUrl(req, 'all');

    expect(result.includes(hostString)).toBeTruthy();
    expect(result).toBe(`http://${hostString}/leaderboard?channel=all`);
  });

  it('gets leaderboard url for web', () => {
    const hostString = 'mockHost';
    const req = {
      headers: {
        host: hostString,
      },
    } as Request;

    const result = leaderBoard.getLeaderboardWeb(req, 'all');
    expect(result.includes(leaderboardUrl)).toBeTruthy();
  });
});
