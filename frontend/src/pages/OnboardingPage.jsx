import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import Progress from '@/components/ui/progress';
import { AlertCircle, Loader2, ChevronLeft, ChevronRight, CheckCircle, Sparkles } from 'lucide-react';
import Logo from '../components/common/Logo';
import Step1Profile from '../components/onboarding/Step1Profile';
import Step2Career from '../components/onboarding/Step2Career';
import Step3Skills from '../components/onboarding/Step3Skills';
import Step4Goals from '../components/onboarding/Step4Goals';
import Step5Review from '../components/onboarding/Step5Review';
import LetterGlitch from '@/components/common/LetterGlitch';
import Lottie from 'react-lottie-player';
import bgAnimation from '../assets/animation/shapeBg'

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
      case 3: return (
        <Step3Skills 
          skills={skills} 
          selectedSkills={selectedSkills} 
          setSelectedSkills={setSelectedSkills} 
        />
      );
      case 4: return (
        <Step4Goals 
          goals={goals} 
          selectedGoals={selectedGoals} 
          setSelectedGoals={setSelectedGoals} 
        />
      );
      case 5: return (
        <Step5Review 
          formik={formik} 
          skills={skills} 
          goals={goals} 
          selectedSkills={selectedSkills} 
          selectedGoals={selectedGoals} 
          generatingRoadmap={generatingRoadmap} 
        />
      );
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

  const getStepDescription = () => {
    const effectiveStep = getEffectiveStep();
    const descriptions = {
      1: "Tell us about yourself to get started",
      2: "Share your career background and aspirations", 
      3: "Select your current technical skills",
      4: "Choose what you'd like to learn and achieve",
      5: "Review your information before we create your roadmap"
    };
    return descriptions[effectiveStep] || "Let's get you set up";
  };

  const getWelcomeMessage = () => {
    const messages = {
      1: "Welcome to Lumos!",
      2: "Tell us about your career",
      3: "What are your skills?", 
      4: "What do you want to learn?",
      5: "You're almost ready!"
    };
    return messages[currentStep] || "Welcome to Lumos!";
  };

  const getWelcomeSubtext = () => {
    const subtexts = {
      1: "Let's create your personalized learning journey together. We'll start by getting to know you better.",
      2: "Help us understand your background so we can tailor the perfect learning experience for you.",
      3: "Select the technologies and skills you're already comfortable with. This helps us create the right starting point.",
      4: "Choose your learning objectives and goals. We'll build a roadmap to help you achieve them.",
      5: "Review your information and we'll generate your personalized learning roadmap in just a moment!"
    };
    return subtexts[currentStep] || "Let's get started on your learning journey.";
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-4/12 lg:sticky lg:top-0 lg:h-screen flex-col p-8 bg-gradient-to-br from-gray-50 to-blue-50/30 border-r border-gray-200">
        {/* Header */}
        <div className="mb-12">
          <div className='m-10'>
            <Logo />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Getting Started</h1>
            <p className="text-gray-600">Complete your profile to unlock your personalized learning journey</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          {/* Active Progress Line */}
          <div 
            className="absolute left-6 top-0 w-0.5 bg-gradient-to-b from-blue-600 to-blue-400 transition-all duration-500 ease-out"
            style={{ height: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          ></div>

          {/* Timeline Steps */}
          <div className="">
            {[
              {
                step: 1,
                title: "Personal Information",
                description: "Tell us about yourself",
                icon: "👤"
              },
              {
                step: 2,
                title: "Career & Experience",
                description: "Share your background",
                icon: "💼"
              },
              {
                step: 3,
                title: "Current Skills",
                description: "Select your expertise",
                icon: "🛠️"
              },
              {
                step: 4,
                title: "Learning Goals",
                description: "Choose your objectives",
                icon: "🎯",
                conditional: true
              },
              {
                step: 5,
                title: "Review & Confirm",
                description: "Finalize your setup",
                icon: "✅"
              }
            ].map((item) => {
              // Skip step 4 for mentors
              if (item.conditional && formik.values.userType === 'mentor') {
                return null;
              }

              const isCompleted = currentStep > item.step;
              const isCurrent = currentStep === item.step;
              const isUpcoming = currentStep < item.step;

              return (
                <div key={item.step} className="relative flex items-start">
                  {/* Timeline Dot */}
                  <div className={`
                    relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                    ${isCompleted 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                      : isCurrent 
                        ? 'bg-white border-blue-600 text-blue-600 shadow-lg ring-4 ring-blue-100' 
                        : 'bg-white border-gray-300 text-gray-400'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="text-lg font-semibold">{item.step}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="ml-10 flex-1 pb-8">
                    <div className={`
                      transition-all duration-300
                      ${isCurrent ? 'transform scale-105' : ''}
                    `}>
                      <div className={`
                        flex items-center gap-3 mb-2
                        ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-700' : 'text-gray-500'}
                      `}>
                        <span className="text-xl">{item.icon}</span>
                        <h3 className={`
                          font-semibold
                          ${isCurrent ? 'text-lg' : 'text-base'}
                        `}>
                          {item.title}
                        </h3>
                      </div>
                      <p className={`
                        text-sm transition-all duration-300
                        ${isCurrent ? 'text-gray-700 font-medium' : 'text-gray-500'}
                      `}>
                        {item.description}
                      </p>
                      
                      {/* Current Step Indicator */}
                      {isCurrent && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full w-fit">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          Current Step
                        </div>
                      )}
                      
                      {/* Completed Indicator */}
                      {isCompleted && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Progress Summary */}
        {/* <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-blue-600">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <Progress 
            value={(currentStep / totalSteps) * 100} 
            className="h-2"
          />
          <div className="mt-2 text-xs text-gray-500">
            Step {currentStep} of {totalSteps} completed
          </div>
        </div> */}
      </div>

      
      {/* Right Panel - Form */}
      <div className="flex-1 lg:w-8/12 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="lg:hidden bg-white border-b p-4 text-center">
          <Logo />
          <div className="mt-4">
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">Step {currentStep} of {totalSteps}</p>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col justify-center p-6 lg:p-12">
          <div className="w-full max-w-2xl mx-auto">
            {/* Step Content */}
            <div className="bg-white rounded-2xl shadow-sm border p-8 min-h-[500px] flex flex-col">
              <div className="flex-1">
                {renderStep()}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-8 border-t border-gray-100 mt-8">
                {currentStep > 1 ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(s => s - 1)}
                    className="btn-outline-rounded"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                ) : <div />}

                {currentStep < totalSteps ? (
                  <Button 
                    onClick={handleNext}
                    disabled={!canProceedToNextStep()}
                    className="btn-primary-rounded hover-lift"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    type='submit' 
                    onClick={formik.handleSubmit} 
                    disabled={isLoading || generatingRoadmap || !canProceedToNextStep()}
                    className="btn-primary-rounded hover-lift"
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

              {/* Error Display */}
              {error && (
                <div className="flex items-center text-sm text-red-700 mt-4 p-4 bg-red-50 rounded-xl border border-red-200 animate-fade-in">
                  <AlertCircle className="w-4 h-4 mr-3 flex-shrink-0" /> 
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;