import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@/components/ui/accordion';
import { Search, Zap, X, CheckCircle, Target } from 'lucide-react';

const Step3Skills = ({ skills, selectedSkills, setSelectedSkills }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSkill = (id) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const removeSkill = (id) => {
    setSelectedSkills((prev) => prev.filter((sid) => sid !== id));
  };

  const clearAllSkills = () => {
    setSelectedSkills([]);
  };

  // Get skill category colors based on category name
  const getSkillCategoryColor = (category) => {
    if (!category) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('frontend') || categoryLower.includes('front-end') || 
        categoryLower.includes('ui') || categoryLower.includes('ux')) {
      return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    }
    if (categoryLower.includes('backend') || categoryLower.includes('back-end') || 
        categoryLower.includes('server') || categoryLower.includes('api')) {
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    }
    if (categoryLower.includes('database') || categoryLower.includes('db') || 
        categoryLower.includes('sql') || categoryLower.includes('data')) {
      return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
    }
    if (categoryLower.includes('devops') || categoryLower.includes('infrastructure') || 
        categoryLower.includes('cloud') || categoryLower.includes('deployment')) {
      return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
    }
    if (categoryLower.includes('mobile') || categoryLower.includes('ios') || 
        categoryLower.includes('android') || categoryLower.includes('react native')) {
      return 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200';
    }
    if (categoryLower.includes('machine learning') || categoryLower.includes('ml') || 
        categoryLower.includes('ai') || categoryLower.includes('data science')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200';
    }
    if (categoryLower.includes('testing') || categoryLower.includes('qa') || 
        categoryLower.includes('quality')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
    }
    if (categoryLower.includes('design') || categoryLower.includes('graphics') || 
        categoryLower.includes('visual')) {
      return 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200';
    }
    
    return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    const cat = skill.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const getSelectedSkillsData = () => {
    return selectedSkills.map(id => skills.find(skill => skill.skill_id === id)).filter(Boolean);
  };

  const filteredGroupedSkills = Object.entries(groupedSkills).reduce((acc, [category, skillList]) => {
    const filtered = skillList.filter((skill) =>
      skill.skill_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-lumos-primary to-lumos-primary-dark rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Your Current Skills</h2>
        <p className="text-muted-foreground">Select the technologies and skills you're comfortable with</p>
      </div>

      {/* Selected Skills Section - Fixed at top */}
      {selectedSkills.length > 0 && (
        <div className="sticky top-4 z-10 bg-white/95 backdrop-blur-sm border border-lumos-primary/20 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-foreground">
                Selected Skills ({selectedSkills.length})
              </h3>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAllSkills}
              className="btn-outline-rounded text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {getSelectedSkillsData().map((skill) => (
              <Badge 
                key={skill.skill_id}
                className={`${getSkillCategoryColor(skill.category)} font-medium px-3 py-2 flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform`}
                onClick={() => removeSkill(skill.skill_id)}
              >
                {skill.skill_name}
                <X className="w-3 h-3 hover:text-red-600" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search for skills (e.g., React, Python, AWS)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-base focus:border-lumos-primary focus:ring-lumos-primary/20"
        />
      </div>

      {/* Skills by Category */}
      <div className="space-y-4">
        {Object.keys(filteredGroupedSkills).length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-3" defaultValue={Object.keys(filteredGroupedSkills)}>
            {Object.entries(filteredGroupedSkills).map(([category, skillList]) => (
              <AccordionItem key={category} value={category} className="border border-border rounded-xl">
                <AccordionTrigger className="text-lg font-semibold text-foreground px-6 py-4 hover:no-underline hover:bg-muted/50 rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getSkillCategoryColor(category).split(' ')[0]}`}></div>
                    <span className="uppercase tracking-wide">{category}</span>
                    <Badge variant="outline" className="ml-auto">
                      {skillList.length} skills
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {skillList.map((skill) => {
                      const isSelected = selectedSkills.includes(skill.skill_id);
                      return (
                        <div
                          key={skill.skill_id}
                          className={`p-4 rounded-lg cursor-pointer border-2 transition-all hover:scale-105 ${
                            isSelected
                              ? 'bg-gradient-to-r from-lumos-primary to-lumos-primary-dark text-white border-lumos-primary shadow-lg'
                              : 'bg-white border-border hover:border-lumos-primary/50 hover:bg-lumos-primary-light/10'
                          }`}
                          onClick={() => toggleSkill(skill.skill_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm text-black">{skill.skill_name}</p>
                              {/* <p className={`text-xs capitalize mt-1 ${
                                isSelected ? 'text-black/80' : 'text-muted-foreground'
                              }`}>
                                {skill.category}
                              </p> */}
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-black" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No skills found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? `No skills match "${searchTerm}". Try a different search term.` : 'No skills available.'}
            </p>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {selectedSkills.length > 0 && (
        <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <p className="text-green-700 font-medium">
            Great! You've selected {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''}. 
            {selectedSkills.length >= 3 ? ' You can proceed to the next step.' : ' Select a few more to get better recommendations.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Step3Skills;