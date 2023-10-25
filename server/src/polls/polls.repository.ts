import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command, Redis } from 'ioredis';

import { IORedisKey } from 'src/redis.module';
import {
  AddNominationData,
  AddParticipantData,
  AddnNominationRankingsData,
  CreatePollData,
} from './types';
import { Poll, Results } from 'shared';

// Define a repository for handling poll-related operations
@Injectable()
export class PollsRepository {
  private readonly ttl: string;
  private readonly logger = new Logger(PollsRepository.name);

  // Inject the Redis client and the config service
  constructor(
    configService: ConfigService,
    @Inject(IORedisKey) private readonly redisClient: Redis,
  ) {
    // Get the poll duration from the .env file
    this.ttl = configService.get('POLL_DURATION');
  }

  // Handle creating a new poll
  async createPoll({
    votesPerVoter,
    topic,
    pollID,
    userID,
  }: CreatePollData): Promise<Poll> {
    // Define the initial poll object
    const initialPoll = {
      id: pollID,
      topic,
      votesPerVoter,
      participants: {},
      nominations: {},
      adminID: userID,
      rankings: {},
      results: [],
      isStarted: false,
    };

    this.logger.log(
      `Creating new poll: ${JSON.stringify(initialPoll, null, 2)} with TTL ${
        this.ttl
      }`,
    );

    const key = `poll:${pollID}`;

    try {
      // Create a new poll in the redis database
      await this.redisClient
        .multi([
          ['send_command', 'JSON.SET', key, '.', JSON.stringify(initialPoll)],
          ['expire', key, this.ttl],
        ])
        .exec();
      return initialPoll;
    } catch (error) {
      // Log and throw an error if the poll creation fails
      this.logger.error(
        `Failed to add poll ${JSON.stringify(initialPoll)}\n${error}`,
      );
      throw new InternalServerErrorException();
    }
  }

  // Handle getting a poll
  async getPoll(pollID: string): Promise<Poll> {
    this.logger.log(`Attempting to get poll with: ${pollID}`);

    const key = `poll:${pollID}`;

    try {
      // Get the poll from the redis database
      const currentPoll = (await this.redisClient.sendCommand(
        new Command('JSON.GET', [key, '.']),
      )) as string;

      this.logger.verbose(currentPoll);

      return JSON.parse(currentPoll);
    } catch (error) {
      this.logger.error(`Failed to get pollID ${pollID}`);
      throw new InternalServerErrorException(`Failed to get pollID ${pollID}`);
    }
  }

  // Handle adding a participant to a poll
  async addParticipant({
    pollID,
    userID,
    name,
  }: AddParticipantData): Promise<Poll> {
    this.logger.log(
      `Attempting to add a participant with userID/name: ${userID}/${name} to pollID: ${pollID}`,
    );

    const key = `poll:${pollID}`;
    const participantPath = `.participants.${userID}`;

    try {
      // Add the participant to the poll in the redis database
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, participantPath, JSON.stringify(name)]),
      );

      // Get the updated poll
      const currentPoll = await this.getPoll(pollID);

      this.logger.debug(
        `Current participants for pollID: ${pollID}`,
        currentPoll.participants,
      );

      // Return the updated poll
      return currentPoll;
    } catch (error) {
      // Log and throw an error if the participant addition fails
      this.logger.error(
        `Failed to add a participant with userID/name: ${userID}/${name} to pollID: ${pollID}`,
      );
      throw new InternalServerErrorException(
        `Failed to add a participant with userID/name: ${userID}/${name} to pollID: ${pollID}`,
      );
    }
  }

  // Handle removing a participant from a poll
  async removeParticipant(pollID: string, userID: string): Promise<Poll> {
    this.logger.log(`removing userID: ${userID} from poll: ${pollID}`);

    const key = `poll:${pollID}`;
    const participantPath = `.participants.${userID}`;

    try {
      // Remove the participant from the poll in the redis database
      await this.redisClient.sendCommand(
        new Command('JSON.DEL', [key, participantPath]),
      );

      // Return the updated poll
      return this.getPoll(pollID);
    } catch (error) {
      // Log and throw an error if the participant removal fails
      this.logger.log(
        `Failed to remove userID: ${userID} from poll: ${pollID}`,
        error,
      );
      throw new InternalServerErrorException('Failed to remove participant');
    }
  }

  // Handle adding a nomination to a poll
  async addNomination({
    pollID,
    nominationID,
    nomination,
  }: AddNominationData): Promise<Poll> {
    this.logger.log(
      `Attempting to add a nomination with nonminationID/nomination: ${nominationID}/${nomination} to pollID: ${pollID}`,
    );

    const key = `poll:${pollID}`;
    const nominationPath = `.nominations.${nominationID}`;

    try {
      // Add the nomination to the poll in the redis database
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [
          key,
          nominationPath,
          JSON.stringify(nomination),
        ]),
      );

      // Return the updated poll
      return this.getPoll(pollID);
    } catch (error) {
      // Log and throw an error if the nomination addition fails
      this.logger.error(
        `Failed to add a nomination with nominationID/text: ${nominationID}/${nomination.text} to pollID: ${pollID}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to add a nomination with nominationID/text: ${nominationID}/${nomination.text} to pollID: ${pollID}`,
      );
    }
  }

  // Handle removing a nomination from a poll
  async removeNomination(pollID: string, nominationID: string): Promise<Poll> {
    this.logger.log(
      `Removing nominationID: ${nominationID} from pollID: ${pollID}`,
    );

    const key = `poll:${pollID}`;
    const nominationPath = `.nominations.${nominationID}`;

    try {
      // Remove the nomination from the poll in the redis database
      await this.redisClient.sendCommand(
        new Command('JSON.DEL', [key, nominationPath]),
      );

      // Return the updated poll
      return this.getPoll(pollID);
    } catch (error) {
      // Log and throw an error if the nomination removal fails
      this.logger.error(
        `Failed to remove nominationID: ${nominationID} from poll: ${pollID}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to remove nominationID: ${nominationID} from poll: ${pollID}`,
      );
    }
  }

  // Handle starting a poll
  async startPoll(pollID: string): Promise<Poll> {
    this.logger.log(`setting isStarted for poll: ${pollID}`);

    const key = `poll:${pollID}`;

    try {
      // Set the isStarted property of the poll to true in the redis database
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, '.isStarted', JSON.stringify(true)]),
      );

      // Return the updated poll
      return this.getPoll(pollID);
    } catch (error) {
      // Log and throw an error if the poll start fails
      this.logger.error(`Failed to set isStarted for poll: ${pollID}`, error);
      throw new InternalServerErrorException(
        'There was an error in starting the poll',
      );
    }
  }

  // Handle adding a participant's rankings to a poll
  async addParticipantsRankings({
    pollID,
    userID,
    rankings,
  }: AddnNominationRankingsData): Promise<Poll> {
    this.logger.log(
      `Attempting to add rankings for userID/name: ${userID} to pollID: ${pollID}`,
      rankings,
    );

    const key = `poll:${pollID}`;
    const rankingsPath = `.rankings.${userID}`;

    try {
      // Add the rankings to the poll in the redis database
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, rankingsPath, JSON.stringify(rankings)]),
      );

      // Return the updated poll
      return this.getPoll(pollID);
    } catch (error) {
      // Log and throw an error if the rankings addition fails
      this.logger.error(
        `Failed to add a rankings for userID/name: ${userID} to pollID: ${pollID}`,
        error,
      );
      throw new InternalServerErrorException(
        'There was an error in adding the rankings',
      );
    }
  }

  // Handle adding the results to a poll
  async addResults(pollID: string, results: Results): Promise<Poll> {
    this.logger.log(
      `Attempting to add results to pollID: ${pollID}`,
      JSON.stringify(results),
    );

    const key = `poll:${pollID}`;
    const resultPath = `.results`;

    try {
      // Add the results to the poll in the redis database
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, resultPath, JSON.stringify(results)]),
      );

      // Return the updated poll
      return this.getPoll(pollID);
    } catch (error) {
      // Log and throw an error if the results addition fails
      this.logger.error(`Failed to add results for pollID: ${pollID}`, error);
      throw new InternalServerErrorException(
        `Failed to add results for pollID: ${pollID}`,
      );
    }
  }

  // Handle deleting a poll
  async deletePoll(pollID: string): Promise<void> {
    const key = `poll:${pollID}`;

    this.logger.log(`deleting poll: ${pollID}`);

    try {
      // Delete the poll from the redis database
      await this.redisClient.sendCommand(new Command('JSON.DEL', [key, '.']));
    } catch (error) {
      // Log and throw an error if the poll deletion fails
      this.logger.error(`Failed to delete poll: ${pollID}`, error);
      throw new InternalServerErrorException(
        `Failed to delete poll: ${pollID}`,
      );
    }
  }
}
