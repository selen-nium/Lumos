import sql from '../database/db.js';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class EmbeddingService {
    constructor() {
        this.embeddingModel = 'text-embedding-3-small';
    }

    /**
     * Convert text to embedding vector
     */
    async textToEmbedding(text) {
        try {
            const response = await openai.embeddings.create({
                model: this.embeddingModel,
                input: text.trim(),
                encoding_format: 'float'
            });
            
            return response.data[0].embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    /**
     * Find similar modules based on user query/profile
     */
    async findSimilarModules(queryText, options = {}) {
        const {
            userSkills = null,
            maxDifficulty = 5,
            limit = 10,
            similarityThreshold = 0.3
        } = options;

        try {
            // Convert query to embedding
            const queryEmbedding = await this.textToEmbedding(queryText);
            const embeddingStr = '[' + queryEmbedding.join(',') + ']';

            // Search for similar modules
            const results = await sql`
                SELECT * FROM find_similar_modules(
                    ${embeddingStr}::vector,
                    ${userSkills},
                    ${maxDifficulty},
                    ${similarityThreshold},
                    ${limit}
                )
            `;

            return results;
        } catch (error) {
            console.error('Error finding similar modules:', error);
            throw error;
        }
    }

    /**
     * Find similar learning resources
     */
    async findSimilarResources(queryText, options = {}) {
        const {
            preferredTypes = null,
            maxDifficulty = 5,
            onlyFree = null,
            limit = 15,
            similarityThreshold = 0.3
        } = options;

        try {
            const queryEmbedding = await this.textToEmbedding(queryText);
            const embeddingStr = '[' + queryEmbedding.join(',') + ']';

            const results = await sql`
                SELECT * FROM find_similar_resources(
                    ${embeddingStr}::vector,
                    ${preferredTypes},
                    ${maxDifficulty},
                    ${onlyFree},
                    ${similarityThreshold},
                    ${limit}
                )
            `;

            return results;
        } catch (error) {
            console.error('Error finding similar resources:', error);
            throw error;
        }
    }

    /**
     * Find similar hands-on tasks
     */
    async findSimilarTasks(queryText, options = {}) {
        const {
            preferredTypes = null,
            maxDifficulty = 5,
            maxTimeMinutes = null,
            limit = 10,
            similarityThreshold = 0.3
        } = options;

        try {
            const queryEmbedding = await this.textToEmbedding(queryText);
            const embeddingStr = '[' + queryEmbedding.join(',') + ']';

            const results = await sql`
                SELECT * FROM find_similar_tasks(
                    ${embeddingStr}::vector,
                    ${preferredTypes},
                    ${maxDifficulty},
                    ${maxTimeMinutes},
                    ${similarityThreshold},
                    ${limit}
                )
            `;

            return results;
        } catch (error) {
            console.error('Error finding similar tasks:', error);
            throw error;
        }
    }

    /**
     * Comprehensive search across all content types
     */
    async searchAllContent(queryText, options = {}) {
        const {
            contentTypes = ['modules', 'resources', 'tasks'],
            maxDifficulty = 5,
            limit = 20,
            similarityThreshold = 0.25
        } = options;

        try {
            const queryEmbedding = await this.textToEmbedding(queryText);
            const embeddingStr = '[' + queryEmbedding.join(',') + ']';

            const results = await sql`
                SELECT * FROM search_all_content(
                    ${embeddingStr}::vector,
                    ${contentTypes},
                    ${maxDifficulty},
                    ${similarityThreshold},
                    ${limit}
                )
            `;

            return results;
        } catch (error) {
            console.error('Error searching all content:', error);
            throw error;
        }
    }

    /**
     * Get template learning paths that match user profile
     */
    async getMatchingTemplatePaths(userGoals, userSkills = null, options = {}) {
        const {
            preferredDifficulty = null,
            maxDurationWeeks = null
        } = options;

        try {
            const results = await sql`
                SELECT * FROM get_matching_template_paths(
                    ${userGoals},
                    ${userSkills},
                    ${preferredDifficulty},
                    ${maxDurationWeeks}
                )
            `;

            return results;
        } catch (error) {
            console.error('Error getting matching template paths:', error);
            throw error;
        }
    }
}

export default new EmbeddingService();
