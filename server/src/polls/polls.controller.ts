import { Body, Controller, Post } from '@nestjs/common';
import { CreatePollDto, JoinDto } from './dtos';
import { PollsService } from './polls.service';

@Controller('polls')
export class PollsController {
  constructor(private pollsService: PollsService) {}

  @Post()
  async create(@Body() createPollDto: CreatePollDto) {
    const result = await this.pollsService.createPoll(createPollDto);

    return result;
  }

  @Post('/join')
  async join(@Body() joinDto: JoinDto) {
    const result = await this.pollsService.joinPoll(joinDto);

    return result;
  }

  @Post('/rejoin')
  async rejoin() {
    const result = await this.pollsService.rejoinPoll({
      name: 'John Doe',
      pollID: '123456',
      userID: '123456',
    });

    return result;
  }
}
