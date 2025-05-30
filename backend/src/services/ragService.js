// =============================================
// src/services/ragService.js - Core RAG Service
// =============================================
import OpenAI from 'openai';
import embeddingService from './embeddingService.js';
import userProfileService from './userProfileService.js';
import contentService from './contentService.js';

class RAGService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        // Using gpt-4o-mini for better cost efficiency
        this.chatModel = 'gpt-4o-mini';
        this.defaultSystemPrompt = this.getDefaultSystemPrompt();
    }

    removeRedundantModules(roadmap, knownSkills = []) {
        const knownSkillNames = knownSkills.map(s => s.name.toLowerCase());

        const isRedundant = (module) =>
            module.skills_covered?.some(skill =>
                knownSkillNames.includes(skill.toLowerCase())
            );

        if (roadmap.modules) {
            roadmap.modules = roadmap.modules.filter(m => !isRedundant(m));
        }

        if (roadmap.phases) {
            roadmap.phases = roadmap.phases.map(phase => ({
                ...phase,
                modules: (phase.modules || []).filter(m => !isRedundant(m))
            }));
        }

        return roadmap;
    }

    /**
     * Process user query through the RAG system
     */
    async processQuery(userId, query, options = {}) {
        try {
            // Get user context
            const userContext = await userProfileService.createUserContext(userId);
            
            // Handle different response types
            const responseType = options.responseType || 'chat';
            
            // If this is a progress analysis request, handle it specially
            if (responseType === 'progress_analysis' && options.roadmapContext) {
                return await this.generateProgressAnalysis(query, userContext, options);
            }
            
            // If this is a study planning request, handle it specially
            if (responseType === 'study_planning' && options.roadmapContext) {
                return await this.generateStudyPlan(query, userContext, options);
            }
            
            // For other queries, use the regular RAG pipeline
            const retrievedContext = await this.retrieveRelevantContext(query, userContext);
            const response = await this.generateResponse(query, retrievedContext, userContext, options);
            
            return response;
        } catch (error) {
            console.error('Error processing RAG query:', error);
            throw error;
        }
    }

    /**
     * Retrieve relevant context based on the query and user profile
     */
    async retrieveRelevantContext(query, userContext) {
        // Prepare search options based on user profile
        const searchOptions = {
            maxDifficulty: userContext.preferredDifficulty + 1, // Allow slightly higher difficulty
            userSkills: userContext.skills.map(s => s.id),
            similarityThreshold: 0.25, // Adjust based on testing
            limit: 10
        };

        // Perform multi-content search
        const [moduleResults, resourceResults, taskResults] = await Promise.all([
            embeddingService.findSimilarModules(query, searchOptions),
            embeddingService.findSimilarResources(query, {
                ...searchOptions,
                preferredTypes: userContext.learningStyle === 'visual' ? ['video', 'interactive'] : null,
                limit: 5
            }),
            embeddingService.findSimilarTasks(query, {
                ...searchOptions,
                maxTimeMinutes: userContext.timeAvailable * 60, // Convert hours to minutes
                limit: 3
            })
        ]);

        // Format retrieved context
        return {
            relevantModules: moduleResults,
            relevantResources: resourceResults,
            relevantTasks: taskResults,
            retrievalTimestamp: new Date().toISOString()
        };
    }

    /**
     * Generate response using the LLM with retrieved context
     */
    async generateResponse(query, retrievedContext, userContext, options = {}) {
        const {
            temperature = 0.2,
            responseType = 'chat',
            maxTokens = 800
        } = options;

        // Create context-rich system prompt
        const systemPrompt = this.createContextualSystemPrompt(
            retrievedContext, 
            userContext, 
            responseType
        );

        // Prepare conversation messages
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ];

        // Generate response from LLM
        const completion = await this.openai.chat.completions.create({
            model: this.chatModel,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        });

        // Extract and format response
        const responseContent = completion.choices[0].message.content;
        
        return {
            response: responseContent,
            context: {
                query,
                userContext: {
                    skills: userContext.skillsText,
                    goals: userContext.goalsText,
                    experienceLevel: userContext.experienceLevel
                },
                retrievedContext: {
                    moduleCount: retrievedContext.relevantModules.length,
                    resourceCount: retrievedContext.relevantResources.length,
                    taskCount: retrievedContext.relevantTasks.length
                }
            }
        };
    }

    /**
     * Generate a personalized learning roadmap for the user
     */
    async generateLearningRoadmap(userId, options = {}) {
        try {
            const userContext = await userProfileService.createUserContext(userId);
            
            // Get matching template paths from vector database
            const templatePaths = await embeddingService.getMatchingTemplatePaths(
                userContext.goals.map(g => g.id), 
                userContext.skills.map(s => s.id),
                {
                    preferredDifficulty: userContext.preferredDifficulty,
                    maxDurationWeeks: options.maxDurationWeeks || 12
                }
            );

            // If no template paths found, use LLM to generate a custom roadmap
            if (!templatePaths.length) {
                let roadmap = await this.generateCustomRoadmap(userContext, options);
                roadmap = this.removeRedundantModules(roadmap, userContext.skills);
                // return await this.generateCustomRoadmap(userContext, options);
            }

            // Use the most relevant template path as base
            const basePath = templatePaths[0];
            
            // Customize template path with LLM
            let customizedRoadmap = await this.customizeTemplatePath(basePath, userContext, options);
            customizedRoadmap = this.removeRedundantModules(customizedRoadmap, userContext.skills);
            
            return customizedRoadmap;
        } catch (error) {
            console.error('Error generating learning roadmap:', error);
            throw error;
        }
    }

    /**
     * Generate a custom roadmap from scratch using LLM
     */
    async generateCustomRoadmap(userContext, options = {}) {
        // Create specialized system prompt for roadmap generation
        const systemPrompt = this.createRoadmapGenerationPrompt(userContext);
        
        // Query format: detailed request for roadmap generation
        const query = `Generate a personalized learning roadmap for me. 
        I want to focus on: ${userContext.goalsText}. 
        My current skills include: ${userContext.skillsText}. 
        I can dedicate ${userContext.timeAvailable} hours per week to learning.`;
        
        // Call OpenAI API with structured output format
        const completion = await this.openai.chat.completions.create({
            model: this.chatModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
            ],
            temperature: 0.2,
            max_tokens: 2000,
            response_format: { type: "json_object" }
        });
        
        // Parse the response
        const roadmapStr = completion.choices[0].message.content;
        let roadmap;
        try {
            roadmap = JSON.parse(roadmapStr);
        } catch (error) {
            console.error('Error parsing roadmap JSON:', error);
            // If parsing fails, try to extract JSON using regex
            const jsonMatch = roadmapStr.match(/({[\s\S]*})/);
            if (jsonMatch) {
                try {
                    roadmap = JSON.parse(jsonMatch[0]);
                } catch (innerError) {
                    console.error('Failed to parse extracted JSON:', innerError);
                    throw new Error('Failed to generate valid roadmap JSON');
                }
            } else {
                throw new Error('Failed to generate valid roadmap JSON');
            }
        }
        
        // Add metadata
        roadmap.generationMethod = 'custom';
        roadmap.userContext = {
            skills: userContext.skillsText,
            goals: userContext.goalsText,
            experienceLevel: userContext.experienceLevel
        };
        
        return roadmap;
    }

    /**
     * Customize a template path for the specific user
     */
    async customizeTemplatePath(templatePath, userContext, options = {}) {
        // Create prompt for customization
        const systemPrompt = this.createTemplateCustomizationPrompt();
        
        // Format template path data for the LLM
        const templateData = JSON.stringify(templatePath, null, 2);
        
        // Create the query
        const query = `Customize this learning path template for me:
        ${templateData}
        
        My profile:
        - Skills: ${userContext.skillsText}
        - Goals: ${userContext.goalsText}
        - Experience level: ${userContext.experienceLevel}
        - Time available: ${userContext.timeAvailable} hours per week
        - Learning style preference: ${userContext.learningStyle || 'balanced'}`;
        
        // Call OpenAI API
        const completion = await this.openai.chat.completions.create({
            model: this.chatModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
            ],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: "json_object" }
        });
        
        // Parse the response
        const customizedPathStr = completion.choices[0].message.content;
        let customizedPath;
        try {
            customizedPath = JSON.parse(customizedPathStr);
        } catch (error) {
            console.error('Error parsing customized path JSON:', error);
            // Fallback to the original template path with some user context
            customizedPath = {
                ...templatePath,
                customization_failed: true
            };
        }
        
        // Add metadata
        customizedPath.generationMethod = 'customizedTemplate';
        customizedPath.baseTemplatePath = templatePath.path_id;
        customizedPath.userContext = {
            skills: userContext.skillsText,
            goals: userContext.goalsText,
            experienceLevel: userContext.experienceLevel
        };
        
        return customizedPath;
    }

    /**
     * Enhanced processQuery method that handles chat context
     */
    async processQuery(userId, query, options = {}) {
        try {
            // Get user context
            const userContext = await userProfileService.createUserContext(userId);
            
            // Handle different response types
            const responseType = options.responseType || 'chat';
            
            // If this is a progress analysis request, handle it specially
            if (responseType === 'progress_analysis' && options.roadmapContext) {
                return await this.generateProgressAnalysis(query, userContext, options);
            }
            
            // If this is a study planning request, handle it specially
            if (responseType === 'study_planning' && options.roadmapContext) {
                return await this.generateStudyPlan(query, userContext, options);
            }
            
            // For other queries, use the regular RAG pipeline
            const retrievedContext = await this.retrieveRelevantContext(query, userContext);
            const response = await this.generateResponse(query, retrievedContext, userContext, options);
            
            return response;
        } catch (error) {
            console.error('Error processing RAG query:', error);
            throw error;
        }
    }

    /**
     * Generate progress analysis response
     */
    async generateProgressAnalysis(query, userContext, options) {
        const { roadmapContext, modulesContext } = options;
        
        const progressPrompt = `
            User asks: "${query}"
            
            Analyze their learning progress:
            
            User Profile:
            - Goals: ${userContext.goalsText}
            - Skills: ${userContext.skillsText}
            - Experience: ${userContext.experienceLevel}
            - Weekly Time: ${userContext.timeAvailable} hours
            
            Current Progress:
            - Roadmap: ${roadmapContext?.title || 'Not specified'}
            - Completed: ${roadmapContext?.completedModules || 0}/${roadmapContext?.totalModules || 0} modules
            - Progress: ${roadmapContext?.completedPercentage || 0}%
            
            Recent Modules:
            ${modulesContext?.slice(0, 5).map(m => 
                `- ${m.name}: ${m.isCompleted ? '✅ Completed' : '⏳ In Progress'}`
            ).join('\n') || 'No modules data available'}
            
            Provide a supportive, detailed analysis that:
            1. Celebrates their achievements
            2. Identifies areas of strength
            3. Suggests specific next steps
            4. Addresses any concerns in their question
            5. Keeps them motivated
            
            Be conversational and encouraging.
        `;
        
        const completion = await this.openai.chat.completions.create({
            model: this.chatModel,
            messages: [
                { role: 'system', content: this.getDefaultSystemPrompt() },
                { role: 'user', content: progressPrompt }
            ],
            temperature: 0.3,
            max_tokens: 600
        });
        
        return {
            response: completion.choices[0].message.content,
            context: {
                query,
                responseType: 'progress_analysis',
                userProgress: {
                    completedModules: roadmapContext?.completedModules || 0,
                    totalModules: roadmapContext?.totalModules || 0,
                    completedPercentage: roadmapContext?.completedPercentage || 0
                }
            }
        };
    }


    /**
     * Generate study plan response
     */
    async generateStudyPlan(query, userContext, options) {
        const { roadmapContext, modulesContext } = options;
        
        // Get next uncompleted modules
        const nextModules = modulesContext?.filter(m => !m.isCompleted).slice(0, 3) || [];
        
        const planPrompt = `
            User asks: "${query}"
            
            Create a personalized study plan:
            
            User Profile:
            - Available time: ${userContext.timeAvailable} hours per week
            - Preferred time: ${userContext.profile.preferred_learning_time || 'flexible'}
            - Experience level: ${userContext.experienceLevel}
            - Learning goals: ${userContext.goalsText}
            
            Current Status:
            - Progress: ${roadmapContext?.completedPercentage || 0}% complete
            - Roadmap: ${roadmapContext?.title || 'Learning Path'}
            
            Next modules to work on:
            ${nextModules.map(m => 
                `- ${m.name} (${m.estimated_hours || 3} hours, ${m.difficulty || 'beginner'} level)`
            ).join('\n') || 'No upcoming modules'}
            
            Create a realistic, actionable study plan that:
            1. Fits their available time and schedule
            2. Prioritizes the most important next steps
            3. Includes specific daily/weekly goals
            4. Balances learning with hands-on practice
            5. Provides milestones to track progress
            6. Is encouraging and achievable
            
            Make it specific and personalized to their situation.
        `;
        
        const completion = await this.openai.chat.completions.create({
            model: this.chatModel,
            messages: [
                { 
                    role: 'system', 
                    content: this.getDefaultSystemPrompt() + '\n\nYou specialize in creating realistic, personalized study plans for busy learners.'
                },
                { role: 'user', content: planPrompt }
            ],
            temperature: 0.2,
            max_tokens: 800
        });
        
        return {
            response: completion.choices[0].message.content,
            context: {
                query,
                responseType: 'study_planning',
                nextModules: nextModules.map(m => m.name),
                availableTime: userContext.timeAvailable
            }
        };
    }

    /**
     * Enhanced generateResponse method with chat context
     */
    async generateResponse(query, retrievedContext, userContext, options = {}) {
        const {
            temperature = 0.2,
            responseType = 'chat',
            maxTokens = 800,
            chatHistory = [],
            roadmapContext,
            modulesContext
        } = options;

        // Create enhanced system prompt with chat context
        let systemPrompt = this.createContextualSystemPrompt(
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

        // Prepare conversation messages
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ];

        // Generate response from LLM
        const completion = await this.openai.chat.completions.create({
            model: this.chatModel,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        });

        // Extract and format response
        const responseContent = completion.choices[0].message.content;
        
        return {
            response: responseContent,
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
                } : null
            }
        };
    }

    /**
     * Create the default system prompt
     */
    getDefaultSystemPrompt() {
        return `You are Lumos AI, an intelligent assistant for the Lumos learning platform, designed specifically for women in tech. 
        Your goal is to help users navigate their personalized learning journey, provide technical guidance, 
        and offer support and encouragement. You should be knowledgeable, supportive, and empowering.

        Guidelines:
        - Be inclusive and mindful that users come from diverse backgrounds and experience levels
        - Provide technical information that is accurate and up-to-date
        - Encourage a growth mindset and resilience in the face of challenges
        - Offer practical, actionable advice that users can implement right away
        - Be supportive and motivating without being condescending
        - Use conversational, friendly language while maintaining professionalism
        - When answering technical questions, provide clear explanations with examples when appropriate
        - Avoid unnecessary jargon and explain technical terms when they're first introduced
        - Acknowledge the specific challenges women may face in tech and provide strategies to overcome them
        - Celebrate user progress and achievements`;
    }

    /**
     * Create a contextual system prompt enhanced with retrieved information
     */
    createContextualSystemPrompt(retrievedContext, userContext, responseType) {
        // Start with the base system prompt
        let systemPrompt = this.defaultSystemPrompt;
        
        // Add user context
        systemPrompt += `\n\nUser Profile:
        - Experience Level: ${userContext.experienceLevel}
        - Current Skills: ${userContext.skillsText}
        - Learning Goals: ${userContext.goalsText}
        - Learning Time: ${userContext.timeAvailable} hours per week
        - Preferred Learning Time: ${userContext.profile.preferred_learning_time || 'Not specified'}`;
        
        // Add relevant module information
        if (retrievedContext.relevantModules && retrievedContext.relevantModules.length > 0) {
            systemPrompt += `\n\nRelevant Learning Modules:`;
            retrievedContext.relevantModules.slice(0, 3).forEach((module, index) => {
                systemPrompt += `\n${index + 1}. ${module.module_name}: ${module.module_description}`;
            });
        }
        
        // Add relevant resources if available
        if (retrievedContext.relevantResources && retrievedContext.relevantResources.length > 0) {
            systemPrompt += `\n\nRelevant Learning Resources:`;
            retrievedContext.relevantResources.slice(0, 3).forEach((resource, index) => {
                systemPrompt += `\n${index + 1}. ${resource.resource_title} (${resource.resource_type}): ${resource.description || 'No description available'}`;
            });
        }
        
        // Add response type-specific instructions
        if (responseType === 'technical_guidance') {
            systemPrompt += `\n\nProvide detailed technical guidance. Include code examples where appropriate, and explain concepts thoroughly. Focus on practical implementation.`;
        } else if (responseType === 'roadmap_advice') {
            systemPrompt += `\n\nFocus on guiding the user through their learning roadmap. Suggest next steps, help prioritize topics, and provide a clear learning path forward.`;
        } else if (responseType === 'motivation') {
            systemPrompt += `\n\nProvide motivational support. Acknowledge challenges, share relevant success stories, and give practical advice for overcoming obstacles in the tech industry.`;
        }
        
        return systemPrompt;
    }

    /**
     * Create prompt for roadmap generation
     */
    createRoadmapGenerationPrompt(userContext) {
        return `You are Lumos AI, specializing in creating personalized learning roadmaps for women in tech.
        
        Your task is to create a detailed, structured learning roadmap tailored to the user's skills, goals, and available time.
        
        The roadmap should include:
        1. A sequence of learning modules organized into logical phases
        2. Each module should include a title, description, and estimated completion time
        3. Prerequisites for each module
        4. Recommended resources for each module (videos, articles, documentation)
        5. Hands-on projects or tasks to apply what they've learned for each module

        When generating resources for each module, create specific, accurate resource titles:
        - For video resources: "YouTube: [Topic] Tutorial by [Channel]" or just "YouTube: [Topic] Tutorial"
        - For documentation: "MDN: [Topic] Documentation" or "[Technology] Official Docs: [Topic]"
        - For courses: "Coursera: [Topic] Course" or "Udemy: [Topic] Complete Course"
        - For tutorials: "FreeCodeCamp: [Topic] Tutorial" or "W3Schools: [Topic] Guide"
        - For interactive: "CodePen: [Topic] Playground" or "Interactive [Topic] Exercises"
        Be specific about the platform in the title to ensure proper URL generation.
        
        Focus on creating a realistic timeline based on the user's available learning time.
        The roadmap should be challenging but achievable to maintain motivation.
        Include checkpoints and milestones to measure progress.
        
        Format your response as a JSON object with the following structure:
        {
        "roadmap_title": "Title based on user goals",
        "estimated_completion_weeks": number,
        "phases": [
            {
            "phase_id": 1,
            "phase_title": "Phase title",
            "phase_description": "Phase description",
            "modules": [
                {
                "module_id": "unique_id",
                "module_name": "Module name",
                "module_description": "Module description",
                "estimated_hours": number,
                "difficulty": number (1-5),
                "prerequisites": ["prerequisite_module_id1"],
                "resources": [
                    {
                    "resource_title": "Specific resource title (e.g., 'MDN: JavaScript Arrays Documentation')",
                    "resource_type": "video|article|documentation|tutorial|interactive",
                    "url": "actual URL or descriptive placeholder",
                    "estimated_time_minutes": number
                    }
                ],
                "tasks": [
                    {
                    "task_title": "Specific task title",
                    "task_description": "Detailed task description",
                    "estimated_time_minutes": number,
                    "task_type": "practice|project|quiz"
                    }
                ]
                }
            ]
            }
        ]
        }
        
        IMPORTANT: 
        - Generate 3-5 specific, real resources for each module
        - Generate 2-3 hands-on tasks for each module
        - Use actual resource titles that would exist (e.g., "FreeCodeCamp: React Hooks Tutorial")
        - Tasks should be specific and actionable (e.g., "Build a Todo List with React useState")
        - Consider the user's current skills and create appropriate progression. Exclude or skip topics the user already know. For example, if a user already knows HTML and CSS, do not include beginner modules for those skills.
        `;
    }

    /**
     * Create prompt for template path customization
     */
    createTemplateCustomizationPrompt() {
        return `You are Lumos AI, specializing in customizing learning roadmaps for women in tech.
        
        Your task is to customize a template learning path to better match the user's specific skills, goals, and available time.
        
        Customization guidelines:
        1. Adjust module difficulty based on user's experience level
        2. Add or remove modules based on user's existing skills
        3. Adjust estimated completion times based on user's available learning hours
        4. Tailor resources to match the user's learning style preferences
        5. Ensure the roadmap directly addresses the user's stated goals
        6. Make sure the progression is logical and builds upon prerequisites appropriately
        
        The customized roadmap should maintain the overall structure of the template but be tailored to the individual.

        Format your response as a JSON object with the same structure as the template provided.`;
    }

    /**
     * Process roadmap modification requests
     */
    async processRoadmapModification(userId, modificationRequest, editType, options = {}) {
        try {
            const { userContext, roadmapContext, modulesContext } = options;
            
            console.log("🔧 Processing roadmap modification:", {
                editType,
                userId,
                currentProgress: roadmapContext?.completedPercentage
            });

            // Generate the modified roadmap
            const modifiedRoadmap = await this.generateModifiedRoadmap(
                modificationRequest,
                editType,
                {
                    userContext,
                    roadmapContext,
                    modulesContext,
                    userId
                }
            );

            // Save the modified roadmap to database
            const saveResult = await this.saveModifiedRoadmap(userId, modifiedRoadmap);

            // Generate response explaining the changes
            const explanationResponse = await this.generateModificationExplanation(
                modificationRequest,
                editType,
                modifiedRoadmap,
                userContext
            );

            return {
                response: explanationResponse,
                roadmapUpdated: saveResult.success,
                updateDetails: {
                    modificationType: editType,
                    changesApplied: modifiedRoadmap.changesApplied,
                    newStructure: {
                        totalModules: modifiedRoadmap.modules?.length || modifiedRoadmap.phases?.reduce((total, phase) => total + (phase.modules?.length || 0), 0),
                        estimatedWeeks: modifiedRoadmap.estimated_duration_weeks,
                        difficultyLevel: modifiedRoadmap.overall_difficulty
                    }
                }
            };

        } catch (error) {
            console.error('Error processing roadmap modification:', error);
            throw error;
        }
    }

    /**
     * Generate modified roadmap based on user request
     */
    async generateModifiedRoadmap(modificationRequest, editType, context) {
        const { userContext, roadmapContext, modulesContext, userId } = context;
        
        // Create specialized prompt based on modification type
        const modificationPrompt = this.createModificationPrompt(
            modificationRequest,
            editType,
            userContext,
            roadmapContext,
            modulesContext
        );

        console.log("🤖 Generating modified roadmap with AI...");

        const completion = await this.openai.chat.completions.create({
            model: this.chatModel,
            messages: [
                { 
                    role: 'system', 
                    content: this.createRoadmapModificationSystemPrompt() 
                },
                { 
                    role: 'user', 
                    content: modificationPrompt 
                }
            ],
            temperature: 0.3,
            max_tokens: 2500,
            response_format: { type: "json_object" }
        });

        let modifiedRoadmap;
        try {
            const roadmapStr = completion.choices[0].message.content;
            modifiedRoadmap = JSON.parse(roadmapStr);
            
            // Add metadata
            modifiedRoadmap.modification_type = editType;
            modifiedRoadmap.modified_at = new Date().toISOString();
            modifiedRoadmap.original_request = modificationRequest;
            modifiedRoadmap.generationMethod = 'userModification';
            
        } catch (parseError) {
            console.error('Error parsing modified roadmap:', parseError);
            throw new Error('Failed to generate valid modified roadmap');
        }

        return modifiedRoadmap;
    }

    /**
     * Create modification prompt based on edit type
     */
    createModificationPrompt(modificationRequest, editType, userContext, roadmapContext, modulesContext) {
        let basePrompt = `
            User Request: "${modificationRequest}"
            Modification Type: ${editType}
            
            Current User Profile:
            - Goals: ${userContext.goalsText}
            - Current Skills: ${userContext.skillsText}
            - Experience Level: ${userContext.experienceLevel}
            - Weekly Learning Time: ${userContext.timeAvailable} hours
            
            Current Roadmap:
            - Title: ${roadmapContext?.title || 'Learning Path'}
            - Progress: ${roadmapContext?.completedModules || 0}/${roadmapContext?.totalModules || 0} modules (${roadmapContext?.completedPercentage || 0}%)
            - Total Hours: ${roadmapContext?.totalHours || 0}
            
            Current Modules:
            ${modulesContext?.map((m, i) => 
                `${i + 1}. ${m.name} (${m.isCompleted ? '✅ Completed' : '⏳ Pending'}) - ${m.difficulty || 'beginner'} level`
            ).join('\n') || 'No modules available'}
        `;

        // Add specific instructions based on edit type
        switch (editType) {
            case 'increase_difficulty':
                basePrompt += `\n\nInstructions:
                - Increase the difficulty level of pending modules
                - Add more advanced concepts and projects
                - Include industry-level challenges
                - Maintain logical progression but make it more challenging
                - Don't modify completed modules
                - Add estimated 20-30% more time for advanced topics`;
                break;

            case 'decrease_difficulty':
                basePrompt += `\n\nInstructions:
                - Simplify pending modules to be more beginner-friendly
                - Break complex topics into smaller, manageable parts
                - Add more foundational concepts if needed
                - Include more guided tutorials and step-by-step resources
                - Extend timeline to allow for better understanding
                - Don't modify completed modules`;
                break;

            case 'add_modules':
                basePrompt += `\n\nInstructions:
                - Add new modules based on the user's specific request
                - Ensure new modules align with their goals and current skill level
                - Place new modules in logical sequence within the roadmap
                - Update prerequisites and dependencies accordingly
                - Adjust total timeline to accommodate new modules`;
                break;

            case 'remove_modules':
                basePrompt += `\n\nInstructions:
                - Remove modules that the user specifically mentions or that don't align with their goals
                - Don't remove completed modules
                - Ensure remaining modules still provide a complete learning path
                - Update prerequisites and dependencies after removal
                - Adjust timeline accordingly`;
                break;

            case 'accelerate_pace':
                basePrompt += `\n\nInstructions:
                - Reduce estimated time for each module by focusing on essentials
                - Combine related modules where possible
                - Remove non-essential topics while maintaining core learning objectives
                - Create intensive study schedules
                - Prioritize hands-on learning over theory`;
                break;

            case 'slow_pace':
                basePrompt += `\n\nInstructions:
                - Increase estimated time for each module
                - Break complex modules into smaller parts
                - Add more practice time and review sessions
                - Include additional beginner resources
                - Create a more relaxed timeline`;
                break;

            default:
                basePrompt += `\n\nInstructions:
                - Analyze the user's request carefully
                - Make appropriate modifications to improve their learning experience
                - Ensure the roadmap still aligns with their goals
                - Maintain logical progression and prerequisites`;
        }

        basePrompt += `\n\nReturn a complete modified roadmap in JSON format with the same structure as the original, but with the requested changes applied. Include a "changesApplied" array describing what was modified.`;

        return basePrompt;
    }

    /**
     * Create system prompt for roadmap modification
     */
    createRoadmapModificationSystemPrompt() {
        return `You are Lumos AI, an expert at customizing learning roadmaps for women in tech.

        Your task is to modify existing learning roadmaps based on user feedback and requests.
        
        Key principles:
        1. Preserve completed modules - never modify or remove modules the user has already completed
        2. Maintain logical learning progression and prerequisites
        3. Keep modifications realistic and achievable
        4. Ensure the roadmap still aligns with the user's stated goals
        5. Provide clear reasoning for changes made
        
        When modifying difficulty:
        - Beginner: Focus on fundamentals, guided tutorials, lots of practice
        - Intermediate: Balance theory with hands-on projects, introduce best practices
        - Advanced: Industry-level challenges, complex projects, optimization techniques
        
        Return the modified roadmap as a JSON object with the same structure as the original, plus:
        - "changesApplied": array of strings describing what was changed
        - "overall_difficulty": string indicating the new difficulty level
        - "modification_reasoning": string explaining why changes were made
        
        Always ensure the modified roadmap is complete, valid, and helpful for the user's learning journey.`;
    }

    /**
     * Save modified roadmap to database
     */
    async saveModifiedRoadmap(userId, modifiedRoadmap) {
        try {
            // Import your Supabase client
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseServiceRole = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            console.log("💾 Saving modified roadmap to database...");

            const { error } = await supabaseServiceRole
                .from('user_learning_paths')
                .update({
                    path_name: modifiedRoadmap.path_name || modifiedRoadmap.roadmap_title,
                    path_data: modifiedRoadmap,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('status', 'active');

            if (error) {
                console.error("❌ Database save error:", error);
                throw error;
            }

            console.log("✅ Modified roadmap saved successfully");
            return { success: true };

        } catch (error) {
            console.error('Error saving modified roadmap:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate explanation of modifications made
     */
    async generateModificationExplanation(modificationRequest, editType, modifiedRoadmap, userContext) {
        const explanationPrompt = `
            User requested: "${modificationRequest}"
            Modification type: ${editType}
            
            Changes made to the roadmap:
            ${modifiedRoadmap.changesApplied?.join('\n') || 'General modifications applied'}
            
            New roadmap overview:
            - Total modules: ${modifiedRoadmap.modules?.length || modifiedRoadmap.phases?.reduce((total, phase) => total + (phase.modules?.length || 0), 0)}
            - Estimated duration: ${modifiedRoadmap.estimated_duration_weeks} weeks
            - Difficulty level: ${modifiedRoadmap.overall_difficulty}
            
            Generate a friendly, encouraging response that:
            1. Confirms what changes were made
            2. Explains how these changes benefit their learning
            3. Provides any important notes about the modifications
            4. Encourages them to continue with their updated roadmap
            
            Keep it conversational and supportive.
        `;

        const completion = await this.openai.chat.completions.create({
            model: this.chatModel,
            messages: [
                { 
                    role: 'system', 
                    content: this.getDefaultSystemPrompt() + '\n\nYou specialize in explaining roadmap modifications in a clear, encouraging way.' 
                },
                { role: 'user', content: explanationPrompt }
            ],
            temperature: 0.4,
            max_tokens: 500
        });

        return completion.choices[0].message.content;
    }
}

export default new RAGService();