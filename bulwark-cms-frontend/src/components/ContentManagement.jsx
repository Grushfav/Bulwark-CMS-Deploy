import React, { useState, useEffect } from 'react';
import { contentAPI } from '../lib/api.js';
import { useAuth } from '@/hooks/useAuth.jsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Search, 
  Upload, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  FileText, 
  Lock, 
  Globe,
  Calendar,
  User,
  Filter
} from 'lucide-react';

const ContentManagement = () => {
  const { user } = useAuth();
  const [content, setContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingContentId, setDownloadingContentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    visibility: '',
    author_id: '' // Changed from authorId to author_id to match backend
  });

  // Helper function to get file extension from MIME type
  const getExtensionFromMimeType = (mimeType) => {
    const mimeToExt = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt',
      'application/rtf': '.rtf',
      'application/vnd.oasis.opendocument.text': '.odt',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/csv': '.csv',
      'application/vnd.oasis.opendocument.spreadsheet': '.ods',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'application/vnd.oasis.opendocument.presentation': '.odp',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/bmp': '.bmp',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/wmv': '.wmv',
      'video/flv': '.flv',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/aac': '.aac',
      'audio/flac': '.flac'
    };
    return mimeToExt[mimeType] || '';
  };

  // Don't render if user is not authenticated
  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Please log in to access the document library.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadContent();
  }, [filters]);

  // Load content on initial mount
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
  
      const response = await contentAPI.getContent(filters);
      
      // Handle both possible response structures
      const contentData = response.data?.content || response.data || [];
      
      setContent(Array.isArray(contentData) ? contentData : []);
    } catch (error) {
      toast.error('Failed to load content');
      console.error('Error loading content:', error);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (contentId, fileName) => {
    if (!contentId || !fileName) {
      toast.error('Invalid content information');
      return;
    }

    try {
      setDownloadingContentId(contentId);
      const response = await contentAPI.downloadFile(contentId);
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/octet-stream' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      if (error.response?.status === 404) {
        toast.error('Document not found or has been removed');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You do not have permission to download this document.');
      } else if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else {
        toast.error(`Download failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      }
    } finally {
      setDownloadingContentId(null);
    }
  };

  const createContent = async (contentData) => {
    try {
      setLoading(true);
      
      // Debug: Log what's received
      
      
      // Validate file size
      if (contentData.file && contentData.file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error('File size exceeds 100MB limit');
        return;
      }

      // Validate file type
      const allowedTypes = ['policy_update', 'knowledge_base', 'event', 'announcement', 'training'];
      if (contentData.content_type && !allowedTypes.includes(contentData.content_type)) {
        toast.error('Invalid content type selected');
        return;
      }

      // Ensure proper values and handle undefined/null cases
      const safeContentType = contentData.content_type || 'policy_update';
      const safeIsPublic = contentData.isPublic !== undefined ? contentData.isPublic : true;
      const safeDescription = contentData.description || '';
      const safeTitle = contentData.title || '';

      // Map frontend field names to backend field names
      const mappedData = {
        title: safeTitle,
        content_type: safeContentType,
        description: safeDescription,
        is_public: safeIsPublic,
        file: contentData.file
      };



      const response = await contentAPI.createContent(mappedData);
      toast.success('Content created successfully');
      loadContent();
      return response;
    } catch (error) {
      console.error('Create content error:', error);
      if (error.response?.status === 413) {
        toast.error('File too large. Maximum size is 100MB.');
      } else if (error.response?.status === 415) {
        toast.error('Unsupported file type. Please check the file format.');
      } else if (error.response?.status === 400) {
        toast.error(`Invalid data: ${error.response.data?.error || 'Please check your input'}`);
      } else if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else {
        toast.error(`Failed to create content: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateContent = async (id, contentData) => {
    try {
      setLoading(true);
      
      // Map frontend field names to backend field names
      const mappedData = {
        title: contentData.title,
        contentType: contentData.content_type,
        description: contentData.description,
        isPublic: contentData.isPublic
      };
      
      const response = await contentAPI.updateContent(id, mappedData);
      toast.success('Content updated successfully');
      loadContent();
      return response;
    } catch (error) {
      console.error('Update content error:', error);
      if (error.response?.status === 404) {
        toast.error('Content not found or has been removed');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You can only edit your own content.');
      } else if (error.response?.status === 400) {
        toast.error(`Invalid data: ${error.response.data?.error || 'Please check your input'}`);
      } else {
        toast.error(`Failed to update content: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteContent = async (id) => {
    if (!id) {
      toast.error('Invalid content ID');
      return;
    }

    try {
      setLoading(true);
      await contentAPI.deleteContent(id);
      toast.success('Content deleted successfully');
      loadContent();
    } catch (error) {
      console.error('Delete content error:', error);
      if (error.response?.status === 404) {
        toast.error('Content not found or has already been deleted');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You can only delete your own content.');
      } else {
        toast.error(`Failed to delete content: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const searchContent = async (query) => {
    try {
      const response = await contentAPI.searchContent(query, filters);
      // Handle both possible response structures
      const searchResults = response.data?.search_results || response.data || [];
      setContent(Array.isArray(searchResults) ? searchResults : []);
    } catch (error) {
      toast.error('Search failed');
      console.error('Error searching content:', error);
      setContent([]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchContent(searchQuery);
    } else {
      loadContent();
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'policy_update':
        return <FileText className="w-4 h-4" />;
      case 'knowledge_base':
        return <FileText className="w-4 h-4" />;
      case 'forms_documents':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getContentTypeLabel = (type) => {
    switch (type) {
      case 'policy_update':
        return 'Policy Update';
      case 'knowledge_base':
        return 'Knowledge Base';
      case 'forms_documents':
        return 'Forms & Documents';
      default:
        return type;
    }
  };

  const getVisibilityIcon = (isPublic) => {
    return isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />;
  };

  const getVisibilityLabel = (isPublic) => {
    return isPublic ? 'Public' : 'Private';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Document Library</h1>
          <p className="text-muted-foreground mt-1">
            Store and manage company documentation, policies, and knowledge base
          </p>
        </div>
        <CreateDocumentDialog onCreateContent={createContent} />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="type">Document Type</Label>
                <select
                  id="type"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All Types</option>
                  <option value="policy_update">Policy Update</option>
                  <option value="knowledge_base">Knowledge Base</option>
                  <option value="forms_documents">Forms & Documents</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <select
                  id="visibility"
                  value={filters.visibility}
                  onChange={(e) => setFilters({ ...filters, visibility: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All</option>
                  <option value="true">Public</option>
                  <option value="false">Private</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="author">Author</Label>
                <select
                  id="author"
                  value={filters.author_id}
                  onChange={(e) => setFilters({ ...filters, author_id: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All Authors</option>
                  <option value={user?.id}>My Documents</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setFilters({ type: '', visibility: '', author_id: '' })}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Content List */}
      <div className="space-y-4">
                 {content && Array.isArray(content) && content.length > 0 ? (
           <ContentList
             content={content}
             onUpdateContent={updateContent}
             onDeleteContent={deleteContent}
             user={user}
             downloadingContentId={downloadingContentId}
             handleDownloadDocument={handleDownloadDocument}
             getContentTypeIcon={getContentTypeIcon}
             getContentTypeLabel={getContentTypeLabel}
             getVisibilityIcon={getVisibilityIcon}
             getVisibilityLabel={getVisibilityLabel}
           />
         ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground">
                Start by uploading your first document to build your knowledge base.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const ContentList = ({ 
  content, 
  onUpdateContent, 
  onDeleteContent, 
  user,
  downloadingContentId,
  handleDownloadDocument,
  getContentTypeIcon,
  getContentTypeLabel,
  getVisibilityIcon,
  getVisibilityLabel
}) => {
  const [editingContent, setEditingContent] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Document Library</h3>
        <div className="text-sm text-muted-foreground">
          {content.length} document{content.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {content.filter(item => item && item.id).map((item) => (
          <Card key={item?.id || Math.random()} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">{item?.title || 'Untitled'}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingContent(item)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{item?.title || 'this document'}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDeleteContent(item?.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getContentTypeIcon(item?.contentType || item?.content_type)}
                  {getContentTypeLabel(item?.contentType || item?.content_type)}
                </Badge>
                <Badge variant={item?.isPublic || item?.is_public ? "default" : "secondary"} className="flex items-center gap-1">
                  {getVisibilityIcon(item?.isPublic || item?.is_public)}
                  {getVisibilityLabel(item?.isPublic || item?.is_public)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {item?.description || 'No description available'}
              </p>
              
              {(item?.fileName || item?.file_name) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span className="truncate">{item.fileName || item.file_name}</span>
                  {(item?.fileSize || item?.file_size) && (
                    <span className="text-xs">
                      {((item.fileSize || item.file_size) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                 <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1">
                     <Eye className="w-4 h-4" />
                     {item?.viewCount || item?.view_count || 0}
                   </div>
                   {(item?.downloadCount || item?.download_count) > 0 && (
                     <div className="flex items-center gap-1">
                       <Download className="w-4 h-4" />
                       {item.downloadCount || item.download_count}
                     </div>
                   )}
                 </div>
                 <div className="flex items-center gap-1">
                   <User className="w-3 h-3" />
                   <span className="text-xs">
                     {item?.author?.firstName && item?.author?.lastName 
                       ? `${item.author.firstName} ${item.author.lastName}`
                       : item?.author_name || 'Unknown'}
                   </span>
                 </div>
               </div>

               {(item?.filePath || item?.file_path) && (
                 <div className="flex gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     className="flex-1"
                     onClick={() => handleDownloadDocument(item.id, item.fileName || item.file_name)}
                     disabled={downloadingContentId === item.id}
                   >
                     {downloadingContentId === item.id ? (
                       <>
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-1"></div>
                         Downloading...
                       </>
                     ) : (
                       <>
                         <Download className="w-4 h-4 mr-1" />
                         Download
                       </>
                     )}
                   </Button>
                 </div>
               )}

               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                 <Calendar className="w-3 h-3" />
                 <span>
                   {item?.createdAt || item?.created_at 
                     ? new Date(item.createdAt || item.created_at).toLocaleDateString() 
                     : 'Unknown date'}
                 </span>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingContent && (
        <EditDocumentDialog
          content={editingContent}
          onClose={() => setEditingContent(null)}
          onUpdate={onUpdateContent}
        />
      )}
    </div>
  );
};

const CreateDocumentDialog = ({ onCreateContent }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content_type: 'policy_update',
    description: '',
    isPublic: true,
    file: null
  });

  // Ensure form is properly initialized when opened
  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        content_type: 'policy_update',
        description: '',
        isPublic: true,
        file: null
      });
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Debug: Log form data before validation

    
    if (!formData.title.trim() || !formData.file) {
      toast.error('Please fill in all required fields and upload a file');
      return;
    }

    // Additional validation to ensure required fields are set
    if (!formData.content_type || formData.content_type === 'undefined') {
      toast.error('Please select a valid document type');
      return;
    }

    if (formData.isPublic === undefined || formData.isPublic === null) {
      toast.error('Please set document visibility');
      return;
    }

    try {
      setLoading(true);
      await onCreateContent(formData);
      setOpen(false);
      setFormData({
        title: '',
        content_type: 'policy_update',
        description: '',
        isPublic: true,
        file: null
      });
    } catch (error) {
      console.error('Error creating content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" aria-describedby="upload-dialog-description">
        <DialogHeader>
          <DialogTitle>Upload New Document</DialogTitle>
        </DialogHeader>
        <div id="upload-dialog-description" className="sr-only">
          Dialog for uploading new documents with title, type, description, file upload, and visibility settings
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter document title"
              required
            />
          </div>

          <div>
            <Label htmlFor="content_type">Document Type *</Label>
            <select
              id="content_type"
              value={formData.content_type}
              onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="policy_update">Policy Update</option>
              <option value="knowledge_base">Knowledge Base</option>
              <option value="event">Event</option>
              <option value="announcement">Announcement</option>
              <option value="training">Training</option>
            </select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter document description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="file">Upload File *</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supported formats: PDF, DOC, DOCX, TXT, XLSX, XLS, PPT, PPTX
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
            />
            <Label htmlFor="isPublic">
              Make this document public (visible to all users)
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EditDocumentDialog = ({ content, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: content?.title || '',
    content_type: content?.content_type || content?.contentType || 'policy_update',
    description: content?.description || '',
    isPublic: content?.isPublic !== undefined ? content.isPublic : (content?.is_public !== undefined ? content.is_public : true)
  });

  // Update form data when content changes
  useEffect(() => {
    if (content) {
      setFormData({
        title: content.title || '',
        content_type: content.content_type || content.contentType || 'policy_update',
        description: content.description || '',
        isPublic: content.isPublic !== undefined ? content.isPublic : (content.is_public !== undefined ? content.is_public : true)
      });
    }
  }, [content]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await onUpdate(content.id, formData);
      onClose();
    } catch (error) {
      console.error('Error updating content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no content
  if (!content) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" aria-describedby="edit-dialog-description">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>
        <div id="edit-dialog-description" className="sr-only">
          Dialog for editing existing documents with title, type, description, and visibility settings
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit_title">Document Title *</Label>
            <Input
              id="edit_title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter document title"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit_content_type">Document Type *</Label>
            <select
              id="edit_content_type"
              value={formData.content_type}
              onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="policy_update">Policy Update</option>
              <option value="knowledge_base">Knowledge Base</option>
              <option value="event">Event</option>
              <option value="announcement">Announcement</option>
              <option value="training">Training</option>
            </select>
          </div>

          <div>
            <Label htmlFor="edit_description">Description</Label>
            <Textarea
              id="edit_description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter document description"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="edit_isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
            />
            <Label htmlFor="edit_isPublic">
              Make this document public (visible to all users)
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContentManagement;
