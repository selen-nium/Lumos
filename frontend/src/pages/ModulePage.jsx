import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';
import Button from '../components/common/Button';
// Import mock service
import { 
  fetchMockModuleTasks, 
  fetchMockModuleResources,
  updateMockTaskProgress,
  updateMockModuleProgress,
  updateMockLearningStreak
} from '../services/MockRoadmapService';

const ModulePage = () => {
  const { moduleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [resources, setResources] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [progress, setProgress] = useState(0);
  
  // Mock data for the module
  const mockModule = {
    id: parseInt(moduleId),
    name: "Introduction to Node.js",
    description: "Understand what Node.js is|Learn its use cases and features|Install Node.js and setup development environment",
    sequence_order: 1,
    isCompleted: false,
    estimated_completion_hours: 3
  };
  
  // Mock data for tasks
  const mockTasks = [
    {
      id: 1,
      title: "Install Node.js",
      description: "Download and install Node.js on your computer",
      estimated_time_minutes: 15,
      is_completed: false,
      task_type: "setup"
    },
    {
      id: 2,
      title: "Create your first Node.js script",
      description: "Write a simple 'Hello World' program using Node.js",
      estimated_time_minutes: 20,
      is_completed: false,
      task_type: "coding"
    },
    {
      id: 3,
      title: "Understanding Node.js modules",
      description: "Learn how to create and import modules in Node.js",
      estimated_time_minutes: 45,
      is_completed: false,
      task_type: "learning"
    },
    {
      id: 4,
      title: "Quiz: Node.js Basics",
      description: "Test your understanding of Node.js fundamentals",
      estimated_time_minutes: 30,
      is_completed: false,
      task_type: "quiz"
    }
  ];
  
  // Mock data for learning resources
  const mockResources = [
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
  ];
  
  useEffect(() => {
    // Fetch module data from our mock service
    const fetchModuleData = async () => {
      setLoading(true);
      try {
        // For a real app, you'd fetch this data from your backend
        // For now, use mock data
        
        // Find the module from the mock data - since we don't have a dedicated endpoint for a single module
        // For now, use static data
        setModule({
          id: parseInt(moduleId),
          name: moduleId === "6" ? "RESTful API Development" : "Introduction to Node.js",
          description: moduleId === "6" 
            ? "Design RESTful endpoints|Implement authentication|Handle request validation"
            : "Understand what Node.js is|Learn its use cases and features|Install Node.js and setup development environment",
          sequence_order: moduleId === "6" ? 6 : 1,
          isCompleted: moduleId !== "6",
          estimated_completion_hours: moduleId === "6" ? 5 : 3
        });
        
        // Fetch tasks for this module
        const tasksData = await fetchMockModuleTasks(parseInt(moduleId));
        setTasks(tasksData);
        
        // Fetch resources for this module
        const resourcesData = await fetchMockModuleResources(parseInt(moduleId));
        setResources(resourcesData);
        
        // Calculate progress based on completed tasks
        const completedTasks = tasksData.filter(task => task.is_completed).length;
        const totalTasks = tasksData.length;
        setProgress(totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
        
      } catch (error) {
        console.error('Error fetching module data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchModuleData();
  }, [moduleId]);
  
  const handleCompleteTask = async (taskId) => {
    // Update task completion status
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, is_completed: true } : task
    );
    
    setTasks(updatedTasks);
    
    // Recalculate progress
    const completedTasks = updatedTasks.filter(task => task.is_completed).length;
    const totalTasks = updatedTasks.length;
    setProgress(totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
    
    // Update mock data
    try {
      // Update task progress
      await updateMockTaskProgress(user.id, taskId, true);
      
      // Update learning streak
      await updateMockLearningStreak(user.id);
    } catch (error) {
      console.error('Error updating task progress:', error);
    }
  };
  
  const handleCompleteModule = async () => {
    // Mark all tasks as completed
    setTasks(prevTasks => 
      prevTasks.map(task => ({ ...task, is_completed: true }))
    );
    
    setProgress(100);
    setModule(prevModule => ({ ...prevModule, isCompleted: true }));
    
    try {
      // Update module progress
      await updateMockModuleProgress(user.id, parseInt(moduleId), true);
      
      // Update learning streak
      await updateMockLearningStreak(user.id);
      
      // Show success message
      alert('Congratulations! You have completed this module.');
      
      // Redirect to home page
      navigate('/');
    } catch (error) {
      console.error('Error completing module:', error);
    }
  };
  
  const renderTaskIcon = (type) => {
    switch (type) {
      case 'setup':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'coding':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'quiz':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-btn-dark"></div>
          </div>
        ) : module ? (
          <>
            {/* Module Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <Link to="/" className="text-btn-dark hover:underline mb-2 inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Back to Roadmap
                </Link>
                <h1 className="text-3xl font-bold">Module {module.sequence_order}: {module.name}</h1>
                <p className="text-gray-600 mt-2">Estimated time: {module.estimated_completion_hours} hours</p>
              </div>
              
              <div className="mt-4 md:mt-0">
                <div className="bg-gray-200 rounded-full h-4 w-64 overflow-hidden mb-2">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600 text-right">{progress}% completed</div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="border-b mb-6">
              <nav className="flex -mb-px">
                <button
                  className={`mr-8 py-4 px-1 font-medium text-sm border-b-2 ${
                    activeTab === 'overview'
                      ? 'border-btn-dark text-btn-dark'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`mr-8 py-4 px-1 font-medium text-sm border-b-2 ${
                    activeTab === 'tasks'
                      ? 'border-btn-dark text-btn-dark'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('tasks')}
                >
                  Tasks
                </button>
                <button
                  className={`mr-8 py-4 px-1 font-medium text-sm border-b-2 ${
                    activeTab === 'resources'
                      ? 'border-btn-dark text-btn-dark'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('resources')}
                >
                  Learning Resources
                </button>
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="mb-12">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Module Objectives</h2>
                  <ul className="list-disc list-inside space-y-2 mb-6">
                    {module.description.split('|').map((objective, index) => (
                      <li key={index} className="text-gray-700">{objective.trim()}</li>
                    ))}
                  </ul>
                  
                  <h2 className="text-xl font-semibold mb-4">Module Overview</h2>
                  <p className="text-gray-700 mb-6">
                    This module introduces you to Node.js, a runtime environment that allows you to run JavaScript outside the browser. 
                    You'll learn what Node.js is, its core features, common use cases, and how to set up a development environment. 
                    By the end of this module, you'll have a solid understanding of Node.js fundamentals and be able to create 
                    simple server-side applications.
                  </p>
                  
                  <h2 className="text-xl font-semibold mb-4">What You'll Learn</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="font-medium text-gray-800 mb-2">Core Concepts</h3>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>Event-driven architecture</li>
                        <li>Non-blocking I/O model</li>
                        <li>JavaScript runtime environment</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="font-medium text-gray-800 mb-2">Practical Skills</h3>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>Setting up Node.js projects</li>
                        <li>Writing server-side JavaScript</li>
                        <li>Working with Node.js modules</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <Button
                      variant="primary"
                      onClick={() => setActiveTab('tasks')}
                    >
                      Start Learning
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Tasks Tab */}
              {activeTab === 'tasks' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Tasks to Complete</h2>
                  
                  <div className="space-y-6">
                    {tasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`border rounded-lg p-5 transition-all ${
                          task.is_completed ? 'bg-gray-50 border-green-500' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-4">
                            {renderTaskIcon(task.task_type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-lg">{task.title}</h3>
                            <p className="text-gray-600 mt-1">{task.description}</p>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-sm text-gray-500">
                                Estimated time: {task.estimated_time_minutes} minutes
                              </span>
                              {task.is_completed ? (
                                <span className="inline-flex items-center text-green-600 text-sm font-medium">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Completed
                                </span>
                              ) : (
                                <Button
                                  variant="primary"
                                  onClick={() => handleCompleteTask(task.id)}
                                >
                                  Mark as Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 flex justify-between items-center">
                    <div>
                      <p className="text-gray-600">
                        Module progress: <span className="font-medium">{progress}%</span>
                      </p>
                    </div>
                    <button
                      className={`px-6 py-3 rounded-md transition-all ${
                        progress === 100
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      onClick={handleCompleteModule}
                      disabled={progress !== 100}
                    >
                      {progress === 100 ? 'Complete Module' : 'Complete All Tasks First'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Resources Tab */}
              {activeTab === 'resources' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6">Learning Resources</h2>
                  
                  <div className="space-y-6">
                    {resources.map(resource => (
                      <div key={resource.id} className="border rounded-lg p-5 transition-all bg-white hover:bg-gray-50">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-4">
                            {resource.resource_type === 'video' && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {resource.resource_type === 'documentation' && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            {resource.resource_type === 'article' && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-lg">{resource.title}</h3>
                            <p className="text-gray-600 mt-1">
                              <span className="capitalize">{resource.resource_type}</span> • {resource.estimated_time_minutes} minutes
                            </p>
                    <div className="mt-3">
                              <a 
                                href={resource.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-btn-dark hover:underline"
                              >
                                Access Resource
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <p className="text-gray-600 mb-4">Module not found.</p>
            <Link to="/">
              <button className="px-6 py-2 bg-btn-dark text-white rounded-md hover:bg-opacity-90 transition-all">
                Return to Dashboard
              </button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ModulePage;