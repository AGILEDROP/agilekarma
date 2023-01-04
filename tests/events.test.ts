import {
  describe, expect, it, vi, afterAll,
} from 'vitest';
// import {handleSelfPlus, handlePlusMinus} from '../src/events.js';
import * as messages from '../src/messages.js';
import * as slack from '../src/slack.js';
import * as points from '../src/points.js';
import * as events from '../src/events.js';
import * as helpers from '../src/helpers.js';
import * as leaderboard from '../src/leaderboard.js';
import type { Event } from '../src/types.js';

console.error = vi.fn();
console.info = vi.fn();
console.log = vi.fn();
console.warn = vi.fn();

vi.mock('../src/slack.js');

vi.mock('../src/points.js', async () => {
  const other = await vi.importActual('../src/points.js');

  const getDailyUserScore = vi.fn();
  getDailyUserScore.mockResolvedValue({
    operation: true,
    message: '',
  });

  const checkUser = vi.fn().mockResolvedValue('U123423');

  const checkChannel = vi.fn().mockResolvedValue('C123423');
  const updateScore = vi.fn().mockResolvedValue(5);

  return {
    // @ts-ignore
    ...other,
    getDailyUserScore,
    checkUser,
    checkChannel,
    updateScore,
  };
});

vi.mock('../src/events.js', async () => {
  const other = await vi.importActual('../src/events.js');

  const processUserData = vi.fn();
  processUserData.mockResolvedValue('operation successfull');

  return {
    // @ts-ignore
    ...other,
    processUserData,
  };
});

afterAll(() => {
  vi.clearAllMocks();
});

describe('handleSelfPlus', () => {
  const user = 'U12345678';
  const channel = 'C12345678';

  it('logs an attempt by a user to increment their own score', () => {
    events.handleSelfPlus(user, channel);
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('gets a message from the \'self plus\' collection', () => {
    const spy = vi.spyOn(messages, 'getRandomMessage');
    events.handleSelfPlus(user, channel);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('selfPlus', user);
  });

  it('sends a message back to the user and channel that called it', () => {
    const message = 'negativeResponse';
    const spy = vi.spyOn(slack, 'sendEphemeral');

    vi.spyOn(messages, 'getRandomMessage').mockImplementationOnce(() => message);

    events.handleSelfPlus(user, channel);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(message, channel, expect.stringContaining(user));
  });
});

describe('handlePlusMinus', () => {
  const item = 'U88845678';
  const channel = 'C12345678';
  const score = 5;
  const userVoting = 'U77745678';
  const description = 'some description';
  const someMessage = 'test message';

  it('calls the score updater to update an item\'s score and sends a message', async () => {
    const getDailyUserScore = vi.spyOn(points, 'getDailyUserScore').mockResolvedValueOnce({
      operation: true,
      message: '',
    });
    vi.spyOn(points, 'checkUser').mockResolvedValueOnce(item);
    vi.spyOn(points, 'checkChannel').mockResolvedValueOnce(channel);
    const updateScore = vi.spyOn(points, 'updateScore').mockResolvedValueOnce(score);
    vi.spyOn(messages, 'getRandomMessage').mockReturnValueOnce(someMessage);

    const sendEphemeral = vi.spyOn(slack, 'sendEphemeral');

    await events.handlePlusMinus(item, '+', channel, userVoting, description);

    expect(getDailyUserScore).toHaveBeenCalledTimes(1);
    expect(getDailyUserScore).toHaveBeenCalledWith(userVoting);
    expect(getDailyUserScore).toHaveReturnedWith({
      operation: true,
      message: '',
    });
    expect(updateScore).toHaveBeenCalled();
    expect(sendEphemeral).toHaveBeenCalledWith(someMessage, channel, userVoting);
  });

  it('rejects voting by user over the daily limit and sends a message', async () => {
    const getDailyUserScore = vi.spyOn(points, 'getDailyUserScore').mockResolvedValueOnce({
      operation: false,
      message: someMessage,
    });
    const updateScore = vi.spyOn(points, 'updateScore');
    const sendEphemeral = vi.spyOn(slack, 'sendEphemeral');
    await events.handlePlusMinus(item, '+', channel, userVoting, description);

    expect(getDailyUserScore).toHaveBeenCalledTimes(1);
    expect(getDailyUserScore).toHaveBeenCalledWith(userVoting);
    expect(updateScore).not.toHaveBeenCalled();
    expect(sendEphemeral).toHaveBeenCalledWith(someMessage, channel, userVoting);
  });

  it('rejects minus operation', async () => {
    const getDailyUserScore = vi.spyOn(points, 'getDailyUserScore');
    await events.handlePlusMinus(item, '-', channel, userVoting, description);

    expect(getDailyUserScore).not.toHaveBeenCalled();
  });

  describe('handlers.message', async () => {
    const eventType = 'message';

    it('doesn\'t handle an event if a valid item cannot be extracted', async () => {
      const invalidText = '@Invalid#Item++';
      const invalidEvent: Event = {
        type: eventType,
        subtype: '',
        user: item,
        channel,
        text: invalidText,
      };

      const extractPlusMinusEventDataSpy = vi.spyOn(helpers, 'extractPlusMinusEventData').mockReturnValueOnce({
        item,
        operation: '+',
        description: '',
      });

      vi.spyOn(slack, 'getUserList').mockResolvedValueOnce({
        [item]: {
          id: item, is_bot: false, name: userVoting, profile: { real_name: item },
        },
        [userVoting]: {
          id: userVoting, is_bot: false, name: userVoting, profile: { real_name: userVoting },
        },
      });

      const handlePlusMinusSpy = vi.spyOn(events, 'handlePlusMinus');

      await events.handlers[eventType](invalidEvent);

      expect(extractPlusMinusEventDataSpy).toHaveBeenCalled();
      expect(handlePlusMinusSpy).not.toHaveBeenCalled();
    });

    it('handle a user trying to ++ themselves', async () => {
      const selfPlusEvent: Event = {
        type: eventType,
        subtype: '',
        user: item,
        channel,
        text: `<@${item}>++`,
      };

      vi.spyOn(helpers, 'extractPlusMinusEventData').mockReturnValueOnce({
        item,
        operation: '+',
        description: 'superb',
      });

      vi.spyOn(slack, 'getUserList').mockResolvedValueOnce({
        [item]: {
          id: item, is_bot: false, name: userVoting, profile: { real_name: item },
        },
        [userVoting]: {
          id: userVoting, is_bot: false, name: userVoting, profile: { real_name: userVoting },
        },
      });

      await events.handlers[eventType](selfPlusEvent);
      expect(console.log).toHaveBeenCalledWith(`${item} tried to alter their own score.`);
    });
  });
});

describe('handlers.appMention', () => {
  const eventType = 'app_mention';

  const appCommandTable = [
    ['leaderboard', 'leaderboard.js'],
  ];

  it.each(appCommandTable)('calls the app command handler for %s', (command) => {
    const event: Event = {
      type: eventType,
      text: `<@U00000000> ${command}`,
      subtype: '',
      user: 'U1234567',
      channel: 'C1234567',
    };

    const commandHandlerSpy = vi.spyOn(leaderboard, 'handler');
    events.handlers.appMention(event);
    expect(commandHandlerSpy).toHaveBeenCalledTimes(1);
  });

  it('sends a default message if the command is invalid', () => {
    const event: Event = {
      type: eventType,
      text: '<@U00000000> fds',
      subtype: '',
      user: 'U1234567',
      channel: 'C1234567',
    };

    const sendEphemeralSpy = vi.spyOn(slack, 'sendEphemeral').mockResolvedValueOnce();

    events.handlers.appMention(event);

    expect(sendEphemeralSpy).toHaveBeenCalledWith(expect.stringContaining('not very smart'), event.channel, event.user);
  });
});
