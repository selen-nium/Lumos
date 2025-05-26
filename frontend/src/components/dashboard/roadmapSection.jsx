// RoadmapSection.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  BookOpen, 
  Target,
  ChevronRight,
  Code
} from 'lucide-react';

const RoadmapSection = ({ loading, roadmapProgress, modules }) => {
  const [selectedModule, setSelectedModule] = useState(0);

  if (loading) {
    return (
      <div className="md:w-1/2 overflow-y-auto h-full p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          <span className="ml-3 text-sm text-muted-foreground">Loading your roadmap...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="md:w-1/2 overflow-y-auto h-full relative">
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {roadmapProgress?.title || 'Your Learning Roadmap'}
              </h1>
              <p className="text-muted-foreground mt-2">
                {roadmapProgress?.totalModules} modules • {roadmapProgress?.totalHours} estimated hours
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {roadmapProgress?.completedPercentage || 0}%
              </div>
              <p className="text-sm text-muted-foreground">completed</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <Progress 
            value={roadmapProgress?.completedPercentage || 0} 
            className="h-2 mb-4"
          />
          
          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>{roadmapProgress?.completedModules || 0} of {roadmapProgress?.totalModules || 0} modules</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{roadmapProgress?.totalHours || 0} hours total</span>
            </div>
          </div>
        </div>

        {/* Modules Section */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden md:block" />
          
          <div className="space-y-6">
            {modules.map((module, index) => (
              <div 
                key={module.id || index}
                className={`relative transition-all duration-200 ${
                  selectedModule === index ? 'scale-[1.02]' : ''
                }`}
                onClick={() => setSelectedModule(index)}
              >
                {/* Timeline Dot */}
                <div className="absolute left-6 top-6 hidden md:flex items-center justify-center w-4 h-4 rounded-full border-2 bg-background z-10">
                  {module.isCompleted ? (
                    <div className="w-2 h-2 rounded-full bg-foreground" />
                  ) : (
                    <div className="w-2 h-2 rounded-full border border-muted-foreground" />
                  )}
                </div>

                {/* Module Card */}
                <Card className={`ml-0 md:ml-16 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedModule === index ? 'ring-2 ring-foreground ring-offset-2' : ''
                } ${module.isCompleted ? 'bg-muted/30' : 'bg-background'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant={module.isCompleted ? "default" : "outline"} className="text-xs">
                            Module {module.sequence_order || index + 1}
                          </Badge>
                          {module.isCompleted && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight">
                          {module.module_name || module.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {module.estimated_hours || module.estimated_duration_weeks * 2 || 3} hours • 
                          {module.difficulty || 'Beginner'}
                        </CardDescription>
                      </div>
                      <div className="ml-4">
                        {module.isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Module Description/Objectives */}
                    {module.module_description && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-2">What you'll learn:</p>
                        <ul className="text-sm space-y-1">
                          {module.module_description.split('|').map((objective, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                              <span>{objective.trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Resources Count */}
                    {module.resources && module.resources.length > 0 && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{module.resources.length} resources</span>
                        </div>
                      </div>
                    )}
                    {/* Tasks Count */}
                    {module.tasks && module.tasks.length > 0 && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Code className="h-3 w-3" />
                          <span>{module.tasks.length} hands-on tasks</span>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Link to={`/module/${module.module_id}`}>
                      <Button 
                        variant={module.isCompleted ? "outline" : "default"}
                        className="w-full group"
                        size="sm"
                      >
                        <span>{module.isCompleted ? 'Review Module' : 'Start Module'}</span>
                        <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {(!modules || modules.length === 0) && (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No modules found</h3>
                  <p className="text-muted-foreground">
                    Your learning roadmap will appear here once it's generated.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapSection;