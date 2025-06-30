import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Camera, 
  Edit3, 
  Save, 
  X, 
  Briefcase, 
  Clock, 
  Trophy,
  Mail,
  Building,
  GraduationCap,
  Plus,
  Users,
  Star,
  CheckCircle,
  Award,
  Calendar,
  Target,
  TrendingUp,
  Sparkles,
  Settings,
  LogOut,
  Shield,
  Heart,
  BookOpen,
  Zap
} from 'lucide-react';

// Background Pattern
// const BackgroundPattern = React.memo(() => (
//   <div className="absolute inset-0 overflow-hidden pointer-events-none">
//     <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-lumos-primary/10 to-lumos-primary-light/5 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
//     <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-lumos-primary/5 to-lumos-primary-muted/10 rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
//   </div>
// ));

// ProfileCard
const ProfileCard = ({ profile, isEditing, onEdit, onSave, onCancel, onProfilePictureChange, userType }) => {
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  const handleProfilePictureClick = () => {
    if (isEditing) {
      document.getElementById('profile-picture-input').click();
    }
  };

  const isPureMentor = userType === 'mentor';
  const isMentor = userType === 'mentor' || userType === 'both';

  return (
    <Card className="card-minimal-hover bg-white/80 backdrop-blur-sm border border-lumos-primary/20 overflow-hidden">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Profile Picture */}
          <div className="relative group">
            <Avatar 
              className="w-32 h-32 ring-4 ring-lumos-primary/20 shadow-lg cursor-pointer hover:ring-lumos-primary/40 transition-all duration-300" 
              onClick={handleProfilePictureClick}
            >
              <AvatarImage 
                src={profile.profile_picture_url} 
                alt={profile.username}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-lumos-primary to-lumos-primary-dark text-white text-3xl font-bold">
                {getInitials(profile.username)}
              </AvatarFallback>
            </Avatar>
            
            {isEditing && (
              <div 
                className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                onClick={handleProfilePictureClick}
              >
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
            
            {/* Verification Badge */}
            {isMentor && profile.mentor_verified && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-fade-in">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            )}
            
            {/* Hidden file input */}
            {isEditing && (
              <input
                type="file"
                id="profile-picture-input"
                accept="image/*"
                onChange={onProfilePictureChange}
                className="hidden"
              />
            )}
          </div>

          {/* Name and Title */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-3xl font-bold text-foreground">
                {profile.username || 'Your Name'}
              </h2>
            </div>
            
            <div className="space-y-2">
              <p className="text-xl text-muted-foreground font-medium">
                {profile.role || 'Your Role'} 
                {profile.company && (
                  <span className="text-lumos-primary"> at {profile.company}</span>
                )}
              </p>
              
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{profile.email}</span>
              </div>
            </div>
            
            {/* User Type Badge */}
            <div className="flex justify-center">
              <Badge className="bg-gradient-to-r from-lumos-primary to-lumos-primary-dark text-white border-0 px-4 py-2 text-sm font-medium">
                {userType === 'mentor' && <><Award className="w-4 h-4 mr-2" />Mentor</>}
                {userType === 'mentee' && <><BookOpen className="w-4 h-4 mr-2" />Mentee</>}
                {userType === 'both' && <><Users className="w-4 h-4 mr-2" />Mentor & Mentee</>}
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 w-full">
            {isPureMentor ? (
              // Mentor stats
              <>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{profile.mentorStats?.totalMentees || 0}</div>
                  <div className="text-xs text-blue-700 font-medium">Total Mentees</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">{profile.mentorStats?.activeConnections || 0}</div>
                  <div className="text-xs text-green-700 font-medium">Active Now</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{profile.mentorStats?.responseRate || 0}%</div>
                  <div className="text-xs text-purple-700 font-medium">Response Rate</div>
                </div>
              </>
            ) : (
              // Learning stats
              <>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{profile.stats?.completedModules || 0}</div>
                  <div className="text-xs text-blue-700 font-medium">Modules Done</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">{profile.stats?.totalHoursLearned || 0}h</div>
                  <div className="text-xs text-green-700 font-medium">Learning Time</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{profile.stats?.currentStreak || 0}</div>
                  <div className="text-xs text-purple-700 font-medium">Day Streak</div>
                </div>
              </>
            )}
          </div>

          {/* Bio Preview */}
          {profile.bio && !isEditing && (
            <div className="w-full p-4 bg-muted/30 rounded-xl border border-border">
              <p className="text-muted-foreground text-center leading-relaxed text-sm">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            {!isEditing ? (
              <Button onClick={onEdit} className="btn-primary-rounded flex-1 hover-lift">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button onClick={onSave} className="btn-primary-rounded flex-1 hover-lift">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={onCancel} variant="outline" className="btn-outline-rounded flex-1">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Skills Section 
const SkillsSection = ({ skills, onUpdateSkills, isEditing, loading }) => {
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsData, setSkillsData] = useState(skills);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSkillsData(skills);
  }, [skills]);

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      const skill = {
        id: Date.now(),
        skill_name: newSkill.trim(),
        category: 'Custom'
      };
      setSkillsData([...skillsData, skill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkillsData(skillsData.filter(skill => 
      skill.skill_id !== skillToRemove.skill_id && skill.id !== skillToRemove.id
    ));
  };

  const handleSaveSkills = async () => {
    setSaving(true);
    try {
      await onUpdateSkills(skillsData);
      setEditingSkills(false);
    } catch (error) {
      console.error('Error saving skills:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddSkill();
    }
  };

  return (
    <Card className="card-minimal-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-lumos-primary" />
          Skills & Expertise
        </CardTitle>
        {!editingSkills ? (
          <Button onClick={() => setEditingSkills(true)} variant="outline" size="sm" disabled={loading} className="btn-outline-rounded">
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Skills
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSaveSkills} size="sm" disabled={saving} className="btn-primary-rounded">
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
            <Button onClick={() => setEditingSkills(false)} variant="outline" size="sm" disabled={saving} className="btn-outline-rounded">
              Cancel
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editingSkills ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={saving}
                className="flex-1"
              />
              <Button onClick={handleAddSkill} size="sm" disabled={saving} className="btn-primary-rounded">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              {skillsData.map((skill) => (
                <Badge 
                  key={skill.skill_id || skill.id} 
                  variant="secondary" 
                  className="flex items-center gap-2 px-3 py-2 bg-lumos-primary-light text-lumos-primary-dark border border-lumos-primary/30 hover:bg-lumos-primary/20 transition-colors"
                >
                  <span>{skill.skill_name}</span>
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-500 transition-colors"
                    disabled={saving}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {skillsData.map((skill) => (
              <Badge 
                key={skill.skill_id || skill.id} 
                className="px-3 py-2 bg-lumos-primary-light text-lumos-primary-dark border border-lumos-primary/30 font-medium"
              >
                {skill.skill_name}
              </Badge>
            ))}
            {skillsData.length === 0 && (
              <p className="text-muted-foreground italic">No skills added yet. Click "Edit Skills" to get started.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile data
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    is_employed: 'no',
    career_stage: 'student',
    company: '',
    role: '',
    weekly_learning_hours: 5,
    preferred_learning_time: 'evening',
    user_type: 'mentee',
    bio: '',
    mentor_bio: '',
    availability_hours: '',
    years_experience: 0,
    mentor_verified: false,
    profile_picture_url: '',
    stats: {
      completedModules: 0,
      totalModules: 0,
      completionPercentage: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalHoursLearned: 0
    },
    mentorStats: {
      totalMentees: 0,
      activeConnections: 0,
      responseRate: 0
    }
  });

  // Skills data
  const [skills, setSkills] = useState([]);

  // Determine user types
  const isPureMentor = profile.user_type === 'mentor';
  const isMentee = profile.user_type === 'mentee' || profile.user_type === 'both';
  const isMentor = profile.user_type === 'mentor' || profile.user_type === 'both';

  // Fetch user profile data from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch profile from database
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }
        
        // Fetch user skills
        const { data: skillsData, error: skillsError } = await supabase
          .from('user_skills')
          .select(`
            skill_id,
            proficiency_level,
            skills (
              skill_id,
              skill_name,
              category
            )
          `)
          .eq('user_id', user.id);

        if (skillsError) {
          console.error('Error fetching skills:', skillsError);
        }

        // Transform skills data
        const transformedSkills = (skillsData || []).map(item => ({
          skill_id: item.skill_id,
          skill_name: item.skills?.skill_name,
          category: item.skills?.category,
          proficiency_level: item.proficiency_level
        }));

        let stats = {
          completedModules: 0,
          totalModules: 0,
          completionPercentage: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalHoursLearned: 0
        };

        let mentorStats = {
          totalMentees: 0,
          activeConnections: 0,
          responseRate: 0
        };

        // Fetch different stats based on user type
        if (profileData?.user_type === 'mentor') {
          // Fetch mentor stats
          const { data: connectionRequests } = await supabase
            .from('connection_requests')
            .select('status')
            .eq('to_user_id', user.id);

          const totalRequests = connectionRequests?.length || 0;
          const acceptedRequests = connectionRequests?.filter(r => r.status === 'accepted').length || 0;
          const respondedRequests = connectionRequests?.filter(r => r.status !== 'pending').length || 0;

          mentorStats = {
            totalMentees: totalRequests,
            activeConnections: acceptedRequests,
            responseRate: totalRequests > 0 ? Math.round((respondedRequests / totalRequests) * 100) : 0
          };
        } else {
          // Fetch learning stats for mentees
          const { data: roadmapData } = await supabase
            .from('user_learning_paths')
            .select(`
              user_learning_paths.*,
              user_module_progress(*)
            `)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          if (roadmapData?.user_module_progress) {
            const modules = roadmapData.user_module_progress;
            stats.totalModules = modules.length;
            stats.completedModules = modules.filter(m => m.is_completed).length;
            stats.completionPercentage = stats.totalModules > 0 ? 
              Math.round((stats.completedModules / stats.totalModules) * 100) : 0;
          }
        }
        
        if (profileData) {
          setProfile({
            username: profileData.username || '',
            email: profileData.email || user.email || '',
            is_employed: profileData.is_employed || 'no',
            career_stage: profileData.career_stage || 'student',
            company: profileData.company || '',
            role: profileData.role || '',
            weekly_learning_hours: profileData.weekly_learning_hours || 5,
            preferred_learning_time: profileData.preferred_learning_time || 'evening',
            user_type: profileData.user_type || 'mentee',
            bio: profileData.bio || '',
            mentor_bio: profileData.mentor_bio || '',
            availability_hours: profileData.availability_hours || '',
            years_experience: profileData.years_experience || 0,
            mentor_verified: profileData.mentor_verified || false,
            profile_picture_url: profileData.profile_picture_url || '',
            stats,
            mentorStats
          });
        }

        setSkills(transformedSkills);
        
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(uploadData.path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, profile_picture_url: publicUrl }));
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setError(`Failed to upload profile picture: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle profile save
  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError('');

      const updateData = {
        username: profile.username,
        is_employed: profile.is_employed,
        career_stage: profile.career_stage,
        company: profile.company,
        role: profile.role,
        user_type: profile.user_type,
        bio: profile.bio,
        updated_at: new Date().toISOString()
      };

      // Add mentor-specific fields
      if (isMentor) {
        updateData.mentor_bio = profile.mentor_bio;
        updateData.availability_hours = profile.availability_hours;
        updateData.years_experience = profile.years_experience;
      }

      // Add mentee-specific fields
      if (isMentee) {
        updateData.weekly_learning_hours = profile.weekly_learning_hours;
        updateData.preferred_learning_time = profile.preferred_learning_time;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setSuccess('Profile updated successfully!');
      setEditMode(false);
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Handle skills update
  const handleUpdateSkills = async (newSkills) => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      const existingSkills = newSkills.filter(skill => skill.skill_id);
      const newSkillNames = newSkills.filter(skill => !skill.skill_id);

      if (existingSkills.length > 0) {
        const skillsToInsert = existingSkills.map(skill => ({
          user_id: user.id,
          skill_id: skill.skill_id,
          proficiency_level: skill.proficiency_level || 3
        }));

        const { error: insertError } = await supabase
          .from('user_skills')
          .insert(skillsToInsert);

        if (insertError) throw insertError;
      }

      for (const newSkill of newSkillNames) {
        const { data: skillData, error: skillError } = await supabase
          .from('skills')
          .insert({
            skill_name: newSkill.skill_name,
            category: newSkill.category || 'Custom'
          })
          .select()
          .single();

        if (skillError) {
          const { data: existingSkill } = await supabase
            .from('skills')
            .select('*')
            .eq('skill_name', newSkill.skill_name)
            .single();

          if (existingSkill) {
            await supabase
              .from('user_skills')
              .insert({
                user_id: user.id,
                skill_id: existingSkill.skill_id,
                proficiency_level: 3
              });
          }
        } else {
          await supabase
            .from('user_skills')
            .insert({
              user_id: user.id,
              skill_id: skillData.skill_id,
              proficiency_level: 3
            });
        }
      }

      const { data: updatedSkillsData, error: fetchError } = await supabase
        .from('user_skills')
        .select(`
          skill_id,
          proficiency_level,
          skills (
            skill_id,
            skill_name,
            category
          )
        `)
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      const transformedSkills = (updatedSkillsData || []).map(item => ({
        skill_id: item.skill_id,
        skill_name: item.skills?.skill_name,
        category: item.skills?.category,
        proficiency_level: item.proficiency_level
      }));

      setSkills(transformedSkills);
      setSuccess('Skills updated successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error updating skills:', error);
      setError(`Failed to update skills: ${error.message}`);
      setTimeout(() => setError(''), 5000);
      throw error;
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out');
      setLoading(false);
    }
  };

  // Show loading state
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
                  <span className="text-muted-foreground font-medium">Loading your profile...</span>
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
      <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50 relative">
        {/* <BackgroundPattern /> */}
        
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-lumos-primary/20 mb-6">
              <User className="w-5 h-5 text-lumos-primary" />
              <span className="text-lumos-primary font-semibold">
                Settings
              </span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-black mb-4">
              {isPureMentor ? 'Mentor Dashboard' : 'Your Profile'}
            </h1>
            <p className="text-muted-foreground text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
              {isPureMentor 
                ? 'Manage your mentor profile and track your mentoring impact' 
                : 'Manage your account settings and track your learning journey'
              }
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl backdrop-blur-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4" />
                {error}
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl backdrop-blur-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            </div>
          )}

          {uploading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl backdrop-blur-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                Uploading profile picture...
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-1 animate-slide-up">
              <ProfileCard
                profile={profile}
                isEditing={editMode}
                onEdit={() => setEditMode(true)}
                onSave={handleSave}
                onCancel={() => setEditMode(false)}
                onProfilePictureChange={handleProfilePictureUpload}
                userType={profile.user_type}
              />
            </div>

            {/* Right Column - Details and Settings */}
            <div className="lg:col-span-2 space-y-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
              {/* Skills Section */}
              <SkillsSection 
                skills={skills}
                onUpdateSkills={handleUpdateSkills}
                isEditing={editMode}
                loading={loading}
              />

              {/* Profile Details */}
              <Card className="card-minimal-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-lumos-primary" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editMode ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Username
                          </label>
                          <Input
                            name="username"
                            value={profile.username}
                            onChange={handleChange}
                            placeholder="Your username"
                            disabled={saving}
                            className="focus:border-lumos-primary focus:ring-lumos-primary/20"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Email
                          </label>
                          <Input
                            name="email"
                            value={profile.email}
                            disabled
                            className="bg-muted/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Bio
                        </label>
                        <Textarea
                          name="bio"
                          value={profile.bio}
                          onChange={handleChange}
                          placeholder="Tell us about yourself..."
                          rows={4}
                          disabled={saving}
                          className="focus:border-lumos-primary focus:ring-lumos-primary/20"
                        />
                      </div>

                      {/* Mentor-specific fields */}
                      {isMentor && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Mentor Bio
                            </label>
                            <Textarea
                              name="mentor_bio"
                              value={profile.mentor_bio}
                              onChange={handleChange}
                              placeholder="Tell potential mentees about your experience and what you can help with..."
                              rows={4}
                              disabled={saving}
                              className="focus:border-lumos-primary focus:ring-lumos-primary/20"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Years of Experience
                              </label>
                              <Input
                                name="years_experience"
                                type="number"
                                value={profile.years_experience}
                                onChange={handleChange}
                                placeholder="Years of experience"
                                disabled={saving}
                                min="0"
                                max="50"
                                className="focus:border-lumos-primary focus:ring-lumos-primary/20"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Availability
                              </label>
                              <select
                                name="availability_hours"
                                value={profile.availability_hours}
                                onChange={handleChange}
                                disabled={saving}
                                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-lumos-primary/20 focus:border-lumos-primary disabled:bg-muted/50 bg-white"
                              >
                                <option value="">Select availability</option>
                                <option value="1-2 hours per week">1-2 hours per week</option>
                                <option value="3-5 hours per week">3-5 hours per week</option>
                                <option value="5-10 hours per week">5-10 hours per week</option>
                                <option value="10+ hours per week">10+ hours per week</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Company
                          </label>
                          <Input
                            name="company"
                            value={profile.company}
                            onChange={handleChange}
                            placeholder="Your company"
                            disabled={saving}
                            className="focus:border-lumos-primary focus:ring-lumos-primary/20"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Role
                          </label>
                          <Input
                            name="role"
                            value={profile.role}
                            onChange={handleChange}
                            placeholder="Your role"
                            disabled={saving}
                            className="focus:border-lumos-primary focus:ring-lumos-primary/20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Career Stage
                          </label>
                          <select
                            name="career_stage"
                            value={profile.career_stage}
                            onChange={handleChange}
                            disabled={saving}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-lumos-primary/20 focus:border-lumos-primary disabled:bg-muted/50 bg-white"
                          >
                            <option value="student">Student</option>
                            <option value="early-career">Early Career (0-2 years)</option>
                            <option value="mid-career">Mid Career (3-7 years)</option>
                            <option value="senior">Senior (8+ years)</option>
                            <option value="career-break">Career Break/Re-entering</option>
                          </select>
                        </div>
                        
                        {/* Mentee-specific fields */}
                        {isMentee && (
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Weekly Learning Hours
                            </label>
                            <Input
                              type="number"
                              name="weekly_learning_hours"
                              value={profile.weekly_learning_hours}
                              onChange={handleChange}
                              min="1"
                              max="40"
                              disabled={saving}
                              className="focus:border-lumos-primary focus:ring-lumos-primary/20"
                            />
                          </div>
                        )}
                      </div>

                      {/* Additional mentee fields */}
                      {isMentee && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Preferred Learning Time
                          </label>
                          <select
                            name="preferred_learning_time"
                            value={profile.preferred_learning_time}
                            onChange={handleChange}
                            disabled={saving}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-lumos-primary/20 focus:border-lumos-primary disabled:bg-muted/50 bg-white"
                          >
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="evening">Evening</option>
                            <option value="late-night">Late Night</option>
                            <option value="weekend">Weekend</option>
                            <option value="no-preference">No Preference</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                        <Building className="w-5 h-5 text-lumos-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Company</p>
                          <p className="font-medium">{profile.company || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                        <Briefcase className="w-5 h-5 text-lumos-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Role</p>
                          <p className="font-medium">{profile.role || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                        <GraduationCap className="w-5 h-5 text-lumos-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Career Stage</p>
                          <p className="font-medium capitalize">
                            {profile.career_stage.replace('-', ' ')}
                          </p>
                        </div>
                      </div>

                      {/* Mentor-specific display fields */}
                      {isMentor && (
                        <>
                          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                            <Star className="w-5 h-5 text-lumos-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Years of Experience</p>
                              <p className="font-medium">{profile.years_experience || 0} years</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                            <Clock className="w-5 h-5 text-lumos-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Availability</p>
                              <p className="font-medium">{profile.availability_hours || 'Not specified'}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Mentee-specific display fields */}
                      {isMentee && (
                        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                          <Clock className="w-5 h-5 text-lumos-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">Weekly Learning</p>
                            <p className="font-medium">{profile.weekly_learning_hours} hours</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                        <User className="w-5 h-5 text-lumos-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">User Type</p>
                          <p className="font-medium">
                            {profile.user_type === 'mentee' && 'Mentee'}
                            {profile.user_type === 'mentor' && 'Mentor'}
                            {profile.user_type === 'both' && 'Mentor & Mentee'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Progress Section */}
              {isPureMentor ? (
                <Card className="card-minimal-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-lumos-primary" />
                      Mentoring Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {profile.mentorStats.totalMentees}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Total Mentees</div>
                        <div className="text-xs text-blue-600 mt-1">All time connections</div>
                      </div>
                      
                      <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Heart className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {profile.mentorStats.activeConnections}
                        </div>
                        <div className="text-sm text-green-700 font-medium">Active Connections</div>
                        <div className="text-xs text-green-600 mt-1">Currently mentoring</div>
                      </div>
                      
                      <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-purple-600 mb-1">
                          {profile.mentorStats.responseRate}%
                        </div>
                        <div className="text-sm text-purple-700 font-medium">Response Rate</div>
                        <div className="text-xs text-purple-600 mt-1">Request responsiveness</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="card-minimal-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-lumos-primary" />
                      Learning Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {profile.stats.completionPercentage}%
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Course Progress</div>
                        <div className="text-xs text-blue-600 mt-1">
                          {profile.stats.completedModules}/{profile.stats.totalModules} modules
                        </div>
                      </div>
                      
                      <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {profile.stats.currentStreak}
                        </div>
                        <div className="text-sm text-green-700 font-medium">Day Streak</div>
                        <div className="text-xs text-green-600 mt-1">
                          Best: {profile.stats.longestStreak} days
                        </div>
                      </div>
                      
                      <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-purple-600 mb-1">
                          {profile.stats.totalHoursLearned}h
                        </div>
                        <div className="text-sm text-purple-700 font-medium">Total Time</div>
                        <div className="text-xs text-purple-600 mt-1">This month</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Settings */}
              <Card className="card-minimal-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-lumos-primary" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/30 rounded-lg flex items-center justify-center">
                        <LogOut className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">Sign Out</h3>
                        <p className="text-sm text-muted-foreground">Sign out from this device</p>
                      </div>
                    </div>
                    <Button onClick={handleSignOut} variant="outline" disabled={loading} className="btn-outline-rounded">
                      {loading ? 'Signing out...' : 'Sign Out'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                        <X className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-red-800">Delete Account</h3>
                        <p className="text-sm text-red-600">Permanently delete your account</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => alert('This feature is not implemented yet.')}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;