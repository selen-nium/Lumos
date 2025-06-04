const resourceSchema = {
  type: "object",
  properties: {
    resource_title: {
      type: "string",
      description: "Title of the learning resource"
    },
    resource_type: {
      type: "string",
      enum: ["video", "article", "documentation", "tutorial", "interactive", "course"],
      description: "Type of learning resource"
    },
    url: {
      type: "string",
      description: "URL or placeholder for the resource"
    },
    estimated_time_minutes: {
      type: "number",
      minimum: 5,
      maximum: 180,
      description: "Estimated time to complete in minutes"
    },
    description: {
      type: "string",
      description: "Brief description of the resource content"
    }
  },
  required: ["resource_title", "resource_type", "url", "estimated_time_minutes", "description"],
  additionalProperties: false
};

const taskSchema = {
  type: "object",
  properties: {
    task_title: {
      type: "string",
      description: "Title of the hands-on task"
    },
    task_description: {
      type: "string",
      description: "Detailed description of what the learner needs to do"
    },
    task_type: {
      type: "string",
      enum: ["practice", "project", "quiz", "exercise"],
      description: "Type of task"
    },
    estimated_time_minutes: {
      type: "number",
      minimum: 15,
      maximum: 240,
      description: "Estimated time to complete in minutes"
    },
    instructions: {
      type: "string",
      description: "Step-by-step instructions for the task"
    }
  },
  required: ["task_title", "task_description", "task_type", "estimated_time_minutes", "instructions"],
  additionalProperties: false
};


const moduleSchema = {
   type: "object",
   properties: {
     module_id: {
       type: ["string", "null"],
       description: "Unique identifier for the module (null for new modules)"
     },
     module_name: {
       type: "string",
       description: "Name of the learning module"
     },
     module_description: {
       type: "string", 
       description: "Description of what will be learned in this module"
     },
     difficulty: {
       type: "string",
       enum: ["beginner", "intermediate", "advanced"],
       description: "Difficulty level of the module"
     },
     estimated_hours: {
       type: "number",
       minimum: 1,
       maximum: 20,
       description: "Estimated hours to complete the module"
     },
     prerequisites: {
       type: "array",
       items: { type: "string" },
       description: "List of prerequisite module IDs or concepts"
     },
     skills_covered: {
       type: "array",
       items: { type: "string" },
       description: "List of skills that will be learned in this module"
     },
     resources: {
       type: "array",
       minItems: 4,
       maxItems: 5,
       items: resourceSchema,
       description: "Learning resources for this module (must have 4-5 items)"
     },
     tasks: {
       type: "array",
       minItems: 3,
       maxItems: 3,
       items: taskSchema,
       description: "Hands-on tasks for this module (must have exactly 3 items)"
     }
   },
   required: ["module_name", "module_description", "difficulty", "estimated_hours", "prerequisites", "skills_covered", "resources", "tasks"],
   required: ["module_id", "module_name", "module_description", "difficulty", "estimated_hours", "prerequisites", "skills_covered", "resources", "tasks"],
   additionalProperties: false
};



export const roadmapGenerationSchema = {
  type: "object",
  properties: {
    roadmap_title: {
      type: "string",
      description: "Title of the complete learning roadmap"
    },
    estimated_completion_weeks: {
      type: "number",
      minimum: 4,
      maximum: 52,
      description: "Estimated weeks to complete the entire roadmap"
    },
    overall_difficulty: {
      type: "string",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Overall difficulty level of the roadmap"
    },
    description: {
      type: "string",
      description: "Brief description of what the roadmap covers"
    },
    modules: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: moduleSchema,
      description: "List of learning modules (must have 4-8 modules)"
    }
  },
  required: ["roadmap_title", "estimated_completion_weeks", "overall_difficulty", "description", "modules"],
  additionalProperties: false
};

export const roadmapModificationSchema = {
  type: "object",
  properties: {
    roadmap_title: {
      type: "string",
      description: "Updated title of the learning roadmap"
    },
    estimated_duration_weeks: {
      type: "number",
      minimum: 4,
      maximum: 52,
      description: "Updated estimated duration in weeks"
    },
    overall_difficulty: {
      type: "string",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Updated overall difficulty level"
    },
    modules: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          module_id: {
            type: ["string", "null"],
            description: "Existing module ID to preserve, or null for new modules"
          },
          module_name: {
            type: "string",
            description: "Name of the module"
          },
          module_description: {
            type: "string",
            description: "Description of the module content"
          },
          difficulty: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            description: "Module difficulty level"
          },
          estimated_hours: {
            type: "number",
            minimum: 1,
            maximum: 20,
            description: "Estimated completion time in hours"
          },
          prerequisites: {
            type: "array",
            items: { type: "string" },
            description: "Prerequisites for this module"
          },
          skills_covered: {
            type: "array",
            items: { type: "string" },
            description: "Skills learned in this module"
          },
          resources: {
            type: "array",
            minItems: 3,
            maxItems: 6,
            items: {
              type: "object",
              properties: {
                resource_title: {
                  type: "string",
                  description: "Title of the learning resource"
                },
                resource_type: {
                  type: "string",
                  enum: ["video", "article", "documentation", "tutorial", "interactive", "course"],
                  description: "Type of learning resource"
                },
                url: {
                  type: "string",
                  description: "URL or placeholder for the resource"
                },
                estimated_time_minutes: {
                  type: "number",
                  minimum: 5,
                  maximum: 180,
                  description: "Estimated time to complete in minutes"
                },
                description: {
                  type: "string",
                  description: "Brief description of the resource content"
                }
              },
              // FIXED: Include ALL properties in required array
              required: ["resource_title", "resource_type", "url", "estimated_time_minutes", "description"],
              additionalProperties: false
            },
            description: "Learning resources (3-6 items for flexibility)"
          },
          tasks: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: {
              type: "object",
              properties: {
                task_title: {
                  type: "string",
                  description: "Title of the hands-on task"
                },
                task_description: {
                  type: "string",
                  description: "Detailed description of what the learner needs to do"
                },
                task_type: {
                  type: "string",
                  enum: ["practice", "project", "quiz", "exercise"],
                  description: "Type of task"
                },
                estimated_time_minutes: {
                  type: "number",
                  minimum: 15,
                  maximum: 240,
                  description: "Estimated time to complete in minutes"
                },
                instructions: {
                  type: "string",
                  description: "Step-by-step instructions for the task"
                }
              },
              // FIXED: Include ALL properties in required array
              required: ["task_title", "task_description", "task_type", "estimated_time_minutes", "instructions"],
              additionalProperties: false
            },
            description: "Hands-on tasks (2-4 items for flexibility)"
          }
        },
        // FIXED: Include ALL properties in required array, including module_id
        required: ["module_id", "module_name", "module_description", "difficulty", "estimated_hours", "prerequisites", "skills_covered", "resources", "tasks"],
        additionalProperties: false
      },
      description: "List of modules in the modified roadmap"
    },
    changesApplied: {
      type: "array",
      items: { type: "string" },
      description: "List of changes that were applied to the roadmap"
    },
    modification_reasoning: {
      type: "string",
      description: "Explanation of why these changes were made"
    }
  },
  required: ["roadmap_title", "estimated_duration_weeks", "overall_difficulty", "modules", "changesApplied", "modification_reasoning"],
  additionalProperties: false
};

export const progressAnalysisSchema = {
  type: "object",
  properties: {
    analysis: {
      type: "string",
      description: "Detailed analysis of the user's learning progress"
    },
    achievements: {
      type: "array",
      items: { type: "string" },
      description: "List of user's achievements and milestones"
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "Identified learning strengths"
    },
    recommendations: {
      type: "array",
      items: { type: "string" },
      description: "Specific next steps and recommendations"
    },
    motivation_message: {
      type: "string",
      description: "Encouraging message to keep the user motivated"
    }
  },
  required: ["analysis", "achievements", "strengths", "recommendations", "motivation_message"],
  additionalProperties: false
};

export const studyPlanSchema = {
  type: "object",
  properties: {
    plan_title: {
      type: "string",
      description: "Title of the study plan"
    },
    timeframe: {
      type: "string",
      enum: ["week", "month", "quarter"],
      description: "Duration of the study plan"
    },
    weekly_schedule: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { 
            type: "string",
            description: "Day of the week"
          },
          time_slot: { 
            type: "string",
            description: "Time slot for the activity"
          },
          activity: { 
            type: "string",
            description: "Learning activity to perform"
          },
          duration_minutes: { 
            type: "number",
            description: "Duration of the activity in minutes"
          },
          module: { 
            type: "string",
            description: "Related learning module"
          }
        },
        required: ["day", "activity", "duration_minutes"],
        additionalProperties: false
      },
      description: "Weekly schedule breakdown"
    },
    milestones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          week: { 
            type: "number",
            description: "Week number"
          },
          goal: { 
            type: "string",
            description: "Goal to achieve"
          },
          deliverable: { 
            type: "string",
            description: "Expected deliverable"
          }
        },
        required: ["week", "goal"],
        additionalProperties: false
      },
      description: "Key milestones and goals"
    },
    tips: {
      type: "array",
      items: { type: "string" },
      description: "Study tips and best practices"
    }
  },
  required: ["plan_title", "timeframe", "weekly_schedule", "milestones", "tips"],
  additionalProperties: false
};

export const schemas = {
  roadmapGeneration: roadmapGenerationSchema,
  roadmapModification: roadmapModificationSchema,
  progressAnalysis: progressAnalysisSchema,
  studyPlan: studyPlanSchema
};