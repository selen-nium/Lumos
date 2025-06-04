class BaseModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.createdAt = data.created_at || data.createdAt || new Date().toISOString();
        this.updatedAt = data.updated_at || data.updatedAt || new Date().toISOString();
        
        // Track changes for dirty checking
        this._originalData = { ...data };
        this._isDirty = false;
        this._errors = [];
    }

    /**
     * Mark the model as dirty (has unsaved changes)
     */
    markDirty() {
        this._isDirty = true;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Check if model has unsaved changes
     */
    isDirty() {
        return this._isDirty;
    }

    /**
     * Reset dirty state (usually after save)
     */
    markClean() {
        this._isDirty = false;
        this._originalData = this.toJSON();
    }

    /**
     * Add validation error
     */
    addError(field, message) {
        this._errors.push({ field, message });
    }

    /**
     * Get all validation errors
     */
    getErrors() {
        return this._errors;
    }

    /**
     * Check if model is valid
     */
    isValid() {
        this._errors = [];
        this.validate();
        return this._errors.length === 0;
    }

    /**
     * Validate the model (override in subclasses)
     */
    validate() {
        // Base validation - override in subclasses
        if (!this.id && this.constructor.name !== 'BaseModel') {
            // Allow models without IDs for new objects
        }
    }

    /**
     * Convert model to plain JSON object
     */
    toJSON() {
        const json = {};
        
        // Get all enumerable properties
        for (const key in this) {
            if (this.hasOwnProperty(key) && !key.startsWith('_')) {
                const value = this[key];
                
                // Handle nested models
                if (value && typeof value.toJSON === 'function') {
                    json[key] = value.toJSON();
                } else if (Array.isArray(value)) {
                    json[key] = value.map(item => 
                        item && typeof item.toJSON === 'function' ? item.toJSON() : item
                    );
                } else {
                    json[key] = value;
                }
            }
        }
        
        return json;
    }

    /**
     * Convert to database format (snake_case)
     */
    toDatabase() {
        const json = this.toJSON();
        const dbFormat = {};
        
        for (const [key, value] of Object.entries(json)) {
            const dbKey = this.camelToSnake(key);
            dbFormat[dbKey] = value;
        }
        
        return dbFormat;
    }

    /**
     * Create model from database format (snake_case to camelCase)
     */
    static fromDatabase(data) {
        if (!data) return null;
        
        const camelData = {};
        for (const [key, value] of Object.entries(data)) {
            const camelKey = this.snakeToCamel(key);
            camelData[camelKey] = value;
        }
        
        return new this(camelData);
    }

    /**
     * Convert camelCase to snake_case
     */
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    /**
     * Convert snake_case to camelCase
     */
    static snakeToCamel(str) {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Clone the model
     */
    clone() {
        return new this.constructor(this.toJSON());
    }

    /**
     * Update model with new data
     */
    update(data) {
        for (const [key, value] of Object.entries(data)) {
            if (this.hasOwnProperty(key) || key in this) {
                this[key] = value;
            }
        }
        this.markDirty();
        return this;
    }

    /**
     * Compare with another model
     */
    equals(other) {
        if (!other || this.constructor !== other.constructor) {
            return false;
        }
        return this.id === other.id;
    }

    /**
     * Get human-readable string representation
     */
    toString() {
        return `${this.constructor.name}(id=${this.id})`;
    }
}

export default BaseModel;