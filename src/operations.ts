/**
 * Provides constants and supporting functions for operations.
 */

'use strict';

export const operations = {
  PLUS: 'plus',
  MINUS: 'minus',
  SELF: 'selfPlus'
};

/**
 * Given a mathematical operation, returns the name of that operation.
 */
export const getOperationName = (operation: string): string => {
  let operationName: string | boolean = '';

  switch (operation) {
    case '+': operationName = operations.PLUS; break;
    case '-': operationName = operations.MINUS; break;
  }

  return operationName ? operationName : '';

};