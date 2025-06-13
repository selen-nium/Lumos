import postgres from 'postgres';
import { config } from 'dotenv';

config();

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(process.env.DATABASE_URL);

export default sql;