import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        display_name VARCHAR(64),
        username VARCHAR(32) UNIQUE,
        profile_photo_url TEXT,
        status_message VARCHAR(140),
        is_online BOOLEAN DEFAULT false,
        last_seen TIMESTAMP DEFAULT NOW(),
        privacy_settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        device_name VARCHAR(100),
        device_type VARCHAR(20),
        session_token_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        last_active_at TIMESTAMP DEFAULT NOW(),
        ip_address INET
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token_hash);
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}
