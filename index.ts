import slackClient from '@slack/client';
import bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import { handleGet, handlePost } from './src/app.js';
import { setSlackClient } from './src/slack.js';

dotenv.config();

const PORT = process.env.SCOREBOT_PORT || 80;
const SLACK_OAUTH_ACCESS_TOKEN = process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN;
const protocol = process.env.SCOREBOT_USE_SSL !== '1' ? 'http://' : 'https://';
const frontendUrl = process.env.SCOREBOT_LEADERBOARD_URL;
const FRONTEND_URL = protocol + frontendUrl;

const bootstrap = (options?: { express: Express; slack: any }) => {
  // Allow alternative implementations of both Express and Slack to be passed in.
  const server = options?.express || express();
  setSlackClient(options?.slack || new slackClient.WebClient(SLACK_OAUTH_ACCESS_TOKEN));

  server.use((req: Request, res: Response, next: () => void) => {
    res.header('Access-Control-Allow-Origin', FRONTEND_URL);
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

  return server.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
  });
};

bootstrap();
