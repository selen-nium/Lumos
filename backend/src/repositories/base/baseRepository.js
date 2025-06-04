import supabaseService from '../../services/core/supabaseService.js';

class BaseRepository {
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.db = supabaseService;
  }

  /**
   * Find record by ID
   */
  async findById(id) {
    try {
      console.log(`🔍 Finding ${this.tableName} by ${this.primaryKey}:`, id);
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq(this.primaryKey, id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }
      
      return data || null;
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID:`, error);
      throw new Error(`Failed to find ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Find records by criteria
   */
  async findBy(criteria, options = {}) {
    try {
      console.log(`🔍 Finding ${this.tableName} by criteria:`, criteria);
      
      const client = this.db.serviceClient;
      let query = client.from(this.tableName).select('*');

      // Apply filters
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error finding ${this.tableName} by criteria:`, error);
      throw new Error(`Failed to find ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Find single record by criteria
   */
  async findOneBy(criteria) {
    try {
      const results = await this.findBy(criteria, { limit: 1 });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error finding single ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get all records
   */
  async findAll(options = {}) {
    try {
      console.log(`📋 Getting all ${this.tableName}`);
      
      const client = this.db.serviceClient;
      let query = client.from(this.tableName).select('*');

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error getting all ${this.tableName}:`, error);
      throw new Error(`Failed to get ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Create new record
   */
  async create(data) {
    try {
      console.log(`✨ Creating new ${this.tableName}`);
      
      const preparedData = this.prepareForInsert(data);
      
      const client = this.db.serviceClient;
      const { data: result, error } = await client
        .from(this.tableName)
        .insert(preparedData)
        .select()
        .single();
      
      if (error) throw error;
      
      return result;
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw new Error(`Failed to create ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Update record by ID
   */
  async updateById(id, updates) {
    try {
      console.log(`📝 Updating ${this.tableName} with ${this.primaryKey}:`, id);
      
      const preparedUpdates = this.prepareForUpdate(updates);
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from(this.tableName)
        .update(preparedUpdates)
        .eq(this.primaryKey, id)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw new Error(`Failed to update ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Update records by criteria
   */
  async updateBy(criteria, updates) {
    try {
      console.log(`📝 Updating ${this.tableName} by criteria:`, criteria);
      
      const preparedUpdates = this.prepareForUpdate(updates);
      
      const client = this.db.serviceClient;
      let query = client.from(this.tableName).update(preparedUpdates);
      
      // Apply filters
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query.select();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Error updating ${this.tableName} by criteria:`, error);
      throw new Error(`Failed to update ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Delete record by ID
   */
  async deleteById(id) {
    try {
      console.log(`🗑️ Deleting ${this.tableName} with ${this.primaryKey}:`, id);
      
      const client = this.db.serviceClient;
      const { data, error } = await client
        .from(this.tableName)
        .delete()
        .eq(this.primaryKey, id)
        .select();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw new Error(`Failed to delete ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Delete records by criteria
   */
  async deleteBy(criteria) {
    try {
      console.log(`🗑️ Deleting ${this.tableName} by criteria:`, criteria);
      
      const client = this.db.serviceClient;
      let query = client.from(this.tableName).delete();
      
      // Apply filters
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { data, error } = await query.select();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Error deleting ${this.tableName} by criteria:`, error);
      throw new Error(`Failed to delete ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Check if record exists
   */
  async exists(criteria) {
    try {
      const record = await this.findOneBy(criteria);
      return record !== null;
    } catch (error) {
      console.error(`Error checking if ${this.tableName} exists:`, error);
      return false;
    }
  }

  /**
   * Count records
   */
  async count(criteria = {}) {
    try {
      console.log(`🔢 Counting ${this.tableName}`);
      
      const client = this.db.serviceClient;
      let query = client.from(this.tableName).select('*', { count: 'exact', head: true });
      
      // Apply filters
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { count, error } = await query;
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error(`Error counting ${this.tableName}:`, error);
      throw new Error(`Failed to count ${this.tableName}: ${error.message}`);
    }
  }

  /**
   * Upsert (insert or update) record
   */
  async upsert(data, conflictColumns = []) {
    try {
      console.log(`🔄 Upserting ${this.tableName}`);
      
      const preparedData = this.prepareForInsert(data);
      
      const client = this.db.serviceClient;
      const upsertOptions = conflictColumns.length > 0 ? { onConflict: conflictColumns.join(',') } : {};
      
      const { data: result, error } = await client
        .from(this.tableName)
        .upsert(preparedData, upsertOptions)
        .select()
        .single();
      
      if (error) throw error;
      
      return result;
    } catch (error) {
      console.error(`Error upserting ${this.tableName}:`, error);
      throw new Error(`Failed to upsert ${this.tableName}: ${error.message}`);
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Prepare data for insert (add timestamps, etc.)
   */
  prepareForInsert(data) {
    const now = new Date().toISOString();
    return {
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };
  }

  /**
   * Prepare data for update (update timestamp)
   */
  prepareForUpdate(data) {
    return {
      ...data,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Sanitize data (remove undefined values, etc.)
   */
  sanitizeData(data) {
    const sanitized = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(data, requiredFields = []) {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Get table information
   */
  getTableInfo() {
    return {
      tableName: this.tableName,
      primaryKey: this.primaryKey
    };
  }
}

export default BaseRepository;