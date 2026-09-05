import { createClient } from 'redis';
import logger from '../config/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  logger.error(`Redis Client Error: ${err.message}`);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis server');
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error: any) {
    logger.error(`Failed to connect to Redis: ${error.message}`);
    throw error;
  }
};

export default redisClient;
