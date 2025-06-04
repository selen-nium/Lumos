// Enhanced HomePage.jsx with roadmap refresh capability
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';
import RoadmapSection from '../components/dashboard/RoadmapSection';
import ChatInterface from '../components/dashboard/ChatInterface';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState([]);
  const [roadmapProgress, setRoadmapProgress] = useState(null);

  // function to fetch roadmap data
  const fetchRoadmapFromDB = useCallback(async (showLoading = true) => {
    if (!user) return;

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

      // Process the normalized module data
      const processedModules = await Promise.all(
        moduleProgressData.map(async (moduleProgress) => {
          const module = moduleProgress.learning_modules;
          
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
            .eq('module_id', module.module_id)
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
  }, [user, navigate]);

  // Initial load
  useEffect(() => {
    fetchRoadmapFromDB();
  }, [fetchRoadmapFromDB]);

  // Function to refresh roadmap data (can be called by ChatInterface)
  const refreshRoadmap = useCallback(async () => {
    console.log("🔄 Refreshing roadmap data...");
    await fetchRoadmapFromDB(false); // Don't show loading spinner for refresh
  }, [fetchRoadmapFromDB]);

  // Listen for roadmap updates from localStorage (alternative method)
  useEffect(() => {
    const handleRoadmapUpdate = (event) => {
      if (event.key === 'roadmap_updated') {
        console.log("🔔 Received roadmap update notification");
        refreshRoadmap();
        localStorage.removeItem('roadmap_updated'); // Clean up
      }
    };

    window.addEventListener('storage', handleRoadmapUpdate);
    
    // Also listen for custom events within the same tab
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

  return (
    <Layout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px-56px)] bg-primary-light">
        <RoadmapSection 
          loading={loading} 
          roadmapProgress={roadmapProgress} 
          modules={modules} 
        />
        <ChatInterface 
          user={user} 
          roadmapProgress={roadmapProgress} 
          modules={modules}
          onRoadmapUpdate={refreshRoadmap} // Pass refresh function to chat
        />
      </div>
    </Layout>
  );
};

export default HomePage;