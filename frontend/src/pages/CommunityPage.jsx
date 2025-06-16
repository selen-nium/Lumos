// Fixed CommunityPage.jsx - Complete mentor information display
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import Layout from '@/components/common/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, MessageCircle, CheckCircle, Clock, Star, Users, MapPin } from 'lucide-react';

const CommunityPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentors');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [experienceFilter, setExperienceFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  
  // Real data states
  const [mentors, setMentors] = useState([]);
  const [studyGroups, setStudyGroups] = useState([]);
  const [accountabilityPosts, setAccountabilityPosts] = useState([]);
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
            console.log(`🔍 Fetching skills for ${mentor.username} (ID: ${mentor.id})`);
            
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

            console.log(`📊 Skills data for ${mentor.username}:`, { skillsData, skillsError });

            if (skillsError) {
              console.error(`❌ Error fetching skills for ${mentor.username}:`, skillsError);
            }

            const skills = skillsData?.map(item => ({
              name: item.skills?.skill_name,
              category: item.skills?.category,
              level: item.proficiency_level
            })).filter(skill => skill.name) || [];

            console.log(`✅ Processed ${skills.length} skills for ${mentor.username}:`, skills);

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
      
      console.log('✅ Mentors with skills loaded:', {
        total: mentorsWithSkills.length,
        withSkills: mentorsWithSkills.filter(m => m.skills.length > 0).length,
        withoutSkills: mentorsWithSkills.filter(m => m.skills.length === 0).length
      });
      setMentors(mentorsWithSkills);
      
    } catch (error) {
      console.error('❌ Error in fetchMentors:', error);
      setMentors([]);
    }
  };

  const fetchConnectionRequests = async () => {
    try {
      // Fetch incoming requests (for mentors)
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
      // Fetch sent requests (for mentees)
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
      
      // Update local state
      setSentRequests(prev => ({
        ...prev,
        [selectedMentor.id]: 'pending'
      }));
      
      setConnectionMessage('');
      setSelectedMentor(null);
      
      // Show success message
      alert('Connection request sent successfully!');
      
    } catch (error) {
      console.error('Error sending connection request:', error);
      if (error.code === '23505') { // Unique constraint violation
        alert('You have already sent a request to this mentor.');
      } else {
        alert('Failed to send connection request. Please try again.');
      }
    } finally {
      setSendingRequest(false);
    }
  };

  const handleConnectionResponse = async (requestId, response) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ 
          status: response,
          responded_at: new Date().toISOString()
        })
        .eq('request_id', requestId);

      if (error) throw error;
      
      // Remove from local state
      setConnectionRequests(prev => 
        prev.filter(req => req.request_id !== requestId)
      );
      
      alert(`Connection request ${response}!`);
    } catch (error) {
      console.error('Error responding to connection request:', error);
      alert('Failed to respond to request. Please try again.');
    }
  };

  const filterMentors = () => {
    let filtered = mentors;

    // Text search
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

    // Experience filter
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

    // Availability filter  
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

  const getSkillLevelColor = (level) => {
    switch (level) {
      case 1: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
    return { text: 'Request Mentorship', disabled: false, variant: 'default' };
  };

  const clearFilters = () => {
    setExperienceFilter('all');
    setAvailabilityFilter('all');
    setSearchQuery('');
  };

  const userIsVerifiedMentor = user && mentors.some(m => m.id === user.id);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-3">Loading community...</span>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredMentors = filterMentors();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-text">Community</h1>
          <p className="text-gray-600">Connect with experienced mentors and accelerate your learning journey.</p>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="mentors" className='p-4 flex items-center gap-2'>
              <Users className="h-4 w-4" />
              Mentors
              <Badge variant="secondary" className="ml-1">{mentors.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="studyGroups" className='p-4'>Study Groups</TabsTrigger>
            <TabsTrigger value="accountability" className='p-4'>Accountability Board</TabsTrigger>
          </TabsList>

          <TabsContent value="mentors">
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Search mentors by name, skills, company, or expertise..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>

              {showFilters && (
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <Button variant="outline" onClick={clearFilters} className="w-full">
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Results summary */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filteredMentors.length} of {mentors.length} mentors
                  {(searchQuery || (experienceFilter && experienceFilter !== 'all') || (availabilityFilter && availabilityFilter !== 'all')) && ' (filtered)'}
                </span>
                {filteredMentors.length !== mentors.length && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    View all mentors
                  </Button>
                )}
              </div>
            </div>

            {/* Mentors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMentors.map(mentor => {
                const buttonState = getRequestButtonState(mentor.id);
                
                return (
                  <Card key={mentor.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-primary/20">
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage 
                            src={mentor.profile_picture_url || undefined} 
                            alt={mentor.username}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-lg font-semibold">
                            {mentor.initials}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-semibold">{mentor.username || 'Anonymous Mentor'}</h3>
                            {mentor.mentor_verified && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-gray-700 font-medium">
                              {mentor.role}
                              {mentor.company && (
                                <span className="text-gray-500"> at {mentor.company}</span>
                              )}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {mentor.experience}
                              </span>
                              {mentor.availability_hours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {mentor.availability_hours}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                        {mentor.bio}
                      </p>

                      {/* Skills */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-800">Skills & Expertise</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {mentor.skills.length > 0 ? (
                            <>
                              {mentor.skills.slice(0, 6).map((skill, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary" 
                                  className={`text-xs ${getSkillLevelColor(skill.level)}`}
                                  title={getSkillLevelText(skill.level)}
                                >
                                  {skill.name}
                                </Badge>
                              ))}
                              {mentor.skills.length > 6 && (
                                <Badge variant="outline" className="text-xs">
                                  +{mentor.skills.length - 6} more
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-500 italic">No skills listed</span>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="px-6 py-4 bg-gray-50/50 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Joined {new Date(mentor.created_at).toLocaleDateString()}
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant={buttonState.variant}
                            size="sm"
                            disabled={buttonState.disabled}
                            onClick={() => setSelectedMentor(mentor)}
                            className="ml-auto"
                          >
                            {buttonState.text}
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage 
                                  src={mentor?.profile_picture_url || undefined} 
                                  alt={mentor?.username}
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-primary text-white text-sm font-semibold">
                                  {mentor?.initials || '??'}
                                </AvatarFallback>
                              </Avatar>
                              Connect with {mentor?.username}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <strong>{mentor?.username}</strong> • {mentor?.experience} • {mentor?.role}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                {mentor?.availability_hours && `Available: ${mentor.availability_hours}`}
                              </p>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Introduce yourself and explain what you'd like help with:
                              </label>
                              <Textarea
                                placeholder="Hi! I'm interested in learning more about... I would appreciate your guidance with..."
                                value={connectionMessage}
                                onChange={(e) => setConnectionMessage(e.target.value)}
                                className="min-h-[120px]"
                                maxLength={500}
                              />
                              <div className="text-xs text-gray-500 text-right mt-1">
                                {connectionMessage.length}/500 characters
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                onClick={() => setSelectedMentor(null)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={sendConnectionRequest}
                                disabled={sendingRequest || !connectionMessage.trim()}
                              >
                                {sendingRequest ? 'Sending...' : 'Send Request'}
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

            {/* Empty state */}
            {filteredMentors.length === 0 && (
              <Card className="p-12 text-center">
                <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No mentors found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || (experienceFilter && experienceFilter !== 'all') || (availabilityFilter && availabilityFilter !== 'all')
                    ? 'Try adjusting your search criteria or filters.' 
                    : 'Verified mentors will appear here.'
                  }
                </p>
                {(searchQuery || (experienceFilter && experienceFilter !== 'all') || (availabilityFilter && availabilityFilter !== 'all')) && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                )}
              </Card>
            )}
          </TabsContent>

          {/* Study Groups Tab (placeholder) */}
          <TabsContent value="studyGroups">
            <Card className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Study Groups</h3>
              <p className="text-gray-600">Collaborative learning groups feature coming soon!</p>
            </Card>
          </TabsContent>

          {/* Accountability Board Tab (placeholder) */}
          <TabsContent value="accountability">
            <Card className="p-12 text-center">
              <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Accountability Board</h3>
              <p className="text-gray-600">Track goals and progress with your peers - coming soon!</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CommunityPage;