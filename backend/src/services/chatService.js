import ragOrchestrator from './ai/ragOrchestrator.js';
import llmService from './core/llmService.js';
import supabaseService from './core/supabaseService.js';
import userProfileService from './userProfileService.js';
import roadmapDataService from './data/roadmapDataService.js';
import userDataService from './data/userDataService.js';

class ChatService {
    /**
     * Process a user message and generate a response
     */
    async processUserMessage(userId, message, options = {}) {
        console.log('🔄 ChatService.processUserMessage called:', { 
            userId, 
            messageLength: message?.length, 
            responseType: options.responseType 
        });

        try {
            // Validate inputs
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            if (!message?.trim()) {
                throw new Error('Message cannot be empty');
            }

            // Check for general chat without roadmap context
            if (options.responseType === 'chat' && !options.hasRoadmapContext) {
                console.log('ℹ️  Using general LLM fallback');
                const fallback = await this.processGeneralMessage(userId, message);
                return {
                    message: fallback.message,
                    response: fallback.response,
                    context: {},
                    timestamp: fallback.timestamp
                };
            }

            // Try RAG orchestrator first
            try {
                console.log("🔄 Calling RAG orchestrator...");
                const ragResponse = await ragOrchestrator.processQuery(
                    userId, 
                    message, 
                    options
                );

                if (!ragResponse) {
                    console.warn("⚠️ RAG orchestrator returned null/undefined, falling back to general message");
                    return await this.processGeneralMessage(userId, message);
                }
                
                if (!ragResponse.response) {
                    console.warn("⚠️ RAG response missing 'response' property, falling back to general message");
                    return await this.processGeneralMessage(userId, message);
                }
                
                if (typeof ragResponse.response !== 'string') {
                    console.warn("⚠️ RAG response.response is not a string, falling back to general message");
                    return await this.processGeneralMessage(userId, message);
                }
                
                // Return formatted response with metadata
                const finalResponse = {
                    message: message,
                    response: ragResponse.response,
                    context: ragResponse.context || {},
                    suggestions: ragResponse.suggestions || [],
                    timestamp: new Date().toISOString(),
                    processingMethod: 'rag_orchestrator'
                };

                console.log('✅ RAG orchestrator response successful');
                return finalResponse;

            } catch (ragError) {
                console.warn('⚠️ RAG orchestrator failed, falling back to general message:', ragError.message);
                return await this.processGeneralMessage(userId, message);
            }

        } catch (error) {
            console.error('❌ ChatService.processUserMessage error:', error);
            
            // Try one more fallback
            try {
                return await this.processGeneralMessage(userId, message);
            } catch (fallbackError) {
                console.error('❌ Even fallback failed:', fallbackError);
                throw new Error('Chat service temporarily unavailable. Please try again.');
            }
        }
    }

    /**
     * Process roadmap modification request
     */
    async processRoadmapModification(userId, message, editType, context) {
        console.log('🔧 Processing roadmap modification:', { userId, editType });
        
        try {
            // Validate inputs
            if (!userId || !message || !editType) {
                throw new Error('Missing required parameters for roadmap modification');
            }

            // Try to delegate to RAG orchestrator for modifications
            const modificationResponse = await ragOrchestrator.processRoadmapModification(
                userId,
                message,
                editType,
                context
            );

            if (modificationResponse && modificationResponse.response) {
                return {
                    response: modificationResponse.response,
                    roadmapUpdated: modificationResponse.roadmapUpdated || false,
                    updateDetails: modificationResponse.updateDetails || null,
                    timestamp: new Date().toISOString()
                };
            }

            // Fallback response if modification processing fails
            return {
                response: `I understand you want to ${editType.replace('_', ' ')} your roadmap. While I'm working on processing your request, you can manually adjust your learning path in your roadmap section. I'll keep improving to better help with roadmap modifications!`,
                roadmapUpdated: false,
                updateDetails: null,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Roadmap modification error:', error);
            
            return {
                response: `I'm having trouble modifying your roadmap right now. You can manually make changes in your roadmap section. Please try again later or contact support if the issue persists.`,
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
            const currentRoadmap = await userDataService.findActiveByUserId(userId);
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
        console.log('🔄 Using general message processing for user:', userId);
        
        try {
            // Create a simple system prompt for general assistance
            const systemPrompt = `You are a helpful learning assistant. Provide encouraging, practical advice about learning and studying. 
            Keep responses concise (under 200 words) and supportive.
            
            If the user is asking about learning schedules, study plans, or next steps, provide general guidance.
            If they're asking about progress or specific topics, be encouraging and suggest they check their roadmap.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ];

            // Use LLM service directly with error handling
            const response = await llmService.generateChatCompletion(messages, {
                temperature: 0.7,
                max_tokens: 300
            });

            if (!response || !response.content) {
                throw new Error('Invalid response from LLM service');
            }

            return {
                message: message,
                response: response.content,
                context: { method: 'general_fallback' },
                timestamp: new Date().toISOString(),
                processingMethod: 'general_llm'
            };

        } catch (error) {
            console.error('❌ General message processing failed:', error);
            
            // Last resort - return a helpful static message
            return {
                message: message,
                response: `I'm having trouble processing your request right now. Here are some things I can help with:
                
• 📚 Review your learning roadmap
• 🎯 Set study goals and schedules  
• 📝 Track your progress
• 💡 Get motivated to keep learning

Please try asking your question again, or check your roadmap to see your current progress!`,
                context: { method: 'static_fallback' },
                timestamp: new Date().toISOString(),
                processingMethod: 'static_fallback'
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