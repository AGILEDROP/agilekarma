'use strict';

import { ConnectionConfig } from "mysql";

require('dotenv').config();

const mysql = require('mysql');

const mysqlConfig: ConnectionConfig = {
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME
};
console.log(mysqlConfig);

/**
 * Prepares database.
 */
const prepareDatabase = async (): Promise<any> => {
  await createUserTable();
  await createChannelTable();
  await createScoreTable();

  console.log('Database prepared!');
};

/**
 * Creates channel table.
 */
const createChannelTable = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const db = mysql.createConnection(mysqlConfig);
    const inserts = ['channel'];
    const str = 'CREATE TABLE IF NOT EXISTS ?? ' +
      '(`channel_id` VARCHAR(255) NOT NULL,' +
      '`channel_name` VARCHAR(255) NULL,' +
      'PRIMARY KEY (`channel_id`));';
    const query = mysql.format(str, inserts);
    db.query(query, (err: string, result: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Creates scores table.
 */
const createScoreTable = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const db = mysql.createConnection(mysqlConfig);
    const inserts = ['score'];
    const str = 'CREATE TABLE IF NOT EXISTS ?? (`score_id` VARCHAR(255) NOT NULL, `timestamp` DATETIME NOT NULL, `to_user_id` VARCHAR(255) NOT NULL, `from_user_id` VARCHAR(255) NOT NULL, `channel_id` VARCHAR(255) NOT NULL, `description` TEXT NULL, PRIMARY KEY (`score_id`), INDEX `fk_score_user_idx` (`to_user_id` ASC), INDEX `fk_score_user1_idx` (`from_user_id` ASC), INDEX `fk_score_channel1_idx` (`channel_id` ASC), CONSTRAINT `fk_score_user` FOREIGN KEY (`to_user_id`) REFERENCES `user` (`user_id`) ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT `fk_score_user1` FOREIGN KEY (`from_user_id`) REFERENCES `user` (`user_id`) ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT `fk_score_channel1` FOREIGN KEY (`channel_id`) REFERENCES `channel` (`channel_id`) ON DELETE NO ACTION ON UPDATE NO ACTION)';
    const query = mysql.format(str, inserts);
    db.query(query, (err: string, result: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Creates user table.
 */
const createUserTable = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const db = mysql.createConnection(mysqlConfig);
    const inserts = ['user'];
    const str = 'CREATE TABLE IF NOT EXISTS ?? ' +
      '(`user_id` VARCHAR(255) NOT NULL,' +
      '`user_name` VARCHAR(255) NULL,' +
      '`user_username` VARCHAR(255) NULL,' +
      '`banned_until` DATETIME NULL,' +
      'PRIMARY KEY (`user_id`));';
    const query = mysql.format(str, inserts);
    db.query(query, (err: string, result: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
prepareDatabase().catch((reason) => {
  console.log(reason);
});

export { };