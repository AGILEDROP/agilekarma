/**
 * Working PlusPlus++
 * Like plusplus.chat, but one that actually works, because you can host it yourself! 😉
 */

import { handleGet, handlePost } from './src/app.js';
import { setSlackClient } from './src/slack.js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import mime from 'mime';
import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import slackClient from '@slack/client';

dotenv.config();


const PORT = process.env.SCOREBOT_PORT || 80;
const SLACK_OAUTH_ACCESS_TOKEN = process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN;
const protocol = process.env.SCOREBOT_USE_SSL !== '1' ? 'http://' : 'https://';
const frontendUrl = process.env.SCOREBOT_LEADERBOARD_URL;
const FRONTEND_URL = protocol + frontendUrl;

/*
 * Starts the server and bootstraps the app.
 */

const bootstrap = (options?: { express: Express; slack: any }) => {
  // Allow alternative implementations of both Express and Slack to be passed in.
  const server = options?.express || express();
  setSlackClient(
    options?.slack || new slackClient.WebClient(SLACK_OAUTH_ACCESS_TOKEN)
  );

  server.use((req: Request, res: Response, next: () => void) => {
    res.header('Access-Control-Allow-Origin', FRONTEND_URL); // update to match the domain you will make the request from
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    next();
  });

  server.use(bodyParser.json());
  server.enable('trust proxy');
  server.get('/', handleGet);
  server.post('/', handlePost);

  // Static assets.
  server.get(
    '/assets/*',
    (
      request: Request & { _parsedUrl: { path: string } },
      response: Response
    ) => {
      const path = `src/${request._parsedUrl.path}`;
      const type = mime.getType(path);

      response.setHeader('Content-Type', type);
      response.send(fs.readFileSync(path));
    }
  );

  // Additional routes.
  server.get('/leaderboard', handleGet);
  server.get('/channels', handleGet);
  server.get('/fromusers', handleGet);
  server.get('/karmafeed', handleGet);
  server.get('/userprofile', handleGet);

  return server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}.`);
  });
}; // Bootstrap.

bootstrap();
