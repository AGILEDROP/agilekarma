import type { Knex } from 'knex';
import * as knexPkg from 'knex';
import { mysqlConfig2 } from './mysql-config.js';

const config: Knex.Config = {
  client: 'mysql',
  connection: mysqlConfig2,
};

const { knex } = knexPkg.default; // https://github.com/knex/knex/issues/5358
const knexInstance = knex(config);

export default knexInstance;
