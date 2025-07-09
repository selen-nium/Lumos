import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Progress from '../ui/progress';
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
  Play,
  Sparkles,
  Trophy,
  Rocket
} from 'lucide-react';
import Lottie from "react-lottie-player";
import confettiAnimation from "../../assets/animation/confetti.json";
import trophyAnimation from '../../assets/animation/trophy.json';
import { supabase } from '@/supabaseClient';

const RoadmapSection = ({ loading, roadmapProgress, modules, onRoadmapComplete }) => {
  const [hoveredModule, setHoveredModule] = useState(null);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [isCreatingAdvancedRoadmap, setIsCreatingAdvancedRoadmap] = useState(false);
  const [advancedProgress, setAdvancedProgress] = useState(0);
  const [currentProgressMessage, setCurrentProgressMessage] = useState('');

  const progressMessages = [
    "Analyzing your completed skills...",
    "Finding advanced learning resources...",
    "Creating challenging modules...",
    "Optimizing your advanced path...",
    "Adding complex projects...",
    "Finalizing your advanced roadmap..."
  ];

  //progress simulation
  useEffect(() => {
    let interval;
    if (isCreatingAdvancedRoadmap) {
      setAdvancedProgress(0);
      setCurrentProgressMessage(progressMessages[0]);
      
      const totalTime = 30000; // 30 seconds (shorter than onboarding)
      const incrementTime = totalTime / 100;
      let current = 0;
      let messageIndex = 0;
      
      interval = setInterval(() => {
        current += 1;
        setAdvancedProgress(current);
        
        // Update message based on progress
        const newMessageIndex = Math.floor((current / 100) * progressMessages.length);
        if (newMessageIndex !== messageIndex && newMessageIndex < progressMessages.length) {
          messageIndex = newMessageIndex;
          setCurrentProgressMessage(progressMessages[messageIndex]);
        }
        
        if (current >= 99) {
          clearInterval(interval);
          setCurrentProgressMessage("Almost ready...");
        }
      }, incrementTime);
    }
    return () => clearInterval(interval);
  }, [isCreatingAdvancedRoadmap]);

  // Check for roadmap completion
  const isRoadmapComplete = roadmapProgress?.completedPercentage === 100 && roadmapProgress?.totalModules > 0;

  // Show celebration when roadmap becomes complete
  useEffect(() => {
    if (isRoadmapComplete && !showCompletionCelebration) {
      // Small delay to let the progress update animate first
      setTimeout(() => {
        setShowCompletionCelebration(true);
      }, 500);
    }
  }, [isRoadmapComplete, showCompletionCelebration]);

  const handleCreateAdvancedRoadmap = async () => {
    try {
      setIsCreatingAdvancedRoadmap(true);
      
      // Get the current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      console.log('🔐 Using session token for advanced roadmap request');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/roadmap/generate-advanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create advanced roadmap`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Hide celebration modal
        setShowCompletionCelebration(false);
        
        // Trigger roadmap refresh
        if (onRoadmapComplete) {
          onRoadmapComplete();
        }
        
        // Show success notification
        console.log('✅ Advanced roadmap created:', data.roadmapInfo);
      } else {
        throw new Error(data.error || 'Failed to create advanced roadmap');
      }
    } catch (error) {
      console.error('❌ Error creating advanced roadmap:', error);
      alert(`Failed to create advanced roadmap: ${error.message}`);
    } finally {
      setIsCreatingAdvancedRoadmap(false);
    }
  };

  const getDifficultyIndicator = (difficulty) => {
    const difficultyLevel = difficulty?.toLowerCase() || 'beginner';
    
    switch (difficultyLevel) {
      case 'advanced':
        return { icon: <GraduationCap className='w-5 h-5' />, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'intermediate':
        return { 
          icon: <GraduationCap className='w-5 h-5' />, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'beginner':
      default:
        return { icon: <GraduationCap className='w-5 h-5' />, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
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
      {/* Completion Celebration */}
      {showCompletionCelebration && (
        <div className="fixed inset-0 z-50">
          {/* Confetti Animation */}
          <Lottie
            loop
            play
            animationData={confettiAnimation}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 50
            }}
          />

          {/* Celebration Modal */}
          <div className="absolute inset-0 flex items-center justify-center z-60 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg text-center card-minimal-hover animate-slide-up">
              
              {/* Show progress bar when creating advanced roadmap */}
              {isCreatingAdvancedRoadmap ? (
                <div className="mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <Rocket className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                    Creating Advanced Roadmap
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    Building upon your achievements to create the next level of challenges...
                  </p>
                  
                  <div className="space-y-4">
                    <Progress
                      value={advancedProgress}
                      max={100}
                      variant="lumos"
                      className="w-full"
                      size="lg"
                      showPercentage={true}
                    />
                    <p className="text-sm text-blue-600 font-medium">
                      {currentProgressMessage}
                    </p>
                  </div>
                </div>
              ) : (
                // Original celebration content
                <div className="mb-6">
                  <Lottie
                    loop
                    play
                    animationData={trophyAnimation}
                    style={{
                      width: '120px',
                      height: '120px',
                      margin: '0 auto',
                      pointerEvents: 'none'
                    }}
                  />
                  <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                    🎉 Incredible Achievement!
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                    You've successfully completed your entire learning roadmap:<br />
                    <strong className="text-foreground text-xl">{roadmapProgress?.title}</strong>
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground bg-gray-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{roadmapProgress?.totalModules} modules completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{roadmapProgress?.totalHours} hours invested</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleCreateAdvancedRoadmap}
                      disabled={isCreatingAdvancedRoadmap}
                      className="w-full py-3 text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    >
                      <Rocket className="h-5 w-5 mr-2" />
                      Create Advanced Roadmap
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCompletionCelebration(false)}
                      className="w-full py-3 rounded-full border-2 hover:bg-gray-50"
                      disabled={isCreatingAdvancedRoadmap}
                    >
                      Continue Exploring
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {roadmapProgress?.title || 'Your Learning Roadmap'}
              {isRoadmapComplete && (
                <div className="flex items-center gap-1">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                </div>
              )}
            </h1>
            <p className="text-muted-foreground mt-2">
              {roadmapProgress?.totalModules} modules • {roadmapProgress?.totalHours} estimated hours
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${isRoadmapComplete ? 'text-yellow-500' : 'text-lumos-primary'}`}>
              {roadmapProgress?.completedPercentage || 0}%
            </div>
            <p className="text-sm text-muted-foreground">
              {isRoadmapComplete ? 'Complete! 🎉' : 'completed'}
            </p>
          </div>
        </div>
        
        <Progress 
          value={roadmapProgress?.completedPercentage || 0} 
          variant={isRoadmapComplete ? "success" : "lumos"}
          className="h-3 mb-4"
          size="lg"
        />
        
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

      {/* Completion Banner */}
      {isRoadmapComplete && !showCompletionCelebration && (
        <Card className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-yellow-800 flex items-center gap-2">
                    🎉 Roadmap Complete!
                    <Sparkles className="h-5 w-5 text-yellow-600" />
                  </h3>
                  <p className="text-yellow-700 mt-1">
                    Amazing work! Ready to take your skills to the next level?
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleCreateAdvancedRoadmap}
                disabled={isCreatingAdvancedRoadmap}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                {isCreatingAdvancedRoadmap ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Create Advanced Roadmap
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <VerticalTimeline layout="1-column-left" lineColor="#e5e7eb" className="vertical-timeline">
        {modules.map((module, index) => {
          const isDone = module.isCompleted;
          const isHovered = hoveredModule === index;
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
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
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