import type { Request, RequestHandler } from 'express';
import { handleEvent } from './events.js';
import {
  getAllScoresFromUser,
  getForChannels,
  getForWeb,
  getKarmaFeed,
  getUserProfile,
} from './leaderboard.js';

const {
  SLACK_VERIFICATION_TOKEN: verificationToken = '',
} = process.env;

export const logRequest = (request: Request) => {
  console.log(`${request.ip} ${request.method} ${request.path} ${request.headers['user-agent']}`);
};

export const logResponseError = (error: unknown) => {
  if (error instanceof Error) {
    console.log(error.message);
  }
};

export const validateToken = (suppliedToken: string, serverToken: string) => {
  // Sanity check for bad values on the server side - either empty, or still set to the default.
  if (!serverToken.trim() || serverToken === 'xxxxxxxxxxxxxxxxxxxxxxxx') {
    console.error('500 Internal server error - bad verification value');
    return {
      error: 500,
      message: 'Internal server error.',
    };
  }

  if (suppliedToken !== serverToken) {
    console.error('403 Access denied - incorrect verification token');
    return {
      error: 403,
      message: 'Access denied.',
    };
  }

  return true;
};

export const handleGet: RequestHandler = async (request, response) => {
  logRequest(request);

  switch (request.path.replace(/\/$/, '')) {
    case '/leaderboard':
      response.json(await getForWeb(request));
      break;

    case '/channels':
      response.json(await getForChannels(request));
      break;

    case '/fromusers':
      response.json(await getAllScoresFromUser(request));
      break;

    case '/karmafeed':
      try {
        response.json(await getKarmaFeed(request));
      } catch (err) {
        logResponseError(err);
      }
      break;

    case '/userprofile':
      try {
        response.json(await getUserProfile(request));
      } catch (err) {
        logResponseError(err);
      }
      break;

    default:
      response.send('It works! However, this app only accepts POST requests for now.');
      break;
  }
};

export const handlePost: RequestHandler = (request, response) => {
  logRequest(request);

  // Respond to challenge sent by Slack during event subscription set up.
  if (request.body.challenge) {
    response.send(request.body.challenge);
    console.info('200 Challenge response sent');
    return null;
  }

  const validation = validateToken(request.body.token, verificationToken);
  if (validation !== true) {
    response.status(validation.error).send(validation.message);
    return null;
  }

  // Send back a 200 OK now so Slack doesn't get upset.
  response.send('');

  // Drop retries. This is controversial. But, because we're mainly gonna be running on free Heroku
  // dynos, we'll be sleeping after inactivity. It takes longer than Slack's 3 second limit to start
  // back up again, so Slack will retry immediately and then again in a minute - which will result
  // in the action being carried out 3 times if we listen to it!
  // @see https://api.slack.com/events-api#graceful_retries
  if (request.headers['x-slack-retry-num']) {
    console.log('Skipping Slack retry.');
    return null;
  }

  // Handle the event now. If the event is invalid, this will return false.
  return handleEvent(request.body.event, request);
};
