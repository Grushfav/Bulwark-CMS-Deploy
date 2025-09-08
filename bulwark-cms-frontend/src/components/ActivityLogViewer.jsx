import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  Activity, 
  Download, 
  Filter, 
  RefreshCw, 
  Eye, 
  User,
  TrendingUp,
  FileText,
  Clock,
  MapPin,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import { activityLogsAPI } from '../lib/api.js';
import { useAuth } from '@/hooks/useAuth.jsx';

const ActivityLogViewer = () => {
  const { user, isManager } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
    limit: 50
  });

  // Load activity logs
  const loadLogs = useCallback(async () => {
    if (!isManager) return;
    
    setLoading(true);
    try {
      const params = {};
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (filters.userId) params.userId = filters.userId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.limit) params.limit = filters.limit;

      const response = await activityLogsAPI.getActivityLogs(params);
      // The API returns { success: true, data: logs }
      setLogs(response.data?.data || []);
    } catch (error) {
      console.error('Error loading activity logs:', error);
      toast.error('Failed to load activity logs');
      setLogs([]); // Ensure it's always an array
    } finally {
      setLoading(false);
    }
  }, [filters, isManager]);

  // Load activity statistics
  const loadStats = useCallback(async () => {
    if (!isManager) return;
    
    try {
      const response = await activityLogsAPI.getActivityStats();
      // The API returns { success: true, data: stats }
      setStats(response.data?.data || []);
    } catch (error) {
      console.error('Error loading activity stats:', error);
      setStats([]); // Ensure it's always an array
    }
  }, [isManager]);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      entityType: '',
      action: '',
      userId: '',
      startDate: '',
      endDate: '',
      limit: 50
    });
  };

  // Export logs to CSV
  const exportLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (filters.userId) params.userId = filters.userId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await activityLogsAPI.exportActivityLogs(params);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Activity logs exported successfully');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Failed to export activity logs');
    } finally {
      setLoading(false);
    }
  };

  // View log details
  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get action badge color
  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'updated': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'deleted': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'imported': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'exported': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get entity type badge color
  const getEntityBadgeColor = (entityType) => {
    switch (entityType) {
      case 'client': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'sale': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'reminder': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'goal': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Check if user has access
  if (!isManager) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logs
          </CardTitle>
          <CardDescription>
            View system activity and audit trails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              You need manager privileges to view activity logs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground">
            Monitor system activity and track user actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadLogs} 
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportLogs} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="entityType">Entity Type</Label>
              <Select value={filters.entityType} onValueChange={(value) => handleFilterChange('entityType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="goal">Goal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="imported">Imported</SelectItem>
                  <SelectItem value="exported">Exported</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="limit">Limit</Label>
              <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Activity Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold">
                    {stat.count}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.entityType} {stat.action}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Activity ({logs.length} logs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading activity logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activity logs found for the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getEntityBadgeColor(log.entityType)}>
                          {log.entityType}
                        </Badge>
                        <Badge className={getActionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ID: {log.entityId}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {log.user?.firstName} {log.user?.lastName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.user?.role}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(log.createdAt)}</span>
                        </div>
                        
                        {log.ipAddress && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-xs">{log.ipAddress}</span>
                          </div>
                        )}
                        
                        {log.userAgent && (
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs truncate" title={log.userAgent}>
                              {log.userAgent.split(' ')[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {log.details && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <strong>Details:</strong> {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewLogDetails(log)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Log Details</DialogTitle>
            <DialogDescription>
              Detailed information about this activity
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>ID:</strong> {selectedLog.id}</div>
                    <div><strong>Entity Type:</strong> 
                      <Badge className={`ml-2 ${getEntityBadgeColor(selectedLog.entityType)}`}>
                        {selectedLog.entityType}
                      </Badge>
                    </div>
                    <div><strong>Entity ID:</strong> {selectedLog.entityId}</div>
                    <div><strong>Action:</strong> 
                      <Badge className={`ml-2 ${getActionBadgeColor(selectedLog.action)}`}>
                        {selectedLog.action}
                      </Badge>
                    </div>
                    <div><strong>Date:</strong> {formatDate(selectedLog.createdAt)}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">User Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>User:</strong> {selectedLog.user?.firstName} {selectedLog.user?.lastName}</div>
                    <div><strong>Email:</strong> {selectedLog.user?.email}</div>
                    <div><strong>Role:</strong> 
                      <Badge variant="outline" className="ml-2">
                        {selectedLog.user?.role}
                      </Badge>
                    </div>
                    {selectedLog.ipAddress && (
                      <div><strong>IP Address:</strong> <span className="font-mono">{selectedLog.ipAddress}</span></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              {selectedLog.details && (
                <div>
                  <h4 className="font-medium mb-2">Details</h4>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Old Values */}
              {selectedLog.oldValues && (
                <div>
                  <h4 className="font-medium mb-2">Previous Values</h4>
                  <pre className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Values */}
              {selectedLog.newValues && (
                <div>
                  <h4 className="font-medium mb-2">New Values</h4>
                  <pre className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div>
                  <h4 className="font-medium mb-2">User Agent</h4>
                  <p className="text-sm bg-muted p-2 rounded font-mono break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityLogViewer;
