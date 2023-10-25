import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { SocketWithAuth } from './polls/types';

// Define a custom IoAdapter that will be used to configure the SocketIO server
export class SocketIOAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIOAdapter.name);

  // Inject the NestJS application context to get JWT service
  constructor(
    private app: INestApplicationContext,
    private configService: ConfigService,
  ) {
    super(app);
  }

  // Override the createIOServer method to configure the SocketIO server with additional configurations
  createIOServer(port: number, options?: ServerOptions) {
    const clientPort = parseInt(this.configService.get('CLIENT_PORT'));

    // Configure CORS for the client
    const cors = {
      origin: [
        `http://localhost:${clientPort}`,
        new RegExp(`/^http:\/\/192\.168\.1\.([1-9]|[1-9]\d):${clientPort}$/`),
      ],
    };

    this.logger.log(`Configuring SocketIO server with custom CORS options`, {
      cors,
    });

    // Merge the default options with the custom CORS options
    const optionsWithCORS: ServerOptions = {
      ...options,
      cors,
    };

    // Get the JWT service from the NestJS application context
    const jwtService = this.app.get(JwtService);

    // Create a SocketIO server with the custom CORS options
    const server: Server = super.createIOServer(port, optionsWithCORS);

    // Define a SocketIO namespace 'polls' and use a middleware to validate the JWT token
    server.of('polls').use(createTokenMiddleware(jwtService, this.logger));

    return server;
  }
}

// Define a middleware that will be used to validate the JWT token
const createTokenMiddleware =
  (jwtService: JwtService, logger: Logger) =>
  (socket: SocketWithAuth, next: any) => {
    // Get the JWT token from the authentication handshake
    const token =
      socket.handshake.auth.token || socket.handshake.headers['token'];

    logger.debug(`Validating auth token before connection: ${token}`);

    try {
      // Verify the JWT token
      const payload = jwtService.verify(token);

      // Attach parameters to the socket object to fit the SocketWithAuth interface (see server/src/polls/types.d.ts)
      socket.userID = payload.sub;
      socket.pollID = payload.pollID;
      socket.name = payload.name;

      // Call the next middleware
      next();
    } catch {
      // Throw an error to reject the connection
      next(new Error('FORBIDDEN'));
    }
  };
