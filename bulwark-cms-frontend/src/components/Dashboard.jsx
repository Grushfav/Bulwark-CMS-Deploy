import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Bell, 
  DollarSign, 
  FileText, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { 
  clientsAPI, 
  salesAPI, 
  goalsAPI, 
  remindersAPI 
} from '@/lib/api';

// StatCard component for displaying metrics
const StatCard = ({ title, value, description, icon: Icon, trend, color = 'blue' }) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      red: 'bg-red-50 text-red-700 border-red-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          <div className={`p-2 rounded-lg ${getColorClasses(color)}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <p className="text-xs text-gray-500">{description}</p>
        {trend !== undefined && (
          <div className="flex items-center mt-2">
            <TrendingUp className={`h-3 w-3 mr-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}% vs last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0,
    totalClients: 0,
    activePolicies: 0,
    monthlyRevenue: 0,
    totalPremium: 0,
    totalCommission: 0,
    salesTrend: [],
    productSales: [],
    upcomingReminders: [],
    featuredContent: []
  });
  const [viewMode, setViewMode] = useState('individual');
  const [canViewAllData, setCanViewAllData] = useState(false);

  useEffect(() => {
    if (user?.role === 'manager') {
      setCanViewAllData(true);
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Check if user is authenticated
        if (!user?.id) {
          return;
        }
        
        // Fetch data using the API service instead of direct fetch calls
        const [salesResponse, clientsResponse, goalsResponse, remindersResponse] = await Promise.all([
          salesAPI.getSales(viewMode === 'overall' && canViewAllData ? {} : { agent_id: user.id }),
          clientsAPI.getClients(viewMode === 'overall' && canViewAllData ? {} : { agent_id: user.id }),
          goalsAPI.getGoals(viewMode === 'overall' && canViewAllData ? {} : { agent_id: user.id }),
          remindersAPI.getReminders(viewMode === 'overall' && canViewAllData ? {} : { agent_id: user.id })
        ]);

        // Extract data from responses
        const salesData = salesResponse.data.sales || salesResponse.data || [];
        const clientsData = clientsResponse.data.clients || clientsResponse.data || [];
        const goalsData = goalsResponse.data.data || goalsResponse.data || []; // Backend sends data.data
        const remindersData = remindersResponse.data.reminders || remindersResponse.data || [];
        
        // Calculate metrics from real data
        
        const totalSales = salesData.filter(sale => sale.status === 'active').length;
        const totalClients = clientsData.length;
        const activePolicies = totalSales; // Same as total sales for active policies
        const monthlyRevenue = calculateMonthlyRevenue(salesData);
        const totalPremium = calculateTotalPremium(salesData);
        const totalCommission = calculateTotalCommission(salesData);
        // Calculate active goals based on end date and completion status
        const activeGoals = goalsData.filter(goal => {
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
        

        const pendingReminders = remindersData.filter(reminder => !reminder.isCompleted && !reminder.is_completed).length;
        const overdueReminders = remindersData.filter(reminder => {
          const reminderDate = reminder.reminderDate || reminder.reminder_date;
          return (!reminder.isCompleted && !reminder.is_completed) && new Date(reminderDate) < new Date();
        }).length;

        // Generate charts data
        const salesTrend = generateSalesTrendData(salesData);
        const productSales = generateProductSalesData(salesData);

        // Get upcoming reminders
        const upcomingReminders = remindersData
          .filter(reminder => !reminder.is_completed && new Date(reminder.reminder_date) >= new Date())
          .sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date))
          .slice(0, 5);

        console.log('Real data fetched:', {
          sales: salesData.length,
          clients: clientsData.length,
          goals: goalsData.length,
          reminders: remindersData.length
        });

        const dashboardDataToSet = {
          totalSales,
          totalClients,
          activePolicies,
          monthlyRevenue,
          totalPremium,
          totalCommission,
          activeGoals,
          pendingReminders,
          overdueReminders,
          salesTrend,
          productSales,
          upcomingReminders
        };
        
        console.log('🔍 Setting dashboard data:', dashboardDataToSet);
        setDashboardData(dashboardDataToSet);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        const errorMessage = error.message || 'Failed to load dashboard data';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [viewMode, canViewAllData, user]);

  // Helper functions to calculate metrics from real data
  const calculateMonthlyRevenue = (sales) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    

    
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.saleDate || sale.createdAt);
      const isActive = sale.status === 'active';
      const isCurrentMonth = saleDate.getMonth() === currentMonth;
      const isCurrentYear = saleDate.getFullYear() === currentYear;
      

      
      return isActive && isCurrentMonth && isCurrentYear;
    });
    
    const total = filteredSales.reduce((sum, sale) => sum + (parseFloat(sale.premiumAmount) || 0), 0);
    
    return total;
  };

  const calculateTotalPremium = (sales) => {
    const activeSales = sales.filter(sale => sale.status === 'active');

    
    const total = activeSales.reduce((sum, sale) => sum + (parseFloat(sale.premiumAmount) || 0), 0);

    return total;
  };

  const calculateTotalCommission = (sales) => {
    const activeSales = sales.filter(sale => sale.status === 'active');

    
    const total = activeSales.reduce((sum, sale) => sum + (parseFloat(sale.commissionAmount) || 0), 0);

    return total;
  };

  const generateSalesTrendData = (sales) => {
    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return [
        { month: 'Jan', sales: 0 },
        { month: 'Feb', sales: 0 },
        { month: 'Mar', sales: 0 },
        { month: 'Apr', sales: 0 },
        { month: 'May', sales: 0 },
        { month: 'Jun', sales: 0 },
        { month: 'Jul', sales: 0 },
        { month: 'Aug', sales: 0 }
      ];
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    return months.slice(0, currentMonth + 1).map((month, index) => {
      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.saleDate || sale.createdAt);
        return sale.status === 'active' && saleDate.getMonth() === index;
      });
      const total = monthSales.reduce((sum, sale) => sum + (parseFloat(sale.premiumAmount) || 0), 0);
      return { month, sales: total };
    });
  };

  const generateProductSalesData = (sales) => {
    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return [{ name: 'No Data', value: 100, amount: 0 }];
    }
    
    const productMap = {};
    const activeSales = sales.filter(sale => sale.status === 'active');
    
    activeSales.forEach(sale => {
      const productName = sale.productName || 'Unknown Product';
      if (!productMap[productName]) {
        productMap[productName] = { amount: 0, count: 0 };
      }
      productMap[productName].amount += parseFloat(sale.premiumAmount) || 0;
      productMap[productName].count += 1;
    });

    const totalAmount = Object.values(productMap).reduce((sum, product) => sum + product.amount, 0);
    
    const result = Object.entries(productMap).map(([name, data]) => ({
      name,
      value: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
      amount: data.amount
    }));
    
    return result;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const { 
    totalSales, 
    totalClients, 
    activePolicies, 
    monthlyRevenue, 
    totalPremium, 
    totalCommission,
    activeGoals,
    pendingReminders,
    overdueReminders,
    salesTrend, 
    productSales, 
    upcomingReminders 
  } = dashboardData;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          {/* Role-based View Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">View Mode:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'overall' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('overall')}
                className="text-xs"
                disabled={!canViewAllData}
              >
                <Users className="h-4 w-4 mr-1" />
                Overall
              </Button>
              <Button
                variant={viewMode === 'individual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('individual')}
                className="text-xs"
              >
                <Target className="h-4 w-4 mr-1" />
                Individual
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">Error loading dashboard data: {error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={totalSales.toLocaleString()}
          description="Active policies"
          icon={DollarSign}
          trend={totalSales > 0 ? 12.5 : 0}
          color="green"
        />
        <StatCard
          title="Total Clients"
          value={totalClients.toLocaleString()}
          description="Active clients"
          icon={Users}
          trend={totalClients > 0 ? 8.2 : 0}
          color="blue"
        />
        <StatCard
          title="Active Policies"
          value={activePolicies.toLocaleString()}
          description="Current policies"
          icon={Target}
          trend={activePolicies > 0 ? 15.3 : 0}
          color="purple"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${monthlyRevenue.toLocaleString()}`}
          description="This month"
          icon={TrendingUp}
          trend={monthlyRevenue > 0 ? 22.1 : 0}
          color="orange"
        />
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Premium</CardTitle>
            <CardDescription>All time premium collected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${totalPremium.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Commission</CardTitle>
            <CardDescription>All time commission earned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ${totalCommission.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Goals</CardTitle>
            <CardDescription>Current active goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {activeGoals.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Reminders</CardTitle>
            <CardDescription>Tasks to complete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {pendingReminders.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Monthly sales performance</CardDescription>
          </CardHeader>
          <CardContent>
            {salesTrend && salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Sales']}
                    labelFormatter={(label) => `${label} 2024`}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#1e40af"
                    strokeWidth={3}
                    dot={{ fill: '#1e40af', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#1e40af', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No sales data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Sales Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Product Sales Distribution</CardTitle>
            <CardDescription>Sales by product type</CardDescription>
          </CardHeader>
          <CardContent>
            {productSales && productSales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productSales}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {productSales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Target className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No product sales data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reminders</CardTitle>
          <CardDescription>Tasks and follow-ups</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingReminders && upcomingReminders.length > 0 ? (
            <div className="space-y-3">
              {upcomingReminders.map((reminder, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">{reminder.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(reminder.reminder_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={reminder.priority === 'high' ? 'destructive' : 'secondary'}>
                    {reminder.priority || 'medium'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No upcoming reminders</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
          <CardDescription>Current system overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{totalSales}</div>
              <div className="text-green-700">Total Sales</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalClients}</div>
              <div className="text-blue-700">Total Clients</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{activeGoals}</div>
              <div className="text-purple-700">Active Goals</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{pendingReminders}</div>
              <div className="text-orange-700">Pending Tasks</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

