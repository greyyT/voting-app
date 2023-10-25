import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace } from 'socket.io';

import { PollsService } from './polls.service';
import { SocketWithAuth } from './types';
import { WsCatchAllFilter } from 'src/exceptions/ws-catch-all-filter';
import { GatewayAdminGuard } from './gateway-admin.guard';
import { NominationDto } from './dtos';
import { NominationID } from 'shared';

// Apply the ValidationPipe to handle request body validation
@UsePipes(new ValidationPipe())
// Apply the WsCatchAllFilter to catch all exceptions thrown by the gateway (see server/src/exceptions/ws-catch-all-filter.ts)
@UseFilters(new WsCatchAllFilter())
// Define a Websocket gateway for handling real-time interactions in the 'polls' namespace
@WebSocketGateway({
  namespace: 'polls',
})
export class PollsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PollsGateway.name);

  // Inject the PollsService
  constructor(private readonly pollsService: PollsService) {}

  // Inject the SocketIO server
  @WebSocketServer() io: Namespace;

  // Gateway initialization
  afterInit(): void {
    this.logger.log('Websocket Gateway Initialized');
  }

  // Handle a new WebSocket connection
  async handleConnection(client: SocketWithAuth) {
    const sockets = this.io.sockets;

    this.logger.debug(
      `Socket connected with userID: ${client.userID}, pollID: ${client.pollID}, and name: "${client.name}"`,
    );

    this.logger.log(`WS Client with id: ${client.id} connected`);
    this.logger.debug(`Number of connected sockets: ${sockets.size}`);

    const roomName = client.pollID;
    await client.join(roomName);

    const connectedClients = this.io.adapter.rooms?.get(roomName)?.size ?? 0;

    this.logger.debug(
      `userID: ${client.userID} joined room with name: ${roomName}`,
    );

    this.logger.debug(
      `Total clients connected to room ${roomName}: ${connectedClients}`,
    );

    // Add the user to the poll (see server/src/polls/polls.service.ts)
    const updatedPoll = await this.pollsService.addParticipant({
      pollID: client.pollID,
      userID: client.userID,
      name: client.name,
    });

    // Emit the updated poll to all clients in the room (listen to 'poll_updated' on the client side)
    this.io.to(roomName).emit('poll_updated', updatedPoll);
  }

  // Handle a WebSocket disconnection
  async handleDisconnect(client: SocketWithAuth) {
    const { pollID, userID } = client;

    // Remove the user from the poll (see server/src/polls/polls.service.ts)
    const updatedPoll = await this.pollsService.removeParticipant(
      pollID,
      userID,
    );

    const roomName = client.pollID;
    const clientCount = this.io.adapter.rooms?.get(roomName)?.size ?? 0;

    const sockets = this.io.sockets;

    this.logger.log(`Disconnected socket id: ${client.id}`);
    this.logger.debug(`Number of connected sockets: ${sockets.size}`);
    this.logger.debug(
      `Total clients connected to room ${roomName}: ${clientCount}`,
    );

    // Emit the updated poll to all clients in the room (listen to 'poll_updated' on the client side)
    if (updatedPoll) {
      this.io.to(roomName).emit('poll_updated', updatedPoll);
    }
  }

  // Apply a guard for admin privileges and handle remove participant requests
  @UseGuards(GatewayAdminGuard)
  @SubscribeMessage('remove_participant')
  async removeParticipant(
    @MessageBody('id') id: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    this.logger.debug(
      `Attempting to remove participant ${id} from poll ${client.pollID}`,
    );

    // Remove the user from the poll (see server/src/polls/polls.service.ts)
    const updatedPoll = await this.pollsService.removeParticipant(
      client.pollID,
      id,
    );

    // Emit the updated poll to all clients in the room (listen to 'poll_updated' on the client side)
    if (updatedPoll) {
      this.io.to(client.pollID).emit('poll_updated', updatedPoll);
    }
  }

  // Handle add nomination requests
  @SubscribeMessage('nominate')
  async nominate(
    @MessageBody() nomination: NominationDto,
    @ConnectedSocket() client: SocketWithAuth,
  ): Promise<void> {
    this.logger.debug(
      `Attempting to add nomination for user ${client.userID} to poll ${client.pollID}\n${nomination.text}`,
    );

    // Add the nomination to the poll (see server/src/polls/polls.service.ts)
    const updatedPoll = await this.pollsService.addNomination({
      pollID: client.pollID,
      userID: client.userID,
      text: nomination.text,
    });

    // Emit the updated poll to all clients in the room (listen to 'poll_updated' on the client side)
    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  // Apply a guard for admin privileges and handle remove nomination requests from admin
  @UseGuards(GatewayAdminGuard)
  @SubscribeMessage('remove_nomination')
  async removeNomination(
    @MessageBody('id') nominationID: string,
    @ConnectedSocket() client: SocketWithAuth,
  ): Promise<void> {
    this.logger.debug(
      `Attempting to remove nomination ${nominationID} from poll ${client.pollID}`,
    );

    // Remove the nomination from the poll (see server/src/polls/polls.service.ts)
    const updatedPoll = await this.pollsService.removeNomination(
      client.pollID,
      nominationID,
    );

    // Emit the updated poll to all clients in the room (listen to 'poll_updated' on the client side)
    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  // Apply a guard for admin privileges and handle start voting request from admin
  @UseGuards(GatewayAdminGuard)
  @SubscribeMessage('start_vote')
  async startVote(@ConnectedSocket() client: SocketWithAuth): Promise<void> {
    this.logger.debug(`Attempting to start voting for poll: ${client.pollID}`);

    // Start the poll (see server/src/polls/polls.service.ts)
    const updatedPoll = await this.pollsService.startPoll(client.pollID);

    // Emit the updated poll to all clients in the room (listen to 'poll_updated' on the client side)
    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  // Handle submit rankings requests
  @SubscribeMessage('submit_rankings')
  async submitRankings(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody('rankings') rankings: NominationID[],
  ): Promise<void> {
    this.logger.debug(
      `Submitting votes for user: ${client.userID} belonging to pollID: ${client.pollID}`,
    );

    // Submit the rankings (see server/src/polls/polls.service.ts)
    const updatedPoll = await this.pollsService.submitRankings({
      pollID: client.pollID,
      userID: client.userID,
      rankings,
    });

    // Emit the updated poll to all clients in the room (listen to 'poll_updated' on the client side)
    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  // Apply a guard for admin privileges and handle close poll request from admin
  @UseGuards(GatewayAdminGuard)
  @SubscribeMessage('close_poll')
  async closePoll(@ConnectedSocket() client: SocketWithAuth): Promise<void> {
    this.logger.debug(`Closing poll: ${client.pollID} and computing results`);

    // Close the poll and compute the results (see server/src/polls/polls.service.ts)
    const updatedPoll = await this.pollsService.computeResults(client.pollID);

    // Emit the updated poll to all clients in the room (listen to 'poll_updated' on the client side)
    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  // Apply a guard for admin privileges and handle cancel poll request from admin
  @UseGuards(GatewayAdminGuard)
  @SubscribeMessage('cancel_poll')
  async cancelPoll(@ConnectedSocket() client: SocketWithAuth): Promise<void> {
    this.logger.debug(`Cancelling poll with id: ${client.pollID}`);

    // Cancel the poll (see server/src/polls/polls.service.ts)
    await this.pollsService.cancelPoll(client.pollID);

    // Emit a 'poll_cancelled' event to all clients in the room (listen to 'poll_cancelled' on the client side)
    this.io.to(client.pollID).emit('poll_cancelled');
  }
}
