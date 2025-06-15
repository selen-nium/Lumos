import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('onboarding_complete, user_type, mentor_verified') // Added user_type and mentor_verified
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user profile:', error);
          }
          
          setUserProfile(data);
        } catch (error) {
          console.error('Error in fetchUserProfile:', error);
        }
      }
      setProfileLoading(false);
    };

    if (!loading) {
      fetchUserProfile();
    }
  }, [user, loading]);

  // Show loading state
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle onboarding based on user type
  if (userProfile) {
    const isPureMentor = userProfile.user_type === 'mentor';
    const isMentorVerified = userProfile.mentor_verified === true;
    const hasCompletedOnboarding = userProfile.onboarding_complete === true;

    // Pure mentors don't need full onboarding if they're verified
    if (isPureMentor && isMentorVerified && !hasCompletedOnboarding) {
      // Skip onboarding for verified mentors - they can go straight to home
      return children;
    }
    
    // For mentees and "both" users, require onboarding
    if (!hasCompletedOnboarding && (userProfile.user_type === 'mentee' || userProfile.user_type === 'both')) {
      return <Navigate to="/onboarding" replace />;
    }
    
    // For unverified mentors, they might need a different onboarding flow
    if (isPureMentor && !isMentorVerified && !hasCompletedOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;