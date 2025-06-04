import OpenAI from 'openai';

class LLMService {
  constructor() {
    this.openai = null; // Init as null
    
    // Default models
    this.defaultChatModel = 'gpt-4o-mini';
    this.defaultEmbeddingModel = 'text-embedding-3-small';
    
    // Default parameters
    this.defaultChatParams = {
      temperature: 0.3,
      max_tokens: 800,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };
  }

  /**
   * Lazy initialization of OpenAI client
   */
  getOpenAIClient() {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      console.log('✅ OpenAI client initialized successfully');
    }
    
    return this.openai;
  }

  /**
   * Generate chat completion - handles all OpenAI chat API calls
   */
  async generateChatCompletion(messages, options = {}) {
    try {
      const params = {
        model: options.model || this.defaultChatModel,
        messages: this.formatMessages(messages),
        ...this.defaultChatParams,
        ...options // Override defaults with provided options
      };

      console.log(`🤖 Calling OpenAI API with model: ${params.model}`);
      
      const openai = this.getOpenAIClient(); // Get client lazily
      const completion = await openai.chat.completions.create(params);
      
      console.log(`✅ OpenAI API call successful - ${completion.usage?.total_tokens || 'unknown'} tokens used`);
      
      return {
        content: completion.choices[0].message.content,
        usage: completion.usage,
        model: params.model,
        finishReason: completion.choices[0].finish_reason
      };
      
    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Generate structured JSON output - for roadmap generation, etc.
   */
  async generateStructuredOutput(messages, options = {}) {
    try {
      const structuredOptions = {
        ...options,
        response_format: { type: "json_object" },
        temperature: options.temperature || 0.2 // Lower temperature for structured output
      };

      const result = await this.generateChatCompletion(messages, structuredOptions);
      
      // Parse and validate JSON
      try {
        const parsedContent = JSON.parse(result.content);
        return {
          ...result,
          content: result.content, // Keep original string
          parsed: parsedContent    // Add parsed object
        };
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
      }
      
    } catch (error) {
      console.error('❌ Structured output generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate text embeddings
   */
  async generateEmbedding(text, options = {}) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text for embedding cannot be empty');
      }

      console.log(`🔢 Generating embedding for text: ${text.substring(0, 50)}...`);
      
      const openai = this.getOpenAIClient(); // Get client lazily
      const response = await openai.embeddings.create({
        model: options.model || this.defaultEmbeddingModel,
        input: text.trim(),
        encoding_format: options.encoding_format || 'float'
      });
      
      console.log(`✅ Embedding generated successfully`);
      
      return {
        embedding: response.data[0].embedding,
        usage: response.usage,
        model: response.model
      };
      
    } catch (error) {
      console.error('❌ Embedding generation error:', error);
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Generate chat completion with system prompt - convenience method
   */
  async generateWithSystemPrompt(systemPrompt, userMessage, options = {}) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];
    
    return await this.generateChatCompletion(messages, options);
  }

  /**
   * Generate completion with conversation history
   */
  async generateWithHistory(systemPrompt, conversationHistory, newMessage, options = {}) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: newMessage }
    ];
    
    return await this.generateChatCompletion(messages, options);
  }

  /**
   * Check if OpenAI API is available
   */
  async healthCheck() {
    try {
      const result = await this.generateChatCompletion([
        { role: 'user', content: 'Hello' }
      ], { max_tokens: 10 });
      
      return {
        status: 'healthy',
        model: result.model,
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now()
      };
    }
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Format messages to ensure they match OpenAI API requirements
   */
  formatMessages(messages) {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    return messages.map(msg => {
      if (typeof msg === 'string') {
        return { role: 'user', content: msg };
      }
      
      if (!msg.role || !msg.content) {
        throw new Error('Each message must have role and content');
      }
      
      // Validate role
      const validRoles = ['system', 'user', 'assistant'];
      if (!validRoles.includes(msg.role)) {
        throw new Error(`Invalid message role: ${msg.role}. Must be one of: ${validRoles.join(', ')}`);
      }
      
      return {
        role: msg.role,
        content: String(msg.content)
      };
    });
  }

  /**
   * Handle OpenAI API errors with better error messages
   */
  handleOpenAIError(error) {
    // Rate limiting
    if (error.status === 429) {
      return new Error('OpenAI API rate limit exceeded. Please try again later.');
    }
    
    // Invalid API key
    if (error.status === 401) {
      return new Error('OpenAI API authentication failed. Please check your API key.');
    }
    
    // Model not found
    if (error.status === 404) {
      return new Error('OpenAI model not found. Please check the model name.');
    }
    
    // Server errors
    if (error.status >= 500) {
      return new Error('OpenAI API server error. Please try again later.');
    }
    
    // Token limit exceeded
    if (error.code === 'context_length_exceeded') {
      return new Error('Message too long for the model. Please shorten your input.');
    }
    
    // Content filter
    if (error.code === 'content_filter') {
      return new Error('Content was filtered by OpenAI safety systems.');
    }
    
    // Default error
    return new Error(`OpenAI API error: ${error.message || 'Unknown error'}`);
  }

  /**
   * Get usage statistics for monitoring
   */
  getUsageStats() {
    // In a production app, you'd track this
    return {
      totalRequests: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
  }

  /**
   * Estimate token count for a message (rough estimation)
   */
  estimateTokenCount(text) {
    if (!text) return 0;
    
    // Rough estimation: 1 token ≈ 4 characters
    // This is not exact but good for rough estimation
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate if we're within token limits before making API call
   */
  validateTokenLimits(messages, options = {}) {
    const model = options.model || this.defaultChatModel;
    const maxTokens = options.max_tokens || this.defaultChatParams.max_tokens;
    
    // Model token limits (simplified)
    const modelLimits = {
      'gpt-4o-mini': 128000,
      'gpt-4o': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 4096
    };
    
    const modelLimit = modelLimits[model] || 4096;
    
    // Estimate total tokens
    const messageTokens = messages.reduce((total, msg) => {
      return total + this.estimateTokenCount(msg.content || '');
    }, 0);
    
    const totalEstimatedTokens = messageTokens + maxTokens;
    
    if (totalEstimatedTokens > modelLimit) {
      throw new Error(
        `Estimated token count (${totalEstimatedTokens}) exceeds model limit (${modelLimit}). ` +
        `Consider shortening your input or using a model with higher limits.`
      );
    }
    
    return {
      estimatedInputTokens: messageTokens,
      maxOutputTokens: maxTokens,
      modelLimit: modelLimit,
      withinLimit: true
    };
  }
}

export default new LLMService();