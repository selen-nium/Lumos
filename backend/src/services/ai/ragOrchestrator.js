import llmService from '../core/llmService.js';
import promptService from './promptService.js';
import embeddingService from '../embeddingService.js';
import userProfileService from '../userProfileService.js';
import learningPathTemplateService from '../learningPathTemplateService.js';
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
      console.log("🗺️ Generating initial roadmap with template search for user:", userId);
      
      const userContext = await userProfileService.createUserContext(userId);
      
      // Search for similar templates first
      console.log("🔍 Searching for similar learning path templates...");
      const similarTemplates = await learningPathTemplateService.findSimilarTemplates(
        userContext, 
        3 // Get top 3 templates
      );
      
      if (similarTemplates.length > 0) {
        console.log(`Found ${similarTemplates.length} similar templates`);
        
        // Use the most similar template
        const bestTemplate = similarTemplates[0];
        console.log(`🎯 Using template: "${bestTemplate.template_name}" (similarity: ${bestTemplate.similarity?.toFixed(3)})`);
        
        // Customise the template for user
        const customizedRoadmap = await learningPathTemplateService.customizeTemplate(
          bestTemplate, 
          userContext
        );
        
        console.log("✅ Template customized successfully");
        return { roadmap: customizedRoadmap };
      }
      
      // No similar templates found, generate new roadmap
      console.log("🤖 No similar templates found, generating new roadmap with AI...");
      const newRoadmap = await this.generateCustomRoadmapWithSchema(userContext, profileData);
      
      //Save the new roadmap as a template for future users
      console.log("💾 Saving new roadmap as template for future reuse...");
      await learningPathTemplateService.saveAsTemplate(newRoadmap, userContext);
      
      console.log("✅ New roadmap generated and saved as template");
      return { roadmap: newRoadmap };
      
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
      console.log("🎨 Generating custom roadmap with AI (no templates matched)...");
      
      let systemPrompt = promptService.getRoadmapGenerationPrompt(userContext);
      
      const query = `Generate a personalized learning roadmap for me. 
I want to focus on: ${userContext.goalsText}. 
My current skills include: ${userContext.skillsText}. 
I can dedicate ${userContext.timeAvailable} hours per week to learning.
Experience level: ${userContext.experienceLevel}`;
      
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
      
      console.log("🔍 AI-generated roadmap structure:", {
        title: roadmap.roadmap_title,
        modulesCount: roadmap.modules?.length || 0,
        hasValidStructure: !!(roadmap.modules && Array.isArray(roadmap.modules)),
        overallDifficulty: roadmap.overall_difficulty,
        estimatedWeeks: roadmap.estimated_completion_weeks
      });

      // Add metadata
      roadmap.generationMethod = 'ai_generated_new';
      roadmap.userContext = {
        skills: userContext.skillsText,
        goals: userContext.goalsText,
        experienceLevel: userContext.experienceLevel
      };
      
      console.log("✅ Custom roadmap generated with AI");
      return roadmap;
      
    } catch (error) {
      console.error('❌ Custom roadmap generation error:', error);
      throw error;
    }
  }

  /**
   * Generate advanced roadmap for completed users
   */
  async generateAdvancedRoadmap(userId, advancedPrompt) {
      try {
          console.log("🚀 Generating advanced roadmap for user:", userId);
          
          // Create system prompt for advanced roadmap
          const systemPrompt = promptService.getAdvancedRoadmapPrompt(advancedPrompt);
          
          const query = `Generate an advanced follow-up roadmap based on my completed learning path: "${advancedPrompt.previousRoadmap}".
          
  My completed skills now include: ${advancedPrompt.completedSkills.join(', ')}.
  My original goals were: ${advancedPrompt.goalsText}.
  Experience level: ${advancedPrompt.experienceLevel}
  Available time: ${advancedPrompt.timeAvailable} hours per week.

  Create a more advanced roadmap that builds upon what I've learned and takes me to the next level in this domain.`;
          
          // Use schema-based generation for consistency
          const result = await llmService.generateRoadmapWithSchema(
              systemPrompt,
              query,
              schemas.roadmapGeneration,
              {
                  temperature: 0.3,
                  max_tokens: 4000
              }
          );
          
          const roadmap = result.parsed;
          
          console.log("🔍 Advanced roadmap structure:", {
              title: roadmap.roadmap_title,
              modulesCount: roadmap.modules?.length || 0,
              hasValidStructure: !!(roadmap.modules && Array.isArray(roadmap.modules)),
              overallDifficulty: roadmap.overall_difficulty
          });

          // Add metadata for advanced roadmap
          roadmap.generationMethod = 'advanced_follow_up';
          roadmap.previousRoadmap = advancedPrompt.previousRoadmap;
          roadmap.userContext = {
              completedSkills: advancedPrompt.completedSkills,
              goals: advancedPrompt.goalsText,
              experienceLevel: advancedPrompt.experienceLevel
          };
          
          console.log("✅ Advanced roadmap generated successfully");
          return { roadmap };
          
      } catch (error) {
          console.error('❌ Advanced roadmap generation error:', error);
          throw error;
      }
  }

  async getRoadmapGenerationStats() {
    try {
      const templateStats = await learningPathTemplateService.healthCheck();
      
      return {
        totalTemplates: templateStats.templatesCount || 0,
        generationMethods: {
          template_reuse: 'Available',
          ai_generation: 'Available',
          hybrid_approach: 'Active'
        },
        averageGenerationTime: '2-5 seconds (with templates)',
        fallbackGenerationTime: '15-30 seconds (AI generation)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting roadmap generation stats:', error);
      return null;
    }
  }

  async initializeTemplates() {
    try {
      console.log("🌱 Initializing learning path templates...");
      await learningPathTemplateService.seedInitialTemplates();
      console.log("✅ Templates initialized successfully");
    } catch (error) {
      console.error('❌ Error initializing templates:', error);
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
        response: result.parsed?.analysis || "I can see you're making great progress with your learning journey! Your dedication to continuous improvement is really showing.",
        context: {
          query,
          responseType: 'progress_analysis',
          achievements: result.parsed?.achievements || ["Consistent learning effort", "Active engagement with material"],
          strengths: result.parsed?.strengths || ["Dedication to improvement", "Self-motivated learning"],
          recommendations: result.parsed?.recommendations || ["Continue with current pace", "Practice regularly", "Ask questions when stuck"],
          motivationMessage: result.parsed?.motivation_message || result.parsed?.motivationMessage || "Keep up the excellent work! Every step forward counts.",
          userProgress: {
            completedModules: roadmapContext?.completedModules || 0,
            totalModules: roadmapContext?.totalModules || 0,
            completedPercentage: roadmapContext?.completedPercentage || 0
          },
          usage: result.usage || { total_tokens: 0 }
        }
      };
    } catch (error) {
      console.error('❌ Progress analysis error:', error);
      
      // Return a fallback response instead of throwing
      return {
        response: "I can see you're making great progress with your learning journey! While I'm having trouble accessing your detailed progress data right now, keep up the excellent work. Your dedication to learning is commendable.",
        context: {
          query,
          responseType: 'progress_analysis',
          achievements: ["Consistent learning effort"],
          strengths: ["Dedication to improvement"],
          recommendations: ["Continue with your current learning pace"],
          motivationMessage: "Every step forward counts!",
          userProgress: {
            completedModules: roadmapContext?.completedModules || 0,
            totalModules: roadmapContext?.totalModules || 0,
            completedPercentage: roadmapContext?.completedPercentage || 0
          },
          usage: { total_tokens: 0 },
          error: 'Fallback response due to processing error'
        }
      };
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

      // FIXED: Use 'let' instead of 'const' for variables that need to be modified
      let systemPrompt = promptService.createContextualSystemPrompt(
        retrievedContext, 
        userContext, 
        responseType
      );
      
      // Now we can safely modify systemPrompt
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
   * Generate explanation of modifications
   */
  async generateModificationExplanation(modificationRequest, editType, modifiedRoadmap, userContext) {
    try {
      console.log("📝 Generating modification explanation...");
      
      // explanation prompt
      const explanationPrompt = `Explain the roadmap modifications that were just made.

  USER REQUEST: "${modificationRequest}"
  MODIFICATION TYPE: ${editType}

  CHANGES APPLIED: ${modifiedRoadmap.changesApplied?.join(', ') || 'Various improvements'}
  NEW STRUCTURE: ${modifiedRoadmap.modules?.length || 0} modules, ${modifiedRoadmap.estimated_duration_weeks || 'N/A'} weeks

  Provide a friendly, encouraging response explaining what was changed and how it will help their learning. Keep it concise and positive. Start with something like "I've successfully updated your roadmap..." and explain the specific improvements made.`;

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
      return `I've successfully updated your roadmap based on your request to ${editType.replace('_', ' ')}! The modifications include ${modifiedRoadmap.changesApplied?.join(', ') || 'general improvements'} to better match your learning goals.`;
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
        templateService: await learningPathTemplateService.healthCheck(),
        timestamp: new Date().toISOString()
      };

      const allHealthy = checks.llmService.status === 'healthy' && 
                        checks.templateService.status === 'healthy';

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        checks,
        capabilities: {
          chatGeneration: checks.llmService.status === 'healthy',
          roadmapGeneration: checks.llmService.status === 'healthy',
          templateSearch: checks.templateService.status === 'healthy',
          schemaValidation: checks.llmService.structuredOutputsSupported || false,
          contextRetrieval: true,
          progressAnalysis: checks.llmService.status === 'healthy'
        },
        performance: {
          templatesAvailable: checks.templateService.templatesCount || 0,
          fastGeneration: checks.templateService.templatesCount > 0
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