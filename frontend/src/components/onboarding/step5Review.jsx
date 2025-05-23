import { Button } from '@/components/ui/button';

const Step5Review = ({ formik, skills, goals, selectedSkills, selectedGoals, generatingRoadmap }) => {
  const getSkillName = (id) => skills.find(s => s.skill_id === id)?.skill_name;
  const getGoalTitle = (id) => goals.find(g => g.goal_id === id)?.goal_title;

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
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-t-2 border-b-2 border-btn-dark mx-auto mb-2" />
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
