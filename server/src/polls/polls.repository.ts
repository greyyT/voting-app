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

@Injectable()
export class PollsRepository {
  private readonly ttl: string;
  private readonly logger = new Logger(PollsRepository.name);

  constructor(
    configService: ConfigService,
    @Inject(IORedisKey) private readonly redisClient: Redis,
  ) {
    this.ttl = configService.get('POLL_DURATION');
  }

  async createPoll({
    votesPerVoter,
    topic,
    pollID,
    userID,
  }: CreatePollData): Promise<Poll> {
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
      await this.redisClient
        .multi([
          ['send_command', 'JSON.SET', key, '.', JSON.stringify(initialPoll)],
          ['expire', key, this.ttl],
        ])
        .exec();
      return initialPoll;
    } catch (error) {
      this.logger.error(
        `Failed to add poll ${JSON.stringify(initialPoll)}\n${error}`,
      );
      throw new InternalServerErrorException();
    }
  }

  async getPoll(pollID: string): Promise<Poll> {
    this.logger.log(`Attempting to get poll with: ${pollID}`);

    const key = `poll:${pollID}`;

    try {
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
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, participantPath, JSON.stringify(name)]),
      );

      const currentPoll = await this.getPoll(pollID);

      this.logger.debug(
        `Current participants for pollID: ${pollID}`,
        currentPoll.participants,
      );

      return currentPoll;
    } catch (error) {
      this.logger.error(
        `Failed to add a participant with userID/name: ${userID}/${name} to pollID: ${pollID}`,
      );
      throw new InternalServerErrorException(
        `Failed to add a participant with userID/name: ${userID}/${name} to pollID: ${pollID}`,
      );
    }
  }

  async removeParticipant(pollID: string, userID: string): Promise<Poll> {
    this.logger.log(`removing userID: ${userID} from poll: ${pollID}`);

    const key = `poll:${pollID}`;
    const participantPath = `.participants.${userID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.DEL', [key, participantPath]),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.log(
        `Failed to remove userID: ${userID} from poll: ${pollID}`,
        error,
      );
      throw new InternalServerErrorException('Failed to remove participant');
    }
  }

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
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [
          key,
          nominationPath,
          JSON.stringify(nomination),
        ]),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to add a nomination with nominationID/text: ${nominationID}/${nomination.text} to pollID: ${pollID}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to add a nomination with nominationID/text: ${nominationID}/${nomination.text} to pollID: ${pollID}`,
      );
    }
  }

  async removeNomination(pollID: string, nominationID: string): Promise<Poll> {
    this.logger.log(
      `Removing nominationID: ${nominationID} from pollID: ${pollID}`,
    );

    const key = `poll:${pollID}`;
    const nominationPath = `.nominations.${nominationID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.DEL', [key, nominationPath]),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to remove nominationID: ${nominationID} from poll: ${pollID}`,
        error,
      );

      throw new InternalServerErrorException(
        `Failed to remove nominationID: ${nominationID} from poll: ${pollID}`,
      );
    }
  }

  async startPoll(pollID: string): Promise<Poll> {
    this.logger.log(`setting isStarted for poll: ${pollID}`);

    const key = `poll:${pollID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, '.isStarted', JSON.stringify(true)]),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(`Failed to set isStarted for poll: ${pollID}`, error);
      throw new InternalServerErrorException(
        'There was an error in starting the poll',
      );
    }
  }

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
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, rankingsPath, JSON.stringify(rankings)]),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to add a rankings for userID/name: ${userID} to pollID: ${pollID}`,
        error,
      );
      throw new InternalServerErrorException(
        'There was an error in adding the rankings',
      );
    }
  }

  async addResults(pollID: string, results: Results): Promise<Poll> {
    this.logger.log(
      `Attempting to add results to pollID: ${pollID}`,
      JSON.stringify(results),
    );

    const key = `poll:${pollID}`;
    const resultPath = `.results`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, resultPath, JSON.stringify(results)]),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(`Failed to add results for pollID: ${pollID}`, error);
      throw new InternalServerErrorException(
        `Failed to add results for pollID: ${pollID}`,
      );
    }
  }

  async deletePoll(pollID: string): Promise<void> {
    const key = `poll:${pollID}`;

    this.logger.log(`deleting poll: ${pollID}`);

    try {
      await this.redisClient.sendCommand(new Command('JSON.DEL', [key, '.']));
    } catch (error) {
      this.logger.error(`Failed to delete poll: ${pollID}`, error);
      throw new InternalServerErrorException(
        `Failed to delete poll: ${pollID}`,
      );
    }
  }
}
