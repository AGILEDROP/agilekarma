import { describe, expect, it } from 'vitest';
import { getRandomMessage } from '../src/messages.js';

const operations = [
  'plus',
  'minus',
  'selfPlus',
];

describe('getRandomMessage', () => {
  it.each(operations)('returns a message for the %s operation', (operation) => {
    expect(typeof getRandomMessage(operation, 'RandomThing')).toBe('string');
  });

  it('throws an error for an invalid operation', () => {
    expect(() => {
      getRandomMessage('INVALID_OPERATION', 'RandomThing');
    }).toThrow();
  });
});
