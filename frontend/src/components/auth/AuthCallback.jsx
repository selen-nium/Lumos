import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Starting OAuth callback...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🚀 AuthCallback started');
        setStatus('Processing OAuth callback...');
        
        // Wait a moment for any ongoing auth state changes to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get current session
        setStatus('Getting current session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('📊 Current session:', session?.user?.email || 'none');
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('Session error occurred');
          setTimeout(() => navigate('/login?error=session_error'), 2000);
          return;
        }

        if (!session || !session.user) {
          console.log('❌ No session found, redirecting to login');
          setStatus('No session found, redirecting...');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        console.log('✅ Session found for:', session.user.email);
        setStatus('Session found! Checking user profile...');

        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', session.user.id)
          .single();

        console.log('Profile check:', profile);

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
          setStatus('Error checking profile');
          setTimeout(() => navigate('/login?error=profile_error'), 2000);
          return;
        }

        // If no profile exists, create one
        if (!profile) {
          console.log('Creating new profile for OAuth user');
          setStatus('Creating user profile...');
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: session.user.id,
                username: session.user.user_metadata.full_name?.replace(/\s+/g, '').toLowerCase() || 
                         session.user.user_metadata.name?.replace(/\s+/g, '').toLowerCase() ||
                         session.user.email.split('@')[0],
                email: session.user.email,
                onboarding_complete: false
              }
            ]);

          if (insertError) {
            console.error('Profile creation error:', insertError);
            setStatus('Error creating profile');
            setTimeout(() => navigate('/login?error=profile_creation'), 2000);
            return;
          }
          
          console.log('✅ Profile created, redirecting to onboarding');
          setStatus('Profile created! Redirecting to onboarding...');
          setTimeout(() => navigate('/onboarding'), 1000);
        } else {
          // Existing user
          if (profile.onboarding_complete) {
            console.log('✅ Existing user with complete onboarding');
            setStatus('Welcome back! Redirecting to home...');
            setTimeout(() => navigate('/home'), 1000);
          } else {
            console.log('📝 Existing user with incomplete onboarding');
            setStatus('Continuing onboarding...');
            setTimeout(() => navigate('/onboarding'), 1000);
          }
        }
      } catch (error) {
        console.error('❌ Auth callback error:', error);
        setStatus('An error occurred during authentication');
        setTimeout(() => navigate('/login?error=callback_error'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Completing Google Sign In
        </h2>
        <p className="text-gray-600 mb-4">{status}</p>
        <div className="text-xs text-gray-400">
          This should only take a few seconds...
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;