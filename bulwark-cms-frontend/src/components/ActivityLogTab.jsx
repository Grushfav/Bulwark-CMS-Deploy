import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Activity, 
  Calendar,
  User,
  Database,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { activityLogsAPI } from '../lib/api.js';
import { useAuth } from '@/hooks/useAuth.jsx';

const ActivityLogTab = ({ onViewAll }) => {
  const { user, isManager } = useAuth();
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load recent activity logs
  const loadRecentLogs = async () => {
    if (!isManager) return;
    
    setLoading(true);
    try {
      const response = await activityLogsAPI.getActivityLogs({ limit: 10 });
      // The API returns { success: true, data: logs }
      setRecentLogs(response.data?.data || []);
    } catch (error) {
      console.error('Error loading recent activity logs:', error);
      toast.error('Failed to load recent activity logs');
      setRecentLogs([]); // Ensure it's always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentLogs();
  }, [isManager]);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
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

  // Get entity type icon
  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'client': return <User className="h-4 w-4" />;
      case 'sale': return <Database className="h-4 w-4" />;
      case 'reminder': return <Calendar className="h-4 w-4" />;
      case 'goal': return <Activity className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  // Check if user has access
  if (!isManager) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            System activity and audit trails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground text-sm">
              You need manager privileges to view activity logs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system activities and user actions
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onViewAll}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading recent activity...</p>
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 mt-1">
                  {getEntityIcon(log.entityType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {log.entityType}
                    </Badge>
                    <Badge className={`text-xs ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </Badge>
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium">
                      {log.user?.firstName} {log.user?.lastName}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}{log.action} {log.entityType} #{log.entityId}
                    </span>
                  </div>
                  
                  {log.details && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
                
                <div className="flex-shrink-0 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogTab;
