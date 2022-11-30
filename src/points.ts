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
import { MysqlError, format, createConnection } from 'mysql';
import type {
  GetLastScore,
  KarmaFeed,
  Score,
  TopScore,
} from './types.js';
import mysqlConfig from './database/mysql-config.js';
import { getChannelName, getUserName } from './slack.js';

const scoresTableName = 'score';
const dbErrorHandler = (err?: MysqlError) => err && console.log(err);
const {
  USER_LIMIT_VOTING_MAX: votingLimit = '300',
  UNDO_TIME_LIMIT: timeLimit = '300',
} = process.env;

/**
 * Retrieves all scores for leaderboard.
 */
const getAllScores = (channelId: string, startDate?: string, endDate?: string): Promise<TopScore[]> => new Promise<TopScore[]>((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  let str: string;
  let start: string;
  let end: string;

  const channels = channelId.split(',');

  let where = 'WHERE (';
  where += channels.map((x) => `\`channel_id\` = '${x}'`).join(' OR ');
  where += ')';

  if (typeof startDate !== 'undefined' || typeof endDate !== 'undefined') {
    start = moment.unix(Number(startDate)).format('YYYY-MM-DD HH:mm:ss');
    end = moment.unix(Number(endDate)).format('YYYY-MM-DD HH:mm:ss');
  } else {
    start = moment(0).format('YYYY-MM-DD HH:mm:ss');
    end = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  }

  let inserts: string[] = [];
  if (channelId === 'all') {
    inserts = [start, end];
    str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` WHERE (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';
  } else if (channelId !== 'all' && channels.length === 1) {
    inserts = [channelId, start, end];
    str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` WHERE `channel_id` = ? AND (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';
  } else if (typeof channelId !== 'undefined') {
    inserts = [start, end];
    str = `SELECT to_user_id as item, COUNT(score_id) as score FROM \`score\` ${where} AND (\`timestamp\` > ? AND \`timestamp\` < ?) GROUP BY to_user_id ORDER BY score DESC`;
  } else {
    str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` GROUP BY to_user_id ORDER BY score DESC';
  }

  const query = format(str, inserts);
  db.query(query, (err, result: TopScore[]) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
});

/**
* Retrieves all scores from the database, ordered from highest to lowest per channel.
*/
export const retrieveTopScores = (channelId: string, startDate?: string, endDate?: string): Promise<TopScore[]> => getAllScores(channelId, startDate, endDate);

/**
 * Inserts or updates score for item.
 */
const insertScore = (toUserId: string, fromUserId: string, channelId: string, description: string | null = null): Promise<any> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const ts = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  const inserts = ['score', 'timestamp', uuid.v4(), ts, toUserId, fromUserId, channelId, description];
  const str = 'INSERT INTO ?? (score_id, ??, to_user_id, from_user_id, channel_id, description) VALUES (?,?,?,?,?,?);';
  const query = format(str, inserts);
  db.query(query, (err, result) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
});

/**
 * Selects score for item.
 */
const getUserScore = (item: string, channelId: string): Promise<{ score: number }[]> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const inserts = ['score', scoresTableName, item, channelId];
  const str = 'SELECT COUNT(score_id) as ?? FROM ?? WHERE to_user_id = ? AND `channel_id` = ?';
  const query = format(str, inserts);
  db.query(query, [scoresTableName, item], (err, result) => {
    if (err) {
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
});

/**
 * Updates the score of an item in the database. If the item doesn't yet exist, it will be inserted
 * into the database with an assumed initial score of 0.
 *
 * This function also sets up the database if it is not already ready, including creating the
 * scores table and activating the Postgres case-insensitive extension.
 */
export const updateScore = async (toUserId: string, fromUserId: string, channelId: string, description: string): Promise<number> => {
  // Connect to the DB, and create a table if it's not yet there.
  await insertScore(toUserId, fromUserId, channelId, description);
  const results = await getUserScore(toUserId, channelId);
  const result = results[0].score;
  console.log(`${toUserId} now on ${result}`);

  return result;
};

/**
 * Gets the last score record for user per channel.
 */
const getLast = (fromUserId: string, channelId: string): Promise<GetLastScore[]> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const timestamp = moment(Date.now()).subtract(timeLimit, 'seconds').format('YYYY-MM-DD HH:mm:ss');
  const str = 'SELECT `score_id`, `timestamp` FROM `score` WHERE `from_user_id` = ? AND `timestamp` >= ? AND `channel_id` = ? ORDER BY `timestamp` DESC LIMIT 1;';
  const inserts = [fromUserId, timestamp, channelId];
  const query = format(str, inserts);
  db.query(query, (err, result: GetLastScore[]) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
});

/**
 * Removes score record from db.
 */
const removeLast = (scoreId: string): Promise<any> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const str = 'DELETE FROM `score` WHERE `score_id` = ?;';
  const inserts = [scoreId];
  const query = format(str, inserts);
  db.query(query, (err: MysqlError, result: unknown) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
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
const getUser = (userId: string): Promise<{ user_id: string }[]> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const str = 'SELECT user_id FROM ?? WHERE user_id = ?';
  const inserts = ['user', userId];
  const query = format(str, inserts);
  db.query(query, (err: MysqlError, result: { user_id: string }[]) => {
    console.log(result);
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
});

/**
 * Inserts user into db.
 */
const insertUser = (userId: string, userName: string): Promise<any> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const lowcaseUserName = userName.split(' ').join('').toLocaleLowerCase();
  const str = 'INSERT INTO ?? (user_id, user_name, user_username, banned_until) VALUES (?, ?, ?, NULL);';
  const inserts = ['user', userId, userName, lowcaseUserName];
  const query = format(str, inserts);
  db.query(query, (err: MysqlError, result: unknown) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
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
const getChannel = (channelId: string): Promise<{ channel_id: string }[]> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const str = 'SELECT channel_id FROM ?? WHERE channel_id = ?;';
  const inserts = ['channel', channelId];
  const query = format(str, inserts);
  db.query(query, (err: MysqlError, result: { channel_id: string }[]) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
});

/**
 * Inserts channel into db.
 */
const insertChannel = (channelId: string, channelName: string): Promise<any> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const str = 'INSERT INTO ?? (channel_id, channel_name) VALUES (?, ?);';
  const inserts = ['channel', channelId, channelName];
  const query = format(str, inserts);
  db.query(query, (err: MysqlError, result: unknown) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
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
  const db = createConnection(mysqlConfig);
  let start;
  let end;

  if (typeof startDate !== 'undefined' || typeof endDate !== 'undefined') {
    start = moment.unix(+startDate).format('YYYY-MM-DD HH:mm:ss');
    end = moment.unix(+endDate).format('YYYY-MM-DD HH:mm:ss');
  } else {
    start = moment(Date.now()).startOf('month').format('YYYY-MM-DD HH:mm:ss');
    end = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  }

  const inserts = [channelId, start, end];
  const str = 'SELECT to_user_id as item, ANY_VALUE(from_user_id) as from_user_id, channel_id, COUNT(score_id) as score FROM `score` WHERE `channel_id` = ? AND (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';

  const query = format(str, inserts);
  db.query(query, (err: MysqlError, result: Score[]) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });
});

/**
 * Retrieves all scores from_user_id
 */
export const getKarmaFeed = (itemsPerPage: string | number, page: number, searchString: string, channelId: string, startDate: string, endDate: string): Promise<{ count: number, results: KarmaFeed[] }> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);

  let start: string;
  let end: string;
  const inserts: string[] = [];
  let searchForm = '';

  const channels = channelId.split(',');

  let where = 'WHERE (';
  where += channels.map((x: string) => `channel.channel_id = '${x}'`).join(' OR ');
  where += ')';

  if (typeof startDate !== 'undefined' || typeof endDate !== 'undefined') {
    start = moment.unix(+startDate).format('YYYY-MM-DD HH:mm:ss');
    end = moment.unix(+endDate).format('YYYY-MM-DD HH:mm:ss');
  } else {
    start = moment(Date.now()).startOf('month').format('YYYY-MM-DD HH:mm:ss');
    end = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  }

  if (channelId === 'all' && !searchString && channels.length === 1) {
    searchForm = `WHERE (score.timestamp > '${start}' AND score.timestamp < '${end}') `;
  } else if (channelId === 'all' && searchString && channels.length === 1) {
    searchForm = `WHERE (score.timestamp > '${start}' AND score.timestamp < '${end}') AND uFrom.user_name LIKE '%${searchString}%' `;
  } else if (channelId !== 'all' && !searchString && channels.length === 1) {
    searchForm = `WHERE channel.channel_id = '${channelId}' AND (score.timestamp > '${start}' AND score.timestamp < '${end}') `;
  } else if (channelId !== 'all' && searchString && channels.length === 1) {
    searchForm = `WHERE channel.channel_id = '${channelId}' AND (score.timestamp > '${start}' AND score.timestamp < '${end}') AND uFrom.user_name LIKE '%${searchString}%' `;
  } else if (channelId !== 'all' && !searchString) {
    searchForm = `${where} AND (score.timestamp > '${start}' AND score.timestamp < '${end}') `;
  } else if (channelId !== 'all' && searchString) {
    searchForm = `${where} AND (score.timestamp > '${start}' AND score.timestamp < '${end}') AND uFrom.user_name LIKE '%${searchString}%' `;
  }

  const countScores = 'SELECT COUNT(*) AS scores '
      + 'FROM score '
      + 'INNER JOIN channel ON score.channel_id = channel.channel_id '
      + 'INNER JOIN user uTo ON score.to_user_id = uTo.user_id '
      + `INNER JOIN user uFrom ON score.from_user_id = uFrom.user_id ${
        searchForm}`;

  const str = 'SELECT score.timestamp, uTo.user_name as toUser, uFrom.user_name as fromUser, channel.channel_name, score.description '
      + 'FROM score '
      + 'INNER JOIN channel ON score.channel_id = channel.channel_id '
      + 'INNER JOIN user uTo ON score.to_user_id = uTo.user_id '
      + `INNER JOIN user uFrom ON score.from_user_id = uFrom.user_id ${
        searchForm
      }ORDER BY score.timestamp DESC LIMIT ${itemsPerPage} OFFSET ${(page - 1) * +itemsPerPage}`;

  const query = format(str, inserts);
  const queryCount = format(countScores, inserts);

  db.query(query, (err: MysqlError, result: KarmaFeed[]) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    }

    db.query(queryCount, (errCount: any, resultCount: { scores: number }[]) => {
      if (errCount) {
        console.log(err.sql);
        reject(errCount);
      }

      resolve({ count: resultCount[0].scores, results: result });

      db.end(dbErrorHandler);
    });
  });
});

/**
 * Gets the count of daily scores by user.
 */
const getDayilyVotesByUser = (fromUserId: string): Promise<{ daily_votes: number }[]> => new Promise((resolve, reject) => {
  const date = moment(Date.now()).format('YYYY-MM-DD');
  const db = createConnection(mysqlConfig);
  const str = 'SELECT COUNT(score_id) as daily_votes from score where DATE(`timestamp`) = ? AND from_user_id = ?;';
  const inserts = [date, fromUserId];
  const query = format(str, inserts);
  db.query(query, (err: MysqlError, result: { daily_votes: number }[]) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
});

/**
 * Gets the count of user scores for day.
 */
export const getDailyUserScore = async (fromUserId: string): Promise<{ operation: boolean, message: string }> => {
  const limit = +votingLimit;
  const scoreCount = await getDayilyVotesByUser(fromUserId);
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
  const db = createConnection(mysqlConfig);
  const str = 'SELECT user_name FROM ?? WHERE user_username = ?';
  const inserts = ['user', username];
  const query = format(str, inserts);
  db.query(query, (err: MysqlError, result: { user_name: string; }[]) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result[0].user_name);
    }
  });

  db.end(dbErrorHandler);
});

/**
 *  Gets the Name from 'username' from the db.
 */
export const getUserId = (username: string): Promise<string> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const str = 'SELECT user_id FROM ?? WHERE user_username = ?';
  const inserts = ['user', username];
  const query = format(str, inserts);
  db.query(query, (err: MysqlError, result: { user_id: string; }[]) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result[0].user_id);
    }
  });

  db.end(dbErrorHandler);
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
    const db = createConnection(mysqlConfig);

    let whereUser: string;
    let paginationParams = '';

    if (fromTo === 'from') {
      if (channel === 'all' || undefined === channel) {
        whereUser = `WHERE to_user_id = '${userId}'`;
      } else {
        whereUser = `WHERE to_user_id = '${userId}' AND channel.channel_id = '${channel}'`;
      }
    } else if (fromTo === 'to') {
      if (channel === 'all' || undefined === channel) {
        whereUser = `WHERE from_user_id = '${userId}'`;
      } else {
        whereUser = `WHERE from_user_id = '${userId}' AND channel.channel_id = '${channel}'`;
      }
    } else if (fromTo === 'all') {
      if (channel === 'all' || undefined === channel) {
        whereUser = `WHERE (to_user_id = '${userId}' OR from_user_id = '${userId}')`;
      } else {
        whereUser = `WHERE (to_user_id = '${userId}' OR from_user_id = '${userId}') AND channel.channel_id = '${channel}'`;
      }
    } else if (channel === 'all' || undefined === channel) {
      whereUser = `WHERE (to_user_id = '${userId}' OR from_user_id = '${userId}')`;
    } else {
      whereUser = `WHERE (to_user_id = '${userId}' OR from_user_id = '${userId}') AND channel.channel_id = '${channel}'`;
    }

    if (searchString) {
      whereUser += ` AND (uFrom.user_name LIKE '%${searchString}%' OR uTo.user_name LIKE '%${searchString}%') `;
    }
    // OR uTo.user_name LIKE \'%' + searchString + '%\')

    if (itemsPerPage && page) {
      paginationParams = `LIMIT ${itemsPerPage} OFFSET ${(page - 1) * +itemsPerPage}`;
    }

    const countScores = 'SELECT COUNT(*) AS scores '
      + 'FROM score '
      + 'INNER JOIN channel ON score.channel_id = channel.channel_id '
      + 'INNER JOIN user uTo ON score.to_user_id = uTo.user_id '
      + `INNER JOIN user uFrom ON score.from_user_id = uFrom.user_id ${
        whereUser}`;

    const str = 'SELECT score.timestamp, uTo.user_name as toUser, uFrom.user_name as fromUser, channel.channel_name, score.description '
      + 'FROM score '
      + 'INNER JOIN channel ON score.channel_id = channel.channel_id '
      + 'INNER JOIN user uTo ON score.to_user_id = uTo.user_id '
      + `INNER JOIN user uFrom ON score.from_user_id = uFrom.user_id ${
        whereUser
      }ORDER BY score.timestamp DESC ${
        paginationParams}`;

    const query = format(str, []);
    const queryCount = format(countScores, []);

    db.query(query, (err: MysqlError, result: KarmaFeed[]) => {
      if (err) {
        console.log(err.sql);
        reject(err);
      }

      db.query(queryCount, (errCount: any, resultCount: { scores: number; }[]) => {
        if (errCount) {
          console.log(err.sql);
          reject(errCount);
        }

        resolve({ count: resultCount[0].scores, feed: result });
        db.end(dbErrorHandler);
      });
    });
  });
};

/**
 * Retrieves all channels for leaderboard.
 */
export const getAllChannels = (): Promise<any> => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const str = 'SELECT * FROM channel';

  const query = format(str, []);
  db.query(query, (err: MysqlError, result: unknown) => {
    if (err) {
      console.log(err.sql);
      reject(err);
    } else {
      resolve(result);
    }
  });

  db.end(dbErrorHandler);
});
