import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useGoals } from '../contexts/GoalsContext.jsx';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Target, Plus, Edit, Trash2, TrendingUp, Calendar, DollarSign, Users, Award, } from 'lucide-react';

const GOAL_TYPES = [
  { value: 'sales_amount', label: 'Sales Amount', icon: DollarSign },
  { value: 'sales_count', label: 'Number of Sales', icon: TrendingUp },
  { value: 'new_clients', label: 'New Clients', icon: Users },
  { value: 'commission', label: 'Commission Earned', icon: Award },
];

const GOAL_PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'annual', label: 'Annual' },
];

const GoalForm = ({ goal, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    metricType: 'sales_count',
    goalType: 'monthly',
    targetValue: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    description: '',
    ...goal,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Auto-calculate end date based on goal_type and start date
    if (formData.startDate && formData.goalType) {
      const startDate = new Date(formData.startDate);
      let endDate = new Date(startDate);

      switch (formData.goalType) {
        case 'weekly':
          endDate.setDate(startDate.getDate() + 7);
          break;
        case 'monthly':
          endDate.setMonth(startDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(startDate.getMonth() + 3);
          break;
        case 'half_yearly':
          endDate.setMonth(startDate.getMonth() + 6);
          break;
        case 'annual':
          endDate.setFullYear(startDate.getFullYear() + 1);
          break;
      }

      setFormData(prev => ({
        ...prev,
        endDate: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.startDate, formData.goalType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const goalData = {
        title: formData.title,
        goalType: formData.goalType, // Map to backend field name
        metricType: formData.metricType, // Map to backend field name
        targetValue: parseFloat(formData.targetValue), // Map to backend field name
        currentValue: 0, // Default to 0 for new goals
        startDate: formData.startDate, // Map to backend field name
        endDate: formData.endDate, // Map to backend field name
        notes: formData.description // Map to backend field name
      };

      // Call the onSave function with the formatted data
      await onSave(goalData);

      // Reset form
      setFormData({
        title: '',
        metricType: 'sales_count',
        goalType: 'monthly',
        targetValue: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        description: '',
      });
    } catch (error) {
      console.error('Goal save error:', error);
      setError(error.message || 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-medium">Goal Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Monthly Sales Target, Q1 Client Acquisition"
          required
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">
          Give your goal a descriptive name to easily identify it
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metricType">What are you tracking? *</Label>
        <Select
          value={formData.metricType}
          onValueChange={(value) => setFormData({ ...formData, metricType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select what you want to track" />
          </SelectTrigger>
          <SelectContent>
            {GOAL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose what metric you want to track for this goal
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goalType">Time Period *</Label>
        <Select
          value={formData.goalType}
          onValueChange={(value) => setFormData({ ...formData, goalType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            {GOAL_PERIODS.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          How long do you want to track this goal?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetValue">Target Value *</Label>
        <Input
          id="targetValue"
          type="number"
          step="0.01"
          value={formData.targetValue}
          onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
          placeholder={formData.metricType && (formData.metricType.includes('amount') || formData.metricType === 'commission') ? '10000.00' : '50'}
          required
        />
        <p className="text-xs text-muted-foreground">
          {formData.metricType && (formData.metricType.includes('amount') || formData.metricType === 'commission') 
            ? 'Enter the dollar amount you want to achieve' 
            : 'Enter the number you want to achieve'
          }
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Additional details about this goal..."
          className="min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground">
          Optional: Add notes or context about this goal
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : goal?.id ? 'Update Goal' : 'Create Goal'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const GoalsTracking = () => {
  const { user, canViewAllData } = useAuth();
  const { goals, loading, error: contextError, fetchGoals, createGoal, updateGoal, deleteGoal, recalculateProgress, handleSave, handleEdit, handleDelete } = useGoals();
  
  const [open, setOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [error, setError] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRecalculating, setAutoRecalculating] = useState(false);

  useEffect(() => {
    const initializeGoals = async () => {
      await fetchGoals();
      // Auto-recalculate goals when page loads (only for managers)
      if (user?.role === 'manager') {
        setAutoRecalculating(true);
        try {
          await recalculateProgress();
  
          // Refresh goals after recalculation to show updated data
          await fetchGoals();
        } catch (error) {
          console.error('❌ Auto-recalculation failed:', error);
        } finally {
          setAutoRecalculating(false);
        }
      }
    };
    initializeGoals();
  }, [fetchGoals, recalculateProgress, user?.role]);

  useEffect(() => {
    if (user && user.role) {
      setIsManager(user.role === 'manager');
    }
  }, [user]);

  // Combine context error with local error
  const displayError = contextError || error;
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState('');

  const onSave = async (goalData) => {

    try {
      if (selectedGoal?.id) {
        // Update existing goal
        await updateGoal(selectedGoal.id, goalData);
        toast.success('Goal updated successfully!');
      } else {
        // Create new goal
        await createGoal(goalData);
        toast.success('Goal created successfully!');
      }

              // Auto-recalculate goals after save/update (only for managers)
        if (user?.role === 'manager') {
          setAutoRecalculating(true);
          try {
            await recalculateProgress();
            // Refresh goals to show updated data
            await fetchGoals();
          } catch (error) {
            console.error('❌ Recalculation after save/update failed:', error);
          } finally {
            setAutoRecalculating(false);
          }
        }

      setShowForm(false);
      setSelectedGoal(null);
      setError('');
    } catch (error) {
      console.error('❌ Error saving goal:', error);
      const errorMessage = error.message || 'Failed to save goal';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const onEdit = (goal) => {
    setSelectedGoal(goal);
    setShowForm(true);
    setError('');
  };

  const onDelete = async (goalId) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
        setError('');
        toast.success('Goal deleted successfully!');

      } catch (error) {
        console.error('❌ Error deleting goal:', error);
        const errorMessage = 'Failed to delete goal';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  const getGoalStatus = (goal) => {
    if (!goal) return 'active';
    
    // Check if goal is completed (reached 100% or more)
    const currentValue = goal.currentValue || 0;
    const targetValue = goal.targetValue || 1;
    const progress = (currentValue / targetValue) * 100;
    
    if (progress >= 100) {
      return 'completed';
    }
    
    // Check if goal is overdue (past end date)
    if (goal.endDate) {
      const endDate = new Date(goal.endDate);
      const now = new Date();
      
      if (endDate < now) {
        return 'overdue';
      }
    }
    
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Debug current filter values
  console.log('🔍 Current filter values:', { periodFilter, statusFilter });
  console.log('🔍 Total goals before filtering:', goals.length);
  console.log('🔍 Goals data:', goals);

  // Fixed filtering logic with proper null checks and consistent naming
  const filteredGoals = goals.filter(goal => {
    if (!goal) return false;

    // ✅ Fixed: use goal.goal_type consistently (matches backend)
    const matchesPeriod = periodFilter === 'all' || (goal.goalType && goal.goalType === periodFilter);
    const status = getGoalStatus(goal);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    // Debug filtering
    console.log(`🔍 Filtering goal ${goal.id}: ${goal.title}`);
    console.log(`  - Period filter: ${periodFilter}, Goal period: ${goal.goalType}, Matches: ${matchesPeriod}`);
    console.log(`  - Status filter: ${statusFilter}, Goal status: ${status}, Matches: ${matchesStatus}`);
    console.log(`  - Final result: ${matchesPeriod && matchesStatus}`);

    return matchesPeriod && matchesStatus;
  });

  // Calculate summary stats with null checks and better debugging
  console.log('🔍 Calculating summary statistics...');
  
  const activeGoals = goals.filter(goal => {
    if (!goal) return false;
    const status = getGoalStatus(goal);
    const isActive = status === 'active';
    console.log(`Goal ${goal.id} (${goal.title}): status=${status}, isActive=${isActive}`);
    return isActive;
  }).length;

  const completedGoals = goals.filter(goal => {
    if (!goal) return false;
    const status = getGoalStatus(goal);
    const isCompleted = status === 'completed';
    console.log(`Goal ${goal.id} (${goal.title}): status=${status}, isCompleted=${isCompleted}`);
    return isCompleted;
  }).length;

  const overdueGoals = goals.filter(goal => {
    if (!goal) return false;
    const status = getGoalStatus(goal);
    const isOverdue = status === 'overdue';
    console.log(`Goal ${goal.id} (${goal.title}): status=${status}, isOverdue=${isOverdue}`);
    return isOverdue;
  }).length;

  // Calculate average progress without clamping to 100% (allow over-achievement)
  const avgProgress = goals.length > 0 ? goals
    .filter(goal => goal && goal.targetValue && goal.currentValue !== undefined)
    .reduce((sum, goal) => {
      // Data is already converted to numbers in context, no need for parseFloat
      const currentValue = goal.currentValue || 0;
      const targetValue = goal.targetValue || 1;
      const goalProgress = (currentValue / targetValue) * 100;
      
      // Allow over 100%
      console.log(`📊 Goal ${goal.id} progress calculation:`, {
        title: goal.title,
        currentValue,
        targetValue,
        currentValueType: typeof currentValue,
        targetValueType: typeof targetValue,
        goalProgress: `${goalProgress.toFixed(1)}%`
      });
      
      return sum + goalProgress;
    }, 0) / Math.max(goals.filter(goal => goal && goal.targetValue && goal.currentValue !== undefined).length, 1) : 0;

  const getGoalTypeIcon = (type) => {
    if (!type) return <Target className="h-4 w-4" />;
    
    const goalType = GOAL_TYPES.find(t => t.value === type);
    const IconComponent = goalType?.icon || Target;
    
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading || autoRecalculating) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-gray-600">
          {autoRecalculating ? 'Updating goal progress...' : 'Loading goals...'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Improved Mobile Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Goals Tracking</h1>
          <p className="text-gray-600 text-sm sm:text-base">Set and monitor your performance goals</p>
          <p className="text-sm text-blue-600 mt-1">
            🔒 Viewing only your goals
            {autoRecalculating && (
              <span className="ml-2 text-orange-600">
                🔄 Updating progress...
              </span>
            )}
          </p>
        </div>
        {/* Action Buttons - Stacked on Mobile, Horizontal on Larger Screens */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => {
              console.log('🔄 Manual refresh button clicked!');
              fetchGoals();
            }}
            className="w-full sm:w-auto justify-center sm:justify-start"
          >
            🔄 Refresh Goals
          </Button>
          
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedGoal(null)} className="w-full sm:w-auto justify-center sm:justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedGoal ? 'Edit Goal' : 'Add New Goal'}
                </DialogTitle>
                <DialogDescription>
                  {selectedGoal ? 'Update goal details below.' : 'Set a new performance goal to track your progress.'}
                </DialogDescription>
              </DialogHeader>
              <GoalForm
                goal={selectedGoal}
                onSave={onSave}
                onCancel={() => setShowForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {displayError && (
        <Alert variant="destructive">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="default" className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards - Improved Mobile Layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{activeGoals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{completedGoals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{overdueGoals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{avgProgress.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Goals</CardTitle>
            <div className="flex items-center gap-4">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {GOAL_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredGoals.length > 0 ? (
              filteredGoals.map((goal) => {
                if (!goal) return null;

                // Data is already converted to numbers in context, no need for parseFloat
                const currentValue = goal.currentValue || 0;
                const targetValue = goal.targetValue || 1;
                const progress = (currentValue / targetValue) * 100; // Allow progress above 100%
                
                const status = getGoalStatus(goal);
                const goalType = GOAL_TYPES.find(t => t.value === goal.metricType);

                // Debug logging for progress calculation
                console.log(`🔍 Goal ${goal.id} (${goal.title}) progress calculation:`, {
                  currentValue,
                  targetValue,
                  currentValueType: typeof currentValue,
                  targetValueType: typeof targetValue,
                  progress,
                  progressRounded: progress.toFixed(1),
                  metricType: goal.metricType
                });

                return (
                  <Card key={goal.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          {getGoalTypeIcon(goal.metricType)}
                          <div className="flex-1">
                            <h3 className="font-bold text-xl text-gray-900 mb-1">
                              {goal.title || 'Untitled Goal'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-medium">{goalType?.label || 'Goal'}</span>
                              <span>•</span>
                              <span>
                                {goal.goalType ? (
                                  GOAL_PERIODS.find(p => p.value === goal.goalType)?.label || 
                                  goal.goalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                                ) : 'No period set'}
                              </span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(status)}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>

                        {goal.notes && (
                          <p className="text-gray-600 mb-3">{goal.notes}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-gray-500">Current / Target</div>
                            <div className="font-semibold">
                              {(goal.metricType || '').includes('amount') || goal.metricType === 'commission' 
                                ? `$${currentValue.toLocaleString()} / $${targetValue.toLocaleString()}`
                                : `${currentValue} / ${targetValue}`
                              }
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Period</div>
                            <div className="font-semibold">
                              {goal.goalType ? (
                                GOAL_PERIODS.find(p => p.value === goal.goalType)?.label || 
                                goal.goalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                              ) : 'No period set'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Date Range</div>
                            <div className="font-semibold">
                              {goal.startDate && goal.endDate ? (
                                `${new Date(goal.startDate).toLocaleDateString()} - ${new Date(goal.endDate).toLocaleDateString()}`
                              ) : 'No dates set'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Progress</div>
                            <div className="font-semibold">{progress.toFixed(1)}%</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Progress value={Math.max(progress, 0.1)} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>0</span>
                            <span>{goalType?.label || 'Goal'}</span>
                            <span>
                              {(goal.metricType || '').includes('amount') || goal.metricType === 'commission' 
                                ? `$${targetValue.toLocaleString()}`
                                : targetValue
                              }
                            </span>
                          </div>
                          
                          {progress > 100 && (
                            <div className="text-sm text-green-600 font-medium">
                              🎯 Exceeded target by {(progress - 100).toFixed(1)}%!
                            </div>
                          )}
                          
                          {progress > 0 && progress < 1 && (
                            <div className="text-sm text-blue-600 font-medium">
                              📊 Progress: {progress.toFixed(3)}% (very small but measurable)
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(goal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(goal.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No goals found</p>
                  <p className="text-sm">Create your first goal to start tracking your progress</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoalsTracking;