import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreatePollDto, JoinDto } from './dtos';
import { PollsService } from './polls.service';
import { ControllerAuthGuard } from './controller-auth.guard';
import { RequestWithAuth } from './types';

// Apply the ValidationPipe to handle request body validation
@UsePipes(new ValidationPipe())
@Controller('polls')
export class PollsController {
  constructor(private pollsService: PollsService) {}

  // Create a new poll and return that poll and an admin token
  @Post()
  async create(@Body() createPollDto: CreatePollDto) {
    const result = await this.pollsService.createPoll(createPollDto);

    return result;
  }

  // Join an existing poll and return that poll and a user token
  @Post('/join')
  async join(@Body() joinDto: JoinDto) {
    const result = await this.pollsService.joinPoll(joinDto);

    return result;
  }

  // Rejoin an existing poll. Apply the ControllerAuthGuard to validate the user token,
  // a user can only rejoin a poll that they have already joined (see server/src/polls/controller-auth.guard.ts)
  @UseGuards(ControllerAuthGuard)
  @Post('/rejoin')
  async rejoin(@Req() request: RequestWithAuth) {
    const { userID, pollID, name } = request;
    const result = await this.pollsService.rejoinPoll({
      name,
      pollID,
      userID,
    });

    return result;
  }
}
