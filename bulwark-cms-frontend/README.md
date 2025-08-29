# Bulwark Insurance Agent CMS

A comprehensive Content Management System (CMS) for insurance agents to manage clients, policies, and business operations.

## 🎯 **Project Focus**

This project focuses **solely on the agent-side CMS functionality**. The team has decided to remove client portal development and concentrate on building a robust, feature-rich system for insurance agents to manage their business operations.

## ✨ **Features**

### **Client Management**
- **Client Directory**: Comprehensive client database with search and filtering
- **Client Profiles**: Detailed client information management
- **Status Tracking**: Track prospects, active clients, and inactive clients
- **Notes & Documentation**: Add and manage client notes and important information

### **Content Management**
- **Policy Management**: Create, edit, and manage insurance policies
- **Document Management**: Upload, organize, and share documents
- **Content Publishing**: Manage public-facing content and resources

### **Business Operations**
- **Sales Tracking**: Monitor sales performance and track leads
- **Goals & KPIs**: Set and track business goals and key performance indicators
- **Reminders & Follow-ups**: Automated reminder system for client follow-ups
- **Team Management**: Manage team members and their roles

### **Reporting & Analytics**
- **Performance Reports**: Comprehensive business performance analytics
- **Client Insights**: Detailed client relationship analytics
- **Business Intelligence**: Data-driven insights for business growth

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ 
- pnpm package manager

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bulwark-cms-frontend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm run dev
   ```

4. **Build for production**
   ```bash
   pnpm run build
   ```

## 🏗️ **Project Structure**

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (buttons, forms, etc.)
│   ├── Dashboard.jsx   # Main dashboard component
│   ├── ClientsManagement.jsx  # Client management interface
│   ├── ContentManagement.jsx  # Content and policy management
│   ├── Actions.jsx     # Client actions and activities tracking
│   └── ...            # Other business components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries and API configurations
├── contexts/           # React context providers
└── pages/              # Page components and routing
```

## 🔧 **Technology Stack**

- **Frontend Framework**: React 19 with modern hooks and patterns
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom Bulwark design system
- **UI Components**: Radix UI primitives with custom styling
- **State Management**: React Context API and hooks
- **HTTP Client**: Axios for API communication
- **Routing**: React Router DOM v7
- **Notifications**: Sonner for toast notifications
- **Icons**: Lucide React for consistent iconography

## 📱 **Design System**

The application uses a custom Bulwark Insurance design system built on Tailwind CSS:

- **Primary Colors**: Professional blues and grays
- **Accent Colors**: Strategic use of green for success states
- **Typography**: Clean, readable fonts optimized for business use
- **Components**: Consistent button styles, form elements, and layouts
- **Responsive Design**: Mobile-first approach with desktop optimization

## 🔌 **API Integration**

The CMS is designed to work with a backend API that provides:

- **Client Management**: CRUD operations for client records
- **Policy Management**: Insurance policy creation and management
- **File Management**: Document upload and organization
- **User Authentication**: Secure agent login and session management

## 🚫 **Removed Features**

As part of the project refocus, the following features have been removed:

- ❌ **Client Portal**: No longer developing client-facing portal
- ❌ **Client Login**: Removed client authentication system
- ❌ **Portal Access Management**: No more client portal access controls
- ❌ **Email Services**: Removed email functionality for client communications
- ❌ **Cross-Origin Communication**: No more client-agent data sharing

## 🎯 **Future Development**

The project will focus on enhancing:

- **Agent Experience**: Improved workflows and productivity tools
- **Business Intelligence**: Advanced analytics and reporting
- **Policy Management**: Enhanced policy creation and management tools
- **Client Relationship Management**: Better client interaction tracking
- **Team Collaboration**: Enhanced team management features

## 🤝 **Contributing**

This project is focused on agent-side functionality. When contributing:

1. Focus on agent productivity and business management features
2. Ensure all features align with the agent workflow
3. Maintain the professional, business-focused design aesthetic
4. Test thoroughly with agent use cases in mind

## 📄 **License**

This project is proprietary software for Bulwark Insurance.

---

**Note**: This project has been streamlined to focus exclusively on agent-side CMS functionality. All client portal related features have been removed to ensure focused development and better resource allocation.
