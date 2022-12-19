import * as dotenv from 'dotenv';

dotenv.config();

const {
  SLACK_BOT_USER_OAUTH_ACCESS_TOKEN: accessToken = '',
  SCOREBOT_LEADERBOARD_URL: leaderboardUrl = '',
  SCOREBOT_PORT: port = '80',
  SCOREBOT_USE_SSL: useHttps = '0',
  MOCK_SLACK_PORT: mockApiPort = '5010',
  SLACK_API_TYPE: slackApiType,
  SLACK_VERIFICATION_TOKEN: verificationToken = '',
  SIGNING_SECRET: secret,
  USER_LIMIT_VOTING_MAX: votingLimit = '300',
  UNDO_TIME_LIMIT: timeLimit = '300',
  DATABASE_HOST: databaseHost,
  DATABASE_PORT: databasePort = '3306',
  DATABASE_USER: databaseUser,
  DATABASE_PASSWORD: databasePassword,
  DATABASE_NAME: databaseName,
} = process.env;

export {
  accessToken, leaderboardUrl, port, useHttps, mockApiPort, slackApiType,
  verificationToken, secret, timeLimit, votingLimit, databaseHost, databasePort, databaseUser,
  databasePassword, databaseName,
};
