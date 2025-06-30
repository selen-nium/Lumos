import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '@/components/common/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  X, 
  Users, 
  Send, 
  User,
  Heart,
  Star,
  Calendar,
  Mail,
  UserPlus,
  UserCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';

// Background Pattern Component
const BackgroundPattern = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-lumos-primary/10 to-lumos-primary-light/5 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
    <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-lumos-primary/5 to-lumos-primary-muted/10 rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
  </div>
));

const InboxPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [connections, setConnections] = useState([]);

  // Determine user types
  const isPureMentor = userProfile?.user_type === 'mentor';
  const isMentee = userProfile?.user_type === 'mentee' || userProfile?.user_type === 'both';
  const isMentor = userProfile?.user_type === 'mentor' || userProfile?.user_type === 'both';

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (userProfile) {
      fetchAllRequests();
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type, mentor_verified')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      const promises = [];
      if (isMentor) promises.push(fetchIncomingRequests());
      if (isMentee) promises.push(fetchSentRequests());
      promises.push(fetchConnections());
      await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomingRequests = async () => {
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
            id,
            username,
            email,
            career_stage,
            role,
            company,
            profile_picture_url
          )
        `)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncomingRequests(data || []);
    } catch (error) {
      console.error('Error fetching incoming requests:', error);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .select(`
          request_id,
          to_user_id,
          message,
          status,
          created_at,
          responded_at,
          profiles!connection_requests_to_user_id_fkey (
            id,
            username,
            email,
            career_stage,
            role,
            company,
            profile_picture_url
          )
        `)
        .eq('from_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSentRequests(data || []);
    } catch (error) {
      console.error('Error fetching sent requests:', error);
    }
  };

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .select(`
          request_id,
          from_user_id,
          to_user_id,
          message,
          status,
          created_at,
          responded_at,
          profiles!connection_requests_from_user_id_fkey (
            id,
            username,
            email,
            career_stage,
            role,
            company,
            profile_picture_url
          ),
          to_profiles:profiles!connection_requests_to_user_id_fkey (
            id,
            username,
            email,
            career_stage,
            role,
            company,
            profile_picture_url
          )
        `)
        .eq('status', 'accepted')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('responded_at', { ascending: false });

      if (error) throw error;

      const transformed = (data || []).map(conn => {
        const isFromMe = conn.from_user_id === user.id;
        const other = isFromMe ? conn.to_profiles : conn.profiles;
        return {
          ...conn,
          other_person: other,
          connection_type: isFromMe ? 'mentee' : 'mentor'
        };
      });

      setConnections(transformed);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleConnectionResponse = async (requestId, response) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: response, responded_at: new Date().toISOString() })
        .eq('request_id', requestId);

      if (error) throw error;
      await fetchAllRequests();
      alert(`Connection request ${response}!`);
    } catch (error) {
      console.error('Error responding to connection request:', error);
      alert('Failed to respond to request. Please try again.');
    }
  };

  const getInitials = name => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = status => {
    const map = {
      pending: { variant: 'secondary', text: 'Pending', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
      accepted: { variant: 'default', text: 'Accepted', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
      declined: { variant: 'destructive', text: 'Declined', icon: X, color: 'text-red-600 bg-red-50 border-red-200' }
    };
    const st = map[status] || map.pending;
    const Icon = st.icon;
    return (
      <Badge className={`flex items-center gap-1 ${st.color} font-medium`}>
        <Icon className="h-3 w-3" />
        {st.text}
      </Badge>
    );
  };

  const getTabs = () => {
    if (isPureMentor) {
      return [
        { value: 'incoming', label: 'Incoming Requests', icon: Users, count: incomingRequests.length, default: true },
        { value: 'connections', label: 'My Mentees', icon: MessageCircle, count: connections.length }
      ];
    } else if (userProfile.user_type === 'mentee') {
      return [
        { value: 'connections', label: 'My Mentors', icon: MessageCircle, count: connections.length, default: true },
        { value: 'sent', label: 'Sent Requests', icon: Send, count: sentRequests.length }
      ];
    } else {
      return [
        { value: 'connections', label: 'My Connections', icon: MessageCircle, count: connections.length, default: true },
        { value: 'incoming', label: 'Incoming Requests', icon: Users, count: incomingRequests.length },
        { value: 'sent', label: 'Sent Requests', icon: Send, count: sentRequests.length }
      ];
    }
  };

  if (loading || !userProfile) {
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
                  <span className="text-muted-foreground font-medium">Loading inbox...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const tabs = getTabs();
  const defaultTab = tabs.find(t => t.default)?.value || tabs[0].value;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50 relative">
        <BackgroundPattern />
        
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-lumos-primary/20 mb-6">
              <MessageCircle className="w-5 h-5 text-lumos-primary" />
              <span className="text-lumos-primary font-semibold">
                {isPureMentor
                  ? 'Mentor Inbox'
                  : userProfile.user_type === 'mentee'
                  ? 'Mentoring Hub'
                  : 'Inbox'}
              </span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-black mb-4">
              {isPureMentor
                ? 'Mentor Dashboard'
                : userProfile.user_type === 'mentee'
                ? 'Your Mentors'
                : 'Your Network'}
            </h1>
            <p className="text-muted-foreground text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
              {isPureMentor
                ? 'Manage your mentee connections and guide their learning journey'
                : userProfile.user_type === 'mentee'
                ? 'Connect with mentors and accelerate your learning journey'
                : 'Manage your mentoring connections and grow your network'}
            </p>
          </div>

          <Tabs defaultValue={defaultTab} className="space-y-8">
            <TabsList className={`grid w-full max-w-2xl mx-auto grid-cols-${tabs.length} bg-white/80 backdrop-blur-sm border border-lumos-primary/20`}>
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value} 
                    className="relative data-[state=active]:bg-lumos-primary data-[state=active]:text-black font-medium transition-all"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                    {/* {tab.count > 0 && (
                      <Badge className="ml-2 h-5 w-5 p-0 text-xs bg-red-500 text-white border-0">
                        {tab.count}
                      </Badge>
                    )} */}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Incoming Requests Tab */}
            {isMentor && (
              <TabsContent value="incoming" className="space-y-6 animate-slide-up">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-foreground">Incoming Connection Requests</h2>
                  <Badge variant="secondary" className="bg-lumos-primary-light text-lumos-primary-dark border-lumos-primary/30">
                    {incomingRequests.length} pending
                  </Badge>
                </div>
                
                {incomingRequests.length > 0 ? (
                  <div className="grid gap-6">
                    {incomingRequests.map((request, index) => (
                      <Card key={request.request_id} className="card-minimal-hover overflow-hidden group" style={{ animationDelay: `${index * 100}ms` }}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-16 h-16 ring-2 ring-lumos-primary/20">
                              {request.profiles?.profile_picture_url ? (
                                <AvatarImage
                                  src={request.profiles.profile_picture_url}
                                  alt={request.profiles.username || ''}
                                />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-br from-lumos-primary to-lumos-primary-dark text-white text-lg font-semibold">
                                  {getInitials(request.profiles?.username || request.profiles?.email)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h3 className="text-xl font-bold text-foreground">
                                    {request.profiles?.username || 'Anonymous User'}
                                  </h3>
                                  <p className="text-muted-foreground flex items-center gap-2">
                                    {request.profiles?.career_stage && (
                                      <span className="capitalize bg-lumos-primary-light text-lumos-primary-dark px-2 py-1 rounded-full text-xs font-medium">
                                        {request.profiles.career_stage.replace('-', ' ')}
                                      </span>
                                    )}
                                    {request.profiles?.role}
                                    {request.profiles?.company && ` at ${request.profiles.company}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(request.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                              
                              {request.message && (
                                <div className="bg-gradient-to-r from-lumos-primary-light to-blue-50 p-4 rounded-xl border-l-4 border-lumos-primary mb-4 relative">
                                  <Mail className="absolute top-3 right-3 h-4 w-4 text-lumos-primary/60" />
                                  <p className="text-sm text-lumos-primary-dark font-medium italic leading-relaxed">
                                    "{request.message}"
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex gap-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleConnectionResponse(request.request_id, 'declined')}
                                  className="btn-outline-rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleConnectionResponse(request.request_id, 'accepted')}
                                  className="btn-primary-rounded hover-lift"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Accept
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="card-minimal text-center py-16">
                    <CardContent>
                      <div className="w-24 h-24 bg-gradient-to-br from-lumos-primary-light to-lumos-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="h-12 w-12 text-lumos-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">No incoming requests</h3>
                      <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                        Connection requests from mentees will appear here. Your expertise is valuable - mentees will find you!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* Sent Requests Tab */}
            {isMentee && (
              <TabsContent value="sent" className="space-y-6 animate-slide-up">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-foreground">My Mentor Requests</h2>
                  <Badge variant="secondary" className="bg-lumos-primary-light text-lumos-primary-dark border-lumos-primary/30">
                    {sentRequests.length} total
                  </Badge>
                </div>
                
                {sentRequests.length > 0 ? (
                  <div className="grid gap-6">
                    {sentRequests.map((request, index) => (
                      <Card key={request.request_id} className="card-minimal-hover overflow-hidden" style={{ animationDelay: `${index * 100}ms` }}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-16 h-16 ring-2 ring-lumos-primary/20">
                              {request.profiles?.profile_picture_url ? (
                                <AvatarImage
                                  src={request.profiles.profile_picture_url}
                                  alt={request.profiles.username || ''}
                                />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-br from-lumos-primary to-lumos-primary-dark text-white text-lg font-semibold">
                                  {getInitials(request.profiles?.username || request.profiles?.email)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h3 className="text-xl font-bold text-foreground">
                                    {request.profiles?.username || 'Anonymous Mentor'}
                                  </h3>
                                  <p className="text-muted-foreground">
                                    {request.profiles?.role}
                                    {request.profiles?.company && ` at ${request.profiles.company}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(request.status)}
                                </div>
                              </div>
                              
                              {request.message && (
                                <div className="bg-muted/50 p-3 rounded-lg mb-3 border border-border">
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">Your message:</span> "{request.message}"
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Send className="h-3 w-3" />
                                  Sent: {new Date(request.created_at).toLocaleDateString()}
                                </span>
                                {request.responded_at && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Responded: {new Date(request.responded_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="card-minimal text-center py-16">
                    <CardContent>
                      <div className="w-24 h-24 bg-gradient-to-br from-lumos-primary-light to-lumos-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Send className="h-12 w-12 text-lumos-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">No requests sent</h3>
                      <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed mb-6">
                        You haven't sent any mentor requests yet. Start your learning journey by connecting with experienced mentors.
                      </p>
                      <Button asChild className="btn-primary-rounded px-8 py-3 text-base font-semibold hover-lift">
                        <Link to="/community">
                          <Users className="h-5 w-5 mr-2" />
                          Find Mentors
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* Connections Tab */}
            <TabsContent value="connections" className="space-y-6 animate-slide-up">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">
                  {isPureMentor
                    ? 'My Mentees'
                    : userProfile.user_type === 'mentee'
                    ? 'My Mentors'
                    : 'My Connections'}
                </h2>
                <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-200">
                  {connections.length} active
                </Badge>
              </div>
              
              {connections.length > 0 ? (
                <div className="grid gap-6">
                  {connections.map((connection, index) => (
                    <Card key={connection.request_id} className="card-minimal-hover overflow-hidden group" style={{ animationDelay: `${index * 100}ms` }}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-16 h-16 ring-2 ring-green-200">
                            {connection.other_person?.profile_picture_url ? (
                              <AvatarImage
                                src={connection.other_person.profile_picture_url}
                                alt={connection.other_person.username || ''}
                              />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white text-lg font-semibold">
                                {getInitials(
                                  connection.other_person?.username ||
                                    connection.other_person?.email
                                )}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          
                          <div className="flex-1">  
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="text-xl font-bold text-foreground">
                                  {connection.other_person?.username || 'Anonymous User'}
                                </h3>
                                <p className="text-muted-foreground flex items-center gap-2">
                                  {connection.other_person?.career_stage && (
                                    <span className="capitalize bg-lumos-primary-light text-lumos-primary-dark px-2 py-1 rounded-full text-xs font-medium">
                                      {connection.other_person.career_stage.replace('-', ' ')}
                                    </span>
                                  )}
                                  {connection.other_person?.role}
                                  {connection.other_person?.company &&
                                    ` at ${connection.other_person.company}`}
                                </p>
                              </div>
                              <Badge className="bg-green-50 text-green-700 border-green-300 font-medium">
                                <Heart className="h-3 w-3 mr-1" />
                                {connection.connection_type === 'mentor'
                                  ? isPureMentor
                                    ? 'Your Mentee'
                                    : 'Your Mentee'
                                  : userProfile.user_type === 'mentee'
                                  ? 'Your Mentor'
                                  : 'Your Mentor'}
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center mt-4">
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                Connected: {new Date(connection.responded_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="flex gap-3">
                                <Button size="sm" variant="outline" asChild className="btn-outline-rounded hover-lift">
                                  <Link to={`/messages/${connection.request_id}`}>
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Message
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="card-minimal text-center py-16">
                  <CardContent>
                    <div className="w-24 h-24 bg-gradient-to-br from-lumos-primary-light to-lumos-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-12 w-12 text-lumos-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">
                      {isPureMentor
                        ? 'No mentees yet'
                        : userProfile.user_type === 'mentee'
                        ? 'No mentors yet'
                        : 'No connections yet'}
                    </h3>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed mb-6">
                      {isPureMentor
                        ? 'Mentees you accept will appear here. Share your knowledge and help others grow!'
                        : userProfile.user_type === 'mentee'
                        ? 'Mentors who accept your requests will appear here. Start connecting with experienced professionals.'
                        : 'Your accepted mentoring connections will appear here. Build meaningful professional relationships.'}
                    </p>
                    {userProfile.user_type === 'mentee' && (
                      <Button asChild className="btn-primary-rounded px-8 py-3 text-base font-semibold hover-lift">
                        <Link to="/community">
                          <Users className="h-5 w-5 mr-2" />
                          Find Mentors
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default InboxPage;