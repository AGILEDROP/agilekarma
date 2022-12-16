import bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import express, { RequestHandler } from 'express';
import { logRequest } from '../src/app.js';
import Channels from './mock_data/channels.js';
import Users from './mock_data/user_list.js';
import { postEphemeral, sendChallenge, sendEvent } from './slack_points.js';

dotenv.config();

const {
  MOCK_SLACK_PORT: port = '5010',
} = process.env;

const channelInstance = Channels.getInstance();
const usersInstance = Users.getInstance();

const server = express();

const handleGet: RequestHandler = async (request, response) => {
  const { group, method } = request.params;
  logRequest(request);

  switch (true) {
    case group === 'users' && method === 'list':
      response.json(usersInstance.getUsers());
      break;
    case group === 'conversations' && method === 'list':
      response.json(channelInstance.getChannels());
      break;
    default:
      response.status(400).send('You\'re holding it wrong\n');
  }
};

const handlePost: RequestHandler = (request, response) => {
  logRequest(request);
  const { group, method } = request.params;
  const {
    fromUser, toUser, channel, bot, message,
  } = request.body;

  switch (true) {
    case group === 'control' && method === 'message':
      if (fromUser && toUser && channel) {
        usersInstance.createUser(fromUser);
        usersInstance.createUser(toUser);
        channelInstance.createChannel(channel);
        if (bot) usersInstance.createUser(bot, true);
        sendEvent(response, fromUser, toUser, channel, bot || 'agilekarma_bot', message);
      } else {
        response.status(400).send('Missing data');
      }
      break;
    case group === 'control' && method === 'challenge':
      sendChallenge(request, response);
      break;
    case group === 'chat' && method === 'postEphemeral':
      postEphemeral(request, response);
      break;
    case group === 'users' && method === 'list':
      response.json(usersInstance.getUsers());
      break;
    case group === 'conversations' && method === 'list':
      response.json(channelInstance.getChannels());
      break;
    default:
      response.status(400).send('You\'re holding it wrong\n');
  }
};

server.use((req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.enable('trust proxy');
server.get('/', handleGet);
server.post('/', handlePost);

server.get('/api/:group.:method', handleGet);

server.post('/api/:group.:method', handlePost);

server.listen(Number.parseInt(port, 10), () => {
  console.log(`Mock slack server listening on http://localhost:${port}`);
});
