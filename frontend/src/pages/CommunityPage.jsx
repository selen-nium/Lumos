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
import { AlertCircle, MessageCircle, CheckCircle, Clock } from 'lucide-react';

const CommunityPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentors');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
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

  // Replace your fetchMentors function with this simplified version temporarily
  const fetchMentors = async () => {
    try {
      console.log('🔍 Step 1: Fetching mentors...');
      
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
          created_at
        `)
        .in('user_type', ['mentor', 'both'])
        .eq('mentor_verified', true)
        .order('created_at', { ascending: false });

      console.log('📊 Raw mentor data:', data);
      console.log('❌ Any errors?', error);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('⚠️ No mentors found - stopping here');
        setMentors([]);
        return;
      }
      
      console.log(`✅ Found ${data.length} mentors, now fetching skills...`);
      
      // Simplified mentors without skills for now
      const simplifiedMentors = data.map(mentor => ({
        ...mentor,
        skills: [], // Start with empty skills to see if mentors show up
        initials: getInitials(mentor.username || mentor.email),
        experience: formatExperience(mentor.years_experience, mentor.career_stage),
        bio: mentor.mentor_bio || 'Experienced professional ready to help others grow in tech.'
      }));
      
      console.log('✅ Simplified mentors:', simplifiedMentors);
      setMentors(simplifiedMentors);
      
      // Now let's test the skills query separately
      console.log('🔍 Step 2: Testing skills query...');
      
      for (const mentor of data.slice(0, 2)) { // Test first 2 mentors
        console.log(`Testing skills for ${mentor.username} (${mentor.id})`);
        
        const { data: skillsData, error: skillsError } = await supabase
          .from('user_skills')
          .select(`
            skill_id,
            proficiency_level,
            skills (skill_name)
          `)
          .eq('user_id', mentor.id);
        
        console.log(`Skills result for ${mentor.username}:`, { skillsData, skillsError });
      }
      
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
    if (!searchQuery) return mentors;
    const q = searchQuery.toLowerCase();
    return mentors.filter(m =>
      m.username?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.company?.toLowerCase().includes(q) ||
      m.skills.some(s => s.toLowerCase().includes(q))
    );
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatExperience = (years, careerStage) => {
    if (years) return `${years}+ years`;
    
    const mapping = {
      'student': 'Student',
      'early-career': '0-2 years',
      'mid-career': '3-7 years',
      'senior': '8+ years',
      'career-break': 'Returning to field'
    };
    
    return mapping[careerStage] || 'Experience varies';
  };

  const getRequestButtonState = (mentorId) => {
    const status = sentRequests[mentorId];
    if (status === 'pending') return { text: 'Request Sent', disabled: true, variant: 'secondary' };
    if (status === 'accepted') return { text: 'Connected', disabled: true, variant: 'default' };
    if (status === 'declined') return { text: 'Request Mentorship', disabled: false, variant: 'outline' };
    return { text: 'Request Mentorship', disabled: false, variant: 'default' };
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-text">Community</h1>
        <p className="text-gray-600 mb-6">Connect with mentors and peers on your learning journey.</p>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="mentors" className='p-4'>Find Mentors</TabsTrigger>
            {userIsVerifiedMentor && (
              <TabsTrigger value="requests" className='p-4'>
                Connection Requests
                {connectionRequests.length > 0 && (
                  <Badge className="ml-2" variant="destructive">
                    {connectionRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="studyGroups" className='p-4'>Study Groups</TabsTrigger>
            <TabsTrigger value="accountability" className='p-4'>Accountability Board</TabsTrigger>
          </TabsList>

          <TabsContent value="mentors">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Input
                placeholder="Search mentors by name, skills, or company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                Filter Options
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block mb-1 text-sm font-medium">Experience Level</label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Any experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="early">0-2 years</SelectItem>
                      <SelectItem value="mid">3-7 years</SelectItem>
                      <SelectItem value="senior">8+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Availability</label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Any availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour/week</SelectItem>
                      <SelectItem value="2">2 hours/week</SelectItem>
                      <SelectItem value="3+">3+ hours/week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterMentors().map(mentor => {
                const buttonState = getRequestButtonState(mentor.id);
                
                return (
                  <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="flex items-start gap-4 p-6">
                      <Avatar className="w-12 h-12">
                        {mentor.avatar ? (
                          <AvatarImage src={mentor.avatar} alt={mentor.username} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white">
                            {mentor.initials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">{mentor.username || 'Anonymous Mentor'}</h3>
                          {mentor.mentor_verified && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {mentor.role} {mentor.company && `at ${mentor.company}`}
                        </p>
                        <div className="mt-1 text-xs text-gray-500">
                          {mentor.experience} • {mentor.availability_hours}
                        </div>
                        <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                          {mentor.bio}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {mentor.skills.slice(0, 3).map(skill => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {mentor.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{mentor.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={!mentor.email}
                        onClick={() => {
                          // Check if already connected, then redirect to messages
                          const connectionStatus = sentRequests[mentor.id];
                          if (connectionStatus === 'accepted') {
                            // Find the connection and redirect to messages
                            // For now, show alert - you can enhance this
                            alert('Redirecting to your conversation...');
                          } else {
                            alert('You need to connect first before messaging');
                          }
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant={buttonState.variant}
                            size="sm"
                            disabled={buttonState.disabled}
                            onClick={() => setSelectedMentor(mentor)}
                          >
                            {buttonState.text}
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Connect with {mentor.username}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                              Send a connection request to {mentor.username}. 
                              Include a message about what you'd like help with.
                            </p>
                            <Textarea
                              placeholder="Hi! I'm interested in learning more about... I would appreciate your guidance with..."
                              value={connectionMessage}
                              onChange={(e) => setConnectionMessage(e.target.value)}
                              className="min-h-[100px]"
                              maxLength={500}
                            />
                            <div className="text-xs text-gray-500 text-right">
                              {connectionMessage.length}/500
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
                                disabled={sendingRequest}
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

            {filterMentors().length === 0 && (
              <Card className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No mentors found</h3>
                <p className="text-gray-600">
                  {searchQuery ? 'Try adjusting your search criteria.' : 'Verified mentors will appear here.'}
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Connection Requests Tab (Only for verified mentors) */}
          {userIsVerifiedMentor && (
            <TabsContent value="requests">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Incoming Connection Requests</h2>
                
                {connectionRequests.length > 0 ? (
                  <div className="space-y-4">
                    {connectionRequests.map(request => (
                      <Card key={request.request_id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">
                              {request.profiles?.username || 'Anonymous User'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {request.profiles?.role} 
                              {request.profiles?.company && ` at ${request.profiles.company}`}
                            </p>
                            {request.message && (
                              <p className="mt-2 text-sm bg-gray-50 p-3 rounded border-l-2 border-primary">
                                "{request.message}"
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConnectionResponse(request.request_id, 'declined')}
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleConnectionResponse(request.request_id, 'accepted')}
                            >
                              Accept
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No connection requests</h3>
                    <p className="text-gray-600">
                      Connection requests from mentees will appear here.
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {/* Study Groups Tab (placeholder) */}
          <TabsContent value="studyGroups">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Study Groups</h3>
              <p className="text-gray-600">Study groups feature coming soon!</p>
            </div>
          </TabsContent>

          {/* Accountability Board Tab (placeholder) */}
          <TabsContent value="accountability">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Accountability Board</h3>
              <p className="text-gray-600">Accountability board feature coming soon!</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CommunityPage;