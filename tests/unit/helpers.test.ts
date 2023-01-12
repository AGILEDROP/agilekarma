import { describe, expect, it } from 'vitest';
import {
  extractCommand, extractPlusMinusEventData, getTimestamp, getTimeBasedToken, isPlural, isTimeBasedTokenStillValid,
  isUser, maybeLinkItem,
} from '../../src/helpers.js';

const MILLISECONDS_TO_SECONDS = 1000;

describe('extractCommand', () => {
  const commands = [
    'test-command',
    'something-else',
    'another-command',
  ];

  it('returns a valid command from a message containing only that command', () => {
    const message = '<@U12345678> test-command';
    expect(extractCommand(message, commands)).toEqual('test-command');
  });

  it('returns a valid command from the start of a message', () => {
    const message = '<@U12345678> test-command would be great';
    expect(extractCommand(message, commands)).toEqual('test-command');
  });

  it('returns a valid command from the middle of a message', () => {
    const message = '<@U12345678> can I have a test-command please';
    expect(extractCommand(message, commands)).toEqual('test-command');
  });

  it('returns a valid command from the end of a message', () => {
    const message = '<@U12345678> I would love to see a test-command';
    expect(extractCommand(message, commands)).toEqual('test-command');
  });

  it('returns the first valid command in a message with multiple', () => {
    const message = '<@U12345678> looking for something-else rather than a test-command';
    expect(extractCommand(message, commands)).toEqual('something-else');
  });

  it('returns the first valid command in a message with multiple (with order switched)', () => {
    const message = '<@U12345678> looking for a test-command rather than something-else';
    expect(extractCommand(message, commands)).toEqual('test-command');
  });

  it('returns false if it cannot find a valid command in a message', () => {
    const message = '<@U12345678> there is nothing actionable here';
    expect(extractCommand(message, commands)).toBeFalsy();
  });
});

describe('extractPlusMinusEventData', () => {
  it('drops message without an @ symbol', () => {
    expect(extractPlusMinusEventData('Hello++')).toBeFalsy();
  });

  it('drops messages without a valid operation', () => {
    expect(extractPlusMinusEventData('@Hello')).toBeFalsy();
  });

  it('drops messages without a valid user/item', () => {
    expect(extractPlusMinusEventData('@++')).toBeFalsy();
  });

  it('extracts a user and operation from the start of a message', () => {
    const result = extractPlusMinusEventData('<@U87654321>++ that was awesome');
    expect(result).toHaveProperty('item', 'U87654321');
    expect(result).toHaveProperty('operation', '+');
  });

  it('extracts data in the middle of a message', () => {
    const result = extractPlusMinusEventData('Hey <@U87654321>++ you\'re great');
    expect(result).toHaveProperty('item', 'U87654321');
    expect(result).toHaveProperty('operation', '+');
  });

  it('extracts data at the end of a message', () => {
    const result = extractPlusMinusEventData('Awesome work <@U87654321>++');
    expect(result).toHaveProperty('item', 'U87654321');
    expect(result).toHaveProperty('operation', '+');
  });

  it('extracts data in the middle and the description ', () => {
    const result = extractPlusMinusEventData('Hey <@U87654321>++ awesome');
    expect(result).toHaveProperty('item', 'U87654321');
    expect(result).toHaveProperty('operation', '+');
    expect(result).toHaveProperty('description', 'awesome');
  });

  const itemsToMatch = [
    {
      supplied: '<@U1234567890>',
      expected: 'U1234567890',
    },
  ];

  const operationsToMatch = [
    {
      supplied: '++',
      expected: '+',
    },
    {
      supplied: '--',
      expected: '-',
    },
    {
      supplied: '—', // Emdash, which iOS replaces -- with.
      expected: '-',
    },
  ];

  const operationsNotToMatch = [
    '+',
    '-',
  ];

  for (const item of itemsToMatch) {
    for (const operation of operationsToMatch) {
      for (let iterator = 0; iterator <= 1; iterator += 1) {
        const space = iterator === 1 ? ' ' : '';
        const messageText = item.supplied + space + operation.supplied;
        const testName = (
          `matches ${messageText} as ${item.expected} and ${operation.expected}`
        );

        it(testName, () => {
          const result = extractPlusMinusEventData(messageText);
          expect(result).toEqual({
            item: item.expected,
            operation: operation.expected,
          });
        });
      } // For iterator.
    } // For operationsToMatch.

    for (const operation of operationsNotToMatch) {
      const messageText = item.supplied + operation;
      it(`does NOT match ${messageText}`, () => {
        expect(extractPlusMinusEventData(messageText)).toBeFalsy();
      });
    }
  }
});

describe('getTimeBasedToken', () => {
  it('returns a string', () => {
    expect(getTimeBasedToken(getTimestamp().toString(10))).toBeTypeOf('string');
  });

  it('provides a different token if called with a different timestamp', () => {
    const token1 = getTimeBasedToken('123456789');
    const token2 = getTimeBasedToken('123123123');
    expect(token1).not.toEqual(token2);
  });
});

describe('getTimestamp', () => {
  it('returns an integer', () => {
    const result = getTimestamp();
    expect(result).toBeTypeOf('number');
    expect(result).not.toBeTypeOf('string');
  });

  it('returns the current unix epoch', () => {
    const now = Math.floor(Date.now() / MILLISECONDS_TO_SECONDS);
    const result = getTimestamp();
    // expect().toBeWithin(now - 5, now + 1);
    expect(result).toBeGreaterThanOrEqual(now - 5);
    expect(result).toBeLessThanOrEqual(now + 1);
  });
});

describe('isPlural', () => {
  const table: [boolean, number][] = [
    [true, -11],
    [true, -2],
    [false, -1],
    [true, 0],
    [false, 1],
    [true, 2],
    [true, 11],
  ];

  it.each(table)('returns %p for %d', (result, number) => {
    expect(isPlural(number)).toBe(result);
  });
});

describe('isTimeBasedTokenStillValid', () => {
  it('returns true for a token created just now', () => {
    const now = getTimestamp();
    const token = getTimeBasedToken(now.toString(10));

    expect(isTimeBasedTokenStillValid(token, now)).toBeTruthy();
  });

  it('returns true for a token created an hour ago', () => {
    const now = getTimestamp();
    const oneHourAgo = now - 60 * 60;
    const token = getTimeBasedToken(oneHourAgo.toString(10));

    expect(isTimeBasedTokenStillValid(token, oneHourAgo)).toBeTruthy();
  });

  it('returns false for a token created with a different timestamp', () => {
    const now = getTimestamp();
    const token = getTimeBasedToken((now - 1).toString(10));

    expect(isTimeBasedTokenStillValid(token, now)).toBeFalsy();
  });

  it('returns false for a token created in the future', () => {
    const now = getTimestamp();
    const theFuture = now + 10;
    const token = getTimeBasedToken(theFuture.toString(10));

    expect(isTimeBasedTokenStillValid(token, theFuture)).toBeFalsy();
  });

  it('returns false for a token created two days ago', () => {
    const now = getTimestamp();
    const twoDaysAgo = now - 60 * 60 * 24 * 2;
    const token = getTimeBasedToken(twoDaysAgo.toString(10));

    expect(isTimeBasedTokenStillValid(token, twoDaysAgo)).toBeFalsy();
  });
});

describe('isUser', () => {
  it('returns true for a Slack user ID', () => {
    expect(isUser('U00000000')).toBeTruthy();
  });

  it('returns false for something other than a Slack user ID', () => {
    expect(isUser('SomethingRandom')).toBeFalsy();
  });
});

describe('maybeLinkItem', () => {
  it('returns an item as-is if it is not a Slack user ID', () => {
    const item = 'something';
    expect(maybeLinkItem(item)).toBe(item);
  });

  it('returns an item linked with Slack mrkdwn if it looks like a Slack user ID', () => {
    const item = 'U12345678';
    expect(maybeLinkItem(item)).toBe(`<@${item}>`);
  });
});
