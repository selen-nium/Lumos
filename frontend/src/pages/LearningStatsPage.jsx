import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
// import { Calendar } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import Layout from '@/components/common/Layout';

const LearningStatsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    modulesCompleted: 65,
    hoursSpent: 47,
    totalPoints: 1250,
    currentStreak: 12,
    longestStreak: 18,
    calendar: Array(31).fill(0).map((_, index) => ({
      day: index + 1,
      isActive: [1,2,3,4,5,8,9,10,11,12].includes(index+1)
    }))
  });
  const [skillsData, setSkillsData] = useState({
    JavaScript: 85,
    TypeScript: 70,
    React: 90,
    CSS: 75,
    'Node.js': 65,
    'UI/UI': 60
  });
  const [selectedDates, setSelectedDates] = useState([]);
  const [radarData, setRadarData] = useState([]);

  // Prepare calendar selected dates
  useEffect(() => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const selected = stats.calendar
      .filter(d => d.isActive)
      .map(d => new Date(year, month, d.day));
    setSelectedDates(selected);
  }, [stats.calendar]);

  // Prepare radar chart data
  useEffect(() => {
    const data = Object.entries(skillsData).map(([skill, value]) => ({ skill, value }));
    setRadarData(data);
  }, [skillsData]);

  // Fetch user profile
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setUserProfile(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-120px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-btn-dark"></div>
        </div>
      </Layout>
    );
  }

  // Mock personalized advice
  const personalizedAdvice = [
    {
      id: 1,
      type: 'Learning Frequency',
      advice: 'Your learning consistency is excellent. Consider increasing session length to improve retention.'
    },
    {
      id: 2,
      type: 'Recommended Tech Stack',
      advice: 'Based on your interests, we suggest exploring GraphQL and Apollo to complement your React skills.'
    },
    {
      id: 3,
      type: 'Practice Suggestion',
      advice: 'Try building a small project combining your TypeScript and React skills to solidify your understanding.'
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-text">Learning Statistics</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Progress Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-text">Progress Overview</h2>

            <div className="mb-6">
              <h3 className="text-sm text-gray-600 mb-1">Modules Completed</h3>
              <div className="flex items-center">
                <Progress value={stats.modulesCompleted} max={100} className="flex-1 mr-2" />
                <span className="text-gray-600 font-medium">{stats.modulesCompleted}%</span>
              </div>
            </div>

            <div className="flex items-center mb-4">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-gray-600">Hours Spent Learning:</span>
              <span className="ml-auto font-bold text-text">{stats.hoursSpent}</span>
            </div>

            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-gray-600">Total Points:</span>
              <span className="ml-auto font-bold text-text">{stats.totalPoints}</span>
            </div>
          </div>

          {/* Learning Streak */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-text">Learning Streak</h2>

            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-btn-dark flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05c-.066 1.557.214 2.84.75 3.855.545 1.02 1.342 1.764 2.33 2.077 1.044.33 2.095.21 2.925-.067.82-.275 1.485-.745 1.937-1.377.45-.632.73-1.37.873-2.116.145-.747.175-1.526.12-2.258-.05-.733-.205-1.36-.433-1.854-.228-.493-.52-.87-.839-1.12-.32-.25-.666-.39-1.022-.429a2.94 2.94 0 00-.62.03z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="text-3xl font-bold text-text">{stats.currentStreak}</span>
                  <span className="ml-2 text-gray-600">days</span>
                </div>
                <p className="text-xs text-gray-500">Longest: {stats.longestStreak} days</p>
              </div>
            </div>

            {/* <div className="w-full flex justify-center">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={() => {}}
                className="rounded-md border"
              />
            </div> */}

            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2 text-gray-600">Available Rewards</h3>
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">Custom Theme</span>
                <span className="px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">Pro Courses</span>
                <span className="px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">Lumos Badge</span>
              </div>
            </div>
          </div>

          {/* Skills Development */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 text-text">Skills Development</h2>
            <div className="flex justify-center">
              <ChartContainer
                config={{
                  JavaScript: { label: 'JavaScript', color: '#776B5D' },
                  TypeScript: { label: 'TypeScript', color: '#776B5D' },
                  React: { label: 'React', color: '#776B5D' },
                  CSS: { label: 'CSS', color: '#776B5D' },
                  'Node.js': { label: 'Node.js', color: '#776B5D' },
                  'UI/UI': { label: 'UI/UI', color: '#776B5D' }
                }}
                className="min-h-[300px] w-full"
              >
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" stroke="#776B5D" tick={{ fill: '#776B5D', fontSize: 14 }} />
                  <PolarRadiusAxis />
                  <Radar dataKey="value" fill="rgba(119, 107, 93, 0.4)" stroke="#776B5D" />
                  <Tooltip content={<ChartTooltipContent />} />
                </RadarChart>
              </ChartContainer>
            </div>
          </div>
        </div>

        {/* Personalised Advice */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-6 text-text">Personalised Advice</h2>

          <div className="space-y-6">
            {personalizedAdvice.map(item => (
              <div key={item.id} className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-btn-dark" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-text">{item.type}</h3>
                  <p className="text-gray-600 mt-1">{item.advice}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-right">
            <Link to="/detailed-report" className="text-btn-dark hover:underline inline-flex items-center">
              View detailed learning report
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LearningStatsPage;
