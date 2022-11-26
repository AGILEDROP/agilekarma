/**
 * Provides messages for random selection.
 *
 * TODO: Add the ability to customise these messages - probably via JSON objects in environment
 *       variables.
 */
import type { Operation } from '@types';
import { operations } from './operations.js';
import { isPlural, maybeLinkItem } from './helpers.js';

export const messages: Record<string, Operation[]> = {};

messages[operations.PLUS] = [
  {
    probability: 100,
    set: [
      'Congrats!',
      'Got it!',
      'Bravo.',
      'Oh well done.',
      'Nice work!',
      'Well done.',
      'Exquisite.',
      'Lovely.',
      'Superb.',
      'Classic!',
      'Charming.',
      'Noted.',
      'Well, well!',
      'Well played.',
      'Sincerest congratulations.',
      'Delicious.',
    ],
  },
  {
    probability: 1,
    set: [':shifty:'],
  },
];

messages[operations.MINUS] = [
  {
    probability: 100,
    set: [
      'Oh RLY?',
      'Oh, really?',
      'Oh :slightly_frowning_face:.',
      'I see.',
      'Ouch.',
      'Oh là là.',
      'Oh.',
      'Condolences.',
    ],
  },
  {
    probability: 1,
    set: [':shifty:'],
  },
];

messages[operations.SELF] = [
  {
    probability: 100,
    set: [
      'Hahahahahahaha no.',
      'Nope.',
      'No. Just no.',
      'Not cool!',
    ],
  },
  {
    probability: 1,
    set: [':shifty:'],
  },
];

/**
 * Retrieves a random message from the given pool of messages.
 */
export const getRandomMessage = (operation: string, item: any, score = 0): string => {
  const messageSets = messages[operation];
  let format = '';

  switch (operation) {
    case operations.MINUS:
    case operations.PLUS:
      format = '<message> *<item>* is now on <score> point<plural>.';
      break;

    case operations.SELF:
      format = '<item> <message>';
      break;

    default:
      throw Error(`Invalid operation: ${operation}`);
  }

  let totalProbability = 0;
  messageSets.forEach((messageSet) => {
    totalProbability += messageSet.probability;
  });

  let chosenSet = null;
  let setRandom = Math.floor(Math.random() * totalProbability);
  for (let i = 0; i < messageSets.length; i += 1) {
    setRandom -= messageSets[i].probability;

    if (setRandom < 0) {
      chosenSet = messageSets[i].set;
      break;
    }
  }

  if (chosenSet === null) {
    throw Error(`Could not find set for ${operation} (ran out of sets with ${setRandom} remaining)`);
  }

  const plural = isPlural(score) ? 's' : '';
  const max = chosenSet.length - 1;
  const random = Math.floor(Math.random() * max);
  const message = chosenSet[random];

  return format.replace('<item>', maybeLinkItem(item))
    .replace('<score>', score.toString())
    .replace('<plural>', plural)
    .replace('<message>', message);
};
