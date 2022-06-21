/**
 * Provides messages for random selection.
 *
 * TODO: Add the ability to customise these messages - probably via JSON objects in environment
 *       variables.
 */

'use strict';

import { Operation } from "@types";
import { isPlural, maybeLinkItem } from "./helpers";
import { operations } from "./operations";

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
      'Delicious.'
    ]
  },
  {
    probability: 1,
    set: [':shifty:']
  }
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
      'Condolences.'
    ]
  },
  {
    probability: 1,
    set: [':shifty:']
  }
];

messages[operations.SELF] = [
  {
    probability: 100,
    set: [
      'Hahahahahahaha no.',
      'Nope.',
      'No. Just no.',
      'Not cool!'
    ]
  },
  {
    probability: 1,
    set: [':shifty:']
  }
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
      throw Error('Invalid operation: ' + operation);
  }

  let totalProbability = 0;
  for (const set of messageSets) {
    totalProbability += set.probability;
  }

  let chosenSet = null,
    setRandom = Math.floor(Math.random() * totalProbability);

  for (const set of messageSets) {
    setRandom -= set.probability;

    if (0 > setRandom) {
      chosenSet = set.set;
      break;
    }
  }

  if (null === chosenSet) {
    throw Error(
      'Could not find set for ' + operation + ' (ran out of sets with ' + setRandom + ' remaining)'
    );
  }

  const plural = isPlural(score) ? 's' : '',
    max = chosenSet.length - 1,
    random = Math.floor(Math.random() * max),
    message = chosenSet[random];

  const formattedMessage = format.replace('<item>', maybeLinkItem(item))
    .replace('<score>', score.toString())
    .replace('<plural>', plural)
    .replace('<message>', message);

  return formattedMessage;

}; // GetRandomMessage.

