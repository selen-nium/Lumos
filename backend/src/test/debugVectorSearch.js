// backend/src/test/debugVectorSearch.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function debugVectorSearch() {
  try {
    console.log('🔍 Debugging Vector Search System...\n');

    // Import services
    const { default: learningPathTemplateService } = await import('../services/learningPathTemplateService.js');
    const { default: supabaseService } = await import('../services/core/supabaseService.js');

    // 1. Check if we have the SQL function
    console.log('1️⃣ Checking if vector search function exists...');
    try {
      const { data, error } = await supabaseService.serviceClient
        .rpc('find_similar_learning_paths', {
          query_embedding: '[0.1,0.2,0.3]',
          similarity_threshold: 0.5,
          match_limit: 1
        });
      
      if (error) {
        console.log('❌ Vector search function missing or broken:', error.message);
        console.log('💡 You need to run the SQL functions in your Supabase SQL editor first!');
        
        console.log('\n📝 Please run this SQL in your Supabase dashboard:');
        console.log(`
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the search function
CREATE OR REPLACE FUNCTION find_similar_learning_paths(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.78,
  match_limit int DEFAULT 5
)
RETURNS TABLE (
  template_id uuid,
  template_name text,
  template_description text,
  difficulty_level text,
  estimated_duration_weeks int,
  target_skills text[],
  target_goals text[],
  usage_count int,
  path_data jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lpt.template_id,
    lpt.template_name,
    lpt.template_description,
    lpt.difficulty_level,
    lpt.estimated_duration_weeks,
    lpt.target_skills,
    lpt.target_goals,
    lpt.usage_count,
    lpt.path_data,
    (lpt.path_embedding <=> query_embedding) * -1 + 1 AS similarity
  FROM learning_path_templates lpt
  WHERE lpt.path_embedding IS NOT NULL
    AND (1 - (lpt.path_embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY lpt.path_embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;
        `);
        return;
      } else {
        console.log('✅ Vector search function exists and working');
      }
    } catch (funcError) {
      console.log('❌ Function test failed:', funcError.message);
      return;
    }

    // 2. Check templates in database
    console.log('\n2️⃣ Checking templates in database...');
    const { data: templates, error: templatesError } = await supabaseService.serviceClient
      .from('learning_path_templates')
      .select('template_id, template_name, path_embedding, target_skills, target_goals');

    if (templatesError) {
      console.log('❌ Error fetching templates:', templatesError);
      return;
    }

    console.log(`📊 Found ${templates.length} templates in database:`);
    templates.forEach((template, i) => {
      console.log(`  ${i + 1}. "${template.template_name}"`);
      console.log(`     ID: ${template.template_id}`);
      console.log(`     Has embedding: ${template.path_embedding ? '✅' : '❌'}`);
      console.log(`     Skills: ${template.target_skills?.join(', ') || 'None'}`);
      console.log(`     Goals: ${template.target_goals?.join(', ') || 'None'}`);
    });

    if (templates.length === 0) {
      console.log('\n⚠️ No templates found. Let\'s seed some...');
      await learningPathTemplateService.seedInitialTemplates();
      console.log('✅ Templates seeded. Please run this test again.');
      return;
    }

    // 3. Test vector search with different similarity thresholds
    console.log('\n3️⃣ Testing vector search with different similarity thresholds...');
    
    const testUserContext = {
      goalsText: 'Frontend Development, React, JavaScript',
      skillsText: 'HTML, CSS, Basic JavaScript',
      experienceLevel: 'beginner',
      timeAvailable: 8,
      profile: { career_stage: 'student' }
    };

    const userProfileText = learningPathTemplateService.createUserProfileText(testUserContext);
    console.log('📝 User profile text:', userProfileText);

    // Import embedding service
    const { default: embeddingService } = await import('../services/embeddingService.js');
    const userEmbedding = await embeddingService.textToEmbedding(userProfileText);
    
    console.log('🔢 Generated embedding dimensions:', userEmbedding.length);

    // Test with different thresholds
    const thresholds = [0.0, 0.3, 0.5, 0.7, 0.8];
    
    for (const threshold of thresholds) {
      console.log(`\n🎯 Testing with threshold ${threshold}...`);
      
      try {
        const embeddingStr = '[' + userEmbedding.join(',') + ']';
        
        const { data: results, error } = await supabaseService.serviceClient
          .rpc('find_similar_learning_paths', {
            query_embedding: embeddingStr,
            similarity_threshold: threshold,
            match_limit: 5
          });

        if (error) {
          console.log(`❌ Error with threshold ${threshold}:`, error.message);
        } else {
          console.log(`📊 Found ${results.length} results with threshold ${threshold}`);
          results.forEach((result, i) => {
            console.log(`  ${i + 1}. "${result.template_name}" - similarity: ${result.similarity?.toFixed(4)}`);
          });
        }
      } catch (testError) {
        console.log(`❌ Search failed with threshold ${threshold}:`, testError.message);
      }
    }

    // 4. Test template service search function
    console.log('\n4️⃣ Testing template service search function...');
    try {
      const serviceResults = await learningPathTemplateService.findSimilarTemplates(testUserContext, 5);
      console.log(`📊 Template service found ${serviceResults.length} results`);
      serviceResults.forEach((result, i) => {
        console.log(`  ${i + 1}. "${result.template_name}" - similarity: ${result.similarity?.toFixed(4)}`);
      });
    } catch (serviceError) {
      console.log('❌ Template service search failed:', serviceError.message);
    }

    console.log('\n✅ Vector search debugging completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugVectorSearch();