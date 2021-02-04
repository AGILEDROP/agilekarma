/* eslint-disable max-len */
/**
 * All the stuff that handles the giving, taking away, or otherwise querying of points.
 *
 * NOTE: As the functions here pretty much deal exclusively with the database, they generally
 *       aren't unit tested, as that would require anyone who runs the tests to also have a Postgres
 *       server. Instead, the functions in this file are well covered via the integration and
 *       end-to-end tests.
 *
 * @author Tim Malone <tdmalone@gmail.com>
 */

'use strict';

const mysql = require( 'mysql' );
const uuid = require ( 'uuid' );
const slack = require( './slack' );
const scoresTableName = 'score';
const moment = require ( 'moment' );

/* eslint-disable no-process-env */
/* eslint-enable no-process-env */
const mysqlConfig = {
  // eslint-disable-next-line no-process-env
  host: process.env.DATABASE_HOST,
  // eslint-disable-next-line no-process-env
  port: process.env.DATABASE_PORT,
  // eslint-disable-next-line no-process-env
  user: process.env.DATABASE_USER,
  // eslint-disable-next-line no-process-env
  password: process.env.DATABASE_PASSWORD,
  // eslint-disable-next-line no-process-env
  database: process.env.DATABASE_NAME
};

const dbErrorHandler = err => err && console.log(err);
const votingLimit = process.env.USER_LIMIT_VOTING_MAX;
const timeLimit = process.env.UNDO_TIME_LIMIT;

/**
 * Retrieves all scores from the database, ordered from highest to lowest per channel.
 *
 * @param {string} channelId
 *   Slack channel id.
 * TODO: Add further smarts to retrieve only a limited number of scores, to avoid having to query
 *       everything. Note that this isn't just LIMIT, because we'll need to apply the limit
 *       separately to both users (/U[A-Z0-9]{8}/) and things (everything else) & return both sets.
 *
 * @return {array} An array of entries, each an object containing 'item' (string) and 'score'
 *                (integer) properties.
 */
const retrieveTopScores = async( startDate, endDate, channelId ) => {
  let scores = '';
  await getAllScores( startDate, endDate, channelId ).then( function( result ) {
    scores = result;
  });
  return scores;

};

/**
 * Updates the score of an item in the database. If the item doesn't yet exist, it will be inserted
 * into the database with an assumed initial score of 0.
 *
 * This function also sets up the database if it is not already ready, including creating the
 * scores table and activating the Postgres case-insensitive extension.
 *
 *                           operated on.
 * @return {int}
 *   The item's new score after the update has been applied.
 * @param {string} toUserId
 *   User that receives score.
 * @param {string} fromUserId
 *   User that gives score.
 * @param {string} channelId
 *   In which channel user gets score.
 * @param {string} description
 *   Optional description. To be implemented.
 */
const updateScore = async( toUserId, fromUserId, channelId, description ) => {

  // Connect to the DB, and create a table if it's not yet there.
  await insertScore( toUserId, fromUserId, channelId, description );
  let finalResult = '';
  await getUserScore( toUserId, channelId ).then( function( result ) {
    finalResult = result[0].score;
  }).catch( ( err ) => setImmediate( () => {
    throw err;
  })
  );
  console.log( toUserId + ' now on ' + finalResult );
  return finalResult;

}; // UpdateScore.
/**
 *
 * Undoes last score.
 *
 * @param {string} fromUserId
 *   For which user to remove score.
 * @param {string} toUserId
 *   Sent by who.
 * @param {string} channelId
 *   on which channel.
 * @returns {Promise<string|*>}
 *   Returned promise.
 */
const undoScore = async( fromUserId, toUserId, channelId ) => {
  let last;
  await getLast( fromUserId, channelId ).then(
    function( result ) {
      if ( 'undefined' !== typeof result[0]) {
        last = result[0].score_id;
      }
    }
  ).catch( ( err ) => setImmediate( () => {
    throw err;
  })
  );

  // Returning undefined as time run out.
  if ( 'undefined' === typeof last ) {
    return last;
  }
  await removeLast( last ).catch( ( err ) => setImmediate( () => {
    throw err;
  })
  );
  let finalResult = '';
  await getUserScore( toUserId, channelId ).then( function( result ) {
    finalResult = result[0].score;
  }).catch( ( err ) => setImmediate( () => {
    throw err;
  })
  );
  console.log( toUserId + ' now on ' + finalResult );
  return finalResult;

};

/**
 * Gets the user score.
 *
 * @param {string} toUserId
 *   Slack user id.
 * @param {string} channelId
 *   Slack channel id.
 * @returns {Promise}
 *   Returned promise.
 */
const getNewScore = async( toUserId, channelId ) => {
  let finalResult = '';
  await getUserScore( toUserId, channelId ).then( function( result ) {
    finalResult = result[0].score;
  }).catch( ( err ) => setImmediate( () => {
    throw err;
  })
  );
  console.log( toUserId + ' now on ' + finalResult );
  return finalResult;
};

/**
 * Checks if user exists in the db.
 *
 * @param {string} userId
 *   Slack userid.
 * @returns {Promise}
 *   Returned promise.
 */
const checkUser = async( userId ) => {
  let user = '';
  const userName = await slack.getUserName( userId );
  await getUser( userId ).then( function( result ) {
    user = result[0];
    if ( 'undefined' === typeof user ) {
      user = null;
    } else {
      user = userId;
    }
  }).catch( ( err ) => setImmediate( () => {
    throw err;
  })
  );
  if ( null === user ) {
    await insertUser( userId, userName );
  }

  return userId;
};

/**
 * Checks if channel exists in the db.
 *
 * @param {string} channelId
 *   Slack channelId
 * @returns {Promise}
 *   Returned promise.
 */
const checkChannel = async( channelId ) => {
  let channel = '';
  const channelName = await slack.getChannelName( channelId );
  await getChannel( channelId ).then( function( result ) {
    channel = result[0];
    if ( 'undefined' === typeof channel ) {
      channel = null;
    } else {
      channel = channelId;
    }
  }).catch( ( err ) => setImmediate( () => {
    throw err;
  })
  );
  if ( null === channel ) {
    await insertChannel( channelId, channelName );
  }
  return channelId;
};

/**
 * Selects score for item.
 *
 * @param {string} item
 *   Item to get the score for.
 * @param {string} channelId channel id.
 * @returns {Promise}
 *   The promise.
 */
function getUserScore( item, channelId ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const inserts = [ 'score', scoresTableName, item, channelId ];
    const str = 'SELECT COUNT(score_id) as ?? FROM ?? WHERE to_user_id = ? AND `channel_id` = ?';
    const query = mysql.format( str, inserts );
    db.query( query, [ scoresTableName, item ], function( err, result ) {
      if ( err ) {
        reject( err );
      } else {
        resolve( result );
      }
    });
    
    db.end(dbErrorHandler);

  });
}

/**
 * Retrieves all scores for leaderboard.
 *
 * @param {string} channelId
 *   Slack channel id. If undefined it will return score for all channels.
 * @returns {Promise}
 *   The promise.
 */
function getAllScores( startDate, endDate, channelId ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    let str = '';
    let start;
    let end;
    let inserts;
    
    let channels = channelId.split(',');

    let where_str = 'WHERE (';
    where_str += channels.map(x => { return "`channel_id` = '" + x + "'" }).join(" OR ");
    where_str += ')';

    if ( 'undefined' !== typeof startDate || 'undefined' !== typeof endDate) {
      start = moment.unix( startDate ).format( 'YYYY-MM-DD HH:mm:ss' );
      end = moment.unix( endDate ).format( 'YYYY-MM-DD HH:mm:ss' );
    } else {
      start = moment( 0 ).format( 'YYYY-MM-DD HH:mm:ss' );
      end = moment( Date.now() ).format( 'YYYY-MM-DD HH:mm:ss' );
    }


    if ( 'all' === channelId ) {
      inserts = [ start, end ];
      str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` WHERE (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';
    } else if ( 'all' !== channelId && channels.length === 1) {
      inserts = [ channelId, start, end ];
      str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` WHERE `channel_id` = ? AND (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';
    } else if ( 'undefined' !== typeof channelId ) {
      inserts = [ start, end ];
      str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` ' + where_str + ' AND (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';
    } else {
      str = 'SELECT to_user_id as item, COUNT(score_id) as score FROM `score` GROUP BY to_user_id ORDER BY score DESC';
    }

    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 * Retrieves all scores from_user_id
 *
 * @param {string} channelId
 *   Slack channel id. If undefined it will return score for all channels.
 * @returns {Promise}
 *   The promise.
 */
function getAllScoresFromUser( startDate, endDate, channelId ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    let str = '';
    let start;
    let end;

    if ( 'undefined' !== typeof startDate || 'undefined' !== typeof endDate) {
      start = moment.unix( startDate ).format( 'YYYY-MM-DD HH:mm:ss' );
      end = moment.unix( endDate ).format( 'YYYY-MM-DD HH:mm:ss' );
    } else {
      start = moment( Date.now() ).startOf('month').format( 'YYYY-MM-DD HH:mm:ss' );
      end = moment( Date.now() ).format( 'YYYY-MM-DD HH:mm:ss' );
    }

    const inserts = [ channelId, start, end ];

    // eslint-disable-next-line no-negated-condition
    str = 'SELECT to_user_id as item, ANY_VALUE(from_user_id) as from_user_id, channel_id, COUNT(score_id) as score FROM `score` WHERE `channel_id` = ? AND (`timestamp` > ? AND `timestamp` < ?) GROUP BY to_user_id ORDER BY score DESC';

    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });
  });
}


/**
 * Retrieves all scores from_user_id
 *
 * @param {string} channelId
 *   Slack channel id. If undefined it will return score for all channels.
 * @returns {Promise}
 *   The promise.
 */
const getKarmaFeed = (itemsPerPage, page, searchString, channelId, startDate, endDate) => {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );

    let start;
    let end;
    let inserts;
    let searchForm = '';

    let channels = channelId.split(',');

    let where_str = 'WHERE (';
    where_str += channels.map(x => { return "channel.channel_id = '" + x + "'" }).join(" OR ");
    where_str += ')';

    if ( 'undefined' !== typeof startDate || 'undefined' !== typeof endDate) {
      start = moment.unix( startDate ).format( 'YYYY-MM-DD HH:mm:ss' );
      end = moment.unix( endDate ).format( 'YYYY-MM-DD HH:mm:ss' );
    } else {
      start = moment( Date.now() ).startOf('month').format( 'YYYY-MM-DD HH:mm:ss' );
      end = moment( Date.now() ).format( 'YYYY-MM-DD HH:mm:ss' );
    }

    if ( 'all' === channelId && !searchString && channels.length === 1 ) {
      searchForm = 'WHERE (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') ';
    } else if ( 'all' === channelId && searchString && channels.length === 1 ) {
      searchForm = 'WHERE (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') AND uFrom.user_name LIKE \'%' + searchString + '%\' ';
    } else if ( 'all' !== channelId && !searchString && channels.length === 1 ) {
      searchForm = 'WHERE channel.channel_id = \'' + channelId + '\' AND (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') ';
    } else if ( 'all' !== channelId && searchString && channels.length === 1 ) {
      searchForm = 'WHERE channel.channel_id = \'' + channelId + '\' AND (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') AND uFrom.user_name LIKE \'%' + searchString + '%\' ';
    } else if ( 'all' !== channelId && !searchString) {
      searchForm = where_str + ' AND (score.timestamp > \'' + start + '\' AND score.timestamp < \'' + end + '\') ';
    } else if ( 'all' !== channelId && searchString) {
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

    const query = mysql.format( str );
    const queryCount = mysql.format( countScores );

    const queryResult = db.query( query, function( err, result ) {

      if ( err ) {
        console.log( db.sql );
        reject( err );
      }

      db.query( queryCount, function( errCount, resultCount ) {

        if ( errCount ) {
          console.log( db.sql );
          reject( errCount );
        }

        resolve({count: resultCount[0].scores, results: result});

        db.end(dbErrorHandler);

      });

    });

  });
}


/**
 * Gets the count of user scores for day.
 *
 * @param {string} fromUserId
 *   Voting user  slack id.
 * @returns {Promise<{message: string, operation: boolean}|{message: null, operation: boolean}>}
 *   Returns promise with message and operation.
 */
const getDailyUserScore = async( fromUserId ) => {
  const limit = votingLimit;
  let scoreCount;
  await getDayilyVotesByUser( fromUserId ).then( function( result ) {
    scoreCount = result;
  });
  if ( 'undefined' !== scoreCount && limit >= scoreCount[0].daily_votes + 1 ) {
    return {
      operation: true,
      message: null
    };
  } else if ( 'undefined' !== scoreCount && limit < scoreCount[0].daily_votes + 1 ) {
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
 *
 * @param {string}  toUserId
 *   Who to score.
 * @param {string}  fromUserId
 *    From whom.
 * @param {string}  channelId
 *    On which channel.
 * @param {string}  description
 *    Optional description.
 * @returns {Promise}
 *   The promise.
 */
function insertScore( toUserId, fromUserId, channelId, description = null ) {

  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    // eslint-disable-next-line no-magic-numbers
    const ts = moment( Date.now() ).format( 'YYYY-MM-DD HH:mm:ss' );
    const inserts = [ 'score', 'timestamp', uuid.v4(), ts, toUserId, fromUserId, channelId, description ];
    const str = 'INSERT INTO ?? (score_id, ??, to_user_id, from_user_id, channel_id, description) VALUES (?,?,?,?,?,?);';
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 *  Gets the user from the db.
 *
 * @param {string} userId
 *   Slack user id.
 * @returns {Promise}
 *  Returned promise.
 */
function getUser( userId ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const str = 'SELECT user_id FROM ?? WHERE user_id = ?';
    const inserts = [ 'user', userId ];
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 *  Gets the Name from 'username' from the db.
 *
 * @param {string} username
 *   Slack user id.
 * @returns {Promise}
 *  Returned promise.
 */
function getName( username ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const str = 'SELECT user_name FROM ?? WHERE user_username = ?';
    const inserts = [ 'user', username ];
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result[0].user_name );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 *  Gets the Name from 'username' from the db.
 *
 * @param {string} username
 *   Slack user id.
 * @returns {Promise}
 *  Returned promise.
 */
function getUserId( username ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const str = 'SELECT user_id FROM ?? WHERE user_username = ?';
    const inserts = [ 'user', username ];
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result[0].user_id );
      }
    });

    db.end(dbErrorHandler);

  });
}

const getAll = async( username, fromTo, channel, itemsPerPage, page, searchString ) => {

  const userId = await getUserId( username );

  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );

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

    const query = mysql.format( str );
    const queryCount = mysql.format( countScores );

    const queryResult = db.query( query, function( err, result ) {

      if ( err ) {
        console.log( db.sql );
        reject( err );
      }

      db.query( queryCount, function( errCount, resultCount ) {
  
        if ( errCount ) {
          console.log( db.sql );
          reject( errCount );
        }
        
        resolve({count: resultCount[0].scores, feed: result});
        db.end(dbErrorHandler);

      });

    });

  });
}

/**
 *
 * Inserts user into db.
 *
 * @param {string} userId
 *   Slack user id.
 * @returns {Promise}
 *   Returned promise.
 */
function insertUser( userId, userName ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const lowcaseUserName = userName.split(" ").join("").toLocaleLowerCase();
    const str = 'INSERT INTO ?? (user_id, user_name, user_username, banned_until) VALUES (?, ?, ?, NULL);';
    const inserts = [ 'user', userId, userName, lowcaseUserName ];
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 * Gets the channel from db.
 *
 * @param {string} channelId
 *   Slack channel id.
 * @returns {Promise}
 *   Returned promise.
 */
function getChannel( channelId ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const str = 'SELECT channel_id FROM ?? WHERE channel_id = ?;';
    const inserts = [ 'channel', channelId ];
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 * Inserts channel into db.
 *
 * @param {string} channelId
 *   Slack channel id.
 * @param {string} channelName
 *   Slack channel name.
 * @returns {Promise}
 *   Returned promise.
 */
function insertChannel( channelId, channelName ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const str = 'INSERT INTO ?? (channel_id, channel_name) VALUES (?, ?);';
    const inserts = [ 'channel', channelId, channelName ];
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 * Gets the last score record for user per channel.
 *
 * @param {string} fromUserId
 *   User id to retrieve the last score.
 * @param {string} channelId
 *   Slack channel id.
 * @returns {Promise}
 *   Returned promise.
 */
function getLast( fromUserId, channelId ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const timestamp = moment( Date.now() ).subtract( timeLimit, 'seconds' ).format( 'YYYY-MM-DD HH:mm:ss' );
    const str = 'SELECT `score_id`, `timestamp` FROM `score` WHERE `from_user_id` = ? AND `timestamp` >= ? AND `channel_id` = ? ORDER BY `timestamp` DESC LIMIT 1;';
    const inserts = [ fromUserId, timestamp, channelId ];
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 * Removes score record from db.
 *
 * @param {string} scoreId
 *   Score id to delete.
 * @returns {Promise}
 *   The returned promise.
 */
function removeLast( scoreId ) {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const str = 'DELETE FROM `score` WHERE `score_id` = ?;';
    const inserts = [ scoreId ];
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 * Gets the count of daily scores by user.
 *
 * @param {string} fromUserId
 *   The voting user slack id.
 * @returns {Promise}
 *   Returned promise.
 */
function getDayilyVotesByUser( fromUserId ) {

  return new Promise( function( resolve, reject ) {
    const day = new Date().getDate();
    const db = mysql.createConnection( mysqlConfig );
    const str = 'SELECT COUNT(score_id) as daily_votes from score where DAY(`timestamp`) = ? AND from_user_id = ?;';
    const inserts = [ day, fromUserId ];
    const query = mysql.format( str, inserts );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

/**
 * Retrieves all channels for leaderboard.
 *
 * @returns {Promise}
 *   The promise.
 */
const getAllChannels = () => {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    let str = 'SELECT * FROM channel';

    const query = mysql.format( str );
    db.query( query, function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        resolve( result );
      }
    });

    db.end(dbErrorHandler);

  });
}

module.exports = {
  retrieveTopScores,
  updateScore,
  checkUser,
  checkChannel,
  undoScore,
  getNewScore,
  getDailyUserScore,
  getAllChannels,
  getAllScoresFromUser,
  getKarmaFeed,
  getName,
  getAll,
  getUserId
};
