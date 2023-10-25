import { customAlphabet, nanoid } from 'nanoid';

// Create pollID with 6 characters from the alphabet
export const createPollID = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  6,
);

export const createUserID = () => nanoid();
export const createNominationID = () => nanoid(8);
