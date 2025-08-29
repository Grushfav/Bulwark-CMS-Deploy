import React, { useState, useEffect } from 'react';
import { teamAPI, userProfileAPI, reportsAPI, authAPI } from '../lib/api.js';
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
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  DollarSign,
  Target,
  TrendingUp,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';

// Helper function to safely access nested properties
const safeGet = (obj, path, defaultValue = 0) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : defaultValue;
  }, obj);
};

// Helper function to format numbers safely
const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

const CreateMemberDialog = ({ onCreateMember }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'agent',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // FIXED: Use the correct API endpoint for creating users
      const response = await userProfileAPI.createUser(formData);
      
      if (response && (response.user || response.data?.user)) {
        toast.success('Team member created successfully');
        setOpen(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'agent',
          password: ''
        });
        setErrors({});
        onCreateMember();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error creating team member:', error);
      
      if (error.response?.status === 409) {
        toast.error('A user with this email already exists');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Manager role required.');
      } else if (error.response?.data?.details) {
        // Handle validation errors from backend
        const backendErrors = {};
        error.response.data.details.forEach(detail => {
          backendErrors[detail.path] = detail.msg;
        });
        setErrors(backendErrors);
        toast.error('Please fix the validation errors');
      } else {
        toast.error(`Failed to create team member: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'agent',
      password: ''
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={errors.firstName ? 'border-red-500' : ''}
                required
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={errors.lastName ? 'border-red-500' : ''}
                required
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={errors.email ? 'border-red-500' : ''}
              required
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="senior">Senior Agent</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={errors.password ? 'border-red-500' : ''}
              required
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Creating...' : 'Create Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PasswordResetDialog = ({ member, onPasswordReset, open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.new_password || formData.new_password.length < 6) {
      newErrors.new_password = 'Password must be at least 6 characters long';
    }
    
    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await onPasswordReset(member.id, formData.new_password);
      setFormData({ new_password: '', confirm_password: '' });
      setErrors({});
      onOpenChange(false);
      toast.success('Password reset successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ new_password: '', confirm_password: '' });
    setErrors({});
    setShowPassword(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Reset Password for {safeGet(member, 'firstName', '')} {safeGet(member, 'lastName', '')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="new_password">New Password *</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPassword ? "text" : "password"}
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                className={errors.new_password ? 'border-red-500' : ''}
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.new_password && (
              <p className="text-sm text-red-500 mt-1">{errors.new_password}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="confirm_password">Confirm New Password *</Label>
            <Input
              id="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              className={errors.confirm_password ? 'border-red-500' : ''}
              required
              minLength={6}
            />
            {errors.confirm_password && (
              <p className="text-sm text-red-500 mt-1">{errors.confirm_password}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const MemberCard = ({ member, onSuspend, onDelete, onViewMetrics, onPasswordReset }) => {
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const safeGet = (obj, key, defaultValue) => {
    return obj && obj[key] !== undefined ? obj[key] : defaultValue;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'suspended':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'deleted':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (member) => {
    if (member.deletedAt || member.deleted_at) {
      return 'Deleted';
    }
    if (member.isActive === false || member.is_active === false) {
      return 'Suspended';
    }
    return 'Active';
  };

  const getStatusType = (member) => {
    if (member.deletedAt || member.deleted_at) {
      return 'deleted';
    }
    if (member.isActive === false || member.is_active === false) {
      return 'suspended';
    }
    return 'active';
  };

  const statusType = getStatusType(member);
  const statusText = getStatusText(member);

  const getRoleColor = (role) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'agent': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'senior_agent': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // FIXED: Consistent field name handling with safe access
  const firstName = safeGet(member, 'firstName', '') || safeGet(member, 'first_name', '');
  const lastName = safeGet(member, 'lastName', '') || safeGet(member, 'last_name', '');
  const isActive = safeGet(member, 'isActive', true) !== false && safeGet(member, 'is_active', true) !== false;
  const email = safeGet(member, 'email', '');
  const role = safeGet(member, 'role', 'agent');

  // FIXED: Safely access metrics with multiple fallback paths
  const memberMetrics = member.metrics || {};
  const totalSales = safeNumber(memberMetrics.total_sales || memberMetrics.totalSales || 0);
  const totalRevenue = safeNumber(memberMetrics.total_revenue || memberMetrics.totalRevenue || 0);
  const totalClients = safeNumber(memberMetrics.total_clients || memberMetrics.totalClients);
  const monthlySales = safeNumber(memberMetrics.monthly_sales || memberMetrics.monthlySales);
  const monthlyCommission = safeNumber(memberMetrics.monthly_commission || memberMetrics.monthlyCommission);
  const monthlyClients = safeNumber(memberMetrics.monthly_clients || memberMetrics.monthlyClients);
  const monthlyProspects = safeNumber(memberMetrics.monthly_prospects || memberMetrics.monthlyProspects);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {firstName?.[0] || 'U'}{lastName?.[0] || 'U'}
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900 dark:text-white">
                {firstName} {lastName}
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">{email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className={getRoleColor(role)}>
              {role.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={getStatusColor(statusType)}>
              {statusText}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Metrics Display - Removed Policies as it's redundant with Sales */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalSales.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Sales Count</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${totalRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</div>
            </div>
          </div>
          
          {/* Additional Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                ${monthlySales.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">This month's sales</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                ${monthlyCommission.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Commission</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {monthlyClients.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">This month's clients</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {monthlyProspects.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">This month's prospects</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewMetrics(member)}
              className="flex-1"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Metrics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPasswordReset(member)}
              className="flex-1"
            >
              <Lock className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSuspend(member)}
              className="flex-1"
              disabled={statusType === 'deleted'}
              title={statusType === 'deleted' ? 'Deleted users cannot be suspended/activated from team management. Go to Profile → Users to reactivate.' : ''}
            >
              {statusType === 'suspended' ? (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Activate
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Suspend
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(member)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={statusType === 'deleted'}
              title={statusType === 'deleted' ? 'User is already deleted' : ''}
            >
              <Trash2 className="h-4 w-4" />
              {statusType === 'deleted' ? 'Deleted' : 'Delete'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TeamManagement = () => {
  const { user, isManager, isAuthenticated } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetMember, setPasswordResetMember] = useState(null);
  const [error, setError] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(null);

  useEffect(() => {
    if (isManager && isAuthenticated) {
      loadMembers();
    } else if (isAuthenticated && !isManager) {
      setError('Access denied. Manager role required.');
      setLoading(false);
    }
    
    // Cleanup function to clear timeouts when component unmounts
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [isManager, isAuthenticated]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear any existing timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      
      // Set a loading timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.warn('Team members loading timeout - taking too long');
        setError('Loading timeout - please refresh the page');
        setLoading(false);
      }, 30000); // 30 second timeout
      
      setLoadingTimeout(timeout);
      
      // FIXED: Use the correct API endpoint
      const response = await userProfileAPI.getUsers();
      
      // FIXED: Check response.data.users instead of response.users
      if (response && response.data && response.data.users) {
        const users = response.data.users;
        
        // FIXED: Load team performance data using the correct API endpoint
        let teamMembersWithMetrics = [];
        
        try {
          // Get team members with performance data from the correct endpoint
          const teamResponse = await teamAPI.getMembers();

          
          if (teamResponse && teamResponse.data && teamResponse.data.members) {
            teamMembersWithMetrics = teamResponse.data.members;
          }
        } catch (error) {
          console.warn('Could not fetch team members with metrics:', error);
          // Fallback to users without metrics
          teamMembersWithMetrics = users.map(user => ({
            ...user,
            totalSales: 0,
            totalSalesCount: 0,
            totalRevenue: 0,
            totalCommission: 0,
            totalClients: 0,
            monthlySales: 0,
            monthlyCommission: 0,
            monthlyClients: 0,
            monthlyProspects: 0
          }));
        }
        
        // FIXED: Process team members with proper metrics mapping
        const membersWithMetrics = teamMembersWithMetrics.map((member) => {
          return {
            ...member,
            metrics: {
              total_sales: safeNumber(member.totalSales || member.total_sales || 0),
              total_sales_count: safeNumber(member.totalSalesCount || member.total_sales_count || 0),
              total_clients: safeNumber(member.totalClients || member.total_clients || 0),
              monthly_sales: safeNumber(member.monthlySales || member.monthly_sales || 0),
              monthly_commission: safeNumber(member.monthlyCommission || member.monthly_commission || 0),
              monthly_clients: safeNumber(member.monthlyClients || member.monthly_clients || 0),
              monthly_prospects: safeNumber(member.monthlyProspects || member.monthly_prospects || 0),
              total_commission: safeNumber(member.totalCommission || member.total_commission || 0),
              total_revenue: safeNumber(member.totalRevenue || member.total_revenue || 0)
            }
          };
        });
        

        setMembers(membersWithMetrics);
      } else {
        console.warn('No users found in response:', response);
        setMembers([]);
      }
      
      // Clear the timeout since we succeeded
      clearTimeout(timeout);
      setLoadingTimeout(null);
      
    } catch (error) {
      console.error('Error loading team members:', error);
      setError(`Failed to load team members: ${error.response?.data?.error || error.message}`);
      
      if (error.response?.status === 403) {
        setError('Access denied. Manager role required to view team management.');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      }
      
      setMembers([]);
      
      // Clear the timeout since we failed
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const createMember = async () => {
    // Reload members after creation
    await loadMembers();
  };

  const deleteMember = async (member) => {
    const firstName = safeGet(member, 'firstName', '') || safeGet(member, 'first_name', '');
    const lastName = safeGet(member, 'lastName', '') || safeGet(member, 'last_name', '');
    
    // Check if user is already deleted
    if (member.deletedAt || member.deleted_at) {
      toast.error(`${firstName} ${lastName} has already been deleted.`);
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${firstName} ${lastName}? This action cannot be undone.`)) {
      try {
        await userProfileAPI.deleteUser(member.id);
        toast.success('Team member deleted successfully');
        loadMembers();
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error(`Failed to delete team member: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const suspendMember = async (member) => {
    const firstName = safeGet(member, 'firstName', '') || safeGet(member, 'first_name', '');
    const lastName = safeGet(member, 'lastName', '') || safeGet(member, 'last_name', '');
    
    // Check if user is deleted
    if (member.deletedAt || member.deleted_at) {
      toast.error(`${firstName} ${lastName} has been deleted and cannot be suspended/activated from team management. Please go to Profile → Users to reactivate.`);
      return;
    }
    
    const isActive = safeGet(member, 'isActive', true) !== false && safeGet(member, 'is_active', true) !== false;
    const action = isActive ? 'suspend' : 'activate';
    
    if (window.confirm(`Are you sure you want to ${action} ${firstName} ${lastName}?`)) {
      try {
        // FIXED: Use the correct field name for the API
        await userProfileAPI.updateUser(member.id, { isActive: !isActive });
        toast.success(`Team member ${action}ed successfully`);
        loadMembers();
      } catch (error) {
        console.error(`Error ${action}ing member:`, error);
        toast.error(`Failed to ${action} team member: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const resetPassword = async (userId, newPassword) => {
    try {
      await userProfileAPI.resetUserPassword(userId, { new_password: newPassword });
      toast.success('Password reset successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(`Failed to reset password: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  };

  const handlePasswordReset = (member) => {
    setPasswordResetMember(member);
    setShowPasswordReset(true);
  };

  const viewMetrics = (member) => {
    setSelectedMember(member);
    setShowMetrics(true);
  };

  // Check if user has access
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Please log in to access team management.</p>
        </div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">You need manager privileges to access team management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground mb-2">Loading team members...</p>
          <p className="text-sm text-muted-foreground mb-4">This may take a few moments</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setLoading(false);
              setError('Loading cancelled by user');
            }}
          >
            Cancel Loading
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Team Members</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={loadMembers} className="bg-primary">
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setError(null);
                setMembers([]);
              }}
            >
              Clear Error
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            If the problem persists, try refreshing the page or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Improved Mobile Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Team Management</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage your team members and track their performance</p>
        </div>
        <CreateMemberDialog onCreateMember={createMember} />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                members.length
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                members.filter(m => {
                  const isActive = safeGet(m, 'isActive', true) !== false && safeGet(m, 'is_active', true) !== false;
                  return isActive;
                }).length
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                members.filter(m => {
                  const isActive = safeGet(m, 'isActive', true) !== false && safeGet(m, 'is_active', true) !== false;
                  return !isActive;
                }).length
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Count</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              ) : (
                members.reduce((sum, m) => {
                  const totalSales = safeNumber(safeGet(m, 'metrics.total_sales', 0));
                  return sum + totalSales;
                }, 0).toLocaleString()
              )}
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Members Grid */}
      {members.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first team member.</p>
          <CreateMemberDialog onCreateMember={createMember} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onSuspend={suspendMember}
              onDelete={deleteMember}
              onViewMetrics={viewMetrics}
              onPasswordReset={handlePasswordReset}
            />
          ))}
        </div>
      )}

      {/* Metrics Dialog */}
      <Dialog open={showMetrics} onOpenChange={setShowMetrics}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Performance Metrics - {safeGet(selectedMember, 'firstName', '') || safeGet(selectedMember, 'first_name', '')} {safeGet(selectedMember, 'lastName', '') || safeGet(selectedMember, 'last_name', '')}
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sales Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Sales:</span>
                        <span className="font-semibold">
                          {safeNumber(safeGet(selectedMember, 'metrics.total_sales', 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>This month's sales:</span>
                        <span className="font-semibold">
                          {safeNumber(safeGet(selectedMember, 'metrics.monthly_sales', 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>This month's commission:</span>
                        <span className="font-semibold">
                          ${safeNumber(safeGet(selectedMember, 'metrics.monthly_commission', 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Client Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Clients:</span>
                        <span className="font-semibold">
                          {safeNumber(safeGet(selectedMember, 'metrics.total_clients', 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>This month's clients:</span>
                        <span className="font-semibold">
                          {safeNumber(safeGet(selectedMember, 'metrics.monthly_clients', 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>This month's prospects:</span>
                        <span className="font-semibold">
                          {safeNumber(safeGet(selectedMember, 'metrics.monthly_prospects', 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Sales Count:</span>
                        <span className="font-semibold">
                          {safeNumber(safeGet(selectedMember, 'metrics.total_sales_count', 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="text-center">
                <Button variant="outline" onClick={() => setShowMetrics(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <PasswordResetDialog
        member={passwordResetMember}
        onPasswordReset={resetPassword}
        open={showPasswordReset}
        onOpenChange={setShowPasswordReset}
      />
    </div>
  );
};

export default TeamManagement;
