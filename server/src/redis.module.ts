import {
  DynamicModule,
  FactoryProvider,
  Module,
  ModuleMetadata,
} from '@nestjs/common';
import IORedis, { Redis, RedisOptions } from 'ioredis';

// Token used to inject the Redis client
export const IORedisKey = 'IORedis';

type RedisModuleOptions = {
  connectionOptions: RedisOptions;
  onClientReady?: (client: Redis) => void;
};

type RedisAsyncModuleOptions = {
  useFactory: (
    ...args: any[]
  ) => Promise<RedisModuleOptions> | RedisModuleOptions;
} & Pick<ModuleMetadata, 'imports'> &
  Pick<FactoryProvider, 'inject'>;

@Module({})
export class RedisModule {
  // A static method that returns a DynamicModule (a module without a module class)
  static async registerAsync({
    useFactory,
    imports,
    inject,
  }: RedisAsyncModuleOptions): Promise<DynamicModule> {
    // Create a provider that will be used to inject the Redis client
    const redisProvider = {
      // The token used to inject the Redis client
      provide: IORedisKey,

      // The factory function that will be used to create the Redis client
      useFactory: async (...args: any[]) => {
        const { connectionOptions, onClientReady } = await useFactory(...args);

        // Create a new Redis instance
        const client = new IORedis(connectionOptions);

        onClientReady(client);

        return client;
      },
      // The dependencies that will be injected into the factory function
      inject,
    };

    // Return a DynamicModule that contains the Redis provider
    return {
      module: RedisModule,
      imports,
      providers: [redisProvider],
      exports: [redisProvider],
    };
  }
}
