import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '@/components/common/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Plus, 
  Search, 
  MessageCircle, 
  Target,
  Clock,
  UserCheck,
  UserPlus
} from 'lucide-react';

const StudyGroupsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studyGroups, setStudyGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Create group form state
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    targetSkill: ''
  });

  useEffect(() => {
    if (user) {
      fetchStudyGroups();
      fetchMyGroups();
    }
  }, [user]);

  const fetchStudyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          member_count:study_group_members(count),
          mentor_count:study_group_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get member counts
      const groupsWithCounts = await Promise.all(
        (data || []).map(async (group) => {
          const { count: totalMembers } = await supabase
            .from('study_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.group_id);

          const { count: mentorCount } = await supabase
            .from('study_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.group_id)
            .eq('role', 'mentor');

          return {
            ...group,
            member_count: totalMembers || 0,
            mentor_count: mentorCount || 0
          };
        })
      );

      setStudyGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error fetching study groups:', error);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('study_group_members')
        .select(`
          *,
          study_groups (
            group_id,
            group_name,
            group_description,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setMyGroups(data || []);
    } catch (error) {
      console.error('Error fetching my groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStudyGroup = async () => {
    if (!newGroup.name.trim() || !newGroup.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);

      // Create study group
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          group_name: newGroup.name.trim(),
          group_description: newGroup.description.trim()
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as first member (mentor)
      const { error: memberError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: group.group_id,
          user_id: user.id,
          role: 'mentor'
        });

      if (memberError) throw memberError;

      // Reset form and close dialog
      setNewGroup({ name: '', description: '', targetSkill: '' });
      setShowCreateDialog(false);
      
      // Refresh data
      await fetchStudyGroups();
      await fetchMyGroups();
      
      alert('Study group created successfully!');
      
    } catch (error) {
      console.error('Error creating study group:', error);
      alert('Failed to create study group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const joinGroup = async (groupId) => {
    try {
      // get the user's profile to determine their role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Fallback to mentee if we can't determine role
      }

      // Determine role based on user's profile
      let groupRole = 'mentee'; // default
      
      if (profileData?.user_type === 'mentor') {
        groupRole = 'mentor';
      } else if (profileData?.user_type === 'both') {
        // For users who are both default to mentor
        groupRole = 'mentor';
      }

      console.log('User profile type:', profileData?.user_type, 'Joining as:', groupRole);

      const { error } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: groupRole
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          alert('You are already a member of this group');
        } else {
          throw error;
        }
        return;
      }

      // Refresh data
      await fetchStudyGroups();
      await fetchMyGroups();
      
      alert(`Successfully joined the study group as a ${groupRole}!`);
      
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group. Please try again.');
    }
  };

  const leaveGroup = async (groupId) => {
    if (!confirm('Are you sure you want to leave this study group?')) return;

    try {
      const { error } = await supabase
        .from('study_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh data
      await fetchStudyGroups();
      await fetchMyGroups();
      
      alert('Left the study group successfully');
      
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group. Please try again.');
    }
  };

  const filterGroups = () => {
    if (!searchQuery) return studyGroups;
    const q = searchQuery.toLowerCase();
    return studyGroups.filter(group =>
      group.group_name?.toLowerCase().includes(q) ||
      group.group_description?.toLowerCase().includes(q)
    );
  };

  const isUserInGroup = (groupId) => {
    return myGroups.some(membership => 
      membership.study_groups?.group_id === groupId
    );
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
            <span className="ml-3">Loading study groups...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Study Groups</h1>
            <p className="text-gray-600">Join skill-focused communities for collaborative learning</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Study Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name *</Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., React Mastery, Data Science Beginners"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="groupDescription">Description *</Label>
                  <Textarea
                    id="groupDescription"
                    placeholder="What will this group focus on? What are the learning goals?"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createStudyGroup}
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Group'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="discover" className="w-full">
          <TabsList>
            <TabsTrigger value="discover">Discover Groups</TabsTrigger>
            <TabsTrigger value="my-groups">My Groups ({myGroups.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search groups by name or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterGroups().map((group) => (
                <Card key={group.group_id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{group.group_name}</CardTitle>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {group.group_description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {group.member_count} members
                        </div>
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-4 w-4" />
                          {group.mentor_count} mentors
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {isUserInGroup(group.group_id) ? (
                        <>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              console.log('Navigating to group:', group.group_id);
                              navigate(`/study-groups/${group.group_id}`);
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Open Chat
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => leaveGroup(group.group_id)}
                          >
                            Leave
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => joinGroup(group.group_id)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Join Group
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filterGroups().length === 0 && (
              <Card className="p-8 text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No study groups found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? 'Try adjusting your search criteria.' : 'Be the first to create a study group!'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Group
                  </Button>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="my-groups" className="space-y-6">
            {myGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myGroups.map((membership) => (
                  <Card key={membership.group_id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">
                              {membership.study_groups?.group_name}
                            </CardTitle>
                            <Badge variant={membership.role === 'mentor' ? 'default' : 'secondary'}>
                              {membership.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {membership.study_groups?.group_description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                        <Clock className="h-3 w-3" />
                        Joined {new Date(membership.joined_at).toLocaleDateString()}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            console.log('Navigating to group:', membership.study_groups?.group_id);
                            navigate(`/study-groups/${membership.study_groups?.group_id}`);
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Open Chat
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => leaveGroup(membership.study_groups?.group_id)}
                        >
                          Leave
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No study groups yet</h3>
                <p className="text-gray-600 mb-4">
                  Join or create study groups to start collaborative learning!
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default StudyGroupsPage;