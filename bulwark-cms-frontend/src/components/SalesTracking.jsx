import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { toast } from 'sonner';

import { salesAPI, clientsAPI, filesAPI, productsAPI } from '../lib/api.js';
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
  DollarSign,
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  Upload,
  TrendingUp,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  X,
} from 'lucide-react';

const CLIENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedClientsData = [];
let cachedClientsMeta = { cacheKey: null, expiresAt: 0 };

const SaleForm = ({ sale, onSave, onCancel, products }) => {
  const { user, isManager, canAccessAllClients } = useAuth();
  const [clients, setClients] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [debouncedClientSearchTerm, setDebouncedClientSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    clientId: sale?.client?.id?.toString() || '',
    productCode: sale?.product?.id?.toString() || '',
    premiumAmount: sale?.premiumAmount || '',
    commissionAmount: sale?.commissionAmount || '',
    commissionRate: sale?.commissionRate || '',
    saleDate: sale?.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    policyNumber: sale?.policyNumber || '',
    status: sale?.status || 'active',
    notes: sale?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchClients();
    }
  }, [user?.id, canAccessAllClients]);

  // Reset search when clients change
  useEffect(() => {
    setClientSearchTerm('');
  }, [clients]);

  // Reset search when editing an existing sale
  useEffect(() => {
    if (sale?.id) {
      setClientSearchTerm('');
    }
  }, [sale?.id]);

  // Update form data when sale changes (for editing)
  useEffect(() => {
    if (sale) {
      // Format the sale date properly for the date input
      let formattedSaleDate = new Date().toISOString().split('T')[0]; // Default to today
      if (sale.saleDate) {
        try {
          const saleDate = new Date(sale.saleDate);
          if (!isNaN(saleDate.getTime())) {
            formattedSaleDate = saleDate.toISOString().split('T')[0];
          }
        } catch (error) {
          console.warn('Could not parse sale date:', sale.saleDate);
        }
      }
      
      const newFormData = {
        clientId: sale.client?.id?.toString() || '',
        productCode: sale.product?.id?.toString() || '',
        premiumAmount: sale.premiumAmount || '',
        commissionAmount: sale.commissionAmount || '',
        commissionRate: sale.commissionRate || '',
        saleDate: formattedSaleDate,
        policyNumber: sale.policyNumber || '',
        status: sale.status || 'active',
        notes: sale.notes || '',
      };
      
      setFormData(newFormData);
    }
  }, [sale]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedClientSearchTerm(clientSearchTerm), 250);
    return () => clearTimeout(handler);
  }, [clientSearchTerm]);

  const fetchClients = async (forceRefresh = false) => {
    try {
      setClientsLoading(true);
      
      const cacheKey = `${canAccessAllClients ? 'all' : user?.id || 'unknown'}`;
      const now = Date.now();

      if (!forceRefresh && cachedClientsMeta.cacheKey === cacheKey && cachedClientsMeta.expiresAt > now) {
        setClients(cachedClientsData);
        return;
      }

      const params = {
        ...(canAccessAllClients ? {} : { agent_id: user?.id }),
        limit: 0 // Request all clients so they are available in the picker
      };
      
      const response = await clientsAPI.getClients(params);
      const clientsData = response.data.clients || [];
      setClients(clientsData);
      cachedClientsData = clientsData;
      cachedClientsMeta = {
        cacheKey,
        expiresAt: now + CLIENTS_CACHE_TTL
      };
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    const searchTerm = debouncedClientSearchTerm.trim().toLowerCase();
    if (!searchTerm) return clients;

    return clients.filter(client => {
      return (
        client.firstName?.toLowerCase().includes(searchTerm) ||
        client.lastName?.toLowerCase().includes(searchTerm) ||
        client.email?.toLowerCase().includes(searchTerm) ||
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm) ||
        client.id?.toString().toLowerCase().includes(searchTerm)
      );
    });
  }, [clients, debouncedClientSearchTerm]);

  // Handle client search input change
  const handleClientSearchChange = (value) => {
    setClientSearchTerm(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    if (!formData.clientId) {
      setError('Please select a client');
      setLoading(false);
      return;
    }
    
    if (!formData.productCode) {
      setError('Please select a product');
      setLoading(false);
      return;
    }
    
    if (!formData.premiumAmount || parseFloat(formData.premiumAmount) <= 0) {
      setError('Please enter a valid premium amount');
      setLoading(false);
      return;
    }
    
    if (!formData.commissionAmount || parseFloat(formData.commissionAmount) <= 0) {
      setError('Please enter a valid commission amount');
      setLoading(false);
      return;
    }

    try {
      const saleData = {
        agentId: user?.id,
        clientId: parseInt(formData.clientId),
        productId: parseInt(formData.productCode),
        premiumAmount: parseFloat(formData.premiumAmount),
        commissionAmount: parseFloat(formData.commissionAmount),
        commissionRate: formData.commissionRate ? parseFloat(formData.commissionRate) : null,
        saleDate: new Date(formData.saleDate).toISOString(),
        policyNumber: formData.policyNumber,
        status: formData.status.toLowerCase(),
        notes: formData.notes
      };

      if (sale?.id) {
        await salesAPI.updateSale(sale.id, saleData);
        toast.success('Sale updated successfully!');
      } else {
        await salesAPI.createSale(saleData);
        toast.success('Sale created successfully!');
      }
      
      // Goal progress is updated automatically by the backend when sales are created
      
      // Reset search when form is submitted
      setClientSearchTerm('');
      onSave();
    } catch (error) {
      console.error('❌ Sale submission error:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save sale';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateCommission = () => {
    const premium = parseFloat(formData.premiumAmount) || 0;
    const rate = parseFloat(formData.commissionRate) || 0;
    
    if (premium <= 0) {
      setError('Please enter a valid premium amount');
      return;
    }
    
    if (rate <= 0) {
      setError('Please enter a valid commission rate');
      return;
    }
    
    const commission = (premium * rate) / 100;
    setFormData({ ...formData, commissionAmount: commission.toFixed(2) });
    setError(''); // Clear any previous errors
  };

  // Auto-calculate commission when both premium and rate are available
  useEffect(() => {
    const premium = parseFloat(formData.premiumAmount) || 0;
    const rate = parseFloat(formData.commissionRate) || 0;
    
    if (premium > 0 && rate > 0 && !formData.commissionAmount) {
      const commission = (premium * rate) / 100;
      setFormData(prev => ({ ...prev, commissionAmount: commission.toFixed(2) }));
    }
  }, [formData.premiumAmount, formData.commissionRate]);

  // Check if form is ready to render
  const isFormReady = !clientsLoading && products.length > 0;

  // Show loading state if data isn't ready
  if (!isFormReady) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading form data...</p>
          <p className="text-xs text-gray-500">
            Clients: {clients.length}, Products: {products.length}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" key={`sale-form-${sale?.id || 'new'}`}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client *</Label>
          <div className="text-xs text-muted-foreground mb-2">
            {clientsLoading ? 'Loading...' : `${clients.length} clients available`}
          </div>
          
          <Select value={formData.clientId?.toString() || ''} onValueChange={(value) => {
            setFormData({ ...formData, clientId: value });
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a client">
                {(() => {
                  const selectedClient = clients.find(c => c.id.toString() === formData.clientId?.toString());
                  return selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'Select a client';
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* Search input inside dropdown */}
              <div className="flex items-center px-3 py-2 border-b">
                <Search className="h-4 w-4 text-gray-400 mr-2" />
                <input
                  placeholder="Type to search clients..."
                  value={clientSearchTerm}
                  onChange={(e) => handleClientSearchChange(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              
              {filteredClients.length === 0 ? (
                <SelectItem value="no-clients" disabled>
                  {clientsLoading ? 'Loading clients...' : 
                   clientSearchTerm ? `No clients found matching "${clientSearchTerm}"` : 'No clients available'}
                </SelectItem>
              ) : (
                filteredClients.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{client.firstName} {client.lastName}</span>
                      <span className="text-xs text-gray-500">
                        {client.email || 'No email'} • ID: {client.id}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          {clientsLoading && (
            <p className="text-sm text-muted-foreground">
              Loading clients...
            </p>
          )}
          {!clientsLoading && clients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No clients found. Please create some clients first.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="productCode">Product *</Label>
          <Select value={formData.productCode?.toString() || ''} onValueChange={(value) => {
            setFormData({ ...formData, productCode: value });
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a product">
                {(() => {
                  const selectedProduct = products.find(p => p.id.toString() === formData.productCode?.toString());
                  return selectedProduct ? `${selectedProduct.name} - ${selectedProduct.code}` : 'Select a product';
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.name} - {product.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="premiumAmount">Premium Amount *</Label>
          <Input
            id="premiumAmount"
            type="number"
            step="0.01"
            value={formData.premiumAmount}
            onChange={(e) => setFormData({ ...formData, premiumAmount: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commissionRate">Commission Rate (%)</Label>
          <div className="flex gap-2">
            <Input
              id="commissionRate"
              type="number"
              step="0.01"
              value={formData.commissionRate}
              onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={calculateCommission}
              title="Calculate: Premium Amount × Commission Rate ÷ 100"
              className="px-3 py-2 text-sm whitespace-nowrap"
            >
              Calc
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the commission rate percentage, then click Calculate to auto-fill the commission amount.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="commissionAmount">Commission Amount *</Label>
          <Input
            id="commissionAmount"
            type="number"
            step="0.01"
            value={formData.commissionAmount}
            onChange={(e) => setFormData({ ...formData, commissionAmount: e.target.value })}
            required
            placeholder="Enter manually or use Calculate button"
          />
          <p className="text-xs text-muted-foreground">
            Use the Calculate button to auto-calculate based on premium and rate, or enter manually if needed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="saleDate">Sale Date *</Label>
          <Input
            id="saleDate"
            type="date"
            value={formData.saleDate}
            onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="policyNumber">Policy Number</Label>
          <Input
            id="policyNumber"
            value={formData.policyNumber}
            onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          className="w-full min-h-[80px] px-3 py-2 border border-input bg-background rounded-md text-sm"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about the sale..."
        />
      </div>

             <DialogFooter>
        <Button type="button" variant="outline" onClick={() => {
          // Reset search when form is cancelled
          setClientSearchTerm('');
          onCancel();
        }}>
           Cancel
         </Button>
         <Button type="submit" disabled={loading}>
           {loading ? 'Saving...' : sale?.id ? 'Update Sale' : 'Create Sale'}
         </Button>
       </DialogFooter>
    </form>
  );
};

const SaleNotesDialog = ({ sale, isOpen, onOpenChange, onSaveNote }) => {
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSale, setCurrentSale] = useState(sale);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(null);

  // Update currentSale when sale prop changes
  useEffect(() => {
    setCurrentSale(sale);
  }, [sale]);

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;

    setLoading(true);
    try {
      console.log('🔧 Saving note for sale:', currentSale.id);
      console.log('🔧 Current notes:', currentSale.notes);
      console.log('🔧 New note text:', noteText);
      
      // Create a new note entry
      const newNoteEntry = `${new Date().toLocaleString()}: ${noteText}`;
      
      // Combine with existing notes
      const updatedNotes = currentSale.notes 
        ? `${currentSale.notes}\n\n${newNoteEntry}`
        : newNoteEntry;

      console.log('🔧 Updated notes to save:', updatedNotes);

      // Update local state immediately for instant feedback
      setCurrentSale(prev => ({
        ...prev,
        notes: updatedNotes
      }));

      // Use the dedicated notes endpoint
      const response = await salesAPI.updateSaleNotes(currentSale.id, updatedNotes);
      console.log('🔧 Notes update response:', response);
      
      // Call the parent's onSaveNote to refresh the sales list
      onSaveNote();
      
      // Clear the note input
      setNoteText('');
      
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to save note');
      
      // Revert local state on error
      setCurrentSale(sale);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNoteText('');
    onOpenChange(false);
  };

  const handleDeleteNote = (noteIndex) => {
    setDeleteConfirmIndex(noteIndex);
  };

  const confirmDeleteNote = async () => {
    if (!currentSale || !currentSale.notes || deleteConfirmIndex === null) return;

    try {
      // Parse existing notes
      const notesArray = currentSale.notes.split('\n\n').filter(note => note.trim());
      
      // Remove the note at the specified index
      const updatedNotesArray = notesArray.filter((_, index) => index !== deleteConfirmIndex);
      
      // Join back into string format
      const updatedNotes = updatedNotesArray.join('\n\n');

      // Update local state immediately
      setCurrentSale(prev => ({
        ...prev,
        notes: updatedNotes
      }));

      // Update on server
      const response = await salesAPI.updateSaleNotes(currentSale.id, updatedNotes);
      console.log('🔧 Delete note response:', response);
      
      // Call parent's onSaveNote to refresh the sales list
      onSaveNote();
      
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
      
      // Revert local state on error
      setCurrentSale(sale);
    } finally {
      setDeleteConfirmIndex(null);
    }
  };

  const cancelDeleteNote = () => {
    setDeleteConfirmIndex(null);
  };

  if (!currentSale) return null;

  // Parse existing notes to display them nicely
  const existingNotes = currentSale.notes 
    ? currentSale.notes.split('\n\n').filter(note => note.trim())
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Sale Notes - {currentSale.client?.firstName} {currentSale.client?.lastName}
          </DialogTitle>
          <DialogDescription>
            View and add notes for this sale. Notes are timestamped and help track important details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Display existing notes */}
          {existingNotes.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Existing Notes ({existingNotes.length})
                <span className="text-xs text-gray-500 ml-2">• Hover over notes to delete</span>
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {existingNotes.map((note, index) => {
                  const [timestamp, ...contentParts] = note.split(': ');
                  const content = contentParts.join(': ');
                  return (
                    <div key={index} className="relative p-3 bg-gray-50 rounded-lg border group hover:border-red-200 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-8">
                          <div className="text-sm text-gray-700 mb-1">{content}</div>
                          <div className="text-xs text-gray-500">{timestamp}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(index)}
                        className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-all duration-200 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete note"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notes yet. Add a note to track important sale details.</p>
            </div>
          )}

          {/* Add new note */}
          <div className="space-y-2">
            <Label htmlFor="newNote" className="text-sm font-medium">Add New Note:</Label>
            <textarea
              id="newNote"
              className="w-full min-h-[80px] px-3 py-2 border border-input bg-background rounded-md text-sm resize-none"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a new note about this sale..."
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSaveNote} 
            disabled={loading || !noteText.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Saving...' : 'Add Note'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmIndex !== null} onOpenChange={cancelDeleteNote}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Note
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeleteNote}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteNote}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

const SalesTracking = () => {
  const { user, isManager, canAccessAllSales } = useAuth();
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [salesStats, setSalesStats] = useState({
    totalSales: 0,
    activeSales: 0,
    totalPremium: 0,
    totalCommission: 0
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  // Notes dialog state
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [saleForNotes, setSaleForNotes] = useState(null);
  // Note: updateGoalProgress is not available in GoalsContext
  // Goal progress is updated automatically by the backend when sales are created

  useEffect(() => {
    if (user?.id) {
      fetchSales();
      fetchProducts();
      loadSalesStats();
    }
  }, [user?.id, canAccessAllSales, page, limit]);

  // Load sales statistics for the cards
  const loadSalesStats = async () => {
    try {
      console.log('🔍 Loading sales stats for user:', user?.id);
      const params = canAccessAllSales ? {} : { agent_id: user?.id };
      const response = await salesAPI.getSalesStats(params);
      console.log('🔍 Sales stats response:', response.data);
      
      if (response.data?.stats) {
        setSalesStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading sales stats:', error);
      // Don't show error toast for stats, just log it
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getProducts();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchSales = async () => {
    try {
      // Use role-based API endpoint with proper API configuration
      const params = {
        ...(canAccessAllSales ? {} : { agent_id: user?.id }),
        page,
        limit
      };
      
      const response = await salesAPI.getSales(params);
      const pagination = response.data?.pagination;
      const salesData = response.data.sales || [];
      setSales(salesData);
      if (pagination) {
        setTotal(pagination.total || 0);
        setPages(pagination.pages || 1);
      } else {
        setTotal(response.data?.total ?? salesData.length);
        setPages(1);
      }
    } catch (error) {
      setError('Failed to fetch sales');
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setShowForm(false);
    setSelectedSale(null);
    // Force refresh sales data (reset to first page)
    try {
      setPage(1);
      const params = {
        ...(canAccessAllSales ? {} : { agent_id: user?.id }),
        page: 1,
        limit
      };
      const response = await salesAPI.getSales(params);
      const pagination = response.data?.pagination;
      const salesData = response.data.sales || [];
      setSales(salesData);
      if (pagination) {
        setTotal(pagination.total || 0);
        setPages(pagination.pages || 1);
      } else {
        setTotal(response.data?.total ?? salesData.length);
        setPages(1);
      }
      // Refresh sales stats
      loadSalesStats();
      // Goal progress is updated automatically by the backend
    } catch (error) {
      console.error('Error refreshing sales:', error);
    }
  };

  const handleEdit = (sale) => {
    setSelectedSale(sale);
    setShowForm(true);
  };

  const handleDelete = async (saleId) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await salesAPI.deleteSale(saleId);
        fetchSales();
        loadSalesStats();
        toast.success('Sale deleted successfully!');
        // Goal progress is updated automatically by the backend

      } catch (error) {
        setError('Failed to delete sale');
        toast.error('Failed to delete sale');
      }
    }
  };

  const handleOpenNotes = (sale) => {
    setSaleForNotes(sale);
    setShowNotesDialog(true);
  };

  const handleCloseNotes = () => {
    setShowNotesDialog(false);
    setSaleForNotes(null);
  };

  const handleSaveNote = () => {
    // Refresh sales data after note is saved
    fetchSales();
    loadSalesStats();
  };

  const handleDownload = async () => {
    try {
      toast.info('Preparing sales data for export...');
      
      // Get user's own sales data (same as what they see on the page)
      const response = await salesAPI.getSales({ limit: 0 });
      const salesData = response.data?.sales || response.data || [];
      
      if (salesData.length === 0) {
        toast.error('No sales data available to export');
        return;
      }

      // Format the data for CSV export
      const formattedData = salesData.map(sale => ({
        'Sale ID': sale.id || 'N/A',
        'Client Name': `${sale.client?.firstName || ''} ${sale.client?.lastName || ''}`.trim() || 'N/A',
        'Client Email': sale.client?.email || 'N/A',
        'Policy Number': sale.policyNumber || 'N/A',
        'Product Name': sale.productName || 'N/A',
        'Premium Amount': sale.premiumAmount || 0,
        'Commission Amount': sale.commissionAmount || 0,
        'Commission Rate (%)': sale.commissionRate || 0,
        'Sale Date': sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A',
        'Status': sale.status || 'Active',
        'Agent Name': `${sale.agent?.firstName || ''} ${sale.agent?.lastName || ''}`.trim() || 'N/A',
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
      link.setAttribute("download", `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Sales data exported successfully! (${salesData.length} records)`);
    } catch (error) {
      console.error('Export sales data error:', error);
      toast.error(`Failed to export sales data: ${error.response?.data?.error || error.message}`);
    }
  };

  const downloadSalesTemplate = () => {
    const headers = [
      'clientId',
      'clientEmail',
      'productName', 
      'premiumAmount',
      'commissionAmount',
      'commissionRate',
      'saleDate',
      'policyNumber',
      'status',
      'notes'
    ];
    
    const sampleData = [
      '101',
      'john.doe@email.com',
      'Life Insurance Premium',
      '1500.00',
      '150.00',
      '10.00',
      '2024-01-15',
      'POL-2024-001',
      'active',
      'Initial premium payment'
    ];

    const csvContent = [
      headers.join(','),
      sampleData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Sales CSV template downloaded successfully');
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setError('');
      toast.info('Importing sales from CSV...');
      
      const response = await salesAPI.bulkImportSales(file);
      
      if (response.data && response.data.success) {
        const { imported_count, errors } = response.data.data;
        
        if (errors && errors.length > 0) {
          toast.warning(`Import completed with ${errors.length} errors. ${imported_count} sales imported successfully.`);
          console.log('Import errors:', errors);
        } else {
          toast.success(`Successfully imported ${imported_count} sales!`);
        }
        
        fetchSales();
        loadSalesStats();
        // Goal progress is updated automatically by the backend
      } else {
        toast.error('Import failed - no data received');
      }
      
    } catch (error) {
      console.error('CSV import error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to import sales';
      setError(errorMessage);
      toast.error(errorMessage);
    }
    event.target.value = '';
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      (sale.client?.firstName + ' ' + sale.client?.lastName)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.client?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.policyNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    const matchesProduct = productFilter === 'all' || sale.product?.id === parseInt(productFilter);
    
    return matchesSearch && matchesStatus && matchesProduct;
  });

  // Use stats from API instead of calculating from paginated data
  const { totalSales, totalPremium, totalCommission, activeSales } = salesStats;

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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Sales</h1>
            <Badge variant={isManager ? "default" : "secondary"} className="self-start sm:self-auto">
              {isManager ? "Manager View (Own Data)" : "Agent View"}
            </Badge>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">
            {isManager ? 'Track and manage your sales performance' : 'Track and manage your sales performance'}
          </p>
          {isManager && (
            <p className="text-sm text-blue-600 mt-1">
              🔒 Viewing only your sales data
            </p>
          )}
          {!isManager && (
            <p className="text-sm text-blue-600 mt-1">
              💡 You can import & export sales via Excel
            </p>
          )}
        </div>
        {/* Action Buttons - Stacked on Mobile, Horizontal on Larger Screens */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Allow both managers and agents to import sales */}
          <input
            type="file"
            accept=".csv"
            onChange={handleUpload}
            className="hidden"
            id="upload-sales"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('upload-sales').click()}
            className="w-full sm:w-auto justify-center sm:justify-start"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={downloadSalesTemplate} className="w-full sm:w-auto justify-center sm:justify-start">
            <FileText className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" onClick={handleDownload} className="w-full sm:w-auto justify-center sm:justify-start">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedSale(null)} className="w-full sm:w-auto justify-center sm:justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Add Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedSale ? 'Edit Sale' : 'Add New Sale'}
                </DialogTitle>
                <DialogDescription>
                  {selectedSale 
                    ? 'Update sale information below.' 
                    : 'Enter sale details to record a new transaction.'}
                </DialogDescription>
              </DialogHeader>
              <SaleForm
                key={`sale-form-${selectedSale?.id || 'new'}`}
                sale={selectedSale}
                onSave={handleSave}
                onCancel={() => setShowForm(false)}
                products={products}
              />
            </DialogContent>
          </Dialog>
        </div>
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
            <CardTitle className="text-xs sm:text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Premium</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">${totalPremium.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">${totalCommission.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Policies</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{activeSales}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sales Records</CardTitle>
            <div className="text-sm text-gray-500">
              {isManager ? 'All sales data' : 'Your sales data only'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={limit === 0 || page <= 1}
              >
                Prev
              </Button>
              <div className="text-sm text-gray-600">
                {limit === 0 ? 'Showing all records' : `Page ${page} ${pages ? `of ${pages}` : ''}`}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage((p) => (pages ? Math.min(pages, p + 1) : p + 1))}
                disabled={limit === 0 || (pages ? page >= pages : sales.length < limit)}
              >
                Next
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  const nextLimit = parseInt(v, 10);
                  setPage(1);
                  setLimit(Number.isNaN(nextLimit) ? 20 : nextLimit);
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Select rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="2000">2000</SelectItem>
                  <SelectItem value="5000">5000</SelectItem>
                  <SelectItem value="0">All</SelectItem>
                </SelectContent>
              </Select>
              {total > 0 && (
                <span className="text-xs text-gray-500">Total: {total.toLocaleString()}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                             <Input
                 placeholder="Search sales by client name/email, product, or policy number..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10"
               />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
                         <Select value={productFilter} onValueChange={setProductFilter}>
               <SelectTrigger className="w-40">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Products</SelectItem>
                 {products.map((product) => (
                   <SelectItem key={product.id} value={product.id.toString()}>
                     {product.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Sale Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                                                                     <TableCell>
                          <div>
                            <div className="font-medium">{sale.client?.firstName} {sale.client?.lastName}</div>
                            {sale.client?.email && (
                              <div className="text-sm text-gray-500">
                                {sale.client.email}
                              </div>
                            )}
                            {sale.policyNumber && (
                              <div className="text-sm text-gray-500">
                                Policy: {sale.policyNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                       <TableCell>
                         <div className="font-medium">{sale.product?.name}</div>
                       </TableCell>
                       <TableCell>
                         <div className="font-medium">
                           ${parseFloat(sale.premiumAmount).toLocaleString()}
                         </div>
                       </TableCell>
                       <TableCell>
                         <div className="font-medium text-green-600">
                           ${parseFloat(sale.commissionAmount).toLocaleString()}
                         </div>
                         {sale.commissionRate && (
                           <div className="text-sm text-gray-500">
                             {sale.commissionRate}%
                           </div>
                         )}
                       </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1">
                           <Calendar className="h-3 w-3 text-gray-400" />
                           {new Date(sale.saleDate).toLocaleDateString()}
                         </div>
                       </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            sale.status === 'active' ? 'default' : 
                            sale.status === 'pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenNotes(sale)}
                            title="View/Edit Notes"
                            className="relative"
                          >
                            <MessageSquare className="h-4 w-4" />
                            {sale.notes && (
                              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                {sale.notes.split('\n\n').filter(note => note.trim()).length}
                              </span>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sale)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(sale.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-gray-500">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No sales found</p>
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

      {/* Notes Dialog */}
      <SaleNotesDialog
        sale={saleForNotes}
        isOpen={showNotesDialog}
        onOpenChange={setShowNotesDialog}
        onSaveNote={handleSaveNote}
      />
    </div>
  );
};

export default SalesTracking;

