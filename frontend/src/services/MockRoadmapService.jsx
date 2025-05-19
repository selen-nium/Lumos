// services/MockRoadmapService.js

/**
 * This is a mock service that simulates fetching data from a backend.
 * Replace this with real API calls when implementing the backend.
 */

const mockRoadmapData = {
  path_id: 1,
  user_id: 'user-123',
  path_title: 'Node.js',
  path_description: 'A comprehensive roadmap to learn Node.js development',
  estimated_duration_days: 30,
  creation_method: 'ai-generated',
  created_at: '2023-05-15T00:00:00Z',
  updated_at: '2023-05-15T00:00:00Z',
  path_modules: [
    {
      module: {
        module_id: 1,
        module_name: 'Introduction to Node.js',
        module_description: 'Understand what Node.js is|Learn its use cases and features|Install Node.js and setup development environment',
        prerequisite_module_id: null,
        skill_id: 5,
        difficulty_level: 'beginner',
        estimated_completion_hours: 3
      },
      sequence_order: 1,
      is_completed: true,
      completion_date: '2023-05-18T00:00:00Z'
    },
    {
      module: {
        module_id: 2,
        module_name: 'Node.js Core Concepts',
        module_description: 'Learn about the event loop|Understand asynchronous programming|Work with modules and npm',
        prerequisite_module_id: 1,
        skill_id: 5,
        difficulty_level: 'beginner',
        estimated_completion_hours: 4
      },
      sequence_order: 2,
      is_completed: true,
      completion_date: '2023-05-20T00:00:00Z'
    },
    {
      module: {
        module_id: 3,
        module_name: 'Building a Simple Server',
        module_description: 'Create HTTP servers|Handle requests and responses|Learn routing fundamentals',
        prerequisite_module_id: 2,
        skill_id: 5,
        difficulty_level: 'beginner',
        estimated_completion_hours: 3
      },
      sequence_order: 3,
      is_completed: true,
      completion_date: '2023-05-23T00:00:00Z'
    },
    {
      module: {
        module_id: 4,
        module_name: 'Express.js Framework',
        module_description: 'Set up Express application|Create routes and middleware|Handle form submissions',
        prerequisite_module_id: 3,
        skill_id: 5,
        difficulty_level: 'intermediate',
        estimated_completion_hours: 5
      },
      sequence_order: 4,
      is_completed: true,
      completion_date: '2023-05-28T00:00:00Z'
    },
    {
      module: {
        module_id: 5,
        module_name: 'Working with Databases',
        module_description: 'Connect to SQL/NoSQL databases|Perform CRUD operations|Implement data models',
        prerequisite_module_id: 4,
        skill_id: 5,
        difficulty_level: 'intermediate',
        estimated_completion_hours: 6
      },
      sequence_order: 5,
      is_completed: true,
      completion_date: '2023-06-05T00:00:00Z'
    },
    {
      module: {
        module_id: 6,
        module_name: 'RESTful API Development',
        module_description: 'Design RESTful endpoints|Implement authentication|Handle request validation',
        prerequisite_module_id: 5,
        skill_id: 5,
        difficulty_level: 'intermediate',
        estimated_completion_hours: 5
      },
      sequence_order: 6,
      is_completed: false,
      completion_date: null
    },
    {
      module: {
        module_id: 7,
        module_name: 'Error Handling & Debugging',
        module_description: 'Implement error middleware|Debug Node applications|Add logging to your app',
        prerequisite_module_id: 6,
        skill_id: 5,
        difficulty_level: 'intermediate',
        estimated_completion_hours: 3
      },
      sequence_order: 7,
      is_completed: false,
      completion_date: null
    },
    {
      module: {
        module_id: 8,
        module_name: 'Deployment & Performance',
        module_description: 'Deploy Node.js applications|Optimize for performance|Implement security best practices',
        prerequisite_module_id: 7,
        skill_id: 5,
        difficulty_level: 'advanced',
        estimated_completion_hours: 4
      },
      sequence_order: 8,
      is_completed: false,
      completion_date: null
    }
  ]
};

// Mock module tasks and resources
const mockModuleTasks = {
  1: [
    {
      id: 1,
      title: "Install Node.js",
      description: "Download and install Node.js on your computer",
      estimated_time_minutes: 15,
      is_completed: true,
      task_type: "setup"
    },
    {
      id: 2,
      title: "Create your first Node.js script",
      description: "Write a simple 'Hello World' program using Node.js",
      estimated_time_minutes: 20,
      is_completed: true,
      task_type: "coding"
    },
    {
      id: 3,
      title: "Understanding Node.js modules",
      description: "Learn how to create and import modules in Node.js",
      estimated_time_minutes: 45,
      is_completed: true,
      task_type: "learning"
    },
    {
      id: 4,
      title: "Quiz: Node.js Basics",
      description: "Test your understanding of Node.js fundamentals",
      estimated_time_minutes: 30,
      is_completed: true,
      task_type: "quiz"
    }
  ],
  6: [
    {
      id: 21,
      title: "Design a RESTful API",
      description: "Create the architecture for a RESTful API",
      estimated_time_minutes: 45,
      is_completed: false,
      task_type: "design"
    },
    {
      id: 22,
      title: "Implement API endpoints",
      description: "Create routes for your API resources",
      estimated_time_minutes: 60,
      is_completed: false,
      task_type: "coding"
    },
    {
      id: 23,
      title: "Add authentication",
      description: "Implement JWT authentication for your API",
      estimated_time_minutes: 90,
      is_completed: false,
      task_type: "coding"
    },
    {
      id: 24,
      title: "Validate API requests",
      description: "Add validation for incoming requests",
      estimated_time_minutes: 60,
      is_completed: false,
      task_type: "coding"
    }
  ]
};

const mockModuleResources = {
  1: [
    {
      id: 1,
      title: "Introduction to Node.js",
      url: "https://www.youtube.com/watch?v=fBNz5xF-Kx4",
      resource_type: "video",
      estimated_time_minutes: 60
    },
    {
      id: 2,
      title: "Node.js Documentation: Getting Started",
      url: "https://nodejs.org/en/docs/guides/getting-started-guide/",
      resource_type: "documentation",
      estimated_time_minutes: 30
    },
    {
      id: 3,
      title: "Understanding Node.js Event Loop",
      url: "https://blog.logrocket.com/nodejs-event-loop-complete-guide/",
      resource_type: "article",
      estimated_time_minutes: 25
    }
  ],
  6: [
    {
      id: 18,
      title: "RESTful API Design Best Practices",
      url: "https://www.restapitutorial.com/",
      resource_type: "tutorial",
      estimated_time_minutes: 45
    },
    {
      id: 19,
      title: "Node.js Authentication with JWT",
      url: "https://www.youtube.com/watch?v=mbsmsi7l3r4",
      resource_type: "video",
      estimated_time_minutes: 75
    },
    {
      id: 20,
      title: "Express.js Validation Middleware",
      url: "https://express-validator.github.io/docs/",
      resource_type: "documentation",
      estimated_time_minutes: 30
    }
  ]
};

/**
 * Simulates fetching a user's current roadmap
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - The roadmap data
 */
export const fetchMockRoadmap = async (userId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Return the mock data
  return mockRoadmapData;
};

/**
 * Simulates fetching tasks for a specific module
 * @param {number} moduleId - The module ID
 * @returns {Promise<Array>} - Array of tasks
 */
export const fetchMockModuleTasks = async (moduleId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return tasks for the specific module or an empty array if not found
  return mockModuleTasks[moduleId] || [];
};

/**
 * Simulates fetching learning resources for a specific module
 * @param {number} moduleId - The module ID
 * @returns {Promise<Array>} - Array of resources
 */
export const fetchMockModuleResources = async (moduleId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return resources for the specific module or an empty array if not found
  return mockModuleResources[moduleId] || [];
};

/**
 * Simulates generating a new roadmap based on user profile, skills, and goals
 * @param {string} userId - The user's ID
 * @param {Object} userData - The user profile data, skills, and goals
 * @returns {Promise<Object>} - The newly generated roadmap
 */
export const generateNewRoadmap = async (userId, userData = {}) => {
  // Simulate API call delay (generating a roadmap would take longer)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Get skills and goals if provided
  const userSkills = userData.skills || [];
  const userGoals = userData.goals || [];
  const profile = userData.profile || {};
  
  console.log('Generating roadmap for user:', userId);
  console.log('User skills:', userSkills);
  console.log('User goals:', userGoals);
  console.log('User profile:', profile);
  
  // For now, just return the existing mock data
  // In a real implementation, this would generate a personalized roadmap
  // based on the user's skills, goals, and profile
  return mockRoadmapData;
};

/**
 * Simulates updating a user's progress for a task
 * @param {string} userId - The user's ID
 * @param {number} taskId - The task ID
 * @param {boolean} completed - Whether the task is completed
 * @returns {Promise<Object>} - The updated task
 */
export const updateMockTaskProgress = async (userId, taskId, completed) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In a real implementation, this would update the database
  // For now, just return a success response
  return { success: true, taskId, completed };
};

/**
 * Simulates updating a user's progress for a module
 * @param {string} userId - The user's ID
 * @param {number} moduleId - The module ID
 * @param {boolean} completed - Whether the module is completed
 * @returns {Promise<Object>} - The updated module
 */
export const updateMockModuleProgress = async (userId, moduleId, completed) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In a real implementation, this would update the database
  // For now, just return a success response
  return { 
    success: true, 
    moduleId, 
    completed,
    completionDate: completed ? new Date().toISOString() : null
  };
};

/**
 * Simulates updating a user's learning streak
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - The updated streak
 */
export const updateMockLearningStreak = async (userId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In a real implementation, this would update the database
  // For now, just return a mock streak object
  return {
    streak_id: 1,
    user_id: userId,
    streak_count: 5,
    last_activity_date: new Date().toISOString().split('T')[0],
    longest_streak: 12
  };
};

export default {
  fetchMockRoadmap,
  fetchMockModuleTasks,
  fetchMockModuleResources,
  generateNewRoadmap,
  updateMockTaskProgress,
  updateMockModuleProgress,
  updateMockLearningStreak
};