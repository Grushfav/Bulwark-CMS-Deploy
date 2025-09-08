import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx';
import { Badge } from './ui/badge.jsx';
import { Trophy, Users, DollarSign } from 'lucide-react';
import { reportsAPI } from '../lib/api.js';

const AgentLeaderboard = ({ title = "Top 5 Agents This Month", maxAgents = 5 }) => {
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgentPerformance = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const response = await reportsAPI.getComprehensiveReport({
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0]
        });
        
        if (response.data?.data?.agentPerformance) {
          // Filter out agents with zero sales and limit to maxAgents
          const agentsWithSales = response.data.data.agentPerformance
            .filter(agent => agent.sales > 0)
            .slice(0, maxAgents);
          
          setAgentPerformance(agentsWithSales);
        } else {
          setAgentPerformance([]);
        }
      } catch (err) {
        console.error('Error fetching agent performance:', err);
        setError('Failed to load agent data');
        setAgentPerformance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentPerformance();
  }, [maxAgents]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 w-24 bg-muted rounded"></div>
                    <div className="h-3 w-16 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="h-4 w-16 bg-muted rounded"></div>
                  <div className="h-3 w-20 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (agentPerformance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No agents with sales this month</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agentPerformance.map((agent, index) => (
            <div key={agent.id || index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant={index === 0 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                  #{index + 1}
                </Badge>
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {agent.sales} sales
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(agent.premium)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(agent.commission)} commission
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentLeaderboard;
