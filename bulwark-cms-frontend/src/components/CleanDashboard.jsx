import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card.jsx';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  BarChart3,
  Eye,
  EyeOff,
  Calendar,
  FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { 
  clientsAPI, 
  salesAPI, 
  goalsAPI, 
  remindersAPI,
  teamAPI
} from '@/lib/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const CleanDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'overall'
  

  const [dashboardData, setDashboardData] = useState({
    totalSales: 0,
    totalClients: 0,
    activePolicies: 0,
    monthlyRevenue: 0,
    totalPremium: 0,
    totalCommission: 0,
    activeGoals: 0,
    salesTrend: [],
    productSales: [],
    totalAgents: 0,
    topPerformerSales: 0,
    teamTotalSales: 0,
    teamActivePolicies: 0,
    topAgents: [] // New field for top 5 agents
  });

  const fetchDashboardData = useCallback(async () => {
    let timeoutId;
    try {
      setLoading(true);
      setError(null);
      
      // Add a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        setLoading(false);
        setError('Request timeout - please refresh the page');
      }, 30000); // 30 second timeout

      // Determine if we should fetch individual or overall data
      const shouldFetchOverall = viewMode === 'overall' && user?.role === 'manager';



      // Fetch all data in parallel using the API service
      
      let salesResponse, clientsResponse, goalsResponse;
      
      try {
        salesResponse = await salesAPI.getSales(shouldFetchOverall ? {} : { agent_id: user.id });
      } catch (error) {
        console.error('❌ Sales API failed:', error);
        salesResponse = { data: { sales: [] } };
      }
      
      try {
        clientsResponse = await clientsAPI.getClients(shouldFetchOverall ? {} : { agent_id: user.id });
      } catch (error) {
        console.error('❌ Clients API failed:', error);
        clientsResponse = { data: { clients: [] } };
      }
      
      try {
        goalsResponse = await goalsAPI.getGoals(shouldFetchOverall ? {} : { agent_id: user.id });
      } catch (error) {
        console.error('❌ Goals API failed:', error);
        goalsResponse = { data: { goals: [] } };

            }

      // Extract data from responses
      const salesData = salesResponse.data;
      const clientsData = clientsResponse.data;
      const goalsData = goalsResponse.data;
      


      // Calculate metrics
      const sales = salesData.sales || [];
      const clients = clientsData.clients || [];
      const goals = goalsData.data || goalsData.goals || []; // Try both structures

      const totalSales = sales.filter(sale => sale.status === 'active').length;
      const totalClients = clients.length;
      const activePolicies = totalSales;
      const monthlyRevenue = calculateMonthlyRevenue(sales);
      const totalPremium = calculateTotalPremium(sales);
      const totalCommission = calculateTotalCommission(sales);
      // Calculate active goals based on end date and completion status
      const activeGoals = goals.filter(goal => {
        const endDate = goal.endDate || goal.end_date;
        const currentValue = goal.currentValue || goal.current_value || 0;
        const targetValue = goal.targetValue || goal.target_value || 1;
        
        // Goal is active if:
        // 1. End date hasn't passed yet
        // 2. Not completed (current value < target value)
        const isNotExpired = !endDate || new Date(endDate) >= new Date();
        const isNotCompleted = currentValue < targetValue;
        

        
        return isNotExpired && isNotCompleted;
      }).length;
      


      // Generate charts data
      const salesTrend = generateSalesTrendData(sales);
      const productSales = generateProductSalesData(sales);

      // Calculate agent metrics for managers in overall view
      let agentMetrics = {
        totalAgents: 0,
        topPerformerSales: 0,
        teamTotalSales: 0,
        teamActivePolicies: 0,
        topAgents: []
      };

      if (shouldFetchOverall) {
        try {
          console.log('🔍 Fetching team data for manager overview...');
          // Use the proper API service instead of hardcoded fetch
          const teamResponse = await teamAPI.getTopAgents();
          
          if (teamResponse.status === 200) {
            const teamData = teamResponse.data;
            const agents = teamData.agents || [];
            console.log('🔍 Top agents data received:', { agentCount: agents.length });
            
            // Use the data from the new top-agents endpoint
            const top5Agents = agents.map(agent => ({
              id: agent.id,
              firstName: agent.firstName,
              lastName: agent.lastName,
              email: agent.email,
              totalSales: agent.salesCount || 0,
              totalPremium: agent.salesAmount || 0
            }));
            
            agentMetrics = {
              totalAgents: agents.length,
              topPerformerSales: Math.max(...agents.map(agent => agent.salesCount || 0), 0),
              teamTotalSales: agents.reduce((sum, agent) => sum + (agent.salesCount || 0), 0),
              teamActivePolicies: agents.reduce((sum, agent) => sum + (agent.salesCount || 0), 0),
              topAgents: top5Agents
            };
            

          } else {
            console.warn('⚠️ Top agents API response not OK:', teamResponse.status);
          }
        } catch (error) {
          console.error('❌ Error fetching top agents data:', error);
          // Don't fail the entire dashboard if team data fails
        }
      }

      const dashboardDataToSet = {
        totalSales,
        totalClients,
        activePolicies,
        monthlyRevenue,
        totalPremium,
        totalCommission,
        activeGoals,
        salesTrend,
        productSales,
        ...agentMetrics
      };
      

      setDashboardData(dashboardDataToSet);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      const errorMessage = error.message || 'Failed to load dashboard data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [user?.id, viewMode, user?.role]);

  // Add useEffect after fetchDashboardData is defined
  useEffect(() => {
    // Don't fetch data if auth is still loading or user is not available
    if (authLoading) {
      return;
    }
    
    if (!user?.id) {
      return;
    }
    
    // Fetch data when component mounts or when user/viewMode changes
    fetchDashboardData();
  }, [user?.id, viewMode, authLoading]); // Remove fetchDashboardData from dependencies to avoid infinite loop

  const calculateMonthlyRevenue = (sales) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return sales
      .filter(sale => {
        if (!sale.saleDate) return false;
        const saleDate = new Date(sale.saleDate);
        return saleDate.getMonth() === currentMonth && 
               saleDate.getFullYear() === currentYear &&
               sale.status === 'active';
      })
      .reduce((sum, sale) => sum + (parseFloat(sale.premiumAmount) || 0), 0);
  };

  const calculateTotalPremium = (sales) => {
    return sales
      .filter(sale => sale.status === 'active')
      .reduce((sum, sale) => sum + (parseFloat(sale.premiumAmount) || 0), 0);
  };

  const calculateTotalCommission = (sales) => {
    return sales
      .filter(sale => sale.status === 'active')
      .reduce((sum, sale) => sum + (parseFloat(sale.commissionAmount) || 0), 0);
  };

  const generateSalesTrendData = (sales) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthSales = sales.filter(sale => {
        if (!sale.saleDate) return false;
        const saleDate = new Date(sale.saleDate);
        return saleDate.getMonth() === index && 
               saleDate.getFullYear() === currentYear &&
               sale.status === 'active';
      });
      
      return {
        month,
        sales: monthSales.length,
        revenue: monthSales.reduce((sum, sale) => sum + (parseFloat(sale.premiumAmount) || 0), 0)
      };
    });
  };

  const generateProductSalesData = (sales) => {
    const productMap = {};
    
    sales.forEach(sale => {
      if (sale.status === 'active') {
        const productName = sale.productName || 'Unknown Product';
        productMap[productName] = (productMap[productName] || 0) + 1;
      }
    });
    
    return Object.entries(productMap).map(([name, count]) => ({
      name,
      value: count
    }));
  };

  const StatCard = ({ title, value, icon: Icon, description, trend }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading authentication...</p>
          <p className="text-xs text-muted-foreground mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">❌ Error loading dashboard</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! Here's your business overview.
          </p>
        </div>
        
        {user?.role === 'manager' && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">View:</span>
            <Button
              variant={viewMode === 'individual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('individual')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Individual
            </Button>
            <Button
              variant={viewMode === 'overall' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('overall')}
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Overall
            </Button>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={dashboardData.totalSales}
          icon={TrendingUp}
          description="Active policies"
        />
        <StatCard
          title="Total Clients"
          value={dashboardData.totalClients}
          icon={Users}
          description="Active clients & prospects"
        />
        <StatCard
          title="Monthly Revenue"
          value={dashboardData.monthlyRevenue}
          icon={DollarSign}
          description="This month's premium"
        />
        <StatCard
          title="Active Goals"
          value={dashboardData.activeGoals}
          icon={Target}
          description="Current targets"
        />
      </div>
      
      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Premium"
          value={dashboardData.totalPremium}
          icon={DollarSign}
          description="All active policies"
        />
        <StatCard
          title="Total Commission"
          value={dashboardData.totalCommission}
          icon={DollarSign}
          description="Earned commission"
        />
        <StatCard
          title="Active Policies"
          value={dashboardData.activePolicies}
          icon={FileText}
          description="Current active policies"
        />
      </div>

      {/* Agent Performance Metrics */}
      {user?.role === 'manager' && viewMode === 'overall' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top 5 Agents This Month</h2>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-900 dark:text-white flex items-center space-x-2">
                <span className="text-lg">🏆</span>
                <span>Top 5 Agents by Monthly Performance</span>
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400">Highest performing agents this month</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {dashboardData.topAgents && dashboardData.topAgents.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.topAgents.map((agent, index) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-amber-600' :
                          'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {agent.firstName} {agent.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {agent.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {agent.totalSales || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Sales Count
                        </div>
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          ${(agent.totalPremium || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Total Sales
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No agent data available for this month</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts - All displayed as separate cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Card */}
        <Card className="lg:col-span-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Monthly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Sales Count" />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Sales Card */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Product Sales Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.productSales}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dashboardData.productSales.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CleanDashboard;
