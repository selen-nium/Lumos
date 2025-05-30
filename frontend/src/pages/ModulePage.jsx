import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  BookOpen, 
  FileText, 
  Video, 
  Code, 
  Settings, 
  HelpCircle,
  ExternalLink,
  ArrowLeft,
  PlayCircle,
  AlertTriangle
} from 'lucide-react';

// Helper functions (keep existing ones)
const generateDefaultDescription = (moduleName) => {
  if (!moduleName) return "Learn the fundamentals of this topic";
  
  const descriptions = {
    'ui/ux': `Understand the principles of user interface design|Learn user experience research methods|Practice creating wireframes and prototypes|Study color theory and typography`,
    'html': `Master HTML5 semantic elements|Learn proper document structure|Understand accessibility best practices|Practice building responsive layouts`,
    'css': `Master CSS selectors and properties|Learn responsive design techniques|Understand CSS Grid and Flexbox|Practice modern CSS features`,
    'javascript': `Understand JavaScript fundamentals|Learn DOM manipulation|Master asynchronous programming|Practice with ES6+ features`,
    'react': `Learn React component architecture|Understand state management|Master React hooks and lifecycle|Build interactive applications`,
    'node': `Understand server-side JavaScript|Learn to build REST APIs|Master npm and package management|Practice database integration`,
    'database': `Learn database design principles|Understand SQL fundamentals|Practice data modeling|Master database optimization`,
    'devops': `Learn CI/CD pipelines|Understand containerization with Docker|Master cloud deployment|Practice infrastructure automation`,
    'vue': `Learn Vue.js component system|Understand reactive data binding|Master Vue CLI and ecosystem|Build single-page applications`,
    'design': `Study design principles and theory|Learn about visual hierarchy|Practice with design tools|Understand user-centered design`
  };
  
  const name = moduleName.toLowerCase();
  for (const [key, desc] of Object.entries(descriptions)) {
    if (name.includes(key)) return desc;
  }
  
  return `Learn ${moduleName} fundamentals|Understand core concepts|Practice with hands-on exercises|Apply knowledge to real projects`;
};

const processResources = (resources) => {
  if (!Array.isArray(resources)) return [];
  
  return resources.map((resource, index) => {
    if (typeof resource === 'object' && resource !== null) {
      return {
        id: resource.id || index,
        title: resource.title || resource.resource_title || `Resource ${index + 1}`,
        url: resource.url || '#',
        resource_type: resource.resource_type || resource.type || 'article',
        estimated_time_minutes: resource.estimated_time_minutes || 30
      };
    }
    
    if (typeof resource === 'string') {
      return {
        id: index,
        title: resource,
        url: generateResourceUrl(resource),
        resource_type: detectResourceType(resource),
        estimated_time_minutes: estimateTimeFromTitle(resource)
      };
    }
    
    return {
      id: index,
      title: `Resource ${index + 1}`,
      url: '#',
      resource_type: 'article',
      estimated_time_minutes: 30
    };
  });
};

const generateResourceUrl = (resourceTitle) => {
  const title = resourceTitle.toLowerCase();
  
  if (title.includes('youtube')) {
    const searchTerm = resourceTitle.replace(/youtube\s+tutorials?\s+on\s+/i, '').trim();
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
  }
  
  if (title.includes('online course')) {
    const searchTerm = resourceTitle.replace(/online\s+course:\s*/i, '').trim();
    return `https://www.coursera.org/search?query=${encodeURIComponent(searchTerm)}`;
  }
  
  if (title.includes('documentation')) {
    const searchTerm = resourceTitle.replace(/documentation:\s*/i, '').trim();
    return `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(searchTerm)}`;
  }
  
  if (title.includes('tutorial')) {
    return `https://www.freecodecamp.org/learn`;
  }
  
  return `https://www.google.com/search?q=${encodeURIComponent(resourceTitle)}`;
};

const detectResourceType = (resourceTitle) => {
  const title = resourceTitle.toLowerCase();
  
  if (title.includes('youtube') || title.includes('video')) return 'video';
  if (title.includes('course') || title.includes('tutorial')) return 'tutorial';
  if (title.includes('documentation') || title.includes('docs')) return 'documentation';
  if (title.includes('article') || title.includes('blog')) return 'article';
  
  return 'article';
};

const estimateTimeFromTitle = (title) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('course')) return 120;
  if (lowerTitle.includes('video') || lowerTitle.includes('youtube')) return 45;
  if (lowerTitle.includes('tutorial')) return 60;
  if (lowerTitle.includes('documentation')) return 30;
  return 30;
};

const ModulePage = () => {
  const { moduleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState(null);
  const [resources, setResources] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchModuleData = async () => {
      if (!user || !moduleId) return;

      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Looking for module:", moduleId);

        // Fetch the user's learning path to get module data
        const { data: pathData, error: pathError } = await supabase
          .from('user_learning_paths')
          .select('path_data')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (pathError) {
          console.error('Error fetching learning path:', pathError);
          throw new Error('Failed to load learning path');
        }

        if (!pathData?.path_data) {
          throw new Error('No learning path found');
        }

        const roadmap = pathData.path_data;
        console.log("📋 Roadmap structure:", {
          hasPhases: !!roadmap.phases,
          hasModules: !!roadmap.modules,
          phasesCount: roadmap.phases?.length,
          modulesCount: roadmap.modules?.length
        });

        // Enhanced module search - try multiple approaches
        let foundModule = null;
        let allModules = [];

        // Collect all modules from roadmap
        if (roadmap.phases && Array.isArray(roadmap.phases)) {
          roadmap.phases.forEach(phase => {
            if (phase.modules && Array.isArray(phase.modules)) {
              allModules.push(...phase.modules);
            }
          });
        } else if (roadmap.modules && Array.isArray(roadmap.modules)) {
          allModules = roadmap.modules;
        }

        // console.log("📦 All modules found:", allModules.map(m => ({
        //   id: m.module_id || m.id,
        //   name: m.module_name || m.name,
        //   sequence: m.sequence_order
        // }))
        foundModule = allModules.find(
          m => m.module_id?.toString() === moduleId
        );
      

        // Try different search strategies
        // const searchStrategies = [
        //   // Strategy 1: Exact module_id match
        //   () => allModules.find(m => (m.module_id || m.id)?.toString() === moduleId),
          
        //   // Strategy 2: Sequence order match (for when module IDs change after modification)
        //   () => allModules.find(m => m.sequence_order?.toString() === moduleId),
          
        //   // Strategy 3: Array index match (fallback)
        //   () => allModules[parseInt(moduleId) - 1],
          
        //   // Strategy 4: Find first module with matching name pattern
        //   () => allModules.find(m => {
        //     const name = (m.module_name || m.name || '').toLowerCase();
        //     return name.includes('module ' + moduleId) || name.includes('#' + moduleId);
        //   }),
          
        //   // Strategy 5: Just get the module at the position (zero-indexed)
        //   () => allModules[parseInt(moduleId)]
        // ];

        // 

        if (!foundModule) {
          console.error("❌ Module not found with any strategy");
          console.log("Available modules:", allModules.map(m => ({
            module_id: m.module_id,
            id: m.id,
            sequence_order: m.sequence_order,
            name: m.module_name || m.name
          })));
          
          // Show a helpful error with available modules
          setError({
            type: 'module_not_found',
            availableModules: allModules.map((m, index) => ({
              id: m.module_id || m.id || index + 1,
              name: m.module_name || m.name || `Module ${index + 1}`,
              sequence_order: m.sequence_order || index + 1
            }))
          });
          return;
        }

        // Process the module data with enhancements
        const processedModule = {
          id: foundModule.module_id || foundModule.id || moduleId,
          name: foundModule.module_name || foundModule.name || `Module ${moduleId}`,
          description: foundModule.module_description || foundModule.description || 
            generateDefaultDescription(foundModule.module_name || foundModule.name),
          difficulty: foundModule.difficulty || 'Beginner',
          estimated_duration_weeks: foundModule.estimated_duration_weeks || 
            Math.ceil((foundModule.estimated_completion_time_hours || 3) / 10),
          estimated_completion_hours: foundModule.estimated_completion_time_hours || 
            foundModule.estimated_completion_hours || 3,
          sequence_order: foundModule.sequence_order || parseInt(moduleId),
          isCompleted: foundModule.isCompleted || false,
          resources: processResources(foundModule.resources || [])
        };

        setModule(processedModule);
        setResources(processedModule.resources);
        setTasks(foundModule.tasks || []);
        
        // Calculate progress based on completion status
        setProgress(processedModule.isCompleted ? 100 : 0);

        console.log("✅ Module loaded successfully:", processedModule.name);

      } catch (err) {
        console.error('Error fetching module data:', err);
        setError({ type: 'general', message: err.message });
      } finally {
        setLoading(false);
      }
    };

    fetchModuleData();
  }, [moduleId, user]);

  const handleCompleteModule = async () => {
    if (!user || !module) return;

    try {
      // Update the module completion status in the user's learning path
      const { data: pathData, error: fetchError } = await supabase
        .from('user_learning_paths')
        .select('path_data')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (fetchError) throw fetchError;

      // Update the module completion status
      const updatedPathData = { ...pathData.path_data };
      
      const updateModuleInArray = (modules) => {
        return modules.map(m => {
          // Try multiple matching strategies
          const moduleMatches = 
            (m.module_id || m.id)?.toString() === moduleId ||
            m.sequence_order?.toString() === moduleId ||
            (m.module_name || m.name) === module.name;
            
          if (moduleMatches) {
            return { ...m, isCompleted: true };
          }
          return m;
        });
      };

      if (updatedPathData.phases) {
        updatedPathData.phases = updatedPathData.phases.map(phase => ({
          ...phase,
          modules: phase.modules ? updateModuleInArray(phase.modules) : []
        }));
      } else if (updatedPathData.modules) {
        updatedPathData.modules = updateModuleInArray(updatedPathData.modules);
      }

      // Save the updated path data
      const { error: updateError } = await supabase
        .from('user_learning_paths')
        .update({ 
          path_data: updatedPathData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (updateError) throw updateError;

      // Update local state
      setModule(prev => ({ ...prev, isCompleted: true }));
      setProgress(100);

      // Show success message
      alert('Congratulations! You have completed this module.');
      
      // Navigate back to home
      navigate('/');

    } catch (error) {
      console.error('Error completing module:', error);
      alert('Failed to complete module. Please try again.');
    }
  };

  const getResourceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <Video className="h-5 w-5 text-red-500" />;
      case 'article':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'documentation':
        return <BookOpen className="h-5 w-5 text-green-500" />;
      case 'tutorial':
        return <PlayCircle className="h-5 w-5 text-purple-500" />;
      default:
        return <BookOpen className="h-5 w-5 text-gray-500" />;
    }
  };

  const getResourceTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'article':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'documentation':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'tutorial':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
            <span className="ml-3 text-muted-foreground">Loading module...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto p-8">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <AlertTriangle className="h-12 w-12 mx-auto" />
              </div>
              
              {error.type === 'module_not_found' ? (
                <>
                  <h2 className="text-xl font-semibold mb-4">Module Not Found</h2>
                  <p className="text-muted-foreground mb-6">
                    The module you're looking for might have been modified or reorganized. 
                    Here are the available modules in your roadmap:
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    {error.availableModules?.map((availableModule) => (
                      <Card key={availableModule.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="text-left">
                            <p className="font-medium">{availableModule.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Module {availableModule.sequence_order}
                            </p>
                          </div>
                          <Link to={`/module/${availableModule.id}`}>
                            <Button size="sm">
                              Go to Module
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-2">Module Not Found</h2>
                  <p className="text-muted-foreground mb-4">{error.message}</p>
                </>
              )}
              
              <Link to="/">
                <Button>Return to Dashboard</Button>
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  // Rest of the component remains the same...
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Module Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roadmap
          </Link>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline">
                  Module {module.sequence_order}
                </Badge>
                <Badge variant="secondary" className={getResourceTypeColor(module.difficulty)}>
                  {module.difficulty}
                </Badge>
                {module.isCompleted && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                {module.name}
              </h1>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{module.estimated_completion_hours} hours</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{resources.length} resources</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {progress}%
                </div>
                <p className="text-sm text-muted-foreground">completed</p>
              </div>
              <Progress value={progress} className="w-32" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-8">
          <nav className="flex gap-8">
            {['overview', 'resources', 'tasks'].map((tab) => (
              <button
                key={tab}
                className={`py-4 px-1 font-medium text-sm border-b-2 capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Module Objectives */}
              <Card>
                <CardHeader>
                  <CardTitle>Module Objectives</CardTitle>
                  <CardDescription>
                    What you'll learn in this module
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {module.description?.split('|').map((objective, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-foreground mt-2 flex-shrink-0" />
                        <span className="text-sm leading-relaxed">{objective.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Learning Path */}
              <Card>
                <CardHeader>
                  <CardTitle>Learning Path</CardTitle>
                  <CardDescription>
                    Follow this structured approach to master the module
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">1. Study the Resources</h4>
                        <p className="text-sm text-muted-foreground">
                          Go through all the learning materials in the Resources tab
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Code className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">2. Practice & Apply</h4>
                        <p className="text-sm text-muted-foreground">
                          Work through practical examples and exercises
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">3. Complete the Module</h4>
                        <p className="text-sm text-muted-foreground">
                          Mark the module as complete when you've mastered the concepts
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button 
                  onClick={() => setActiveTab('resources')}
                  className="flex-1 sm:flex-none"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Resources
                </Button>
                
                {!module.isCompleted && (
                  <Button 
                    variant="outline"
                    onClick={handleCompleteModule}
                    className="flex-1 sm:flex-none"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Complete
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Learning Resources</h2>
                  <p className="text-muted-foreground">
                    {resources.length} resources to help you master this module
                  </p>
                </div>
              </div>

              {resources.length > 0 ? (
                <div className="grid gap-4">
                  {resources.map((resource, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {getResourceIcon(resource.resource_type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <h3 className="font-medium text-lg leading-tight">
                                {resource.title}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`flex-shrink-0 ${getResourceTypeColor(resource.resource_type)}`}
                              >
                                {resource.resource_type}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{resource.estimated_time_minutes} minutes</span>
                              </div>
                            </div>
                            
                            {resource.url && resource.url !== '#' && (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-foreground hover:text-foreground/80 transition-colors"
                              >
                                <span className="font-medium">Access Resource</span>
                                <ExternalLink className="h-4 w-4 ml-2" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No resources available</h3>
                  <p className="text-muted-foreground">
                    Resources for this module will be added soon.
                  </p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Hands-on Tasks</h2>
                  <p className="text-muted-foreground">
                    {tasks.length} practical tasks to apply your skills
                  </p>
                </div>
              </div>

              {tasks.length > 0 ? (
                <div className="grid gap-4">
                  {tasks.map((task, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h3 className="font-medium text-lg leading-tight">
                              {task.task_title}
                            </h3>
                            <Badge variant="outline" className="capitalize">
                              {task.task_type}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {task.task_description}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{task.estimated_time_minutes} minutes</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tasks available</h3>
                  <p className="text-muted-foreground">
                    Tasks for this module will be added soon.
                  </p>
                </Card>
              )}
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default ModulePage;