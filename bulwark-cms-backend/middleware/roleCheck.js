// Role-based access control middleware

// Check if user has required role
export const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    
    // Convert single role to array for consistent handling
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: userRole
      });
    }

    next();
  };
};

// Check if user is manager
export const requireManager = (req, res, next) => {
  return requireRole(['manager'])(req, res, next);
};

// Check if user is manager or senior agent
export const requireManagerOrSenior = (req, res, next) => {
  return requireRole(['manager'])(req, res, next);
};

// Check if user can access resource (own data or manager access)
export const canAccessResource = (resourceOwnerId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Managers can access all resources
    if (userRole === 'manager') {
      return next();
    }
    
    // Users can access their own resources
    if (userId === resourceOwnerId) {
      return next();
    }
    
    // Senior agents can access team resources (if they have a manager)
    if (userRole === 'senior_agent' && req.user.managerId === resourceOwnerId) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Access denied to this resource',
      code: 'RESOURCE_ACCESS_DENIED'
    });
  };
};

// Check if user can manage other users
export const canManageUsers = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role;
  
  // Only managers can manage users
  if (userRole !== 'manager') {
    return res.status(403).json({ 
      error: 'Only managers can manage users',
      code: 'USER_MANAGEMENT_DENIED'
    });
  }

  next();
};

// Check if user can view all data
export const canViewAllData = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role;
  
  // Managers and senior agents can view all data
  if (['manager', 'senior_agent'].includes(userRole)) {
    return next();
  }
  
  return res.status(403).json({ 
    error: 'Insufficient permissions to view all data',
    code: 'DATA_ACCESS_DENIED'
  });
};

// Check if user can perform action on resource
export const canPerformAction = (action, resourceType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    
    // Define action permissions
    const permissions = {
      manager: {
        users: ['create', 'read', 'update', 'delete'],
        clients: ['create', 'read', 'update', 'delete'],
        sales: ['create', 'read', 'update', 'delete'],
        goals: ['create', 'read', 'update', 'delete'],
        content: ['create', 'read', 'update', 'delete'],
        reports: ['create', 'read', 'export'],
        team: ['manage', 'view', 'edit']
      },
      
      agent: {
        users: [],
        clients: ['create', 'read', 'update'],
        sales: ['create', 'read', 'update'],
        goals: ['create', 'read', 'update'],
        content: ['read'],
        reports: ['read'],
        team: []
      }
    };
    
    const userPermissions = permissions[userRole] || {};
    const resourcePermissions = userPermissions[resourceType] || [];
    
    if (!resourcePermissions.includes(action)) {
      return res.status(403).json({ 
        error: `Cannot perform ${action} on ${resourceType}`,
        code: 'ACTION_NOT_PERMITTED',
        action,
        resourceType,
        userRole
      });
    }
    
    next();
  };
};

// Export all middleware functions
export default {
  requireRole,
  requireManager,
  requireManagerOrSenior,
  canAccessResource,
  canManageUsers,
  canViewAllData,
  canPerformAction
};
