/* eslint-disable max-len */
'use strict';
require( 'dotenv' ).config();
const mysql = require( 'mysql' );
// const { setSlackClient, getUserEmail, getUsers, getUserList } = require('./slack');
const slack = require( './slack' );
const slackClient = require( '@slack/client' );
const SLACK_OAUTH_ACCESS_TOKEN = process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN;
slack.setSlackClient( new slackClient.WebClient( SLACK_OAUTH_ACCESS_TOKEN ) );

let users = [];
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
  database: process.env.DATABASE_NAME,
  // eslint-disable-next-line no-process-env
  multipleStatements: true
};

// console.log( mysqlConfig );

/**
 * Adds usernames to database
 *
 * @returns {Promise}
 *   The promise.
 */
const prepareDatabase = async() => {
  await getAllIds();
  await addEmails();
  console.log( 'Emails Added' );
  setTimeout((function() {
    return process.exit(22);
  }), 500);
};

/**
 * Retrieves all id from db.
 *
 * @returns {Promise}
 *   The promise.
 */
const getAllIds = () => {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    let str = 'SELECT user_id FROM user';

    const query = mysql.format( str );
    db.query( query, async function( err, result ) {
      if ( err ) {
        console.log( db.sql );
        reject( err );
      } else {
        for (let index = 0; index < result.length; index++) {
          const email = await slack.getUserEmail(result[index].user_id);
          let user = {
            "id": result[index].user_id,
            "email": email
          }
          users.push(user);
        }
        resolve( result );
      }
    });

  });
}

/**
 * Creates emails table.
 *
 * @returns {Promise}
 *   Returned promise.
 */
const addEmails = async() => {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    let str = '';
    
    for (let index = 0; index < users.length; index++) {
      if (users[index].email !== undefined) {
        str += "UPDATE user SET user_email = '" + users[index].email + "' WHERE user_id = '" + users[index].id + "'; ";
      }
    }

    const query = mysql.format( str );
    db.query( query, function( err, result ) {
      if ( err ) {
        reject( err );
      } else {
        console.log( result );
        resolve( result );
      }
    });
  });
}

prepareDatabase().catch( function( reason ) {
  console.log( reason );
});