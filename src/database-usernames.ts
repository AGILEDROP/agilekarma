/* eslint-disable max-len */
'use strict';

import { ConnectionConfig } from "mysql";

require('dotenv').config();
import mysql from 'mysql';

const mysqlConfig: ConnectionConfig = {
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME
};
console.log(mysqlConfig);

/**
 * Adds usernames to database
 */
const prepareDatabase = async (): Promise<any> => {
  await addUsername();
  console.log('Usernames Added');
  setTimeout((() => {
    return process.exit(22);
  }), 500);
};

/**
 * Creates user table.
 */

const addUsername = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const db = mysql.createConnection(mysqlConfig);
    const str = "UPDATE user SET user_username = LOWER( REPLACE( user_name, ' ', '' ) ) WHERE (user_username = '' OR user_username IS NULL)";
    const query = mysql.format(str, null);

    db.query(query, (err: string, result: string) => {
      if (err) {
        reject(err);
      } else {
        console.log(result);
        resolve(result);
      }
    });
  });
}

prepareDatabase().catch((reason) => {
  console.log(reason);
});
