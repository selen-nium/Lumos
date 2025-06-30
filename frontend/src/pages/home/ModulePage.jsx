import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import TasksSection from '@/components/dashboard/taskSection';
import Layout from '../../components/common/Layout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
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
  AlertTriangle,
  Target,
  Trophy,
  Sparkles
} from 'lucide-react';
import Lottie from "react-lottie-player";
import confettiAnimation from "../../assets/animation/confetti.json";
import trophyAnimation from '../../assets/animation/trophy.json';

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

      // Get user's learning path ID
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
      
      // Update local task state immediately
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

      // Success notification
      console.log(`🎉 Task ${isCompleted ? 'completed' : 'marked incomplete'} successfully!`);

    } catch (error) {
      console.error('❌ Error updating task completion:', error);
      throw error;
    }
  };

  const getResourceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <Video className= "text-red-500" />;
      case 'article':
        return <FileText className="text-blue-500" />;
      case 'documentation':
        return <BookOpen className="text-green-500" />;
      case 'tutorial':
        return <PlayCircle className="text-purple-500" />;
      default:
        return <BookOpen className="text-gray-500" />;
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
      case 'beginner':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'intermediate':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'advanced':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return <Target className="h-3 w-3" />;
      case 'intermediate':
        return <Trophy className="h-3 w-3" />;
      case 'advanced':
        return <Sparkles className="h-3 w-3" />;
      default:
        return <Target className="h-3 w-3" />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-fade-in">
            <div className="mb-8 space-y-4">
              <div className="h-4 bg-muted/50 rounded w-32 animate-pulse"></div>
              <div className="h-8 bg-muted/50 rounded w-64 animate-pulse"></div>
              <div className="h-4 bg-muted/50 rounded w-48 animate-pulse"></div>
            </div>
            
            <div className="flex justify-center items-center h-64">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumos-primary"></div>
                <span className="text-muted-foreground font-medium">Loading your module...</span>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // error state
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-fade-in">
            <Card className="max-w-2xl mx-auto card-minimal-hover">
              <CardContent className="p-8 text-center">
                <div className="text-red-500 mb-6">
                  <AlertTriangle className="h-16 w-16 mx-auto" />
                </div>
                
                {error.type === 'module_not_found' ? (
                  <>
                    <h2 className="text-2xl font-bold mb-4">Module Not Found</h2>
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                      The module you're looking for might have been modified or reorganized. 
                      Here are the available modules in your roadmap:
                    </p>
                    
                    <div className="space-y-3 mb-8">
                      {error.availableModules?.map((availableModule) => (
                        <Card key={availableModule.id} className="card-minimal-hover transition-all">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div className="text-left">
                                <p className="font-semibold">{availableModule.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Module {availableModule.sequence_order}
                                </p>
                              </div>
                              <Link to={`/module/${availableModule.id}`}>
                                <Button size="sm" className="btn-primary-rounded">
                                  Go to Module
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-4">Module Not Found</h2>
                    <p className="text-muted-foreground mb-8">{error.message}</p>
                  </>
                )}
                
                <Link to="/">
                  <Button className="btn-primary-rounded">Return to Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
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
            loop
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

          {/* Congratulations Modal */}
          <div className="absolute inset-0 flex items-center justify-center z-60 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg text-center card-minimal-hover animate-slide-up">
              <div className="mb-6">
                <Lottie
                  loop
                  play
                  animationData={trophyAnimation}
                  style={{
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 50
                  }}
                />
                <h2 className="text-3xl font-bold mb-2 bg-clip-text text-black">
                  🎉 Congratulations!
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  You've successfully completed the <br />
                  <strong className="text-foreground">{module.name}</strong> module
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setShowCompletionUI(false);
                    navigate('/');
                  }}
                  className="btn-primary-rounded w-full py-3 text-base font-semibold"
                >
                  Return to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCompletionUI(false)}
                  className="btn-outline-rounded w-full py-3"
                >
                  Continue Exploring
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 animate-fade-in">
        {/* Module Header */}
        <div className="mb-10">
          <Link 
            to="/" 
            className="inline-flex items-center text-muted-foreground hover:text-lumos-primary mb-6 transition-all hover-fade group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Roadmap
          </Link>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="badge-primary px-3 py-1 font-medium">
                  Module {module.sequence_order}
                </Badge>
                <Badge variant="secondary" className={`${getResourceTypeColor(module.difficulty)} px-3 py-1 font-medium`}>
                  {getDifficultyIcon(module.difficulty)}
                  <span className="ml-1">{module.difficulty}</span>
                </Badge>
                {module.isCompleted && (
                  <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 font-medium">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {module.name}
              </h1>
              
              <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{module.estimated_completion_hours} hours</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-lg">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">{resources.length} resources</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-lg">
                  <Code className="h-4 w-4" />
                  <span className="font-medium">{tasks.length} tasks</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-4 lg:min-w-[200px]">
              <div className="text-right">
                <div className="text-5xl font-bold text-lumos-primary">
                  {progress}%
                </div>
                <p className="text-lg text-muted-foreground font-medium">completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-10">
          <div className="flex gap-2 p-1 bg-muted/30 rounded-xl w-fit">
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'resources', label: 'Resources', icon: BookOpen },
              { id: 'tasks', label: 'Tasks', icon: Code }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all focus-primary ${
                    activeTab === tab.id
                      ? 'text-lumos-primary-dark shadow-sm shadow-blue-200 border border-lumos-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-slide-up">
              {/* Module Objectives */}
              <Card className="card-minimal-hover overflow-hidden">
                <CardHeader className="">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Target className="h-5 w-5 text-lumos-primary" />
                    Module Objectives
                  </CardTitle>
                  <CardDescription className="text-base">
                    What you'll learn in this comprehensive module
                  </CardDescription>
                </CardHeader>
                <CardContent className="">
                  <div className="grid gap-4">
                    {module.description?.split('|').map((objective, index) => (
                      <div key={index} className="flex items-start gap-4 bg-muted/20 rounded-xl hover:bg-muted/30 transition-colors">
                        <span className='font-medium'>{index+1}</span>
                        <span className="font-medium">{objective.trim()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Learning Path */}
              <Card className="card-minimal-hover overflow-hidden">
                <CardHeader className="">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    Learning Path
                  </CardTitle>
                  <CardDescription className="text-base">
                    Follow this structured approach to master the module concepts
                  </CardDescription>
                </CardHeader>
                <CardContent className="">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl hover-lift transition-all">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-lg">1. Study the Resources</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Go through all the learning materials in the Resources tab. Take notes and ensure you understand each concept before moving forward.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-green-50 to-green-100/50 rounded-xl hover-lift transition-all">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Code className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-lg">2. Practice & Apply</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Work through practical examples and hands-on exercises. Apply what you've learned to build your understanding and confidence.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl hover-lift transition-all">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-lg">3. Complete the Module</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          Mark the module as complete when you've mastered the concepts and feel confident applying them in real projects.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => setActiveTab('resources')}
                  className="btn-primary-rounded flex-1 sm:flex-none py-3 px-8 text-base font-semibold hover-lift"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  Explore Resources
                </Button>
                
                {!module.isCompleted && (
                  <Button 
                    variant="outline"
                    onClick={handleCompleteModule}
                    className="btn-outline-rounded flex-1 sm:flex-none py-3 px-8 text-base font-semibold hover-lift"
                  >
                    <Trophy className="h-5 w-5 mr-2" />
                    Mark as Complete
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="space-y-8 animate-slide-up">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {/* <BookOpen className="h-6 w-6 text-lumos-primary" /> */}
                    Learning Resources
                  </h2>
                  <p className="text-muted-foreground text-lg mt-1">
                    {resources.length} carefully curated resources to help you master this module
                  </p>
                </div>
              </div>

              {resources.length > 0 ? (
                <div className="grid gap-6">
                  {resources.map((resource, index) => (
                    <Card key={index} className="card-minimal-hover overflow-hidden group">
                      <CardContent className="p-8">
                        <div className="flex items-start gap-6">
                          <div className="flex-shrink-0 p-3 group-hover:bg-muted/50 transition-colors">
                            {getResourceIcon(resource.resource_type)}
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="font-bold text-xl leading-tight group-hover:text-lumos-primary transition-colors">
                                {resource.resource_title}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`flex-shrink-0 ${getResourceTypeColor(resource.resource_type)} font-medium px-3 py-1`}
                              >
                                {resource.resource_type}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-6 text-muted-foreground">
                              <div className="flex items-center gap-2 bg-muted/20 px-3 py-1 rounded-lg">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">{resource.estimated_time_minutes} minutes</span>
                              </div>
                              {resource.is_required && (
                                <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-lg">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="font-medium">Required</span>
                                </div>
                              )}
                            </div>
                            
                            {resource.description && (
                              <p className="text-muted-foreground leading-relaxed">
                                {resource.description}
                              </p>
                            )}
                            
                            {resource.url && resource.url !== '#' && (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 border-1 text-black px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:bg-blue-400 hover:text-white hover:shadow-blue-100 transition-all focus-primary"
                              >
                                <span>Access Resource</span>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="card-minimal-hover">
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <BookOpen className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">No resources available yet</h3>
                    <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
                      Learning resources for this module are being prepared and will be available soon. 
                      Check back later for updates.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="animate-slide-up">
              <TasksSection 
                tasks={tasks} 
                onTaskCompletion={handleTaskCompletion}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ModulePage;