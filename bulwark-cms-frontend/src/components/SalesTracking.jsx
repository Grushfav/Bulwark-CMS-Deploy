import { useState, useEffect } from 'react';
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
} from 'lucide-react';

const SaleForm = ({ sale, onSave, onCancel, products }) => {
  const { user, isManager, canAccessAllClients } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
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
    setFilteredClients(clients);
  }, [clients]);

  // Reset search when editing an existing sale
  useEffect(() => {
    if (sale?.id) {
      setClientSearchTerm('');
      setFilteredClients(clients);
    }
  }, [sale?.id, clients]);

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

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      
      // Use role-based API endpoint for clients with proper API configuration
      const params = canAccessAllClients ? {} : { agent_id: user?.id };
      
      const response = await clientsAPI.getClients(params);
      const clientsData = response.data.clients || [];
      setClients(clientsData);
      setFilteredClients(clientsData); // Initialize filtered clients
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
      setFilteredClients([]);
    } finally {
      setClientsLoading(false);
    }
  };

  // Filter clients based on search term
  const filterClients = (searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }
    
    const filtered = clients.filter(client => {
      const searchLower = searchTerm.toLowerCase();
      return (
        client.firstName?.toLowerCase().includes(searchLower) ||
        client.lastName?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchLower)
      );
    });
    setFilteredClients(filtered);
  };

  // Handle client search input change
  const handleClientSearchChange = (value) => {
    setClientSearchTerm(value);
    filterClients(value);
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
      setFilteredClients(clients);
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
  const isFormReady = clients.length > 0 && products.length > 0;

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
                      {client.email && (
                        <span className="text-xs text-gray-500">{client.email}</span>
                      )}
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
        {/* Temporary debug - remove after testing */}
        <div className="text-xs text-gray-500">
          Debug - Notes value: "{formData.notes}" (length: {formData.notes?.length || 0})
        </div>
        <div className="text-xs text-gray-500">
          Debug - Sale notes: "{sale?.notes}" (length: {sale?.notes?.length || 0})
        </div>
      </div>

             <DialogFooter>
         <Button type="button" variant="outline" onClick={() => {
           // Reset search when form is cancelled
           setClientSearchTerm('');
           setFilteredClients(clients);
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

const SalesTracking = () => {
  const { user, isManager, canAccessAllSales } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  // Note: updateGoalProgress is not available in GoalsContext
  // Goal progress is updated automatically by the backend when sales are created

  useEffect(() => {
    if (user?.id) {
      fetchSales();
      fetchProducts();
    }
  }, [user?.id, canAccessAllSales]);

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
      const params = canAccessAllSales ? {} : { agent_id: user?.id };
      
      const response = await salesAPI.getSales(params);
      setSales(response.data.sales || []);
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
    // Force refresh sales data
    try {
      const params = canAccessAllSales ? {} : { agent_id: user?.id };
      const response = await salesAPI.getSales(params);
      setSales(response.data.sales || []);
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
        toast.success('Sale deleted successfully!');
        // Goal progress is updated automatically by the backend

      } catch (error) {
        setError('Failed to delete sale');
        toast.error('Failed to delete sale');
      }
    }
  };

  const handleDownload = async () => {
    try {
      const response = await filesAPI.downloadSales();
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError('Failed to download sales');
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const response = await filesAPI.uploadSales(file);
      setError('');
      alert(`Successfully imported ${response.data.created_sales.length} sales`);
      fetchSales();
      // Goal progress is updated automatically by the backend
      
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload sales');
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

  // Calculate totals
  const totalPremium = sales.reduce((sum, sale) => sum + (parseFloat(sale.premiumAmount) || 0), 0);
  const totalCommission = sales.reduce((sum, sale) => sum + (parseFloat(sale.commissionAmount) || 0), 0);
  const activeSales = sales.filter(sale => sale.status === 'active').length;

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
            accept=".xlsx,.xls"
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
            Import
          </Button>
          <Button variant="outline" onClick={handleDownload} className="w-full sm:w-auto justify-center sm:justify-start">
            <Download className="h-4 w-4 mr-2" />
            Export
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
            <div className="text-xl sm:text-2xl font-bold">{activeSales}</div>
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
    </div>
  );
};

export default SalesTracking;

