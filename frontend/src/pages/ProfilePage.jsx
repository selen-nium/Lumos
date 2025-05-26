import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/common/Layout';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
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
    profile_picture_url: ''
  });
  
  // Learning stats
  const [stats, setStats] = useState({
    completedModules: 0,
    totalModules: 0,
    completionPercentage: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalHoursLearned: 0
  });
  
  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch profile from database
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setProfile({
            username: data.username || '',
            email: data.email || user.email || '',
            is_employed: data.is_employed || 'no',
            career_stage: data.career_stage || 'student',
            company: data.company || '',
            role: data.role || '',
            weekly_learning_hours: data.weekly_learning_hours || 5,
            preferred_learning_time: data.preferred_learning_time || 'evening',
            user_type: data.user_type || 'mentee',
            bio: data.bio || '',
            profile_picture_url: data.profile_picture_url || ''
          });
        }
        
        // Fetch learning stats (mock data for now)
        setStats({
          completedModules: 5,
          totalModules: 8,
          completionPercentage: 62.5,
          currentStreak: 3,
          longestStreak: 7,
          totalHoursLearned: 12
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          email: profile.email,
          is_employed: profile.is_employed,
          career_stage: profile.career_stage,
          company: profile.company,
          role: profile.role,
          weekly_learning_hours: profile.weekly_learning_hours,
          preferred_learning_time: profile.preferred_learning_time,
          user_type: profile.user_type,
          bio: profile.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setSuccess('Profile updated successfully!');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
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
  
  return (
    <Layout>
      <div className="container w-full px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Profile</h1>
            <p className="text-gray-600">Manage your account and view your learning stats</p>
          </header>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              {success}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-btn-dark"></div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8">
              {/* Profile section */}
              <div className="md:w-8/12">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Your Information</h2>
                    <Button 
                      variant={editMode ? "secondary" : "primary"}
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? 'Cancel' : 'Edit Profile'}
                    </Button>
                  </div>
                  
                  {editMode ? (
                    <form onSubmit={handleSubmit}>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-gray-700 font-medium mb-2">Username</label>
                          <Input
                            type="text"
                            name="username"
                            value={profile.username}
                            onChange={handleChange}
                            placeholder="Your username"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 font-medium mb-2">Email</label>
                          <Input
                            type="email"
                            name="email"
                            value={profile.email}
                            onChange={handleChange}
                            placeholder="Your email"
                            disabled
                          />
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 font-medium mb-2">Bio</label>
                          <textarea
                            name="bio"
                            value={profile.bio}
                            onChange={handleChange}
                            placeholder="Tell us about yourself"
                            className="form-input h-24 resize-none"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 font-medium mb-2">Employment Status</label>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <input
                                id="employed-yes"
                                name="is_employed"
                                type="radio"
                                value="yes"
                                checked={profile.is_employed === 'yes'}
                                onChange={handleChange}
                                className="h-4 w-4 text-btn-dark"
                              />
                              <label htmlFor="employed-yes" className="ml-2">Employed</label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="employed-no"
                                name="is_employed"
                                type="radio"
                                value="no"
                                checked={profile.is_employed === 'no'}
                                onChange={handleChange}
                                className="h-4 w-4 text-btn-dark"
                              />
                              <label htmlFor="employed-no" className="ml-2">Not employed</label>
                            </div>
                          </div>
                        </div>
                        
                        {profile.is_employed === 'yes' && (
                          <>
                            <div>
                              <label className="block text-gray-700 font-medium mb-2">Company</label>
                              <Input
                                type="text"
                                name="company"
                                value={profile.company}
                                onChange={handleChange}
                                placeholder="Your company"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-gray-700 font-medium mb-2">Role</label>
                              <Input
                                type="text"
                                name="role"
                                value={profile.role}
                                onChange={handleChange}
                                placeholder="Your role/position"
                              />
                            </div>
                          </>
                        )}
                        
                        <div>
                          <label className="block text-gray-700 font-medium mb-2">Career Stage</label>
                          <select
                            name="career_stage"
                            value={profile.career_stage}
                            onChange={handleChange}
                            className="form-input"
                          >
                            <option value="student">Student</option>
                            <option value="early-career">Early Career (0-2 years)</option>
                            <option value="mid-career">Mid Career (3-7 years)</option>
                            <option value="senior">Senior (8+ years)</option>
                            <option value="career-break">Career Break/Re-entering</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 font-medium mb-2">
                            Weekly Learning Hours
                          </label>
                          <Input
                            type="number"
                            name="weekly_learning_hours"
                            value={profile.weekly_learning_hours}
                            onChange={handleChange}
                            placeholder="Hours per week"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 font-medium mb-2">
                            Preferred Learning Time
                          </label>
                          <select
                            name="preferred_learning_time"
                            value={profile.preferred_learning_time}
                            onChange={handleChange}
                            className="form-input"
                          >
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="evening">Evening</option>
                            <option value="late-night">Late Night</option>
                            <option value="weekend">Weekend</option>
                            <option value="no-preference">No Preference</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 font-medium mb-2">
                            I'd like to be a:
                          </label>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <input
                                id="userType-mentee"
                                name="user_type"
                                type="radio"
                                value="mentee"
                                checked={profile.user_type === 'mentee'}
                                onChange={handleChange}
                                className="h-4 w-4 text-btn-dark"
                              />
                              <label htmlFor="userType-mentee" className="ml-2">Mentee (looking to learn)</label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="userType-mentor"
                                name="user_type"
                                type="radio"
                                value="mentor"
                                checked={profile.user_type === 'mentor'}
                                onChange={handleChange}
                                className="h-4 w-4 text-btn-dark"
                              />
                              <label htmlFor="userType-mentor" className="ml-2">Mentor (looking to guide others)</label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="userType-both"
                                name="user_type"
                                type="radio"
                                value="both"
                                checked={profile.user_type === 'both'}
                                onChange={handleChange}
                                className="h-4 w-4 text-btn-dark"
                              />
                              <label htmlFor="userType-both" className="ml-2">Both</label>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-4 pt-4">
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditMode(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-gray-500 text-sm">Username</h3>
                          <p className="font-medium">{profile.username || '-'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-gray-500 text-sm">Email</h3>
                          <p className="font-medium">{profile.email}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-gray-500 text-sm">Employment Status</h3>
                          <p className="font-medium">{profile.is_employed === 'yes' ? 'Employed' : 'Not employed'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-gray-500 text-sm">Career Stage</h3>
                          <p className="font-medium">
                            {profile.career_stage === 'student' && 'Student'}
                            {profile.career_stage === 'early-career' && 'Early Career (0-2 years)'}
                            {profile.career_stage === 'mid-career' && 'Mid Career (3-7 years)'}
                            {profile.career_stage === 'senior' && 'Senior (8+ years)'}
                            {profile.career_stage === 'career-break' && 'Career Break/Re-entering'}
                          </p>
                        </div>
                        
                        {profile.is_employed === 'yes' && (
                          <>
                            <div>
                              <h3 className="text-gray-500 text-sm">Company</h3>
                              <p className="font-medium">{profile.company || '-'}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-gray-500 text-sm">Role</h3>
                              <p className="font-medium">{profile.role || '-'}</p>
                            </div>
                          </>
                        )}
                        
                        <div>
                          <h3 className="text-gray-500 text-sm">Weekly Learning Hours</h3>
                          <p className="font-medium">{profile.weekly_learning_hours} hours</p>
                        </div>
                        
                        <div>
                          <h3 className="text-gray-500 text-sm">Preferred Learning Time</h3>
                          <p className="font-medium capitalize">{profile.preferred_learning_time.replace('-', ' ')}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-gray-500 text-sm">User Type</h3>
                          <p className="font-medium">
                            {profile.user_type === 'mentee' && 'Mentee (looking to learn)'}
                            {profile.user_type === 'mentor' && 'Mentor (looking to guide others)'}
                            {profile.user_type === 'both' && 'Both mentee and mentor'}
                          </p>
                        </div>
                      </div>
                      
                      {profile.bio && (
                        <div>
                          <h3 className="text-gray-500 text-sm">Bio</h3>
                          <p className="font-medium">{profile.bio}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold mb-6">Account Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-gray-700 font-medium mb-2">Sign Out</h3>
                      <p className="text-gray-600 text-sm mb-3">Sign out of your account on this device.</p>
                      <Button 
                        variant="secondary" 
                        onClick={handleSignOut}
                        disabled={loading}
                      >
                        Sign Out
                      </Button>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h3 className="text-gray-700 font-medium mb-2">Delete Account</h3>
                      <p className="text-gray-600 text-sm mb-3">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button 
                        variant="primary" 
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          // Show confirmation dialog before deletion
                          alert('This feature is not implemented yet.');
                        }}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Stats sidebar */}
              <div className="md:w-4/12">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-bold mb-6">Your Progress</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-gray-500 text-sm mb-1">Progress</h3>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{stats.completionPercentage}% Complete</p>
                        <p className="text-sm text-gray-500">{stats.completedModules}/{stats.totalModules} modules</p>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-btn-dark h-full rounded-full" 
                          style={{ width: `${stats.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-gray-500 text-sm">Current Streak</h3>
                        <p className="text-2xl font-bold">{stats.currentStreak} days</p>
                      </div>
                      
                      <div>
                        <h3 className="text-gray-500 text-sm">Longest Streak</h3>
                        <p className="text-2xl font-bold">{stats.longestStreak} days</p>
                      </div>
                      
                      <div>
                        <h3 className="text-gray-500 text-sm">Total Time</h3>
                        <p className="text-2xl font-bold">{stats.totalHoursLearned} hours</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary-light rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Keep Learning!</h2>
                  <p className="text-gray-600 mb-6">
                    Continue your learning journey and maintain your streak by completing at least one task each day.
                  </p>
                  <Button 
                    variant="primary" 
                    onClick={() => navigate('/home')}
                    fullWidth
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;