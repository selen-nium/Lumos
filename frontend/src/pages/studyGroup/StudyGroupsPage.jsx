import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
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
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  TrendingUp
} from 'lucide-react';

const ITEMS_PER_PAGE = 6;

// Array of stock pictures for study groups
const GROUP_PICTURES = [
  '/Lumos/groupPictures/g1.jpg',
  '/Lumos/groupPictures/g2.jpg',
  '/Lumos/groupPictures/g3.jpg',
  '/Lumos/groupPictures/g4.jpg',
  '/Lumos/groupPictures/g5.jpg',
  '/Lumos/groupPictures/g6.jpg',
  '/Lumos/groupPictures/g7.jpg',
  '/Lumos/groupPictures/g8.jpg',
  '/Lumos/groupPictures/g9.jpg',
  '/Lumos/groupPictures/g10.jpg'
];

const StudyGroupsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studyGroups, setStudyGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [myGroupsPage, setMyGroupsPage] = useState(1);
  
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

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getGroupPicture = (groupId) => {
    // 1) Turn the ID into a string
    const str = String(groupId);

    // 2) Simple string hash (djb2 variant)
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }

    // 3) Make sure it’s positive, then mod by your pictures array length
    const index = Math.abs(hash) % GROUP_PICTURES.length;
    return GROUP_PICTURES[index];
  };

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
            mentor_count: mentorCount || 0,
            picture: getGroupPicture(group.group_id)
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
      
      // Add pictures to my groups
      const groupsWithPictures = (data || []).map(membership => ({
        ...membership,
        picture: getGroupPicture(membership.study_groups?.group_id)
      }));
      
      setMyGroups(groupsWithPictures);
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
      }

      // Determine role based on user's profile
      let groupRole = 'mentee'; // default
      
      if (profileData?.user_type === 'mentor') {
        groupRole = 'mentor';
      } else if (profileData?.user_type === 'both') {
        groupRole = 'mentor';
      }

      const { error } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: groupRole 
        });

      if (error) {
        if (error.code === '23505') {
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

  // Pagination helpers
  const getPaginatedGroups = (groups, page) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return groups.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getTotalPages = (totalItems) => {
    return Math.ceil(totalItems / ITEMS_PER_PAGE);
  };

  const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-outline-rounded"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={page === currentPage ? "btn-primary-rounded" : "btn-outline-rounded"}
            >
              {page}
            </Button>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-outline-rounded"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
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
                  <span className="text-muted-foreground font-medium">Loading study groups...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredGroups = filterGroups();
  const totalPages = getTotalPages(filteredGroups.length);
  const myGroupsTotalPages = getTotalPages(myGroups.length);
  const paginatedGroups = getPaginatedGroups(filteredGroups, currentPage);
  const paginatedMyGroups = getPaginatedGroups(myGroups, myGroupsPage);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12 animate-fade-in">
            <div>
              <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-lumos-primary/20 mb-6">
                <Users className="w-5 h-5 text-lumos-primary" />
                <span className="text-lumos-primary font-semibold">Study Groups</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-black mb-4">
                Learn Together
              </h1>
              <p className="text-muted-foreground text-lg lg:text-xl max-w-2xl leading-relaxed">
                Join skill-focused communities for collaborative learning and peer support
              </p>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="btn-primary-rounded px-6 py-3 text-base font-semibold hover-lift">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-lg bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-lumos-primary" />
                    Create Study Group
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="groupName" className="text-base font-medium">Group Name *</Label>
                    <Input
                      id="groupName"
                      placeholder="e.g., React Mastery, Data Science Beginners"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                      className="text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="groupDescription" className="text-base font-medium">Description *</Label>
                    <Textarea
                      id="groupDescription"
                      placeholder="What will this group focus on? What are the learning goals?"
                      value={newGroup.description}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="text-base resize-none"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateDialog(false)}
                      className="btn-outline-rounded px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={createStudyGroup}
                      disabled={creating}
                      className="btn-primary-rounded px-6"
                    >
                      {creating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Create Group
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="discover" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-white/80 backdrop-blur-sm border border-lumos-primary/20">
                <TabsTrigger value="discover" className="px-6 py-3 data-[state=active]:bg-lumos-primary data-[state=active]:text-black">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Discover Groups
                </TabsTrigger>
                <TabsTrigger value="my-groups" className="px-6 py-3 data-[state=active]:bg-lumos-primary data-[state=active]:text-black">
                  <Users className="h-4 w-4 mr-2" />
                  My Groups ({myGroups.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="discover" className="space-y-8 animate-slide-up">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search groups by name or focus area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base border-lumos-primary/20 focus:border-lumos-primary"
                />
              </div>

              {/* Groups Grid */}
              {paginatedGroups.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {paginatedGroups.map((group) => (
                      <Card key={group.group_id} className="card-minimal-hover overflow-hidden group flex flex-col">
                        <div className="relative h-60 object-cover object-top">
                          <img
                            src={group.picture}
                            alt={group.group_name}
                            className="w-full h-full scale-110 -translate-y-3 group-hover:scale-115 transition-transform duration-300"
                            onError={(e) => {
                              // Fallback to a gradient background if image fails to load
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-lumos-primary to-lumos-primary-dark hidden items-center justify-center">
                            <Users className="h-16 w-16 text-white opacity-50" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-white font-bold text-xl mb-2 line-clamp-2">
                              {group.group_name}
                            </h3>
                          </div>
                        </div>
                        
                        <CardContent className="p-6 flex flex-col h-60">
                          <div className="flex-1">
                            <p className="text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                              {group.group_description}
                            </p>
                            
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-lg">
                                  <Users className="h-4 w-4 text-lumos-primary" />
                                  <span className="font-medium">{group.member_count}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-lg">
                                  <UserCheck className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">{group.mentor_count}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {isUserInGroup(group.group_id) ? (
                              <>
                                <Button 
                                  size="sm" 
                                  className="flex-1 btn-primary-rounded"
                                  onClick={() => navigate(`/study-groups/${group.group_id}`)}
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Open Chat
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => leaveGroup(group.group_id)}
                                  className="btn-outline-rounded"
                                >
                                  Leave
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                className="flex-1 btn-primary-rounded hover-lift"
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

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </>
              ) : (
                <Card className="card-minimal-hover text-center py-16">
                  <CardContent>
                    <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Target className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">No study groups found</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                      {searchQuery ? 'Try adjusting your search criteria to find the perfect group.' : 'Be the first to create a study group and start learning together!'}
                    </p>
                    {!searchQuery && (
                      <Button 
                        onClick={() => setShowCreateDialog(true)}
                        className="btn-primary-rounded px-8"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Group
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="my-groups" className="space-y-8 animate-slide-up">
              {paginatedMyGroups.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {paginatedMyGroups.map((membership) => (
                      <Card key={membership.group_id} className="card-minimal-hover overflow-hidden group">
                        <div className="relative h-60 overflow-hidden">
                          <img
                            src={membership.picture}
                            alt={membership.study_groups?.group_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-lumos-primary to-lumos-primary-dark hidden items-center justify-center">
                            <Users className="h-16 w-16 text-white opacity-50" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <div className="absolute top-4 right-4">
                            <Badge 
                              variant={membership.role === 'mentor' ? 'default' : 'secondary'}
                              className={membership.role === 'mentor' ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'}
                            >
                              {membership.role}
                            </Badge>
                          </div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-white font-bold text-xl mb-2 line-clamp-2">
                              {membership.study_groups?.group_name}
                            </h3>
                          </div>
                        </div>
                        
                        <CardContent className="p-6 flex flex-col h-60">
                          <p className="text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                            {membership.study_groups?.group_description}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 bg-muted/20 px-3 py-2 rounded-lg">
                            <Clock className="h-3 w-3" />
                            Joined {new Date(membership.joined_at).toLocaleDateString()}
                          </div>
                          
                          <div className="flex gap-2 pt-16">
                            <Button 
                              size="sm" 
                              className="flex-1 btn-primary-rounded"
                              onClick={() => navigate(`/study-groups/${membership.study_groups?.group_id}`)}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Open Chat
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => leaveGroup(membership.study_groups?.group_id)}
                              className="btn-outline-rounded"
                            >
                              Leave
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <PaginationControls
                    currentPage={myGroupsPage}
                    totalPages={myGroupsTotalPages}
                    onPageChange={setMyGroupsPage}
                  />
                </>
              ) : (
                <Card className="card-minimal-hover text-center py-16">
                  <CardContent>
                    <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">No study groups yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                      Join or create study groups to start collaborative learning and connect with peers!
                    </p>
                    <Button 
                      onClick={() => setShowCreateDialog(true)}
                      className="btn-primary-rounded px-8"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Group
                    </Button>
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

export default StudyGroupsPage;