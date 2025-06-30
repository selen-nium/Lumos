import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/common/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  MessageCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Calendar,
  Star,
  Award
} from 'lucide-react';

const MentorHomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mentorData, setMentorData] = useState({
    connectionRequests: [],
    activeConnections: [],
    recentMessages: [],
    mentorStats: {}
  });

  useEffect(() => {
    fetchMentorDashboardData();
  }, [user]);

  const fetchMentorDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch connection requests
      const { data: requests, error: requestsError } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch active connections
      const { data: connections, error: connectionsError } = await supabase
        .from('connection_requests')
        .select(`
          request_id,
          from_user_id,
          to_user_id,
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
          )
        `)
        .eq('to_user_id', user.id)
        .eq('status', 'accepted')
        .order('responded_at', { ascending: false })
        .limit(10);

      // Calculate stats
      const { data: allRequests } = await supabase
        .from('connection_requests')
        .select('status')
        .eq('to_user_id', user.id);

      const stats = {
        totalRequests: allRequests?.length || 0,
        acceptedConnections: allRequests?.filter(r => r.status === 'accepted').length || 0,
        pendingRequests: allRequests?.filter(r => r.status === 'pending').length || 0,
        responseRate: allRequests?.length > 0 ? 
          Math.round(((allRequests.filter(r => r.status !== 'pending').length) / allRequests.length) * 100) : 0
      };

      setMentorData({
        connectionRequests: requests || [],
        activeConnections: connections || [],
        recentMessages: [], // TODO: Implement messaging
        mentorStats: stats
      });

    } catch (error) {
      console.error('Error fetching mentor dashboard data:', error);
    } finally {
      setLoading(false);
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
      
      // Refresh data
      await fetchMentorDashboardData();
      
    } catch (error) {
      console.error('Error responding to connection request:', error);
      alert('Failed to respond to request. Please try again.');
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-3">Loading your mentor dashboard...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-text">Mentor Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your mentees.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold">{mentorData.mentorStats.totalRequests}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Connections</p>
                  <p className="text-2xl font-bold">{mentorData.mentorStats.acceptedConnections}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold">{mentorData.mentorStats.pendingRequests}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Response Rate</p>
                  <p className="text-2xl font-bold">{mentorData.mentorStats.responseRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Connection Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Requests
              </CardTitle>
              {mentorData.connectionRequests.length > 0 && (
                <Badge variant="destructive">{mentorData.connectionRequests.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {mentorData.connectionRequests.length > 0 ? (
                <div className="space-y-4">
                  {mentorData.connectionRequests.map(request => (
                    <div key={request.request_id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary text-white">
                              {getInitials(request.profiles?.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{request.profiles?.username}</h4>
                            <p className="text-sm text-gray-600">
                              {request.profiles?.role} 
                              {request.profiles?.company && ` at ${request.profiles.company}`}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {request.message && (
                        <p className="text-sm bg-gray-50 p-3 rounded mb-3">
                          "{request.message}"
                        </p>
                      )}
                      
                      <div className="flex gap-2">
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending requests</h3>
                  <p className="text-gray-600">New connection requests will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Connections */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Mentees
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/inbox')}
              >
                View All Messages
              </Button>
            </CardHeader>
            <CardContent>
              {mentorData.activeConnections.length > 0 ? (
                <div className="space-y-3">
                  {mentorData.activeConnections.slice(0, 5).map(connection => (
                    <div key={connection.request_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary text-white text-sm">
                            {getInitials(connection.profiles?.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-sm">{connection.profiles?.username}</h4>
                          <p className="text-xs text-gray-600">{connection.profiles?.career_stage}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          // TODO: Navigate to messages with this person
                          alert(`Opening conversation with ${connection.profiles?.username}`);
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active connections</h3>
                  <p className="text-gray-600">Your mentee connections will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="flex items-center gap-2 p-4 h-auto"
                onClick={() => navigate('/community')}
              >
                <Users className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Community</div>
                  <div className="text-sm text-gray-600">See other mentors</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center gap-2 p-4 h-auto"
                onClick={() => navigate('/profile')}
              >
                <Star className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Edit Profile</div>
                  <div className="text-sm text-gray-600">Update your info</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center gap-2 p-4 h-auto"
                onClick={() => navigate('/inbox')}
              >
                <MessageCircle className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Messages</div>
                  <div className="text-sm text-gray-600">Chat with mentees</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center gap-2 p-4 h-auto"
                onClick={() => {
                  // TODO: Add mentor resources/tips
                  alert('Mentor resources coming soon!');
                }}
              >
                <Award className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Resources</div>
                  <div className="text-sm text-gray-600">Mentoring tips</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MentorHomePage;