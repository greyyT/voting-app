import { Request } from 'express';
import { Socket } from 'socket.io';

// Service types
export interface CreatePollFields {
  topic: string;
  votesPerVoter: number;
  name: string;
}

export interface JoinPollFields {
  pollID: string;
  name: string;
}

export interface RejoinPollFields {
  pollID: string;
  userID: string;
  name: string;
}

// repository types
export interface CreatePollData {
  pollID: string;
  topic: string;
  votesPerVoter: number;
  userID: string;
}

export interface AddParticipantData {
  pollID: string;
  userID: string;
  name: string;
}

// Guard types
interface AuthPayload {
  userID: string;
  pollID: string;
  name: string;
}

export interface RequestWithAuth extends Request, AuthPayload {}

export interface SocketWithAuth extends Socket, AuthPayload {}
