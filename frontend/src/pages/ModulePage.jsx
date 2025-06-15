import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import TasksSection from '@/components/dashboard/taskSection';
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
import Lottie from "react-lottie-player";
import confettiAnimation from "../assets/animation/confetti.json";

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
  const [showCompletionUI, setShowCompletionUI] = useState(false);

  useEffect(() => {
    const fetchModuleData = async () => {
      if (!user || !moduleId) return;

      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Looking for module:", moduleId);

        // Fetch user's active learning path with modules
        const { data: pathData, error: pathError } = await supabase
          .from('user_learning_paths')
          .select('user_path_id, path_name')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (pathError) {
          console.error('Error fetching learning path:', pathError);
          throw new Error('Failed to load learning path');
        }

        if (!pathData) {
          throw new Error('No learning path found');
        }

        // Get the specific module with progress
        const { data: moduleProgressData, error: moduleError } = await supabase
          .from('user_module_progress')
          .select(`
            *,
            learning_modules (
              module_id,
              module_name,
              module_description,
              difficulty,
              estimated_hours,
              skills_covered,
              prerequisites
            )
          `)
          .eq('user_path_id', pathData.user_path_id)
          .eq('module_id', moduleId)
          .single();

        if (moduleError) {
          console.error('Error fetching module:', moduleError);
          throw new Error('Module not found');
        }

        if (!moduleProgressData) {
          throw new Error('Module not found');
        }

        const moduleData = moduleProgressData.learning_modules;

        // Get resources for this module
        const { data: resourcesData } = await supabase
          .from('module_resources')
          .select(`
            sequence_order,
            is_required,
            learning_resources (
              resource_id,
              resource_title,
              resource_type,
              url,
              estimated_time_minutes,
              description
            )
          `)
          .eq('module_id', moduleId)
          .order('sequence_order');

        // Get tasks for this module
        const { data: tasksData } = await supabase
          .from('module_tasks')
          .select(`
            sequence_order,
            is_required,
            hands_on_tasks (
              task_id,
              task_title,
              task_description,
              task_type,
              estimated_time_minutes,
              instructions
            )
          `)
          .eq('module_id', moduleId)
          .order('sequence_order');

        //  user's task completion status
        const { data: taskProgressData, error: taskProgressError } = await supabase
          .from('user_task_progress')
          .select('task_id, is_completed, completion_date')
          .eq('user_id', user.id);

        if (taskProgressError) {
          console.warn('Error fetching task progress:', taskProgressError);
        }

        // Create a map of task completion status
        const taskCompletionMap = new Map();
        if (taskProgressData) {
          taskProgressData.forEach(progress => {
            taskCompletionMap.set(progress.task_id, {
              isCompleted: progress.is_completed,
              completionDate: progress.completion_date
            });
          });
        }

        console.log('📊 Task completion map:', taskCompletionMap);

        // Process the module data
        const processedModule = {
          id: moduleData.module_id,
          name: moduleData.module_name,
          description: moduleData.module_description,
          difficulty: moduleData.difficulty || 'Beginner',
          estimated_duration_weeks: Math.ceil((moduleData.estimated_hours || 3) / 10),
          estimated_completion_hours: moduleData.estimated_hours || 3,
          sequence_order: moduleProgressData.sequence_order,
          isCompleted: moduleProgressData.is_completed || false,
        };

        const processedResources = (resourcesData || []).map(r => ({
          ...r.learning_resources,
          sequence_order: r.sequence_order,
          is_required: r.is_required
        }));

        const processedTasks = (tasksData || []).map(t => {
          const taskData = t.hands_on_tasks;
          const completion = taskCompletionMap.get(taskData.task_id) || {};
          
          return {
            ...taskData,
            sequence_order: t.sequence_order,
            is_required: t.is_required,
            isCompleted: completion.isCompleted || false,
            completionDate: completion.completionDate || null
          };
        });

        console.log('📝 Processed tasks with completion status:', processedTasks);

        setModule(processedModule);
        setResources(processedResources);
        setTasks(processedTasks);
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
      console.log('🔄 Completing module:', {
        userId: user.id,
        moduleId: module.id,
        moduleName: module.name
      });

      // Fetch path
      const { data: pathData, error: pathError } = await supabase
        .from('user_learning_paths')
        .select('user_path_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (pathError || !pathData) throw new Error('Could not find your learning path');

      console.log('📍 Found learning path:', pathData.user_path_id);

      // Update module completion
      const { data: updateData, error: updateError } = await supabase
        .from('user_module_progress')
        .update({ 
          is_completed: true,
          completion_date: new Date().toISOString(),
          progress_percentage: 100
        })
        .eq('user_path_id', pathData.user_path_id)
        .eq('module_id', module.id)
        .eq('status', 'active')
        .select();

      if (updateError || !updateData || updateData.length === 0) {
        throw new Error('Failed to update module completion');
      }

      console.log('✅ Module completion updated:', updateData);

      // Update local state
      setModule(prev => ({ ...prev, isCompleted: true }));
      setProgress(100);
      setShowCompletionUI(true);

    } catch (error) {
      console.error('Error completing module:', error);
      alert(`Failed to complete module: ${error.message}`);
    }
  };

  const handleTaskCompletion = async (taskId, isCompleted) => {
    try {
      console.log('🔄 Updating task completion:', { taskId, isCompleted });

      // Get the user's learning path ID
      const { data: pathData, error: pathError } = await supabase
        .from('user_learning_paths')
        .select('user_path_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (pathError) {
        console.error('Error fetching learning path:', pathError);
        throw new Error('Could not find your learning path');
      }

      // Update task completion in user_task_progress table
      const { data: updateData, error: updateError } = await supabase
        .from('user_task_progress')
        .upsert({
          user_id: user.id,
          user_path_id: pathData.user_path_id,
          task_id: taskId,
          is_completed: isCompleted,
          completion_date: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,task_id'
        })
        .select();

      if (updateError) {
        console.error('Error updating task completion:', updateError);
        throw new Error('Failed to update task completion');
      }

      console.log('✅ Task completion updated successfully');
      
      // ✅ FIXED: Update local task state immediately
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.task_id === taskId 
            ? { 
                ...task, 
                isCompleted, 
                completionDate: isCompleted ? new Date().toISOString() : null 
              }
            : task
        )
      );

      // Success notification (you can add toast here)
      console.log(`🎉 Task ${isCompleted ? 'completed' : 'marked incomplete'} successfully!`);

    } catch (error) {
      console.error('❌ Error updating task completion:', error);
      throw error;
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

  // Loading state
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

  // Error state (no confetti here)
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

  return (
    <Layout>
      {showCompletionUI && (
        <div className="fixed inset-0 z-50">
          {/* Confetti */}
          <Lottie
            loop={false}
            play
            animationData={confettiAnimation}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 50
            }}
          />

          {/* Centered Congratulations */}
          <div className="absolute inset-0 flex items-center justify-center z-60 bg-black/10">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
              <h2 className="text-3xl font-bold mb-4 text-green-600">🎉 Congratulations!</h2>
              <p className="text-muted-foreground mb-6">
                You've successfully completed the <strong>{module.name}</strong> module.
              </p>

              <Button
                onClick={() => {
                  setShowCompletionUI(false);
                  navigate('/');
                }}
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-1">
                  <Code className="h-4 w-4" />
                  <span>{tasks.length} tasks</span>
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
                                {resource.resource_title}
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

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <TasksSection 
              tasks={tasks} 
              onTaskCompletion={handleTaskCompletion}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ModulePage;