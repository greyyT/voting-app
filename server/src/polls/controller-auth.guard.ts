import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestWithAuth } from './types';

// Define a custom guard that will be used to validate the user token
@Injectable()
export class ControllerAuthGuard implements CanActivate {
  private readonly logger = new Logger(ControllerAuthGuard.name);

  // Inject the JWT service
  constructor(private readonly jwtService: JwtService) {}

  // Override the canActivate method to validate the user token
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Extract the request object from the execution context
    const request: RequestWithAuth = context.switchToHttp().getRequest();

    this.logger.debug(`Checking for auth token or request body`, request.body);

    // Get the user token from the request body
    const { accessToken } = request.body;

    try {
      // Validate the user token
      const payload = this.jwtService.verify(accessToken);

      // Append user and poll to socket
      request.userID = payload.sub;
      request.pollID = payload.pollID;
      request.name = payload.name;

      return true;
    } catch {
      // Throw a ForbiddenException if the user token is invalid
      throw new ForbiddenException('Invalid authorization token');
    }
  }
}
