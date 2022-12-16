import crypto from 'crypto';

/*
    Generates a slack id based. Channels start with C, users with U, ...etc
 */
export const generateSlackId = (length: number = 11, type?: 'channel' | 'user' | undefined) => {
  const prefixes = {
    channel: 'C',
    user: 'U',
  };
  const generated = crypto
    .randomBytes(length)
    .toString('hex')
    .slice(0, type ? length - 1 : length)
    .toUpperCase();

  return `${type ? prefixes[type] : ''}${generated}`;
};

export default generateSlackId;
