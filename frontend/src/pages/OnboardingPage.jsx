import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import Logo from '../components/common/Logo';
import Step1Profile from '../components/onboarding/Step1Profile';
import Step2Career from '../components/onboarding/Step2Career';
import Step3Skills from '../components/onboarding/Step3Skills';
import Step4Goals from '../components/onboarding/Step4Goals';
import Step5Review from '../components/onboarding/Step5Review';

const OnboardingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [skills, setSkills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const navigate = useNavigate();
  const totalSteps = 5;

  useEffect(() => {
    const getSessionAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate('/login');
      setUser(session.user);

      const { data: skillsData } = await supabase.from('skills').select('*');
      const { data: goalsData } = await supabase.from('goals').select('*');

      setSkills(skillsData || []);
      setGoals(goalsData || []);
    };
    getSessionAndData();
  }, [navigate]);

  const formik = useFormik({
    initialValues: {
      username: '',
      isEmployed: 'no',
      careerStage: 'student',
      company: '',
      role: '',
      weeklyLearningHours: 1,
      preferredLearningTime: 'evening',
      userType: 'mentee'
    },
    validationSchema: Yup.object({
      username: Yup.string()
        .min(2, 'Username must be at least 2 characters')
        .max(50, 'Username must be less than 50 characters')
        .required('Username is required'),
      isEmployed: Yup.string().required('Required'),
      careerStage: Yup.string().required('Required'),
      company: Yup.string().when('isEmployed', {
        is: val => val === 'yes',
        then: () => Yup.string().required('Required'),
      }),
      role: Yup.string().when('isEmployed', {
        is: val => val === 'yes',
        then: () => Yup.string().required('Required'),
      }),
      weeklyLearningHours: Yup.number().required('Required'),
      preferredLearningTime: Yup.string().required('Required'),
      userType: Yup.string().required('Required'),
    }),
    onSubmit: async (values) => {
      if (!user) return setError('User not authenticated');
      setIsLoading(true);
      setError('');

      try {
        console.log('🚀 Starting onboarding process for user:', user.id);

        // Step 1: Save profile data
        const profileData = {
          id: user.id,
          username: values.username,
          email: user.email,
          is_employed: values.isEmployed,
          career_stage: values.careerStage,
          company: values.company || null,
          role: values.role || null,
          weekly_learning_hours: values.weeklyLearningHours,
          preferred_learning_time: values.preferredLearningTime,
          user_type: values.userType,
          onboarding_complete: false, // Keep false until everything is done
          updated_at: new Date().toISOString(),
        };

        console.log('💾 Saving profile data...');
        const { error: profileError } = await supabase.from('profiles').upsert(profileData);
        if (profileError) {
          console.error('Profile save error:', profileError);
          throw new Error(`Failed to save profile: ${profileError.message}`);
        }

        // Step 2: Save skills
        if (selectedSkills.length > 0) {
          console.log('🛠️ Saving user skills...');
          const userSkills = selectedSkills.map(id => ({
            user_id: user.id,
            skill_id: id,
            proficiency_level: 3
          }));
          
          const { error: skillsError } = await supabase.from('user_skills').upsert(userSkills);
          if (skillsError) {
            console.error('Skills save error:', skillsError);
            throw new Error(`Failed to save skills: ${skillsError.message}`);
          }
        }

        // Step 3: Save goals
        if (selectedGoals.length > 0) {
          console.log('🎯 Saving user goals...');
          const userGoals = selectedGoals.map(id => ({
            user_id: user.id,
            goal_id: id,
            is_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          const { error: goalsError } = await supabase.from('user_goals').upsert(userGoals);
          if (goalsError) {
            console.error('Goals save error:', goalsError);
            throw new Error(`Failed to save goals: ${goalsError.message}`);
          }
        }

        console.log('✅ Profile data saved successfully');

        // Step 4: Generate roadmap
        setGeneratingRoadmap(true);
        console.log('🗺️ Generating roadmap...');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session expired. Please login again.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/roadmap/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: user.id,
            userToken: session.access_token,
            profileData: {
              skills: selectedSkills,
              goals: selectedGoals,
              careerStage: values.careerStage,
              weeklyHours: values.weeklyLearningHours,
              isEmployed: values.isEmployed
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Roadmap API error:', errorText);
          throw new Error(`Roadmap generation failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('🗺️ Roadmap generation result:', result);

        if (!result.success) {
          throw new Error(result.error || 'Failed to generate roadmap');
        }

        console.log('✅ Roadmap generated successfully');

        // Step 5: Mark onboarding as complete
        console.log('✅ Marking onboarding as complete...');
        const { error: completionError } = await supabase
          .from('profiles')
          .update({ 
            onboarding_complete: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (completionError) {
          console.error('Completion update error:', completionError);
          throw new Error(`Failed to complete onboarding: ${completionError.message}`);
        }

        // Step 6: Verify onboarding completion
        console.log('🔍 Verifying onboarding completion...');
        const { data: profileCheck, error: checkError } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .single();

        if (checkError) {
          console.error('Profile check error:', checkError);
          throw new Error(`Failed to verify onboarding: ${checkError.message}`);
        }

        console.log('📋 Profile check result:', profileCheck);

        if (profileCheck?.onboarding_complete === true) {
          console.log('🎉 Onboarding completed successfully! Redirecting...');
          navigate(`/home?fromOnboarding=true&t=${Date.now()}`);
        } else {
          console.error('❌ Onboarding completion check failed:', profileCheck);
          throw new Error('Onboarding completion verification failed. Please try again.');
        }

      } catch (err) {
        console.error('❌ Onboarding error:', err);
        setError(err.message || 'An unexpected error occurred. Please try again.');
        
        // Reset the roadmap generation state on error
        setGeneratingRoadmap(false);
      } finally {
        setIsLoading(false);
        setGeneratingRoadmap(false);
      }
    }
  });

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Profile formik={formik} />;
      case 2: return <Step2Career formik={formik} />;
      case 3: return <Step3Skills skills={skills} selectedSkills={selectedSkills} setSelectedSkills={setSelectedSkills} />;
      case 4: return <Step4Goals goals={goals} selectedGoals={selectedGoals} setSelectedGoals={setSelectedGoals} />;
      case 5: return <Step5Review formik={formik} skills={skills} goals={goals} selectedSkills={selectedSkills} selectedGoals={selectedGoals} generatingRoadmap={generatingRoadmap} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-4 py-8">
      <Logo />

      {/* Progress Header */}
      <div className="max-w-2xl w-full text-center mb-6">
        <Progress value={(currentStep / totalSteps) * 100} className="h-3 mb-2 border-2 border-black" />
        <p className="text-muted-foreground text-sm">Step {currentStep} of {totalSteps}</p>
      </div>

      {/* Card Container */}
      <Card className="w-full max-w-3xl shadow-lg">
        <CardContent className="p-6 space-y-6">
          <h1 className="text-2xl font-semibold text-center">Before we get started...</h1>
          {renderStep()}

          <div className="flex justify-between items-center mt-4">
            {currentStep > 1 ? (
              <Button 
                variant="outline" 
                className='group' 
                size='sm' 
                onClick={() => setCurrentStep(s => s - 1)}
                disabled={isLoading || generatingRoadmap}
              >
                <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back
              </Button>
            ) : <div />}

            {currentStep < totalSteps ? (
              <Button 
                variant='default' 
                className='group' 
                size='sm' 
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={isLoading || generatingRoadmap}
              >
                Next <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button 
                type='submit' 
                className='w-50 h-10 group hover:scale-105 transition-transform' 
                onClick={formik.handleSubmit} 
                disabled={isLoading || generatingRoadmap}
              >
                {generatingRoadmap ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-20 transition-transform" />
                    Generate Roadmap
                  </>
                )}
              </Button>
            )}
          </div>

          {error && (
            <div className="flex items-start text-sm text-destructive mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> 
              <span>{error}</span>
            </div>
          )}

          {generatingRoadmap && (
            <div className="text-center text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating your personalized learning roadmap...</span>
              </div>
              <p className="text-xs mt-1">This may take a few moments</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;