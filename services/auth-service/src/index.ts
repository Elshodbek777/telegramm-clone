import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const USE_MOCK = process.env.USE_MOCK === 'true' || true; // Default to mock mode

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    mode: USE_MOCK ? 'mock' : 'production'
  });
});

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    if (USE_MOCK) {
      console.log('⚠️  Running in MOCK mode (no database required)');
      console.log('📝 Verification codes will be logged to console');
    } else {
      const { initDatabase } = await import('./config/database');
      const { initRedis } = await import('./config/redis');
      await initDatabase();
      await initRedis();
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Auth service running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`🔧 Mode: ${USE_MOCK ? 'MOCK (Development)' : 'PRODUCTION'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
