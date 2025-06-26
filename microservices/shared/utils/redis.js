const redis = require('redis');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
  }

  async connect() {
    try {
      // Main client for general operations
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      // Publisher client for pub/sub
      this.publisher = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      // Subscriber client for pub/sub
      this.subscriber = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      // Connect all clients
      await this.client.connect();
      await this.publisher.connect();
      await this.subscriber.connect();

      // Handle errors
      this.client.on('error', (err) => logger.error('Redis client error:', err));
      this.publisher.on('error', (err) => logger.error('Redis publisher error:', err));
      this.subscriber.on('error', (err) => logger.error('Redis subscriber error:', err));

      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  // Cache operations
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      await this.client.setEx(key, ttl, serializedValue);
      logger.debug('Cache set:', { key, ttl });
    } catch (error) {
      logger.error('Cache set error:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      logger.debug('Cache deleted:', { key });
    } catch (error) {
      logger.error('Cache delete error:', error);
      throw error;
    }
  }

  // Pub/Sub operations
  async publish(channel, message) {
    try {
      const serializedMessage = typeof message === 'object' ? JSON.stringify(message) : message;
      await this.publisher.publish(channel, serializedMessage);
      logger.debug('Message published:', { channel, message });
    } catch (error) {
      logger.error('Publish error:', error);
      throw error;
    }
  }

  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch {
          callback(message);
        }
      });
      logger.debug('Subscribed to channel:', { channel });
    } catch (error) {
      logger.error('Subscribe error:', error);
      throw error;
    }
  }

  async unsubscribe(channel) {
    try {
      await this.subscriber.unsubscribe(channel);
      logger.debug('Unsubscribed from channel:', { channel });
    } catch (error) {
      logger.error('Unsubscribe error:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.client) await this.client.quit();
      if (this.publisher) await this.publisher.quit();
      if (this.subscriber) await this.subscriber.quit();
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Redis close error:', error);
      throw error;
    }
  }
}

module.exports = new RedisClient(); 