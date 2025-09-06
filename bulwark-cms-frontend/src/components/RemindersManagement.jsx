import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { remindersAPI, clientsAPI } from '../lib/api.js';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import {
  Bell,
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  FileText,
  CalendarDays,
} from 'lucide-react';

const REMINDER_STATUSES = [
  { value: 'call_back', label: 'Call Back' },
  { value: 'outstanding_documents', label: 'Outstanding Documents' },
  { value: 'delayed_start_date', label: 'Delayed Start Date' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'policy_renewal', label: 'Policy Renewal' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
];

const ReminderForm = ({ reminder, onSave, onCancel }) => {
  const { user, canAccessAllClients } = useAuth();
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    client_id: 'none',
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: '09:00',
    status: 'call_back',
    priority: 'medium',
    ...reminder,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClients();
    
    // If editing, format the datetime
    if (reminder?.reminder_date) {
      const date = new Date(reminder.reminder_date);
      setFormData(prev => ({
        ...prev,
        reminder_date: date.toISOString().split('T')[0],
        reminder_time: date.toTimeString().slice(0, 5),
      }));
    }
  }, [reminder]);

  const fetchClients = async () => {
    try {
      // Use role-based API endpoint for clients with proper API configuration
      const params = canAccessAllClients ? {} : { agent_id: user?.id };
  
      
      const response = await clientsAPI.getClients(params);
      setClients(response.data.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Combine date and time
      const reminderDateTime = new Date(`${formData.reminder_date}T${formData.reminder_time}`);
      
      const reminderData = {
        title: formData.title,
        description: formData.description,
        reminderDate: reminderDateTime.toISOString(),
        clientId: formData.client_id && formData.client_id !== 'none' ? parseInt(formData.client_id) : null,
        priority: formData.priority,
        type: formData.status, // Map status to type field
      };

      if (reminder?.id) {
        await remindersAPI.updateReminder(reminder.id, reminderData);
        toast.success('Reminder updated successfully!');
      } else {
        await remindersAPI.createReminder(reminderData);
        toast.success('Reminder created successfully!');
      }
      onSave();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to save reminder';
      setError(errorMessage);
      toast.error(errorMessage);
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
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief description of the reminder"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_id">Client</Label>
        <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a client (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No specific client</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                {client.firstName} {client.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reminder_date">Date *</Label>
          <Input
            id="reminder_date"
            type="date"
            value={formData.reminder_date}
            onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reminder_time">Time *</Label>
          <Input
            id="reminder_time"
            type="time"
            value={formData.reminder_time}
            onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_LEVELS.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          className="w-full min-h-[60px] px-3 py-2 border border-input bg-background rounded-md text-sm"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detailed description of what needs to be done..."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : reminder?.id ? 'Update Reminder' : 'Create Reminder'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const RemindersManagement = () => {
  const { user, canViewAllData } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [completedFilter, setCompletedFilter] = useState('pending');
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      // All users (managers and agents) now see only their own reminders
      const params = { agent_id: user?.id };
      const response = await remindersAPI.getReminders(params);
      setReminders(response.data.reminders);
    } catch (error) {
      setError('Failed to fetch reminders');
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setSelectedReminder(null);
    fetchReminders();
  };

  const handleEdit = (reminder) => {
    setSelectedReminder(reminder);
    setShowForm(true);
  };

  const handleDelete = async (reminderId) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      try {
        await remindersAPI.deleteReminder(reminderId);
        fetchReminders();
        toast.success('Reminder deleted successfully!');
      } catch (error) {
        setError('Failed to delete reminder');
        toast.error('Failed to delete reminder.');
      }
    }
  };

  const handleComplete = async (reminderId, isCompleted) => {
    try {
      await remindersAPI.completeReminder(reminderId);
      fetchReminders();
      toast.success(isCompleted ? 'Reminder marked as pending' : 'Reminder marked as completed');
    } catch (error) {
      setError('Failed to update reminder');
      toast.error('Failed to update reminder.');
    }
  };

  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = 
      reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reminder.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || reminder.priority === priorityFilter;
    const matchesCompleted = 
      completedFilter === 'all' || 
      (completedFilter === 'pending' && !reminder.is_completed) ||
      (completedFilter === 'completed' && reminder.is_completed);
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCompleted;
  });

  // Calculate stats
  const totalReminders = reminders.length;
  const pendingReminders = reminders.filter(r => !r.is_completed).length;
  const overdueReminders = reminders.filter(r => 
    !r.is_completed && new Date(r.reminder_date) < new Date()
  ).length;
  const todayReminders = reminders.filter(r => {
    const today = new Date().toDateString();
    const reminderDate = new Date(r.reminder_date).toDateString();
    return !r.is_completed && today === reminderDate;
  }).length;

  const getPriorityColor = (priority) => {
    const priorityObj = PRIORITY_LEVELS.find(p => p.value === priority);
    return priorityObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'call_back': return <Phone className="h-4 w-4" />;
      case 'outstanding_documents': return <FileText className="h-4 w-4" />;
      case 'delayed_start_date': return <CalendarDays className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Improved Mobile Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Reminders</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage your tasks and follow-ups</p>
          <p className="text-sm text-blue-600 mt-1">
            🔒 Viewing only your reminders
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedReminder(null)} className="w-full sm:w-auto justify-center sm:justify-start">
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedReminder ? 'Edit Reminder' : 'Add New Reminder'}
              </DialogTitle>
              <DialogDescription>
                {selectedReminder 
                  ? 'Update reminder details below.' 
                  : 'Create a new reminder to stay on top of your tasks.'}
              </DialogDescription>
            </DialogHeader>
            <ReminderForm
              reminder={selectedReminder}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards - Improved Mobile Layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalReminders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{pendingReminders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Due Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{todayReminders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{overdueReminders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder List</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters - Improved Mobile Layout */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search reminders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Select value={completedFilter} onValueChange={setCompletedFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {REMINDER_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  {PRIORITY_LEVELS.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Reminder</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReminders.length > 0 ? (
                  filteredReminders.map((reminder) => {
                    const isOverdue = !reminder.is_completed && new Date(reminder.reminder_date) < new Date();
                    const isToday = new Date(reminder.reminder_date).toDateString() === new Date().toDateString();
                    
                    return (
                      <TableRow key={reminder.id} className={reminder.is_completed ? 'opacity-60' : ''}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleComplete(reminder.id, reminder.is_completed)}
                            className={reminder.is_completed ? 'text-green-600' : 'text-gray-400'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {getStatusIcon(reminder.status)}
                              {reminder.title}
                            </div>
                            {reminder.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {reminder.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {reminder.client_name || (
                            <span className="text-gray-400 italic">No specific client</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${
                            isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : ''
                          }`}>
                            <Calendar className="h-3 w-3" />
                            <span className="text-sm">
                              {new Date(reminder.reminder_date).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(reminder.reminder_date).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              Overdue
                            </Badge>
                          )}
                          {isToday && !isOverdue && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Due Today
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {REMINDER_STATUSES.find(s => s.value === reminder.status)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(reminder.priority)}>
                            {PRIORITY_LEVELS.find(p => p.value === reminder.priority)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(reminder)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(reminder.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No reminders found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemindersManagement;

