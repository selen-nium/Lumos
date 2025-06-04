import llmService from '../core/llmService.js';
import promptService from './promptService.js';
import embeddingService from '../embeddingService.js';
import userProfileService from '../userProfileService.js';

class RAGOrchestrator {
  /**
   * Main RAG pipeline: Retrieve context → Generate response
   */
  async processQuery(userId, query, options = {}) {
    try {
      console.log("🤖 Starting RAG pipeline for user:", userId);
      console.log("📝 Query:", query.substring(0, 100) + (query.length > 100 ? '...' : ''));

      // Get user context
      const userContext = await userProfileService.createUserContext(userId);
      
      // Handle different response types
      const responseType = options.responseType || 'chat';
      
      // Special handlers for specific response types
      if (responseType === 'progress_analysis' && options.roadmapContext) {
        return await this.generateProgressAnalysis(query, userContext, options);
      }
      
      if (responseType === 'study_planning' && options.roadmapContext) {
        return await this.generateStudyPlan(query, userContext, options);
      }
      
      // Regular RAG pipeline
      const retrievedContext = await this.retrieveRelevantContext(query, userContext);
      const response = await this.generateResponse(query, retrievedContext, userContext, options);
      
      return response;
    } catch (error) {
      console.error('❌ RAG pipeline error:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant context based on the query and user profile
   */
  async retrieveRelevantContext(query, userContext) {
    try {
      console.log("🔍 Retrieving relevant context...");
      
      // Prepare search options based on user profile
      const searchOptions = {
        maxDifficulty: userContext.preferredDifficulty + 1,
        userSkills: userContext.skills.map(s => s.id),
        similarityThreshold: 0.25,
        limit: 10
      };

      // Perform multi-content search in parallel
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
      // Return empty context rather than failing
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

      // Create enhanced system prompt with all context
      let systemPrompt = promptService.createContextualSystemPrompt(
        retrievedContext, 
        userContext, 
        responseType
      );
      
      // Add roadmap context if available
      if (roadmapContext) {
        systemPrompt += `\n\nUser's Current Learning Progress:
- Roadmap: ${roadmapContext.title}
- Progress: ${roadmapContext.completedModules}/${roadmapContext.totalModules} modules completed (${roadmapContext.completedPercentage}%)
- Total estimated time: ${roadmapContext.totalHours} hours`;
      }
      
      // Add recent chat history for context
      if (chatHistory.length > 0) {
        systemPrompt += `\n\nRecent conversation context:`;
        chatHistory.slice(-3).forEach((msg, i) => {
          systemPrompt += `\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
        });
      }

      // Generate response using LLM service
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
   * Generate progress analysis response
   */
  async generateProgressAnalysis(query, userContext, options) {
    try {
      console.log("📊 Generating progress analysis...");
      
      const { roadmapContext, modulesContext } = options;
      
      const progressPrompt = promptService.getProgressAnalysisPrompt(
        query, 
        userContext, 
        roadmapContext, 
        modulesContext
      );

      const result = await llmService.generateWithSystemPrompt(
        promptService.getDefaultSystemPrompt(),
        progressPrompt,
        {
          temperature: 0.3,
          max_tokens: 600
        }
      );
      
      return {
        response: result.content,
        context: {
          query,
          responseType: 'progress_analysis',
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
   * Generate study plan response
   */
  async generateStudyPlan(query, userContext, options) {
    try {
      console.log("📅 Generating study plan...");
      
      const { roadmapContext, modulesContext } = options;
      
      const planPrompt = promptService.getStudyPlanningPrompt(
        query,
        userContext,
        roadmapContext,
        modulesContext
      );

      const result = await llmService.generateWithSystemPrompt(
        promptService.getStudyPlanningEnhancementSystemPrompt(),
        planPrompt,
        {
          temperature: 0.2,
          max_tokens: 800
        }
      );
      
      return {
        response: result.content,
        context: {
          query,
          responseType: 'study_planning',
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
   * Generate initial roadmap for new users
   */
  async generateInitialRoadmap(userId, profileData) {
    try {
      console.log("🗺️ Generating initial roadmap for user:", userId);
      
      const userContext = await userProfileService.createUserContext(userId);
      console.log("📝 Generating custom roadmap (template matching skipped)...");
      
      // Get matching template paths from vector database
    //   const templatePaths = await embeddingService.getMatchingTemplatePaths(
    //     userContext.goals.map(g => g.id), 
    //     userContext.skills.map(s => s.id),
    //     {
    //       preferredDifficulty: userContext.preferredDifficulty,
    //       maxDurationWeeks: profileData.maxDurationWeeks || 12
    //     }
    //   ).catch(err => {
    //     console.warn('Template path search failed:', err.message);
    //     return [];
    //   });

      const roadmap = await this.generateCustomRoadmap(userContext, profileData);
      
    //   if (!templatePaths.length) {
    //     // Generate custom roadmap from scratch
    //     console.log("📝 No templates found, generating custom roadmap...");
    //     roadmap = await this.generateCustomRoadmap(userContext, profileData);
    //   } else {
    //     // Use the most relevant template path as base
    //     console.log("📋 Customizing template roadmap...");
    //     const basePath = templatePaths[0];
    //     roadmap = await this.customizeTemplatePath(basePath, userContext, profileData);
    //   }

      // Remove redundant modules based on user's existing skills
      const finalRoadmap = this.removeRedundantModules(roadmap, userContext.skills);
      
      console.log("✅ Initial roadmap generated successfully");
      
      return { roadmap: finalRoadmap };
    } catch (error) {
      console.error('❌ Initial roadmap generation error:', error);
      throw error;
    }
  }

  /**
   * Generate a custom roadmap from scratch using LLM
   */
  async generateCustomRoadmap(userContext, options = {}) {
    try {
      console.log("🎨 Generating custom roadmap...");
      
      const systemPrompt = promptService.getRoadmapGenerationPrompt(userContext);
      
      const query = `Generate a personalized learning roadmap for me. 
I want to focus on: ${userContext.goalsText}. 
My current skills include: ${userContext.skillsText}. 
I can dedicate ${userContext.timeAvailable} hours per week to learning.`;
      
      const result = await llmService.generateStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ], {
        temperature: 0.2,
        max_tokens: 3000
      });
      
      const roadmap = result.parsed;
      console.log("🔍 RAW AI RESPONSE:", JSON.stringify(roadmap, null, 2));
    console.log("🔍 ROADMAP STRUCTURE:", {
    hasPhases: !!roadmap.phases,
    hasModules: !!roadmap.modules,
    phasesLength: roadmap.phases?.length,
    modulesLength: roadmap.modules?.length,
    topLevelKeys: Object.keys(roadmap)
    });

    // Also check if phases contain modules
    if (roadmap.phases) {
    roadmap.phases.forEach((phase, i) => {
        console.log(`🔍 PHASE ${i + 1}:`, {
        title: phase.phase_title,
        modulesCount: phase.modules?.length || 0,
        moduleNames: phase.modules?.map(m => m.module_name) || []
        });
    });
    }
      
      // Add metadata
      roadmap.generationMethod = 'custom';
      roadmap.userContext = {
        skills: userContext.skillsText,
        goals: userContext.goalsText,
        experienceLevel: userContext.experienceLevel
      };
      
      console.log("✅ Custom roadmap generated");
      
      return roadmap;
    } catch (error) {
      console.error('❌ Custom roadmap generation error:', error);
      throw error;
    }
  }

  /**
   * Customize a template path for the specific user
   */
  async customizeTemplatePath(templatePath, userContext, options = {}) {
    try {
      console.log("🔧 Customizing template path...");
      
      const systemPrompt = promptService.getTemplateCustomizationPrompt();
      
      const templateData = JSON.stringify(templatePath, null, 2);
      
      const query = `Customize this learning path template for me:
${templateData}

My profile:
- Skills: ${userContext.skillsText}
- Goals: ${userContext.goalsText}
- Experience level: ${userContext.experienceLevel}
- Time available: ${userContext.timeAvailable} hours per week
- Learning style preference: ${userContext.learningStyle || 'balanced'}`;
      
      const result = await llmService.generateStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ], {
        temperature: 0.3,
        max_tokens: 3000
      });
      
      const customizedPath = result.parsed;
      
      // Add metadata
      customizedPath.generationMethod = 'customizedTemplate';
      customizedPath.baseTemplatePath = templatePath.path_id;
      customizedPath.userContext = {
        skills: userContext.skillsText,
        goals: userContext.goalsText,
        experienceLevel: userContext.experienceLevel
      };
      
      console.log("✅ Template path customized");
      
      return customizedPath;
    } catch (error) {
      console.error('❌ Template customization error:', error);
      // Fallback to the original template path with some user context
      return {
        ...templatePath,
        customization_failed: true,
        generationMethod: 'templateFallback',
        userContext: {
          skills: userContext.skillsText,
          goals: userContext.goalsText,
          experienceLevel: userContext.experienceLevel
        }
      };
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
        console.log(`✂️ Removed ${removedCount} redundant modules from flat structure`);
      }

      if (roadmap.phases) {
        let totalRemoved = 0;
        roadmap.phases = roadmap.phases.map(phase => {
          const originalCount = phase.modules?.length || 0;
          const filteredModules = (phase.modules || []).filter(m => !isRedundant(m));
          const removedCount = originalCount - filteredModules.length;
          totalRemoved += removedCount;
          
          return {
            ...phase,
            modules: filteredModules
          };
        });
        console.log(`✂️ Removed ${totalRemoved} redundant modules from phase structure`);
      }

      return roadmap;
    } catch (error) {
      console.error('❌ Error removing redundant modules:', error);
      return roadmap; // Return original roadmap if cleanup fails
    }
  }

  /**
   * Process roadmap modifications
   */
  async processRoadmapModification(userId, modificationRequest, editType, options = {}) {
    try {
      console.log("🔧 Processing roadmap modification:", { userId, editType });
      
      const { userContext, roadmapContext, modulesContext } = options;
      
      // Generate the modified roadmap
      const modifiedRoadmap = await this.generateModifiedRoadmap(
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

      console.log("✅ Roadmap modification processed");

      return {
        response: explanationResponse,
        roadmapUpdated: true,
        updateDetails: {
          modificationType: editType,
          changesApplied: modifiedRoadmap.changesApplied,
          newStructure: {
            totalModules: modifiedRoadmap.modules?.length || 
                         modifiedRoadmap.phases?.reduce((total, phase) => total + (phase.modules?.length || 0), 0),
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
   * Generate modified roadmap based on user request
   */
  async generateModifiedRoadmap(modificationRequest, editType, context) {
    try {
      console.log("🤖 Generating modified roadmap with AI...");
      
      const { userContext, roadmapContext, modulesContext } = context;
      
      const modificationPrompt = promptService.getRoadmapModificationPrompt(
        modificationRequest,
        editType,
        userContext,
        roadmapContext,
        modulesContext
      );

      const result = await llmService.generateStructuredOutput([
        { 
          role: 'system', 
          content: promptService.getRoadmapModificationSystemPrompt() 
        },
        { 
          role: 'user', 
          content: modificationPrompt 
        }
      ], {
        temperature: 0.3,
        max_tokens: 3000
      });

      const modifiedRoadmap = result.parsed;
      
      // Add metadata
      modifiedRoadmap.modification_type = editType;
      modifiedRoadmap.modified_at = new Date().toISOString();
      modifiedRoadmap.original_request = modificationRequest;
      modifiedRoadmap.generationMethod = 'userModification';
      
      console.log("✅ Modified roadmap generated");
      
      return modifiedRoadmap;
    } catch (error) {
      console.error('❌ Modified roadmap generation error:', error);
      throw new Error('Failed to generate valid modified roadmap');
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
   * Health check for the RAG system
   */
  async healthCheck() {
    try {
      console.log("🔍 Performing RAG system health check...");
      
      const checks = {
        llmService: await llmService.healthCheck(),
        embeddingService: 'available', // You can implement this
        timestamp: new Date().toISOString()
      };

      const allHealthy = checks.llmService.status === 'healthy';

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        checks,
        capabilities: {
          chatGeneration: checks.llmService.status === 'healthy',
          roadmapGeneration: checks.llmService.status === 'healthy',
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