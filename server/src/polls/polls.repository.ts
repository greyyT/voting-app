import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command, Redis } from 'ioredis';
import { IORedisKey } from 'src/redis.module';
import { AddParticipantData, CreatePollData } from './types';
import { Poll } from 'shared';

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
      throw error;
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
      throw error;
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
}
