import ragOrchestrator from './ai/ragOrchestrator.js';
import llmService from './core/llmService.js';
import supabaseService from './core/supabaseService.js';
import userProfileService from './userProfileService.js';
// import { roadmapDataService } from '../repositories/index.js';
import roadmapDataService from './data/roadmapDataService.js';

class ChatService {
    /**
     * Process a user message and generate a response
     */
    async processUserMessage(userId, message, options = {}) {
        try {
            console.log("🤖 Processing chat message:", {
                userId,
                messageLength: message.length,
                responseType: options.responseType,
                hasRoadmapContext: !!options.roadmapContext
            });

            // Delegate to RAG orchestrator
            const ragResponse = await ragOrchestrator.processQuery(
                userId, 
                message, 
                options
            );
            
            // Return formatted response with metadata
            return {
                message: message,
                response: ragResponse.response,
                context: ragResponse.context,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error processing user message:', error);
            throw error;
        }
    }

    /**
     * Process roadmap modification request
     */
    async processRoadmapModification(userId, message, editType, options = {}) {
        try {
            console.log("🔧 Processing roadmap modification:", {
                userId,
                editType,
                messageLength: message.length
            });

            // Get current roadmap data
            const currentRoadmap = await roadmapDataService.findActiveByUserId(userId);
            if (!currentRoadmap) {
                return {
                    response: "I couldn't find your current learning roadmap. Please make sure you have completed the onboarding process first.",
                    roadmapUpdated: false,
                    updateDetails: null,
                    timestamp: new Date().toISOString()
                };
            }

            // Create backup before modification
            const backupId = await roadmapDataService.backupCurrentRoadmap(userId);
            if (backupId) {
                console.log("💾 Backup created with ID:", backupId);
            }

            // Get user context for modification
            const userContext = await userProfileService.createUserContext(userId);

            // Prepare roadmap context for AI
            const roadmapContext = {
                title: currentRoadmap.path_name,
                totalModules: currentRoadmap.modules?.length || 0,
                completedModules: currentRoadmap.modules?.filter(m => m.is_completed).length || 0,
                modules: currentRoadmap.modules || []
            };

            // Prepare modules context for AI
            const modulesContext = currentRoadmap.modules?.map(module => ({
                id: module.module_id,
                name: module.module_name,
                isCompleted: module.is_completed,
                sequence_order: module.sequence_order,
                difficulty: module.difficulty,
                estimated_hours: module.estimated_hours
            })) || [];

            // Delegate to RAG orchestrator for modification
            const modificationResponse = await ragOrchestrator.processRoadmapModification(
                userId,
                message,
                editType,
                {
                    userContext,
                    roadmapContext,
                    modulesContext,
                    ...options
                }
            );

            // If roadmap was modified, save it to database
            if (modificationResponse.roadmapUpdated && modificationResponse.modifiedRoadmap) {
                try {
                    console.log("💾 Saving modified roadmap to database...");
                    
                    const saveResult = await roadmapDataService.updateUserRoadmap(
                        userId, 
                        modificationResponse.modifiedRoadmap
                    );
                    
                    console.log("✅ Modified roadmap saved successfully:", saveResult);
                    
                    // Add save confirmation to response
                    modificationResponse.response += "\n\n✅ Your roadmap has been updated and saved!";
                    
                } catch (saveError) {
                    console.error("❌ Failed to save modified roadmap:", saveError);
                    
                    // Try to restore from backup if save failed
                    if (backupId) {
                        try {
                            await roadmapDataService.restoreFromBackup(userId, backupId);
                            console.log("🔄 Restored from backup due to save failure");
                        } catch (restoreError) {
                            console.error("❌ Failed to restore from backup:", restoreError);
                        }
                    }
                    
                    return {
                        response: "I generated the modifications for your roadmap, but there was an issue saving the changes. Your original roadmap has been preserved. Please try again.",
                        roadmapUpdated: false,
                        updateDetails: null,
                        timestamp: new Date().toISOString()
                    };
                }
            }

            return {
                response: modificationResponse.response,
                roadmapUpdated: modificationResponse.roadmapUpdated,
                updateDetails: modificationResponse.updateDetails,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error processing roadmap modification:', error);
            
            // Return a helpful error response
            return {
                response: "I understand you'd like to modify your roadmap, but I'm having trouble processing that request right now. Could you try rephrasing your request? For example: 'Can you make my roadmap more challenging?' or 'Add more JavaScript modules to my plan.'",
                roadmapUpdated: false,
                updateDetails: null,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Detect roadmap modification request type
     */
    detectModificationType(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('increase') && (lowerMessage.includes('difficulty') || lowerMessage.includes('challenge'))) {
            return 'increase_difficulty';
        }
        if (lowerMessage.includes('decrease') && (lowerMessage.includes('difficulty') || lowerMessage.includes('easier'))) {
            return 'decrease_difficulty';
        }
        if (lowerMessage.includes('add') && (lowerMessage.includes('module') || lowerMessage.includes('topic'))) {
            return 'add_modules';
        }
        if (lowerMessage.includes('remove') && (lowerMessage.includes('module') || lowerMessage.includes('topic'))) {
            return 'remove_modules';
        }
        if (lowerMessage.includes('faster') || lowerMessage.includes('speed up') || lowerMessage.includes('accelerate')) {
            return 'accelerate_pace';
        }
        if (lowerMessage.includes('slower') || lowerMessage.includes('slow down') || lowerMessage.includes('more time')) {
            return 'slow_pace';
        }
        if (lowerMessage.includes('focus more on') || lowerMessage.includes('emphasize')) {
            return 'change_focus';
        }
        if (lowerMessage.includes('regenerate') || lowerMessage.includes('create new') || lowerMessage.includes('start over')) {
            return 'regenerate';
        }
        
        // General modification if it mentions changing the roadmap/plan
        if ((lowerMessage.includes('change') || lowerMessage.includes('modify') || lowerMessage.includes('update')) && 
            (lowerMessage.includes('roadmap') || lowerMessage.includes('plan') || lowerMessage.includes('path'))) {
            return 'general_modification';
        }
        
        return null;
    }

    /**
     * Generate roadmap from user profile during onboarding
     */
    async generateInitialRoadmap(userId, options = {}) {
        try {
            console.log("🗺️ Generating initial roadmap for user:", userId);
            
            // Delegate to RAG orchestrator
            const roadmapResult = await ragOrchestrator.generateInitialRoadmap(userId, options);
            
            return {
                success: true,
                roadmap: roadmapResult.roadmap,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating initial roadmap:', error);
            throw error;
        }
    }

    /**
     * Get chat completion suggestions for user input
     */
    async getSuggestions(userId, partialInput) {
        try {
            if (!partialInput || partialInput.trim().length < 3) {
                return this.getDefaultSuggestions(userId);
            }
            
            // Get user context for personalized suggestions
            const userContext = await userProfileService.createUserContext(userId);
            
            // Create specialized prompt for suggestions
            const prompt = `
                Based on a user starting to type: "${partialInput.trim()}"
                
                Generate 3 potential completions for what they might be asking about.
                Consider that this user is learning tech skills with these goals: ${userContext.goalsText}.
                Their current skills include: ${userContext.skillsText}.
                
                The suggestions should be:
                1. Complete questions or requests (not just keywords)
                2. Relevant to learning programming, web development, or tech skills
                3. Helpful for their current learning journey
                4. Include roadmap modification options when appropriate
                
                Examples of good suggestions:
                - "How can I improve my JavaScript skills?"
                - "What should I learn after completing React basics?"
                - "Can you create a study schedule for this week?"
                - "Make my roadmap more challenging"
                - "Add more hands-on projects to my plan"
                
                Return ONLY a JSON object with this format:
                {
                  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
                }
            `;
            
            // Use LLM service for suggestions
            const result = await llmService.generateStructuredOutput([
                { 
                    role: 'system', 
                    content: 'You generate helpful autocomplete suggestions for a tech learning platform chat. Always respond with valid JSON.' 
                },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.7,
                max_tokens: 150
            });
            
            return Array.isArray(result.parsed.suggestions) ? result.parsed.suggestions : [];
            
        } catch (error) {
            console.error('Error generating suggestions:', error);
            return this.getDefaultSuggestions(userId);
        }
    }

    /**
     * Get default suggestions when AI fails or for new users
     */
    async getDefaultSuggestions(userId) {
        try {
            const userContext = await userProfileService.createUserContext(userId);
            
            const suggestions = [
                "Can you summarize my learning progress?",
                "What should I focus on next in my roadmap?",
                "Help me create a study schedule for this week"
            ];

            // Add modification suggestions
            suggestions.push("Make my roadmap more challenging");
            suggestions.push("Add more practical projects to my plan");
            suggestions.push("Slow down the pace for better understanding");

            // Customize based on user's experience level
            if (userContext.experienceLevel === 'beginner') {
                suggestions.push("What are the most important concepts for beginners?");
            } else {
                suggestions.push("What advanced topics should I explore?");
            }

            return suggestions.slice(0, 3);
        } catch (error) {
            console.error('Error getting default suggestions:', error);
            return [
                "Can you help me with my learning plan?",
                "What should I study next?",
                "How am I doing with my progress?",
                "Make my roadmap more challenging"
            ];
        }
    }

    /**
     * Analyze user's learning progress and provide insights
     */
    async analyzeProgress(userId, roadmapContext, modulesContext) {
        try {
            if (!roadmapContext || !modulesContext) {
                return "I don't have access to your current progress data. Please make sure you have an active learning roadmap.";
            }

            // Use RAG orchestrator for progress analysis
            const result = await ragOrchestrator.processQuery(
                userId,
                "Can you analyze my learning progress and provide insights?",
                {
                    responseType: 'progress_analysis',
                    roadmapContext,
                    modulesContext
                }
            );

            return result.response;
        } catch (error) {
            console.error('Error analyzing progress:', error);
            return "I'm having trouble analyzing your progress right now. You're doing great by staying consistent with your learning! Keep up the good work.";
        }
    }

    /**
     * Generate study schedule based on user's available time and roadmap
     */
    async generateStudySchedule(userId, roadmapContext, modulesContext, timeframe = 'week') {
        try {
            // Use RAG orchestrator for study planning
            const result = await ragOrchestrator.processQuery(
                userId,
                `Create a ${timeframe}ly study schedule for me`,
                {
                    responseType: 'study_planning',
                    roadmapContext,
                    modulesContext
                }
            );

            return result.response;
        } catch (error) {
            console.error('Error generating study schedule:', error);
            const userContext = await userProfileService.createUserContext(userId);
            return `Based on your ${userContext.timeAvailable} hours per week, I recommend dedicating about ${Math.floor(userContext.timeAvailable / 3)} hours every few days to stay consistent. Focus on one module at a time and don't forget to practice what you learn!`;
        }
    }

    /**
     * Get roadmap modification history
     */
    async getModificationHistory(userId) {
        try {
            console.log("📜 Getting roadmap modification history for user:", userId);
            return await roadmapDataService.getModificationHistory(userId);
        } catch (error) {
            console.error('Error getting modification history:', error);
            return { history: [], lastModified: null, created: null };
        }
    }

    /**
     * Validate roadmap modification request
     */
    validateModificationRequest(message, editType) {
        const validationRules = {
            'increase_difficulty': () => {
                return message.toLowerCase().includes('difficulty') || 
                    message.toLowerCase().includes('challenge') ||
                    message.toLowerCase().includes('advanced') ||
                    message.toLowerCase().includes('harder');
            },
            'decrease_difficulty': () => {
                return message.toLowerCase().includes('easier') ||
                    message.toLowerCase().includes('simpler') ||
                    message.toLowerCase().includes('basic') ||
                    message.toLowerCase().includes('beginner');
            },
            'add_modules': () => {
                return message.toLowerCase().includes('add') &&
                    (message.toLowerCase().includes('module') || 
                        message.toLowerCase().includes('topic') ||
                        message.toLowerCase().includes('skill') ||
                        message.toLowerCase().includes('project'));
            },
            'remove_modules': () => {
                return message.toLowerCase().includes('remove') ||
                    message.toLowerCase().includes('skip') ||
                    message.toLowerCase().includes('exclude') ||
                    message.toLowerCase().includes('delete');
            },
            'accelerate_pace': () => {
                return message.toLowerCase().includes('faster') ||
                    message.toLowerCase().includes('speed') ||
                    message.toLowerCase().includes('accelerate') ||
                    message.toLowerCase().includes('quick');
            },
            'slow_pace': () => {
                return message.toLowerCase().includes('slower') ||
                    message.toLowerCase().includes('slow') ||
                    message.toLowerCase().includes('more time') ||
                    message.toLowerCase().includes('extend');
            },
            'change_focus': () => {
                return message.toLowerCase().includes('focus') ||
                    message.toLowerCase().includes('emphasize') ||
                    message.toLowerCase().includes('concentrate');
            }
        };
        
        const validator = validationRules[editType];
        return validator ? validator() : true; // Default to true for unknown types
    }

    /**
     * Generate quick roadmap modification suggestions
     */
    async generateRoadmapSuggestions(userId, currentProgress) {
        try {
            const userContext = await userProfileService.createUserContext(userId);
            
            const suggestions = [];
            
            // Based on progress level
            if (currentProgress < 25) {
                suggestions.push("Make the roadmap easier for beginners");
                suggestions.push("Add more foundational topics");
                suggestions.push("Slow down the learning pace");
                suggestions.push("Add more guided tutorials");
            } else if (currentProgress > 75) {
                suggestions.push("Add advanced topics to challenge me");
                suggestions.push("Include industry-level projects");
                suggestions.push("Speed up the remaining modules");
                suggestions.push("Add real-world case studies");
            } else {
                suggestions.push("Adjust difficulty to match my progress");
                suggestions.push("Add more hands-on projects");
                suggestions.push("Focus more on practical skills");
                suggestions.push("Include more interactive exercises");
            }
            
            // Based on user goals
            if (userContext.goalsText.toLowerCase().includes('full stack')) {
                suggestions.push("Balance frontend and backend modules equally");
                suggestions.push("Add more full-stack project modules");
            }
            
            if (userContext.goalsText.toLowerCase().includes('frontend')) {
                suggestions.push("Add more UI/UX design modules");
                suggestions.push("Include modern frontend frameworks");
            }

            if (userContext.goalsText.toLowerCase().includes('backend')) {
                suggestions.push("Focus more on server-side technologies");
                suggestions.push("Add database design modules");
            }
            
            return suggestions.slice(0, 6);
            
        } catch (error) {
            console.error('Error generating roadmap suggestions:', error);
            return [
                "Adjust the difficulty level",
                "Add more practical projects",
                "Change the learning pace",
                "Focus on specific technologies",
                "Include more hands-on exercises",
                "Add real-world examples"
            ];
        }
    }

    /**
     * Preview roadmap modification without saving
     */
    async previewRoadmapModification(userId, message, editType) {
        try {
            console.log("👁️ Generating roadmap modification preview:", { userId, editType });

            // Get current roadmap data
            const currentRoadmap = await roadmapDataService.findActiveByUserId(userId);
            if (!currentRoadmap) {
                throw new Error("No active roadmap found");
            }

            // Get user context
            const userContext = await userProfileService.createUserContext(userId);

            // Prepare contexts (same as full modification)
            const roadmapContext = {
                title: currentRoadmap.path_name,
                totalModules: currentRoadmap.modules?.length || 0,
                completedModules: currentRoadmap.modules?.filter(m => m.is_completed).length || 0,
                modules: currentRoadmap.modules || []
            };

            const modulesContext = currentRoadmap.modules?.map(module => ({
                id: module.module_id,
                name: module.module_name,
                isCompleted: module.is_completed,
                sequence_order: module.sequence_order,
                difficulty: module.difficulty,
                estimated_hours: module.estimated_hours
            })) || [];

            // Generate modification (without saving)
            const modificationResponse = await ragOrchestrator.processRoadmapModification(
                userId,
                message,
                editType,
                {
                    userContext,
                    roadmapContext,
                    modulesContext,
                    previewMode: true // Flag for preview
                }
            );

            return {
                preview: modificationResponse.response,
                changes: modificationResponse.updateDetails,
                modifiedStructure: modificationResponse.modifiedRoadmap,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error generating roadmap preview:', error);
            throw error;
        }
    }

    /**
     * Fallback: Process any general user message with open-ended AI
     */
    async processGeneralMessage(userId, message) {
        try {
            // Use LLM service directly for general chat
            const result = await llmService.generateWithSystemPrompt(
                'You are a helpful and knowledgeable assistant who can answer any kind of question, from technical help to general advice.',
                message,
                {
                    temperature: 0.7,
                    max_tokens: 800
                }
            );

            return {
                message,
                response: result.content,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in general fallback chat:', error);
            return {
                message,
                response: "I'm having trouble answering that right now. Could you try rephrasing?",
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Health check for chat service
     */
    async healthCheck() {
        try {
            const ragHealth = await ragOrchestrator.healthCheck();
            const supabaseHealth = await supabaseService.healthCheck();

            return {
                status: ragHealth.status === 'healthy' && supabaseHealth.status === 'healthy' ? 'healthy' : 'degraded',
                dependencies: {
                    ragOrchestrator: ragHealth,
                    supabaseService: supabaseHealth,
                    roadmapDataService: 'available'
                },
                capabilities: {
                    chatProcessing: ragHealth.capabilities?.chatGeneration || false,
                    roadmapGeneration: ragHealth.capabilities?.roadmapGeneration || false,
                    roadmapModification: ragHealth.capabilities?.chatGeneration || false,
                    progressAnalysis: ragHealth.capabilities?.progressAnalysis || false,
                    dataAccess: supabaseHealth.status === 'healthy'
                },
                timestamp: new Date().toISOString()
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

export default new ChatService();