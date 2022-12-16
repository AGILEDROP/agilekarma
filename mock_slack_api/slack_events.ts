import * as uuid from 'uuid';
import workspaceData from './mock_data/base.js';
import { generateSlackId } from './slack_util.js';

const {
  SLACK_VERIFICATION_TOKEN: verificationToken = '',
} = process.env;

const { context_team_id: teamId, token, api_app_id: apiAppId } = workspaceData;
export const createEvent = (fromUserId: string, toUserId: string, channelId: string, botId: string, messageText: string) => ({
  token,
  team_id: teamId,
  api_app_id: apiAppId,
  event: {
    client_msg_id: uuid.v4(),
    type: 'message',
    text: `<@${toUserId}> ${messageText}`,
    user: fromUserId,
    ts: Date.now(),
    blocks: [
      {
        type: 'rich_text',
        block_id: 'Cua',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              {
                type: 'user',
                user_id: toUserId,
              },
              {
                type: 'text',
                text: ` ${messageText}`,
              },
            ],
          },
        ],
      },
    ],
    team: teamId,
    channel: channelId,
    event_ts: Date.now(),
    channel_type: 'channel',
  },
  type: 'event_callback',
  event_id: generateSlackId(),
  event_time: Date.now(),
  authorizations: [
    {
      enterprise_id: null,
      team_id: teamId,
      user_id: botId,
      is_bot: true,
      is_enterprise_install: false,
    },
  ],
  is_ext_shared_channel: false,
  // event_context: '4-eyJldCI6Im1lc3NhZ2UiLCJ0aWQiOiJUMDRERDBGQzE2WiIsImFpZCI6IkEwNERGVVM5VzU4IiwiY2lkIjoiQzA0RFVITVVaM0sifQ',
  event_context: generateSlackId(50),
});

export const createChallenge = () => ({
  token: verificationToken,
  challenge: generateSlackId(30),
  type: 'url_verification',
});
