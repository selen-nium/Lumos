import { Target, CheckCircle, Trophy, Star } from 'lucide-react';

const Step4Goals = ({ goals, selectedGoals, setSelectedGoals }) => {
  const toggleGoal = (id) => {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-lumos-primary to-lumos-primary-dark rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Learning Goals</h2>
        <p className="text-muted-foreground">What would you like to achieve? Select your learning objectives</p>
      </div>

      {/* Selected Goals Summary */}
      {selectedGoals.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">
              Selected Goals ({selectedGoals.length})
            </h3>
          </div>
          <p className="text-green-700">
            Perfect! You've chosen {selectedGoals.length} learning goal{selectedGoals.length !== 1 ? 's' : ''}. 
            We'll create a personalized roadmap to help you achieve them.
          </p>
        </div>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal, index) => {
          const isSelected = selectedGoals.includes(goal.goal_id);
          return (
            <div
              key={goal.goal_id}
              className={`p-6 rounded-xl cursor-pointer border-2 transition-all hover:scale-105 hover:shadow-lg group ${
                isSelected
                  ? 'bg-gradient-to-r from-lumos-primary to-lumos-primary-dark text-white border-lumos-primary shadow-lg'
                  : 'bg-white border-border hover:border-lumos-primary/50 hover:bg-lumos-primary-light/10'
              }`}
              onClick={() => toggleGoal(goal.goal_id)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-white/20' : 'bg-lumos-primary-light'
                }`}>
                  <Star className={`w-5 h-5 ${isSelected ? 'text-black' : 'text-lumos-primary'}`} />
                </div>
                {isSelected && (
                  <CheckCircle className="w-6 h-6 text-black" />
                )}
              </div>
              
              <h3 className={`font-bold text-lg mb-3 ${
                isSelected ? 'text-black' : 'text-foreground group-hover:text-lumos-primary'
              }`}>
                {goal.goal_title}
              </h3>
              
              <p className={`text-sm leading-relaxed ${
                isSelected ? 'text-black/90' : 'text-muted-foreground'
              }`}>
                {goal.goal_description}
              </p>

              {/* Selection indicator */}
              <div className={`mt-4 text-xs font-medium ${
                isSelected ? 'text-black/80' : 'text-lumos-primary opacity-0 group-hover:opacity-100'
              } transition-opacity`}>
                {isSelected ? '✓ Selected' : 'Click to select'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Help text */}
      {selectedGoals.length === 0 && (
        <div className="text-center p-6 bg-muted/30 rounded-xl">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Select one or more goals to help us create the perfect learning path for you
          </p>
        </div>
      )}
    </div>
  );
};

export default Step4Goals;