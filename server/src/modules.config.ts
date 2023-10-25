import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from './redis.module';
import { Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// Create a RedisModule that will be used to inject the Redis client (see server/src/redis.module.ts)
export const redisModule = RedisModule.registerAsync({
  // Inject the ConfigService into the RedisModule (to get the Redis connection options from .env file)
  imports: [ConfigModule],

  // The factory function that will be used to create the Redis client
  useFactory: async (configService: ConfigService) => {
    const logger = new Logger('RedisModule');

    return {
      // The Redis connection options from .env file
      connectionOptions: {
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
      },

      // The function that will be called when the Redis client is ready
      onClientReady: (client) => {
        logger.log('Redis client ready');

        client.on('error', (error) => {
          logger.error('Redis client error', error);
        });

        client.on('connect', () => {
          logger.log(
            `Connected to redis on ${client.options.host}:${client.options.port}`,
          );
        });
      },
    };
  },

  // The dependencies that will be injected into the factory function
  inject: [ConfigService],
});

// Create a JwtModule that will be used to inject the JWT service (from @nestjs/jwt package)
export const jwtModule = JwtModule.registerAsync({
  // Inject the ConfigService into the JwtModule (to get the JWT secret from .env file)
  imports: [ConfigModule],

  // The factory function that will be used to create the JWT service
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'),

    // The JWT expiration time in seconds
    signOptions: {
      expiresIn: parseInt(configService.get<string>('POLL_DURATION')),
    },
  }),

  // The dependencies that will be injected into the factory function
  inject: [ConfigService],
});
