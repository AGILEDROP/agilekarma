/**
 * All the stuff that handles the giving, taking away, or otherwise querying of points.
 *
 * NOTE: As the functions here pretty much deal exclusively with the database, they generally
 *       aren't unit tested, as that would require anyone who runs the tests to also have a Postgres
 *       server. Instead, the functions in this file are well covered via the integration and
 *       end-to-end tests.
 */
import * as uuid from 'uuid';
import moment from 'moment';
import type { Knex } from 'knex';
import type {
  GetLastScore,
  KarmaFeed,
  Score,
  TopScore,
} from './types.js';
import { getChannelName, getUserName } from './slack.js';
import knexInstance from './database/knex.js';
import { votingLimit, timeLimit } from '../config.js';

const scoresTableName = 'score';

/**
 * Retrieves all scores for leaderboard.
 */
const getAllScores = (channelId: string = '', startDate?: string, endDate?: string): Promise<TopScore[]> => new Promise<TopScore[]>((resolve, reject) => {
  const parseDate = (date: string) => moment.unix(Number(date)).format('YYYY-MM-DD HH:mm:ss');

  const channels = channelId.split(',').filter((str) => str !== '');

  knexInstance('score')
    .select('to_user_id as item')
    .count<TopScore[]>('score_id as score')
    .where((builder) => {
      if (channels.length > 1) channels.forEach((channel) => builder.orWhere('channel_id', '=', channel));
      if (channels.length === 1 && channelId !== 'all') builder.where('channel_id', '=', channelId);

      return builder;
    })
    .andWhere((builder) => {
      if (startDate) builder.andWhere('timestamp', '>', parseDate(startDate));
      if (endDate) builder.andWhere('timestamp', '<', parseDate(endDate));
      return builder;
    })
    .groupBy('to_user_id')
    .orderBy('score', 'desc')
    .then((result) => {
      resolve(result);
    })
    .catch((error) => reject(error));
});

/**
* Retrieves all scores from the database, ordered from highest to lowest per channel.
*/
export const retrieveTopScores = (channelId?: string, startDate?: string, endDate?: string): Promise<TopScore[]> => getAllScores(channelId, startDate, endDate);

/**
 * Inserts or updates score for item.
 */
const insertScore = (toUserId: string, fromUserId: string, channelId: string, description: string | null = null): Promise<any> => new Promise((resolve, reject) => {
  knexInstance('score')
    .insert({
      score_id: uuid.v4(),
      timestamp: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
      to_user_id: toUserId,
      from_user_id: fromUserId,
      channel_id: channelId,
      description,
    })
    .then((result) => resolve(result))
    .catch((error) => reject(error));
});

/**
 * Selects score for item.
 */
export const getUserScore = (item: string, channelId: string): Promise<{ score: number }[]> => new Promise((resolve, reject) => {
  knexInstance(scoresTableName).select()
    .count<{ score: number }[]>('score_id as score')
    .where('to_user_id', '=', item)
    .andWhere('channel_id', '=', channelId)
    .then((result) => {
      resolve(result);
    })
    .catch((error) => reject(error));
});

/**
 * Updates the score of an item in the database. If the item doesn't yet exist, it will be inserted
 * into the database with an assumed initial score of 0.
 */
export const updateScore = async (toUserId: string, fromUserId: string, channelId: string, description: string): Promise<number> => {
  await insertScore(toUserId, fromUserId, channelId, description);
  const results = await getUserScore(toUserId, channelId);
  const result = results[0].score;
  console.log(`${toUserId} now on ${result}`);

  return result;
};

/**
 * Gets the last score record for user per channel.
 */
export const getLast = (fromUserId: string, channelId: string): Promise<GetLastScore[]> => new Promise((resolve, reject) => {
  const timestamp = moment(Date.now()).subtract(timeLimit, 'seconds').format('YYYY-MM-DD HH:mm:ss');

  knexInstance(scoresTableName)
    .select('score_id', 'timestamp')
    .from('score')
    .where('from_user_id', '=', fromUserId)
    .andWhere('timestamp', '>=', timestamp)
    .andWhere('channel_id', '=', channelId)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 * Removes score record from db.
 */
const removeLast = (scoreId: string): Promise<any> => new Promise((resolve, reject) => {
  knexInstance('score')
    .where('score_id', '=', scoreId)
    .del()
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 *
 * Undoes last score.
 */
export const undoScore = async (fromUserId: string, toUserId: string, channelId: string): Promise<number | undefined> => {
  let last;
  const results: GetLastScore[] = await getLast(fromUserId, channelId);

  if (typeof results[0] !== 'undefined') {
    last = results[0].score_id;
  }
  // Returning undefined as time run out.
  if (typeof last === 'undefined') {
    return last;
  }
  await removeLast(last);

  const scoreResults = await getUserScore(toUserId, channelId);
  const result = scoreResults[0].score;

  console.log(`${toUserId} now on ${result}`);

  return result;
};

/**
 *  Gets the user from the db.
 */
export const getUser = (userId: string): Promise<{ user_id: string }[]> => new Promise((resolve, reject) => {
  knexInstance('user')
    .select('user_id')
    .where('user_id', '=', userId)
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 * Inserts user into db.
 */
export const insertUser = (userId: string, userName: string): Promise<any> => new Promise((resolve, reject) => {
  const lowercaseUserName = userName.split(' ').join('').toLocaleLowerCase();
  knexInstance('user')
    .insert({
      user_id: userId, user_name: userName, user_username: lowercaseUserName, banned_until: undefined,
    })
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

export const checkUser = async (userId: string): Promise<string> => {
  const userName = await getUserName(userId);
  const users = await getUser(userId);
  const user = typeof users[0] === 'undefined' ? null : userId;

  if (user === null) {
    await insertUser(userId, userName);
  }

  return userId;
};

/**
 * Gets the channel from db.
 */
export const getChannel = (channelId: string): Promise<{ channel_id: string }[]> => new Promise((resolve, reject) => {
  knexInstance('channel')
    .select('channel_id')
    .where('channel_id', '=', channelId)
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 * Gets the channel id from name from the db.
 */
export const getChannelId = (channelName: string): Promise<string> => new Promise((resolve, reject) => {
  knexInstance('channel')
    .select('channel_id')
    .where('channel_name', '=', channelName)
    .then((result) => resolve(result[0].channel_id))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 * Inserts channel into db.
 */
export const insertChannel = (channelId: string, channelName: string): Promise<any> => new Promise((resolve, reject) => {
  knexInstance('channel')
    .insert({ channel_id: channelId, channel_name: channelName })
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 * Checks if channel exists in the db.
 */
export const checkChannel = async (channelId: string): Promise<string> => {
  const channelName = await getChannelName(channelId);
  const channels = await getChannel(channelId);
  const channel = typeof channels[0] === 'undefined' ? null : channelId;

  if (channel === null) {
    await insertChannel(channelId, channelName);
  }

  return channelId;
};

/**
 * Retrieves all scores from_user_id.
 */
export const getAllScoresFromUser = (startDate: string, endDate: string, channelId: string): Promise<Score[]> => new Promise((resolve, reject) => {
  let start;
  let end;

  if (typeof startDate !== 'undefined' || typeof endDate !== 'undefined') {
    start = moment.unix(+startDate).format('YYYY-MM-DD HH:mm:ss');
    end = moment.unix(+endDate).format('YYYY-MM-DD HH:mm:ss');
  } else {
    start = moment(Date.now()).startOf('month').format('YYYY-MM-DD HH:mm:ss');
    end = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  }

  knexInstance('score')
    .select('to_user_id as item', 'from_user_id', 'channel_id')
    .count<Score[]>('score_id as score')
    .where('channel_id', '=', channelId)
    .andWhere('timestamp', '>', start)
    .andWhere('timestamp', '<', end)
    .groupBy('to_user_id', 'from_user_id')
    .orderBy('score', 'desc')
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 * Retrieves all scores from_user_id
 */
export const getKarmaFeed = (itemsPerPage: string | number, page: number, searchString: string, startDate: string, endDate: string, channelId: string = ''): Promise<{ count: number, results: KarmaFeed[] }> => new Promise((resolve, reject) => {
  let start: string;
  let end: string;
  const channels = channelId.split(',');

  if (typeof startDate !== 'undefined' || typeof endDate !== 'undefined') {
    start = moment.unix(+startDate).format('YYYY-MM-DD HH:mm:ss');
    end = moment.unix(+endDate).format('YYYY-MM-DD HH:mm:ss');
  } else {
    start = moment(Date.now()).startOf('month').format('YYYY-MM-DD HH:mm:ss');
    end = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  }

  const searchFormBuilder = (builder: Knex.QueryBuilder) => {
    if (channelId === 'all' && !searchString && channels.length === 1) {
      builder
        .where('score.timestamp', '>', start)
        .andWhere('score.timestamp', '<', end);
    } else if (channelId === 'all' && searchString && channels.length === 1) {
      builder
        .where('score.timestamp', '>', start)
        .andWhere('score.timestamp', '<', end)
        .andWhere('uFrom.user_name', 'like', `%${searchString}%`);
    } else if (channelId !== 'all' && !searchString && channels.length === 1) {
      builder
        .where('channel.channel_name', '=', channelId)
        .andWhere('score.timestamp', '>', start)
        .andWhere('score.timestamp', '<', end);
    } else if (channelId !== 'all' && searchString && channels.length === 1) {
      builder
        .where('channel.channel_name', '=', channelId)
        .andWhere('score.timestamp', '>', start)
        .andWhere('score.timestamp', '<', end)
        .andWhere('uFrom.user_name', 'like', `%${searchString}%`);
    } else if (channelId !== 'all' && !searchString) {
      channels.forEach((channel) => builder.orWhere('channel.channel_name', '=', channel));
      builder
        .andWhere('score.timestamp', '>', start)
        .andWhere('score.timestamp', '<', end);
    } else if (channelId !== 'all' && searchString) {
      channels.forEach((channel) => builder.orWhere('channel.channel_name', '=', channel));
      builder
        .andWhere('score.timestamp', '>', start)
        .andWhere('score.timestamp', '<', end)
        .andWhere('uFrom.user_name', 'like', `%${searchString}%`);
    }
    return builder;
  };

  knexInstance('score')
    .select('score.timestamp', 'uTo.user_name as toUser', 'uFrom.user_name as fromUser', 'channel.channel_name', 'score.description')
    .innerJoin('channel', function on() {
      this.on('score.channel_id', '=', 'channel.channel_id');
    })
    .innerJoin('user as uTo', function on() {
      this.on('score.to_user_id', '=', 'uTo.user_id');
    })
    .innerJoin('user as uFrom', function on() {
      this.on('score.from_user_id', '=', 'uFrom.user_id');
    })
    .where((builder) => searchFormBuilder(builder))
    .orderBy('score.timestamp', 'desc')
    .modify((builder) => {
      if (itemsPerPage && page) {
        builder
          .limit(parseInt(String(itemsPerPage), 10))
          .offset((page - 1) * +parseInt(String(itemsPerPage), 10));
      }
    })
    .then((result) => {
      knexInstance('score')
        .select()
        .count('*', { as: 'scores' })
        .innerJoin('channel', function on() {
          this.on('score.channel_id', '=', 'channel.channel_id');
        })
        .innerJoin('user as uTo', function on() {
          this.on('score.to_user_id', '=', 'uTo.user_id');
        })
        .innerJoin('user as uFrom', function on() {
          this.on('score.from_user_id', '=', 'uFrom.user_id');
        })
        .where((builder) => searchFormBuilder(builder))
        .then((resultCount) => {
          resolve({ count: parseInt(String(resultCount[0].scores), 10), results: result });
        })
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    })
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 * Gets the count of daily scores by user.
 */
export const getDailyVotesByUser = (fromUserId: string): Promise<{ daily_votes: number }[]> => new Promise((resolve, reject) => {
  knexInstance('score')
    .select()
    .count<{ daily_votes: number }[]>('score_id')
    .as('daily_votes')
    .whereBetween('timestamp', [moment().startOf('day').format('YYYY-MM-DD HH:mm:ss'), moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')])
    .andWhere('from_user_id', '=', fromUserId)
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 * Gets the count of user scores for day.
 */
export const getDailyUserScore = async (fromUserId: string): Promise<{ operation: boolean, message: string }> => {
  const limit = +votingLimit;
  const scoreCount = await getDailyVotesByUser(fromUserId);
  if (undefined !== scoreCount && limit >= scoreCount[0].daily_votes + 1) {
    return {
      operation: true,
      message: '',
    };
  }

  if (undefined !== scoreCount && limit < scoreCount[0].daily_votes + 1) {
    return {
      operation: false,
      message: 'You have reached your daily voting limit!',
    };
  }

  return {
    operation: true,
    message: '',
  };
};

/**
 *  Gets the Name from 'username' from the db.
 */
export const getName = (username: string): Promise<string> => new Promise((resolve, reject) => {
  knexInstance('user')
    .select<{ user_name: string; }[]>('user_name')
    .where('user_username', '=', username)
    .then((result) => resolve(result[0].user_name))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

/**
 *  Gets the Name from 'username' from the db.
 */
export const getUserId = (username: string): Promise<string> => new Promise((resolve, reject) => {
  knexInstance('user')
    .select<{ user_id: string; }[]>('user_id')
    .where('user_username', '=', username)
    .then((result) => resolve(result[0].user_id))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});

export const getAll = async (username?: string, fromTo?: string, channel?: string, itemsPerPage?: string | number, page?: number, searchString?: string): Promise<{ count: number, feed: KarmaFeed[] }> => {
  if (!username) {
    return {
      count: 0,
      feed: [],
    };
  }

  const userId = await getUserId(username);

  return new Promise((resolve, reject) => {
    const whereUserBuilder = (builder: Knex.QueryBuilder) => {
      if (fromTo === 'from') {
        if (channel === 'all' || channel === undefined) {
          builder.where('to_user_id', '=', userId);
        } else {
          builder.where('to_user_id', '=', userId).andWhere('channel.channel_name', '=', channel);
        }
      } else if (fromTo === 'to') {
        if (channel === 'all' || channel === undefined) {
          builder.where('from_user_id', '=', userId);
        } else {
          builder.where('from_user_id', '=', userId).andWhere('channel.channel_name', '=', channel);
        }
      } else if (fromTo === 'all') {
        if (channel === 'all' || channel === undefined) {
          builder.where('to_user_id', '=', userId).orWhere('from_user_id', '=', userId);
        } else {
          builder.where('to_user_id', '=', userId).orWhere('from_user_id', '=', userId).andWhere('channel.channel_name', '=', channel);
        }
      } else if (channel === 'all' || undefined === channel) {
        builder.where('to_user_id', '=', userId).orWhere('from_user_id', '=', userId);
      } else {
        builder.where('to_user_id', '=', userId).orWhere('from_user_id', '=', userId).andWhere('channel.channel_name', '=', channel);
      }
      return builder;
    };
    const searchBuilder = (builder: Knex.QueryBuilder) => {
      if (searchString) {
        builder
          .whereILike('uFrom.user_name', `%${searchString}%`)
          .orWhereILike('uTo.user_name', `%${searchString}%`);
      }
      return builder;
    };

    knexInstance('score')
      .select('score.timestamp', 'uTo.user_name as toUser', 'uFrom.user_name as fromUser', 'channel.channel_name', 'score.description')
      .innerJoin('channel', function on() {
        this.on('score.channel_id', '=', 'channel.channel_id');
      })
      .innerJoin('user as uTo', function on() {
        this.on('score.to_user_id', '=', 'uTo.user_id');
      })
      .innerJoin('user as uFrom', function on() {
        this.on('score.from_user_id', '=', 'uFrom.user_id');
      })
      .where((builder) => whereUserBuilder(builder))
      .andWhere((builder) => searchBuilder(builder))
      .then((result) => {
        knexInstance('score')
          .select()
          .count({ scores: '*' })
          .as('score')
          .innerJoin('channel', function on() {
            this.on('score.channel_id', '=', 'channel.channel_id');
          })
          .innerJoin('user as uTo', function on() {
            this.on('score.to_user_id', '=', 'uTo.user_id');
          })
          .innerJoin('user as uFrom', function on() {
            this.on('score.from_user_id', '=', 'uFrom.user_id');
          })
          .where((builder) => whereUserBuilder(builder))
          .andWhere((builder) => searchBuilder(builder))
          .modify((builder) => {
            if (itemsPerPage && page) {
              builder
                .limit(parseInt(String(itemsPerPage), 10))
                .offset((page - 1) * +parseInt(String(itemsPerPage), 10));
            }
          })
          .then((resultCount) => {
            resolve({ count: resultCount[0].scores, feed: result });
          })
          .catch((error) => {
            console.error(error);
            reject(error);
          });
      })
      .catch((error) => {
        console.error(error);
        reject(error);
      });
  });
};

/**
 * Retrieves all channels for leaderboard.
 */
export const getAllChannels = (): Promise<any> => new Promise((resolve, reject) => {
  knexInstance('channel')
    .select()
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
    });
});
