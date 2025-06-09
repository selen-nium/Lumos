import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const Step5Review = ({ formik, skills, goals, selectedSkills, selectedGoals, generatingRoadmap }) => {
  const getSkillName = (id) => skills.find(s => s.skill_id === id)?.skill_name;
  const getGoalTitle = (id) => goals.find(g => g.goal_id === id)?.goal_title;

  // hardcoded progress bar
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval;
    if (generatingRoadmap) {
      setProgress(0);
      const stepTime = 25000 / 99;
      let current = 0;
      interval = setInterval(() => {
        current += 1;
        setProgress(current);
        if (current >= 99) {
          clearInterval(interval);
        }
      }, stepTime);
    }
    return () => clearInterval(interval);
  }, [generatingRoadmap]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Review Your Info</h2>

      <div className="card-minimal p-4 space-y-1">
        <p><strong>Username:</strong> {formik.values.username}</p>
        <p><strong>Career Stage:</strong> {formik.values.careerStage}</p>
        <p><strong>Learning Hours:</strong> {formik.values.weeklyLearningHours}</p>
        <p><strong>Skills:</strong> {selectedSkills.map(getSkillName).join(', ')}</p>
        <p><strong>Goals:</strong> {selectedGoals.map(getGoalTitle).join(', ')}</p>
      </div>

      {generatingRoadmap && (
        <div className="text-center space-y-2">
          <Progress
            value={progress}
            max={100}
            className="w-full h-3 bg-white rounded-full overflow-hidden"
          />
          <p className="text-sm font-medium text-black">{progress}% completed</p>
          <p className="text-muted-foreground">Generating your roadmap...</p>
        </div>
      )}

      {!generatingRoadmap && (
        <p className="text-muted-foreground">
          Click Finish to save your profile and generate a personalised learning roadmap.
        </p>
      )}
    </div>
  );
};

export default Step5Review;
