const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis error:', err));
client.on('connect', () => console.log('✅ Redis connected'));

const cache = {
  async get(key) {
    return await client.get(key);
  },
  
  async set(key, value, ttl = 3600) {
    await client.setEx(key, ttl, JSON.stringify(value));
  },
  
  async del(key) {
    await client.del(key);
  }
};

module.exports = { client, cache };
