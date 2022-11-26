import * as dotenv from 'dotenv';
import type { ConnectionConfig } from 'mysql';

dotenv.config();

const {
  DATABASE_HOST: host,
  DATABASE_PORT: port = '3306',
  DATABASE_USER: user,
  DATABASE_PASSWORD: password,
  DATABASE_NAME: database,
} = process.env;

const mysqlConfig: ConnectionConfig = {
  host,
  port: Number.parseInt(port, 10),
  user,
  password,
  database,
};

export default mysqlConfig;
