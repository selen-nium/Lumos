import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../supabaseClient';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { generateNewRoadmap } from '../services/MockRoadmapService';
import Logo from '../components/common/Logo';

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
  const [chatInteractions, setChatInteractions] = useState([
    { role: 'assistant', content: "I'll help you create a personalized learning roadmap. First, let's gather some information about you." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const navigate = useNavigate();

  // Total number of steps in the onboarding process
  const totalSteps = 4;

  // Mock skill and goal data (replace with actual data from Supabase)
  const mockSkills = [
    { skill_id: 1, skill_name: 'JavaScript', category: 'frontend' },
    { skill_id: 2, skill_name: 'React', category: 'frontend' },
    { skill_id: 3, skill_name: 'Node.js', category: 'backend' },
    { skill_id: 4, skill_name: 'Express.js', category: 'backend' },
    { skill_id: 5, skill_name: 'MongoDB', category: 'database' },
    { skill_id: 6, skill_name: 'PostgreSQL', category: 'database' },
    { skill_id: 7, skill_name: 'HTML', category: 'frontend' },
    { skill_id: 8, skill_name: 'CSS', category: 'frontend' },
    { skill_id: 9, skill_name: 'Python', category: 'backend' },
    { skill_id: 10, skill_name: 'Java', category: 'backend' },
    { skill_id: 11, skill_name: 'Swift', category: 'mobile' },
    { skill_id: 12, skill_name: 'Kotlin', category: 'mobile' }
  ];

  const mockGoals = [
    { goal_id: 1, goal_title: 'Become a Full Stack Developer', goal_description: 'Learn both frontend and backend technologies' },
    { goal_id: 2, goal_title: 'Specialize in Frontend Development', goal_description: 'Focus on UI/UX and modern frontend frameworks' },
    { goal_id: 3, goal_title: 'Specialize in Backend Development', goal_description: 'Focus on server-side programming and databases' },
    { goal_id: 4, goal_title: 'Learn Mobile Development', goal_description: 'Create mobile applications for iOS and Android' },
    { goal_id: 5, goal_title: 'Learn Data Science', goal_description: 'Focus on data analysis, visualization, and machine learning' },
    { goal_id: 6, goal_title: 'Transition to DevOps', goal_description: 'Learn CI/CD, containerization, and cloud platforms' },
    { goal_id: 7, goal_title: 'Learn Cloud Computing', goal_description: 'Become proficient with major cloud platforms' },
    { goal_id: 8, goal_title: 'Learn Cybersecurity', goal_description: 'Focus on protecting systems and networks from attacks' }
  ];

  // Check if user is authenticated and fetch skills/goals
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If no session, redirect to login
          navigate('/login');
          return;
        }
        
        setUser(session.user);

        // Fetch skills from the database
        // Replace this with actual API call when ready
        // const { data: skillsData, error: skillsError } = await supabase
        //   .from('skills')
        //   .select('*');
        
        // if (skillsError) throw skillsError;
        // setSkills(skillsData);
        setSkills(mockSkills);

        // Fetch goals from the database
        // Replace this with actual API call when ready
        // const { data: goalsData, error: goalsError } = await supabase
        //   .from('goals')
        //   .select('*');
        
        // if (goalsError) throw goalsError;
        // setGoals(goalsData);
        setGoals(mockGoals);
      } catch (error) {
        console.error('Error checking session:', error);
        navigate('/login');
      }
    };
    
    getSession();
  }, [navigate]);

  // Initialize formik for all steps
  const formik = useFormik({
    initialValues: {
      username: '',
      isEmployed: 'no',
      careerStage: 'student',
      company: '',
      role: '',
      weeklyLearningHours: 5,
      preferredLearningTime: 'evening',
      userType: 'mentee',
    },
    validationSchema: Yup.object({
      username: Yup.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be less than 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .required('Username is required'),
      isEmployed: Yup.string().required('Required'),
      careerStage: Yup.string().required('Required'),
      company: Yup.string().when('isEmployed', {
        is: 'yes',
        then: () => Yup.string().required('Company is required when employed')
      }),
      role: Yup.string().when('isEmployed', {
        is: 'yes',
        then: () => Yup.string().required('Role is required when employed')
      }),
      weeklyLearningHours: Yup.number()
        .min(1, 'Must be at least 1 hour')
        .required('Required'),
      preferredLearningTime: Yup.string().required('Required'),
      userType: Yup.string().required('Required'),
    }),  
    onSubmit: async (values) => {
      if (!user) {
        setError('You must be logged in to complete onboarding');
        return;
      }

      setIsLoading(true);
      setError('');
      
      try {
        // Save profile data to the database
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
          updated_at: new Date().toISOString()
        };
        
        // Save profile to the database
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData);
        
        if (profileError) throw profileError;

        // Save selected skills to the database - to be implemented after skills and goals db updated
        // if (selectedSkills.length > 0) {
        //   const userSkillsData = selectedSkills.map(skillId => ({
        //     user_id: user.id,
        //     skill_id: skillId,
        //     proficiency_level: 3  // Default to mid-level
        //   }));
          
        //   const { error: skillsError } = await supabase
        //     .from('user_skills')
        //     .upsert(userSkillsData);
          
        //   if (skillsError) throw skillsError;
        // }

        // Save selected goals to the database
        // if (selectedGoals.length > 0) {
        //   const userGoalsData = selectedGoals.map(goalId => ({
        //     user_id: user.id,
        //     goal_id: goalId,
        //     is_completed: false,
        //     created_at: new Date().toISOString(),
        //     updated_at: new Date().toISOString()
        //   }));
          
        //   const { error: goalsError } = await supabase
        //     .from('user_goals')
        //     .upsert(userGoalsData);
          
        //   if (goalsError) throw goalsError;
        // }

        // Generate roadmap
        setGeneratingRoadmap(true);
        
        // Add generating message to chat
        setChatInteractions([
          ...chatInteractions,
          { role: 'assistant', content: "Thank you for providing all this information! I'm now generating your personalized learning roadmap based on your goals, skills, and availability." }
        ]);

        // Delay to simulate roadmap generation
        setTimeout(async () => {
          try {
            // Use mock service for now
            await generateNewRoadmap(user.id, {
              skills: selectedSkills,
              goals: selectedGoals,
              profile: profileData
            });

            // Add success message to chat
            setChatInteractions(prev => [
              ...prev,
              { role: 'assistant', content: "Your roadmap has been created successfully! I've designed a learning path that matches your goals and available time. Let's start your learning journey!" }
            ]);

            // Navigate to home page with newly generated roadmap
            setTimeout(() => {
              navigate('/home?fromOnboarding=true');
            }, 2000);
          } catch (error) {
            console.error('Error generating roadmap:', error);
            setError('Failed to generate roadmap. Please try again.');
            setGeneratingRoadmap(false);
          }
        }, 3000);
      } catch (error) {
        console.error('Error saving profile:', error);
        setError(error.message || 'Failed to save profile');
        setIsLoading(false);
        setGeneratingRoadmap(false);
      }
    },
  });

  // Handle skill selection
  const toggleSkillSelection = (skillId) => {
    setSelectedSkills(prev => 
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  // Handle goal selection
  const toggleGoalSelection = (goalId) => {
    setSelectedGoals(prev => 
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  // Handle next step
  const handleNextStep = () => {
    // Validate current step before proceeding
    const validateStep = () => {
      switch (currentStep) {
        case 1: // Basic Info
          return formik.values.username && !formik.errors.username;
        case 2: // Employment Info
          if (formik.values.isEmployed === 'yes') {
            return formik.values.company && formik.values.role && !formik.errors.company && !formik.errors.role;
          }
          return true;
        case 3: // Skills
          return selectedSkills.length > 0;
        case 4: // Goals
          return selectedGoals.length > 0;
        default:
          return true;
      }
    };

    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps + 1));
    } else {
      setError('Please complete all required fields before continuing.');
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  // Helper function to display current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-medium mb-4">Your Profile</h2>
            
            <div>
              <label className="block text-text font-medium mb-2">Username</label>
              <Input
                type="text"
                name="username"
                placeholder="Choose a username"
                value={formik.values.username}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.username && formik.errors.username}
              />
            </div>
            
            <div>
              <label className="block text-text font-medium mb-2">Are you currently employed?</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="employed-yes"
                    name="isEmployed"
                    type="radio"
                    value="yes"
                    checked={formik.values.isEmployed === 'yes'}
                    onChange={formik.handleChange}
                    className="h-4 w-4 text-btn-dark"
                  />
                  <label htmlFor="employed-yes" className="ml-2 text-text">Yes</label>
                </div>
                <div className="flex items-center">
                  <input
                    id="employed-no"
                    name="isEmployed"
                    type="radio"
                    value="no"
                    checked={formik.values.isEmployed === 'no'}
                    onChange={formik.handleChange}
                    className="h-4 w-4 text-btn-dark"
                  />
                  <label htmlFor="employed-no" className="ml-2 text-text">No</label>
                </div>
              </div>
              {formik.touched.isEmployed && formik.errors.isEmployed && (
                <p className="text-error text-xs mt-1">{formik.errors.isEmployed}</p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-medium mb-4">Career Information</h2>
            
            <div>
              <label className="block text-text font-medium mb-2">Career Stage</label>
              <select
                name="careerStage"
                value={formik.values.careerStage}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="form-input"
              >
                <option value="student">Student</option>
                <option value="early-career">Early Career (0-2 years)</option>
                <option value="mid-career">Mid Career (3-7 years)</option>
                <option value="senior">Senior (8+ years)</option>
                <option value="career-break">Career Break/Re-entering</option>
              </select>
              {formik.touched.careerStage && formik.errors.careerStage && (
                <p className="text-error text-xs mt-1">{formik.errors.careerStage}</p>
              )}
            </div>
            
            {formik.values.isEmployed === 'yes' && (
              <>
                <div>
                  <label className="block text-text font-medium mb-2">Company</label>
                  <Input
                    type="text"
                    name="company"
                    placeholder="Your company name"
                    value={formik.values.company}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.company && formik.errors.company}
                  />
                </div>
                
                <div>
                  <label className="block text-text font-medium mb-2">Role/Title</label>
                  <Input
                    type="text"
                    name="role"
                    placeholder="Your current role"
                    value={formik.values.role}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.role && formik.errors.role}
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-text font-medium mb-2">
                Weekly Learning Hours
              </label>
              <Input
                type="number"
                name="weeklyLearningHours"
                placeholder="Hours per week"
                value={formik.values.weeklyLearningHours}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.weeklyLearningHours && formik.errors.weeklyLearningHours}
              />
            </div>
            
            <div>
              <label className="block text-text font-medium mb-2">
                Preferred Learning Time
              </label>
              <select
                name="preferredLearningTime"
                value={formik.values.preferredLearningTime}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="form-input"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="late-night">Late Night</option>
                <option value="weekend">Weekend</option>
                <option value="no-preference">No Preference</option>
              </select>
              {formik.touched.preferredLearningTime && formik.errors.preferredLearningTime && (
                <p className="text-error text-xs mt-1">{formik.errors.preferredLearningTime}</p>
              )}
            </div>
            
            <div>
              <label className="block text-text font-medium mb-2">
                I'd like to join as a:
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="userType-mentee"
                    name="userType"
                    type="radio"
                    value="mentee"
                    checked={formik.values.userType === 'mentee'}
                    onChange={formik.handleChange}
                    className="h-4 w-4 text-btn-dark"
                  />
                  <label htmlFor="userType-mentee" className="ml-2 text-text">Mentee (looking to learn)</label>
                </div>
                <div className="flex items-center">
                  <input
                    id="userType-mentor"
                    name="userType"
                    type="radio"
                    value="mentor"
                    checked={formik.values.userType === 'mentor'}
                    onChange={formik.handleChange}
                    className="h-4 w-4 text-btn-dark"
                  />
                  <label htmlFor="userType-mentor" className="ml-2 text-text">Mentor (looking to guide others)</label>
                </div>
                <div className="flex items-center">
                  <input
                    id="userType-both"
                    name="userType"
                    type="radio"
                    value="both"
                    checked={formik.values.userType === 'both'}
                    onChange={formik.handleChange}
                    className="h-4 w-4 text-btn-dark"
                  />
                  <label htmlFor="userType-both" className="ml-2 text-text">Both</label>
                </div>
              </div>
              {formik.touched.userType && formik.errors.userType && (
                <p className="text-error text-xs mt-1">{formik.errors.userType}</p>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-medium mb-4">Your Current Skills</h2>
            <p className="text-gray-600 mb-4">Select the skills you already have experience with:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map(skill => (
                <div 
                  key={skill.skill_id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedSkills.includes(skill.skill_id)
                      ? 'bg-btn-dark text-white border-btn-dark'
                      : 'bg-white hover:border-btn-dark'
                  }`}
                  onClick={() => toggleSkillSelection(skill.skill_id)}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 flex-shrink-0 border rounded mr-3 ${
                      selectedSkills.includes(skill.skill_id)
                        ? 'bg-white border-white'
                        : 'border-gray-300'
                    }`}>
                      {selectedSkills.includes(skill.skill_id) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-btn-dark" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{skill.skill_name}</p>
                      <p className={`text-xs capitalize ${
                        selectedSkills.includes(skill.skill_id) ? 'text-gray-200' : 'text-gray-500'
                      }`}>
                        {skill.category}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedSkills.length === 0 && (
              <p className="text-gray-500 italic text-sm">Select at least one skill to continue</p>
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-medium mb-4">Your Learning Goals</h2>
            <p className="text-gray-600 mb-4">Select what you'd like to learn or achieve:</p>
            
            <div className="space-y-4">
              {goals.map(goal => (
                <div 
                  key={goal.goal_id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedGoals.includes(goal.goal_id)
                      ? 'bg-btn-dark text-white border-btn-dark'
                      : 'bg-white hover:border-btn-dark'
                  }`}
                  onClick={() => toggleGoalSelection(goal.goal_id)}
                >
                  <div className="flex items-start">
                    <div className={`w-5 h-5 flex-shrink-0 border rounded mt-1 mr-3 ${
                      selectedGoals.includes(goal.goal_id)
                        ? 'bg-white border-white'
                        : 'border-gray-300'
                    }`}>
                      {selectedGoals.includes(goal.goal_id) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-btn-dark" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{goal.goal_title}</p>
                      <p className={`text-sm ${
                        selectedGoals.includes(goal.goal_id) ? 'text-gray-200' : 'text-gray-500'
                      }`}>
                        {goal.goal_description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedGoals.length === 0 && (
              <p className="text-gray-500 italic text-sm">Select at least one goal to continue</p>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-medium mb-4">Generate Your Learning Roadmap</h2>
            
            {!generatingRoadmap ? (
              <>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium mb-2">Profile Summary</h3>
                  <ul className="space-y-1 text-gray-600">
                    <li><span className="font-medium">Username:</span> {formik.values.username}</li>
                    <li><span className="font-medium">Career Stage:</span> {formik.values.careerStage}</li>
                    <li><span className="font-medium">Learning Time:</span> {formik.values.weeklyLearningHours} hours per week</li>
                    <li><span className="font-medium">Skills:</span> {selectedSkills.map(id => 
                      skills.find(s => s.skill_id === id)?.skill_name
                    ).filter(Boolean).join(', ')}</li>
                    <li><span className="font-medium">Goals:</span> {selectedGoals.map(id => 
                      goals.find(g => g.goal_id === id)?.goal_title
                    ).filter(Boolean).join(', ')}</li>
                  </ul>
                </div>
                
                <p className="text-gray-600">
                  Based on your profile, skills, and goals, we'll generate a personalized learning roadmap to help you achieve your objectives at your own pace.
                </p>
                
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={formik.handleSubmit}
                >
                  Generate My Learning Roadmap
                </Button>
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-btn-dark"></div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6 max-h-80 overflow-y-auto">
                  <div className="space-y-4">
                    {chatInteractions.map((message, index) => (
                      <div 
                        key={index} 
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                            message.role === 'user' 
                              ? 'bg-btn-dark text-white rounded-tr-none' 
                              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Progress calculation
  const progressPercentage = ((currentStep - 1) / totalSteps) * 100;

  if (!user) {
    return (
      <div className="min-h-screen bg-primary-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-btn-dark"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-light flex flex-col items-center">
      <Logo />
      <div className="bg-white rounded-lg shadow-md p-8 max-w-5xl w-full mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-medium text-text">Let's Get Started</h1>
            <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-btn-dark transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {/* Current step content */}
        {renderCurrentStep()}
        
        {/* Navigation buttons */}
        {currentStep <= totalSteps && !generatingRoadmap && (
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
            >
              Back
            </Button>
            
            <Button
              type="button"
              variant="primary"
              onClick={currentStep === totalSteps + 1 ? formik.handleSubmit : handleNextStep}
            >
              {currentStep === totalSteps ? 'Review & Generate' : 'Next'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;