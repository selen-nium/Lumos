#!/usr/bin/env node

/**
 * Embedding Generator for Lumos Learning Platform
 * Generates vector embeddings for all content using OpenAI API
 * Uses postgres package with Supabase transaction pooler
 */

import OpenAI from 'openai';
import postgres from 'postgres';
import { promises as fs } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

class EmbeddingGenerator {
    constructor() {
        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Database configuration
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        
        this.sql = postgres(process.env.DATABASE_URL);
        
        // Configuration
        this.embeddingModel = 'text-embedding-3-small';
        this.embeddingDimensions = 1536;
        this.batchSize = 20;
        
        // Setup logging
        this.setupLogging();
    }
    
    setupLogging() {
        this.log = {
            info: (msg) => {
                const timestamp = new Date().toISOString();
                const logMsg = `${timestamp} - INFO - ${msg}`;
                console.log(logMsg);
                this.writeToLogFile(logMsg);
            },
            error: (msg) => {
                const timestamp = new Date().toISOString();
                const logMsg = `${timestamp} - ERROR - ${msg}`;
                console.error(logMsg);
                this.writeToLogFile(logMsg);
            },
            debug: (msg) => {
                const timestamp = new Date().toISOString();
                const logMsg = `${timestamp} - DEBUG - ${msg}`;
                console.log(logMsg);
                this.writeToLogFile(logMsg);
            }
        };
        
        this.logFile = `embedding_generation_${new Date().toISOString().split('T')[0]}.log`;
    }
    
    async writeToLogFile(message) {
        try {
            await fs.appendFile(this.logFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    async getContentNeedingEmbeddings() {
        try {
            const result = await this.sql`SELECT * FROM get_content_needing_embeddings()`;
            
            const contentItems = result.map(row => ({
                contentType: row.content_type,
                contentId: row.content_id,
                textContent: row.text_content,
                lastUpdated: row.last_updated
            }));
            
            this.log.info(`Found ${contentItems.length} items needing embeddings`);
            return contentItems;
            
        } catch (error) {
            this.log.error(`Error fetching content: ${error.message}`);
            throw error;
        }
    }
    
    cleanText(text) {
        if (!text) return '';
        
        // Remove excessive whitespace
        let cleaned = text.replace(/\s+/g, ' ').trim();
        
        // Truncate if too long (8K token limit for text-embedding-3-small)
        const maxChars = 8000 * 4;
        if (cleaned.length > maxChars) {
            cleaned = cleaned.substring(0, maxChars) + '...';
            this.log.debug(`Text truncated to ${maxChars} characters`);
        }
        
        return cleaned;
    }
    
    async generateEmbedding(text) {
        try {
            const cleanedText = this.cleanText(text);
            
            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: cleanedText,
                encoding_format: 'float'
            });
            
            return response.data[0].embedding;
            
        } catch (error) {
            this.log.error(`Error generating embedding: ${error.message}`);
            throw error;
        }
    }
    
    async updateEmbeddingInDB(contentType, contentId, embedding) {
        try {
            const embeddingStr = '[' + embedding.join(',') + ']';
            
            const result = await this.sql`
                SELECT update_embedding(
                    ${contentType}, 
                    ${contentId}, 
                    ${embeddingStr}::vector, 
                    ${this.embeddingModel}
                )
            `;
            
            const success = result[0].update_embedding;
            
            if (success) {
                this.log.debug(`Updated embedding for ${contentType} ID ${contentId}`);
            } else {
                this.log.error(`Failed to update embedding for ${contentType} ID ${contentId}`);
            }
            
            return success;
            
        } catch (error) {
            this.log.error(`Database update error: ${error.message}`);
            return false;
        }
    }
    
    async processBatch(contentItems) {
        const results = { success: 0, failed: 0 };
        
        for (const item of contentItems) {
            try {
                const preview = item.textContent.substring(0, 100);
                this.log.info(`Processing ${item.contentType} ID ${item.contentId}: ${preview}...`);
                
                // Generate embedding
                const embedding = await this.generateEmbedding(item.textContent);
                
                // Update in database
                const updateSuccess = await this.updateEmbeddingInDB(
                    item.contentType, 
                    item.contentId, 
                    embedding
                );
                
                if (updateSuccess) {
                    results.success++;
                    this.log.info(`✓ Successfully processed ${item.contentType} ID ${item.contentId}`);
                } else {
                    results.failed++;
                    this.log.error(`✗ Failed to update ${item.contentType} ID ${item.contentId}`);
                }
                
                // Rate limiting
                await this.sleep(50);
                
            } catch (error) {
                results.failed++;
                this.log.error(`✗ Error processing ${item.contentType} ID ${item.contentId}: ${error.message}`);
                continue;
            }
        }
        
        return results;
    }
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async generateAllEmbeddings() {
        const startTime = new Date();
        this.log.info('Starting embedding generation process...');
        this.log.info(`Using embedding model: ${this.embeddingModel}`);
        
        // Get all content needing embeddings
        const contentItems = await this.getContentNeedingEmbeddings();
        
        if (contentItems.length === 0) {
            this.log.info('No content needs embeddings. All done!');
            return { total: 0, success: 0, failed: 0, duration: 0 };
        }
        
        // Estimate cost
        const estimatedTokens = contentItems.reduce((total, item) => {
            return total + Math.ceil(item.textContent.length / 4);
        }, 0);
        const estimatedCost = (estimatedTokens / 1000) * 0.00002;
        this.log.info(`Estimated tokens: ${estimatedTokens.toLocaleString()}`);
        this.log.info(`Estimated cost: $${estimatedCost.toFixed(4)}`);
        
        // Process in batches
        const totalResults = { success: 0, failed: 0 };
        
        for (let i = 0; i < contentItems.length; i += this.batchSize) {
            const batch = contentItems.slice(i, i + this.batchSize);
            const batchNum = Math.floor(i / this.batchSize) + 1;
            const totalBatches = Math.ceil(contentItems.length / this.batchSize);
            
            this.log.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`);
            
            const batchResults = await this.processBatch(batch);
            totalResults.success += batchResults.success;
            totalResults.failed += batchResults.failed;
            
            // Pause between batches
            if (i + this.batchSize < contentItems.length) {
                this.log.info('Pausing between batches...');
                await this.sleep(500);
            }
        }
        
        // Calculate summary
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        
        const summary = {
            total: contentItems.length,
            success: totalResults.success,
            failed: totalResults.failed,
            duration: duration,
            estimatedCost: estimatedCost,
            model: this.embeddingModel,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
        };
        
        this.log.info('='.repeat(50));
        this.log.info('EMBEDDING GENERATION COMPLETE');
        this.log.info('='.repeat(50));
        this.log.info(`Total items processed: ${summary.total}`);
        this.log.info(`Successful: ${summary.success}`);
        this.log.info(`Failed: ${summary.failed}`);
        this.log.info(`Duration: ${duration.toFixed(2)} seconds`);
        this.log.info(`Success rate: ${(summary.success / summary.total * 100).toFixed(1)}%`);
        this.log.info(`Estimated cost: $${estimatedCost.toFixed(4)}`);
        this.log.info(`Model used: ${this.embeddingModel}`);
        
        return summary;
    }
    
    async checkEmbeddingCoverage() {
        try {
            const result = await this.sql`SELECT * FROM embedding_coverage ORDER BY content_type`;
            
            const coverage = {};
            result.forEach(row => {
                coverage[row.content_type] = {
                    totalItems: parseInt(row.total_items),
                    itemsWithEmbeddings: parseInt(row.items_with_embeddings),
                    coveragePercentage: parseFloat(row.coverage_percentage),
                    latestEmbeddingDate: row.latest_embedding_date
                };
            });
            
            return coverage;
            
        } catch (error) {
            this.log.error(`Error checking coverage: ${error.message}`);
            return {};
        }
    }
    
    async saveResults(results) {
        const filename = `embedding_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        try {
            await fs.writeFile(filename, JSON.stringify(results, null, 2));
            this.log.info(`Results saved to ${filename}`);
        } catch (error) {
            this.log.error(`Failed to save results: ${error.message}`);
        }
    }
    
    async cleanup() {
        try {
            await this.sql.end();
            this.log.info('Database connection closed');
        } catch (error) {
            this.log.error(`Error closing database connection: ${error.message}`);
        }
    }
}

async function main() {
    let generator;
    
    try {
        // Validate environment variables
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        
        // Initialize generator
        generator = new EmbeddingGenerator();
        
        // Check current status
        generator.log.info('Checking current embedding coverage...');
        const coverage = await generator.checkEmbeddingCoverage();
        
        for (const [contentType, stats] of Object.entries(coverage)) {
            generator.log.info(
                `${contentType}: ${stats.itemsWithEmbeddings}/${stats.totalItems} ` +
                `(${stats.coveragePercentage.toFixed(1)}%)`
            );
        }
        
        // Generate embeddings
        const results = await generator.generateAllEmbeddings();
        
        // Check final status
        generator.log.info('\nFinal embedding coverage:');
        const finalCoverage = await generator.checkEmbeddingCoverage();
        
        for (const [contentType, stats] of Object.entries(finalCoverage)) {
            generator.log.info(
                `${contentType}: ${stats.itemsWithEmbeddings}/${stats.totalItems} ` +
                `(${stats.coveragePercentage.toFixed(1)}%)`
            );
        }
        
        // Save results
        await generator.saveResults(results);
        
        generator.log.info('Embedding generation completed successfully!');
        
    } catch (error) {
        console.error('Embedding generation failed:', error.message);
        process.exit(1);
    } finally {
        // Clean up database connection
        if (generator) {
            await generator.cleanup();
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default EmbeddingGenerator;