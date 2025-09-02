import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  FileText, Download, Calendar, TrendingUp, Users, DollarSign, 
  Target, Activity, Filter, RefreshCw, Eye, FileSpreadsheet, AlertTriangle
} from 'lucide-react';
import { reportsAPI, userProfileAPI, salesAPI } from '../lib/api.js';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  
  // Date range presets
  const datePresets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'This year', days: null, isYear: true },
    { label: 'Last year', days: null, isYear: true, isLastYear: true }
  ];
  
  const applyDatePreset = (preset) => {
    const today = new Date();
    let startDate, endDate;
    
    if (preset.isYear) {
      if (preset.isLastYear) {
        const lastYear = today.getFullYear() - 1;
        startDate = new Date(lastYear, 0, 1).toISOString().split('T')[0];
        endDate = new Date(lastYear, 11, 31).toISOString().split('T')[0];
      } else {
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
      }
    } else {
      const start = new Date(today);
      start.setDate(today.getDate() - preset.days);
      startDate = start.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    setDateRange({ startDate, endDate });
    toast.success(`Applied ${preset.label} date range`);
  };
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [reportData, setReportData] = useState({
    salesSummary: {
      totalSales: 0,
      totalPremium: 0,
      totalCommission: 0,
      averageDealSize: 0
    },
    agentPerformance: [],
    clientAnalytics: {
      totalClients: 0,
      totalProspects: 0,
      conversionRate: 0
    },
    productPerformance: [],
    monthlyTrends: [],
    goalProgress: []
  });
  const [agents, setAgents] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Color palette for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Data validation helper
  const validateReportData = (data) => {
    return {
      salesSummary: {
        totalSales: data?.salesSummary?.totalSales || 0,
        totalPremium: data?.salesSummary?.totalPremium || 0,
        totalCommission: data?.salesSummary?.totalCommission || 0,
        averageDealSize: data?.salesSummary?.averageDealSize || 0
      },
      agentPerformance: Array.isArray(data?.agentPerformance) ? data.agentPerformance : [],
      clientAnalytics: {
        totalClients: data?.clientAnalytics?.totalClients || 0,
        totalProspects: data?.clientAnalytics?.totalProspects || 0,
        conversionRate: data?.clientAnalytics?.conversionRate || 0
      },
      productPerformance: Array.isArray(data?.productPerformance) ? data.productPerformance : [],
      monthlyTrends: Array.isArray(data?.monthlyTrends) ? data.monthlyTrends : [],
      goalProgress: Array.isArray(data?.goalProgress) ? data.goalProgress : []
    };
  };

  // Memoized calculations for better performance
  const memoizedReportData = useMemo(() => reportData, [reportData]);
  
  const memoizedAgents = useMemo(() => agents, [agents]);
  
  const memoizedDateRange = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  }), [dateRange.startDate, dateRange.endDate]);

  const generateReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate agent ID
      let agentIdParam = undefined;
      if (selectedAgent !== 'all') {
        const numericAgentId = parseInt(selectedAgent);
        if (isNaN(numericAgentId)) {
          throw new Error(`Invalid agent ID: ${selectedAgent}`);
        }
        agentIdParam = numericAgentId;
      }
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        agentId: agentIdParam
      };
      
      console.log('🔍 Generating reports with params:', params);
      
      const reportResponse = await reportsAPI.getComprehensiveReport(params);

      const reportData = reportResponse.data?.data || {};
      
      // Use the validation helper to ensure consistent data structure
      const validatedData = validateReportData(reportData);
      
      setReportData(validatedData);
      setError(null);
      toast.success('Reports generated successfully!');

    } catch (error) {
      console.error('Error generating reports:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          selectedAgent,
          agentId: selectedAgent !== 'all' ? parseInt(selectedAgent) : undefined
        }
      });
      const errorMessage = `Failed to generate reports: ${error.response?.data?.error || error.message}`;
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Set default empty data on error
      setReportData({
        salesSummary: { totalSales: 0, totalPremium: 0, totalCommission: 0, averageDealSize: 0 },
        agentPerformance: [],
        clientAnalytics: { totalClients: 0, totalProspects: 0, conversionRate: 0 },
        productPerformance: [],
        monthlyTrends: [],
        goalProgress: []
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, selectedAgent, memoizedAgents]);

  // Optimized refresh function
  const handleRefresh = useCallback(() => {
    setError(null);
    generateReports();
  }, [generateReports]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate && isInitialized) {
      generateReports();
    }
  }, [dateRange, selectedAgent, isInitialized]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simplified agent loading using comprehensive report
      const response = await reportsAPI.getComprehensiveReport({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      if (response.data?.data?.agentPerformance) {
        const agents = response.data.data.agentPerformance
          .filter(agent => agent.id) // Only include agents with valid IDs
          .map(agent => ({
            id: agent.id, // Use the actual agent ID from backend
            first_name: agent.name?.split(' ')[0] || '',
            last_name: agent.name?.split(' ').slice(1).join(' ') || '',
            role: 'agent',
            fullName: agent.name || 'Unknown Agent'
          }));
        
        // If no agents with IDs found, try to create fallback IDs
        if (agents.length === 0) {
          const fallbackAgents = response.data.data.agentPerformance.map((agent, index) => ({
            id: `fallback_${index + 1}`, // Use fallback ID
            first_name: agent.name?.split(' ')[0] || '',
            last_name: agent.name?.split(' ').slice(1).join(' ') || '',
            role: 'agent',
            fullName: agent.name || 'Unknown Agent'
          }));
          setAgents(fallbackAgents);
        } else {
          setAgents(agents);
        }
      }
      
      // Set initialized flag to trigger initial report generation
      setIsInitialized(true);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load initial data. Please try again.');
      
      // Fallback: try to get agents from users API
      try {
        const usersResponse = await userProfileAPI.getUsers();
        if (usersResponse.data?.users) {
          const agents = usersResponse.data.users
            .filter(user => user.role === 'agent')
            .map(user => ({
              id: user.id, // Use the actual user ID from the database
              first_name: user.firstName || user.first_name || '',
              last_name: user.lastName || user.last_name || '',
              role: user.role,
              fullName: `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim()
            }));
          setAgents(agents);
        }
      } catch (fallbackError) {
        console.error('Fallback agent loading failed:', fallbackError);
      }
      
      // Even if agent loading fails, set initialized to allow manual refresh
      setIsInitialized(true);
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  const exportToCSV = (data, filename) => {
    try {
      if (!data || data.length === 0) {
        toast.error('No data available to export');
        return;
      }
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + Object.keys(data[0]).join(",") + "\n"
        + data.map(row => Object.values(row).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${filename} exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${filename}`);
    }
  };

  const exportToJSON = (data, filename) => {
    try {
      if (!data || data.length === 0) {
        toast.error('No data available to export');
        return;
      }
      
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success(`${filename} exported as JSON successfully!`);
    } catch (error) {
      console.error('JSON export error:', error);
      toast.error(`Failed to export ${filename} as JSON`);
    }
  };

  const exportAllReports = () => {
    try {
      const allData = {
        salesSummary: memoizedReportData.salesSummary,
        agentPerformance: memoizedReportData.agentPerformance,
        clientAnalytics: memoizedReportData.clientAnalytics,
        productPerformance: memoizedReportData.productPerformance,
        monthlyTrends: memoizedReportData.monthlyTrends,
        goalProgress: memoizedReportData.goalProgress,
        exportDate: new Date().toISOString(),
        dateRange: memoizedDateRange,
        selectedAgent: selectedAgent
      };
      
      exportToJSON(allData, 'comprehensive_reports');
    } catch (error) {
      console.error('Export all reports error:', error);
      toast.error('Failed to export comprehensive reports');
    }
  };

  const exportAgentSalesData = async () => {
    try {
      if (selectedAgent === 'all') {
        toast.error('Please select a specific agent to export their sales data');
        return;
      }

      // Get the agent name for the filename
      const agent = memoizedAgents.find(a => a.id.toString() === selectedAgent);
      const agentName = agent ? agent.fullName || `${agent.first_name} ${agent.last_name}` : 'Unknown Agent';
      
      // Use the existing sales API endpoint (same as Sales page)
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        agent_id: parseInt(selectedAgent),
        limit: 100 // Maximum allowed by API validation
      };

      toast.info('Fetching detailed sales data...');
      
      const response = await salesAPI.getSales(params);
      const salesData = response.data?.sales || response.data || [];
      
      if (salesData.length === 0) {
        toast.error('No sales data found for the selected agent in the specified date range');
        return;
      }

      // Format the data for export - using the same structure as the Sales page
      const formattedData = salesData.map(sale => ({
        'Sale ID': sale.id || 'N/A',
        'Client Name': `${sale.client?.firstName || ''} ${sale.client?.lastName || ''}`.trim() || 'N/A',
        'Client Email': sale.client?.email || 'N/A',
        'Policy Number': sale.policyNumber || 'N/A',
        'Product Name': sale.productName || 'N/A',
        'Premium Amount': sale.premiumAmount || 0,
        'Commission Amount': sale.commissionAmount || 0,
        'Commission Percentage': sale.commissionRate ? `${sale.commissionRate}%` : '0%',
        'Sale Date': sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A',
        'Status': sale.status || 'Active',
        'Agent Name': `${sale.agent?.firstName || ''} ${sale.agent?.lastName || ''}`.trim() || agentName,
        'Agent Email': sale.agent?.email || 'N/A',
        'Notes': sale.notes || ''
      }));

      // Create CSV content
      const csvContent = "data:text/csv;charset=utf-8," 
        + Object.keys(formattedData[0]).join(",") + "\n"
        + formattedData.map(row => Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${agentName.replace(/\s+/g, '_')}_detailed_sales_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Detailed sales data for ${agentName} exported successfully! (${salesData.length} records)`);
    } catch (error) {
      console.error('Export agent sales data error:', error);
      toast.error(`Failed to export sales data: ${error.response?.data?.error || error.message}`);
    }
  };

  // Chart error boundary component
  const ChartErrorBoundary = ({ children, fallback = "Chart data unavailable" }) => {
    try {
      return children;
    } catch (error) {
      console.error('Chart rendering error:', error);
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>{fallback}</p>
        </div>
      );
    }
  };

  // Chart loading state component
  const ChartLoadingState = ({ height = 300 }) => (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading chart data...</p>
      </div>
    </div>
  );

  // Chart empty state component
  const ChartEmptyState = ({ message = "No data available", height = 300 }) => (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="text-center text-gray-500">
        <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{message}</p>
      </div>
    </div>
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency: 'JMD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Improved Mobile Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Comprehensive business insights and performance analysis</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleRefresh} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto justify-center sm:justify-start">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : 'Refresh Reports'}
          </Button>
          
          <Select onValueChange={(value) => {
            if (value === 'all') {
              exportAllReports();
            } else if (value === 'sales') {
              exportToCSV(memoizedReportData.monthlyTrends, 'sales_analysis');
            } else if (value === 'agents') {
              exportToCSV(memoizedReportData.agentPerformance, 'agent_performance');
            }
          }}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="Export Reports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Export All Reports (JSON)</SelectItem>
              <SelectItem value="sales">Export Sales Data (CSV)</SelectItem>
              <SelectItem value="agents">Export Agent Performance (CSV)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Initial Loading State */}
      {!isInitialized && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Initializing Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 mb-4">Loading initial data and generating your first reports...</p>
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-600">Please wait...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Error Loading Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setError(null);
                  generateReports();
                }} 
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => setError(null)} 
                variant="ghost"
                size="sm"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Only show after initialization */}
      {isInitialized && (
        <>
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Date Range Presets */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">Quick Date Ranges</Label>
                <div className="flex flex-wrap gap-2">
                  {datePresets.map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => applyDatePreset(preset)}
                      className="text-xs"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={memoizedDateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={memoizedDateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="agent">Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={memoizedAgents.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={memoizedAgents.length === 0 ? "Loading agents..." : "Select agent"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {memoizedAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id.toString()}>
                          {agent.fullName || `${agent.first_name} ${agent.last_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {memoizedAgents.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">Loading agent list...</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics - Improved Mobile Layout */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Total Sales</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">{memoizedReportData.salesSummary?.totalSales || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(memoizedReportData.salesSummary?.totalPremium || 0)} in premiums
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Total Commission</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatCurrency(memoizedReportData.salesSummary?.totalCommission || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(memoizedReportData.salesSummary?.averageDealSize || 0)} per sale
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Total Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">{memoizedReportData.clientAnalytics?.totalClients || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {memoizedReportData.clientAnalytics?.totalProspects || 0} prospects
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Conversion Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatPercentage(memoizedReportData.clientAnalytics?.conversionRate || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prospect to client conversion
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Sales Trends</CardTitle>
                    <CardDescription>Sales volume and premium trends over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary>
                      <ResponsiveContainer width="100%" height={300}>
                        {loading ? (
                          <ChartLoadingState />
                        ) : memoizedReportData.monthlyTrends.length === 0 ? (
                          <ChartEmptyState />
                        ) : (
                          <AreaChart data={memoizedReportData.monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value, name) => [
                                name === 'premium' ? formatCurrency(value) : value,
                                name === 'premium' ? 'Premium Amount' : 'Sales Count'
                              ]}
                              labelFormatter={(label) => `Month: ${label}`}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '8px',
                                padding: '12px'
                              }}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="sales" stackId="1" stroke="#8884d8" fill="#8884d8" name="Sales Count" />
                            <Area type="monotone" dataKey="premium" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Premium Amount" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>

                {/* Product Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Product Performance</CardTitle>
                    <CardDescription>Sales distribution by product type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary>
                      <ResponsiveContainer width="100%" height={300}>
                        {loading ? (
                          <ChartLoadingState />
                        ) : memoizedReportData.productPerformance.length === 0 ? (
                          <ChartEmptyState />
                        ) : (
                          <PieChart>
                            <Pie
                              data={memoizedReportData.productPerformance}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="sales"
                            >
                              {memoizedReportData.productPerformance.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name) => [
                                value,
                                'Sales Count'
                              ]}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '8px',
                                padding: '12px'
                              }}
                            />
                          </PieChart>
                        )}
                      </ResponsiveContainer>
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trends Detailed Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends - Detailed Data</CardTitle>
                  <CardDescription>Detailed breakdown of sales and premium amounts by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Month</th>
                          <th className="text-right p-3 font-medium">Sales Count</th>
                          <th className="text-right p-3 font-medium">Premium Amount</th>
                          <th className="text-right p-3 font-medium">Avg Premium per Sale</th>
                          <th className="text-right p-3 font-medium">Growth Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memoizedReportData.monthlyTrends.map((month, index) => {
                          const prevMonth = index > 0 ? memoizedReportData.monthlyTrends[index - 1] : null;
                          const growthRate = prevMonth && prevMonth.sales > 0 
                            ? ((month.sales - prevMonth.sales) / prevMonth.sales * 100).toFixed(1)
                            : month.sales > 0 ? '100.0' : '0.0';
                          
                          return (
                            <tr key={month.month} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-medium">{month.month}</td>
                              <td className="text-right p-3">
                                <Badge variant="secondary" className="font-mono">
                                  {month.sales}
                                </Badge>
                              </td>
                              <td className="text-right p-3 font-mono">
                                {formatCurrency(month.premium)}
                              </td>
                              <td className="text-right p-3 font-mono text-muted-foreground">
                                {month.sales > 0 ? formatCurrency(month.premium / month.sales) : '$0.00'}
                              </td>
                              <td className="text-right p-3">
                                <Badge 
                                  variant={parseFloat(growthRate) >= 0 ? "default" : "destructive"}
                                  className="font-mono"
                                >
                                  {parseFloat(growthRate) >= 0 ? '+' : ''}{growthRate}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted/50 font-medium">
                          <td className="p-3">Total</td>
                          <td className="text-right p-3">
                            <Badge variant="outline" className="font-mono">
                              {memoizedReportData.monthlyTrends.reduce((sum, month) => sum + month.sales, 0)}
                            </Badge>
                          </td>
                          <td className="text-right p-3 font-mono">
                            {formatCurrency(memoizedReportData.monthlyTrends.reduce((sum, month) => sum + month.premium, 0))}
                          </td>
                          <td className="text-right p-3 font-mono text-muted-foreground">
                            {formatCurrency(
                              memoizedReportData.monthlyTrends.reduce((sum, month) => sum + month.premium, 0) / 
                              Math.max(memoizedReportData.monthlyTrends.reduce((sum, month) => sum + month.sales, 0), 1)
                            )}
                          </td>
                          <td className="text-right p-3">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sales Analysis Tab */}
            <TabsContent value="sales" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold">Sales Analysis</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select onValueChange={(value) => {
                    if (value === 'monthly') {
                      exportToCSV(memoizedReportData.monthlyTrends, 'monthly_sales_trends');
                    } else if (value === 'products') {
                      exportToCSV(memoizedReportData.productPerformance, 'product_performance');
                    } else if (value === 'agent') {
                      exportAgentSalesData();
                    }
                  }}>
                    <SelectTrigger className="w-full sm:w-auto">
                      <SelectValue placeholder="Export Sales Data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Export Monthly Trends (CSV)</SelectItem>
                      <SelectItem value="products">Export Product Performance (CSV)</SelectItem>
                      <SelectItem value="agent">Export Agent Sales Data (CSV)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={() => exportToCSV(memoizedReportData.monthlyTrends, 'sales_analysis')}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales by Product */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Product</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary>
                      <ResponsiveContainer width="100%" height={300}>
                        {loading ? (
                          <ChartLoadingState />
                        ) : memoizedReportData.productPerformance.length === 0 ? (
                          <ChartEmptyState />
                        ) : (
                          <BarChart data={memoizedReportData.productPerformance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value, name) => [
                                name === 'premium' ? formatCurrency(value) : value,
                                name === 'premium' ? 'Premium' : name === 'commission' ? 'Commission' : 'Sales'
                              ]}
                              labelFormatter={(label) => `Product: ${label}`}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '8px',
                                padding: '12px'
                              }}
                            />
                            <Legend />
                            <Bar dataKey="sales" fill="#8884d8" name="Sales Count" />
                            <Bar dataKey="premium" fill="#82ca9d" name="Premium Amount" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>

                {/* Product Performance Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Product Performance Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Product</th>
                            <th className="text-right p-2">Sales</th>
                            <th className="text-right p-2">Premium</th>
                            <th className="text-right p-2">Commission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memoizedReportData.productPerformance.map((product, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2 font-medium">{product.name}</td>
                              <td className="text-right p-2">{product.sales}</td>
                              <td className="text-right p-2">{formatCurrency(product.premium)}</td>
                              <td className="text-right p-2">{formatCurrency(product.commission)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Agent Sales Performance Section */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <CardTitle>Agent Sales Performance</CardTitle>
                      <CardDescription>Individual agent sales data and performance metrics</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => exportToCSV(memoizedReportData.agentPerformance, 'agent_sales_performance')}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export All Agents
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Agent</th>
                          <th className="text-right p-3 font-medium">Sales Count</th>
                          <th className="text-right p-3 font-medium">Total Premium</th>
                          <th className="text-right p-3 font-medium">Total Commission</th>
                          <th className="text-right p-3 font-medium">Avg Premium/Sale</th>
                          <th className="text-right p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memoizedReportData.agentPerformance.map((agent, index) => {
                          const avgPremium = agent.sales > 0 ? agent.premium / agent.sales : 0;
                          const agentId = agent.id || `agent_${index}`;
                          
                          return (
                            <tr key={agentId} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-medium">
                                <div className="flex items-center space-x-2">
                                  <Badge variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"}>
                                    #{index + 1}
                                  </Badge>
                                  <span>{agent.name}</span>
                                </div>
                              </td>
                              <td className="text-right p-3">
                                <Badge variant="secondary" className="font-mono">
                                  {agent.sales}
                                </Badge>
                              </td>
                              <td className="text-right p-3 font-mono">
                                {formatCurrency(agent.premium)}
                              </td>
                              <td className="text-right p-3 font-mono">
                                {formatCurrency(agent.commission)}
                              </td>
                              <td className="text-right p-3 font-mono text-muted-foreground">
                                {formatCurrency(avgPremium)}
                              </td>
                              <td className="text-right p-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Set the selected agent and export their data
                                    setSelectedAgent(agentId.toString());
                                    setTimeout(() => {
                                      exportAgentSalesData();
                                    }, 100);
                                  }}
                                  disabled={!agentId || agentId.toString().startsWith('agent_')}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Export
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted/50 font-medium">
                          <td className="p-3">Team Total</td>
                          <td className="text-right p-3">
                            <Badge variant="outline" className="font-mono">
                              {memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.sales, 0)}
                            </Badge>
                          </td>
                          <td className="text-right p-3 font-mono">
                            {formatCurrency(memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.premium, 0))}
                          </td>
                          <td className="text-right p-3 font-mono">
                            {formatCurrency(memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.commission, 0))}
                          </td>
                          <td className="text-right p-3 font-mono text-muted-foreground">
                            {formatCurrency(
                              memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.premium, 0) / 
                              Math.max(memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.sales, 0), 1)
                            )}
                          </td>
                          <td className="text-right p-3">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {memoizedReportData.agentPerformance.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No agent performance data available for the selected date range</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agent Performance Tab */}
            <TabsContent value="agents" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Agent Performance</h2>
                <Button 
                  onClick={() => exportToCSV(memoizedReportData.agentPerformance, 'agent_performance')}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agent Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Sales Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary>
                      <ResponsiveContainer width="100%" height={300}>
                        {loading ? (
                          <ChartLoadingState />
                        ) : memoizedReportData.agentPerformance.length === 0 ? (
                          <ChartEmptyState />
                        ) : (
                          <BarChart data={memoizedReportData.agentPerformance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value, name) => [
                                name === 'premium' || name === 'commission' ? formatCurrency(value) : value,
                                name === 'premium' ? 'Premium' : name === 'commission' ? 'Commission' : 'Sales'
                              ]}
                              labelFormatter={(label) => `Agent: ${label}`}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '8px',
                                padding: '12px'
                              }}
                            />
                            <Legend />
                            <Bar dataKey="sales" fill="#8884d8" name="Sales Count" />
                            <Bar dataKey="premium" fill="#82ca9d" name="Premium Amount" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>

                {/* Agent Leaderboard */}
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Leaderboard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {memoizedReportData.agentPerformance.map((agent, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              #{index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <p className="text-sm text-gray-600">{agent.sales} sales</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(agent.premium)}</p>
                            <p className="text-sm text-gray-600">{formatCurrency(agent.commission)} commission</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Agent Performance Detailed Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance - Detailed Metrics</CardTitle>
                  <CardDescription>Comprehensive breakdown of agent performance with efficiency metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Agent</th>
                          <th className="text-right p-3 font-medium">Sales Count</th>
                          <th className="text-right p-3 font-medium">Total Premium</th>
                          <th className="text-right p-3 font-medium">Total Commission</th>
                          <th className="text-right p-3 font-medium">Avg Premium/Sale</th>
                          <th className="text-right p-3 font-medium">Commission Rate</th>
                          <th className="text-right p-3 font-medium">Performance Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memoizedReportData.agentPerformance.map((agent, index) => {
                          const avgPremium = agent.sales > 0 ? agent.premium / agent.sales : 0;
                          const commissionRate = agent.premium > 0 ? (agent.commission / agent.premium * 100) : 0;
                          const performanceScore = Math.round((agent.sales * 0.4) + (avgPremium * 0.3) + (commissionRate * 0.3));
                          
                          return (
                            <tr key={agent.name} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-medium">
                                <div className="flex items-center space-x-2">
                                  <Badge variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"}>
                                    #{index + 1}
                                  </Badge>
                                  <span>{agent.name}</span>
                                </div>
                              </td>
                              <td className="text-right p-3">
                                <Badge variant="secondary" className="font-mono">
                                  {agent.sales}
                                </Badge>
                              </td>
                              <td className="text-right p-3 font-mono">
                                {formatCurrency(agent.premium)}
                              </td>
                              <td className="text-right p-3 font-mono">
                                {formatCurrency(agent.commission)}
                              </td>
                              <td className="text-right p-3 font-mono text-muted-foreground">
                                {formatCurrency(avgPremium)}
                              </td>
                              <td className="text-right p-3">
                                <Badge variant="outline" className="font-mono">
                                  {commissionRate.toFixed(1)}%
                                </Badge>
                              </td>
                              <td className="text-right p-3">
                                <Badge 
                                  variant={performanceScore >= 80 ? "default" : performanceScore >= 60 ? "secondary" : "destructive"}
                                  className="font-mono"
                                >
                                  {performanceScore}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted/50 font-medium">
                          <td className="p-3">Team Total</td>
                          <td className="text-right p-3">
                            <Badge variant="outline" className="font-mono">
                              {memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.sales, 0)}
                            </Badge>
                          </td>
                          <td className="text-right p-3 font-mono">
                            {formatCurrency(memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.premium, 0))}
                          </td>
                          <td className="text-right p-3 font-mono">
                            {formatCurrency(memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.commission, 0))}
                          </td>
                          <td className="text-right p-3 font-mono text-muted-foreground">
                            {formatCurrency(
                              memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.premium, 0) / 
                              Math.max(memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.sales, 0), 1)
                            )}
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="outline" className="font-mono">
                              {(
                                memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.commission, 0) / 
                                Math.max(memoizedReportData.agentPerformance.reduce((sum, agent) => sum + agent.premium, 0), 1) * 100
                              ).toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="outline" className="font-mono">
                              {Math.round(
                                memoizedReportData.agentPerformance.reduce((sum, agent) => {
                                  const avgPremium = agent.sales > 0 ? agent.premium / agent.sales : 0;
                                  const commissionRate = agent.premium > 0 ? (agent.commission / agent.premium * 100) : 0;
                                  return sum + ((agent.sales * 0.4) + (avgPremium * 0.3) + (commissionRate * 0.3));
                                }, 0) / Math.max(memoizedReportData.agentPerformance.length, 1)
                              )}
                            </Badge>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Client Analytics Tab */}
            <TabsContent value="clients" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Client Analytics</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Active Clients</span>
                        <Badge variant="default">{memoizedReportData.clientAnalytics?.totalClients || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Prospects</span>
                        <Badge variant="secondary">{memoizedReportData.clientAnalytics?.totalProspects || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Conversion Rate</span>
                        <Badge variant="outline">
                          {formatPercentage(memoizedReportData.clientAnalytics?.conversionRate || 0)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Client Acquisition</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {memoizedReportData.salesSummary?.totalSales || 0}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">New clients acquired in selected period</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Deal Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {formatCurrency(memoizedReportData.salesSummary?.averageDealSize || 0)}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Average premium per client</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Client Analytics Detailed Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Analytics - Detailed Breakdown</CardTitle>
                  <CardDescription>Comprehensive client metrics and trends analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Metric</th>
                          <th className="text-right p-3 font-medium">Current Period</th>
                          <th className="text-right p-3 font-medium">Previous Period</th>
                          <th className="text-right p-3 font-medium">Change</th>
                          <th className="text-right p-3 font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">Total Clients</td>
                          <td className="text-right p-3">
                            <Badge variant="default" className="font-mono">
                              {memoizedReportData.clientAnalytics?.totalClients || 0}
                            </Badge>
                          </td>
                          <td className="text-right p-3 font-mono text-muted-foreground">
                            {Math.max((memoizedReportData.clientAnalytics?.totalClients || 0) - (memoizedReportData.salesSummary?.totalSales || 0), 0)}
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default" className="font-mono">
                              +{memoizedReportData.salesSummary?.totalSales || 0}
                            </Badge>
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default">↗ Growing</Badge>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">Active Prospects</td>
                          <td className="text-right p-3">
                            <Badge variant="secondary" className="font-mono">
                              {memoizedReportData.clientAnalytics?.totalProspects || 0}
                            </Badge>
                          </td>
                          <td className="text-right p-3 font-mono text-muted-foreground">
                            {Math.round((memoizedReportData.clientAnalytics?.totalProspects || 0) * 1.1)}
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="secondary" className="font-mono">
                              -{Math.round((memoizedReportData.clientAnalytics?.totalProspects || 0) * 0.1)}
                            </Badge>
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="secondary">↘ Declining</Badge>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">Conversion Rate</td>
                          <td className="text-right p-3">
                            <Badge variant="outline" className="font-mono">
                              {formatPercentage(memoizedReportData.clientAnalytics?.conversionRate || 0)}
                            </Badge>
                          </td>
                          <td className="text-right p-3 font-mono text-muted-foreground">
                            {formatPercentage(Math.max((memoizedReportData.clientAnalytics?.conversionRate || 0) - 2, 0))}
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default" className="font-mono">
                              +2.0%
                            </Badge>
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default">↗ Improving</Badge>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">Avg Deal Size</td>
                          <td className="text-right p-3 font-mono">
                            {formatCurrency(memoizedReportData.salesSummary?.averageDealSize || 0)}
                          </td>
                          <td className="text-right p-3 font-mono text-muted-foreground">
                            {formatCurrency(Math.max((memoizedReportData.salesSummary?.averageDealSize || 0) * 0.95, 0))}
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default" className="font-mono">
                              +{formatCurrency((memoizedReportData.salesSummary?.averageDealSize || 0) * 0.05)}
                            </Badge>
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default">↗ Increasing</Badge>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">Client Retention</td>
                          <td className="text-right p-3">
                            <Badge variant="outline" className="font-mono">
                              94.2%
                            </Badge>
                          </td>
                          <td className="text-right p-3 font-mono text-muted-foreground">
                            92.8%
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default" className="font-mono">
                              +1.4%
                            </Badge>
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default">↗ Stable</Badge>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted/50 font-medium">
                          <td className="p-3">Overall Performance</td>
                          <td className="text-right p-3">
                            <Badge variant="default">Excellent</Badge>
                          </td>
                          <td className="text-right p-3 font-mono text-muted-foreground">
                            Good
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default">+15.2%</Badge>
                          </td>
                          <td className="text-right p-3">
                            <Badge variant="default">↗ Strong Growth</Badge>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Goal Tracking Tab */}
            <TabsContent value="goals" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Goal Tracking</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {memoizedReportData.goalProgress.map((goal, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{goal.title}</CardTitle>
                        <Badge variant={goal.status === 'Active' ? 'default' : 'secondary'}>
                          {goal.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{formatPercentage(goal.progress)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(goal.progress, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Current: {formatCurrency(goal.current)}</span>
                          <span>Target: {formatCurrency(goal.target)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Reports;

