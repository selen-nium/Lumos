import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/common/Layout';
import RoadmapSection from '../../components/dashboard/RoadmapSection';
import ChatInterface from '../../components/dashboard/ChatInterface';
import MentorHomePage from './MentorHomePage';
import { GripVertical } from 'lucide-react';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState([]);
  const [roadmapProgress, setRoadmapProgress] = useState(null);
  const [leftWidth, setLeftWidth] = useState(60); // Default 60% for roadmap
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(60);

  // Check user type and onboarding status first
  useEffect(() => {
    const checkUserTypeAndOnboarding = async () => {
      if (!user) return;

      try {
        console.log('🔍 Checking user profile and onboarding status for user:', user.id);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_type, mentor_verified, onboarding_complete')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          // If we can't fetch the profile, redirect to onboarding to be safe
          navigate('/onboarding');
          return;
        }

        console.log('📋 User profile:', profile);

        if (!profile) {
          console.log('❌ No profile found, redirecting to onboarding');
          navigate('/onboarding');
          return;
        }

        // Check if onboarding is complete
        if (!profile.onboarding_complete) {
          console.log('🚀 Onboarding not complete, redirecting to onboarding');
          navigate('/onboarding');
          return;
        }

        console.log('✅ Onboarding complete, setting user profile');
        setUserProfile(profile);
        
        // If user is a pure mentor, don't fetch roadmap data
        if (profile?.user_type === 'mentor') {
          setLoading(false);
          return;
        }
        
        // For mentees and both users, continue to fetch roadmap
        // (this will be handled by the next useEffect)

      } catch (error) {
        console.error('Error in checkUserTypeAndOnboarding:', error);
        // If there's an error, redirect to onboarding to be safe
        navigate('/onboarding');
      }
    };

    checkUserTypeAndOnboarding();
  }, [user, navigate]);

  // fetch roadmap data
  const fetchRoadmapFromDB = useCallback(async (showLoading = true) => {
    if (!user || !userProfile) return;
    
    // Don't fetch roadmap for pure mentors
    if (userProfile.user_type === 'mentor') {
      return;
    }

    try {
      if (showLoading) setLoading(true);
      console.log("🔍 Fetching normalized roadmap data for user:", user.id);

      // Get the user's learning path
      const { data: pathData, error: pathError } = await supabase
        .from('user_learning_paths')
        .select('user_path_id, path_name, path_description, status, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      console.log("📥 Path fetch result:", { data: pathData, error: pathError });

      if (pathError) {
        if (pathError.code === 'PGRST116') {
          console.log("No roadmap found, redirecting to onboarding");
          navigate('/onboarding');
          return;
        } else {
          console.error("Database error:", pathError);
          setRoadmapProgress({
            title: 'Error Loading Roadmap',
            totalModules: 0,
            completedModules: 0,
            completedPercentage: 0,
            totalHours: 0
          });
          setModules([]);
          return;
        }
      }

      if (!pathData) {
        console.log("No learning path found");
        navigate('/onboarding');
        return;
      }

      // Get modules with progress for this learning path
      const { data: moduleProgressData, error: moduleError } = await supabase
        .from('user_module_progress')
        .select(`
          module_id,
          sequence_order,
          is_completed,
          progress_percentage,
          started_at,
          completion_date,
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
        .eq('status', 'active')
        .order('sequence_order');

      if (moduleError) {
        console.error("Error fetching modules:", moduleError);
        setRoadmapProgress({
          title: pathData.path_name,
          totalModules: 0,
          completedModules: 0,
          completedPercentage: 0,
          totalHours: 0
        });
        setModules([]);
        return;
      }

      console.log("📦 Retrieved modules data:", {
        count: moduleProgressData?.length || 0,
        modules: moduleProgressData?.map(m => m.learning_modules?.module_name)
      });

      if (!moduleProgressData || moduleProgressData.length === 0) {
        console.log("No modules found in learning path");
        setRoadmapProgress({
          title: pathData.path_name,
          totalModules: 0,
          completedModules: 0,
          completedPercentage: 0,
          totalHours: 0
        });
        setModules([]);
        return;
      }

      // Process the module data
      const processedModules = await Promise.all(
        moduleProgressData.map(async (moduleProgress) => {
          const module = moduleProgress.learning_modules;
          
          // Get resources
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
            .eq('module_id', module.module_id)
            .order('sequence_order');

          // Get tasks
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
            .eq('module_id', module.module_id)
            .order('sequence_order');

          return {
            id: module.module_id,
            module_id: module.module_id,
            name: module.module_name,
            module_name: module.module_name,
            description: module.module_description,
            module_description: module.module_description,
            difficulty: module.difficulty || 'beginner',
            estimated_hours: module.estimated_hours || 3,
            sequence_order: moduleProgress.sequence_order,
            isCompleted: moduleProgress.is_completed || false,
            progress_percentage: moduleProgress.progress_percentage || 0,
            started_at: moduleProgress.started_at,
            completion_date: moduleProgress.completion_date,
            skills_covered: module.skills_covered || [],
            prerequisites: module.prerequisites || [],
            
            // Process related content
            resources: (resourcesData || []).map(r => ({
              ...r.learning_resources,
              sequence_order: r.sequence_order,
              is_required: r.is_required
            })),
            
            tasks: (tasksData || []).map(t => ({
              ...t.hands_on_tasks,
              sequence_order: t.sequence_order,
              is_required: t.is_required
            }))
          };
        })
      );

      setModules(processedModules);

      // Calculate progress statistics
      const totalModules = processedModules.length;
      const completedModules = processedModules.filter(m => m.isCompleted).length;
      const totalHours = processedModules.reduce((sum, m) => sum + (m.estimated_hours || 3), 0);

      const newRoadmapProgress = {
        title: pathData.path_name || 'Learning Roadmap',
        totalModules,
        completedModules,
        totalHours,
        completedPercentage: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
        lastUpdated: pathData.updated_at
      };

      setRoadmapProgress(newRoadmapProgress);
      
      console.log("✅ Normalized roadmap data loaded:", {
        title: newRoadmapProgress.title,
        modules: totalModules,
        completed: completedModules,
        lastUpdated: pathData.updated_at
      });

    } catch (err) {
      console.error('Error loading normalized roadmap:', err);
      setRoadmapProgress({
        title: 'Error Loading Roadmap',
        totalModules: 0,
        completedModules: 0,
        completedPercentage: 0,
        totalHours: 0
      });
      setModules([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, userProfile, navigate]);

  // Initial load only after we know user type and onboarding is complete
  useEffect(() => {
    if (userProfile && (userProfile.user_type === 'mentee' || userProfile.user_type === 'both')) {
      fetchRoadmapFromDB();
    }
  }, [userProfile, fetchRoadmapFromDB]);

  // Function to refresh roadmap data
  const refreshRoadmap = useCallback(async () => {
    console.log("🔄 Refreshing roadmap data...");
    await fetchRoadmapFromDB(false);
  }, [fetchRoadmapFromDB]);

  // Listen for roadmap updates from localStorage
  useEffect(() => {
    const handleRoadmapUpdate = (event) => {
      if (event.key === 'roadmap_updated') {
        console.log("🔔 Received roadmap update notification");
        refreshRoadmap();
        localStorage.removeItem('roadmap_updated'); // Clean up
      }
    };

    window.addEventListener('storage', handleRoadmapUpdate);
    
    // listen for custom events within the same tab
    const handleCustomUpdate = (event) => {
      if (event.detail?.type === 'roadmap_updated') {
        console.log("🔔 Received custom roadmap update event");
        refreshRoadmap();
      }
    };

    window.addEventListener('roadmapUpdated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleRoadmapUpdate);
      window.removeEventListener('roadmapUpdated', handleCustomUpdate);
    };
  }, [refreshRoadmap]);

  useEffect(() => {
    // Load saved layout preference
    const savedWidth = localStorage.getItem('homepage-left-width');
    if (savedWidth) {
      setLeftWidth(parseInt(savedWidth));
    }
  }, []);

  useEffect(() => {
    // Save layout preference
    localStorage.setItem('homepage-left-width', leftWidth.toString());
  }, [leftWidth]);

  // Add these mouse event handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = leftWidth;
    
    // Add global mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftWidth]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - startXRef.current;
    const deltaPercentage = (deltaX / containerWidth) * 100;
    const newWidth = Math.max(25, Math.min(75, startWidthRef.current + deltaPercentage));
    
    setLeftWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setIsResizing(true);
    startXRef.current = touch.clientX;
    startWidthRef.current = leftWidth;
  }, [leftWidth]);

  const handleTouchMove = useCallback((e) => {
    if (!containerRef.current || !isResizing) return;
    
    const touch = e.touches[0];
    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = touch.clientX - startXRef.current;
    const deltaPercentage = (deltaX / containerWidth) * 100;
    const newWidth = Math.max(25, Math.min(75, startWidthRef.current + deltaPercentage));
    
    setLeftWidth(newWidth);
  }, [isResizing]);

  const handleTouchEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Double-click to reset to default
  const handleDoubleClick = useCallback(() => {
    setLeftWidth(60);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  // Loading state
  if (loading || !userProfile) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-64px-56px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Render mentor homepage for pure mentors
  if (userProfile.user_type === 'mentor') {
    return <MentorHomePage />;
  }

  // Render original homepage layout for mentees and "both" users
  return (
    <Layout>
      <div 
        ref={containerRef}
        className="flex h-[calc(100vh-64px)] bg-primary-light overflow-hidden"
      >
        {/* Left Panel */}
        <div 
          className="relative overflow-hidden transition-all duration-200 ease-out"
          style={{ width: `${leftWidth}%` }}
        >
          <RoadmapSection 
            loading={loading} 
            roadmapProgress={roadmapProgress} 
            modules={modules} 
          />
        </div>

        {/* Resizable Divider */}
        <div 
          className={`
            relative flex items-center justify-center w-1 bg-border hover:bg-border/80 
            cursor-col-resize group transition-all duration-200 hover:w-2 z-10
            ${isResizing ? 'bg-primary w-2' : ''}
          `}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          title="Drag to resize • Double-click to reset"
        >
          {/* Visual indicator */}
          <div className={`
            absolute inset-y-0 flex items-center justify-center
            transition-opacity duration-200
            ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Resize line effect */}
          <div className={`
            absolute inset-y-0 w-full bg-primary transition-opacity duration-200
            ${isResizing ? 'opacity-20' : 'opacity-0'}
          `} />
        </div>

        {/* Right Panel*/}
        <div 
          className="relative overflow-hidden transition-all duration-200 ease-out"
          style={{ width: `${100 - leftWidth}%` }}
        >
          <ChatInterface 
            user={user} 
            roadmapProgress={roadmapProgress} 
            modules={modules}
            onRoadmapUpdate={refreshRoadmap}
          />
        </div>

        {/* Overlay during resize to prevent interference */}
        {isResizing && (
          <div className="absolute inset-0 bg-transparent cursor-col-resize z-20" />
        )}
      </div>
    </Layout>
  );
};

export default HomePage;