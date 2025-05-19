import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';
import Button from '../components/common/Button';

const CommunityPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentors');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Mock data for mentors
  const [mentors, setMentors] = useState([
    {
      id: 1,
      name: 'Emily Chen',
      initials: 'EC',
      role: 'Senior Software Engineer at Google',
      experience: '8+ years',
      availability: '2 hours/week',
      bio: 'I specialize in frontend development and enjoy helping others grow in their technical careers. Happy to provide guidance on interview prep and career transitions.',
      skills: ['React', 'Node.js', 'System Design'],
      avatar: null
    },
    {
      id: 2,
      name: 'Maria Rodriguez',
      initials: 'MR',
      role: 'Tech Lead at Microsoft',
      experience: '10+ years',
      availability: '3 hours/week',
      bio: 'Passionate about helping women succeed in tech leadership roles. I can provide guidance on technical growth and navigating corporate environments.',
      skills: ['Python', 'Cloud Architecture', 'Leadership'],
      avatar: null
    },
    {
      id: 3,
      name: 'James Wilson',
      initials: 'JW',
      role: 'Backend Developer at Amazon',
      experience: '5+ years',
      availability: '4 hours/week',
      bio: 'Focused on scalable backend systems and distributed computing. I enjoy mentoring on system design and performance optimization.',
      skills: ['Java', 'AWS', 'Microservices'],
      avatar: null
    },
    {
      id: 4,
      name: 'Aisha Patel',
      initials: 'AP',
      role: 'Data Scientist at Netflix',
      experience: '7+ years',
      availability: '2 hours/week',
      bio: 'Experienced in machine learning and data analysis. Happy to guide others in their data science journey and career planning.',
      skills: ['Python', 'Machine Learning', 'Data Visualization'],
      avatar: null
    }
  ]);
  
  // Mock data for study groups
  const [studyGroups, setStudyGroups] = useState([
    {
      id: 1,
      name: 'Frontend Masters',
      members: 12,
      focus: 'React & Modern JavaScript',
      meetingTime: 'Tuesdays, 7PM EST',
      description: 'A group focused on mastering React and modern JavaScript frameworks through collaborative learning and project work.'
    },
    {
      id: 2,
      name: 'Data Science Study Circle',
      members: 8,
      focus: 'Python & Machine Learning',
      meetingTime: 'Saturdays, 10AM EST',
      description: 'Weekly meetings to work through data science problems and discuss machine learning concepts and implementations.'
    },
    {
      id: 3,
      name: 'Women in Tech',
      members: 15,
      focus: 'Career Development & Leadership',
      meetingTime: 'Every other Thursday, 6PM EST',
      description: 'A supportive community for women in tech to share experiences, advice, and resources for career growth.'
    }
  ]);
  
  // Mock data for accountability board
  const [accountabilityPosts, setAccountabilityPosts] = useState([
    {
      id: 1,
      user: {
        name: 'Alex Johnson',
        initials: 'AJ'
      },
      goal: 'Complete React authentication module by Friday',
      comments: 3,
      likes: 5,
      timestamp: '2 hours ago',
      isCompleted: false
    },
    {
      id: 2,
      user: {
        name: 'Taylor Kim',
        initials: 'TK'
      },
      goal: 'Build a responsive portfolio website using CSS Grid',
      comments: 1,
      likes: 8,
      timestamp: '1 day ago',
      isCompleted: true
    },
    {
      id: 3,
      user: {
        name: 'Jordan Smith',
        initials: 'JS'
      },
      goal: 'Implement user authentication in my Node.js project',
      comments: 5,
      likes: 4,
      timestamp: '3 days ago',
      isCompleted: false
    }
  ]);
  
  useEffect(() => {
    // In a real implementation, you would fetch data from Supabase
    // For now, we're just setting loading to false after a delay
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);
  
  // Filter functions for search
  const filterMentors = () => {
    if (!searchQuery) return mentors;
    
    return mentors.filter(mentor => 
      mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };
  
  const filterStudyGroups = () => {
    if (!searchQuery) return studyGroups;
    
    return studyGroups.filter(group => 
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.focus.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  // Render mentor cards
  const renderMentorCards = () => {
    const filteredMentors = filterMentors();
    
    if (filteredMentors.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-600">No mentors found matching your criteria.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMentors.map(mentor => (
          <div key={mentor.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start">
              {/* Avatar/Initials */}
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mr-4">
                {mentor.avatar ? (
                  <img src={mentor.avatar} alt={mentor.name} className="w-16 h-16 rounded-full" />
                ) : (
                  <span className="text-2xl font-medium text-btn-dark">{mentor.initials}</span>
                )}
              </div>
              
              {/* Mentor info */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-text">{mentor.name}</h3>
                <p className="text-gray-600">{mentor.role}</p>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <span>{mentor.experience}</span>
                  <span className="mx-2">•</span>
                  <span>{mentor.availability}</span>
                </div>
              </div>
            </div>
            
            {/* Bio */}
            <p className="mt-4 text-gray-600">{mentor.bio}</p>
            
            {/* Skills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {mentor.skills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-primary-light text-text text-sm rounded-full">
                  {skill}
                </span>
              ))}
            </div>
            
            {/* Action buttons */}
            <div className="mt-6 flex justify-between">
              <button className="border border-btn-dark px-4 py-2 rounded-full text-btn-dark hover:bg-primary-light transition-colors">
                Message
              </button>
              <button className="bg-btn-dark px-4 py-2 rounded-full text-white hover:bg-opacity-90 transition-colors">
                Request Mentorship
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render study group cards
  const renderStudyGroups = () => {
    const filteredGroups = filterStudyGroups();
    
    if (filteredGroups.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-600">No study groups found matching your criteria.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGroups.map(group => (
          <div key={group.id} className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-bold text-text">{group.name}</h3>
            
            <div className="flex items-center mt-2 text-sm">
              <div className="flex items-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                <span className="text-gray-600">{group.members} members</span>
              </div>
              
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600">{group.meetingTime}</span>
              </div>
            </div>
            
            <div className="mt-3">
              <span className="inline-block px-3 py-1 bg-primary-light text-text text-sm rounded-full">
                {group.focus}
              </span>
            </div>
            
            <p className="mt-4 text-gray-600">{group.description}</p>
            
            <div className="mt-6 flex justify-between">
              <button className="border border-btn-dark px-4 py-2 rounded-full text-btn-dark hover:bg-primary-light transition-colors">
                View Details
              </button>
              <button className="bg-btn-dark px-4 py-2 rounded-full text-white hover:bg-opacity-90 transition-colors">
                Join Group
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render accountability board
  const renderAccountabilityBoard = () => {
    return (
      <div className="space-y-6">
        {/* New goal form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold mb-3 text-text">What's your learning goal for this week?</h3>
          <div className="flex">
            <input 
              type="text" 
              className="form-input flex-1 mr-2" 
              placeholder="Share a specific, achievable goal..."
            />
            <Button variant="primary">Post</Button>
          </div>
        </div>
        
        {/* Accountability posts */}
        {accountabilityPosts.map(post => (
          <div key={post.id} className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${post.isCompleted ? 'border-btn-dark' : 'border-primary'}`}>
            <div className="flex items-start">
              {/* Avatar/Initials */}
              <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center mr-3">
                <span className="text-sm font-medium text-btn-dark">{post.user.initials}</span>
              </div>
              
              {/* Post content */}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-text">{post.user.name}</h3>
                  <span className="text-xs text-gray-500">{post.timestamp}</span>
                </div>
                
                <div className="flex items-center mt-1">
                  {post.isCompleted ? (
                    <span className="inline-flex items-center text-btn-dark text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-gray-500 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      In Progress
                    </span>
                  )}
                </div>
                
                <p className="mt-2 text-text">{post.goal}</p>
                
                {/* Actions */}
                <div className="flex mt-4 text-sm">
                  <button className="flex items-center mr-4 text-gray-600 hover:text-text">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    {post.likes}
                  </button>
                  <button className="flex items-center text-gray-600 hover:text-text">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    {post.comments}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Load more button */}
        <div className="text-center mt-6">
          <button className="px-6 py-2 border border-btn-dark rounded-full text-btn-dark hover:bg-primary-light transition-colors">
            Load More
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4 text-text">Community</h1>
        <p className="text-gray-600 text-lg mb-8">
          Connect with mentors and peers on your learning journey. Find guidance from experienced
          professionals or join study groups with like-minded learners to stay motivated and
          accountable.
        </p>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex space-x-8">
            <button
              className={`pb-4 px-2 ${
                activeTab === 'mentors'
                  ? 'border-b-2 border-btn-dark text-text font-medium'
                  : 'text-gray-500 hover:text-text'
              }`}
              onClick={() => setActiveTab('mentors')}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
                Find Mentors
              </span>
            </button>
            <button
              className={`pb-4 px-2 ${
                activeTab === 'studyGroups'
                  ? 'border-b-2 border-btn-dark text-text font-medium'
                  : 'text-gray-500 hover:text-text'
              }`}
              onClick={() => setActiveTab('studyGroups')}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                Study Groups
              </span>
            </button>
            <button
              className={`pb-4 px-2 ${
                activeTab === 'accountability'
                  ? 'border-b-2 border-btn-dark text-text font-medium'
                  : 'text-gray-500 hover:text-text'
              }`}
              onClick={() => setActiveTab('accountability')}
            >
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Accountability Board
              </span>
            </button>
          </div>
        </div>
        
        {/* Search & Filters */}
        {activeTab !== 'accountability' && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full md:max-w-2xl">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                type="text"
                className="form-input w-full pl-10"
                placeholder="Search by name, skills, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button
              className="w-full md:w-auto px-4 py-2 flex items-center justify-center bg-primary-light text-text rounded-lg hover:bg-primary transition-colors"
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filter Options
            </button>
          </div>
        )}
        
        {/* Filter panel */}
        {showFilters && (activeTab === 'mentors' || activeTab === 'studyGroups') && (
          <div className="bg-primary-light p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeTab === 'mentors' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Skills</label>
                    <select className="form-input w-full">
                      <option value="">All Skills</option>
                      <option value="react">React</option>
                      <option value="nodejs">Node.js</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Experience Level</label>
                    <select className="form-input w-full">
                      <option value="">Any Experience</option>
                      <option value="0-2">0-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="5-8">5-8 years</option>
                      <option value="8+">8+ years</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Availability</label>
                    <select className="form-input w-full">
                      <option value="">Any Availability</option>
                      <option value="1-2">1-2 hours/week</option>
                      <option value="3-5">3-5 hours/week</option>
                      <option value="5+">5+ hours/week</option>
                    </select>
                  </div>
                </>
              )}
              
              {activeTab === 'studyGroups' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Topic</label>
                    <select className="form-input w-full">
                      <option value="">All Topics</option>
                      <option value="frontend">Frontend Development</option>
                      <option value="backend">Backend Development</option>
                      <option value="data-science">Data Science</option>
                      <option value="career">Career Development</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Group Size</label>
                    <select className="form-input w-full">
                      <option value="">Any Size</option>
                      <option value="small">Small (2-5 members)</option>
                      <option value="medium">Medium (6-10 members)</option>
                      <option value="large">Large (10+ members)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Meeting Frequency</label>
                    <select className="form-input w-full">
                      <option value="">Any Frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 bg-primary text-text mr-2 rounded-lg hover:bg-opacity-80 transition-colors">
                Reset
              </button>
              <button className="px-4 py-2 bg-btn-dark text-white rounded-lg hover:bg-opacity-90 transition-colors">
                Apply Filters
              </button>
            </div>
          </div>
        )}
        
        {/* Main content based on active tab */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-btn-dark"></div>
          </div>
        ) : (
          <div>
            {activeTab === 'mentors' && renderMentorCards()}
            {activeTab === 'studyGroups' && renderStudyGroups()}
            {activeTab === 'accountability' && renderAccountabilityBoard()}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CommunityPage;