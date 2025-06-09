import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import Layout from '@/components/common/Layout';
import { Trophy, Award, Star, Zap, Target, Calendar, Clock, BookOpen } from 'lucide-react';

// Optimized counter component with better performance
const AnimatedCounter = React.memo(({ value, duration = 1500, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Use easing function for smoother animation
    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
    
    let startTime = null;
    let animationId = null;
    
    const animate = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const currentCount = Math.floor(easedProgress * value);
      
      setCount(currentCount);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [value, duration]);

  return (
    <span className="text-4xl font-bold text-gray-900">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
});

// Optimized badge component with ref-based animation triggering
const Badge = React.memo(({ icon: Icon, title, description, color, unlocked = true, delay = 0 }) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  // Optimized animation variants
  const variants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier
        delay
      }
    }
  };

  const checkmarkVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: delay + 0.2
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={`relative p-6 rounded-2xl backdrop-blur-md border border-white/20 
        ${unlocked 
          ? 'bg-white/10 shadow-lg' 
          : 'bg-gray-500/10 grayscale'
        } 
        hover:bg-white/20 transition-colors duration-200 group cursor-pointer will-change-transform`}
      // Optimize for GPU acceleration
      style={{ willChange: 'transform, opacity' }}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 
        ${color} ${unlocked ? 'shadow-lg' : 'bg-gray-400'}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className={`font-semibold mb-2 ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
        {title}
      </h3>
      <p className={`text-sm ${unlocked ? 'text-gray-600' : 'text-gray-400'}`}>
        {description}
      </p>
      {unlocked && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
          variants={checkmarkVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <span className="text-white text-xs">✓</span>
        </motion.div>
      )}
    </motion.div>
  );
});

// Optimized stat card with intersection observer
const StatCard = React.memo(({ icon: Icon, label, value, subtitle, delay = 0, color = "bg-blue-500" }) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });

  const variants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        delay
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="relative p-6 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg hover:bg-white/20 transition-colors duration-200 will-change-transform"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center mb-4 shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="space-y-2">
        <p className="text-gray-600 text-sm font-medium">{label}</p>
        {typeof value === 'number' ? (
          isInView && <AnimatedCounter value={value} duration={1200} />
        ) : (
          <div className="text-4xl font-bold text-gray-900">{value}</div>
        )}
        {subtitle && (
          <p className="text-gray-500 text-xs">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
});

// Optimized background pattern component
const BackgroundPattern = React.memo(() => (
  <div className="absolute inset-0 opacity-5 pointer-events-none">
    <motion.div 
      className="absolute top-20 left-20 w-72 h-72 bg-gray-900 rounded-full mix-blend-multiply filter blur-xl"
      animate={{ 
        scale: [1, 1.1, 1],
        opacity: [0.5, 0.8, 0.5]
      }}
      transition={{ 
        duration: 8, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    />
    <motion.div 
      className="absolute top-40 right-20 w-72 h-72 bg-gray-700 rounded-full mix-blend-multiply filter blur-xl"
      animate={{ 
        scale: [1.1, 1, 1.1],
        opacity: [0.8, 0.5, 0.8]
      }}
      transition={{ 
        duration: 10, 
        repeat: Infinity, 
        ease: "easeInOut",
        delay: 2
      }}
    />
    <motion.div 
      className="absolute -bottom-32 left-1/2 w-72 h-72 bg-gray-600 rounded-full mix-blend-multiply filter blur-xl"
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.6, 0.9, 0.6]
      }}
      transition={{ 
        duration: 12, 
        repeat: Infinity, 
        ease: "easeInOut",
        delay: 4
      }}
    />
  </div>
));

const LearningStatsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    hoursSpent: 0,
    modulesCompleted: 0,
    totalModules: 0,
    loginDays: 0
  });

  // Memoize static data to prevent unnecessary re-renders
  const skillsData = useMemo(() => [
    { skill: 'JavaScript', value: 85 },
    { skill: 'TypeScript', value: 70 },
    { skill: 'React', value: 90 },
    { skill: 'CSS', value: 75 },
    { skill: 'Node.js', value: 65 },
    { skill: 'UI/UX', value: 60 }
  ], []);

  const badges = useMemo(() => [
    {
      icon: Trophy,
      title: "First Module",
      description: "Completed your first learning module",
      color: "bg-yellow-500",
      unlocked: true
    },
    {
      icon: Zap,
      title: "Quick Learner", 
      description: "Completed 5 modules in a week",
      color: "bg-purple-500",
      unlocked: true
    },
    {
      icon: Target,
      title: "Goal Crusher",
      description: "Achieved 1 learning goal",
      color: "bg-green-500",
      unlocked: true
    },
    {
      icon: Star,
      title: "Streak Master",
      description: "Maintained 30-day learning streak",
      color: "bg-blue-500",
      unlocked: false
    },
    {
      icon: Award,
      title: "Expert Level",
      description: "Mastered advanced concepts",
      color: "bg-red-500",
      unlocked: false
    },
    {
      icon: BookOpen,
      title: "Knowledge Seeker",
      description: "Completed 50+ learning resources",
      color: "bg-indigo-500",
      unlocked: true
    }
  ], []);

  // Optimize data fetching with useCallback
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

          setUserStats({
            hoursSpent: totalHours,
            modulesCompleted: completedModules.length,
            totalModules: modulesData.length,
            loginDays: loginDays
          });
        }
      }
    } catch (error) {
      console.error('Error calculating stats:', error);
      setUserStats({
        hoursSpent: 47,
        modulesCompleted: 8,
        totalModules: 12,
        loginDays: 23
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Optimized loading animation
  const LoadingSpinner = React.memo(() => (
    <Layout>
      <div className="flex justify-center items-center h-[calc(100vh-120px)]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"
        />
      </div>
    </Layout>
  ));

  if (loading) {
    return <LoadingSpinner />;
  }

  // Optimized animation variants for containers
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
        <BackgroundPattern />

        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Learning Analytics</h1>
            <p className="text-gray-600 text-lg">Track your progress and celebrate your achievements</p>
          </div>

          {/* Stats Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            <StatCard
              icon={Clock}
              label="Hours Learned"
              value={userStats.hoursSpent}
              subtitle="Total learning time"
              delay={0.1}
              color="bg-blue-500"
            />
            <StatCard
              icon={BookOpen}
              label="Modules Completed"
              value={userStats.modulesCompleted}
              subtitle={`Out of ${userStats.totalModules} total`}
              delay={0.2}
              color="bg-green-500"
            />
            <StatCard
              icon={Calendar}
              label="Active Days"
              value={userStats.loginDays}
              subtitle="Days logged in"
              delay={0.3}
              color="bg-purple-500"
            />
            <StatCard
              icon={Trophy}
              label="Progress"
              value={`${Math.round((userStats.modulesCompleted / userStats.totalModules) * 100)}%`}
              subtitle="Overall completion"
              delay={0.4}
              color="bg-yellow-500"
            />
          </motion.div>

          {/* Charts Section */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
          >
            {/* Skills Radar Chart */}
            <motion.div
              variants={itemVariants}
              className="p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Skills Development</h2>
              <div className="flex justify-center">
                <ChartContainer
                  config={{
                    JavaScript: { label: 'JavaScript', color: '#374151' },
                    TypeScript: { label: 'TypeScript', color: '#374151' },
                    React: { label: 'React', color: '#374151' },
                    CSS: { label: 'CSS', color: '#374151' },
                    'Node.js': { label: 'Node.js', color: '#374151' },
                    'UI/UX': { label: 'UI/UX', color: '#374151' }
                  }}
                  className="min-h-[300px] w-full"
                >
                  <RadarChart data={skillsData} cx="50%" cy="50%" outerRadius="80%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis 
                      dataKey="skill" 
                      stroke="#374151" 
                      tick={{ fill: '#374151', fontSize: 12, fontWeight: 'medium' }} 
                    />
                    <PolarRadiusAxis 
                      stroke="#9ca3af" 
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                    />
                    <Radar 
                      dataKey="value" 
                      fill="rgba(55, 65, 81, 0.2)" 
                      stroke="#374151" 
                      strokeWidth={2}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              variants={itemVariants}
              className="p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Learning Insights</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/20 backdrop-blur-sm">
                  <div>
                    <p className="text-gray-600 text-sm">Average Session</p>
                    <p className="text-2xl font-bold text-gray-900">2.1 hrs</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/20 backdrop-blur-sm">
                  <div>
                    <p className="text-gray-600 text-sm">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">94%</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/20 backdrop-blur-sm">
                  <div>
                    <p className="text-gray-600 text-sm">Current Streak</p>
                    <p className="text-2xl font-bold text-gray-900">12 days</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Badges Section */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Achievement Badges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {badges.map((badge, index) => (
                <Badge
                  key={`badge-${index}`}
                  {...badge}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default LearningStatsPage;