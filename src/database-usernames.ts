import knexInstance from './database/knex.js';

const addUsername = () => new Promise((resolve, reject) => {
  knexInstance('user')
    .where('user_username', '=', '')
    .orWhereNull('user_username')
    .update({ user_username: knexInstance.raw('LOWER( REPLACE( user_name, \' \', \'\' ) )', ['user_name']) })
    .then((result) => resolve(result))
    .catch((error) => {
      console.error(error);
      reject(error);
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
