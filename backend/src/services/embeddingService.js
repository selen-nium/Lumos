import sql from '../database/db.js';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class EmbeddingService {
    constructor() {
        this.embeddingModel = 'text-embedding-3-small';
        this.embeddingDimensions = 1536;
        this.vectorIndexesCreated = false;
    }

    /**
     * Convert text to embedding vector
     */
    async textToEmbedding(text) {
        try {
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                throw new Error('Text for embedding cannot be empty');
            }

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
     * Generate embedding for module content
     */
    async generateModuleEmbedding(moduleData) {
        try {
            const content = this.createModuleSearchText(moduleData);
            return await this.textToEmbedding(content);
        } catch (error) {
            console.error('Error generating module embedding:', error);
            return null;
        }
    }

    /**
     * Generate embedding for resource content
     */
    async generateResourceEmbedding(resourceData) {
        try {
            const content = this.createResourceSearchText(resourceData);
            return await this.textToEmbedding(content);
        } catch (error) {
            console.error('Error generating resource embedding:', error);
            return null;
        }
    }

    /**
     * Generate embedding for task content
     */
    async generateTaskEmbedding(taskData) {
        try {
            const content = this.createTaskSearchText(taskData);
            return await this.textToEmbedding(content);
        } catch (error) {
            console.error('Error generating task embedding:', error);
            return null;
        }
    }

    /**
     * Find similar modules using vector similarity
     */
    async findSimilarModules(moduleData, options = {}) {
        const {
            similarityThreshold = 0.8,
            limit = 10
        } = options;

        try {
            // Generate embedding for the new module
            const queryEmbedding = await this.generateModuleEmbedding(moduleData);
            if (!queryEmbedding) return [];

            const embeddingStr = '[' + queryEmbedding.join(',') + ']';

            const results = await sql`
                SELECT * FROM find_similar_modules(
                    ${embeddingStr}::vector,
                    ${similarityThreshold},
                    ${limit}
                )
            `;

            console.log(`🔍 Found ${results.length} similar modules`);
            return results;
        } catch (error) {
            console.error('Error finding similar modules:', error);
            return [];
        }
    }

    /**
     * Find similar resources using vector similarity
     */
    async findSimilarResources(resourceData, options = {}) {
        const {
            similarityThreshold = 0.85,
            limit = 15
        } = options;

        try {
            const queryEmbedding = await this.generateResourceEmbedding(resourceData);
            if (!queryEmbedding) return [];

            const embeddingStr = '[' + queryEmbedding.join(',') + ']';

            const results = await sql`
                SELECT * FROM find_similar_resources(
                    ${embeddingStr}::vector,
                    ${similarityThreshold},
                    ${limit}
                )
            `;

            console.log(`🔍 Found ${results.length} similar resources`);
            return results;
        } catch (error) {
            console.error('Error finding similar resources:', error);
            return [];
        }
    }

    /**
     * Find similar tasks using vector similarity
     */
    async findSimilarTasks(taskData, options = {}) {
        const {
            similarityThreshold = 0.8,
            limit = 10
        } = options;

        try {
            const queryEmbedding = await this.generateTaskEmbedding(taskData);
            if (!queryEmbedding) return [];

            const embeddingStr = '[' + queryEmbedding.join(',') + ']';

            const results = await sql`
                SELECT * FROM find_similar_tasks(
                    ${embeddingStr}::vector,
                    ${similarityThreshold},
                    ${limit}
                )
            `;

            console.log(`🔍 Found ${results.length} similar tasks`);
            return results;
        } catch (error) {
            console.error('Error finding similar tasks:', error);
            return [];
        }
    }

    /**
     * Store embedding for module
     */
    async storeModuleEmbedding(moduleId, moduleData) {
        try {
            const embedding = await this.generateModuleEmbedding(moduleData);
            if (!embedding) return false;

            const embeddingStr = '[' + embedding.join(',') + ']';
            
            await sql`
                UPDATE learning_modules 
                SET content_embedding = ${embeddingStr}::vector,
                    updated_at = NOW()
                WHERE module_id = ${moduleId}
            `;

            console.log(`✅ Stored embedding for module ${moduleId}`);
            
            // Create vector indexes if this is one of the first embeddings
            await this.ensureVectorIndexes();
            
            return true;
        } catch (error) {
            console.error('Error storing module embedding:', error);
            return false;
        }
    }

    /**
     * Store embedding for resource
     */
    async storeResourceEmbedding(resourceId, resourceData) {
        try {
            const embedding = await this.generateResourceEmbedding(resourceData);
            if (!embedding) return false;

            const embeddingStr = '[' + embedding.join(',') + ']';
            
            await sql`
                UPDATE learning_resources 
                SET content_embedding = ${embeddingStr}::vector,
                    updated_at = NOW()
                WHERE resource_id = ${resourceId}
            `;

            console.log(`✅ Stored embedding for resource ${resourceId}`);
            
            await this.ensureVectorIndexes();
            
            return true;
        } catch (error) {
            console.error('Error storing resource embedding:', error);
            return false;
        }
    }

    /**
     * Store embedding for task
     */
    async storeTaskEmbedding(taskId, taskData) {
        try {
            const embedding = await this.generateTaskEmbedding(taskData);
            if (!embedding) return false;

            const embeddingStr = '[' + embedding.join(',') + ']';
            
            await sql`
                UPDATE hands_on_tasks 
                SET content_embedding = ${embeddingStr}::vector,
                    updated_at = NOW()
                WHERE task_id = ${taskId}
            `;

            console.log(`✅ Stored embedding for task ${taskId}`);
            
            await this.ensureVectorIndexes();
            
            return true;
        } catch (error) {
            console.error('Error storing task embedding:', error);
            return false;
        }
    }

    /**
     * Ensure vector indexes are created when we have enough data
     */
    async ensureVectorIndexes() {
        if (this.vectorIndexesCreated) return;
        
        try {
            // Check if we have enough embeddings to create indexes (minimum 1000 for good performance)
            const counts = await sql`
                SELECT 
                    (SELECT COUNT(*) FROM learning_modules WHERE content_embedding IS NOT NULL) as modules,
                    (SELECT COUNT(*) FROM learning_resources WHERE content_embedding IS NOT NULL) as resources,
                    (SELECT COUNT(*) FROM hands_on_tasks WHERE content_embedding IS NOT NULL) as tasks
            `;

            const { modules, resources, tasks } = counts[0];
            
            if (modules >= 10 || resources >= 10 || tasks >= 10) {
                console.log('🔧 Creating vector indexes...');
                await sql`SELECT create_vector_indexes()`;
                this.vectorIndexesCreated = true;
                console.log('✅ Vector indexes created');
            }
        } catch (error) {
            console.error('Error creating vector indexes:', error);
        }
    }

    /**
     * Batch generate embeddings for existing content
     */
    async generateEmbeddingsForExistingContent(batchSize = 5) {
        try {
            console.log("🔄 Generating embeddings for existing content...");

            // Process modules
            const modulesResult = await sql`
                SELECT module_id, module_name, module_description, skills_covered
                FROM learning_modules 
                WHERE content_embedding IS NULL
                ORDER BY created_at DESC
                LIMIT ${batchSize}
            `;

            for (const module of modulesResult) {
                await this.storeModuleEmbedding(module.module_id, module);
                await this.sleep(200); // Rate limiting
            }

            // Process resources
            const resourcesResult = await sql`
                SELECT resource_id, resource_title, resource_type, description
                FROM learning_resources 
                WHERE content_embedding IS NULL
                ORDER BY created_at DESC
                LIMIT ${batchSize}
            `;

            for (const resource of resourcesResult) {
                await this.storeResourceEmbedding(resource.resource_id, resource);
                await this.sleep(200);
            }

            // Process tasks
            const tasksResult = await sql`
                SELECT task_id, task_title, task_description, task_type
                FROM hands_on_tasks 
                WHERE content_embedding IS NULL
                ORDER BY created_at DESC
                LIMIT ${batchSize}
            `;

            for (const task of tasksResult) {
                await this.storeTaskEmbedding(task.task_id, task);
                await this.sleep(200);
            }

            console.log(`✅ Processed ${modulesResult.length} modules, ${resourcesResult.length} resources, ${tasksResult.length} tasks`);
            
            return {
                processed: {
                    modules: modulesResult.length,
                    resources: resourcesResult.length,
                    tasks: tasksResult.length
                }
            };
        } catch (error) {
            console.error('Error in batch embedding generation:', error);
            throw error;
        }
    }

    /**
     * Get statistics about embeddings in the database
     */
    async getEmbeddingStats() {
        try {
            const stats = await sql`
                SELECT 
                    (SELECT COUNT(*) FROM learning_modules) as total_modules,
                    (SELECT COUNT(*) FROM learning_modules WHERE content_embedding IS NOT NULL) as modules_with_embeddings,
                    (SELECT COUNT(*) FROM learning_resources) as total_resources,
                    (SELECT COUNT(*) FROM learning_resources WHERE content_embedding IS NOT NULL) as resources_with_embeddings,
                    (SELECT COUNT(*) FROM hands_on_tasks) as total_tasks,
                    (SELECT COUNT(*) FROM hands_on_tasks WHERE content_embedding IS NOT NULL) as tasks_with_embeddings
            `;

            return stats[0];
        } catch (error) {
            console.error('Error getting embedding stats:', error);
            return null;
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Create searchable text for module
     */
    createModuleSearchText(moduleData) {
        const parts = [
            moduleData.module_name || moduleData.name || '',
            moduleData.module_description || moduleData.description || '',
            (moduleData.skills_covered || []).join(' '),
            moduleData.difficulty || '',
            (moduleData.prerequisites || []).join(' ')
        ].filter(Boolean);

        return parts.join(' ').toLowerCase().trim();
    }

    /**
     * Create searchable text for resource
     */
    createResourceSearchText(resourceData) {
        const parts = [
            resourceData.resource_title || resourceData.title || '',
            resourceData.description || '',
            resourceData.resource_type || resourceData.type || ''
        ].filter(Boolean);

        return parts.join(' ').toLowerCase().trim();
    }

    /**
     * Create searchable text for task
     */
    createTaskSearchText(taskData) {
        const parts = [
            taskData.task_title || taskData.title || '',
            taskData.task_description || taskData.description || '',
            taskData.task_type || taskData.type || '',
            taskData.instructions || ''
        ].filter(Boolean);

        return parts.join(' ').toLowerCase().trim();
    }

    /**
     * Sleep utility for rate limiting
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Health check for embedding service
     */
    async healthCheck() {
        try {
            // Test embedding generation
            const testEmbedding = await this.textToEmbedding("test embedding");
            
            // Test database connection
            const dbTest = await sql`SELECT 1 as test`;
            
            // Get embedding statistics
            const stats = await this.getEmbeddingStats();
            
            return {
                status: 'healthy',
                embeddingModel: this.embeddingModel,
                embeddingDimensions: testEmbedding.length,
                databaseConnection: dbTest.length > 0,
                stats: stats,
                vectorIndexesCreated: this.vectorIndexesCreated,
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

export default new EmbeddingService();