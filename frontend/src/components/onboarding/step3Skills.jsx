import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@/components/ui/accordion';

const Step3Skills = ({ skills, selectedSkills, setSelectedSkills }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSkill = (id) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    const cat = skill.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Current Skills</h2>
      <Input
        placeholder="Search skills..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full"
      />

      <Accordion type="multiple" className="w-full">
        {Object.entries(groupedSkills).map(([category, skillList]) => {
          const filtered = skillList.filter((skill) =>
            skill.skill_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          if (filtered.length === 0) return null;

          return (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="text-lg font-medium text-foreground uppercase">
                {category}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {filtered.map((skill) => (
                    <div
                      key={skill.skill_id}
                      className={`p-3 rounded-lg cursor-pointer border transition hover-lift ${
                        selectedSkills.includes(skill.skill_id)
                          ? 'bg-btn-dark text-white'
                          : 'bg-card'
                      }`}
                      onClick={() => toggleSkill(skill.skill_id)}
                    >
                      <p className="font-medium">{skill.skill_name}</p>
                      <p className="text-sm capitalize text-muted-foreground">
                        {skill.category}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default Step3Skills;
