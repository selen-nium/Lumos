// roadmapRoutes.js
import express from 'express';
import chatService from '../services/chatService.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Service role client (bypasses RLS)
const supabaseServiceRole = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Enhancement functions
const enhanceModuleData = (modules) => {
  return modules.map((module, index) => {
    const enhanced = { ...module };
    
    // Add module description if missing
    if (!enhanced.module_description) {
      enhanced.module_description = generateModuleDescription(enhanced.module_name);
    }
    
    // Convert string resources to objects and enhance them
    if (enhanced.resources && Array.isArray(enhanced.resources)) {
      enhanced.resources = enhanced.resources.map((resource, resourceIndex) => {
        if (typeof resource === 'string') {
          return {
            resource_id: `${enhanced.module_id || index + 1}_resource_${resourceIndex + 1}`,
            resource_title: resource,
            url: generateResourceUrl(resource),
            resource_type: detectResourceType(resource),
            estimated_time_minutes: estimateTimeFromTitle(resource)
          };
        }
        // If already an object, ensure it has all required fields
        return {
          resource_id: resource.resource_id || `${enhanced.module_id || index + 1}_resource_${resourceIndex + 1}`,
          resource_title: resource.resource_title || resource.title || `Resource ${resourceIndex + 1}`,
          url: resource.url || generateResourceUrl(resource.resource_title || resource.title || ''),
          resource_type: resource.resource_type || resource.type || 'article',
          estimated_time_minutes: resource.estimated_time_minutes || 30
        };
      });
    } else {
      // If no resources, add default ones based on module name
      enhanced.resources = generateDefaultResources(enhanced.module_name);
    }
    
    // ADD TASKS GENERATION HERE - this was missing!
    if (!enhanced.tasks || !Array.isArray(enhanced.tasks) || enhanced.tasks.length === 0) {
      enhanced.tasks = generateDefaultTasks(enhanced.module_name, enhanced.module_id || index + 1);
    } else {
      // Ensure existing tasks have proper structure
      enhanced.tasks = enhanced.tasks.map((task, taskIndex) => ({
        task_id: task.task_id || `${enhanced.module_id || index + 1}_task_${taskIndex + 1}`,
        task_title: task.task_title || task.title || `Task ${taskIndex + 1}`,
        task_description: task.task_description || task.description || 'Complete this hands-on task',
        task_type: task.task_type || task.type || 'practice',
        estimated_time_minutes: task.estimated_time_minutes || 45,
        is_completed: false
      }));
    }
    
    // Ensure sequence_order
    if (!enhanced.sequence_order) {
      enhanced.sequence_order = index + 1;
    }
    
    // Ensure estimated completion time
    if (!enhanced.estimated_completion_time_hours && !enhanced.estimated_completion_hours) {
      enhanced.estimated_completion_time_hours = calculateEstimatedHours(enhanced.module_name);
    }
    
    return enhanced;
  });
};

// hardcode default tasks
const generateDefaultTasks = (moduleName, moduleId) => {
  if (!moduleName) return [];
  
  const name = moduleName.toLowerCase();
  const tasks = [];
  
  if (name.includes('html') || name.includes('css')) {
    tasks.push(
      {
        task_id: `${moduleId}_task_1`,
        task_title: 'Create a Personal Portfolio Page',
        task_description: 'Build a responsive portfolio page using HTML5 semantic elements and CSS. Include sections for about, projects, and contact information.',
        task_type: 'project',
        estimated_time_minutes: 120,
        is_completed: false
      },
      {
        task_id: `${moduleId}_task_2`,
        task_title: 'CSS Layout Challenge',
        task_description: 'Complete 5 layout challenges using Flexbox and Grid. Practice creating common UI patterns like navigation bars, card layouts, and footers.',
        task_type: 'practice',
        estimated_time_minutes: 90,
        is_completed: false
      }
    );
  } else if (name.includes('javascript')) {
    tasks.push(
      {
        task_id: `${moduleId}_task_1`,
        task_title: 'JavaScript Fundamentals Quiz',
        task_description: 'Complete a quiz covering variables, functions, arrays, and objects. Test your understanding of core JavaScript concepts.',
        task_type: 'quiz',
        estimated_time_minutes: 30,
        is_completed: false
      },
      {
        task_id: `${moduleId}_task_2`,
        task_title: 'Build an Interactive To-Do List',
        task_description: 'Create a to-do list application with add, delete, and mark complete functionality. Use DOM manipulation and event listeners.',
        task_type: 'project',
        estimated_time_minutes: 90,
        is_completed: false
      }
    );
  } else if (name.includes('react')) {
    tasks.push(
      {
        task_id: `${moduleId}_task_1`,
        task_title: 'Component Composition Exercise',
        task_description: 'Build a reusable component library with at least 5 components (Button, Card, Modal, etc.). Practice props and component composition.',
        task_type: 'practice',
        estimated_time_minutes: 60,
        is_completed: false
      },
      {
        task_id: `${moduleId}_task_2`,
        task_title: 'State Management Challenge',
        task_description: 'Build a shopping cart feature using useState and useReducer. Implement add to cart, remove, and quantity update functionality.',
        task_type: 'project',
        estimated_time_minutes: 120,
        is_completed: false
      }
    );
  } else {
    // Generic tasks for any module
    tasks.push(
      {
        task_id: `${moduleId}_task_1`,
        task_title: `${moduleName} Hands-on Practice`,
        task_description: `Apply the concepts learned in ${moduleName} by completing practical exercises. Focus on understanding core principles through implementation.`,
        task_type: 'practice',
        estimated_time_minutes: 60,
        is_completed: false
      },
      {
        task_id: `${moduleId}_task_2`,
        task_title: `Build a ${moduleName} Project`,
        task_description: `Create a small project that demonstrates your understanding of ${moduleName}. This project should incorporate the main concepts covered in the module.`,
        task_type: 'project',
        estimated_time_minutes: 90,
        is_completed: false
      }
    );
  }
  
  return tasks;
};

const generateModuleDescription = (moduleName) => {
  if (!moduleName) return "Learn the fundamentals of this topic|Practice with hands-on exercises|Apply knowledge to real projects";
  
  const descriptions = {
    'ui/ux design': "Understand the principles of user interface design|Learn user experience research methods|Practice creating wireframes and prototypes|Study color theory and typography|Master design thinking methodology",
    'html': "Master HTML5 semantic elements and structure|Learn proper document accessibility practices|Understand forms and input validation|Practice building responsive layouts|Study SEO optimization techniques",
    'css': "Master CSS selectors and cascade principles|Learn responsive design with Grid and Flexbox|Understand CSS animations and transitions|Practice modern CSS features and variables|Study browser compatibility and optimization",
    'javascript': "Understand JavaScript fundamentals and syntax|Learn DOM manipulation and event handling|Master asynchronous programming with promises|Practice with ES6+ modern features|Study debugging and performance optimization",
    'react': "Learn React component architecture and JSX|Understand state management and props|Master React hooks and lifecycle methods|Practice building interactive applications|Study testing and performance optimization",
    'vue': "Learn Vue.js reactive data binding system|Understand component composition and props|Master Vue CLI and single-file components|Practice building dynamic applications|Study Vue ecosystem and state management",
    'node': "Understand server-side JavaScript fundamentals|Learn to build REST APIs with Express|Master npm package management|Practice database integration and authentication|Study deployment and production optimization",
    'database': "Learn database design principles and normalization|Understand SQL fundamentals and queries|Master data modeling and relationships|Practice database optimization techniques|Study backup and security best practices",
    'devops': "Learn CI/CD pipeline setup and automation|Understand containerization with Docker|Master cloud deployment strategies|Practice infrastructure as code|Study monitoring and security practices",
    'introduction': "Get familiar with core concepts and terminology|Understand the fundamental principles|Learn about common use cases and applications|Practice with basic examples|Study best practices and conventions"
  };
  
  const name = moduleName.toLowerCase();
  
  // Check for exact matches first
  for (const [key, desc] of Object.entries(descriptions)) {
    if (name.includes(key.replace(/\s+/g, '')) || name.includes(key)) {
      return desc;
    }
  }
  
  // Check for partial matches
  const keywords = ['html', 'css', 'javascript', 'react', 'vue', 'node', 'database', 'devops', 'design', 'ui', 'ux'];
  for (const keyword of keywords) {
    if (name.includes(keyword) && descriptions[keyword]) {
      return descriptions[keyword];
    }
  }
  
  return `Learn ${moduleName} fundamentals and core concepts|Understand key principles and best practices|Practice with hands-on exercises and examples|Apply knowledge to real-world scenarios|Master essential techniques and tools`;
};

const generateDefaultResources = (moduleName) => {
  if (!moduleName) return [];
  
  const name = moduleName.toLowerCase();
  const baseResources = [];
  
  // Add documentation resource
  baseResources.push({
    id: 1,
    resource_title: `${moduleName} Official Documentation`,
    url: generateResourceUrl(`${moduleName} documentation`),
    resource_type: 'documentation',
    estimated_time_minutes: 45
  });
  
  // Add video tutorial
  baseResources.push({
    id: 2,
    resource_title: `${moduleName} Video Tutorial`,
    url: generateResourceUrl(`${moduleName} tutorial video`),
    resource_type: 'video',
    estimated_time_minutes: 60
  });
  
  // Add practical guide
  baseResources.push({
    id: 3,
    resource_title: `${moduleName} Practical Guide`,
    url: generateResourceUrl(`${moduleName} guide tutorial`),
    resource_type: 'article',
    estimated_time_minutes: 30
  });
  
  return baseResources;
};

const generateResourceUrl = (resourceTitle) => {
  const title = resourceTitle.toLowerCase();
  const cleanTitle = resourceTitle.trim();
  
  // YouTube resources
  if (title.includes('youtube') || title.includes('video')) {
    const searchTerm = cleanTitle
      .replace(/youtube\s+tutorials?\s+on\s+/i, '')
      .replace(/video\s+tutorial/i, '')
      .trim();
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm + ' tutorial')}`;
  }
  
  // Online courses - be more specific
  if (title.includes('coursera') || (title.includes('online course') && !title.includes('freecodecamp'))) {
    const searchTerm = cleanTitle
      .replace(/online\s+course:\s*/i, '')
      .replace(/coursera\s*/i, '')
      .replace(/course/i, '')
      .trim();
    return `https://www.coursera.org/search?query=${encodeURIComponent(searchTerm)}`;
  }
  
  // FreeCodeCamp specific
  if (title.includes('freecodecamp') || title.includes('fcc')) {
    const searchTerm = cleanTitle
      .replace(/freecodecamp\s*/i, '')
      .replace(/fcc\s*/i, '')
      .replace(/tutorial\s*/i, '')
      .replace(/guide\s*/i, '')
      .trim();
    return `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(searchTerm)}`;
  }
  
  // Documentation
  if (title.includes('documentation') || title.includes('docs') || title.includes('mdn')) {
    const searchTerm = cleanTitle
      .replace(/documentation:\s*/i, '')
      .replace(/official\s+documentation/i, '')
      .replace(/mdn\s*/i, '')
      .trim();
    
    // Specific documentation URLs
    const docUrls = {
      'react': 'https://react.dev/learn',
      'vue': 'https://vuejs.org/guide/',
      'javascript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      'html': 'https://developer.mozilla.org/en-US/docs/Web/HTML',
      'css': 'https://developer.mozilla.org/en-US/docs/Web/CSS',
      'node': 'https://nodejs.org/en/docs/',
      'express': 'https://expressjs.com/en/guide/routing.html',
      'typescript': 'https://www.typescriptlang.org/docs/',
      'python': 'https://docs.python.org/3/'
    };
    
    // Check if the search term matches any known documentation
    for (const [tech, url] of Object.entries(docUrls)) {
      if (searchTerm.toLowerCase().includes(tech)) {
        return url;
      }
    }
    
    return `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(searchTerm)}`;
  }
  
  // Tutorial sites - be more specific
  if (title.includes('tutorial') || title.includes('guide')) {
    const searchTerm = cleanTitle
      .replace(/tutorial/i, '')
      .replace(/guide/i, '')
      .replace(/practical/i, '')
      .trim();
      
    // If it mentions a specific platform, use that
    if (title.includes('w3schools')) {
      return `https://www.w3schools.com/${searchTerm.toLowerCase().replace(/\s+/g, '_')}/default.asp`;
    }
    
    // Default to FreeCodeCamp for tutorials
    return `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(searchTerm)}`;
  }
  
  // Interactive/Playground resources
  if (title.includes('interactive') || title.includes('playground')) {
    const topic = cleanTitle.toLowerCase();
    if (topic.includes('javascript') || topic.includes('js')) {
      return 'https://playcode.io/javascript';
    }
    if (topic.includes('html') || topic.includes('css')) {
      return 'https://codepen.io/pen/';
    }
    if (topic.includes('sql')) {
      return 'https://www.db-fiddle.com/';
    }
  }
  
  // Default to Google search as last resort
  return `https://www.google.com/search?q=${encodeURIComponent(cleanTitle + ' programming tutorial')}`;
};

const detectResourceType = (resourceTitle) => {
  const title = resourceTitle.toLowerCase();
  
  if (title.includes('youtube') || title.includes('video') || title.includes('watch')) return 'video';
  if (title.includes('documentation') || title.includes('docs') || title.includes('reference') || title.includes('mdn')) return 'documentation';
  if (title.includes('interactive') || title.includes('playground') || title.includes('sandbox')) return 'interactive';
  if (title.includes('course') || title.includes('coursera') || title.includes('udemy')) return 'course';
  if (title.includes('tutorial') || title.includes('guide') || title.includes('learn')) return 'tutorial';
  if (title.includes('article') || title.includes('blog') || title.includes('post')) return 'article';
  
  return 'article'; // default
};

const estimateTimeFromTitle = (title) => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('course') || lowerTitle.includes('complete')) return 120;
  if (lowerTitle.includes('video') || lowerTitle.includes('youtube')) return 45;
  if (lowerTitle.includes('tutorial') || lowerTitle.includes('guide')) return 60;
  if (lowerTitle.includes('documentation') || lowerTitle.includes('reference')) return 30;
  if (lowerTitle.includes('quick') || lowerTitle.includes('intro')) return 20;
  
  return 30;
};

const calculateEstimatedHours = (moduleName) => {
  if (!moduleName) return 3;
  
  const name = moduleName.toLowerCase();
  
  // More complex topics get more hours
  if (name.includes('advanced') || name.includes('deep')) return 8;
  if (name.includes('complete') || name.includes('comprehensive')) return 10;
  if (name.includes('database') || name.includes('backend')) return 6;
  if (name.includes('framework') || name.includes('react') || name.includes('vue')) return 5;
  if (name.includes('introduction') || name.includes('basics') || name.includes('getting started')) return 3;
  
  return 4; // Default
};

// Main route handler
router.post('/generate', async (req, res) => {
  const { userId, userToken, profileData } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId' });
  }

  try {
    console.log("🔄 Starting roadmap generation for user:", userId);
    console.log("📋 Profile data received:", profileData);

    // Generate the roadmap using your existing service
    const { roadmap } = await chatService.generateInitialRoadmap(userId, profileData);
    
    console.log("🧠 Generated roadmap (before enhancement):", {
      title: roadmap.path_name || roadmap.roadmap_title,
      modules: roadmap.modules?.length || roadmap.phases?.length,
      method: roadmap.generationMethod
    });

    if (!roadmap || (!roadmap.phases && !roadmap.modules)) {
      console.error("❌ Invalid roadmap structure:", roadmap);
      throw new Error('Invalid roadmap generated - missing modules or phases');
    }

    // Enhance the roadmap data
    let enhancedRoadmap = { ...roadmap };
    
    if (enhancedRoadmap.modules && Array.isArray(enhancedRoadmap.modules)) {
      enhancedRoadmap.modules = enhanceModuleData(enhancedRoadmap.modules);
      console.log("✨ Enhanced flat modules structure");
    }
    
    if (enhancedRoadmap.phases && Array.isArray(enhancedRoadmap.phases)) {
      enhancedRoadmap.phases = enhancedRoadmap.phases.map(phase => ({
        ...phase,
        modules: phase.modules ? enhanceModuleData(phase.modules) : []
      }));
      console.log("✨ Enhanced phases structure");
    }

    console.log("🎯 Enhanced roadmap sample:", {
      title: enhancedRoadmap.path_name || enhancedRoadmap.roadmap_title,
      totalModules: enhancedRoadmap.modules?.length || 
                   enhancedRoadmap.phases?.reduce((total, phase) => total + (phase.modules?.length || 0), 0),
      sampleModule: enhancedRoadmap.modules?.[0] || enhancedRoadmap.phases?.[0]?.modules?.[0],
      sampleResources: (enhancedRoadmap.modules?.[0]?.resources || enhancedRoadmap.phases?.[0]?.modules?.[0]?.resources)?.length
    });

    if (enhancedRoadmap.modules?.[0]?.resources) {
        console.log("📚 First module resources detail:", JSON.stringify(enhancedRoadmap.modules[0].resources, null, 2));
    }
    if (enhancedRoadmap.modules?.[0]?.tasks) {
        console.log("📋 First module tasks detail:", JSON.stringify(enhancedRoadmap.modules[0].tasks, null, 2));
    }

    // Prepare the roadmap data for database storage
    const roadmapData = {
      user_id: userId,
      status: 'active',
      path_name: enhancedRoadmap.path_name || enhancedRoadmap.roadmap_title || 'My Learning Path',
      path_data: {
        ...enhancedRoadmap,
        enhanced_at: new Date().toISOString(),
        profile_context: profileData
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("💾 Saving enhanced roadmap to database...");

    // Check if roadmap already exists
    const { data: existingRoadmap, error: checkError } = await supabaseServiceRole
      .from('user_learning_paths')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    let saveResult;
    
    if (existingRoadmap) {
      // Update existing roadmap
      console.log("📝 Updating existing roadmap...");
      const { data, error } = await supabaseServiceRole
        .from('user_learning_paths')
        .update({
          path_name: roadmapData.path_name,
          path_data: roadmapData.path_data,
          updated_at: roadmapData.updated_at
        })
        .eq('user_id', userId)
        .eq('status', 'active');
        
      saveResult = { data, error };
    } else {
      // Insert new roadmap
      console.log("✨ Creating new roadmap...");
      const { data, error } = await supabaseServiceRole
        .from('user_learning_paths')
        .insert(roadmapData);
        
      saveResult = { data, error };
    }

    if (saveResult.error) {
      console.error("❌ Database save error:", saveResult.error);
      throw new Error(`Database error: ${saveResult.error.message}`);
    }

    console.log("✅ Enhanced roadmap saved successfully");
    // Verify the save by fetching it back
    const { data: verifyData, error: verifyError } = await supabaseServiceRole
      .from('user_learning_paths')
      .select('path_data')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (verifyData) {
      console.log("🔍 Verification - First module from DB:", JSON.stringify(verifyData.path_data.modules?.[0], null, 2));
    }

    // Calculate some stats for the response
    const totalModules = enhancedRoadmap.modules?.length || 
                        enhancedRoadmap.phases?.reduce((total, phase) => total + (phase.modules?.length || 0), 0) || 0;
    
    const totalResources = enhancedRoadmap.modules?.reduce((total, module) => total + (module.resources?.length || 0), 0) ||
                          enhancedRoadmap.phases?.reduce((total, phase) => 
                            total + (phase.modules?.reduce((phaseTotal, module) => phaseTotal + (module.resources?.length || 0), 0) || 0), 0) || 0;

    res.json({ 
      success: true, 
      message: 'Enhanced roadmap generated and saved successfully',
      roadmapInfo: {
        title: roadmapData.path_name,
        totalModules,
        totalResources,
        estimatedWeeks: enhancedRoadmap.estimated_duration_weeks,
        generationMethod: enhancedRoadmap.generationMethod,
        enhanced: true
      }
    });

  } catch (err) {
    console.error('❌ Roadmap generation error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to generate roadmap',
      details: process.env.NODE_ENV === 'development' ? {
        stack: err.stack,
        code: err.code,
        hint: err.hint
      } : undefined
    });
  }
});

// Additional route to regenerate/enhance existing roadmap
router.post('/enhance/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log("🔄 Enhancing existing roadmap for user:", userId);

    // Fetch existing roadmap
    const { data: pathData, error: fetchError } = await supabaseServiceRole
      .from('user_learning_paths')
      .select('path_data')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError || !pathData?.path_data) {
      return res.status(404).json({ success: false, error: 'No roadmap found to enhance' });
    }

    // Enhance the existing roadmap
    let enhancedRoadmap = { ...pathData.path_data };
    
    if (enhancedRoadmap.modules) {
      enhancedRoadmap.modules = enhanceModuleData(enhancedRoadmap.modules);
    }
    
    if (enhancedRoadmap.phases) {
      enhancedRoadmap.phases = enhancedRoadmap.phases.map(phase => ({
        ...phase,
        modules: phase.modules ? enhanceModuleData(phase.modules) : []
      }));
    }

    // Save enhanced roadmap
    const { error: updateError } = await supabaseServiceRole
      .from('user_learning_paths')
      .update({
        path_data: {
          ...enhancedRoadmap,
          enhanced_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (updateError) {
      throw new Error(`Failed to save enhanced roadmap: ${updateError.message}`);
    }

    console.log("✅ Roadmap enhanced successfully");

    res.json({
      success: true,
      message: 'Roadmap enhanced successfully',
      enhanced: true
    });

  } catch (err) {
    console.error('❌ Roadmap enhancement error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to enhance roadmap'
    });
  }
});

// fetch roadmap data 
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log('📚 Fetching roadmap for user:', userId);
    
    // Fetch the roadmap from database
    const { data: learningPath, error } = await supabaseServiceRole
      .from('user_learning_paths')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !learningPath) {
      return res.status(404).json({
        success: false,
        error: 'No active roadmap found'
      });
    }

    // Transform the path_data to match frontend expectations
    const pathData = learningPath.path_data;
    
    // Handle both flat modules and phased structures
    let allModules = [];
    
    if (pathData.modules) {
      allModules = pathData.modules;
    } else if (pathData.phases) {
      // Flatten phases into modules
      allModules = pathData.phases.reduce((acc, phase) => {
        return acc.concat(phase.modules || []);
      }, []);
    }

    // Ensure modules have proper IDs and structure
    const enhancedModules = allModules.map((module, index) => {
      const moduleId = module.module_id || module.id || `module_${index + 1}`;
      
      return {
        module_id: moduleId,
        module_name: module.module_name || module.title || module.name || `Module ${index + 1}`,
        module_description: module.module_description || module.description || generateModuleDescription(module.module_name || module.title),
        difficulty_level: module.difficulty_level || module.difficulty || 'beginner',
        estimated_completion_hours: module.estimated_completion_hours || module.estimated_hours || 5,
        sequence_order: module.sequence_order || index + 1,
        is_completed: module.is_completed || false,
        status: module.status || '⏳ Pending',
        resources: module.resources || generateDefaultResources(module.module_name || module.title),
        // Keep any other existing properties
        ...module
      };
    });

    // Create the roadmap structure expected by frontend
    const roadmap = {
      path_id: learningPath.user_path_id,
      path_title: pathData.title || pathData.roadmap_title || pathData.path_name || learningPath.path_name,
      path_description: pathData.description || learningPath.path_description,
      estimated_duration_weeks: pathData.estimated_duration_weeks || pathData.estimated_completion_weeks || 12,
      path_modules: enhancedModules.map((module, index) => ({
        path_id: learningPath.user_path_id,
        module_id: module.module_id,
        sequence_order: index + 1,
        is_completed: module.is_completed || false,
        completion_date: module.completion_date || null,
        module: module
      })),
      generationMethod: pathData.generationMethod || 'custom',
      userContext: pathData.userContext
    };

    res.json({
      success: true,
      roadmap
    });
    
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch roadmap'
    });
  }
});

// update module completion
router.post('/module/:moduleId/complete', async (req, res) => {
  const { moduleId } = req.params;
  const { userId, isCompleted } = req.body;
  
  try {
    console.log('📝 Updating module completion:', { moduleId, userId, isCompleted });
    
    // Fetch current roadmap
    const { data: learningPath, error: fetchError } = await supabaseServiceRole
      .from('user_learning_paths')
      .select('path_data')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError || !learningPath) {
      throw new Error('No active roadmap found');
    }

    const pathData = learningPath.path_data;
    
    // Update module status
    let moduleFound = false;
    
    if (pathData.modules) {
      const moduleIndex = pathData.modules.findIndex(m => 
        (m.module_id || m.id || `module_${pathData.modules.indexOf(m) + 1}`) === moduleId
      );
      if (moduleIndex !== -1) {
        pathData.modules[moduleIndex].is_completed = isCompleted;
        pathData.modules[moduleIndex].completion_date = isCompleted ? new Date().toISOString() : null;
        moduleFound = true;
      }
    } else if (pathData.phases) {
      // Handle phased structure
      for (const phase of pathData.phases) {
        const moduleIndex = phase.modules?.findIndex(m => 
          (m.module_id || m.id) === moduleId
        ) ?? -1;
        if (moduleIndex !== -1) {
          phase.modules[moduleIndex].is_completed = isCompleted;
          phase.modules[moduleIndex].completion_date = isCompleted ? new Date().toISOString() : null;
          moduleFound = true;
          break;
        }
      }
    }

    if (!moduleFound) {
      throw new Error('Module not found in roadmap');
    }

    // Save updated path_data
    const { error: updateError } = await supabaseServiceRole
      .from('user_learning_paths')
      .update({
        path_data: pathData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Module completion status updated'
    });
    
  } catch (error) {
    console.error('Error updating module completion:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update module'
    });
  }
});

export default router;