import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  Upload,
  Eye,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  FileText,
  AlertCircle,
  User,
  DollarSign,
  MessageSquare,
  Users,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { toast } from 'sonner';
import { clientsAPI } from '../lib/api.js';

const ClientForm = ({ client, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: client?.firstName || '',
    lastName: client?.lastName || '',
    email: client?.email || '',
    phone: client?.phone || '',
    employer: client?.employer || '',
    dateOfBirth: client?.dateOfBirth || '',
    status: client?.status || 'prospect'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="employer">Employer</Label>
          <Input
            id="employer"
            value={formData.employer}
            onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
            placeholder="Company or organization name"
          />
        </div>
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="status">Client Type</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select client type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {client ? 'Update Client' : 'Create Client'}
        </Button>
      </div>
    </form>
  );
};

const ClientNotes = ({ client, onAddNote }) => {
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await onAddNote(client.id, newNote);
      setNewNote('');
      setIsAddingNote(false);
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
                                   <h4 className="font-medium">Notes for {client.firstName} {client.lastName}</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingNote(!isAddingNote)}
        >
          {isAddingNote ? 'Cancel' : 'Add Note'}
        </Button>
      </div>

      {isAddingNote && (
        <div className="space-y-2">
          <Textarea
            placeholder="Enter your note here..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[120px] resize-vertical"
            rows={5}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNote(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim()}
            >
              Add Note
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {client.notes && client.notes.length > 0 ? (
          client.notes.map((note, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-700 flex-1">{note.text}</p>
                <span className="text-xs text-gray-500 ml-2">
                  {new Date(note.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Added by: {note.agent}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No notes yet. Add a note to track client interactions.
          </p>
        )}
      </div>
    </div>
  );
};

const ClientNotesDialog = ({ client, isOpen, onOpenChange, onAddNote }) => {
  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Notes - {client.firstName} {client.lastName}</DialogTitle>
          <DialogDescription>
            View and add notes for this client. Notes are timestamped and show who added them.
          </DialogDescription>
        </DialogHeader>
        <ClientNotes client={client} onAddNote={onAddNote} />
      </DialogContent>
    </Dialog>
  );
};

const ClientsManagement = () => {
  const { user, isManager } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  // Filter clients based on search term and role-based access
  useEffect(() => {
    let filtered = clients.filter(client =>
      client.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
    );

    // Apply role-based access filter - both managers and agents see only their own clients
    filtered = filtered.filter(client =>
      client.agentId === user?.id
    );

    setFilteredClients(filtered);
  }, [clients, searchTerm, user]);

  const loadClients = async () => {
    try {
      // Try to load from localStorage first (for notes)
      const savedNotes = JSON.parse(localStorage.getItem('bulwark_client_notes') || '{}');

      // Fetch clients from API - both managers and agents get only their own clients
      const response = await clientsAPI.getClients({ agent_id: user?.id });
      
      console.log('🔍 Clients API response:', response);
      console.log('🔍 Clients data structure:', response.data);
      console.log('🔍 First client structure:', response.data.clients?.[0]);
      
      const clientsWithNotes = (response.data.clients || []).map(client => ({
        ...client,
        notes: savedNotes[client.id] || []
      }));
      
      console.log('🔍 Processed clients with notes:', clientsWithNotes.slice(0, 2));
      setClients(clientsWithNotes);
    } catch (error) {
      console.error('Error loading clients:', error);
      // Try to load from localStorage first
      const savedClients = JSON.parse(localStorage.getItem('bulwark_clients') || '[]');
      if (savedClients.length > 0) {
        setClients(savedClients);
        return;
      }
      
      // Fallback to mock data if API fails and no localStorage data
      const mockClients = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@email.com',
          phone: '555-0101',
          employer: 'ABC Corporation',
          dateOfBirth: '1985-03-15',
          status: 'client',
          createdBy: 'john.agent@bulwark.com',
          createdAt: new Date().toISOString(), // Add current date for testing
          notes: []
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@email.com',
          phone: '555-0102',
          employer: 'XYZ Industries',
          dateOfBirth: '1990-07-22',
          status: 'prospect',
          createdBy: 'jane.agent@bulwark.com',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          notes: []
        },
        {
          id: 3,
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike.johnson@email.com',
          phone: '555-0103',
          employer: 'Tech Solutions Inc',
          dateOfBirth: '1978-11-08',
          status: 'client',
          createdBy: 'mike.agent@bulwark.com',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
          notes: []
        }
      ];
      setClients(mockClients);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = () => {
    setSelectedClient(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setIsEditDialogOpen(true);
  };

  const handleSaveClient = async (formData) => {
    try {
      if (selectedClient) {
        // Update existing client via API with proper field name transformation
        const updateData = {
          firstName: formData.firstName?.trim(), // Remove trailing spaces
          lastName: formData.lastName?.trim(),   // Remove trailing spaces
          email: formData.email?.trim() || null,  // Remove trailing spaces
          phone: formData.phone?.trim() || null,  // Remove trailing spaces
          employer: formData.employer?.trim() || null, // Remove trailing spaces
          dateOfBirth: formData.dateOfBirth || null,
          status: formData.status || 'prospect',
          notes: formData.notes || null
        };
        const response = await clientsAPI.updateClient(selectedClient.id, updateData);
        const updatedClient = response.data;
        
        const updatedClients = clients.map(c =>
          c.id === selectedClient.id ? updatedClient : c
        );
        setClients(updatedClients);
        toast.success('Client updated successfully');
      } else {
        // Create new client via API with proper assignment
        const clientData = {
          firstName: formData.firstName?.trim(), // Remove trailing spaces
          lastName: formData.lastName?.trim(),   // Remove trailing spaces
          email: formData.email?.trim() || null,  // Remove trailing spaces
          phone: formData.phone?.trim() || null,  // Remove trailing spaces
          employer: formData.employer?.trim() || null, // Remove trailing spaces
          dateOfBirth: formData.dateOfBirth || null,
          status: formData.status || 'prospect', // Map client_type to status
          notes: formData.notes || null
        };
        
        console.log('Creating client with data:', clientData);
        console.log('Current user:', user);

        // Use the API service instead of direct fetch
        const response = await clientsAPI.createClient(clientData);
        const newClient = response.data;
        
        console.log('Client created successfully:', newClient);
        const updatedClients = [...clients, newClient];
        setClients(updatedClients);
        toast.success('Client created successfully');
      }

      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
      setSelectedClient(null);
      
      // Refresh the client list to show the new/updated client
      await loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client');
    }
  };

  const handleDeleteClient = async (clientId) => {
    try {
      // Delete client via API
      await clientsAPI.deleteClient(clientId);
      
      const updatedClients = clients.filter(c => c.id !== clientId);
      setClients(updatedClients);

      // Remove notes for this client
      const savedNotes = JSON.parse(localStorage.getItem('bulwark_client_notes') || '{}');
      delete savedNotes[clientId];
      localStorage.setItem('bulwark_client_notes', JSON.stringify(savedNotes));

      toast.success('Client deleted successfully');
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      
      // Refresh the client list
      await loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  const handleAddNote = async (clientId, noteText) => {
    try {
      const newNote = {
        text: noteText,
        timestamp: new Date().toISOString(),
        agent: user?.email || 'Unknown'
      };

      const updatedClients = clients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            notes: [...(client.notes || []), newNote]
          };
        }
        return client;
      });
      setClients(updatedClients);

      // Update selectedClient to show the new note immediately
      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(updatedClients.find(c => c.id === clientId));
      }

      // Save notes to localStorage
      const savedNotes = JSON.parse(localStorage.getItem('bulwark_client_notes') || '{}');
      savedNotes[clientId] = updatedClients.find(c => c.id === clientId)?.notes || [];
      localStorage.setItem('bulwark_client_notes', JSON.stringify(savedNotes));

      // Also save updated clients
      localStorage.setItem('bulwark_clients', JSON.stringify(updatedClients));
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Employer',
      'Date of Birth', 'Client Type', 'Created By', 'Notes Count'
    ];

    const csvData = filteredClients.map(client => [
      client.id,
      client.firstName,
      client.lastName,
      client.email,
      client.phone,
      client.employer,
      client.dateOfBirth,
      client.status,
      client.createdBy,
      (client.notes || []).length
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field || ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulwark_clients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Clients exported to CSV successfully');
  };

  const downloadCSVTemplate = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Date of Birth', 'Employer', 'Status', 'Notes'];
    const sampleData = [
      'John',
      'Doe',
      'john.doe@email.com',
      '+1-555-0123',
      '1990-01-15',
      'ABC Company',
      'prospect',
      'Interested in life insurance'
    ];
    
    const csvContent = [
      headers.join(','),
      sampleData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('CSV template downloaded successfully');
  };

  const importFromCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const response = await clientsAPI.bulkImportClients(file);
      
      if (response.data.imported_count > 0) {
        toast.success(`Successfully imported ${response.data.imported_count} clients`);
        
        // Reload clients to show the newly imported ones
        loadClients();
        
        // Show any import errors if they occurred
        if (response.data.errors && response.data.errors.length > 0) {
          console.warn('Import completed with some errors:', response.data.errors);
          toast.warning(`Import completed with ${response.data.errors.length} errors. Check console for details.`);
        }
      } else {
        toast.warning('No clients were imported');
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error('Failed to import CSV file');
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getClientTypeColor = (type) => {
    const colors = {
      client: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      prospect: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
    };
    return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header Section - Improved Mobile Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Clients Management</h1>
            <Badge variant={isManager ? "default" : "secondary"} className="self-start sm:self-auto">
              {isManager ? "Manager View" : "Agent View"}
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            {isManager ? 'Manage your created clients and prospects' : 'Manage your assigned clients and import new ones via CSV'}
          </p>
          {!isManager && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              🔒 Viewing only your assigned clients
            </p>
          )}
        </div>
        <Button onClick={handleCreateClient} className="self-start sm:self-auto w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Search and Filters - Improved Mobile Layout */}
      <div className="flex flex-col gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search clients by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {/* Action Buttons - Stacked on Mobile, Horizontal on Larger Screens */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={exportToCSV} className="w-full sm:w-auto justify-center sm:justify-start">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={downloadCSVTemplate} className="w-full sm:w-auto justify-center sm:justify-start">
            <FileText className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          {/* Allow both managers and agents to import CSV */}
          <div className="relative w-full sm:w-auto">
            <input
              type="file"
              accept=".csv"
              onChange={importFromCSV}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="w-full sm:w-auto justify-center sm:justify-start">
              <Upload className="h-4 w-4 mr-2" />
              {isManager ? 'Import CSV' : 'Import My Clients'}
            </Button>
          </div>
        </div>
      </div>

      {/* Client Count - Improved Mobile Layout */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-blue-800 dark:text-blue-200 text-sm sm:text-base">
          Showing {filteredClients.length} of {clients.length} clients
        
        </p>
        {!isManager && (
          <p className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm mt-2">
            💡 You can import new clients via CSV 
          </p>
        )}
        {!isManager && (
          <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
            📋 CSV should include: First Name, Last Name, Email, Phone, Date of Birth, Employer, Status, Notes
          </p>
        )}
      </div>

      {/* Stats Cards - Improved Mobile Layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{clients.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Active Clients</CardTitle>
            <UserCheck className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {clients.filter(c => c.status === 'client').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">Prospects</CardTitle>
            <UserPlus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
              {clients.filter(c => c.status === 'prospect').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {(() => {
                const thisMonthClients = clients.filter(c => {
                  if (!c.createdAt) {
                    console.log('⚠️ Client missing createdAt:', c.id, c);
                    // Fallback: assume client was created recently if no date available
                    // This is useful for existing data that might not have creation dates
                    return true; // Include in this month count as fallback
                  }
                  try {
                    const createdDate = new Date(c.createdAt);
                    if (isNaN(createdDate.getTime())) {
                      console.log('⚠️ Invalid createdAt date:', c.createdAt, 'for client:', c.id);
                      return false;
                    }
                    
                    const now = new Date();
                    const isThisMonth = createdDate.getMonth() === now.getMonth() && 
                                       createdDate.getFullYear() === now.getFullYear();
                    
                    if (isThisMonth) {
                      console.log('✅ Client created this month:', c.id, createdDate);
                    }
                    
                    return isThisMonth;
                  } catch (error) {
                    console.warn('Error parsing client creation date:', error, c);
                    return false;
                  }
                });
                
                console.log(`📊 This Month calculation: ${thisMonthClients.length} clients out of ${clients.length} total`);
                return thisMonthClients.length;
              })()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {clients.some(c => !c.createdAt) && '⚠️ Some clients missing creation dates'}
            </p>
          </CardContent>
        </Card>
      </div>

             {/* Clients Grid - Card-based layout similar to Sales */}
       <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
         <CardHeader>
           <div className="flex items-center justify-between">
             <CardTitle className="text-gray-900 dark:text-white">Clients & Prospects</CardTitle>
             <div className="text-sm text-gray-500 dark:text-gray-400">
               {isManager ? 'Your created clients data' : 'Your clients data only'}
             </div>
           </div>
         </CardHeader>
        <CardContent>
          {/* Mobile: Card View, Desktop: Table View */}
          <div className="block md:hidden">
            {/* Mobile Card View */}
            <div className="space-y-4">
              {filteredClients.length > 0 ? (
                                 filteredClients.map((client) => (
                   <Card key={client.id} className="hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                     <CardContent className="p-4">
                       <div className="flex items-start justify-between mb-3">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                             <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                           </div>
                                                      <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {client.firstName} {client.lastName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                DOB: {formatDate(client.dateOfBirth)}
                              </div>
                            </div>
                         </div>
                         <Badge className={getClientTypeColor(client.status)}>
                           {client.status || 'Unknown'}
                         </Badge>
                       </div>
                       
                       <div className="space-y-2 mb-4">
                         <div className="text-sm">
                           <span className="text-gray-500 dark:text-gray-400">Email:</span> <span className="text-gray-900 dark:text-white">{client.email}</span>
                         </div>
                         <div className="text-sm">
                           <span className="text-gray-500 dark:text-gray-400">Phone:</span> <span className="text-gray-900 dark:text-white">{client.phone}</span>
                         </div>
                         <div className="text-sm">
                           <span className="text-gray-500 dark:text-gray-400">Employer:</span> <span className="text-gray-900 dark:text-white">{client.employer || 'N/A'}</span>
                         </div>
                                                  <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Agent:</span> <span className="text-gray-900 dark:text-white">{client.agent ? `${client.agent.firstName} ${client.agent.lastName}` : 'N/A'}</span>
                          </div>
                       </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClient(client)}
                          className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setIsNotesDialogOpen(true);
                          }}
                          className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Notes
                          {(client.notes && client.notes.length > 0) && (
                            <Badge 
                              variant="secondary" 
                              className="ml-1 h-4 w-4 p-0 text-xs flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white"
                            >
                              {client.notes.length}
                            </Badge>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setClientToDelete(client);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No clients found</p>
                    <p className="text-sm">
                      {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first client.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Employer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                                                         <div className="ml-4">
                               <div className="text-sm font-medium text-gray-900 dark:text-white">
                                 {client.firstName} {client.lastName}
                               </div>
                               <div className="text-sm text-gray-500 dark:text-gray-400">
                                 DOB: {formatDate(client.dateOfBirth)}
                               </div>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{client.email}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{client.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getClientTypeColor(client.status)}>
                            {client.status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {client.employer || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {client.agent ? `${client.agent.firstName} ${client.agent.lastName}` : 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                                                          <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClient(client)}
                                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsNotesDialogOpen(true);
                                }}
                                                             title={`View/Add Notes for ${client.firstName} ${client.lastName}`}
                                className="relative border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <MessageSquare className="h-3 w-3" />
                                {(client.notes && client.notes.length > 0) && (
                                  <Badge 
                                    variant="secondary" 
                                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white"
                                  >
                                    {client.notes.length}
                                  </Badge>
                                )}
                              </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setClientToDelete(client);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                          <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No clients found</p>
                          <p className="text-sm">
                            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first client.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Client Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Enter the client's information to create a new record.
            </DialogDescription>
          </DialogHeader>
          <ClientForm onSave={handleSaveClient} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update the client's information.
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            client={selectedClient}
            onSave={handleSaveClient}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
                         <DialogDescription>
               Are you sure you want to delete {clientToDelete?.firstName} {clientToDelete?.lastName}?
               This action cannot be undone.
             </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteClient(clientToDelete?.id)}
            >
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Notes Dialog */}
      <ClientNotesDialog
        client={selectedClient}
        isOpen={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        onAddNote={handleAddNote}
      />
    </div>
  );
};

export default ClientsManagement;

