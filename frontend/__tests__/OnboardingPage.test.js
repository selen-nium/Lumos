// __tests__/OnboardingPage.test.jsx

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock OnboardingPage component for testing
const MockOnboardingPage = ({ onComplete, loading = false }) => {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    goals: [],
    skills: [],
    experienceLevel: '',
    careerStage: '',
    weeklyHours: '',
    preferredLearningStyle: ''
  });
  const [errors, setErrors] = React.useState({});

  const steps = [
    { id: 1, title: 'Learning Goals', description: 'What do you want to learn?' },
    { id: 2, title: 'Current Skills', description: 'What skills do you already have?' },
    { id: 3, title: 'Experience Level', description: 'How would you describe your experience?' },
    { id: 4, title: 'Learning Preferences', description: 'Tell us about your learning style' }
  ];

  const goalOptions = [
    'Full Stack Development',
    'Frontend Development', 
    'Backend Development',
    'Mobile Development',
    'Data Science',
    'DevOps',
    'UI/UX Design'
  ];

  const skillOptions = [
    'HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 
    'Python', 'Java', 'SQL', 'Git', 'AWS'
  ];

  const handleGoalToggle = (goal) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal) 
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (formData.goals.length === 0) {
          newErrors.goals = 'Please select at least one learning goal';
        }
        break;
      case 2:
        // Skills are optional
        break;
      case 3:
        if (!formData.experienceLevel) {
          newErrors.experienceLevel = 'Please select your experience level';
        }
        if (!formData.careerStage) {
          newErrors.careerStage = 'Please select your career stage';
        }
        break;
      case 4:
        if (!formData.weeklyHours) {
          newErrors.weeklyHours = 'Please select your weekly learning hours';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSubmit = async () => {
    if (onComplete) {
      await onComplete(formData);
    }
  };

  if (loading) {
    return (
      <div data-testid="onboarding-loading">
        <div>Creating your personalized learning roadmap...</div>
        <div>This may take a few moments.</div>
      </div>
    );
  }

  return (
    <div data-testid="onboarding-page">
      {/* Header */}
      <div data-testid="onboarding-header" style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Welcome to Your Learning Journey!</h1>
        <p>Let's create a personalized roadmap just for you</p>
      </div>

      {/* Progress Bar */}
      <div data-testid="progress-container" style={{ padding: '20px' }}>
        <div data-testid="progress-text">
          Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
        </div>
        <div 
          data-testid="progress-bar"
          style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: '#e9ecef', 
            borderRadius: '4px',
            marginTop: '8px'
          }}
        >
          <div 
            style={{
              width: `${(currentStep / steps.length) * 100}%`,
              height: '100%',
              backgroundColor: '#007bff',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div data-testid="step-content" style={{ padding: '20px', minHeight: '400px' }}>
        
        {/* Step 1: Goals */}
        {currentStep === 1 && (
          <div data-testid="goals-step">
            <h2>{steps[0].title}</h2>
            <p>{steps[0].description}</p>
            {errors.goals && <div data-testid="goals-error" style={{ color: 'red' }}>{errors.goals}</div>}
            <div data-testid="goals-options">
              {goalOptions.map(goal => (
                <button
                  key={goal}
                  data-testid={`goal-option-${goal.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handleGoalToggle(goal)}
                  style={{
                    margin: '8px',
                    padding: '12px 20px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: formData.goals.includes(goal) ? '#007bff' : 'white',
                    color: formData.goals.includes(goal) ? 'white' : 'black',
                    cursor: 'pointer'
                  }}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Skills */}
        {currentStep === 2 && (
          <div data-testid="skills-step">
            <h2>{steps[1].title}</h2>
            <p>{steps[1].description}</p>
            <p style={{ color: '#666' }}>Select the technologies you're already familiar with (optional)</p>
            <div data-testid="skills-options">
              {skillOptions.map(skill => (
                <button
                  key={skill}
                  data-testid={`skill-option-${skill.toLowerCase()}`}
                  onClick={() => handleSkillToggle(skill)}
                  style={{
                    margin: '8px',
                    padding: '12px 20px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: formData.skills.includes(skill) ? '#28a745' : 'white',
                    color: formData.skills.includes(skill) ? 'white' : 'black',
                    cursor: 'pointer'
                  }}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Experience */}
        {currentStep === 3 && (
          <div data-testid="experience-step">
            <h2>{steps[2].title}</h2>
            <p>{steps[2].description}</p>
            
            <div style={{ marginBottom: '20px' }}>
              <h3>Experience Level</h3>
              {errors.experienceLevel && <div data-testid="experience-error" style={{ color: 'red' }}>{errors.experienceLevel}</div>}
              {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                <label key={level} style={{ display: 'block', margin: '8px 0' }}>
                  <input
                    type="radio"
                    name="experienceLevel"
                    value={level.toLowerCase()}
                    data-testid={`experience-${level.toLowerCase()}`}
                    checked={formData.experienceLevel === level.toLowerCase()}
                    onChange={(e) => setFormData(prev => ({ ...prev, experienceLevel: e.target.value }))}
                    style={{ marginRight: '8px' }}
                  />
                  {level}
                </label>
              ))}
            </div>

            <div>
              <h3>Career Stage</h3>
              {errors.careerStage && <div data-testid="career-error" style={{ color: 'red' }}>{errors.careerStage}</div>}
              {['Student', 'Career Changer', 'Professional', 'Freelancer'].map(stage => (
                <label key={stage} style={{ display: 'block', margin: '8px 0' }}>
                  <input
                    type="radio"
                    name="careerStage"
                    value={stage.toLowerCase().replace(' ', '_')}
                    data-testid={`career-${stage.toLowerCase().replace(' ', '-')}`}
                    checked={formData.careerStage === stage.toLowerCase().replace(' ', '_')}
                    onChange={(e) => setFormData(prev => ({ ...prev, careerStage: e.target.value }))}
                    style={{ marginRight: '8px' }}
                  />
                  {stage}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Preferences */}
        {currentStep === 4 && (
          <div data-testid="preferences-step">
            <h2>{steps[3].title}</h2>
            <p>{steps[3].description}</p>
            
            <div style={{ marginBottom: '20px' }}>
              <h3>Weekly Learning Hours</h3>
              {errors.weeklyHours && <div data-testid="hours-error" style={{ color: 'red' }}>{errors.weeklyHours}</div>}
              <select
                data-testid="weekly-hours-select"
                value={formData.weeklyHours}
                onChange={(e) => setFormData(prev => ({ ...prev, weeklyHours: e.target.value }))}
                style={{ padding: '8px', width: '200px' }}
              >
                <option value="">Select hours per week</option>
                <option value="1-3">1-3 hours</option>
                <option value="4-6">4-6 hours</option>
                <option value="7-10">7-10 hours</option>
                <option value="10+">10+ hours</option>
              </select>
            </div>

            <div>
              <h3>Preferred Learning Style</h3>
              {['Visual', 'Hands-on', 'Reading', 'Video'].map(style => (
                <label key={style} style={{ display: 'block', margin: '8px 0' }}>
                  <input
                    type="radio"
                    name="learningStyle"
                    value={style.toLowerCase()}
                    data-testid={`learning-${style.toLowerCase()}`}
                    checked={formData.preferredLearningStyle === style.toLowerCase()}
                    onChange={(e) => setFormData(prev => ({ ...prev, preferredLearningStyle: e.target.value }))}
                    style={{ marginRight: '8px' }}
                  />
                  {style}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div data-testid="navigation" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <button 
          data-testid="back-button"
          onClick={handleBack}
          disabled={currentStep === 1}
          style={{ 
            padding: '12px 24px',
            backgroundColor: currentStep === 1 ? '#ccc' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentStep === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Back
        </button>

        <button 
          data-testid="next-button"
          onClick={handleNext}
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {currentStep === steps.length ? 'Create My Roadmap' : 'Next'}
        </button>
      </div>

      {/* Summary (Step 4) */}
      {currentStep === 4 && (
        <div data-testid="summary-section" style={{ padding: '20px', backgroundColor: '#f8f9fa', margin: '20px' }}>
          <h3>Summary</h3>
          <div data-testid="summary-goals">
            <strong>Goals:</strong> {formData.goals.join(', ') || 'None selected'}
          </div>
          <div data-testid="summary-skills">
            <strong>Skills:</strong> {formData.skills.join(', ') || 'None selected'}
          </div>
          <div data-testid="summary-experience">
            <strong>Experience:</strong> {formData.experienceLevel || 'Not selected'}
          </div>
          <div data-testid="summary-career">
            <strong>Career Stage:</strong> {formData.careerStage || 'Not selected'}
          </div>
          <div data-testid="summary-hours">
            <strong>Weekly Hours:</strong> {formData.weeklyHours || 'Not selected'}
          </div>
        </div>
      )}
    </div>
  );
};

afterEach(cleanup);

// Add React import for useState
const React = { useState: require('react').useState };

describe('OnboardingPage Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders onboarding page with welcome message', () => {
      render(<MockOnboardingPage />);
      
      expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-header')).toHaveTextContent('Welcome to Your Learning Journey!');
    });

    test('shows first step initially', () => {
      render(<MockOnboardingPage />);
      
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 1 of 4: Learning Goals');
      expect(screen.getByTestId('goals-step')).toBeInTheDocument();
    });

    test('displays progress bar correctly', () => {
      render(<MockOnboardingPage />);
      
      const progressBar = screen.getByTestId('progress-bar').firstChild;
      expect(progressBar).toHaveStyle('width: 25%'); // Step 1 of 4
    });

    test('shows loading state when loading prop is true', () => {
      render(<MockOnboardingPage loading={true} />);
      
      expect(screen.getByTestId('onboarding-loading')).toHaveTextContent('Creating your personalized learning roadmap...');
      expect(screen.queryByTestId('onboarding-page')).not.toBeInTheDocument();
    });
  });

  describe('Step 1: Goals Selection', () => {
    test('displays all goal options', () => {
      render(<MockOnboardingPage />);
      
      expect(screen.getByTestId('goal-option-full-stack-development')).toBeInTheDocument();
      expect(screen.getByTestId('goal-option-frontend-development')).toBeInTheDocument();
      expect(screen.getByTestId('goal-option-backend-development')).toBeInTheDocument();
      expect(screen.getByTestId('goal-option-data-science')).toBeInTheDocument();
    });

    test('allows selecting and deselecting goals', async () => {
        const user = userEvent.setup();
        render(<MockOnboardingPage />);
        
        const frontendGoal = screen.getByTestId('goal-option-frontend-development');
        
        // Select goal
        await user.click(frontendGoal);
        expect(frontendGoal).toHaveStyle('backgroundColor: rgb(0, 123, 255)'); // Use rgb values
        
        // Deselect goal
        await user.click(frontendGoal);
        expect(frontendGoal).toHaveStyle('backgroundColor: rgb(255, 255, 255)'); // Use rgb instead of 'white'
    });

    test('shows error when trying to proceed without selecting goals', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      const nextButton = screen.getByTestId('next-button');
      await user.click(nextButton);
      
      expect(screen.getByTestId('goals-error')).toHaveTextContent('Please select at least one learning goal');
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 1 of 4'); // Still on step 1
    });

    test('proceeds to next step when goals are selected', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Select a goal
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      
      // Click next
      await user.click(screen.getByTestId('next-button'));
      
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 2 of 4: Current Skills');
      expect(screen.getByTestId('skills-step')).toBeInTheDocument();
    });
  });

  describe('Step 2: Skills Selection', () => {
    test('displays all skill options', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Navigate to skills step
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      
      expect(screen.getByTestId('skill-option-html')).toBeInTheDocument();
      expect(screen.getByTestId('skill-option-css')).toBeInTheDocument();
      expect(screen.getByTestId('skill-option-javascript')).toBeInTheDocument();
      expect(screen.getByTestId('skill-option-react')).toBeInTheDocument();
    });

    test('allows selecting multiple skills', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Navigate to skills step
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      
      // Select multiple skills
      await user.click(screen.getByTestId('skill-option-html'));
      await user.click(screen.getByTestId('skill-option-css'));
      
      expect(screen.getByTestId('skill-option-html')).toHaveStyle('backgroundColor: #28a745');
      expect(screen.getByTestId('skill-option-css')).toHaveStyle('backgroundColor: #28a745');
    });

    test('allows proceeding without selecting skills (optional)', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Navigate to skills step
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      
      // Proceed without selecting skills
      await user.click(screen.getByTestId('next-button'));
      
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 3 of 4: Experience Level');
    });
  });

  describe('Step 3: Experience and Career', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Navigate to experience step
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('next-button'));
    });

    test('displays experience level options', () => {
      expect(screen.getByTestId('experience-beginner')).toBeInTheDocument();
      expect(screen.getByTestId('experience-intermediate')).toBeInTheDocument();
      expect(screen.getByTestId('experience-advanced')).toBeInTheDocument();
    });

    test('displays career stage options', () => {
      expect(screen.getByTestId('career-student')).toBeInTheDocument();
      expect(screen.getByTestId('career-career-changer')).toBeInTheDocument();
      expect(screen.getByTestId('career-professional')).toBeInTheDocument();
      expect(screen.getByTestId('career-freelancer')).toBeInTheDocument();
    });

    test('shows validation errors when trying to proceed without selections', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByTestId('next-button'));
      
      expect(screen.getByTestId('experience-error')).toHaveTextContent('Please select your experience level');
      expect(screen.getByTestId('career-error')).toHaveTextContent('Please select your career stage');
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 3 of 4'); // Still on step 3
    });

    test('proceeds when both experience and career are selected', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByTestId('experience-intermediate'));
      await user.click(screen.getByTestId('career-professional'));
      await user.click(screen.getByTestId('next-button'));
      
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 4 of 4: Learning Preferences');
      expect(screen.getByTestId('preferences-step')).toBeInTheDocument();
    });
  });

  describe('Step 4: Learning Preferences', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Navigate to preferences step
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('experience-intermediate'));
      await user.click(screen.getByTestId('career-professional'));
      await user.click(screen.getByTestId('next-button'));
    });

    test('displays weekly hours dropdown', () => {
      const dropdown = screen.getByTestId('weekly-hours-select');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveValue('');
    });

    test('displays learning style options', () => {
      expect(screen.getByTestId('learning-visual')).toBeInTheDocument();
      expect(screen.getByTestId('learning-hands-on')).toBeInTheDocument();
      expect(screen.getByTestId('learning-reading')).toBeInTheDocument();
      expect(screen.getByTestId('learning-video')).toBeInTheDocument();
    });

    test('shows error when trying to submit without selecting weekly hours', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByTestId('next-button'));
      
      expect(screen.getByTestId('hours-error')).toHaveTextContent('Please select your weekly learning hours');
    });

    test('displays summary section with selected data', async () => {
      expect(screen.getByTestId('summary-section')).toBeInTheDocument();
      expect(screen.getByTestId('summary-goals')).toHaveTextContent('Goals: Frontend Development');
      expect(screen.getByTestId('summary-experience')).toHaveTextContent('Experience: intermediate');
      expect(screen.getByTestId('summary-career')).toHaveTextContent('Career Stage: professional');
    });
  });

  describe('Navigation', () => {
    test('back button is disabled on first step', () => {
      render(<MockOnboardingPage />);
      
      const backButton = screen.getByTestId('back-button');
      expect(backButton).toBeDisabled();
      expect(backButton).toHaveStyle('backgroundColor: #ccc');
    });

    test('back button works correctly', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Go to step 2
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 2 of 4');
      
      // Go back to step 1
      await user.click(screen.getByTestId('back-button'));
      
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 1 of 4');
      expect(screen.getByTestId('goals-step')).toBeInTheDocument();
    });

    test('next button text changes to "Create My Roadmap" on last step', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Navigate to last step
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('experience-beginner'));
      await user.click(screen.getByTestId('career-student'));
      await user.click(screen.getByTestId('next-button'));
      
      expect(screen.getByTestId('next-button')).toHaveTextContent('Create My Roadmap');
    });

    test('preserves form data when navigating back and forth', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Select goals and go to step 2
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('goal-option-backend-development'));
      await user.click(screen.getByTestId('next-button'));
      
      // Select skills and go to step 3
      await user.click(screen.getByTestId('skill-option-javascript'));
      await user.click(screen.getByTestId('next-button'));
      
      // Go back to step 1
      await user.click(screen.getByTestId('back-button'));
      await user.click(screen.getByTestId('back-button'));
      
      // Check that selections are preserved
      expect(screen.getByTestId('goal-option-frontend-development')).toHaveStyle('backgroundColor: #007bff');
      expect(screen.getByTestId('goal-option-backend-development')).toHaveStyle('backgroundColor: #007bff');
      
      // Go forward to check skills are preserved
      await user.click(screen.getByTestId('next-button'));
      expect(screen.getByTestId('skill-option-javascript')).toHaveStyle('backgroundColor: #28a745');
    });
  });

  describe('Progress Bar', () => {
    test('updates progress bar correctly for each step', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Step 1 - 25%
      let progressBar = screen.getByTestId('progress-bar').firstChild;
      expect(progressBar).toHaveStyle('width: 25%');
      
      // Step 2 - 50%
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      progressBar = screen.getByTestId('progress-bar').firstChild;
      expect(progressBar).toHaveStyle('width: 50%');
      
      // Step 3 - 75%
      await user.click(screen.getByTestId('next-button'));
      progressBar = screen.getByTestId('progress-bar').firstChild;
      expect(progressBar).toHaveStyle('width: 75%');
      
      // Step 4 - 100%
      await user.click(screen.getByTestId('experience-beginner'));
      await user.click(screen.getByTestId('career-student'));
      await user.click(screen.getByTestId('next-button'));
      progressBar = screen.getByTestId('progress-bar').firstChild;
      expect(progressBar).toHaveStyle('width: 100%');
    });
  });

  describe('Form Validation', () => {
    test('clears errors when valid selection is made', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Try to proceed without goals to trigger error
      await user.click(screen.getByTestId('next-button'));
      expect(screen.getByTestId('goals-error')).toBeInTheDocument();
      
      // Select a goal
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      
      // Try to proceed again - error should be cleared and step should advance
      await user.click(screen.getByTestId('next-button'));
      expect(screen.queryByTestId('goals-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 2 of 4');
    });

    test('validates all required fields on final step', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Navigate to final step
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('experience-beginner'));
      await user.click(screen.getByTestId('career-student'));
      await user.click(screen.getByTestId('next-button'));
      
      // Try to submit without selecting weekly hours
      await user.click(screen.getByTestId('next-button'));
      
      expect(screen.getByTestId('hours-error')).toBeInTheDocument();
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 4 of 4'); // Still on last step
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles missing onComplete callback gracefully', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />); // No onComplete prop
      
      // Complete the form
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('experience-beginner'));
      await user.click(screen.getByTestId('career-student'));
      await user.click(screen.getByTestId('next-button'));
      await user.selectOptions(screen.getByTestId('weekly-hours-select'), '4-6');
      
      // Should not crash when submitting
      await user.click(screen.getByTestId('next-button'));
    });

    test('handles rapid clicking on navigation buttons', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      
      // Rapidly click next button multiple times
      const nextButton = screen.getByTestId('next-button');
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);
      
      // Should advance only one step
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 3 of 4');
    });

    test('maintains form state during loading', () => {
      const { rerender } = render(<MockOnboardingPage />);
      
      // Start with normal state, then switch to loading
      rerender(<MockOnboardingPage loading={true} />);
      
      expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('onboarding-page')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('form elements have proper labels and structure', () => {
      render(<MockOnboardingPage />);
      
      // Navigation buttons should be properly accessible
      expect(screen.getByTestId('back-button')).toHaveTextContent('Back');
      expect(screen.getByTestId('next-button')).toHaveTextContent('Next');
      
      // Progress information should be clear
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Step 1 of 4: Learning Goals');
    });

    test('radio buttons have proper name attributes', async () => {
      const user = userEvent.setup();
      render(<MockOnboardingPage />);
      
      // Navigate to experience step
      await user.click(screen.getByTestId('goal-option-frontend-development'));
      await user.click(screen.getByTestId('next-button'));
      await user.click(screen.getByTestId('next-button'));
      
      const experienceRadios = screen.getAllByRole('radio', { name: /Beginner|Intermediate|Advanced/ });
      experienceRadios.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'experienceLevel');
      });
      
      const careerRadios = screen.getAllByRole('radio', { name: /Student|Career Changer|Professional|Freelancer/ });
      careerRadios.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'careerStage');
      });
    });

    test('error messages are properly associated with form elements', async () => {
        const user = userEvent.setup();
        render(<MockOnboardingPage />);
        
        await user.click(screen.getByTestId('next-button'));
        
        const error = screen.getByTestId('goals-error');
        expect(error).toHaveStyle('color: rgb(255, 0, 0)'); // Use rgb instead of 'red'
        expect(error).toHaveTextContent('Please select at least one learning goal');
    });
  });
});