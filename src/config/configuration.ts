export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  moncash: {
    apiUrl: process.env.MONCASH_API_URL,
    clientId: process.env.MONCASH_CLIENT_ID,
    secretKey: process.env.MONCASH_SECRET_KEY,
  },

  frontend: {
    url: process.env.FRONTEND_URL,
  },
});
