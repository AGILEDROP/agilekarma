import slackClient from '@slack/client';
import bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import express from 'express';
import { handleGet, handlePost } from './src/app.js';
import { setSlackClient } from './src/slack.js';

dotenv.config();

const {
  SLACK_BOT_USER_OAUTH_ACCESS_TOKEN: accessToken = '',
  SCOREBOT_LEADERBOARD_URL: leaderboardUrl = '',
  SCOREBOT_PORT: port = '80',
  SCOREBOT_USE_SSL: useHttps = '0',
} = process.env;

const protocol = useHttps !== '1' ? 'http://' : 'https://';
const frontendUrl = protocol + leaderboardUrl;
const server = express();
// @ts-ignore
setSlackClient(new slackClient.WebClient(accessToken));

server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', frontendUrl);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

server.use(bodyParser.json());
server.enable('trust proxy');
server.get('/', handleGet);
server.post('/', handlePost);

server.get('/leaderboard', handleGet);
server.get('/channels', handleGet);
server.get('/fromusers', handleGet);
server.get('/karmafeed', handleGet);
server.get('/userprofile', handleGet);

server.listen(Number.parseInt(port, 10), () => {
  console.log(`Listening on http://localhost:${port}`);
});
