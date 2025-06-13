import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function quickReset() {
  try {
    console.log('🔄 Quick Reset Tool\n');

    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    const userId = args[1];

    if (command === 'demo') {
      console.log('🎭 Resetting demo user...');
      
      const { default: demoUserService } = await import('../src/services/demoUserService.js');
      await demoUserService.resetDemoUser();
      await demoUserService.ensureDemoUserExists();
      
      const credentials = demoUserService.getDemoCredentials();
      
      console.log('✅ Demo user reset successfully!');
      console.log('🔑 Login credentials:');
      console.log(`   Email: ${credentials.email}`);
      console.log(`   Password: ${credentials.password}`);
      console.log(`   User ID: ${credentials.userId}`);
      console.log('\n🎯 You can now test onboarding from scratch!');
      
    } else if (command === 'user' && userId) {
      console.log(`🗑️ Resetting user data for: ${userId}`);
      
      const { default: dataService } = await import('../src/services/data/dataService.js');
      const client = dataService.db.serviceClient;
      
      // Delete user data
      await client.from('user_module_progress').delete().eq('user_id', userId);
      await client.from('user_learning_paths').delete().eq('user_id', userId);
      await client.from('user_skills').delete().eq('user_id', userId);
      await client.from('user_goals').delete().eq('user_id', userId);
      
      // Reset profile
      await client
        .from('profiles')
        .update({
          username: null,
          onboarding_complete: false,
          is_employed: null,
          career_stage: null,
          company: null,
          role: null,
          weekly_learning_hours: null,
          preferred_learning_time: null,
          user_type: null,
          bio: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      console.log(`✅ User ${userId} data reset successfully!`);
      console.log('🎯 User can now go through onboarding again.');
      
    } else if (command === 'stats') {
      console.log('📊 Getting system stats...');
      
      const { default: demoUserService } = await import('../src/services/demoUserService.js');
      const { default: dataService } = await import('../src/services/data/dataService.js');
      
      const client = dataService.db.serviceClient;
      
      const [usersCount, pathsCount, templatesCount] = await Promise.all([
        client.from('profiles').select('id', { count: 'exact', head: true }),
        client.from('user_learning_paths').select('id', { count: 'exact', head: true }),
        client.from('learning_path_templates').select('id', { count: 'exact', head: true })
      ]);
      
      const demoStats = await demoUserService.getDemoUserStats();
      
      console.log('📈 System Statistics:');
      console.log(`   Total Users: ${usersCount.count}`);
      console.log(`   Learning Paths: ${pathsCount.count}`);
      console.log(`   Templates: ${templatesCount.count}`);
      console.log('\n🎭 Demo User Status:');
      console.log(`   Onboarding Complete: ${demoStats?.onboardingComplete ? '✅' : '❌'}`);
      console.log(`   Skills Count: ${demoStats?.skillsCount || 0}`);
      console.log(`   Goals Count: ${demoStats?.goalsCount || 0}`);
      console.log(`   Has Learning Path: ${demoStats?.hasLearningPath ? '✅' : '❌'}`);
      
    } else {
      console.log('🛠️ Quick Reset Tool Usage:');
      console.log('\nCommands:');
      console.log('  node scripts/quickReset.js demo           - Reset demo user');
      console.log('  node scripts/quickReset.js user <USER_ID> - Reset specific user');
      console.log('  node scripts/quickReset.js stats          - Show system stats');
      console.log('\nExamples:');
      console.log('  node scripts/quickReset.js demo');
      console.log('  node scripts/quickReset.js user 123e4567-e89b-12d3-a456-426614174000');
      console.log('  node scripts/quickReset.js stats');
    }

  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    console.error('📍 Make sure your backend is set up and environment variables are loaded.');
  }
}

quickReset().then(() => process.exit(0));