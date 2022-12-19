import { LogLevel, WebClient } from '@slack/web-api';
import bodyParser from 'body-parser';
import express from 'express';
import { handleGet, handlePost } from './src/app.js';
import { setSlackClient } from './src/slack.js';
import {
  accessToken, leaderboardUrl, port, useHttps, mockApiPort, slackApiType,
} from './config.js';

const protocol = useHttps !== '1' ? 'http://' : 'https://';
const frontendUrl = protocol + leaderboardUrl;
const server = express();

if (slackApiType === 'mock') {
  setSlackClient(new WebClient(accessToken, { slackApiUrl: `http://localhost:${mockApiPort}/api/`, logLevel: LogLevel.DEBUG }));
} else {
  setSlackClient(new WebClient(accessToken));
}
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
