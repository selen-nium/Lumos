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
            id: resourceIndex + 1,
            resource_title: resource,
            url: generateResourceUrl(resource),
            resource_type: detectResourceType(resource),
            estimated_time_minutes: estimateTimeFromTitle(resource)
          };
        }
        // If already an object, ensure it has all required fields
        return {
          id: resource.id || resourceIndex + 1,
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
  
  if (title.includes('youtube') || title.includes('video')) {
    const searchTerm = resourceTitle.replace(/youtube\s+tutorials?\s+on\s+/i, '').replace(/video\s+tutorial/i, '').trim();
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm + ' tutorial')}`;
  }
  
  if (title.includes('online course') || title.includes('course')) {
    const searchTerm = resourceTitle.replace(/online\s+course:\s*/i, '').replace(/course/i, '').trim();
    return `https://www.coursera.org/search?query=${encodeURIComponent(searchTerm)}`;
  }
  
  if (title.includes('documentation') || title.includes('docs')) {
    const searchTerm = resourceTitle.replace(/documentation:\s*/i, '').replace(/official\s+documentation/i, '').trim();
    
    // Specific documentation URLs for common technologies
    const docUrls = {
      'react': 'https://react.dev/learn',
      'vue': 'https://vuejs.org/guide/',
      'javascript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      'html': 'https://developer.mozilla.org/en-US/docs/Web/HTML',
      'css': 'https://developer.mozilla.org/en-US/docs/Web/CSS',
      'node': 'https://nodejs.org/en/docs/',
      'express': 'https://expressjs.com/en/guide/routing.html'
    };
    
    for (const [tech, url] of Object.entries(docUrls)) {
      if (searchTerm.toLowerCase().includes(tech)) {
        return url;
      }
    }
    
    return `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(searchTerm)}`;
  }
  
  if (title.includes('tutorial') || title.includes('guide')) {
    const searchTerm = resourceTitle.replace(/tutorial/i, '').replace(/guide/i, '').replace(/practical/i, '').trim();
    return `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(searchTerm)}`;
  }
  
  // Default to Google search
  return `https://www.google.com/search?q=${encodeURIComponent(resourceTitle + ' programming tutorial')}`;
};

const detectResourceType = (resourceTitle) => {
  const title = resourceTitle.toLowerCase();
  
  if (title.includes('youtube') || title.includes('video') || title.includes('watch')) return 'video';
  if (title.includes('course') || title.includes('tutorial') || title.includes('learn')) return 'tutorial';
  if (title.includes('documentation') || title.includes('docs') || title.includes('reference')) return 'documentation';
  if (title.includes('article') || title.includes('blog') || title.includes('guide')) return 'article';
  
  return 'article';
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

export default router;