import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '@/components/common/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageCircle, Clock, CheckCircle, X, User } from 'lucide-react';

const InboxPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    if (user) {
      fetchAllRequests();
    }
  }, [user]);

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchIncomingRequests(),
        fetchSentRequests(),
        fetchConnections()
      ]);
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
            company
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
            company
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
            company
          ),
          to_profiles:profiles!connection_requests_to_user_id_fkey (
            id,
            username,
            email,
            career_stage,
            role,
            company
          )
        `)
        .eq('status', 'accepted')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('responded_at', { ascending: false });

      if (error) throw error;
      
      // Transform connections to show the other person
      const transformedConnections = (data || []).map(conn => {
        const isFromMe = conn.from_user_id === user.id;
        const otherPerson = isFromMe ? conn.to_profiles : conn.profiles;
        
        return {
          ...conn,
          other_person: otherPerson,
          connection_type: isFromMe ? 'mentee' : 'mentor'
        };
      });
      
      setConnections(transformedConnections);
    } catch (error) {
      console.error('Error fetching connections:', error);
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
      
      // Refresh all data
      await fetchAllRequests();
      
      // Show success message
      alert(`Connection request ${response}!`);
    } catch (error) {
      console.error('Error responding to connection request:', error);
      alert('Failed to respond to request. Please try again.');
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { variant: 'secondary', text: 'Pending', icon: Clock },
      accepted: { variant: 'default', text: 'Accepted', icon: CheckCircle },
      declined: { variant: 'destructive', text: 'Declined', icon: X }
    };
    
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    
    return (
      <Badge variant={style.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {style.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-3">Loading inbox...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Inbox</h1>
            <p className="text-gray-600">Manage your mentoring connections</p>
          </div>
        </div>

        <Tabs defaultValue="incoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="incoming" className="relative">
              Incoming Requests
              {incomingRequests.length > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 text-xs" variant="destructive">
                  {incomingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent Requests
            </TabsTrigger>
            <TabsTrigger value="connections">
              My Connections
            </TabsTrigger>
          </TabsList>

          {/* Incoming Requests */}
          <TabsContent value="incoming" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Incoming Connection Requests</h2>
              <Badge variant="secondary">{incomingRequests.length} pending</Badge>
            </div>
            
            {incomingRequests.length > 0 ? (
              <div className="space-y-4">
                {incomingRequests.map(request => (
                  <Card key={request.request_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary text-white">
                            {getInitials(request.profiles?.username || request.profiles?.email)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">
                                {request.profiles?.username || 'Anonymous User'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {request.profiles?.role} 
                                {request.profiles?.company && ` at ${request.profiles.company}`}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          
                          {request.message && (
                            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-primary mb-4">
                              <p className="text-sm italic">"{request.message}"</p>
                            </div>
                          )}
                          
                          <div className="flex gap-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConnectionResponse(request.request_id, 'declined')}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleConnectionResponse(request.request_id, 'accepted')}
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
              <Card className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No incoming requests</h3>
                <p className="text-gray-600">
                  Connection requests from mentees will appear here.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Sent Requests */}
          <TabsContent value="sent" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Sent Requests</h2>
              <Badge variant="secondary">{sentRequests.length} total</Badge>
            </div>
            
            {sentRequests.length > 0 ? (
              <div className="space-y-4">
                {sentRequests.map(request => (
                  <Card key={request.request_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary text-white">
                            {getInitials(request.profiles?.username || request.profiles?.email)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">
                                {request.profiles?.username || 'Anonymous Mentor'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {request.profiles?.role} 
                                {request.profiles?.company && ` at ${request.profiles.company}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                          
                          {request.message && (
                            <div className="bg-gray-50 p-3 rounded-lg mb-3">
                              <p className="text-sm">Your message: "{request.message}"</p>
                            </div>
                          )}
                          
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Sent: {new Date(request.created_at).toLocaleDateString()}</span>
                            {request.responded_at && (
                              <span>Responded: {new Date(request.responded_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No sent requests</h3>
                <p className="text-gray-600">
                  Requests you send to mentors will appear here.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Connections */}
          <TabsContent value="connections" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Connections</h2>
              <Badge variant="secondary">{connections.length} active</Badge>
            </div>
            
            {connections.length > 0 ? (
              <div className="space-y-4">
                {connections.map(connection => (
                  <Card key={connection.request_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-green-100 text-green-800">
                            {getInitials(connection.other_person?.username || connection.other_person?.email)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">
                                {connection.other_person?.username || 'Anonymous User'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {connection.other_person?.role} 
                                {connection.other_person?.company && ` at ${connection.other_person.company}`}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              {connection.connection_type === 'mentor' ? 'Your Mentee' : 'Your Mentor'}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center mt-4">
                            <div className="text-xs text-gray-500">
                              Connected: {new Date(connection.responded_at).toLocaleDateString()}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/messages/${connection.request_id}`}>
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Message
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline">
                                View Profile
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
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No connections yet</h3>
                <p className="text-gray-600">
                  Your accepted mentoring connections will appear here.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default InboxPage;