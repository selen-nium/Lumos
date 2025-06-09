import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import 'react-vertical-timeline-component/style.min.css';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import {
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  Target,
  ChevronRight,
  Code,
  GraduationCap
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
    <div className="md:w-1/2 overflow-y-auto h-full p-6">
      {/* Header */}
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
        <Progress value={roadmapProgress?.completedPercentage || 0} className="h-2 mb-4" />
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

      {/* Vertical Timeline with single-column layout */}
      <VerticalTimeline layout="1-column-left" lineColor="#e5e7eb" className="vertical-timeline">
        {modules.map((module, index) => {
          const isDone = module.isCompleted;
          const elementClasses = isDone ? "completed" : "";
          const IconComponent = isDone ? CheckCircle2 : Circle;
          
          // Styles for completed vs incomplete
          const iconStyle = {
            background: isDone ? '#000' : '#fff',
            color: isDone ? '#fff' : '#9ca3af',
            border: `2px solid ${isDone ? '#000' : '#d1d5db'}`
          };

          // Use module description as a single sentence
          const moduleDescription = module.module_description?.trim();

          return (
            <VerticalTimelineElement
              className={elementClasses}
              key={module.id || index}
              icon={<IconComponent className="w-5 h-5" />}
              iconStyle={iconStyle}
              iconClassName={isDone ? 'completed-icon' : undefined}
              contentStyle={{ background: 'transparent', boxShadow: 'none', padding: 0 }}
              contentArrowStyle={{ display: 'none' }}
              onTimelineElementClick={() => setSelectedModule(index)}
            >
              <Card
                className={`overflow-visible rounded-lg shadow-sm transition-all duration-200 hover:shadow-md
                  ${selectedModule === index ? 'shadow-md ring-2 ring-black ring-offset-2' : 'ring-0'}
                  ${isDone ? 'bg-slate-50/80' : 'bg-white'}`}
              >
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge 
                          variant={isDone ? 'default' : 'outline'} 
                          className="text-xs font-medium"
                        >
                          Module {module.sequence_order || index + 1}
                        </Badge>
                        {/* {isDone && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )} */}
                      </div>
                      
                      <CardTitle className="text-xl font-semibold leading-tight mb-2">
                        {module.module_name || module.name}
                      </CardTitle>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{module.estimated_hours || module.estimated_duration_weeks * 2 || 3} hours</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          <span className="capitalize">{module.difficulty || 'Beginner'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Module Description */}
                  {moduleDescription && (
                    <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-slate-600" />
                        <span className="font-medium text-sm text-slate-700">Aim:</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {moduleDescription}
                      </p>
                    </div>
                  )}

                  {/* Resources and Tasks info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-white rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center gap-4">
                      {module.resources?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>{module.resources.length} resources</span>
                        </div>
                      )}
                      {module.tasks?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          <span>{module.tasks.length} hands-on tasks</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link to={`/module/${module.module_id}`}>
                    <Button 
                      variant={isDone ? 'outline' : 'default'} 
                      className="w-full group transition-all duration-200" 
                      size="sm"
                    >
                      <span>{isDone ? 'Review Module' : 'Start Module'}</span>
                      <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </VerticalTimelineElement>
          );
        })}
      </VerticalTimeline>

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
  );
};

export default RoadmapSection;