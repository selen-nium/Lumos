import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Progress from '../ui/progress'
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
  GraduationCap,
  Play
} from 'lucide-react';

const RoadmapSection = ({ loading, roadmapProgress, modules }) => {
  // const [selectedModule, setSelectedModule] = useState(0);
  const [hoveredModule, setHoveredModule] = useState(null);

  const getDifficultyIndicator = (difficulty) => {
    const difficultyLevel = difficulty?.toLowerCase() || 'beginner';
    
    switch (difficultyLevel) {
      case 'advanced':
        return { icon: '🔴', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'intermediate':
        return { 
          icon: '🟡', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'beginner':
      default:
        return { icon: '🟢', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
  };

  if (loading) {
    return (
      <div className="overflow-y-auto h-full p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          <span className="ml-3 text-sm text-muted-foreground">Loading your roadmap...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full p-6">
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
            <div className="text-2xl font-bold text-lumos-primary">
              {roadmapProgress?.completedPercentage || 0}%
            </div>
            <p className="text-sm text-muted-foreground">completed</p>
          </div>
        </div>
        <Progress 
          value={roadmapProgress?.completedPercentage || 0} 
          variant="lumos"
          className="h-3 mb-4"
          size="lg"
        />
        {/* <Progress value={20} variant="lumos" size="lg" /> */}
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

      {/* Timeline */}
      <VerticalTimeline layout="1-column-left" lineColor="#e5e7eb" className="vertical-timeline">
        {modules.map((module, index) => {
          const isDone = module.isCompleted;
          const isHovered = hoveredModule === index;
          // const isSelected = selectedModule === index;
          const elementClasses = isDone ? "completed" : "";
          const IconComponent = isDone ? CheckCircle2 : Circle;
          const difficultyInfo = getDifficultyIndicator(module.difficulty);
          
          const iconStyle = {
            background: isDone ? 'hsl(var(--lumos-primary))' : '#fff',
            color: isDone ? '#000' : '#9ca3af',
            border: `2px solid ${isDone ? 'hsl(var(--lumos-primary))' : '#d1d5db'}`,
            boxShadow: isDone ? '0 0 0 3px hsla(var(--lumos-primary), 0.2)' : 'none'
          };

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
              // onTimelineElementClick={() => setSelectedModule(index)}
            >
              <Card
                className={`
                  overflow-visible rounded-xl transition-all duration-300 cursor-pointer border-2
                  ${isHovered 
                      ? 'shadow-lg shadow-blue-200' 
                      : 'shadow-sm hover:shadow-md border-gray-200'
                  }
                  ${isDone 
                    ? 'bg-gray-50/80 opacity-75' 
                    : 'bg-white hover:border-lumos-primary/30'
                  }
                  transform hover:scale-[1.01] hover:-translate-y-0.5
                `}
                onMouseEnter={() => setHoveredModule(index)}
                onMouseLeave={() => setHoveredModule(null)}
                // onClick={() => setSelectedModule(index)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge 
                          variant={isDone ? 'secondary' : 'outline'} 
                          className={`text-xs font-medium rounded-full px-3 py-1 ${
                            isDone 
                              ? 'bg-gray-200 text-gray-600 border-gray-300' 
                              : isHovered
                                ? 'border-lumos-primary/60 text-lumos-primary bg-lumos-primary/5'
                                : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          Module {module.sequence_order || index + 1}
                        </Badge>
                        
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-medium flex items-center gap-1.5 rounded-full px-3 py-1 ${difficultyInfo.bgColor} ${difficultyInfo.borderColor} ${difficultyInfo.color}`}
                        >
                          <span className="text-sm">{difficultyInfo.icon}</span>
                          <span className="capitalize font-medium">{module.difficulty || 'Beginner'}</span>
                        </Badge>
                      </div>
                      
                      <CardTitle className={`text-xl font-bold leading-tight mb-3 ${
                        isDone ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {module.module_name || module.name}
                      </CardTitle>
                      
                      <div className={`flex items-center gap-4 text-sm ${
                        isDone ? 'text-gray-500' : 'text-muted-foreground'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{module.estimated_hours || module.estimated_duration_weeks * 2 || 3} hours</span>
                        </div>
                        {/* <div className="flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4" />
                          <span className="capitalize font-medium">{module.difficulty || 'Beginner'}</span>
                        </div> */}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* description */}
                  {moduleDescription && (
                    <div className={`rounded-xl p-4 border transition-all duration-200 ${
                      isDone 
                        ? 'bg-gray-50/80 border-gray-200/80' 
                        : 'bg-lumos-primary/5 border-lumos-primary/20 hover:bg-lumos-primary/10 hover:border-lumos-primary/30'
                    }`}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`p-1 rounded-full ${isDone ? 'bg-gray-200' : 'bg-lumos-primary/10'}`}>
                          <Target className={`h-3.5 w-3.5 ${isDone ? 'text-gray-500' : 'text-lumos-primary'}`} />
                        </div>
                        <span className={`font-semibold text-sm ${isDone ? 'text-gray-600' : 'text-lumos-primary-dark'}`}>
                          Learning Goal:
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isDone ? 'text-gray-500' : 'text-slate-700'}`}>
                        {moduleDescription}
                      </p>
                    </div>
                  )}

                  {/* resources info */}
                  <div className={`flex items-center justify-between text-xs rounded-xl p-3 border transition-all duration-200 ${
                    isDone 
                      ? 'text-gray-500 bg-gray-50/60 border-gray-200/80' 
                      : 'text-muted-foreground bg-white border-gray-100 hover:bg-gray-50/50'
                  }`}>
                    <div className="flex items-center gap-4">
                      {module.resources?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-medium">{module.resources.length} resources</span>
                        </div>
                      )}
                      {module.tasks?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          <span className="font-medium">{module.tasks.length} hands-on tasks</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link to={`/module/${module.module_id}`}>
                    {isDone ? (
                      <Button 
                        variant="outline" 
                        className="w-full group transition-all duration-300 rounded-full border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 py-3"
                        size="lg"
                      >
                        <span className="font-semibold">Review Module</span>
                        <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                      </Button>
                    ) : (
                      <Button
                        className="
                          w-full group 
                          transition-all duration-300 
                          rounded-full border-2 border-black-500
                          hover:bg-blue-400
                          text-black font-semibold py-3 
                          shadow-lg hover:shadow-xl 
                          transform hover:scale-[1.02] 
                        "
                        size="lg"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Play className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                          <span>Start Module</span>
                          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                        </div>
                      </Button>

                    )}
                  </Link>
                </CardContent>
              </Card>
            </VerticalTimelineElement>
          );
        })}
      </VerticalTimeline>

      {/* empty state */}
      {(!modules || modules.length === 0) && (
        <Card className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-gray-100">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
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