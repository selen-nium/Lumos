import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export const ProtectedRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [onboardingComplete, setOnboardingComplete] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      setOnboardingComplete(data?.onboarding_complete);
      setProfileLoading(false);
    };
    
    if (user && authLoading === false) {
      checkOnboardingStatus();
    } else if (!user && authLoading === false) {
      // If not logged in and not loading, no need to check profile
      setProfileLoading(false);
    }
  }, [user, authLoading]);

  // Show loading spinner while auth state or profile is being determined
  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-primary-light">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-btn-dark"></div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If onboarding is not complete and not on onboarding page, redirect to onboarding
  if (onboardingComplete === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  // If all checks pass, render the protected content
  return <Outlet />;
};

export const PublicRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Special case for reset password - don't redirect even if logged in
  const isResetPasswordRoute = location.pathname === '/reset-password';
  
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-primary-light">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-btn-dark"></div>
      </div>
    );
  }
  
  // If user is authenticated and not on reset password page, redirect to home or original location
  if (user && !isResetPasswordRoute) {
    const from = location.state?.from?.pathname || '/home';
    return <Navigate to={from} replace />;
  }
  
  // If not authenticated or on reset password page, render the public content
  return <Outlet />;
};