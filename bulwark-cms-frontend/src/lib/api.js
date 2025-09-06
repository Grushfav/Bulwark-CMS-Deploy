// API configuration and utilities
import { getApiUrl } from '../config.js';

const API_BASE_URL = getApiUrl();

// Debug logging
console.log('🔧 API Configuration Debug:');
console.log('🔧 API_BASE_URL:', API_BASE_URL);
console.log('🔧 Current hostname:', window.location.hostname);
console.log('🔧 Config import:', import.meta.url);

// Create axios instance with default config
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('🔑 API Request - Token from localStorage:', token ? 'Token present' : 'No token');
  console.log('🔑 API Request - Token value:', token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 API Request - Authorization header set:', `Bearer ${token}`);
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  register: (userData) => api.post('/auth/register', userData),
};

// Users API
export const usersAPI = {
  getUsers: () => api.get('/users'),
  createUser: (userData) => api.post('/users', userData),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getAgents: () => api.get('/users/agents'),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData) => api.put('/users/profile', userData),
};

// Clients API
export const clientsAPI = {
  getClients: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/clients${queryString ? `?${queryString}` : ''}`);
  },
  createClient: (clientData) => api.post('/clients', clientData),
  getClient: (id) => api.get(`/clients/${id}`),
  updateClient: (id, clientData) => api.put(`/clients/${id}`, clientData),
  deleteClient: (id) => api.delete(`/clients/${id}`),
  // Client Notes API
  getClientNotes: (clientId) => api.get(`/clients/${clientId}/notes`),
  addClientNote: (clientId, noteData) => api.post(`/clients/${clientId}/notes`, noteData),
  bulkImportClients: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/clients/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  // Client Portal Access Management
  grantPortalAccess: (clientId, accessData) => api.post(`/clients/${clientId}/portal-access`, accessData),
  revokePortalAccess: (clientId) => api.delete(`/clients/${clientId}/portal-access`),
  generateTempPassword: (clientId) => api.post(`/clients/${clientId}/temp-password`),
  getPortalAccessStatus: (clientId) => api.get(`/clients/${clientId}/portal-access`),
  sendPortalCredentials: (clientId, credentials) => api.post(`/clients/${clientId}/send-credentials`, credentials),
};



// Sales API
export const salesAPI = {
  getSales: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/sales${queryString ? `?${queryString}` : ''}`);
  },
  createSale: (saleData) => api.post('/sales', saleData),
  getSale: (id) => api.get(`/sales/${id}`),
  updateSale: (id, saleData) => api.put(`/sales/${id}`, saleData),
  updateSaleNotes: (id, notes) => api.patch(`/sales/${id}/notes`, { notes }),
  deleteSale: (id) => api.delete(`/sales/${id}`),
};

// Products API
export const productsAPI = {
  getProducts: () => api.get('/products'),
  createProduct: (productData) => api.post('/products', productData),
  getProduct: (id) => api.get(`/products/${id}`),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

// Reminders API
export const remindersAPI = {
  getReminders: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/reminders${queryString ? `?${queryString}` : ''}`);
  },
  createReminder: (reminderData) => api.post('/reminders', reminderData),
  getReminder: (id) => api.get(`/reminders/${id}`),
  updateReminder: (id, reminderData) => api.put(`/reminders/${id}`, reminderData),
  completeReminder: (id) => api.put(`/reminders/${id}/complete`),
  deleteReminder: (id) => api.delete(`/reminders/${id}`),
  getUpcomingReminders: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/reminders/upcoming${queryString ? `?${queryString}` : ''}`);
  },
};

// Goals API
export const goalsAPI = {
  getGoals: (params) => api.get('/goals', { params }),
  getGoal: (id) => api.get(`/goals/${id}`),
  createGoal: (goalData) => api.post('/goals', goalData),
  updateGoal: (id, goalData) => api.put(`/goals/${id}`, goalData),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  updateProgress: () => api.post('/goals/update-progress'),
  recalculateProgress: () => api.post('/goals/recalculate-progress'),
};

// Team Management API
export const teamAPI = {
  getTeams: () => api.get('/team'),
  createTeam: (teamData) => api.post('/team', teamData),
  getTeam: (id) => api.get(`/team/${id}`),
  updateTeam: (id, teamData) => api.put(`/team/${id}`, teamData),
  deleteTeam: (id) => api.delete(`/team/${id}`),
  getMembers: () => api.get('/team/members'),
  getTeamMembers: (teamId) => api.get(`/team/${teamId}/members`),
  addTeamMember: (teamId, memberData) => api.post(`/team/${teamId}/members`, memberData),
  removeTeamMember: (teamId, memberId) => api.delete(`/team/${teamId}/members/${memberId}`),
  getPerformanceRecords: (teamId) => api.get(`/team/${teamId}/performance`),
  getTeamAnalytics: (teamId) => api.get(`/team/${teamId}/analytics`),
  getTopAgents: () => api.get('/team/top-agents'),
};

// Content Management API
export const contentAPI = {
  getContent: (params) => api.get('/content-management/content', { params }),
  createContent: (contentData) => {
    // Handle file upload with FormData
    if (contentData.file) {
      const formData = new FormData();
      formData.append('title', contentData.title);
      formData.append('content_type', contentData.content_type);
      formData.append('description', contentData.description || '');
      formData.append('is_public', contentData.is_public);
      formData.append('file', contentData.file);
      return api.post('/content-management/content', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    // Fallback to JSON for non-file content
    return api.post('/content-management/content', contentData);
  },
  getContentItem: (id) => api.get(`/content-management/content/${id}`),
  updateContent: (id, contentData) => api.put(`/content-management/content/${id}`, contentData),
  deleteContent: (id) => api.delete(`/content-management/content/${id}`),
  uploadFile: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/content-management/content/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadFile: (id) => api.get(`/content-management/content/${id}/download`, { responseType: 'blob' }),
  getCategories: () => api.get('/content-management/categories'),
  createCategory: (categoryData) => api.post('/content-management/categories', categoryData),
  getTags: () => api.get('/content-management/tags'),
  createTag: (tagData) => api.post('/content-management/tags', tagData),
  searchContent: (query, params) => api.get('/content-management/content/search', { params: { q: query, ...params } }),
  getFeaturedContent: () => api.get('/content-management/content/featured'),
  getContentStats: (id) => api.get(`/content-management/content/${id}/stats`),
};

// User Profile & Settings API
export const userProfileAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getAvatar: () => api.get('/users/profile/avatar'),
  getSettings: () => api.get('/users/settings'),
  updatePreferences: (preferences) => api.put('/users/settings/preferences', preferences),
  updateNotifications: (notifications) => api.put('/users/settings/notifications', notifications),
  updatePrivacy: (privacy) => api.put('/users/settings/privacy', privacy),
  changePassword: (passwordData) => api.put('/users/profile/password', passwordData),
  getUsers: (params) => api.get('/users', { params }),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  reactivateUser: (id) => api.put(`/users/${id}/reactivate`),
  resetUserPassword: (id, passwordData) => api.post(`/users/${id}/reset-password`, passwordData),
  getNotifications: (params) => api.get('/users/notifications', { params }),
  markNotificationRead: (id) => api.patch(`/users/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/users/notifications/read-all'),
};

// Reports API
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getDashboardData: (params) => api.get('/reports/dashboard', { params }),
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getPerformanceReport: (params) => api.get('/reports/performance', { params }),
  getTeamReport: () => api.get('/reports/team'),
  getComprehensiveReport: (params) => api.get('/reports/comprehensive', { params }),
};

// Tickets API
export const ticketsAPI = {
  getTickets: () => api.get('/tickets'),
  createTicket: (ticketData) => api.post('/tickets', ticketData),
  getTicket: (id) => api.get(`/tickets/${id}`),
  updateTicket: (id, ticketData) => api.put(`/tickets/${id}`, ticketData),
  deleteTicket: (id) => api.delete(`/tickets/${id}`),
  updateTicketStatus: (id, status) => api.patch(`/tickets/${id}/status`, { status }),
  addComment: (id, commentData) => api.post(`/tickets/${id}/comments`, commentData),
  getTicketComments: (id) => api.get(`/tickets/${id}/comments`),
};

// File Management API
export const filesAPI = {
  uploadClients: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload/clients', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadClients: () => api.get('/files/download/clients', { responseType: 'blob' }),
  uploadSales: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload/sales', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadSales: () => api.get('/files/download/sales', { responseType: 'blob' }),
  getClientsTemplate: () => api.get('/files/template/clients', { responseType: 'blob' }),
  getSalesTemplate: () => api.get('/files/template/sales', { responseType: 'blob' }),
};

export default api;

