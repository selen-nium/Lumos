import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import Layout from '@/components/common/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertCircle, 
  MessageCircle, 
  CheckCircle, 
  Clock, 
  Star, 
  Users, 
  MapPin,
  Award,
  Sparkles,
  Search,
  Filter,
  TrendingUp,
  Target,
  Heart
} from 'lucide-react';

const CommunityPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [experienceFilter, setExperienceFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  
  // data states
  const [mentors, setMentors] = useState([]);
  const [featuredMentors, setFeaturedMentors] = useState([]);
  const [userGoals, setUserGoals] = useState([]);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  
  // Connection dialog state
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    fetchCommunityData();
  }, [user]);

  const fetchCommunityData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await Promise.all([
        fetchUserGoals(),
        fetchMentors(),
        fetchConnectionRequests(),
        fetchSentRequests()
      ]);
    } catch (error) {
      console.error('Error fetching community data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select(`
          goals (
            goal_title,
            goal_description
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const goals = data?.map(item => item.goals?.goal_title).filter(Boolean) || [];
      setUserGoals(goals);
    } catch (error) {
      console.error('Error fetching user goals:', error);
      setUserGoals(['JavaScript', 'React', 'Node.js']); // Fallback goals
    }
  };

  const fetchMentors = async () => {
    try {
      console.log('🔍 Fetching mentors with complete information...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          email,
          career_stage,
          company,
          role,
          user_type,
          mentor_verified,
          mentor_bio,
          availability_hours,
          years_experience,
          profile_picture_url,
          created_at
        `)
        .in('user_type', ['mentor', 'both'])
        .eq('mentor_verified', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('⚠️ No mentors found');
        setMentors([]);
        return;
      }
      
      console.log(`✅ Found ${data.length} mentors, fetching skills...`);
      
      // Get skills for each mentor
      const mentorsWithSkills = await Promise.all(
        data.map(async (mentor) => {
          try {
            const { data: skillsData, error: skillsError } = await supabase
              .from('user_skills')
              .select(`
                proficiency_level,
                skills (
                  skill_name,
                  category
                )
              `)
              .eq('user_id', mentor.id);

            if (skillsError) {
              console.error(`❌ Error fetching skills for ${mentor.username}:`, skillsError);
            }

            const skills = skillsData?.map(item => ({
              name: item.skills?.skill_name,
              category: item.skills?.category,
              level: item.proficiency_level
            })).filter(skill => skill.name) || [];

            return {
              ...mentor,
              skills,
              initials: getInitials(mentor.username || mentor.email),
              experience: formatExperience(mentor.years_experience, mentor.career_stage),
              bio: mentor.mentor_bio || 'Experienced professional ready to help others grow in tech.',
              skillsText: skills.map(s => s.name).join(', ')
            };
          } catch (error) {
            console.error(`❌ Error processing mentor ${mentor.username}:`, error);
            return {
              ...mentor,
              skills: [],
              initials: getInitials(mentor.username || mentor.email),
              experience: formatExperience(mentor.years_experience, mentor.career_stage),
              bio: mentor.mentor_bio || 'Experienced professional ready to help others grow in tech.',
              skillsText: ''
            };
          }
        })
      );
      
      setMentors(mentorsWithSkills);
      
      // Find featured mentors based on user goals
      const featured = findFeaturedMentors(mentorsWithSkills, userGoals);
      setFeaturedMentors(featured);
      
    } catch (error) {
      console.error('❌ Error in fetchMentors:', error);
      setMentors([]);
    }
  };

  const findFeaturedMentors = (allMentors, goals) => {
    if (!goals.length || !allMentors.length) return allMentors.slice(0, 3);

    // Score mentors based on skill match with user goals
    const scoredMentors = allMentors.map(mentor => {
      let score = 0;
      goals.forEach(goal => {
        mentor.skills.forEach(skill => {
          if (skill.name.toLowerCase().includes(goal.toLowerCase()) || 
              goal.toLowerCase().includes(skill.name.toLowerCase())) {
            score += skill.level || 1; // Higher proficiency = higher score
          }
        });
      });
      return { ...mentor, matchScore: score };
    });

    // Sort by score and return top 3
    return scoredMentors
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  };

  const fetchConnectionRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .select(`
          request_id,
          from_user_id,
          message,
          status,
          created_at,
          profiles!connection_requests_from_user_id_fkey (
            username,
            email,
            career_stage,
            role,
            company
          )
        `)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnectionRequests(data || []);
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('to_user_id, status')
        .eq('from_user_id', user.id);

      if (error) throw error;
      
      const requestsMap = {};
      (data || []).forEach(req => {
        requestsMap[req.to_user_id] = req.status;
      });
      
      setSentRequests(requestsMap);
    } catch (error) {
      console.error('Error fetching sent requests:', error);
    }
  };

  const sendConnectionRequest = async () => {
    if (!selectedMentor || !user) return;
    
    try {
      setSendingRequest(true);
      
      const { data, error } = await supabase
        .from('connection_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: selectedMentor.id,
          message: connectionMessage.trim() || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      setSentRequests(prev => ({
        ...prev,
        [selectedMentor.id]: 'pending'
      }));
      
      setConnectionMessage('');
      setSelectedMentor(null);
      alert('Connection request sent successfully!');
      
    } catch (error) {
      console.error('Error sending connection request:', error);
      if (error.code === '23505') {
        alert('You have already sent a request to this mentor.');
      } else {
        alert('Failed to send connection request. Please try again.');
      }
    } finally {
      setSendingRequest(false);
    }
  };

  const filterMentors = () => {
    let filtered = mentors;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.username?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.company?.toLowerCase().includes(q) ||
        m.skillsText?.toLowerCase().includes(q) ||
        m.bio?.toLowerCase().includes(q)
      );
    }

    if (experienceFilter && experienceFilter !== 'all') {
      filtered = filtered.filter(m => {
        const years = m.years_experience || 0;
        switch (experienceFilter) {
          case 'early': return years <= 2;
          case 'mid': return years >= 3 && years <= 7;
          case 'senior': return years >= 8;
          default: return true;
        }
      });
    }

    if (availabilityFilter && availabilityFilter !== 'all') {
      filtered = filtered.filter(m => {
        if (!m.availability_hours) return false;
        const availability = m.availability_hours.toLowerCase();
        switch (availabilityFilter) {
          case '1': return availability.includes('1') || availability.includes('2');
          case '2': return availability.includes('3') || availability.includes('5');
          case '3+': return availability.includes('5+') || availability.includes('10');
          default: return true;
        }
      });
    }

    return filtered;
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatExperience = (years, careerStage) => {
    if (years && years > 0) return `${years}+ years`;
    
    const mapping = {
      'student': 'Student',
      'early-career': '0-2 years',
      'mid-career': '3-7 years',
      'senior': '8+ years',
      'career-break': 'Returning to field'
    };
    
    return mapping[careerStage] || 'Experience varies';
  };

  const getSkillCategoryColor = (category) => {
    if (!category) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const categoryLower = category.toLowerCase();
    
    // Frontend technologies
    if (categoryLower.includes('frontend') || categoryLower.includes('front-end') || 
        categoryLower.includes('ui') || categoryLower.includes('ux')) {
      return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    }
    
    // Backend technologies
    if (categoryLower.includes('backend') || categoryLower.includes('back-end') || 
        categoryLower.includes('server') || categoryLower.includes('api')) {
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    }
    
    // Database related
    if (categoryLower.includes('database') || categoryLower.includes('db') || 
        categoryLower.includes('sql') || categoryLower.includes('data')) {
      return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
    }
    
    // DevOps/Infrastructure
    if (categoryLower.includes('devops') || categoryLower.includes('infrastructure') || 
        categoryLower.includes('cloud') || categoryLower.includes('deployment')) {
      return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
    }
    
    // Mobile development
    if (categoryLower.includes('mobile') || categoryLower.includes('ios') || 
        categoryLower.includes('android') || categoryLower.includes('react native')) {
      return 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200';
    }
    
    // Machine Learning/AI
    if (categoryLower.includes('machine learning') || categoryLower.includes('ml') || 
        categoryLower.includes('ai') || categoryLower.includes('data science')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200';
    }
    
    // Testing/QA
    if (categoryLower.includes('testing') || categoryLower.includes('qa') || 
        categoryLower.includes('quality')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
    }
    
    // Design
    if (categoryLower.includes('design') || categoryLower.includes('graphics') || 
        categoryLower.includes('visual')) {
      return 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200';
    }
    
    // Management/Soft Skills
    if (categoryLower.includes('management') || categoryLower.includes('leadership') || 
        categoryLower.includes('soft') || categoryLower.includes('communication')) {
      return 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200';
    }
    
    // Programming Languages
    if (categoryLower.includes('programming') || categoryLower.includes('language') || 
        categoryLower.includes('coding')) {
      return 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200';
    }
    
    // Default for any other categories
    return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
  };

  const getSkillLevelText = (level) => {
    switch (level) {
      case 1: return 'Beginner';
      case 2: return 'Intermediate';
      case 3: return 'Advanced';
      default: return '';
    }
  };

  const getRequestButtonState = (mentorId) => {
    const status = sentRequests[mentorId];
    if (status === 'pending') return { text: 'Request Sent', disabled: true, variant: 'secondary' };
    if (status === 'accepted') return { text: 'Connected', disabled: true, variant: 'default' };
    if (status === 'declined') return { text: 'Request Mentorship', disabled: false, variant: 'outline' };
    return { text: 'Connect', disabled: false, variant: 'default' };
  };

  const clearFilters = () => {
    setExperienceFilter('all');
    setAvailabilityFilter('all');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-fade-in">
              <div className="text-center mb-12 space-y-4">
                <div className="h-12 bg-muted/30 rounded-lg w-80 mx-auto animate-pulse"></div>
                <div className="h-6 bg-muted/20 rounded w-96 mx-auto animate-pulse"></div>
              </div>
              
              <div className="flex justify-center items-center h-32">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumos-primary"></div>
                  <span className="text-muted-foreground font-medium">Finding amazing mentors...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredMentors = filterMentors();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-lumos-primary/20 mb-6">
              <Users className="w-5 h-5 text-lumos-primary" />
              <span className="text-lumos-primary font-semibold">Community Hub</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-black mb-4">
              Connect with Mentors
            </h1>
            <p className="text-muted-foreground text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
              Join a thriving community of experienced professionals ready to guide your tech journey
            </p>
          </div>

          {/* Featured Mentors */}
          {featuredMentors.length > 0 && (
            <div className="mb-12 animate-slide-up">
              <Card className="card-minimal-hover overflow-hidden">
                <CardHeader className="">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                    Featured Mentors
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                      Matched for You
                    </Badge>
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Mentors with expertise in your learning goals: {userGoals.slice(0, 3).join(', ')}
                  </p>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {featuredMentors.map((mentor, index) => {
                      const buttonState = getRequestButtonState(mentor.id);
                      
                      return (
                        <Card key={mentor.id} className="card-minimal-hover border-2 border-purple-200/50 hover:border-purple-300 transition-all">
                          <CardContent className="p-6 text-center">
                            <div className="relative mb-4">
                              <Avatar className="h-35 w-35 mx-auto ring-4 ring-purple-200">
                                <AvatarImage 
                                  src={mentor.profile_picture_url || undefined} 
                                  alt={mentor.username}
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-xl font-bold">
                                  {mentor.initials}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            
                            <h3 className="font-bold text-lg mb-1">{mentor.username}</h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              {mentor.role} {mentor.company && `at ${mentor.company}`}
                            </p>
                            
                            <div className="flex justify-center mb-4">
                              <Badge variant="outline" className="text-xs">
                                {mentor.experience}
                              </Badge>
                            </div>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant={buttonState.variant}
                                  size="sm"
                                  disabled={buttonState.disabled}
                                  onClick={() => setSelectedMentor(mentor)}
                                  className="w-full btn-primary-rounded"
                                >
                                  {buttonState.text}
                                </Button>
                              </DialogTrigger>
                            </Dialog>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search and Filters */}
          <div className="space-y-6 mb-8 animate-slide-up">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search mentors by name, skills, company, or expertise..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="btn-outline-rounded px-6 h-12"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Filters'}
              </Button>
            </div>

            {showFilters && (
              <Card className="card-minimal-hover">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block mb-2 text-sm font-medium">Experience Level</label>
                      <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Any experience" />
                        </SelectTrigger>
                        <SelectContent className='bg-white shadow-lg rounded-md'>
                          <SelectItem value="all">Any experience</SelectItem>
                          <SelectItem value="early">0-2 years</SelectItem>
                          <SelectItem value="mid">3-7 years</SelectItem>
                          <SelectItem value="senior">8+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium">Availability</label>
                      <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Any availability" />
                        </SelectTrigger>
                        <SelectContent className='bg-white shadow-lg rounded-md'>
                          <SelectItem value="all">Any availability</SelectItem>
                          <SelectItem value="1">1-2 hours/week</SelectItem>
                          <SelectItem value="2">3-5 hours/week</SelectItem>
                          <SelectItem value="3+">5+ hours/week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={clearFilters} 
                        className="w-full btn-outline-rounded"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results summary */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {filteredMentors.length} of {mentors.length} mentors
                {(searchQuery || (experienceFilter && experienceFilter !== 'all') || (availabilityFilter && availabilityFilter !== 'all')) && ' (filtered)'}
              </span>
              {filteredMentors.length !== mentors.length && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-lumos-primary hover:text-lumos-primary-dark">
                  View all mentors
                </Button>
              )}
            </div>
          </div>

          {/* Mentors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 animate-slide-up">
            {filteredMentors.map(mentor => {
              const buttonState = getRequestButtonState(mentor.id);
              
              return (
                <Card key={mentor.id} className="card-minimal-hover overflow-hidden border-l-4 border-l-lumos-primary/30 group">
                  <CardContent className="p-8">
                    {/* Header */}
                    <div className="flex items-start gap-6 mb-6">
                      <div className="relative">
                        <Avatar className="w-24 h-24 ring-4 ring-white shadow-lg group-hover:ring-lumos-primary/20 transition-all">
                          <AvatarImage 
                            src={mentor.profile_picture_url || undefined} 
                            alt={mentor.username}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-lumos-primary to-lumos-primary-dark text-white text-2xl font-bold">
                            {mentor.initials}
                          </AvatarFallback>
                        </Avatar>
                        {mentor.mentor_verified && (
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-2xl font-bold group-hover:text-lumos-primary transition-colors">
                            {mentor.username || 'Anonymous Mentor'}
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-foreground font-semibold text-lg">
                            {mentor.role}
                            {mentor.company && (
                              <span className="text-muted-foreground font-normal"> at {mentor.company}</span>
                            )}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-lg">
                              <Award className="h-4 w-4 text-lumos-primary" />
                              <span className="font-medium">{mentor.experience}</span>
                            </div>
                            {mentor.availability_hours && (
                              <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-lg">
                                <Clock className="h-4 w-4 text-green-600" />
                                <span className="font-medium">{mentor.availability_hours}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="mb-6">
                      <p className="text-muted-foreground leading-relaxed line-clamp-3">
                        {mentor.bio}
                      </p>
                    </div>

                    {/* Skills */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Target className="h-4 w-4 text-lumos-primary" />
                        Skills & Expertise
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {mentor.skills.length > 0 ? (
                          <>
                            {mentor.skills.slice(0, 8).map((skill, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className={`${getSkillCategoryColor(skill.category)} font-medium hover:scale-105 transition-transform`}
                                title={`${skill.category || 'General'} • ${getSkillLevelText(skill.level)}`}
                              >
                                {skill.name}
                              </Badge>
                            ))}
                            {mentor.skills.length > 8 && (
                              <Badge variant="outline" className="text-lumos-primary border-lumos-primary">
                                +{mentor.skills.length - 8} more
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">No skills listed</span>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="px-8 py-6 bg-gradient-to-r from-muted/10 to-muted/5 flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      Joined {new Date(mentor.created_at).toLocaleDateString()}
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant={buttonState.variant}
                          disabled={buttonState.disabled}
                          onClick={() => setSelectedMentor(mentor)}
                          className="btn-primary-rounded px-6 py-2 font-semibold hover-lift"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {buttonState.text}
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-3 text-xl">
                            <Avatar className="w-10 h-10">
                              <AvatarImage 
                                src={mentor?.profile_picture_url || undefined} 
                                alt={mentor?.username}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-lumos-primary text-white font-bold">
                                {mentor?.initials || '??'}
                              </AvatarFallback>
                            </Avatar>
                            Connect with {mentor?.username}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="p-4 bg-gradient-to-r from-lumos-primary-light to-blue-50 rounded-xl">
                            <p className="font-semibold text-lumos-primary-dark">
                              {mentor?.username} • {mentor?.experience} • {mentor?.role}
                            </p>
                            <p className="text-sm text-lumos-primary-dark/70 mt-1">
                              {mentor?.availability_hours && `Available: ${mentor.availability_hours}`}
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-3">
                              Introduce yourself and explain what you'd like help with:
                            </label>
                            <Textarea
                              placeholder="Hi! I'm interested in learning more about... I would appreciate your guidance with..."
                              value={connectionMessage}
                              onChange={(e) => setConnectionMessage(e.target.value)}
                              className="min-h-[120px] resize-none"
                              maxLength={500}
                            />
                            <div className="text-xs text-muted-foreground text-right mt-2">
                              {connectionMessage.length}/500 characters
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-3">
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectedMentor(null)}
                              className="btn-outline-rounded px-6"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={sendConnectionRequest}
                              disabled={sendingRequest || !connectionMessage.trim()}
                              className="btn-primary-rounded px-6"
                            >
                              {sendingRequest ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Heart className="h-4 w-4 mr-2" />
                                  Send Request
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredMentors.length === 0 && (
            <Card className="card-minimal-hover text-center py-16">
              <CardContent>
                <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No mentors found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                  {searchQuery || (experienceFilter && experienceFilter !== 'all') || (availabilityFilter && availabilityFilter !== 'all')
                    ? 'Try adjusting your search criteria or filters to find the perfect mentor for you.' 
                    : 'Our amazing mentors will appear here once they\'ve been verified.'
                  }
                </p>
                {(searchQuery || (experienceFilter && experienceFilter !== 'all') || (availabilityFilter && availabilityFilter !== 'all')) && (
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="btn-outline-rounded px-8"
                  >
                    Clear all filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CommunityPage;