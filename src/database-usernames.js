/* eslint-disable max-len */
'use strict';
require( 'dotenv' ).config();
const mysql = require( 'mysql' );

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
console.log( mysqlConfig );

/**
 * Adds usernames to database
 *
 * @returns {Promise}
 *   The promise.
 */
const prepareDatabase = async() => {
  await addUsername();
  console.log( 'Usernames Added' );
  setTimeout((function() {
    return process.exit(22);
  }), 500);
};

/**
 * Creates user table.
 *
 * @returns {Promise}
 *   Returned promise.
 */
function addUsername() {
  return new Promise( function( resolve, reject ) {
    const db = mysql.createConnection( mysqlConfig );
    const str = "UPDATE user SET user_username = LOWER( REPLACE( user_name, ' ', '' ) ) WHERE (user_username = '' OR user_username IS NULL)";
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