import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  AddNominationFields,
  AddParticipantFields,
  CreatePollFields,
  JoinPollFields,
  RejoinPollFields,
  SubmitRankingsFields,
} from './types';
import {
  createNominationID,
  createPollID,
  createUserID,
} from 'src/utils/idHandler';
import { PollsRepository } from './polls.repository';
import { Poll } from 'shared';
import getResults from 'src/utils/getResults';

// Define a service for handling poll-related operations
@Injectable()
export class PollsService {
  private readonly logger = new Logger(PollsService.name);

  // Inject the PollsRepository and JWT service
  constructor(
    private readonly pollsRepository: PollsRepository,
    private readonly jwtService: JwtService,
  ) {}

  // Method for creating a new poll
  async createPoll(fields: CreatePollFields) {
    // Generate unique poll and user IDs
    const pollID = createPollID();
    const userID = createUserID();

    // Create a new poll in the redis database (see server/src/polls/polls.repository.ts)
    const createdPoll: Poll = await this.pollsRepository.createPoll({
      ...fields,
      pollID,
      userID,
    });

    this.logger.debug(
      `Creating token string for pollID: ${createdPoll.id} and userID: ${userID}`,
    );

    // Generate a signed token string for the user
    const signedString = this.jwtService.sign(
      {
        pollID: createdPoll.id,
        name: fields.name,
      },
      {
        subject: userID,
      },
    );

    // Return the poll and access token
    return {
      poll: createdPoll,
      accessToken: signedString,
    };
  }

  // Method for joining an existing poll
  async joinPoll(fields: JoinPollFields) {
    // Generate a unique user ID
    const userID = createUserID();

    this.logger.debug(
      `Fetching poll with ID: ${fields.pollID} for use with ID: ${userID}`,
    );

    // Fetch the poll from the redis database (see server/src/polls/polls.repository.ts)
    const joinedPoll: Poll = await this.pollsRepository.getPoll(fields.pollID);

    this.logger.debug(
      `Creating token string for pollID: ${joinedPoll.id} and userID: ${userID}`,
    );

    // Generate a signed token string for the user
    const signedString = this.jwtService.sign(
      {
        pollID: joinedPoll.id,
        name: fields.name,
      },
      {
        subject: userID,
      },
    );

    // Return the poll and access token
    return {
      poll: joinedPoll,
      accessToken: signedString,
    };
  }

  // Method for rejoining an existing poll
  async rejoinPoll(fields: RejoinPollFields) {
    this.logger.debug(
      `Rejoining poll with ID: ${fields.pollID} for use with ID: ${fields.userID} with name: ${fields.name}`,
    );

    // Add the user to the poll in the redis database (see server/src/polls/polls.repository.ts)
    const joinedPoll = await this.pollsRepository.addParticipant(fields);

    // Return the poll
    return joinedPoll;
  }

  // Method for adding a participant to a poll
  async addParticipant(addParticipant: AddParticipantFields): Promise<Poll> {
    return this.pollsRepository.addParticipant(addParticipant);
  }

  // Method for removing a participant from a poll
  async removeParticipant(
    pollID: string,
    userID: string,
  ): Promise<Poll | void> {
    // Fetch the poll from the redis database (see server/src/polls/polls.repository.ts)
    const poll = await this.pollsRepository.getPoll(pollID);

    // Only allow participants to be removed if the poll has not started
    if (!poll.isStarted) {
      const updatedPoll = await this.pollsRepository.removeParticipant(
        pollID,
        userID,
      );
      return updatedPoll;
    }
  }

  // Method for getting a poll
  async getPoll(pollID: string): Promise<Poll> {
    return this.pollsRepository.getPoll(pollID);
  }

  // Method for adding a nomination to a poll
  async addNomination({
    pollID,
    userID,
    text,
  }: AddNominationFields): Promise<Poll> {
    // Add the nomination to the poll in the redis database and return that poll (see server/src/polls/polls.repository.ts)
    return this.pollsRepository.addNomination({
      pollID,
      nominationID: createNominationID(),
      nomination: {
        userID,
        text,
      },
    });
  }

  // Method for removing a nomination from a poll
  async removeNomination(pollID: string, nominationID: string): Promise<Poll> {
    return this.pollsRepository.removeNomination(pollID, nominationID);
  }

  // Method for starting a poll
  async startPoll(pollID: string): Promise<Poll> {
    return this.pollsRepository.startPoll(pollID);
  }

  // Method for submitting rankings
  async submitRankings(rankingsData: SubmitRankingsFields): Promise<Poll> {
    const isPollStarted = (
      await this.pollsRepository.getPoll(rankingsData.pollID)
    ).isStarted;

    // Only allow participants to submit rankings if the poll has started
    if (!isPollStarted) {
      throw new BadRequestException(
        'Participants cannot rank until the poll has started',
      );
    }

    return this.pollsRepository.addParticipantsRankings(rankingsData);
  }

  // Method for computing poll results
  async computeResults(pollID: string): Promise<Poll> {
    const poll = await this.pollsRepository.getPoll(pollID);

    // Compute the poll results (see server/src/utils/getResults.ts)
    const results = getResults(
      poll.rankings,
      poll.nominations,
      poll.votesPerVoter,
    );

    return this.pollsRepository.addResults(pollID, results);
  }

  // Method for canceling a poll
  async cancelPoll(pollID: string): Promise<void> {
    await this.pollsRepository.deletePoll(pollID);
  }
}
