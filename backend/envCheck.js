// backend/envCheck.js
import dotenv from 'dotenv';

console.log('🔍 Environment Check...');

// Load environment
dotenv.config();

console.log('Current working directory:', process.cwd());
console.log('Environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');

if (process.env.SUPABASE_URL) {
  console.log('SUPABASE_URL value:', process.env.SUPABASE_URL.substring(0, 30) + '...');
}