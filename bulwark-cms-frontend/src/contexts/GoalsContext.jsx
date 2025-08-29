import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { goalsAPI } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const GoalsContext = createContext();

// Helper function to safely convert values to numbers
const safeToNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Helper function to format goal data consistently
const formatGoal = (goal) => {
  if (!goal) return null;
  
  console.log('🔍 Frontend formatGoal input:', goal);
  console.log('🔍 Frontend formatGoal input ID:', goal?.id);
  
  const formatted = {
    ...goal,
    // Ensure all numeric values are properly converted
    target_value: safeToNumber(goal.target_value || goal.targetValue),
    current_value: safeToNumber(goal.current_value || goal.currentValue),
    targetValue: safeToNumber(goal.target_value || goal.targetValue),
    currentValue: safeToNumber(goal.current_value || goal.currentValue),
    
    // Ensure string fields have defaults
    title: goal.title || '',
    goal_type: goal.goal_type || goal.goalType || 'monthly',
    metric_type: goal.metric_type || goal.metricType || 'sales_count',
    goalType: goal.goal_type || goal.goalType || 'monthly',
    metricType: goal.metric_type || goal.metricType || 'sales_count',
    
    // Ensure date fields are properly formatted
    start_date: goal.start_date || goal.startDate || '',
    end_date: goal.end_date || goal.endDate || '',
    startDate: goal.start_date || goal.startDate || '',
    endDate: goal.end_date || goal.endDate || '',
    
    // Ensure other fields have defaults
    notes: goal.notes || '',
    isActive: goal.isActive !== undefined ? goal.isActive : true,
    is_active: goal.is_active !== undefined ? goal.is_active : goal.isActive !== undefined ? goal.isActive : true,
  };
  
  console.log('🔍 Frontend formatGoal output:', formatted);
  console.log('🔍 Frontend formatGoal output ID:', formatted.id);
  
  return formatted;
};

export const GoalsProvider = ({ children }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, canViewAllData } = useAuth();

  // Fetch goals with proper error handling and data formatting
  const fetchGoals = useCallback(async () => {
    if (!user?.id) {
      console.log('🔍 GoalsContext: No user found, skipping goal fetch');
      setGoals([]);
      return;
    }

    console.log('🔍 GoalsContext: Fetching goals for user:', user.id);
    setLoading(true);
    setError(null);

    try {
      // All users (managers and agents) now see only their own goals
      const params = { agent_id: user?.id };
      console.log('🔍 GoalsContext: Fetching goals with params:', params);
      console.log('🔍 GoalsContext: User role:', user?.role, 'User ID:', user?.id);
      console.log('🔍 GoalsContext: All users see only their own goals');
      
      const response = await goalsAPI.getGoals(params);
      console.log('🔍 GoalsContext: Raw API response:', response);
      console.log('🔍 GoalsContext: Response structure details:', {
        hasResponse: !!response,
        responseType: typeof response,
        hasData: !!response?.data,
        dataType: typeof response?.data,
        dataKeys: response?.data ? Object.keys(response.data) : 'N/A',
        dataSuccess: response?.data?.success,
        dataData: response?.data?.data,
        dataDataLength: Array.isArray(response?.data?.data) ? response.data.data.length : 'Not Array'
      });

      // Handle the new standardized response structure
      let rawGoals = [];
      if (response.data && response.data.success && response.data.data) {
        // Backend returns: {success: true, data: [...], message: '...'}
        rawGoals = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        console.log('✅ GoalsContext: Goals found in response.data.data:', rawGoals);
      } else if (response.success && response.data) {
        // Direct response: {success: true, data: [...]}
        rawGoals = Array.isArray(response.data) ? response.data : [response.data];
        console.log('✅ GoalsContext: Goals found in response.data:', rawGoals);
      } else if (Array.isArray(response)) {
        // Direct array response
        rawGoals = response;
        console.log('✅ GoalsContext: Goals found directly in response array:', rawGoals);
      } else if (response.data && Array.isArray(response.data.goals)) {
        // Legacy format: {data: {goals: [...]}}
        rawGoals = response.data.goals;
        console.log('✅ GoalsContext: Goals found in response.data.goals:', rawGoals);
      } else {
        console.log('⚠️ GoalsContext: No goals data found in response structure:', response);
        console.log('🔍 Response structure:', {
          hasResponse: !!response,
          hasResponseData: !!response?.data,
          responseDataType: typeof response?.data,
          responseDataKeys: response?.data ? Object.keys(response.data) : 'N/A',
          responseSuccess: response?.data?.success,
          responseDataData: response?.data?.data
        });
        rawGoals = [];
      }

      // Format each goal with proper type conversion and null checking
      const formattedGoals = rawGoals
        .filter(goal => goal && goal.id) // Filter out null/undefined goals
        .map(goal => {
          const formatted = formatGoal(goal);
          
          console.log(`🎯 GoalsContext: Formatted goal ${goal.id}:`, {
            title: formatted.title,
            target_value: formatted.target_value,
            current_value: formatted.current_value,
            target_value_type: typeof formatted.target_value,
            current_value_type: typeof formatted.current_value,
            goal_type: formatted.goal_type,
            metric_type: formatted.metric_type
          });
          
          return formatted;
        });

      console.log(`🔍 GoalsContext: Setting ${formattedGoals.length} formatted goals`);
      setGoals(formattedGoals);
      
    } catch (error) {
      console.error('❌ GoalsContext: Error fetching goals:', error);
      setError(error.response?.data?.error || 'Failed to fetch goals');
      setGoals([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Auto-fetch goals when user changes
  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Create goal with proper data formatting
  const createGoal = useCallback(async (goalData) => {
    console.log('🔍 GoalsContext: Creating goal with data:', goalData);
    console.log('🔍 GoalsContext: goalData types:', {
      title: typeof goalData.title,
      goalType: typeof goalData.goalType,
      metricType: typeof goalData.metricType,
      targetValue: typeof goalData.targetValue,
      currentValue: typeof goalData.currentValue,
      startDate: typeof goalData.startDate,
      endDate: typeof goalData.endDate,
      notes: typeof goalData.notes
    });
    setLoading(true);
    setError(null);

    try {
      // Format the goal data before sending
      const formattedData = {
        title: goalData.title || '',
        goalType: goalData.goalType || goalData.goal_type || 'monthly',
        metricType: goalData.metricType || goalData.metric_type || 'sales_count',
        targetValue: safeToNumber(goalData.targetValue || goalData.target_value),
        currentValue: safeToNumber(goalData.currentValue || goalData.current_value || 0),
        startDate: goalData.startDate || goalData.start_date || '',
        endDate: goalData.endDate || goalData.end_date || '',
        notes: goalData.notes || ''
      };

      console.log('🔍 GoalsContext: Formatted create data:', formattedData);
      console.log('🔍 GoalsContext: formattedData types:', {
        title: typeof formattedData.title,
        goalType: typeof formattedData.goalType,
        metricType: typeof formattedData.metricType,
        targetValue: typeof formattedData.targetValue,
        currentValue: typeof formattedData.currentValue,
        startDate: typeof formattedData.startDate,
        endDate: typeof formattedData.endDate,
        notes: typeof formattedData.notes
      });

      const response = await goalsAPI.createGoal(formattedData);
      console.log('🔍 GoalsContext: Create response:', response);

      // Handle the new response structure
      let newGoal;
      if (response.success && response.data) {
        newGoal = formatGoal(response.data);
      } else {
        newGoal = formatGoal(response);
      }
      
      // Add the new goal to the current goals list
      setGoals(prevGoals => [...prevGoals, newGoal]);
      
      return newGoal;
    } catch (error) {
      console.error('❌ GoalsContext: Error creating goal:', error);
      setError(error.response?.data?.error || 'Failed to create goal');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update goal with proper data formatting
  const updateGoal = useCallback(async (goalId, goalData) => {
    console.log('🔍 GoalsContext: Updating goal', goalId, 'with data:', goalData);
    setLoading(true);
    setError(null);

    try {
      // Format the goal data before sending
      const formattedData = {
        title: goalData.title || '',
        goalType: goalData.goalType || goalData.goal_type || 'monthly',
        metricType: goalData.metricType || goalData.metric_type || 'sales_count',
        targetValue: safeToNumber(goalData.targetValue || goalData.target_value),
        currentValue: safeToNumber(goalData.currentValue || goalData.current_value),
        startDate: goalData.startDate || goalData.start_date || '',
        endDate: goalData.endDate || goalData.end_date || '',
        notes: goalData.notes || ''
      };

      console.log('🔍 GoalsContext: Formatted update data:', formattedData);

      const response = await goalsAPI.updateGoal(goalId, formattedData);
      console.log('🔍 GoalsContext: Update response:', response);

      // Handle the new response structure
      let updatedGoal;
      if (response.success && response.data) {
        updatedGoal = formatGoal(response.data);
      } else {
        updatedGoal = formatGoal(response);
      }
      
      // Update the goal in the current goals list
      setGoals(prevGoals => 
        prevGoals.map(goal => 
          goal.id === goalId ? updatedGoal : goal
        )
      );
      
      return updatedGoal;
    } catch (error) {
      console.error('❌ GoalsContext: Error updating goal:', error);
      setError(error.response?.data?.error || 'Failed to update goal');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete goal
  const deleteGoal = useCallback(async (goalId) => {
    console.log('🔍 GoalsContext: Deleting goal', goalId);
    setLoading(true);
    setError(null);

    try {
      await goalsAPI.deleteGoal(goalId);
      
      // Remove the goal from the current goals list
      setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
      
      console.log('✅ GoalsContext: Goal deleted successfully');
    } catch (error) {
      console.error('❌ GoalsContext: Error deleting goal:', error);
      setError(error.response?.data?.error || 'Failed to delete goal');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Recalculate progress
  const recalculateProgress = useCallback(async () => {
    console.log('🔍 GoalsContext: Recalculating progress');
    setLoading(true);
    setError(null);

    try {
      const response = await goalsAPI.recalculateProgress();
      console.log('🔍 GoalsContext: Recalculate response:', response);

      // Refresh goals after recalculation
      await fetchGoals();
      
      return response;
    } catch (error) {
      console.error('❌ GoalsContext: Error recalculating progress:', error);
      setError(error.response?.data?.error || 'Failed to recalculate progress');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchGoals]);

  // Legacy handlers for backward compatibility
  const handleSave = useCallback(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleEdit = useCallback((goal) => {
    // This is typically handled by the component, not the context
    console.log('🔍 GoalsContext: Edit requested for goal:', goal.id);
  }, []);

  const handleDelete = useCallback(async (goalId) => {
    return deleteGoal(goalId);
  }, [deleteGoal]);

  const value = {
    // State
    goals,
    loading,
    error,
    
    // Actions
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    recalculateProgress,
    
    // Legacy handlers for backward compatibility
    handleSave,
    handleEdit,
    handleDelete,
    
    // Utility functions
    formatGoal,
    safeToNumber
  };

  return (
    <GoalsContext.Provider value={value}>
      {children}
    </GoalsContext.Provider>
  );
};

export const useGoals = () => {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
};
