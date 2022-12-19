import type { Knex } from 'knex';
import * as knexPkg from 'knex';
import {
  databaseHost, databasePort, databaseUser, databasePassword, databaseName,
} from '../../config.js';

const config: Knex.Config = {
  client: 'mysql',
  connection: {
    host: databaseHost,
    port: Number.parseInt(databasePort, 10),
    user: databaseUser,
    password: databasePassword,
    database: databaseName,
  },
};

const { knex } = knexPkg.default; // https://github.com/knex/knex/issues/5358
const knexInstance = knex(config);

export default knexInstance;
