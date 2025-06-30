import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
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
  Info,
  Crown,
  Star,
  Heart,
  ThumbsUp,
  Smile,
  Circle,
  Clock
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
      console.log('Navigating to group:', groupId);
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
      .channel(`messages:${groupId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        }, 
        (payload) => {
          console.log('New message received:', payload);
          setMessages(prev => [...prev, payload.new]);
          fetchMessageWithProfile(payload.new.message_id);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
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
          profiles (
            id,
            username,
            role,
            company,
            profile_picture_url
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
          profiles (
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
          profiles (
            id,
            username,
            role,
            company,
            profile_picture_url
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
    }
  };

  const fetchWeeklyGoals = async () => {
    try {
      console.log('Fetching weekly goals for group:', groupId);
      
      // Get current week start (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      console.log('Current week start:', weekStart.toISOString().split('T')[0]);

      // Fetch goals without foreign key join
      const { data: goalsData, error: goalsError } = await supabase
        .from('group_goals')
        .select('*')
        .eq('group_id', groupId)
        .gte('week_start_date', weekStart.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Fetch profiles separately for each goal
      let goalsWithProfiles = [];
      if (goalsData && goalsData.length > 0) {
        const userIds = [...new Set(goalsData.map(goal => goal.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, role, company')
          .in('id', userIds);

        if (profilesError) {
          console.warn('Could not fetch profiles:', profilesError);
          // Use goals without profile data
          goalsWithProfiles = goalsData.map(goal => ({ ...goal, profiles: null }));
        } else {
          // Merge goals with profiles
          goalsWithProfiles = goalsData.map(goal => ({
            ...goal,
            profiles: profilesData.find(profile => profile.id === goal.user_id) || null
          }));
        }
      } else {
        goalsWithProfiles = goalsData || [];
      }
      
      console.log('Fetched goals data:', goalsWithProfiles);
      setWeeklyGoals(goalsWithProfiles);
      
    } catch (error) {
      console.error('Error fetching weekly goals:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          message_text: newMessage.trim()
        })
        .select(`
          *,
          profiles (
            id,
            username,
            role,
            company,
            profile_picture_url
          )
        `)
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
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

  const getRoleIcon = (role) => {
    if (role === 'mentor') return <Crown className="h-3 w-3" />;
    return <Star className="h-3 w-3" />;
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'mentor') return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    return 'bg-gradient-to-r from-blue-400 to-blue-500 text-white';
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-fade-in">
              <div className="text-center mb-12 space-y-4">
                <div className="h-8 bg-muted/30 rounded-lg w-64 mx-auto animate-pulse"></div>
                <div className="h-4 bg-muted/20 rounded w-32 mx-auto animate-pulse"></div>
              </div>
              
              <div className="flex justify-center items-center h-32">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumos-primary"></div>
                  <span className="text-muted-foreground font-medium">Loading group chat...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-6 mb-8 animate-fade-in">
            <Button 
              variant="outline" 
              onClick={() => navigate('/study-groups')}
              className="btn-outline-rounded hover-lift"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
            
      
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Chat Section */}
            <div className="lg:col-span-3">
              <Card className="card-minimal-hover overflow-hidden">
                <CardHeader className="border-b">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-lumos-primary" />
                    Group Chat
                  </CardTitle>
                </CardHeader>
                
                {/* Messages */}
                <CardContent className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-lumos-primary-light/10">
                  {messages.map((message) => (
                    <div 
                      key={message.message_id} 
                      className={`flex gap-4 animate-fade-in ${
                        message.sender_id === user.id ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <Avatar className="w-10 h-10 ring-2 ring-white shadow-lg">
                        
                        <AvatarFallback className={`text-white font-bold ${
                          getUserRole(message.sender_id) === 'mentor' 
                            ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                        }`}>
                          {getInitials(message.profiles?.username)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`flex-1 max-w-md ${
                        message.sender_id === user.id ? 'text-right' : ''
                      }`}>
                        <div className={`flex items-center gap-2 mb-2 ${
                          message.sender_id === user.id ? 'justify-end' : 'justify-start'
                        }`}>
                          {message.sender_id !== user.id && (
                            <>
                              <span className="text-sm font-bold text-foreground">
                                {message.profiles?.username}
                              </span>
                              <Badge className={`text-xs ${getRoleBadgeStyle(getUserRole(message.sender_id))}`}>
                                {getRoleIcon(getUserRole(message.sender_id))}
                                <span className="ml-1">{getUserRole(message.sender_id)}</span>
                              </Badge>
                            </>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatMessageTime(message.sent_at)}
                          </span>
                        </div>
                        
                        <div className={`inline-block p-4 rounded-2xl shadow-md max-w-full ${
                          message.sender_id === user.id
                            ? 'bg-gradient-to-r from-lumos-primary to-lumos-primary-dark text-white chat-user-message'
                            : 'bg-white border border-lumos-primary/10 text-foreground'
                        }`}>
                          <p className="text-sm leading-relaxed break-words">{message.message_text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Start the conversation!</h3>
                      <p className="text-muted-foreground">Be the first to send a message to the group.</p>
                    </div>
                  )}
                </CardContent>
                
                {/* Message Input */}
                <div className="p-6 bg-gradient-to-r from-white to-lumos-primary-light/20 border-t">
                  <form onSubmit={sendMessage} className="flex gap-3">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 h-12 border-lumos-primary/20 focus:border-lumos-primary rounded-xl"
                    />
                    <Button 
                      type="submit" 
                      disabled={sending || !newMessage.trim()}
                      className="btn-primary-rounded h-12 px-6 hover-lift"
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="">
                <div className="flex gap-3 mb-2">
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-black">
                      {group?.group_name}
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{members.length} members</span>
                      <div className="flex items-center gap-1 ml-2">
                        <Circle className="h-3 w-3 text-green-500 fill-current" />
                        <span className="text-sm">Active now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Members Card */}
              <Card className="card-minimal-hover overflow-hidden">
                <CardHeader className="">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Members ({members.length})
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="">
                  {members.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/20 transition-colors">
                      <div className="relative">
                        <Avatar className="w-10 h-10 ring-2 ring-white shadow-md">
                          <AvatarFallback className={`text-white font-bold ${
                            member.role === 'mentor' 
                              ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                              : 'bg-gradient-to-br from-blue-500 to-blue-600'
                          }`}>
                            {getInitials(member.profiles?.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {member.profiles?.username}
                          {member.user_id === user.id && (
                            <span className="text-lumos-primary ml-1">(You)</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${getRoleBadgeStyle(member.role)}`}>
                            {getRoleIcon(member.role)}
                            <span className="ml-1">{member.role}</span>
                          </Badge>
                          {member.profiles?.company && (
                            <span className="text-xs text-muted-foreground truncate">
                              {member.profiles.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Weekly Goals */}
              <Card className="card-minimal-hover overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Weekly Goals
                  </CardTitle>
                  <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="btn-primary-rounded">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="sm:max-w-lg bg-white">
                      <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                          <Target className="h-6 w-6 text-lumos-primary" />
                          Add Weekly Goal
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="goalText" className="text-base font-medium">Your goal for this week</Label>
                          <Textarea
                            id="goalText"
                            placeholder="e.g., Complete React tutorial, Build a todo app, Practice algorithms..."
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                            rows={4}
                            className="resize-none"
                          />
                        </div>
                        
                        <div className="flex justify-end gap-3">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowAddGoal(false)}
                            className="btn-outline-rounded px-6"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={addWeeklyGoal}
                            className="btn-primary-rounded px-6"
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Add Goal
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                
                <CardContent className="p-4 max-h-96 overflow-y-auto space-y-4">
                  {weeklyGoals.length > 0 ? (
                    weeklyGoals.map((goal) => (
                      <div 
                        key={goal.goal_id} 
                        className={`p-4 rounded-xl border transition-all hover-lift ${
                          goal.is_completed 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                            : 'bg-gradient-to-r from-white to-lumos-primary-light/10 border-lumos-primary/20'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className={`text-white font-bold text-xs ${
                                getUserRole(goal.user_id) === 'mentor' 
                                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                                  : 'bg-gradient-to-br from-blue-500 to-blue-600'
                              }`}>
                                {getInitials(goal.profiles?.username)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-sm truncate">
                              {goal.profiles?.username}
                            </span>
                            {goal.is_completed && (
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className={`text-sm leading-relaxed ${
                            goal.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}>
                            {goal.goal_text}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => reactToGoal(goal.goal_id, '👍')}
                                className="h-6 px-2 text-xs hover:bg-blue-50 rounded-lg"
                              >
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                {Object.values(goal.reactions || {}).filter(r => r === '👍').length}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => reactToGoal(goal.goal_id, '❤️')}
                                className="h-6 px-2 text-xs hover:bg-red-50 rounded-lg"
                              >
                                <Heart className="h-3 w-3 mr-1" />
                                {Object.values(goal.reactions || {}).filter(r => r === '❤️').length}
                              </Button>
                            </div>
                            
                            {goal.user_id === user.id && (
                              <Button
                                size="sm"
                                variant={goal.is_completed ? "outline" : "default"}
                                onClick={() => toggleGoalCompletion(goal.goal_id, goal.is_completed)}
                                className={`text-xs ${goal.is_completed ? "btn-outline-rounded" : "btn-primary-rounded"}`}
                              >
                                {goal.is_completed ? '↶' : '✓'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-semibold mb-2">No goals yet</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Add your first weekly goal!
                      </p>
                      <Button 
                        onClick={() => setShowAddGoal(true)}
                        size="sm"
                        className="btn-primary-rounded"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Goal
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GroupChatPage;