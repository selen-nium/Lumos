import { useState, useEffect } from 'react';
import Progress from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  User, 
  Briefcase, 
  Zap, 
  Target, 
  Clock,
  Award,
  BookOpen,
  Sparkles,
  Rocket
} from 'lucide-react';

const Step5Review = ({ formik, skills, goals, selectedSkills, selectedGoals, generatingRoadmap }) => {
  const getSkillName = (id) => skills.find(s => s.skill_id === id)?.skill_name;
  const getGoalTitle = (id) => goals.find(g => g.goal_id === id)?.goal_title;
  const getSkillCategory = (id) => skills.find(s => s.skill_id === id)?.category;

  // Enhanced progress simulation
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');

  const progressMessages = [
    "Analyzing your skills and goals...",
    "Finding the best learning resources...",
    "Creating your personalized modules...",
    "Optimizing your learning path...",
    "Adding hands-on projects...",
    "Finalizing your roadmap..."
  ];

  useEffect(() => {
    let interval;
    if (generatingRoadmap) {
      setProgress(0);
      setCurrentMessage(progressMessages[0]);
      
      const totalTime = 40000; // 40 seconds
      const incrementTime = totalTime / 100;
      let current = 0;
      let messageIndex = 0;
      
      interval = setInterval(() => {
        current += 1;
        setProgress(current);
        
        // Update message based on progress
        const newMessageIndex = Math.floor((current / 100) * progressMessages.length);
        if (newMessageIndex !== messageIndex && newMessageIndex < progressMessages.length) {
          messageIndex = newMessageIndex;
          setCurrentMessage(progressMessages[messageIndex]);
        }
        
        if (current >= 99) {
          clearInterval(interval);
          setCurrentMessage("Almost ready...");
        }
      }, incrementTime);
    }
    return () => clearInterval(interval);
  }, [generatingRoadmap]);

  // Get skill category colors
  const getSkillCategoryColor = (category) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('frontend') || categoryLower.includes('ui')) return 'bg-blue-100 text-blue-800';
    if (categoryLower.includes('backend') || categoryLower.includes('server')) return 'bg-green-100 text-green-800';
    if (categoryLower.includes('database') || categoryLower.includes('data')) return 'bg-purple-100 text-purple-800';
    if (categoryLower.includes('devops') || categoryLower.includes('cloud')) return 'bg-orange-100 text-orange-800';
    if (categoryLower.includes('mobile')) return 'bg-pink-100 text-pink-800';
    return 'bg-gray-100 text-gray-800';
  };

  const isMentor = formik.values.userType === 'mentor' || formik.values.userType === 'both';
  const isMentee = formik.values.userType === 'mentee' || formik.values.userType === 'both';

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-lumos-primary to-lumos-primary-dark rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Review Your Information</h2>
        <p className="text-muted-foreground">
          {generatingRoadmap 
            ? "We're creating your personalized learning experience..."
            : "Everything looks good! Ready to start your journey?"
          }
        </p>
      </div>

      {/* Roadmap Generation Progress */}
      {generatingRoadmap && (
        <div className="bg-gradient-to-r from-lumos-primary-light to-blue-50 border border-lumos-primary/20 rounded-xl p-8 text-center animate-fade-in">
          <div className="space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-lumos-primary to-lumos-primary-dark rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-10 h-10 text-black" />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-lumos-primary-dark">Creating Your Learning Roadmap</h3>
              <Progress
                value={progress}
                max={100}
                variant="lumos"
                className="w-full shadow-lg"
                size="lg"
                showPercentage={true}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-lumos-primary-dark">{progress}% completed</span>
                <span className="text-sm text-lumos-primary">{currentMessage}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Summary */}
      {!generatingRoadmap && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-lumos-primary" />
              <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
            </div>
            
            <div className="space-y-3 p-4 bg-muted/30 rounded-xl">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Username:</span>
                <span className="font-medium">{formik.values.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Career Stage:</span>
                <span className="font-medium capitalize">{formik.values.careerStage.replace('-', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employment:</span>
                <span className="font-medium">{formik.values.isEmployed === 'yes' ? 'Employed' : 'Not employed'}</span>
              </div>
              {formik.values.isEmployed === 'yes' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company:</span>
                    <span className="font-medium">{formik.values.company}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-medium">{formik.values.role}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Type & Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-6 h-6 text-lumos-primary" />
              <h3 className="text-lg font-semibold text-foreground">Preferences</h3>
            </div>
            
            <div className="space-y-3 p-4 bg-muted/30 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">User Type:</span>
                <Badge className="bg-gradient-to-r from-lumos-primary to-lumos-primary-dark text-black">
                  {formik.values.userType === 'mentee' && <><BookOpen className="w-3 h-3 mr-1" />Mentee</>}
                  {formik.values.userType === 'mentor' && <><Award className="w-3 h-3 mr-1" />Mentor</>}
                  {formik.values.userType === 'both' && <><Sparkles className="w-3 h-3 mr-1" />Both</>}
                </Badge>
              </div>
              
              {isMentee && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Learning Hours:</span>
                    <span className="font-medium">{formik.values.weeklyLearningHours}h/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preferred Time:</span>
                    <span className="font-medium capitalize">{formik.values.preferredLearningTime}</span>
                  </div>
                </>
              )}
              
              {isMentor && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience:</span>
                    <span className="font-medium">{formik.values.yearsExperience} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Availability:</span>
                    <span className="font-medium">{formik.values.availabilityHours}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skills Summary */}
      {!generatingRoadmap && selectedSkills.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-lumos-primary" />
            <h3 className="text-lg font-semibold text-foreground">Your Skills ({selectedSkills.length})</h3>
          </div>
          
          <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-xl">
            {selectedSkills.map((skillId) => {
              const skillName = getSkillName(skillId);
              const skillCategory = getSkillCategory(skillId);
              return (
                <Badge 
                  key={skillId}
                  className={`${getSkillCategoryColor(skillCategory)} font-medium px-3 py-2`}
                >
                  {skillName}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Goals Summary */}
      {!generatingRoadmap && isMentee && selectedGoals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-lumos-primary" />
            <h3 className="text-lg font-semibold text-foreground">Learning Goals ({selectedGoals.length})</h3>
          </div>
          
          <div className="space-y-3">
            {selectedGoals.map((goalId) => {
              const goalTitle = getGoalTitle(goalId);
              return (
                <div key={goalId} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-lumos-primary to-lumos-primary-dark rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-black" />
                  </div>
                  <span className="font-medium">{goalTitle}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mentor Bio Summary */}
      {!generatingRoadmap && isMentor && formik.values.mentorBio && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-lumos-primary" />
            <h3 className="text-lg font-semibold text-foreground">Mentor Bio</h3>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
            <p className="text-green-800 leading-relaxed">{formik.values.mentorBio}</p>
          </div>
        </div>
      )}

      {/* Ready to proceed message */}
      {!generatingRoadmap && (
        <div className="text-center p-6 bg-gradient-to-r from-lumos-primary-light to-blue-50 border border-lumos-primary/20 rounded-xl">
          <Rocket className="w-12 h-12 text-lumos-primary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-lumos-primary-dark mb-2">Ready to Start Your Journey!</h3>
          <p className="text-lumos-primary">
            {formik.values.userType === 'mentor'
              ? 'Complete your setup to start mentoring others and make a positive impact.'
              : 'We\'ll create a personalized learning roadmap tailored to your skills and goals.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Step5Review;