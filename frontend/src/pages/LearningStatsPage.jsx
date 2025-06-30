import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import Layout from '@/components/common/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Award, 
  Star, 
  Zap, 
  Target, 
  Calendar, 
  Clock, 
  BookOpen,
  TrendingUp,
  Flame,
  Users,
  CheckCircle2
} from 'lucide-react';

const AnimatedCounter = React.memo(({ value, duration = 1000, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startValue = 0;
    const increment = value / (duration / 16); // 60fps
    
    const timer = setInterval(() => {
      startValue += increment;
      if (startValue >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(startValue));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-lumos-primary to-lumos-primary-dark bg-clip-text text-black">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
});

const StatCard = React.memo(({ icon: Icon, label, value, subtitle, gradient, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Card className={`card-minimal-hover overflow-hidden group transition-all duration-500 ${
      isVisible ? 'animate-slide-up opacity-100' : 'opacity-0 translate-y-4'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-muted-foreground text-sm font-medium mb-1">{label}</p>
            {typeof value === 'number' && isVisible ? (
              <AnimatedCounter value={value} duration={800} />
            ) : (
              <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-lumos-primary to-lumos-primary-dark bg-clip-text text-black">
                {value}
              </div>
            )}
            {subtitle && (
              <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const AchievementBadge = React.memo(({ icon: Icon, title, description, gradient, unlocked = true, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Card className={`card-minimal-hover overflow-hidden group cursor-pointer transition-all duration-500 ${
      isVisible ? 'animate-slide-up opacity-100' : 'opacity-0 translate-y-4'
    } ${!unlocked ? 'grayscale opacity-60' : ''}`}>
      <CardContent className="p-6 relative">
        <div className={`w-12 h-12 rounded-xl ${unlocked ? gradient : 'bg-gray-400'} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className={`font-bold mb-2 ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
          {title}
        </h3>
        <p className={`text-sm leading-relaxed ${unlocked ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
          {description}
        </p>
        {unlocked && (
          <div className="absolute -top-2 right-4 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Simplified background with better performance
const BackgroundPattern = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-lumos-primary/10 to-lumos-primary-light/5 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
    <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-lumos-primary/5 to-lumos-primary-muted/10 rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
  </div>
));

const LearningStatsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    hoursSpent: 0,
    modulesCompleted: 0,
    totalModules: 0,
    loginDays: 0,
    currentStreak: 0,
    completionRate: 0,
    averageSession: 0
  });

  // Memoized static data to prevent re-renders
  const skillsData = useMemo(() => [
    { skill: 'JavaScript', value: 85 },
    { skill: 'TypeScript', value: 70 },
    { skill: 'React', value: 90 },
    { skill: 'CSS', value: 75 },
    { skill: 'Node.js', value: 65 },
    { skill: 'UI/UX', value: 60 }
  ], []);

  const achievements = useMemo(() => [
    {
      icon: Trophy,
      title: "First Module",
      description: "Completed your first learning module",
      gradient: "bg-gradient-to-br from-yellow-500 to-orange-500",
      unlocked: true
    },
    {
      icon: Zap,
      title: "Speed Learner", 
      description: "Completed 5 modules in one week",
      gradient: "bg-gradient-to-br from-purple-500 to-purple-600",
      unlocked: true
    },
    {
      icon: Target,
      title: "Goal Achiever",
      description: "Reached your first learning milestone",
      gradient: "bg-gradient-to-br from-green-500 to-emerald-500",
      unlocked: true
    },
    {
      icon: Flame,
      title: "Streak Master",
      description: "Maintained 30-day learning streak",
      gradient: "bg-gradient-to-br from-red-500 to-pink-500",
      unlocked: false
    },
    {
      icon: Award,
      title: "Expert Level",
      description: "Mastered advanced concepts",
      gradient: "bg-gradient-to-br from-blue-500 to-indigo-500",
      unlocked: false
    },
    {
      icon: BookOpen,
      title: "Knowledge Hunter",
      description: "Completed 50+ learning resources",
      gradient: "bg-gradient-to-br from-cyan-500 to-blue-500",
      unlocked: true
    }
  ], []);

  const insightCards = useMemo(() => [
    {
      label: "Average Session",
      value: "2.1 hrs",
      icon: Clock,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600"
    },
    {
      label: "Completion Rate",
      value: "94%",
      icon: Target,
      gradient: "bg-gradient-to-br from-green-500 to-emerald-500"
    },
    {
      label: "Current Streak",
      value: "12 days",
      icon: Flame,
      gradient: "bg-gradient-to-br from-orange-500 to-red-500"
    },
    {
      label: "Weekly Goal",
      value: "8/10 hrs",
      icon: TrendingUp,
      gradient: "bg-gradient-to-br from-purple-500 to-purple-600"
    }
  ], []);

  // Optimized data fetching
  const calculateStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: pathData } = await supabase
        .from('user_learning_paths')
        .select('user_path_id, created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (pathData) {
        const { data: modulesData } = await supabase
          .from('user_module_progress')
          .select(`
            is_completed,
            learning_modules (estimated_hours)
          `)
          .eq('user_path_id', pathData.user_path_id)
          .eq('status', 'active');

        if (modulesData) {
          const completedModules = modulesData.filter(m => m.is_completed);
          const totalHours = completedModules.reduce(
            (sum, module) => sum + (module.learning_modules?.estimated_hours || 0), 
            0
          );

          const createdDate = new Date(pathData.created_at);
          const today = new Date();
          const daysDiff = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
          const loginDays = Math.min(daysDiff, 45);
          const completionRate = Math.round((completedModules.length / modulesData.length) * 100);

          setUserStats({
            hoursSpent: totalHours,
            modulesCompleted: completedModules.length,
            totalModules: modulesData.length,
            loginDays: loginDays,
            currentStreak: 12,
            completionRate: completionRate,
            averageSession: 2.1
          });
        }
      }
    } catch (error) {
      console.error('Error calculating stats:', error);
      // Fallback data
      setUserStats({
        hoursSpent: 47,
        modulesCompleted: 8,
        totalModules: 12,
        loginDays: 23,
        currentStreak: 12,
        completionRate: 94,
        averageSession: 2.1
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Loading component
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-fade-in">
              {/* Loading skeleton */}
              <div className="text-center mb-12 space-y-4">
                <div className="h-12 bg-muted/30 rounded-lg w-80 mx-auto animate-pulse"></div>
                <div className="h-6 bg-muted/20 rounded w-96 mx-auto animate-pulse"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted/20 rounded-xl animate-pulse"></div>
                ))}
              </div>
              
              <div className="flex justify-center items-center h-32">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumos-primary"></div>
                  <span className="text-muted-foreground font-medium">Loading your analytics...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50 relative">
        <BackgroundPattern />

        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-lumos-primary/20 mb-6">
              <TrendingUp className="w-5 h-5 text-lumos-primary" />
              <span className="text-lumos-primary font-semibold">Analytics Dashboard</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-black m-4">
              Learning Analytics
            </h1>
            <p className="text-muted-foreground text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
              Track your progress, celebrate achievements, and unlock your full learning potential
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard
              icon={Clock}
              label="Hours Learned"
              value={userStats.hoursSpent}
              subtitle="Total learning time"
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
              delay={100}
            />
            <StatCard
              icon={BookOpen}
              label="Modules Completed"
              value={userStats.modulesCompleted}
              subtitle={`Out of ${userStats.totalModules} total`}
              gradient="bg-gradient-to-br from-green-500 to-emerald-500"
              delay={200}
            />
            <StatCard
              icon={Calendar}
              label="Active Days"
              value={userStats.loginDays}
              subtitle="Days on platform"
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
              delay={300}
            />
            <StatCard
              icon={Trophy}
              label="Progress"
              value={`${userStats.completionRate}%`}
              subtitle="Overall completion"
              gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
              delay={400}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Skills Radar Chart */}
            <Card className="card-minimal-hover overflow-hidden animate-slide-up">
              <CardHeader className="">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Target className="h-5 w-5 text-lumos-primary" />
                  Skills Development
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex justify-center">
                  <ChartContainer
                    config={{
                      JavaScript: { label: 'JavaScript', color: 'hsl(var(--lumos-primary))' },
                      TypeScript: { label: 'TypeScript', color: 'hsl(var(--lumos-primary))' },
                      React: { label: 'React', color: 'hsl(var(--lumos-primary))' },
                      CSS: { label: 'CSS', color: 'hsl(var(--lumos-primary))' },
                      'Node.js': { label: 'Node.js', color: 'hsl(var(--lumos-primary))' },
                      'UI/UX': { label: 'UI/UX', color: 'hsl(var(--lumos-primary))' }
                    }}
                    className="min-h-[300px] w-full"
                  >
                    <RadarChart data={skillsData} cx="50%" cy="50%" outerRadius="80%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="skill" 
                        stroke="hsl(var(--foreground))" 
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 'medium' }} 
                      />
                      <PolarRadiusAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <Radar 
                        dataKey="value" 
                        fill="hsl(var(--lumos-primary) / 0.2)" 
                        stroke="hsl(var(--lumos-primary))" 
                        strokeWidth={2}
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                    </RadarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* Learning Insights */}
            <Card className="card-minimal-hover overflow-hidden animate-slide-up">
              <CardHeader className="">
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Learning Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {insightCards.map((insight, index) => {
                    const Icon = insight.icon;
                    return (
                      <div key={index} className="flex flex-col items-center text-center p-6 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors min-h-[120px] justify-center">
                        <div className={`w-14 h-14 ${insight.gradient} rounded-xl flex items-center justify-center mb-3`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <p className="text-muted-foreground text-sm font-medium mb-1">{insight.label}</p>
                        <p className="text-2xl font-bold text-foreground">{insight.value}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <Card className="card-minimal-hover overflow-hidden mb-8">
            <CardHeader className="">
              <CardTitle className="text-2xl flex items-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-600" />
                Achievement Badges
              </CardTitle>
              <p className="text-muted-foreground">
                Unlock badges as you progress through your learning journey
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {achievements.map((achievement, index) => (
                  <AchievementBadge
                    key={`achievement-${index}`}
                    {...achievement}
                    delay={index * 100}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-minimal-hover">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-lumos-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Join Study Groups</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Connect with fellow learners and accelerate your progress together
                </p>
                <button className="btn-primary-rounded px-6 py-3 font-semibold">
                  Find Study Groups
                </button>
              </CardContent>
            </Card>

            <Card className="card-minimal-hover">
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-lumos-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Set Learning Goals</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Define your objectives and track your progress with personalized goals
                </p>
                <button className="btn-outline-rounded px-6 py-3 font-semibold">
                  Create Goals
                </button>
              </CardContent>
            </Card>
          </div> */}
        </div>
      </div>
    </Layout>
  );
};

export default LearningStatsPage;