import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();

const {
  DATABASE_HOST: host,
  DATABASE_PORT: port = '3306',
  DATABASE_USER: user,
  DATABASE_PASSWORD: password,
  DATABASE_NAME: database,
} = process.env;

const config: Knex.Config = {
  client: 'mysql',
  connection: {
    host,
    port: Number.parseInt(port, 10),
    user,
    password,
    database,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './src/database/migrations',
    extension: 'ts',
  },
};

export default config;
