import axios from 'axios';
import { initMockServer } from '../src/mock_slack_api/slack_server.js';
import { users, channels } from './test_users.js';

const isMock = initMockServer();

if (isMock) {
  await axios.post(`http://localhost:${process.env.MOCK_SLACK_PORT}/api/control.message`, {
    fromUser: users[0], toUser: users[1], channel: channels[0], message: '++',
    // @ts-expect-error https://github.com/axios/axios/issues/5034
  }, { headers: 'content-Type: application/json' });

  await axios.post(`http://localhost:${process.env.MOCK_SLACK_PORT}/api/control.message`, {
    fromUser: users[0], toUser: users[1], channel: channels[0], message: '++',
    // @ts-expect-error https://github.com/axios/axios/issues/5034
  }, { headers: 'content-Type: application/json' });

  await axios.post(`http://localhost:${process.env.MOCK_SLACK_PORT}/api/control.message`, {
    fromUser: users[0], toUser: users[1], channel: channels[0], message: '++',
    // @ts-expect-error https://github.com/axios/axios/issues/5034
  }, { headers: 'content-Type: application/json' });

  await axios.post(`http://localhost:${process.env.MOCK_SLACK_PORT}/api/control.message`, {
    fromUser: users[0], toUser: users[1], channel: channels[1], message: '++',
    // @ts-expect-error https://github.com/axios/axios/issues/5034
  }, { headers: 'content-Type: application/json' });

  await axios.post(`http://localhost:${process.env.MOCK_SLACK_PORT}/api/control.message`, {
    fromUser: users[1], toUser: users[2], channel: channels[1], message: '++',
    // @ts-expect-error https://github.com/axios/axios/issues/5034
  }, { headers: 'content-Type: application/json' });

  await axios.post(`http://localhost:${process.env.MOCK_SLACK_PORT}/api/control.message`, {
    fromUser: users[1], toUser: users[2], channel: channels[1], message: '++',
    // @ts-expect-error https://github.com/axios/axios/issues/5034
  }, { headers: 'content-Type: application/json' });

  await axios.post(`http://localhost:${process.env.MOCK_SLACK_PORT}/api/control.message`, {
    fromUser: users[2], toUser: users[1], channel: channels[2], message: '++',
    // @ts-expect-error https://github.com/axios/axios/issues/5034
  }, { headers: 'content-Type: application/json' });
}