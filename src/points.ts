/**
 * All the stuff that handles the giving, taking away, or otherwise querying of points.
 *
 * NOTE: As the functions here pretty much deal exclusively with the database, they generally
 *       aren't unit tested, as that would require anyone who runs the tests to also have a Postgres
 *       server. Instead, the functions in this file are well covered via the integration and
 *       end-to-end tests.
 */

 'use strict';

 import mysql, { ConnectionConfig } from 'mysql';
 import uuid from 'uuid';
 import { getChannelName, getUserName } from './slack';
 const scoresTableName = 'score';
 import moment from 'moment';
 
 
 const mysqlConfig: ConnectionConfig = {
   host: process.env.DATABASE_HOST,
   port: process.env.DATABASE_PORT,
   user: process.env.DATABASE_USER,
   password: process.env.DATABASE_PASSWORD,
   database: process.env.DATABASE_NAME
 };
 
 const dbErrorHandler = (err: any) => err && console.log(err);
 const votingLimit = process.env.USER_LIMIT_VOTING_MAX;
 const timeLimit = process.env.UNDO_TIME_LIMIT;
 
 
 
 /**
  * Retrieves all scores from the database, ordered from highest to lowest per channel.
  */
 
 export const retrieveTopScores = async (startDate: Date, endDate: Date, channelId: string): Promise<any> => {
   return await getAllScores(startDate, endDate, channelId)
 };
 
 /**
  * Updates the score of an item in the database. If the item doesn't yet exist, it will be inserted
  * into the database with an assumed initial score of 0.
  *
  * This function also sets up the database if it is not already ready, including creating the
  * scores table and activating the Postgres case-insensitive extension.
  */
 export const updateScore = async (toUserId: string, fromUserId: string, channelId: string, description: string): Promise<any> => {
   // Connect to the DB, and create a table if it's not yet there.
   try {
      await insertScore(toUserId, fromUserId, channelId, description);
      const results = await getUserScore(toUserId, channelId)
      const result = results[0].score;
      console.log(toUserId + ' now on ' + result);  
      return result;
   } catch(err) {
      setImmediate(() => {
        throw err;
      })
   }
 }; // UpdateScore.
 /**
  *
  * Undoes last score.
  */
 const undoScore = async (fromUserId: string, toUserId: string, channelId: string): Promise<any> => {
  try {
    let last;
    const results: {score_id: string}[] = await getLast(fromUserId, channelId)

    if ('undefined' !== typeof results[0]) {
      last = results[0].score_id;
    }
    // Returning undefined as time run out.
    if ('undefined' === typeof last) {
      return last;
    }
    await removeLast(last);

    const scoreResults = await getUserScore(toUserId, channelId);
    const result = scoreResults[0].score;

    console.log(toUserId + ' now on ' + result);
    return result;
  } catch(err) {
    setImmediate(() => {
      throw err;
    })
  }
 };
 
 /**
  * Gets the user score.
  */
 export const getNewScore = async (toUserId: string, channelId: string): Promise<any> => {
    try {
      const results = await getUserScore(toUserId, channelId);
      const result = results[0].score;
      console.log(toUserId + ' now on ' + result);
      return result;
    } catch(err) {
    setImmediate(() => {
      throw err;
    })
  }
 };
 
 
 export const checkUser = async (userId: string): Promise<string> => {
  try {
    const userName = await getUserName(userId);
    const users = await getUser(userId);
    const user = typeof users[0] === 'undefined' ? null : userId;

    if (user === null) {
      await insertUser(userId, userName);
    }
    
    return userId
  } catch (err) {
    setImmediate(() => {
        throw err;
    })
  }
 };
 
 /**
  * Checks if channel exists in the db.
  */
 export const checkChannel = async (channelId: string): Promise<string> => {
  try {
    const channelName = await getChannelName(channelId);
    const channels = await getChannel(channelId);
    const channel = typeof channels[0] === 'undefined' ? null : channelId

    if (null === channel) {
      await insertChannel(channelId, channelName);
    }

    return channelId;
  } catch(err) {
    setImmediate(() => {
      throw err;
    })
  }
 };
 
 /**
  * Selects score for item.
  */
 const getUserScore = (item: string, channelId: string): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     const inserts = ['score', scoresTableName, item, channelId];
     const str = 'SELECT COUNT(score_id) as ?? FROM ?? WHERE to_user_id = ? AND `channel_id` = ?';
     const query = mysql.format(str, inserts);
     db.query(query, [scoresTableName, item], (err: any, result: unknown) => {
       if (err) {
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  * Retrieves all scores for leaderboard.
  */
 const getAllScores = (startDate: Date, endDate: Date, channelId: string): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     let str = '';
     let start;
     let end;
     let inserts;
 
     let channels = channelId.split(',');
 
     let where_str = 'WHERE (';
     where_str += channels.map((x: string) => { return "`channel_id` = '" + x + "'" }).join(" OR ");
     where_str += ')';
 
     if ('undefined' !== typeof startDate || 'undefined' !== typeof endDate) {
       start = moment.unix(startDate).format('YYYY-MM-DD HH:mm:ss');
       end = moment.unix(endDate).format('YYYY-MM-DD HH:mm:ss');
     } else {
       start = moment(0).format('YYYY-MM-DD HH:mm:ss');
       end = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
     }
 
 
     if ('all' === channelId) {
       inserts = [start, end];
       str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` WHERE (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';
     } else if ('all' !== channelId && channels.length === 1) {
       inserts = [channelId, start, end];
       str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` WHERE `channel_id` = ? AND (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';
     } else if ('undefined' !== typeof channelId) {
       inserts = [start, end];
       str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` ' + where_str + ' AND (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';
     } else {
       str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` GROUP BY to_user_id ORDER BY score DESC';
     }
 
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  * Retrieves all scores from_user_id.
  */
 export const getAllScoresFromUser = (startDate: string, endDate: Date, channelId: string): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     let str = '';
     let start;
     let end;
 
     if ('undefined' !== typeof startDate || 'undefined' !== typeof endDate) {
       start = moment.unix(startDate).format('YYYY-MM-DD HH:mm:ss');
       end = moment.unix(endDate).format('YYYY-MM-DD HH:mm:ss');
     } else {
       start = moment(Date.now()).startOf('month').format('YYYY-MM-DD HH:mm:ss');
       end = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
     }
 
     const inserts = [channelId, start, end];
 
     str = 'SELECT to_user_id as item, ANY_VALUE(from_user_id) as from_user_id, channel_id, COUNT(score_id) as score FROM `score` WHERE `channel_id` = ? AND (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';
 
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
   });
 }
 
 
 /**
  * Retrieves all scores from_user_id
  */
 export const getKarmaFeed = (itemsPerPage: string | number, page: number, searchString: string, channelId: string, startDate: Date, endDate: Date): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
 
     let start;
     let end;
     let inserts;
     let searchForm = '';
 
     let channels = channelId.split(',');
 
     let where_str = 'WHERE (';
     where_str += channels.map((x: string) => { return "channel.channel_id = '" + x + "'" }).join(" OR ");
     where_str += ')';
 
     if ('undefined' !== typeof startDate || 'undefined' !== typeof endDate) {
       start = moment.unix(startDate).format('YYYY-MM-DD HH:mm:ss');
       end = moment.unix(endDate).format('YYYY-MM-DD HH:mm:ss');
     } else {
       start = moment(Date.now()).startOf('month').format('YYYY-MM-DD HH:mm:ss');
       end = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
     }
 
     if ('all' === channelId && !searchString && channels.length === 1) {
       searchForm = 'WHERE (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') ';
     } else if ('all' === channelId && searchString && channels.length === 1) {
       searchForm = 'WHERE (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') AND uFrom.user_name LIKE \'%' + searchString + '%\' ';
     } else if ('all' !== channelId && !searchString && channels.length === 1) {
       searchForm = 'WHERE channel.channel_id = \'' + channelId + '\' AND (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') ';
     } else if ('all' !== channelId && searchString && channels.length === 1) {
       searchForm = 'WHERE channel.channel_id = \'' + channelId + '\' AND (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') AND uFrom.user_name LIKE \'%' + searchString + '%\' ';
     } else if ('all' !== channelId && !searchString) {
       searchForm = where_str + ' AND (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') ';
     } else if ('all' !== channelId && searchString) {
       searchForm = where_str + ' AND (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') AND uFrom.user_name LIKE \'%' + searchString + '%\' ';
     }
 
     let countScores = 'SELECT COUNT(*) AS scores ' +
       'FROM score ' +
       'INNER JOIN channel ON score.channel_id = channel.channel_id ' +
       'INNER JOIN user uTo ON score.to_user_id = uTo.user_id ' +
       'INNER JOIN user uFrom ON score.from_user_id = uFrom.user_id ' +
       searchForm;
 
     let str = 'SELECT score.timestamp, uTo.user_name as toUser, uFrom.user_name as fromUser, channel.channel_name, score.description ' +
       'FROM score ' +
       'INNER JOIN channel ON score.channel_id = channel.channel_id ' +
       'INNER JOIN user uTo ON score.to_user_id = uTo.user_id ' +
       'INNER JOIN user uFrom ON score.from_user_id = uFrom.user_id ' +
       searchForm +
       'ORDER BY score.timestamp DESC LIMIT ' + itemsPerPage + ' OFFSET ' + (page - 1) * itemsPerPage;
 
     const query = mysql.format(str);
     const queryCount = mysql.format(countScores);
 
     const queryResult = db.query(query, (err: any, result: any) => {
 
       if (err) {
         console.log(db.sql);
         reject(err);
       }
 
       db.query(queryCount, (errCount: any, resultCount: { scores: any; }[]) => {
 
         if (errCount) {
           console.log(db.sql);
           reject(errCount);
         }
 
         resolve({ count: resultCount[0].scores, results: result });
 
         db.end(dbErrorHandler);
 
       });
 
     });
 
   });
 }
 
 
 /**
  * Gets the count of user scores for day.
  */
 export const getDailyUserScore = async (fromUserId: string): Promise<{ operation: boolean, message: string | null}> => {
   const limit = votingLimit;
   const scoreCount = await getDayilyVotesByUser(fromUserId);
   if ('undefined' !== scoreCount && limit >= scoreCount[0].daily_votes + 1) {
     return {
       operation: true,
       message: null
     };
   } else if ('undefined' !== scoreCount && limit < scoreCount[0].daily_votes + 1) {
     return {
       operation: false,
       message: 'You have reached your daily voting limit!'
     };
   } else {
     return {
       operation: true,
       message: null
     };
   }
 };
 
 /**
  * Inserts or updates score for item.
  */
 const insertScore = (toUserId: string, fromUserId: string, channelId: string, description: string = null): Promise<any> => {
 
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     // eslint-disable-next-line no-magic-numbers
     const ts = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
     const inserts = ['score', 'timestamp', uuid.v4(), ts, toUserId, fromUserId, channelId, description];
     const str = 'INSERT INTO ?? (score_id, ??, to_user_id, from_user_id, channel_id, description) VALUES (?,?,?,?,?,?);';
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  *  Gets the user from the db.
  */
 const getUser = (userId: string): Promise<{ user_id: string }[]> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     const str = 'SELECT user_id FROM ?? WHERE user_id = ?';
     const inserts = ['user', userId];
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: { user_id: string }[]) => {
       console.log(result)
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  *  Gets the Name from 'username' from the db.
  */
 export const getName = (username: string): Promise<any> {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     const str = 'SELECT user_name FROM ?? WHERE user_username = ?';
     const inserts = ['user', username];
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: { user_name: unknown; }[]) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result[0].user_name);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  *  Gets the Name from 'username' from the db.
  */
 export const getUserId = (username: string): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     const str = 'SELECT user_id FROM ?? WHERE user_username = ?';
     const inserts = ['user', username];
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: { user_id: unknown; }[]) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result[0].user_id);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 export const getAll = async (username?: string, fromTo?: string, channel?: string, itemsPerPage?: string | number, page?: number, searchString?: string) => {
 
   const userId = await getUserId(username);
 
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
 
     let whereUser = '';
     let paginationParams = '';
 
     if (fromTo === 'from') {
       if (channel === 'all' || undefined === channel) {
         whereUser = 'WHERE to_user_id = \'' + userId + '\'';
       } else {
         whereUser = 'WHERE to_user_id = \'' + userId + '\' AND channel.channel_id = \'' + channel + '\'';
       }
     } else if (fromTo === 'to') {
       if (channel === 'all' || undefined === channel) {
         whereUser = 'WHERE from_user_id = \'' + userId + '\'';
       } else {
         whereUser = 'WHERE from_user_id = \'' + userId + '\' AND channel.channel_id = \'' + channel + '\'';
       }
     } else if (fromTo === 'all') {
       if (channel === 'all' || undefined === channel) {
         whereUser = 'WHERE (to_user_id = \'' + userId + '\' OR from_user_id = \'' + userId + '\')';
       } else {
         whereUser = 'WHERE (to_user_id = \'' + userId + '\' OR from_user_id = \'' + userId + '\') AND channel.channel_id = \'' + channel + '\'';
       }
     } else {
       if (channel === 'all' || undefined === channel) {
         whereUser = 'WHERE (to_user_id = \'' + userId + '\' OR from_user_id = \'' + userId + '\')';
       } else {
         whereUser = 'WHERE (to_user_id = \'' + userId + '\' OR from_user_id = \'' + userId + '\') AND channel.channel_id = \'' + channel + '\'';
       }
     }
 
     if (searchString) {
       whereUser += ' AND (uFrom.user_name LIKE \'%' + searchString + '%\' OR uTo.user_name LIKE \'%' + searchString + '%\') ';
     }
     // OR uTo.user_name LIKE \'%' + searchString + '%\')
 
     if (itemsPerPage && page) {
       paginationParams = 'LIMIT ' + itemsPerPage + ' OFFSET ' + (page - 1) * itemsPerPage;
     }
 
     const countScores = 'SELECT COUNT(*) AS scores ' +
       'FROM score ' +
       'INNER JOIN channel ON score.channel_id = channel.channel_id ' +
       'INNER JOIN user uTo ON score.to_user_id = uTo.user_id ' +
       'INNER JOIN user uFrom ON score.from_user_id = uFrom.user_id ' +
       whereUser;
 
     const str = 'SELECT score.timestamp, uTo.user_name as toUser, uFrom.user_name as fromUser, channel.channel_name, score.description ' +
       'FROM score ' +
       'INNER JOIN channel ON score.channel_id = channel.channel_id ' +
       'INNER JOIN user uTo ON score.to_user_id = uTo.user_id ' +
       'INNER JOIN user uFrom ON score.from_user_id = uFrom.user_id ' +
       whereUser +
       'ORDER BY score.timestamp DESC ' +
       paginationParams;
 
     const query = mysql.format(str);
     const queryCount = mysql.format(countScores);
 
     const queryResult = db.query(query, (err: any, result: any) => {
 
       if (err) {
         console.log(db.sql);
         reject(err);
       }
 
       db.query(queryCount, (errCount: any, resultCount: { scores: any; }[]) => {
 
         if (errCount) {
           console.log(db.sql);
           reject(errCount);
         }
 
         resolve({ count: resultCount[0].scores, feed: result });
         db.end(dbErrorHandler);
 
       });
 
     });
 
   });
 }
 
 /**
  * Inserts user into db.
  */
 const insertUser = (userId: string, userName: string): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     const lowcaseUserName = userName.split(" ").join("").toLocaleLowerCase();
     const str = 'INSERT INTO ?? (user_id, user_name, user_username, banned_until) VALUES (?, ?, ?, NULL);';
     const inserts = ['user', userId, userName, lowcaseUserName];
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  * Gets the channel from db.
  */
 const getChannel = (channelId: string): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     const str = 'SELECT channel_id FROM ?? WHERE channel_id = ?;';
     const inserts = ['channel', channelId];
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  * Inserts channel into db.
  */
 const insertChannel = (channelId: string, channelName: string): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     const str = 'INSERT INTO ?? (channel_id, channel_name) VALUES (?, ?);';
     const inserts = ['channel', channelId, channelName];
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  * Gets the last score record for user per channel.
  */
 const getLast = (fromUserId: string, channelId: string): Promise<any> => {
   return new Promise((resolve, reject) => {
   const db = mysql.createConnection(mysqlConfig);
   const timestamp = moment(Date.now()).subtract(timeLimit, 'seconds').format('YYYY-MM-DD HH:mm:ss');
     const str = 'SELECT `score_id`, `timestamp` FROM `score` WHERE `from_user_id` = ? AND `timestamp` >= ? AND `channel_id` = ? ORDER BY `timestamp` DESC LIMIT 1;';
     const inserts = [fromUserId, timestamp, channelId];
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  * Removes score record from db.
  */
 const removeLast = (scoreId: string): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     const str = 'DELETE FROM `score` WHERE `score_id` = ?;';
     const inserts = [scoreId];
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  * Gets the count of daily scores by user.
  */
 const getDayilyVotesByUser = (fromUserId: string): Promise<any> => {
 
   return new Promise((resolve, reject) => {
     const date = moment(Date.now()).format('YYYY-MM-DD');
     const db = mysql.createConnection(mysqlConfig);
     const str = 'SELECT COUNT(score_id) as daily_votes from score where DATE(`timestamp`) = ? AND from_user_id = ?;';
     const inserts = [date, fromUserId];
     const query = mysql.format(str, inserts);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }
 
 /**
  * Retrieves all channels for leaderboard.
  */
 export const getAllChannels = (): Promise<any> => {
   return new Promise((resolve, reject) => {
     const db = mysql.createConnection(mysqlConfig);
     let str = 'SELECT * FROM channel';
 
     const query = mysql.format(str);
     db.query(query, (err: any, result: unknown) => {
       if (err) {
         console.log(db.sql);
         reject(err);
       } else {
         resolve(result);
       }
     });
 
     db.end(dbErrorHandler);
 
   });
 }