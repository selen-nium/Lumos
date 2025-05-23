// Structure for refactored Onboarding Page using shadcn and reusable components

// File: pages/OnboardingPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
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
      username: Yup.string().required('Required'),
      isEmployed: Yup.string().required('Required'),
      careerStage: Yup.string().required('Required'),
      company: Yup.string().when('isEmployed', {
        is: (val) => val === 'yes',
        then: () => Yup.string().required('Company is required when employed'),
        otherwise: () => Yup.string().nullable()
      }),

      role: Yup.string().when('isEmployed', {
        is: (val) => val === 'yes',
        then: () => Yup.string().required('Role is required when employed'),
        otherwise: () => Yup.string().nullable()
      }),
      weeklyLearningHours: Yup.number().required('Required'),
      preferredLearningTime: Yup.string().required('Required'),
      userType: Yup.string().required('Required'),
    }),

    onSubmit: async (values) => {
      if (!user) return setError('User not authenticated');
      setIsLoading(true);
      setError(''); // Clear any previous errors

      try {
        // Save profile data
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
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase.from('profiles').upsert(profileData);
        if (profileError) {
          console.error('Profile save error:', profileError);
          throw new Error('Failed to save profile');
        }

        // Save user skills
        if (selectedSkills.length > 0) {
          const userSkills = selectedSkills.map(id => ({
            user_id: user.id,
            skill_id: id,
            proficiency_level: 3
          }));
          
          const { error: skillsError } = await supabase.from('user_skills').upsert(userSkills);
          if (skillsError) {
            console.error('Skills save error:', skillsError);
            throw new Error('Failed to save skills');
          }
        }

        // Save user goals
        if (selectedGoals.length > 0) {
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
            throw new Error('Failed to save goals');
          }
        }

        // Start generating roadmap
        setGeneratingRoadmap(true);
        
        try {
          // Get current session for authentication
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('No active session found');
          }

          console.log('🚀 Starting roadmap generation for user:', user.id);
          
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/roadmap/generate`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}` // Add auth header
            },
            body: JSON.stringify({ 
              userId: user.id,
              userToken: session.access_token, // Include token in body as well
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
            console.error('Roadmap API error:', response.status, errorText);
            throw new Error(`Server error: ${response.status}`);
          }

          const result = await response.json();
          console.log('🎉 Roadmap generation result:', result);

          if (!result.success) {
            throw new Error(result.error || 'Failed to generate roadmap');
          }

          console.log('✅ Roadmap generated successfully');

        } catch (roadmapError) {
          console.error('❌ Roadmap generation failed:', roadmapError);
          setError(`Failed to generate your learning roadmap: ${roadmapError.message}`);
          return;
        } finally {
          setGeneratingRoadmap(false);
        }

        // Verify onboarding completion
        const { data: profileCheck, error: checkError } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .single();

        if (checkError) {
          console.error('Error checking onboarding status:', checkError);
          setError('Error confirming onboarding completion');
          return;
        }

        if (profileCheck?.onboarding_complete) {
          console.log('🎯 Navigating to home page');
          navigate(`/home?fromOnboarding=true&t=${Date.now()}`);
        } else {
          setError('Onboarding not completed properly. Please try again.');
        }

      } catch (error) {
        console.error('❌ Onboarding submission error:', error);
        setError(error.message || 'An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  });

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Profile formik={formik} />;
      case 2:
        return <Step2Career formik={formik} />;
      case 3:
        return <Step3Skills skills={skills} selectedSkills={selectedSkills} setSelectedSkills={setSelectedSkills} />;
      case 4:
        return <Step4Goals goals={goals} selectedGoals={selectedGoals} setSelectedGoals={setSelectedGoals} />;
      case 5:
        return <Step5Review formik={formik} skills={skills} goals={goals} selectedSkills={selectedSkills} selectedGoals={selectedGoals} generatingRoadmap={generatingRoadmap} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <Logo />

      {/* progress bar */}
      <div className="w-1/2 h-2 bg-muted rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-btn-dark transition-all"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      <div className="max-w-4xl w-full p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Let's Get Started</h1>
        {renderStep()}
        <div className="flex justify-between mt-4">
          {currentStep > 1 && <Button variant="secondary" onClick={() => setCurrentStep(s => s - 1)}>Back</Button>}
          {currentStep < totalSteps
            ? <Button onClick={() => setCurrentStep(s => s + 1)}>Next</Button>
            : <Button type='submit' onClick={formik.handleSubmit}>Finish</Button>}
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    </div>
  );
};

export default OnboardingPage;