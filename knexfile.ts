import type { Knex } from 'knex';
import {
  databaseHost, databasePort, databaseUser, databasePassword, databaseName,
} from './config.js';

const config: Knex.Config = {
  client: 'mysql',
  connection: {
    host: databaseHost,
    port: Number.parseInt(databasePort, 10),
    user: databaseUser,
    password: databasePassword,
    database: databaseName,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './src/database/migrations',
    extension: 'ts',
  },
};

export default config;
