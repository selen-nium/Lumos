const Step4Goals = ({ goals, selectedGoals, setSelectedGoals }) => {
  const toggleGoal = (id) => {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Learning Goals</h2>
      <p className="text-muted-foreground">Select your learning objectives:</p>
      <div className="space-y-4">
        {goals.map(goal => (
          <div
            key={goal.goal_id}
            className={`p-4 rounded-lg cursor-pointer border transition hover-lift ${selectedGoals.includes(goal.goal_id) ? 'bg-btn-dark text-white' : 'bg-card'}`}
            onClick={() => toggleGoal(goal.goal_id)}
          >
            <p className="font-medium">{goal.goal_title}</p>
            <p className="text-sm text-muted-foreground">{goal.goal_description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Step4Goals;