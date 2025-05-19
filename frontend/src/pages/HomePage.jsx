import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';
import Button from '../components/common/Button';
// Import mock data service (remove this when you have real backend)
import { fetchMockRoadmap } from '../services/MockRoadmapService';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null);
  const [hasRoadmap, setHasRoadmap] = useState(true); // Assume user has roadmap initially
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content: "I see you're working on your Node.js roadmap! You've completed 70% so far. Is there anything specific you'd like help with?"
    }
  ]);
  const [selectedModule, setSelectedModule] = useState(0);
  
  // State for roadmap progress
  const [roadmapProgress, setRoadmapProgress] = useState({
    title: "Node.js",
    totalModules: 8,
    completedModules: 5,
    totalHours: 20,
    completedPercentage: 70
  });
  
  // State for modules
  const [modules, setModules] = useState([]);
  
  // Fetch user data and roadmap
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch user profile
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (profileError) throw profileError;
          setUserProfile(profileData);
        } catch (error) {
          console.error('Error fetching profile:', error);
          // Set mock profile data as fallback
          setUserProfile({
            id: user.id,
            username: "usertest",
            email: "test@example.com",
            weekly_learning_hours: 5
          });
        }
        
        // Fetch roadmap data using mock service
        try {
          const roadmapData = await fetchMockRoadmap(user.id);
          
          // Check if user has a roadmap
          if (!roadmapData || !roadmapData.path_modules || roadmapData.path_modules.length === 0) {
            setHasRoadmap(false);
            setLoading(false);
            return;
          }
          
          setRoadmap(roadmapData);
          
          // Calculate progress stats
          const totalModules = roadmapData.path_modules.length;
          const completedModules = roadmapData.path_modules.filter(pm => pm.is_completed).length;
          const completedPercentage = Math.round((completedModules / totalModules) * 100);
          
          // Calculate total hours
          const totalHours = roadmapData.path_modules.reduce(
            (total, pm) => total + pm.module.estimated_completion_hours, 
            0
          );
          
          setRoadmapProgress({
            title: roadmapData.path_title,
            totalModules,
            completedModules,
            totalHours,
            completedPercentage
          });
          
          // Convert path_modules to our modules format
          setModules(roadmapData.path_modules.map(pm => ({
            id: pm.module.module_id,
            name: pm.module.module_name,
            isCompleted: pm.is_completed,
            description: pm.module.module_description,
            sequence_order: pm.sequence_order,
            estimated_hours: pm.module.estimated_completion_hours
          })));
          
        } catch (error) {
          console.error('Error fetching roadmap:', error);
          setHasRoadmap(false);
        }
        
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, navigate]);
  
  // Redirect to onboarding if user doesn't have a roadmap
  useEffect(() => {
    if (!loading && !hasRoadmap) {
      navigate('/onboarding');
    }
  }, [loading, hasRoadmap, navigate]);
  
  // Handle chat interactions
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    // Add user message to chat history
    const newMessage = { role: 'user', content: chatMessage };
    setChatHistory([...chatHistory, newMessage]);
    
    // Clear input field
    setChatMessage('');
    
    // Show typing indicator
    setChatHistory(prev => [...prev, { role: 'assistant', content: '...', isTyping: true }]);
    
    // Simulate AI response
    setTimeout(async () => {
      // Remove typing indicator
      setChatHistory(prev => prev.filter(msg => !msg.isTyping));
      
      // Determine response based on user message content
      if (
        chatMessage.toLowerCase().includes('less time') || 
        chatMessage.toLowerCase().includes('busy') ||
        chatMessage.toLowerCase().includes('reorganize')
      ) {
        setChatHistory(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: "I understand you have less time available. I can help reorganize your remaining modules to be more manageable. Would you like me to focus on just the essential concepts to reach your goals faster?" 
          }
        ]);
      } else if (
        chatMessage.toLowerCase().includes('notes') ||
        chatMessage.toLowerCase().includes('summary') ||
        chatMessage.toLowerCase().includes('remind')
      ) {
        setChatHistory(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: "I can help organize notes for the modules you've completed. From your Node.js modules, you've learned about the fundamentals, building servers, Express.js, and database integration. Would you like me to prepare a summary of key concepts from these modules?" 
          }
        ]);
      } else {
        // Generic helpful response
        setChatHistory(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: "I'm here to help with your Node.js learning journey. I can assist with reorganizing your roadmap based on your schedule, summarizing what you've learned, or answering questions about Node.js concepts. What would you like help with today?" 
          }
        ]);
      }
    }, 1500);
  };
  
  // Render chat messages
  const renderChatMessage = (message, index) => {
    return (
      <div 
        key={index} 
        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div 
          className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
            message.role === 'user' 
              ? 'bg-btn-dark text-white rounded-tr-none' 
              : 'bg-gray-100 text-gray-800 rounded-tl-none'
          }`}
        >
          {message.content}
        </div>
      </div>
    );
  };
  
  // Render modules with completion status
  const renderModule = (module, index) => {
    return (
      <div 
        key={module.id}
        className={`border rounded-lg p-6 transition-all module-card relative mb-6 ${
          selectedModule === index ? 'bg-gray-50 border-btn-dark' : 'bg-white hover:bg-gray-50'
        }`}
        onClick={() => setSelectedModule(index)}
      >
        {/* Completion badge */}
        {module.isCompleted && (
          <div className="absolute top-4 right-4 bg-btn-dark text-white text-xs font-bold px-2 py-1 rounded-md">
            completed
          </div>
        )}
        
        <h3 className="font-medium text-lg mb-3">Module {module.sequence_order} - {module.name}</h3>
        
        <div className="mt-3">
          <h4 className="font-medium mb-2">Objectives:</h4>
          <ul className="list-disc list-inside space-y-1 pl-2">
            {module.description.split('|').map((objective, i) => (
              <li key={i} className="text-gray-700">{objective.trim()}</li>
            ))}
          </ul>
        </div>
        
        {/* Button to start/continue the module */}
        <div className="mt-4">
          <Link to={`/module/${module.id}`}>
            <Button
              variant={module.isCompleted ? 'secondary' : 'primary'}
              disabled={false}
            >
              {module.isCompleted ? 'Review Module' : 'Start Module'}
            </Button>
          </Link>
        </div>
      </div>
    );
  };
  
  // Listen for users coming from onboarding
  useEffect(() => {
    if (!loading && roadmap) {
      // If coming from onboarding with a fresh roadmap, show welcoming message
      const urlParams = new URLSearchParams(window.location.search);
      const fromOnboarding = urlParams.get('fromOnboarding') === 'true';
      
      if (fromOnboarding) {
        setChatHistory([
          {
            role: 'assistant',
            content: `Welcome to Lumos, ${userProfile?.username || 'there'}! I've created your learning roadmap based on your profile and goals. You can explore the modules on the left and track your progress. If you need any help or want to adjust your roadmap, just let me know!`
          }
        ]);
        
        // Clear the URL parameter to avoid showing this message on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [loading, roadmap, userProfile]);
  
  // Function to align timeline markers with modules
  useEffect(() => {
    const alignTimelineWithModules = () => {
      const moduleElements = document.querySelectorAll('.module-card');
      const timelineMarkers = document.querySelectorAll('[data-marker-index]');
      
      if (!moduleElements.length || !timelineMarkers.length) return;
      
      const container = document.querySelector('.modules-container');
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      
      moduleElements.forEach((moduleEl, index) => {
        const moduleRect = moduleEl.getBoundingClientRect();
        const marker = document.querySelector(`[data-marker-index="${index}"]`);
        
        if (marker) {
          // Set marker position to align with the module title (about 30px from the top of the module)
          marker.style.top = `${moduleRect.top - containerRect.top + 30}px`;
        }
      });
      
      // Update the timeline line to match the first and last markers
      const firstMarker = document.querySelector('[data-marker-index="0"]');
      const lastMarker = document.querySelector(`[data-marker-index="${moduleElements.length - 1}"]`);
      const timelineLine = document.querySelector('.timeline-line');
      const timelineProgress = document.querySelector('.timeline-progress');
      
      if (firstMarker && lastMarker && timelineLine && timelineProgress) {
        const firstTop = parseFloat(firstMarker.style.top);
        const lastTop = parseFloat(lastMarker.style.top);
        
        timelineLine.style.top = `${firstTop}px`;
        timelineLine.style.height = `${lastTop - firstTop}px`;
        
        const progressHeight = (roadmapProgress.completedModules / roadmapProgress.totalModules) * (lastTop - firstTop);
        timelineProgress.style.top = `${firstTop}px`;
        timelineProgress.style.height = `${progressHeight}px`;
      }
    };
    
    // Initial alignment after render
    setTimeout(alignTimelineWithModules, 500);
    
    // Re-align on window resize
    window.addEventListener('resize', alignTimelineWithModules);
    
    return () => {
      window.removeEventListener('resize', alignTimelineWithModules);
    };
  }, [modules, roadmapProgress]);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px-56px)] bg-primary-light">
        {/* Left side - Roadmap */}
        <div className="md:w-1/2 overflow-y-auto h-full relative">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">{roadmapProgress.title}</h1>
              <div className="text-2xl font-bold">{roadmapProgress.completedPercentage}% completed</div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-btn-dark"></div>
              </div>
            ) : (
              <div className="flex">
                {/* Timeline */}
                <div className="hidden md:block w-12 relative flex-shrink-0">
                  {/* Timeline line */}
                  <div 
                    className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gray-200 timeline-line"
                    style={{
                      top: '50px',
                      height: `calc(${modules.length * 200}px - 50px)`
                    }}
                  ></div>
                  
                  {/* Active/completed part of timeline */}
                  <div 
                    className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-btn-dark timeline-progress"
                    style={{
                      top: '50px',
                      height: `${(roadmapProgress.completedModules / roadmapProgress.totalModules) * (modules.length * 200 - 50)}px`
                    }}
                  ></div>
                  
                  {/* Timeline markers */}
                  {modules.map((module, index) => (
                    <div 
                      key={index}
                      data-marker-index={index}
                      className={`absolute left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer ${
                        module.isCompleted
                          ? 'bg-btn-dark'
                          : selectedModule === index
                            ? 'bg-primary'
                            : 'bg-gray-200'
                      }`}
                      style={{ top: `${50 + (index * 200)}px` }}
                      onClick={() => setSelectedModule(index)}
                    >
                      <span className="text-xs text-white font-medium">{index + 1}</span>
                    </div>
                  ))}
                </div>
                
                {/* Modules */}
                <div className="flex-1 modules-container">
                  <p className="text-gray-700 mb-6">
                    Node.js is a runtime that lets you run JavaScript outside the browser, making
                    it possible to <span className="underline">build fast and scalable backend applications</span>. In this segment,
                    you'll learn everything about Node.js—from handling servers and databases
                    to building APIs.
                  </p>
                  
                  <div className="flex items-center space-x-2 justify-center bg-gray-50 rounded-md p-3 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{roadmapProgress.totalModules} modules / {roadmapProgress.totalHours} hours</span>
                  </div>
                  
                  <div className="space-y-6 pb-12">
                    {modules.map(renderModule)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Chat interface */}
        <div className="md:w-1/2 flex flex-col border-t md:border-t-0 md:border-l h-full">
          {/* Chat messages */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full border-1 bg-color-background flex justify-center items-center mr-2">
                <img src="/logo.svg" alt="Lumos Logo" className="w-6 h-6" />
              </div>
              <span className="font-medium">Lumos AI Assistant</span>
            </div>
            
            <div className="space-y-4">
              {chatHistory.map(renderChatMessage)}
            </div>
          </div>
          
          {/* Chat input */}
          <div className="border-t p-4 mt-auto">
            <form onSubmit={handleSendMessage} className="flex">
              <input
                type="text"
                placeholder="Ask for help or suggestions..."
                className="flex-1 border rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-btn-dark"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <button 
                type="submit"
                className="bg-btn-dark text-white px-4 py-2 rounded-r-md hover:bg-opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;