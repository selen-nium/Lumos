// src/services/ChatService.js - Enhanced Chat Service
import ragService from './ragService.js';
import userProfileService from './userProfileService.js';

class ChatService {
    /**
     * Process a user message and generate a response without storing chat history
     */
    async processUserMessage(userId, message, options = {}) {
        try {
            console.log("🤖 Processing chat message:", {
                userId,
                messageLength: message.length,
                responseType: options.responseType,
                hasRoadmapContext: !!options.roadmapContext
            });

            // Enhanced options with roadmap context
            const enhancedOptions = {
                ...options,
                responseType: options.responseType || 'chat',
                temperature: options.temperature || 0.3,
                maxTokens: options.maxTokens || 800,
                roadmapContext: options.roadmapContext,
                modulesContext: options.modulesContext,
                chatHistory: options.chatHistory || []
            };

            // Process query through RAG system with enhanced context
            const ragResponse = await ragService.processQuery(
                userId, 
                message, 
                enhancedOptions
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
    async processRoadmapFeedback(userId, roadmapId, feedback, options = {}) {
        try {
            // Update roadmap based on feedback
            const updatedRoadmap = await ragService.updateRoadmap(
                userId,
                roadmapId,
                feedback,
                options
            );
            
            return {
                success: true,
                updatedRoadmap,
                feedback,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error processing roadmap feedback:', error);
            throw error;
        }
    }

    /**
     * Generate roadmap from user profile during onboarding
     */
    async generateInitialRoadmap(userId, options = {}) {
        try {
            // Generate new roadmap based on user profile
            const roadmap = await ragService.generateLearningRoadmap(userId, options);
            
            return {
                success: true,
                roadmap,
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
                
                Examples of good suggestions:
                - "How can I improve my JavaScript skills?"
                - "What should I learn after completing React basics?"
                - "Can you create a study schedule for this week?"
                
                Return ONLY a JSON object with this format:
                {
                  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
                }
            `;
            
            // Call OpenAI API
            const completion = await ragService.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { 
                        role: 'system', 
                        content: 'You generate helpful autocomplete suggestions for a tech learning platform chat. Always respond with valid JSON.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 150,
                response_format: { type: "json_object" }
            });
            
            // Parse and return suggestions
            try {
                const suggestionsStr = completion.choices[0].message.content;
                const suggestionData = JSON.parse(suggestionsStr);
                return Array.isArray(suggestionData.suggestions) ? suggestionData.suggestions : [];
            } catch (error) {
                console.error('Error parsing suggestions:', error);
                return this.getDefaultSuggestions(userId);
            }
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
                "How am I doing with my progress?"
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

            const userContext = await userProfileService.createUserContext(userId);
            
            const progressPrompt = `
                Analyze this user's learning progress and provide insights:
                
                User Profile:
                - Goals: ${userContext.goalsText}
                - Current Skills: ${userContext.skillsText}
                - Weekly Learning Time: ${userContext.timeAvailable} hours
                
                Current Progress:
                - Roadmap: ${roadmapContext.title}
                - Completed: ${roadmapContext.completedModules}/${roadmapContext.totalModules} modules (${roadmapContext.completedPercentage}%)
                - Total Hours: ${roadmapContext.totalHours}
                
                Modules Status:
                ${modulesContext.map(m => `- ${m.name}: ${m.isCompleted ? 'Completed' : 'Not Started'}`).join('\n')}
                
                Provide:
                1. A brief progress summary
                2. What they're doing well
                3. Specific next steps
                4. Motivation based on their achievements
                
                Keep it encouraging and actionable.
            `;

            const completion = await ragService.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { 
                        role: 'system', 
                        content: ragService.getDefaultSystemPrompt() 
                    },
                    { role: 'user', content: progressPrompt }
                ],
                temperature: 0.3,
                max_tokens: 600
            });

            return completion.choices[0].message.content;
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
            const userContext = await userProfileService.createUserContext(userId);
            
            // Get next uncompleted modules
            const nextModules = modulesContext
                .filter(m => !m.isCompleted)
                .slice(0, 3)
                .map(m => `${m.name} (${m.estimated_hours || 3} hours)`);

            const schedulePrompt = `
                Create a ${timeframe}ly study schedule for this user:
                
                User Profile:
                - Available time: ${userContext.timeAvailable} hours per week
                - Preferred learning time: ${userContext.profile.preferred_learning_time || 'flexible'}
                - Current progress: ${roadmapContext.completedPercentage}% complete
                
                Next modules to work on:
                ${nextModules.join('\n')}
                
                Create a realistic, structured schedule that:
                1. Fits their available time
                2. Respects their preferred learning times
                3. Includes breaks and review time
                4. Provides specific daily goals
                5. Balances learning with practice
                
                Format as a clear, actionable schedule.
            `;

            const completion = await ragService.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { 
                        role: 'system', 
                        content: ragService.getDefaultSystemPrompt() + '\n\nYou specialize in creating realistic, achievable study schedules for busy learners.' 
                    },
                    { role: 'user', content: schedulePrompt }
                ],
                temperature: 0.2,
                max_tokens: 800
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error('Error generating study schedule:', error);
            return `Based on your ${userContext.timeAvailable} hours per week, I recommend dedicating about ${Math.floor(userContext.timeAvailable / 3)} hours every few days to stay consistent. Focus on one module at a time and don't forget to practice what you learn!`;
        }
    }
    /**
     * Process roadmap modification requests from chat
     */
    async processRoadmapModification(userId, message, editType, options = {}) {
        try {
            console.log("🔧 Processing roadmap modification:", {
                userId,
                editType,
                messageLength: message.length
            });

            const { roadmapContext, modulesContext, chatHistory } = options;
            
            // Get user context for personalized modifications
            const userContext = await userProfileService.createUserContext(userId);
            
            // Process the modification request through RAG service
            const modificationResponse = await ragService.processRoadmapModification(
                userId,
                message,
                editType,
                {
                    userContext,
                    roadmapContext,
                    modulesContext,
                    chatHistory
                }
            );

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
            } else if (currentProgress > 75) {
                suggestions.push("Add advanced topics to challenge me");
                suggestions.push("Include industry-level projects");
                suggestions.push("Speed up the remaining modules");
            } else {
                suggestions.push("Adjust difficulty to match my progress");
                suggestions.push("Add more hands-on projects");
                suggestions.push("Focus more on practical skills");
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
            
            return suggestions.slice(0, 4);
            
        } catch (error) {
            console.error('Error generating roadmap suggestions:', error);
            return [
                "Adjust the difficulty level",
                "Add more practical projects",
                "Change the learning pace",
                "Focus on specific technologies"
            ];
        }
    }

    /**
     * Fallback: Process any general user message with open-ended AI
     */
    async processGeneralMessage(userId, message) {
    try {
        const completion = await ragService.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
            role: 'system',
            content: 'You are a helpful and knowledgeable assistant who can answer any kind of question, from technical help to general advice.'
            },
            {
            role: 'user',
            content: message
            }
        ],
        temperature: 0.7,
        max_tokens: 800
        });

        return {
        message,
        response: completion.choices[0].message.content,
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
     * Validate roadmap modification requests
     */
    validateModificationRequest(message, editType) {
        const validationRules = {
            'increase_difficulty': () => {
                return message.toLowerCase().includes('difficulty') || 
                    message.toLowerCase().includes('challenge') ||
                    message.toLowerCase().includes('advanced');
            },
            'add_modules': () => {
                return message.toLowerCase().includes('add') &&
                    (message.toLowerCase().includes('module') || 
                        message.toLowerCase().includes('topic') ||
                        message.toLowerCase().includes('skill'));
            },
            'remove_modules': () => {
                return message.toLowerCase().includes('remove') ||
                    message.toLowerCase().includes('skip') ||
                    message.toLowerCase().includes('exclude');
            }
            // Add more validation rules as needed
        };
        
        const validator = validationRules[editType];
        return validator ? validator() : true; // Default to true for unknown types
    }
}

export default new ChatService();