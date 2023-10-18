import {
  DynamicModule,
  FactoryProvider,
  Module,
  ModuleMetadata,
} from '@nestjs/common';
import IORedis, { Redis, RedisOptions } from 'ioredis';

export const IORedisKey = 'IORedis';

interface RedisModuleOptions {
  connectionOptions: RedisOptions;
  onClientReady?: (client: Redis) => void;
}

interface RedisAsyncModuleOptions
  extends Pick<ModuleMetadata, 'imports'>,
    Pick<FactoryProvider, 'inject'> {
  useFactory: (
    ...args: any[]
  ) => Promise<RedisModuleOptions> | RedisModuleOptions;
}

@Module({})
export class RedisModule {
  static async registerAsync({
    useFactory,
    imports,
    inject,
  }: RedisAsyncModuleOptions): Promise<DynamicModule> {
    const redisProvider = {
      provide: IORedisKey,
      useFactory: async (...args: any[]) => {
        const { connectionOptions, onClientReady } = await useFactory(...args);

        const client = await new IORedis(connectionOptions);

        onClientReady(client);

        return client;
      },
      inject,
    };

    return {
      module: RedisModule,
      imports,
      providers: [redisProvider],
      exports: [redisProvider],
    };
  }
}
