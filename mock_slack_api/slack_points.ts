import axios from 'axios';
import type { Request, Response } from 'express';
import { createEvent, createChallenge } from './slack_events.js';
import { logRequest, logResponseError } from '../src/app.js';
import Channels from './mock_data/channels.js';
import Users from './mock_data/user_list.js';

const {
  SCOREBOT_PORT: scorebotPort,
} = process.env;

const channelInstance = Channels.getInstance();
const usersInstance = Users.getInstance();

export const sendEvent = (response: Response, fromUser:string, toUser: string, channel: string, bot: string, message: string) => {
  const fromUserId = usersInstance.getUserId(fromUser);
  const toUserId = usersInstance.getUserId(toUser);
  const channelId = channelInstance.getChannelId(channel);
  const botId = usersInstance.getUserId(bot);

  if (fromUserId && toUserId && channelId && botId) {
    const event = createEvent(fromUserId, toUserId, channelId, botId, message);
    axios.post(`http://localhost:${scorebotPort}`, event)
      .then(() => {
        response.send('Success!');
      })
      .catch((error) => {
        logResponseError(error);
        response.status(400).send('You\'re holding it wrong\n');
      });
  }
};

export const postEphemeral = (request: Request, response: Response) => {
  logRequest(request);
  const { channel, text } = request.body;
  const userId = text.match(/(?<=@)(.*?)(?=>)/);
  const userName = usersInstance.getUserName(userId[0]);
  const channelName = channelInstance.getChannelName(channel);
  const humanReadableText = `[${channelName}] - ${text.replace((/(?=\*)(.*)(?<=\*)/), userName)}`;
  console.log(humanReadableText);
  response.send({
    ok: true,
    message_ts: Date.now(),
  });
};

export const sendChallenge = (request: Request, response: Response) => {
  const challengeEvent = createChallenge();
  logRequest(request);
  axios.post(`http://localhost:${scorebotPort}`, challengeEvent)
    .then((res) => {
      const { challenge } = res.data;
      if (challenge === challengeEvent.challenge) {
        console.log('Correct challenge response received\n');
        response.send('Correct challenge response received');
      } else {
        console.log('Incorrect challenge response received\n');
        response.status(400).send('Incorrect challenge response received');
      }
    })
    .catch((error) => {
      logResponseError(error);
      response.status(400).send('Challenge unsuccessful\n');
    });
};
