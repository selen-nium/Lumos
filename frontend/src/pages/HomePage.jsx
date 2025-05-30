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

  // Memoized function to fetch roadmap data
  const fetchRoadmapFromDB = useCallback(async (showLoading = true) => {
    if (!user) return;

    try {
      if (showLoading) setLoading(true);
      console.log("🔍 Fetching roadmap data for user:", user.id);

      const { data: roadmapData, error } = await supabase
        .from('user_learning_paths')
        .select('path_data, path_name, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      console.log("📥 Roadmap fetch result:", { data: roadmapData, error });

      if (error || !roadmapData?.path_data) {
        console.warn("No roadmap yet, retrying...");
        setTimeout(fetchRoadmapFromDB, 1000);  // retry once after 1 sec
        return;
      }

      const roadmap = roadmapData.path_data;
      
      // Handle both phase-based and flat module structures
      let moduleList = [];
      if (roadmap.phases && Array.isArray(roadmap.phases)) {
        moduleList = roadmap.phases.flatMap(phase => phase.modules || []);
      } else if (roadmap.modules && Array.isArray(roadmap.modules)) {
        moduleList = roadmap.modules;
      } else {
        console.error("Invalid roadmap structure:", roadmap);
        navigate('/onboarding');
        return;
      }

      if (!moduleList || moduleList.length === 0) {
        console.log("No modules found, redirecting to onboarding");
        navigate('/onboarding');
        return;
      }

      // Add completion status to modules if not present
      const processedModules = moduleList.map((module, index) => ({
        ...module,
        id: module.module_id || index + 1,
        isCompleted: module.isCompleted || false,
        estimated_hours: module.estimated_completion_time_hours || 
                       (module.estimated_duration_weeks ? module.estimated_duration_weeks * 2 : 3),
        sequence_order: module.sequence_order || index + 1
      }));

      setModules(processedModules);

      const totalModules = processedModules.length;
      const completedModules = processedModules.filter(m => m.isCompleted).length;
      const totalHours = processedModules.reduce((sum, m) => sum + (m.estimated_hours || 3), 0);

      const newRoadmapProgress = {
        title: roadmapData.path_name || roadmap.path_name || roadmap.roadmap_title || 'Learning Roadmap',
        totalModules,
        completedModules,
        totalHours,
        completedPercentage: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
        lastUpdated: roadmapData.updated_at
      };

      setRoadmapProgress(newRoadmapProgress);
      
      console.log("✅ Roadmap data updated:", {
        title: newRoadmapProgress.title,
        modules: totalModules,
        completed: completedModules,
        lastUpdated: roadmapData.updated_at
      });

    } catch (err) {
      console.error('Error loading roadmap:', err);
      navigate('/onboarding');
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