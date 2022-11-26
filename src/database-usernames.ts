import { createConnection, format } from 'mysql';
import mysqlConfig from './database/mysql-config.js';

const addUsername = () => new Promise((resolve, reject) => {
  const db = createConnection(mysqlConfig);
  const str = "UPDATE user SET user_username = LOWER( REPLACE( user_name, ' ', '' ) ) WHERE (user_username = '' OR user_username IS NULL)";
  const query = format(str, []);

  db.query(query, (err, result) => {
    if (err) {
      reject(err);
    } else {
      console.log(result);
      resolve(result);
    }
  });
});

/**
 * Adds usernames to database
 */
const prepareDatabase = async (): Promise<any> => {
  await addUsername();
  console.log('Usernames Added');
  setTimeout((() => process.exit(22)), 500);
};

prepareDatabase().catch((reason) => {
  console.log(reason);
});
