module.exports = {
  node_env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3550,
  frontend_url: process.env.FRONTEND_URL || 'http://localhost:3500',
  
  databases: {
    mongodb: process.env.MONGODB_URI,
    postgres: process.env.POSTGRES_URL,
    neo4j: process.env.NEO4J_URI,
    redis: process.env.REDIS_URL
  },
  
  telnyx: {
    apiKey: process.env.TELNYX_API_KEY,
    publicKey: process.env.TELNYX_PUBLIC_KEY
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h'
  }
};
