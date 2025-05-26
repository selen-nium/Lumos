import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Loader2, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
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

        await supabase.from('profiles').upsert(profileData);

        if (selectedSkills.length > 0) {
          const userSkills = selectedSkills.map(id => ({
            user_id: user.id,
            skill_id: id,
            proficiency_level: 3
          }));
          await supabase.from('user_skills').upsert(userSkills);
        }

        if (selectedGoals.length > 0) {
          const userGoals = selectedGoals.map(id => ({
            user_id: user.id,
            goal_id: id,
            is_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          await supabase.from('user_goals').upsert(userGoals);
        }

        setGeneratingRoadmap(true);

        const { data: { session } } = await supabase.auth.getSession();
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

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to generate roadmap');

        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .single();

        if (profileCheck?.onboarding_complete) {
          navigate(`/home?fromOnboarding=true&t=${Date.now()}`);
        } else {
          setError('Onboarding not completed properly. Please try again.');
        }

      } catch (err) {
        console.error(err);
        setError(err.message || 'An unexpected error occurred. Please try again.');
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
          <h1 className="text-2xl font-semibold text-center">Let's Get Started</h1>
          {renderStep()}

          <div className="flex justify-between items-center mt-4">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            ) : <div />}

            {currentStep < totalSteps ? (
              <Button onClick={() => setCurrentStep(s => s + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type='submit' onClick={formik.handleSubmit} disabled={isLoading || generatingRoadmap}>
                {generatingRoadmap || isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Finish
              </Button>
            )}
          </div>

          {error && (
            <div className="flex items-center text-sm text-destructive mt-2">
              <AlertCircle className="w-4 h-4 mr-2" /> {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;
