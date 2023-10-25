import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PollsService } from './polls.service';
import { AuthPayload, SocketWithAuth } from './types';
import { WsUnauthorizedException } from 'src/exceptions/ws-exceptions';

// Define a custom guard that will be used to validate the admin token (only used for WebSocket connections)
@Injectable()
export class GatewayAdminGuard implements CanActivate {
  private readonly logger = new Logger(GatewayAdminGuard.name);

  // Inject the PollsService and JWT service
  constructor(
    private readonly pollsService: PollsService,
    private readonly jwtService: JwtService,
  ) {}

  // Override the canActivate method to validate the admin token
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Extract the socket object from the execution context
    const socket: SocketWithAuth = context.switchToWs().getClient();

    // Get the admin token from the socket handshake
    const token =
      socket.handshake.auth.token || socket.handshake.headers['token'];

    // Throw a WsUnauthorizedException if the admin token is not provided
    if (!token) {
      this.logger.error('No authorization token provided');

      throw new WsUnauthorizedException('No authorization token provided');
    }

    try {
      // Decode the admin token
      const payload = this.jwtService.verify<AuthPayload & { sub: string }>(
        token,
      );

      this.logger.debug(`Validating admin using token payload`, payload);

      const { sub, pollID } = payload;

      // Fetch the poll from the redis database (see server/src/polls/polls.service.ts)
      const poll = await this.pollsService.getPoll(pollID);

      // Throw a WsUnauthorizedException if the admin token is invalid
      if (sub !== poll.adminID) {
        throw new WsUnauthorizedException('Admin privileges required');
      }

      return true;
    } catch {
      // Throw a WsUnauthorizedException if the admin token is invalid
      throw new WsUnauthorizedException('Admin privileges required');
    }
  }
}
