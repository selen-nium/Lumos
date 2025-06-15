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
      userType: 'mentee',
      // Mentor-specific fields
      yearsExperience: '',
      mentorBio: '',
      availabilityHours: '2 hours/week'
    },
    validationSchema: Yup.object().shape({
      username: Yup.string().required('Username is required'),
      isEmployed: Yup.string().required('Employment status is required'),
      careerStage: Yup.string().required('Career stage is required'),
      company: Yup.string().when(['isEmployed'], {
        is: 'yes',
        then: () => Yup.string().required('Company is required'),
      }),
      role: Yup.string().when(['isEmployed'], {
        is: 'yes',
        then: () => Yup.string().required('Role is required'),
      }),
      userType: Yup.string().required('User type is required'),
      // Conditional validation for mentees
      weeklyLearningHours: Yup.number().when(['userType'], {
        is: (userType) => userType === 'mentee' || userType === 'both',
        then: () => Yup.number().required('Learning hours required for mentees'),
      }),
      preferredLearningTime: Yup.string().when(['userType'], {
        is: (userType) => userType === 'mentee' || userType === 'both',
        then: () => Yup.string().required('Preferred learning time required for mentees'),
      }),
      // Conditional validation for mentors
      yearsExperience: Yup.number().when(['userType'], {
        is: (userType) => userType === 'mentor' || userType === 'both',
        then: () => Yup.number().min(1, 'At least 1 year of experience required').required('Experience required for mentors'),
      }),
      mentorBio: Yup.string().when(['userType'], {
        is: (userType) => userType === 'mentor' || userType === 'both',
        then: () => Yup.string().min(50, 'Bio should be at least 50 characters').required('Bio required for mentors'),
      }),
      availabilityHours: Yup.string().when(['userType'], {
        is: (userType) => userType === 'mentor' || userType === 'both',
        then: () => Yup.string().required('Availability required for mentors'),
      })
    }),
    onSubmit: async (values) => {
      if (!user) return setError('User not authenticated');
      setIsLoading(true);
      setError('');

      try {
        const isMentor = values.userType === 'mentor' || values.userType === 'both';
        const isMentee = values.userType === 'mentee' || values.userType === 'both';

        const profileData = {
          id: user.id,
          username: values.username,
          email: user.email,
          is_employed: values.isEmployed,
          career_stage: values.careerStage,
          company: values.company || null,
          role: values.role || null,
          weekly_learning_hours: isMentee ? values.weeklyLearningHours : null,
          preferred_learning_time: isMentee ? values.preferredLearningTime : null,
          user_type: values.userType,
          onboarding_complete: true,
          // Mentor-specific fields
          mentor_verified: false, // Will be verified later by admin
          mentor_bio: isMentor ? values.mentorBio : null,
          availability_hours: isMentor ? values.availabilityHours : null,
          years_experience: isMentor ? values.yearsExperience : null,
          updated_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert(profileData);

        // Handle skills for all users
        if (selectedSkills.length > 0) {
          const userSkills = selectedSkills.map(id => ({
            user_id: user.id,
            skill_id: id,
            proficiency_level: 3
          }));
          await supabase.from('user_skills').upsert(userSkills);
        }

        // Handle goals only for mentees
        if (isMentee && selectedGoals.length > 0) {
          const userGoals = selectedGoals.map(id => ({
            user_id: user.id,
            goal_id: id,
            is_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          await supabase.from('user_goals').upsert(userGoals);
        }

        // For mentors, show success message and redirect to community
        if (values.userType === 'mentor') {
          // Don't generate roadmap for pure mentors
          const { data: profileCheck } = await supabase
            .from('profiles')
            .select('onboarding_complete')
            .eq('id', user.id)
            .single();

          if (profileCheck?.onboarding_complete) {
            navigate('/community?fromOnboarding=true&userType=mentor');
          } else {
            setError('Onboarding not completed properly. Please try again.');
          }
          return;
        }

        // For mentees and both, generate roadmap
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

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formik.values.username && formik.values.isEmployed;
      case 2:
        const isEmploymentValid = formik.values.isEmployed === 'no' || 
          (formik.values.company && formik.values.role);
        const isMentor = formik.values.userType === 'mentor' || formik.values.userType === 'both';
        const isMentee = formik.values.userType === 'mentee' || formik.values.userType === 'both';
        
        let mentorFieldsValid = true;
        if (isMentor) {
          mentorFieldsValid = formik.values.yearsExperience && 
                             formik.values.mentorBio && 
                             formik.values.mentorBio.length >= 50 &&
                             formik.values.availabilityHours;
        }
        
        let menteeFieldsValid = true;
        if (isMentee) {
          menteeFieldsValid = formik.values.weeklyLearningHours && 
                             formik.values.preferredLearningTime;
        }
        
        return formik.values.careerStage && 
               formik.values.userType && 
               isEmploymentValid && 
               mentorFieldsValid && 
               menteeFieldsValid;
      case 3:
        return selectedSkills.length > 0;
      case 4:
        // Goals only required for mentees
        if (formik.values.userType === 'mentor') return true;
        return selectedGoals.length > 0;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceedToNextStep()) {
      setCurrentStep(s => s + 1);
    }
  };

  const shouldShowStep = (step) => {
    // Step 4 (Goals) is only shown for mentees and both
    if (step === 4) {
      return formik.values.userType === 'mentee' || formik.values.userType === 'both';
    }
    return true;
  };

  const getEffectiveStep = () => {
    // If we're on step 4 but it should be skipped, treat as step 5
    if (currentStep === 4 && !shouldShowStep(4)) {
      return 5;
    }
    return currentStep;
  };

  const renderStep = () => {
    const effectiveStep = getEffectiveStep();
    
    switch (effectiveStep) {
      case 1: return <Step1Profile formik={formik} />;
      case 2: return <Step2Career formik={formik} />;
      case 3: return <Step3Skills skills={skills} selectedSkills={selectedSkills} setSelectedSkills={setSelectedSkills} />;
      case 4: return <Step4Goals goals={goals} selectedGoals={selectedGoals} setSelectedGoals={setSelectedGoals} />;
      case 5: return <Step5Review formik={formik} skills={skills} goals={goals} selectedSkills={selectedSkills} selectedGoals={selectedGoals} generatingRoadmap={generatingRoadmap} />;
      default: return null;
    }
  };

  const getStepTitle = () => {
    const effectiveStep = getEffectiveStep();
    const titles = {
      1: "Personal Information",
      2: "Career & Experience",
      3: "Current Skills",
      4: "Learning Goals",
      5: "Review & Confirm"
    };
    return titles[effectiveStep] || "Getting Started";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-4 py-8">
      <Logo />

      {/* Progress Header */}
      <div className="max-w-2xl w-full text-center mb-6">
        <Progress value={(currentStep / totalSteps) * 100} className="h-3 mb-2 border-2 border-black" />
        <p className="text-muted-foreground text-sm">Step {currentStep} of {totalSteps}</p>
        <h2 className="text-xl font-semibold mt-2">{getStepTitle()}</h2>
      </div>

      {/* Card Container */}
      <Card className="w-full max-w-3xl shadow-lg">
        <CardContent className="p-6 space-y-6">
          {renderStep()}

          <div className="flex justify-between items-center mt-6">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            ) : <div />}

            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNext}
                disabled={!canProceedToNextStep()}
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type='submit' 
                onClick={formik.handleSubmit} 
                disabled={isLoading || generatingRoadmap || !canProceedToNextStep()}
              >
                {generatingRoadmap || isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {formik.values.userType === 'mentor' ? 'Complete Setup' : 'Generate My Roadmap'}
              </Button>
            )}
          </div>

          {error && (
            <div className="flex items-center text-sm text-destructive mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> 
              <span>{error}</span>
            </div>
          )}

          {/* Mentor verification notice */}
          {(formik.values.userType === 'mentor' || formik.values.userType === 'both') && currentStep === 5 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-sm">ℹ️</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Mentor Verification Process</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    After completing setup, our team will contact you via your registered email for verification. 
                    This ensures the quality and safety of our mentoring community.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;