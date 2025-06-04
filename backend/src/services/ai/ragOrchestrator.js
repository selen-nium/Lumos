import llmService from '../core/llmService.js';
import promptService from './promptService.js';
import embeddingService from '../embeddingService.js';
import userProfileService from '../userProfileService.js';
import { schemas } from '../../schemas/roadmapSchema.js'

class RAGOrchestrator {
  /**
   * Main RAG: Retrieve context → Generate response
   */
  async processQuery(userId, query, options = {}) {
    try {
      console.log("🤖 Starting RAG pipeline for user:", userId);
      console.log("📝 Query:", query.substring(0, 100) + (query.length > 100 ? '...' : ''));

      // Get user context
      const userContext = await userProfileService.createUserContext(userId);
      
      // Handle different response types
      const responseType = options.responseType || 'chat';
      
      // Special handlers for structured responses
      if (responseType === 'progress_analysis' && options.roadmapContext) {
        return await this.generateProgressAnalysisWithSchema(query, userContext, options);
      }
      
      if (responseType === 'study_planning' && options.roadmapContext) {
        return await this.generateStudyPlanWithSchema(query, userContext, options);
      }
      
      // Regular RAG pipeline for general chat
      const retrievedContext = await this.retrieveRelevantContext(query, userContext);
      const response = await this.generateResponse(query, retrievedContext, userContext, options);
      
      return response;
    } catch (error) {
      console.error('❌ RAG pipeline error:', error);
      throw error;
    }
  }

  /**
   * Generate initial roadmap
   */
  async generateInitialRoadmap(userId, profileData) {
    try {
      console.log("🗺️ Generating initial roadmap with schema for user:", userId);
      
      const userContext = await userProfileService.createUserContext(userId);
      console.log("📝 Generating custom roadmap with schema validation...");
      
      const roadmap = await this.generateCustomRoadmapWithSchema(userContext, profileData);
      
      // Remove redundant modules based on user's existing skills
      const finalRoadmap = this.removeRedundantModules(roadmap, userContext.skills);
      
      console.log("✅ Initial roadmap generated successfully with schema");
      
      return { roadmap: finalRoadmap };
    } catch (error) {
      console.error('❌ Initial roadmap generation error:', error);
      throw error;
    }
  }

  /**
   * Generate custom roadmap
   */
  async generateCustomRoadmapWithSchema(userContext, options = {}) {
    try {
      console.log("🎨 Generating custom roadmap with schema validation...");
      
      const systemPrompt = promptService.getRoadmapGenerationPrompt(userContext);
      
      const query = `Generate a personalized learning roadmap for me. 
I want to focus on: ${userContext.goalsText}. 
My current skills include: ${userContext.skillsText}. 
I can dedicate ${userContext.timeAvailable} hours per week to learning.`;
      
      // Use schema-based generation
      const result = await llmService.generateRoadmapWithSchema(
        systemPrompt,
        query,
        schemas.roadmapGeneration,
        {
          temperature: 0.2,
          max_tokens: 4000
        }
      );
      
      const roadmap = result.parsed;
      
      console.log("🔍 RAW AI RESPONSE WITH SCHEMA:", {
        finishReason: result.finishReason,
        tokensUsed: result.usage?.total_tokens,
        schemaUsed: result.schemaUsed
      });
      
      console.log("🔍 ROADMAP STRUCTURE WITH SCHEMA:", {
        title: roadmap.roadmap_title,
        modulesCount: roadmap.modules?.length || 0,
        hasValidStructure: !!(roadmap.modules && Array.isArray(roadmap.modules)),
        overallDifficulty: roadmap.overall_difficulty,
        estimatedWeeks: roadmap.estimated_completion_weeks
      });

      // Debug each module's content in detail
      if (roadmap.modules && Array.isArray(roadmap.modules)) {
        roadmap.modules.forEach((module, i) => {
          console.log(`🔍 MODULE ${i + 1} WITH SCHEMA:`, {
            name: module.module_name,
            resourcesCount: module.resources?.length || 0,
            tasksCount: module.tasks?.length || 0,
            difficulty: module.difficulty,
            estimatedHours: module.estimated_hours
          });
          
          // Log actual resources
          if (module.resources && Array.isArray(module.resources)) {
            console.log(`📚 Resources for ${module.module_name}:`);
            module.resources.forEach((resource, j) => {
              console.log(`  ${j + 1}. ${resource.resource_title} (${resource.resource_type}) - ${resource.estimated_time_minutes}min`);
            });
          }
          
          // Log actual tasks
          if (module.tasks && Array.isArray(module.tasks)) {
            console.log(`✏️ Tasks for ${module.module_name}:`);
            module.tasks.forEach((task, j) => {
              console.log(`  ${j + 1}. ${task.task_title} (${task.task_type}) - ${task.estimated_time_minutes}min`);
            });
          }
        });
      }
      
      // Add metadata
      roadmap.generationMethod = 'custom_with_schema';
      roadmap.userContext = {
        skills: userContext.skillsText,
        goals: userContext.goalsText,
        experienceLevel: userContext.experienceLevel
      };
      
      console.log("✅ Custom roadmap generated with schema validation");
      return roadmap;
      
    } catch (error) {
      console.error('❌ Custom roadmap generation error:', error);
      throw error;
    }
  }

  /**
   * Process roadmap modifications using schema
   */
  async processRoadmapModification(userId, modificationRequest, editType, options = {}) {
    try {
      console.log("🔧 Processing roadmap modification with schema:", { userId, editType });
      
      const { userContext, roadmapContext, modulesContext } = options;
      
      // Generate the modified roadmap using schema
      const modifiedRoadmap = await this.generateModifiedRoadmapWithSchema(
        modificationRequest,
        editType,
        { userContext, roadmapContext, modulesContext, userId }
      );

      // Generate response explaining the changes
      const explanationResponse = await this.generateModificationExplanation(
        modificationRequest,
        editType,
        modifiedRoadmap,
        userContext
      );

      console.log("✅ Roadmap modification processed with schema");

      return {
        response: explanationResponse,
        roadmapUpdated: true,
        updateDetails: {
          modificationType: editType,
          changesApplied: modifiedRoadmap.changesApplied,
          newStructure: {
            totalModules: modifiedRoadmap.modules?.length || 0,
            estimatedWeeks: modifiedRoadmap.estimated_duration_weeks,
            difficultyLevel: modifiedRoadmap.overall_difficulty
          }
        },
        modifiedRoadmap
      };
    } catch (error) {
      console.error('❌ Roadmap modification error:', error);
      return {
        response: "I understand you'd like to modify your roadmap, but I'm having trouble processing that request right now. Could you try rephrasing your request?",
        roadmapUpdated: false,
        updateDetails: null
      };
    }
  }

  /**
   * Generate modified roadmap
   */
  async generateModifiedRoadmapWithSchema(modificationRequest, editType, context) {
    try {
      console.log("🤖 Generating modified roadmap with schema validation...");
      
      const { userContext, roadmapContext, modulesContext } = context;
      
      const modificationPrompt = promptService.getRoadmapModificationPrompt(
        modificationRequest,
        editType,
        userContext,
        roadmapContext,
        modulesContext
      );

      const result = await llmService.generateRoadmapModificationWithSchema(
        promptService.getRoadmapModificationSystemPrompt(),
        modificationPrompt,
        schemas.roadmapModification,
        {
          temperature: 0.3,
          max_tokens: 4000
        }
      );

      const modifiedRoadmap = result.parsed;
      
      console.log("🔍 MODIFIED ROADMAP WITH SCHEMA:", {
        title: modifiedRoadmap.roadmap_title,
        modulesCount: modifiedRoadmap.modules?.length || 0,
        changesApplied: modifiedRoadmap.changesApplied?.length || 0,
        finishReason: result.finishReason,
        schemaUsed: result.schemaUsed
      });
      
      // Add metadata
      modifiedRoadmap.modification_type = editType;
      modifiedRoadmap.modified_at = new Date().toISOString();
      modifiedRoadmap.original_request = modificationRequest;
      modifiedRoadmap.generationMethod = 'userModification_with_schema';
      
      console.log("✅ Modified roadmap generated with schema validation");
      return modifiedRoadmap;
    } catch (error) {
      console.error('❌ Modified roadmap generation error:', error);
      throw new Error('Failed to generate valid modified roadmap');
    }
  }

  /**
   * Generate progress analysis
   */
  async generateProgressAnalysisWithSchema(query, userContext, options) {
    try {
      console.log("📊 Generating progress analysis with schema...");
      
      const { roadmapContext, modulesContext } = options;
      
      const progressPrompt = promptService.getProgressAnalysisPrompt(
        query, 
        userContext, 
        roadmapContext, 
        modulesContext
      );

      const result = await llmService.generateProgressAnalysisWithSchema(
        promptService.getDefaultSystemPrompt(),
        progressPrompt,
        schemas.progressAnalysis,
        {
          temperature: 0.3,
          max_tokens: 1500
        }
      );
      
      return {
        response: result.parsed.analysis,
        context: {
          query,
          responseType: 'progress_analysis',
          achievements: result.parsed.achievements,
          strengths: result.parsed.strengths,
          recommendations: result.parsed.recommendations,
          motivationMessage: result.parsed.motivation_message,
          userProgress: {
            completedModules: roadmapContext?.completedModules || 0,
            totalModules: roadmapContext?.totalModules || 0,
            completedPercentage: roadmapContext?.completedPercentage || 0
          },
          usage: result.usage
        }
      };
    } catch (error) {
      console.error('❌ Progress analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate study plan
   */
  async generateStudyPlanWithSchema(query, userContext, options) {
    try {
      console.log("📅 Generating study plan with schema...");
      
      const { roadmapContext, modulesContext } = options;
      
      const planPrompt = promptService.getStudyPlanningPrompt(
        query,
        userContext,
        roadmapContext,
        modulesContext
      );

      const result = await llmService.generateStudyPlanWithSchema(
        promptService.getStudyPlanningEnhancementSystemPrompt(),
        planPrompt,
        schemas.studyPlan,
        {
          temperature: 0.2,
          max_tokens: 2000
        }
      );
      
      return {
        response: `Here's your personalized study plan: ${result.parsed.plan_title}`,
        context: {
          query,
          responseType: 'study_planning',
          studyPlan: result.parsed,
          nextModules: modulesContext?.filter(m => !m.isCompleted).slice(0, 3).map(m => m.name) || [],
          availableTime: userContext.timeAvailable,
          usage: result.usage
        }
      };
    } catch (error) {
      console.error('❌ Study plan generation error:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant context
   */
  async retrieveRelevantContext(query, userContext) {
    try {
      console.log("🔍 Retrieving relevant context...");
      
      const searchOptions = {
        maxDifficulty: userContext.preferredDifficulty + 1,
        userSkills: userContext.skills.map(s => s.id),
        similarityThreshold: 0.25,
        limit: 10
      };

      const [moduleResults, resourceResults, taskResults] = await Promise.all([
        embeddingService.findSimilarModules(query, searchOptions).catch(err => {
          console.warn('Module search failed:', err.message);
          return [];
        }),
        embeddingService.findSimilarResources(query, {
          ...searchOptions,
          preferredTypes: userContext.learningStyle === 'visual' ? ['video', 'interactive'] : null,
          limit: 5
        }).catch(err => {
          console.warn('Resource search failed:', err.message);
          return [];
        }),
        embeddingService.findSimilarTasks(query, {
          ...searchOptions,
          maxTimeMinutes: userContext.timeAvailable * 60,
          limit: 3
        }).catch(err => {
          console.warn('Task search failed:', err.message);
          return [];
        })
      ]);

      console.log("✅ Context retrieved:", {
        modules: moduleResults.length,
        resources: resourceResults.length,
        tasks: taskResults.length
      });

      return {
        relevantModules: moduleResults,
        relevantResources: resourceResults,
        relevantTasks: taskResults,
        retrievalTimestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Context retrieval error:', error);
      return {
        relevantModules: [],
        relevantResources: [],
        relevantTasks: [],
        retrievalTimestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate response using the LLM with retrieved context
   */
  async generateResponse(query, retrievedContext, userContext, options = {}) {
    try {
      console.log("💭 Generating AI response...");
      
      const {
        temperature = 0.2,
        responseType = 'chat',
        maxTokens = 800,
        chatHistory = [],
        roadmapContext,
        modulesContext
      } = options;

      const systemPrompt = promptService.createContextualSystemPrompt(
        retrievedContext, 
        userContext, 
        responseType
      );
      
      if (roadmapContext) {
        systemPrompt += `\n\nUser's Current Learning Progress:
- Roadmap: ${roadmapContext.title}
- Progress: ${roadmapContext.completedModules}/${roadmapContext.totalModules} modules completed (${roadmapContext.completedPercentage}%)
- Total estimated time: ${roadmapContext.totalHours} hours`;
      }
      
      if (chatHistory.length > 0) {
        systemPrompt += `\n\nRecent conversation context:`;
        chatHistory.slice(-3).forEach((msg, i) => {
          systemPrompt += `\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
        });
      }

      const result = await llmService.generateWithSystemPrompt(
        systemPrompt,
        query,
        {
          temperature,
          max_tokens: maxTokens
        }
      );

      console.log("✅ AI response generated successfully");

      return {
        response: result.content,
        context: {
          query,
          responseType,
          userContext: {
            skills: userContext.skillsText,
            goals: userContext.goalsText,
            experienceLevel: userContext.experienceLevel
          },
          retrievedContext: {
            moduleCount: retrievedContext.relevantModules?.length || 0,
            resourceCount: retrievedContext.relevantResources?.length || 0,
            taskCount: retrievedContext.relevantTasks?.length || 0
          },
          roadmapProgress: roadmapContext ? {
            completedPercentage: roadmapContext.completedPercentage,
            completedModules: roadmapContext.completedModules,
            totalModules: roadmapContext.totalModules
          } : null,
          usage: result.usage
        }
      };
    } catch (error) {
      console.error('❌ Response generation error:', error);
      throw error;
    }
  }

  /**
   * Remove redundant modules based on user's existing skills 
   */
  removeRedundantModules(roadmap, knownSkills = []) {
    try {
      console.log("🧹 Removing redundant modules...");
      
      const knownSkillNames = knownSkills.map(s => s.name.toLowerCase());

      const isRedundant = (module) =>
        module.skills_covered?.some(skill =>
          knownSkillNames.includes(skill.toLowerCase())
        );

      if (roadmap.modules) {
        const originalCount = roadmap.modules.length;
        roadmap.modules = roadmap.modules.filter(m => !isRedundant(m));
        const removedCount = originalCount - roadmap.modules.length;
        console.log(`✂️ Removed ${removedCount} redundant modules`);
      }

      return roadmap;
    } catch (error) {
      console.error('❌ Error removing redundant modules:', error);
      return roadmap;
    }
  }

  /**
   * Generate explanation of modifications made
   */
  async generateModificationExplanation(modificationRequest, editType, modifiedRoadmap, userContext) {
    try {
      console.log("📝 Generating modification explanation...");
      
      const explanationPrompt = promptService.getModificationExplanationPrompt(
        modificationRequest,
        editType,
        modifiedRoadmap
      );

      const result = await llmService.generateWithSystemPrompt(
        promptService.getChatEnhancementSystemPrompt(),
        explanationPrompt,
        {
          temperature: 0.4,
          max_tokens: 500
        }
      );

      return result.content;
    } catch (error) {
      console.error('❌ Modification explanation error:', error);
      return `I've made the requested changes to your roadmap. The modifications include ${modifiedRoadmap.changesApplied?.join(', ') || 'general improvements'}.`;
    }
  }

  /**
   * Health check for RAG system
   */
  async healthCheck() {
    try {
      console.log("🔍 Performing RAG system health check...");
      
      const checks = {
        llmService: await llmService.healthCheck(),
        embeddingService: 'available',
        timestamp: new Date().toISOString()
      };

      const allHealthy = checks.llmService.status === 'healthy';

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        checks,
        capabilities: {
          chatGeneration: checks.llmService.status === 'healthy',
          roadmapGeneration: checks.llmService.status === 'healthy',
          schemaValidation: checks.llmService.structuredOutputsSupported || false,
          contextRetrieval: true,
          progressAnalysis: checks.llmService.status === 'healthy'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default new RAGOrchestrator();