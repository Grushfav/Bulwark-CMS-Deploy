import React, { useState, useEffect, useCallback } from 'react';
import { userProfileAPI } from '../lib/api.js';
import { useAuth } from '@/hooks/useAuth.jsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { toast } from 'sonner';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Upload, 
  Edit, 
  Save, 
  Plus,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw
} from 'lucide-react';

const UserProfile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({});
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadSettings();
      // Only load users if the current user is a manager
      if (user.role === 'manager') {
        loadUsers();
      } else {
        // For non-managers, ensure active tab is not 'users'
        if (activeTab === 'users') {
          setActiveTab('profile');
        }
      }
      loadNotifications();
    }
  }, [user, activeTab]);



  const loadProfile = async () => {
    try {
      setLoading(true);
      // Use current user data as base profile
      const currentProfile = {
        first_name: user?.firstName || user?.first_name || '',
        last_name: user?.lastName || user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
        department: user?.department || '',
        position: user?.role || '',
        avatar_url: user?.avatar_url || user?.avatarUrl || user?.avatarPath || '',
        role: user?.role || '',
        isActive: user?.isActive || user?.is_active || true,
        createdAt: user?.createdAt || user?.created_at || '',
        lastLogin: user?.lastLogin || user?.last_login || ''
      };
      
      setProfile(currentProfile);
      
      // Try to fetch additional profile data from backend
      try {
        const response = await userProfileAPI.getProfile();
        if (response.data && response.data.profile) {
          const backendProfile = response.data.profile;
          const mappedProfile = {
            first_name: backendProfile.firstName || backendProfile.first_name || '',
            last_name: backendProfile.lastName || backendProfile.last_name || '',
            email: backendProfile.email || '',
            phone: backendProfile.phone || '',
            department: backendProfile.department || '',
            position: backendProfile.position || backendProfile.role || '',
            avatar_url: backendProfile.avatar_url || backendProfile.avatarUrl || backendProfile.avatarPath || '',
            role: backendProfile.role || '',
            isActive: backendProfile.isActive || backendProfile.is_active || true,
            createdAt: backendProfile.createdAt || backendProfile.created_at || '',
            lastLogin: backendProfile.lastLogin || backendProfile.last_login || ''
          };
          setProfile(mappedProfile);
        }
      } catch (error) {

      }
    } catch (error) {
      toast.error('Failed to load profile');
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await userProfileAPI.getSettings();
      setSettings(response.data.settings || {});
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadUsers = async () => {
    // Only load users if the current user is a manager
    if (user?.role !== 'manager') {
      setUsers([]);
      return;
    }
    
    try {
      const response = await userProfileAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      if (error.response?.status === 403) {

        setUsers([]);
      } else {
        toast.error('Failed to load users');
      }
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await userProfileAPI.getNotifications();
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await userProfileAPI.updateProfile(profileData);
      toast.success('Profile updated successfully');
      loadProfile();
      return response.data;
    } catch (error) {
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const updatePreferences = async (preferences) => {
    try {
      const response = await userProfileAPI.updatePreferences(preferences);
      toast.success('Preferences updated successfully');
      loadSettings();
      return response.data;
    } catch (error) {
      toast.error('Failed to update preferences');
      throw error;
    }
  };

  const updateNotifications = async (notifications) => {
    try {
      const response = await userProfileAPI.updateNotifications(notifications);
      toast.success('Notification settings updated successfully');
      loadSettings();
      return response.data;
    } catch (error) {
      toast.error('Failed to update notification settings');
      throw error;
    }
  };

  const updatePrivacy = async (privacy) => {
    try {
      const response = await userProfileAPI.updatePrivacy(privacy);
      toast.success('Privacy settings updated successfully');
      loadSettings();
      return response.data;
    } catch (error) {
      toast.error('Failed to update privacy settings');
      throw error;
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const response = await userProfileAPI.changePassword(passwordData);
      toast.success('Password changed successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to change password');
      throw error;
    }
  };

  const createUser = async (userData) => {
    try {
      const response = await userProfileAPI.createUser(userData);
      toast.success('User created successfully');
      loadUsers();
      return response.data;
    } catch (error) {
      toast.error('Failed to create user');
      throw error;
    }
  };

  const updateUserById = async (id, userData) => {
    try {
      const response = await userProfileAPI.updateUser(id, userData);
      toast.success('User updated successfully');
      loadUsers();
      return response.data;
    } catch (error) {
      toast.error('Failed to update user');
      throw error;
    }
  };

  const deleteUser = async (id) => {
    try {
      await userProfileAPI.deleteUser(id);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
      throw error;
    }
  };

  const reactivateUser = async (id) => {
    try {
      await userProfileAPI.reactivateUser(id);
      toast.success('User reactivated successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to reactivate user');
      throw error;
    }
  };

  const uploadAvatar = async (file) => {
    try {
      const response = await userProfileAPI.uploadAvatar(file);
      toast.success('Avatar uploaded successfully');
      loadProfile();
      return response.data;
    } catch (error) {
      toast.error('Failed to upload avatar');
      throw error;
    }
  };

  const updateUserProfile = async (profileData) => {
    try {

      
      // Map frontend field names to backend field names (camelCase)
      const mappedData = {
        firstName: profileData.first_name,
        lastName: profileData.last_name,
        phone: profileData.phone,
        department: profileData.department,
        position: profileData.position
      };
      
              const response = await userProfileAPI.updateProfile(mappedData);
      
      toast.success('Profile updated successfully');
      
      // Update local profile state with the response data
      if (response.data && response.data.user) {

        
        const updatedProfile = {
          first_name: response.data.user.firstName || response.data.user.first_name || '',
          last_name: response.data.user.lastName || response.data.user.last_name || '',
          email: response.data.user.email || '',
          phone: response.data.user.phone || '',
          department: response.data.user.department || '',
          position: response.data.user.position || '',
          avatar_url: response.data.user.avatarPath || response.data.user.avatar_url || response.data.user.avatarUrl || '',
          role: response.data.user.role || '',
          isActive: response.data.user.isActive || response.data.user.is_active || true,
          createdAt: response.data.user.createdAt || response.data.user.created_at || '',
          lastLogin: response.data.user.lastLogin || response.data.user.last_login || ''
        };
        
        setProfile(updatedProfile);
        
        // Force reload profile data to ensure UI reflects all changes
        try {
          await loadProfile();
        } catch (reloadError) {
          console.error('Frontend: Profile reload failed:', reloadError);
          // Continue with the update even if reload fails
        }
        
        // Update auth context if it's the current user
        if (response.data.user.email === user?.email) {
          const updatedUser = { ...user, ...response.data.user };
                  try {
          updateUser(updatedUser);
        } catch (authError) {
            console.error('Frontend: Auth context update failed:', authError);
            // Continue even if auth context update fails
          }
        }
      } else {
        console.error('Frontend: Invalid response structure:', response);
        console.error('Frontend: response.data:', response.data);
        console.error('Frontend: response.data.user:', response.data?.user);
      }
      
      return response.data;
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        toast.error(`Profile update failed: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        toast.error('Profile update failed: No response from server. Is the backend running?');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        toast.error(`Profile update failed: ${error.message}`);
      }
      
      throw error;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Improved Mobile Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">User Profile & Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1">
            Manage your profile, settings, and account preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadProfile}
            disabled={loading}
            className="w-full sm:w-auto justify-center sm:justify-start"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">Loading profile data...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full gap-2 ${
             user?.role === 'manager' 
               ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' 
               : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
           }`}>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            {user?.role === 'manager' && (
              <TabsTrigger value="users">Users</TabsTrigger>
            )}
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileTab
              profile={profile}
              onUpdateProfile={updateUserProfile}
              onUploadAvatar={uploadAvatar}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsTab
              settings={settings}
              onUpdatePreferences={updatePreferences}
              onUpdateNotifications={updateNotifications}
              onUpdatePrivacy={updatePrivacy}
            />
          </TabsContent>

          {user?.role === 'manager' && (
            <TabsContent value="users" className="space-y-4">
              <UsersTab
                users={users}
                onCreateUser={createUser}
                onUpdateUser={updateUserById}
                onDeleteUser={deleteUser}
                onReactivateUser={reactivateUser}
              />
            </TabsContent>
          )}

          <TabsContent value="notifications" className="space-y-4">
            <NotificationsTab
              notifications={notifications}
              onMarkRead={userProfileAPI.markNotificationRead}
              onMarkAllRead={userProfileAPI.markAllNotificationsRead}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecurityTab onChangePassword={changePassword} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// ProfileTab component - moved outside main component
const ProfileTab = ({ profile, onUpdateProfile, onUploadAvatar }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    department: profile.department || '',
    position: profile.position || ''
  });

  // Debug: Log when editing state changes


  // Update form data when profile changes
  useEffect(() => {
    setFormData({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      department: profile.department || '',
      position: profile.position || ''
    });
  }, [profile]);

  const handleEditClick = useCallback(() => {
    const newState = !editing;
    setEditing(newState);
  }, [editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onUpdateProfile(formData);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleAvatarUpload = async (e) => {
    if (e.target.files[0]) {
      try {
        await onUploadAvatar(e.target.files[0]);
      } catch (error) {
        console.error('Error uploading avatar:', error);
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                {profile.position || profile.role || 'User'}
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                {profile.email}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant="secondary" className="text-xs">
                  {profile.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {profile.department && (
                  <Badge variant="outline" className="text-xs">
                    {profile.department}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto rounded-full bg-muted flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <Button variant="outline" asChild className="w-full">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Avatar
                  </span>
                </Button>
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white">Profile Information</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={editing ? "default" : "outline"}
                  onClick={handleEditClick}
                  className="w-full sm:w-auto justify-center sm:justify-start"
                >
                  {editing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                  {editing ? "Save" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              
              {editing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>



                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g., Sales, Marketing, IT"
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        placeholder="e.g., Senior Agent, Manager"
                      />
                    </div>
                  </div>





                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="submit" className="w-full sm:w-auto justify-center sm:justify-start">
                      Save Changes
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setEditing(false)}
                      className="w-full sm:w-auto justify-center sm:justify-start"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                      <p className="text-gray-900 dark:text-white">{profile.first_name || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                      <p className="text-gray-900 dark:text-white">{profile.last_name || 'Not set'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-gray-900 dark:text-white">{profile.email || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-gray-900 dark:text-white">{profile.phone || 'Not set'}</p>
                    </div>
                  </div>



                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                      <p className="text-gray-900 dark:text-white">{profile.department || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Position</Label>
                      <p className="text-gray-900 dark:text-white">{profile.position || 'Not set'}</p>
                    </div>
                  </div>




                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const SettingsTab = ({ settings, onUpdatePreferences, onUpdateNotifications, onUpdatePrivacy }) => {
  const [preferences, setPreferences] = useState(settings.preferences || {});
  const [notifications, setNotifications] = useState(settings.notifications || {});
  const [privacy, setPrivacy] = useState(settings.privacy || {});

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    try {
      await onUpdatePreferences(preferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    try {
      await onUpdateNotifications(notifications);
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  const handlePrivacySubmit = async (e) => {
    e.preventDefault();
    try {
      await onUpdatePrivacy(privacy);
    } catch (error) {
      console.error('Error updating privacy:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePreferencesSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  value={preferences.language || 'en'}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={preferences.timezone || 'UTC'}
                  onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Time</option>
                  <option value="PST">Pacific Time</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dark_mode"
                  checked={preferences.dark_mode || false}
                  onChange={(e) => setPreferences({ ...preferences, dark_mode: e.target.checked })}
                />
                <Label htmlFor="dark_mode">Dark Mode</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notifications_enabled"
                  checked={preferences.notifications_enabled || false}
                  onChange={(e) => setPreferences({ ...preferences, notifications_enabled: e.target.checked })}
                />
                <Label htmlFor="notifications_enabled">Enable Notifications</Label>
              </div>
            </div>
            
            <Button type="submit">Save Preferences</Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNotificationsSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Email Notifications</Label>
                <input
                  type="checkbox"
                  checked={notifications.email_enabled || false}
                  onChange={(e) => setNotifications({ ...notifications, email_enabled: e.target.checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>SMS Notifications</Label>
                <input
                  type="checkbox"
                  checked={notifications.sms_enabled || false}
                  onChange={(e) => setNotifications({ ...notifications, sms_enabled: e.target.checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Push Notifications</Label>
                <input
                  type="checkbox"
                  checked={notifications.push_enabled || false}
                  onChange={(e) => setNotifications({ ...notifications, push_enabled: e.target.checked })}
                />
              </div>
            </div>
            
            <Button type="submit">Save Notification Settings</Button>
          </form>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePrivacySubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Profile Visibility</Label>
                <select
                  value={privacy.profile_visibility || 'public'}
                  onChange={(e) => setPrivacy({ ...privacy, profile_visibility: e.target.value })}
                  className="p-2 border rounded"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="team_only">Team Only</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Show Contact Info</Label>
                <input
                  type="checkbox"
                  checked={privacy.show_contact_info || false}
                  onChange={(e) => setPrivacy({ ...privacy, show_contact_info: e.target.checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Show Performance Stats</Label>
                <input
                  type="checkbox"
                  checked={privacy.show_performance_stats || false}
                  onChange={(e) => setPrivacy({ ...privacy, show_performance_stats: e.target.checked })}
                />
              </div>
            </div>
            
            <Button type="submit">Save Privacy Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const UsersTab = ({ users, onCreateUser, onUpdateUser, onDeleteUser, onReactivateUser }) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active && !user.deleted_at) ||
                         (statusFilter === 'suspended' && !user.is_active && !user.deleted_at) ||
                         (statusFilter === 'deleted' && user.deleted_at);
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (user) => {
    if (user.deleted_at) {
      return <Badge variant="destructive" className="text-xs">Deleted</Badge>;
    } else if (user.is_active) {
      return <Badge variant="default" className="text-xs">Active</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">Suspended</Badge>;
    }
  };

  const getRoleBadge = (role) => {
    const variants = {
      manager: 'default',
      agent: 'secondary',
      admin: 'destructive'
    };
    return (
      <Badge variant={variants[role] || 'outline'} className="text-xs capitalize">
        {role}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">User Management</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Manage team members and their access permissions
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="w-full sm:w-auto justify-center sm:justify-start"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
      </div>

      {/* User Count */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>

      {/* Users Table - Mobile Responsive */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-gray-900 dark:text-white">Name</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Email</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Role</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Status</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Department</TableHead>
              <TableHead className="text-gray-900 dark:text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchTerm || statusFilter !== 'all' ? 'No users match your filters' : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.first_name || user.firstName} {user.last_name || user.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.position || user.role || 'No position'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-white">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user)}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-white">
                    {user.department || 'Not set'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {!user.deleted_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                          className="w-full sm:w-auto justify-center sm:justify-start"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {user.deleted_at ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onReactivateUser(user.id)}
                          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto justify-center sm:justify-start"
                        >
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteUser(user.id)}
                          className="w-full sm:w-auto justify-center sm:justify-start"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showCreateDialog && (
        <CreateUserDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateUser={onCreateUser}
        />
      )}

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdate={onUpdateUser}
        />
      )}
    </div>
  );
};

const NotificationsTab = ({ notifications, onMarkRead, onMarkAllRead }) => {
  const handleMarkRead = async (id) => {
    try {
      await onMarkRead(id);
      // Refresh notifications
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await onMarkAllRead();
      // Refresh notifications
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <Button onClick={handleMarkAllRead}>
          Mark All as Read
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => (
          <Card key={notification.id} className={notification.is_read ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-sm text-muted-foreground">{notification.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkRead(notification.id)}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {notifications.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No notifications
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const SecurityTab = ({ onChangePassword }) => {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    try {
      await onChangePassword({
        current_password: formData.current_password,
        new_password: formData.new_password
      });
      setFormData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="current_password">Current Password</Label>
            <div className="relative">
              <Input
                id="current_password"
                type={showPasswords ? "text" : "password"}
                value={formData.current_password}
                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <div>
            <Label htmlFor="new_password">New Password</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPasswords ? "text" : "password"}
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showPasswords ? "text" : "password"}
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                required
              />
            </div>
          </div>
          
          <Button type="submit">Change Password</Button>
        </form>
      </CardContent>
    </Card>
  );
};

const CreateUserDialog = ({ open, onOpenChange, onCreateUser }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'agent',
    department: '',
    position: '',
    is_active: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onCreateUser(formData);
      setOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        role: 'agent',
        department: '',
        position: '',
        is_active: true
      });
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create_first_name">First Name</Label>
              <Input
                id="create_first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="create_last_name">Last Name</Label>
              <Input
                id="create_last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="create_email">Email</Label>
            <Input
              id="create_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create_role">Role</Label>
              <select
                id="create_role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <Label htmlFor="create_department">Department</Label>
              <Input
                id="create_department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="create_position">Position</Label>
            <Input
              id="create_position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="create_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <Label htmlFor="create_is_active">Active</Label>
          </div>
          
          <Button type="submit" className="w-full">Create User</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EditUserDialog = ({ user, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    department: user.department,
    position: user.position,
    is_active: user.is_active
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onUpdate(user.id, formData);
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_first_name">First Name</Label>
              <Input
                id="edit_first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_last_name">Last Name</Label>
              <Input
                id="edit_last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="edit_email">Email</Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_role">Role</Label>
              <select
                id="edit_role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit_department">Department</Label>
              <Input
                id="edit_department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="edit_position">Position</Label>
            <Input
              id="edit_position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="edit_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <Label htmlFor="edit_is_active">Active</Label>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Update User</Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfile;
