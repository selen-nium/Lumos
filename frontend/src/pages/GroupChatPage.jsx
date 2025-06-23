import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '@/components/common/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Send, 
  ArrowLeft, 
  MessageCircle, 
  Users,
  Target,
  Plus,
  CheckCircle2,
  Calendar,
  Info
} from 'lucide-react';

const GroupChatPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [sending, setSending] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user && groupId) {
      fetchGroupData();
      fetchMessages();
      fetchWeeklyGoals();
    }
  }, [user, groupId]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Real-time message subscription
  useEffect(() => {
    if (!groupId) return;

    console.log('Setting up real-time subscription for group:', groupId);

    const subscription = supabase
      .from(`messages:group_id=eq.${groupId}`)
      .on('INSERT', (payload) => {
        setMessages(prev => [...prev, payload.new]);
        fetchMessageWithProfile(payload.new.message_id);
      })
      .subscribe()

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [groupId]);

  // Real-time goals subscription
  useEffect(() => {
    if (!groupId) return;

    const goalsSubscription = supabase
      .channel(`group_goals:${groupId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'group_goals',
          filter: `group_id=eq.${groupId}`
        }, 
        () => {
          fetchWeeklyGoals();
        }
      )
      .subscribe();

    return () => {
      goalsSubscription.unsubscribe();
    };
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .select('*')
        .eq('group_id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Check if user is a member
      const { data: membership, error: memberError } = await supabase
        .from('study_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !membership) {
        alert('You are not a member of this group');
        navigate('/study-groups');
        return;
      }

      // Fetch all members
      const { data: membersData, error: membersError } = await supabase
        .from('study_group_members')
        .select(`
          *,
          profiles!study_group_members_user_id_fkey (
            id,
            username,
            role,
            company
          )
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);

    } catch (error) {
      console.error('Error fetching group data:', error);
      alert('Error loading group. Redirecting back to study groups.');
      navigate('/study-groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_sender_id_fkey (
            id,
            username,
            role,
            company
          )
        `)
        .eq('group_id', groupId)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchMessageWithProfile = async (messageId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!messages_sender_id_fkey (
            id,
            username,
            role,
            company
          )
        `)
        .eq('message_id', messageId)
        .single();

      if (error) throw error;
      
      if (data) {
        // Update the message in state with profile data
        setMessages(prev => 
          prev.map(msg => 
            msg.message_id === messageId 
              ? { ...msg, profiles: data.profiles }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error fetching message profile:', error);
      // Don't worry if profile fetch fails - message will still display
    }
  };

  const fetchWeeklyGoals = async () => {
    try {
      console.log('Fetching weekly goals for group:', groupId);
      
      // Get current week start (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      console.log('Current week start:', weekStart.toISOString().split('T')[0]);

      // First, try with the foreign key relationship
      let { data, error } = await supabase
        .from('group_goals')
        .select(`
          *,
          profiles!group_goals_user_id_fkey (
            id,
            username,
            role,
            company
          )
        `)
        .eq('group_id', groupId)
        .gte('week_start_date', weekStart.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      // If foreign key relationship fails, fetch goals and profiles separately
      if (error && error.code === 'PGRST200') {
        console.log('Foreign key relationship not found, fetching data separately...');
        
        // Fetch goals without profile join
        const { data: goalsData, error: goalsError } = await supabase
          .from('group_goals')
          .select('*')
          .eq('group_id', groupId)
          .gte('week_start_date', weekStart.toISOString().split('T')[0])
          .order('created_at', { ascending: false });

        if (goalsError) throw goalsError;

        // Fetch profiles separately for each goal
        if (goalsData && goalsData.length > 0) {
          const userIds = [...new Set(goalsData.map(goal => goal.user_id))];
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, role, company')
            .in('id', userIds);

          if (profilesError) {
            console.warn('Could not fetch profiles:', profilesError);
            // Use goals without profile data
            data = goalsData.map(goal => ({ ...goal, profiles: null }));
          } else {
            // Merge goals with profiles
            data = goalsData.map(goal => ({
              ...goal,
              profiles: profilesData.find(profile => profile.id === goal.user_id) || null
            }));
          }
        } else {
          data = goalsData;
        }
      } else if (error) {
        throw error;
      }
      
      console.log('Fetched goals data:', data);
      setWeeklyGoals(data || []);
      
    } catch (error) {
      console.error('Error fetching weekly goals:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);

      const { data: [inserted], error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          message_text: newMessage.trim()
        })
        .select(`
          *,
          profiles!messages_sender_id_fkey (
            id,
            username,
            role,
            company
          )
        `);
      if (error) throw error;

      setMessages(prev => [...prev, inserted]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const addWeeklyGoal = async () => {
    if (!newGoal.trim()) {
      alert('Please enter a goal');
      return;
    }

    try {
      // Calculate current week start
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysToMonday);

      const { data, error } = await supabase
        .from('group_goals')
        .insert({
          group_id: groupId,
          user_id: user.id,
          goal_text: newGoal.trim(),
          week_start_date: weekStart.toISOString().split('T')[0]
        })
        .select();

      if (error) throw error;

      console.log('Goal added successfully:', data);
      
      setNewGoal('');
      setShowAddGoal(false);
      
      // Manually refresh goals to ensure immediate update
      await fetchWeeklyGoals();
      
    } catch (error) {
      console.error('Error adding goal:', error);
      if (error.code === '23505') { // Unique constraint
        alert('You already have a goal for this week');
      } else {
        alert('Failed to add goal. Please try again.');
      }
    }
  };

  const toggleGoalCompletion = async (goalId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('group_goals')
        .update({ 
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('goal_id', goalId)
        .eq('user_id', user.id); // Only allow users to update their own goals

      if (error) throw error;
      
      // Manually refresh goals to show immediate update
      await fetchWeeklyGoals();
      
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal. Please try again.');
    }
  };

  const reactToGoal = async (goalId, emoji) => {
    try {
      // Get current reactions
      const { data: goal, error: fetchError } = await supabase
        .from('group_goals')
        .select('reactions')
        .eq('goal_id', goalId)
        .single();

      if (fetchError) throw fetchError;

      const currentReactions = goal.reactions || {};
      
      // Toggle user's reaction
      if (currentReactions[user.id] === emoji) {
        delete currentReactions[user.id]; // Remove reaction
      } else {
        currentReactions[user.id] = emoji; // Add/change reaction
      }

      const { error } = await supabase
        .from('group_goals')
        .update({ reactions: currentReactions })
        .eq('goal_id', goalId);

      if (error) throw error;
      
      // Manually refresh goals to show reaction updates
      await fetchWeeklyGoals();
      
    } catch (error) {
      console.error('Error reacting to goal:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserRole = (userId) => {
    const member = members.find(m => m.user_id === userId);
    return member?.role || 'mentee';
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-3">Loading group chat...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/study-groups')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{group?.group_name}</h1>
            <p className="text-gray-600 text-sm">{members.length} members</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Section */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="chat" className="w-full">
              <TabsList>
                <TabsTrigger value="chat">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="goals">
                  <Target className="h-4 w-4 mr-2" />
                  Weekly Goals ({weeklyGoals.length})
                </TabsTrigger>
              </TabsList>

              {/* Chat Tab */}
              <TabsContent value="chat">
                <Card className="h-[600px] flex flex-col">
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg">Group Chat</CardTitle>
                  </CardHeader>
                  
                  {/* Messages */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div 
                        key={message.message_id} 
                        className={`flex gap-3 ${
                          message.sender_id === user.id ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(message.profiles?.username)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={`flex-1 max-w-xs ${
                          message.sender_id === user.id ? 'text-right' : ''
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {message.sender_id !== user.id && (
                              <>
                                <span className="text-sm font-medium">
                                  {message.profiles?.username}
                                </span>
                                <Badge 
                                  variant={getUserRole(message.sender_id) === 'mentor' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {getUserRole(message.sender_id)}
                                </Badge>
                              </>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatMessageTime(message.sent_at)}
                            </span>
                          </div>
                          
                          <div className={`inline-block p-3 rounded-lg ${
                            message.sender_id === user.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.message_text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </CardContent>
                  
                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={sending || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </Card>
              </TabsContent>

              {/* Weekly Goals Tab */}
              <TabsContent value="goals">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Weekly Goals</CardTitle>
                    <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Goal
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Weekly Goal</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="goalText">Your goal for this week</Label>
                            <Textarea
                              id="goalText"
                              placeholder="e.g., Complete React tutorial, Build a todo app, Practice algorithms..."
                              value={newGoal}
                              onChange={(e) => setNewGoal(e.target.value)}
                              rows={3}
                            />
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setShowAddGoal(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={addWeeklyGoal}>
                              Add Goal
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {weeklyGoals.length > 0 ? (
                      weeklyGoals.map((goal) => (
                        <div 
                          key={goal.goal_id} 
                          className={`p-4 rounded-lg border ${
                            goal.is_completed ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">
                                  {goal.profiles?.username}
                                </span>
                                <Badge 
                                  variant={getUserRole(goal.user_id) === 'mentor' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {getUserRole(goal.user_id)}
                                </Badge>
                                {goal.is_completed && (
                                  <Badge variant="success" className="text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              
                              <p className={`text-sm ${
                                goal.is_completed ? 'line-through text-gray-600' : ''
                              }`}>
                                {goal.goal_text}
                              </p>
                              
                              <div className="flex items-center gap-4 mt-3">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Week of {new Date(goal.week_start_date).toLocaleDateString()}
                                </span>
                                
                                {/* Reactions */}
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => reactToGoal(goal.goal_id, '👍')}
                                    className="h-6 px-2 text-xs"
                                  >
                                    👍 {Object.values(goal.reactions || {}).filter(r => r === '👍').length}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => reactToGoal(goal.goal_id, '❤️')}
                                    className="h-6 px-2 text-xs"
                                  >
                                    ❤️ {Object.values(goal.reactions || {}).filter(r => r === '❤️').length}
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {goal.user_id === user.id && (
                              <Button
                                size="sm"
                                variant={goal.is_completed ? "outline" : "default"}
                                onClick={() => toggleGoalCompletion(goal.goal_id, goal.is_completed)}
                              >
                                {goal.is_completed ? 'Mark Incomplete' : 'Mark Complete'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No goals for this week</h3>
                        <p className="text-gray-600 mb-4">
                          Be the first to add a weekly goal for accountability!
                        </p>
                        <Button onClick={() => setShowAddGoal(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Goal
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members ({members.length})
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.profiles?.username)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.profiles?.username}
                        {member.user_id === user.id && ' (You)'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={member.role === 'mentor' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {member.role}
                        </Badge>
                        {member.profiles?.company && (
                          <span className="text-xs text-gray-500 truncate">
                            {member.profiles.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Group Info */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  About
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-gray-600">
                  {group?.group_description}
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  Created {new Date(group?.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GroupChatPage;