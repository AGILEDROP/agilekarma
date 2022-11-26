/**
 * Provides constants and supporting functions for operations.
 */
export const operations = {
  PLUS: 'plus',
  MINUS: 'minus',
  SELF: 'selfPlus',
};

/**
 * Given a mathematical operation, returns the name of that operation.
 */
export const getOperationName = (operation: string): string => {
  let operationName: string;

  switch (operation) {
    case '+': {
      operationName = operations.PLUS;
      break;
    }
    case '-': {
      operationName = operations.MINUS;
      break;
    }
    default: {
      operationName = '';
    }
  }

  return operationName;
};
