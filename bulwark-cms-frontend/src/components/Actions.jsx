import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  User,
  FileText,
  Bell,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ticketsAPI } from '@/lib/api';
import { toast } from 'sonner';

const Actions = () => {
  const { user, isManager } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    filterAndSortTickets();
  }, [tickets, searchTerm, statusFilter, priorityFilter, typeFilter, sortBy, sortOrder]);

  const loadTickets = async () => {
    try {
      // Try to load from API first
      const response = await ticketsAPI.getTickets();
      setTickets(response.data.tickets || response.data || []);
    } catch (error) {
      console.error('Failed to load tickets from API:', error);
      // Fallback to mock data
      const mockTickets = [
        {
          id: 1,
          subject: 'Client Policy Renewal Follow-up',
          description: 'Need to follow up with client about policy renewal options',
          type: 'follow_up',
          priority: 'medium',
          status: 'open',
          assigned_to: 'agent1@bulwark.com',
          created_by: 'manager@bulwark.com',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          comments: []
        },
        {
          id: 2,
          subject: 'Urgent Claim Processing',
          description: 'Client has urgent claim that needs immediate attention',
          type: 'urgent',
          priority: 'high',
          status: 'in_progress',
          assigned_to: 'agent2@bulwark.com',
          created_by: 'manager@bulwark.com',
          created_at: '2024-01-14T14:30:00Z',
          updated_at: '2024-01-15T09:15:00Z',
          comments: [
            {
              id: 1,
              text: 'Started processing the claim documents',
              author: 'agent2@bulwark.com',
              timestamp: '2024-01-15T09:15:00Z'
            }
          ]
        },
        {
          id: 3,
          subject: 'Review New Policy Application',
          description: 'New client application needs review and approval',
          type: 'review',
          priority: 'medium',
          status: 'open',
          assigned_to: 'manager@bulwark.com',
          created_by: 'manager@bulwark.com',
          created_at: '2024-01-13T16:45:00Z',
          updated_at: '2024-01-13T16:45:00Z',
          comments: []
        },
        {
          id: 4,
          subject: 'Update Client Database',
          description: 'Need to update client contact information in database',
          type: 'task',
          priority: 'low',
          status: 'received',
          assigned_to: 'agent1@bulwark.com',
          created_by: 'manager@bulwark.com',
          created_at: '2024-01-12T11:20:00Z',
          updated_at: '2024-01-14T15:30:00Z',
          comments: [
            {
              id: 2,
              text: 'Received task, will start working on it tomorrow',
              author: 'agent1@bulwark.com',
              timestamp: '2024-01-14T15:30:00Z'
            }
          ]
        }
      ];
      setTickets(mockTickets);
      
      // Also try to load from localStorage as additional fallback
      try {
        const savedTickets = JSON.parse(localStorage.getItem('bulwark_tickets') || '[]');
        if (savedTickets.length > 0) {
          setTickets(savedTickets);
        }
      } catch (localStorageError) {
        console.error('Error loading from localStorage:', localStorageError);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTickets = () => {
    let filtered = tickets;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.type === typeFilter);
    }
    
    // Apply role-based filtering
    if (!isManager) {
      // Agents can only see tickets assigned to them or created by them
      filtered = filtered.filter(ticket => 
        ticket.assigned_to === user?.email || 
        ticket.created_by === user?.email
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredTickets(filtered);
  };

  const createTicket = async (ticketData) => {
    try {
      const newTicket = {
        id: Date.now(),
        ...ticketData,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        comments: []
      };
      
      const updatedTickets = [...tickets, newTicket];
      setTickets(updatedTickets);
      
      // Save to localStorage
      localStorage.setItem('bulwark_tickets', JSON.stringify(updatedTickets));
      
      toast.success('Ticket created successfully');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const updatedTickets = tickets.map(ticket => {
        if (ticket.id === ticketId) {
          return {
            ...ticket,
            status: newStatus,
            updated_at: new Date().toISOString()
          };
        }
        return ticket;
      });
      
      setTickets(updatedTickets);
      localStorage.setItem('bulwark_tickets', JSON.stringify(updatedTickets));
      
      toast.success('Ticket status updated successfully');
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const addComment = async (ticketId, commentText) => {
    try {
      const newComment = {
        id: Date.now(),
        text: commentText,
        author: user?.email || 'Unknown',
        timestamp: new Date().toISOString()
      };
      
      const updatedTickets = tickets.map(ticket => {
        if (ticket.id === ticketId) {
          return {
            ...ticket,
            comments: [...(ticket.comments || []), newComment],
            updated_at: new Date().toISOString()
          };
        }
        return ticket;
      });
      
      setTickets(updatedTickets);
      localStorage.setItem('bulwark_tickets', JSON.stringify(updatedTickets));
      
      toast.success('Comment added successfully');
      setIsCommentDialogOpen(false);
      setSelectedTicket(null);
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      received: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-orange-100 text-orange-800',
      closed: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getTicketTypeColor = (type) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      follow_up: 'bg-blue-100 text-blue-800',
      review: 'bg-purple-100 text-purple-800',
      task: 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getNewTicketsCount = () => {
    return tickets.filter(ticket => ticket.status === 'open').length;
  };

  const getUnreadCommentsCount = () => {
    return tickets.reduce((total, ticket) => {
      if (ticket.assigned_to === user?.email || ticket.created_by === user?.email) {
        return total + (ticket.comments?.length || 0);
      }
      return total;
    }, 0);
  };

  const getTotalNotifications = () => {
    return getNewTicketsCount() + getUnreadCommentsCount();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status) => {
    const icons = {
      open: Clock,
      received: AlertCircle,
      in_progress: Clock,
      closed: CheckCircle
    };
    return icons[status] || Clock;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Actions</h1>
          <Badge variant="secondary" className="text-sm">
            {getTotalNotifications()} new
          </Badge>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          File a Ticket
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tickets by subject or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="follow_up">Follow Up</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="task">Task</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="updated_at">Updated Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Ticket Count */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-blue-800">
          Showing {filteredTickets.length} of {tickets.length} tickets
          {!isManager && ' (your assigned tickets only)'}
        </p>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="hover-lift">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {ticket.subject}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <User className="h-3 w-3" />
                    {ticket.assigned_to === user?.email ? 'Assigned to you' : `Assigned to ${ticket.assigned_to}`}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setIsCommentDialogOpen(true);
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {ticket.comments?.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {ticket.comments.length}
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 line-clamp-3">
                {ticket.description}
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Badge className={getTicketTypeColor(ticket.type)}>
                  {ticket.type?.replace('_', ' ')}
                </Badge>
                <Badge className={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Badge>
                {(() => {
                  const status = getStatusColor(ticket.status);
                  const Icon = getStatusIcon(ticket.status);
                  return (
                    <Badge className={status}>
                      <Icon className="h-3 w-3 mr-1" />
                      {ticket.status?.replace('_', ' ')}
                    </Badge>
                  );
                })()}
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {formatDate(ticket.created_at)}</p>
                <p>Updated: {formatDate(ticket.updated_at)}</p>
                <p>By: {ticket.created_by}</p>
              </div>

              {/* Status Update Buttons */}
              {ticket.assigned_to === user?.email && ticket.status !== 'closed' && (
                <div className="flex gap-2 pt-3 border-t">
                  {ticket.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTicketStatus(ticket.id, 'received')}
                    >
                      Mark Received
                    </Button>
                  )}
                  {ticket.status === 'received' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                    >
                      Start Working
                    </Button>
                  )}
                  {(ticket.status === 'in_progress' || ticket.status === 'received') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTicketStatus(ticket.id, 'closed')}
                    >
                      Close Ticket
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Get started by creating your first ticket.'}
          </p>
        </div>
      )}

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>File a Ticket</DialogTitle>
            <DialogDescription>
              Create a new ticket for internal communication between team members.
            </DialogDescription>
          </DialogHeader>
          <CreateTicketForm onCreateTicket={createTicket} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              Add a comment to ticket: {selectedTicket?.subject}
            </DialogDescription>
          </DialogHeader>
          <AddCommentForm 
            ticket={selectedTicket} 
            onAddComment={addComment} 
            onCancel={() => setIsCommentDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CreateTicketForm = ({ onCreateTicket, onCancel }) => {
  const { user, isManager } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    type: 'task',
    priority: 'medium',
    assigned_to: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCreateTicket(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          rows={4}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="follow_up">Follow Up</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="task">Task</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="assigned_to">Assign To</Label>
          <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select recipient" />
            </SelectTrigger>
            <SelectContent>
              {isManager ? (
                <>
                  <SelectItem value="agent1@bulwark.com">Agent 1</SelectItem>
                  <SelectItem value="agent2@bulwark.com">Agent 2</SelectItem>
                  <SelectItem value="agent3@bulwark.com">Agent 3</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="manager@bulwark.com">Manager</SelectItem>
                  <SelectItem value="agent1@bulwark.com">Agent 1</SelectItem>
                  <SelectItem value="agent2@bulwark.com">Agent 2</SelectItem>
                  <SelectItem value="agent3@bulwark.com">Agent 3</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Ticket
        </Button>
      </DialogFooter>
    </form>
  );
};

const AddCommentForm = ({ ticket, onAddComment, onCancel }) => {
  const [comment, setComment] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await onAddComment(ticket.id, comment);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="comment">Comment</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter your comment..."
          rows={4}
          required
        />
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!comment.trim()}>
          Add Comment
        </Button>
      </DialogFooter>
    </div>
  );
};

export default Actions;