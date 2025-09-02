// Configuration file using environment variables
export const config = {
  // Use deployed backend for testing
  apiUrl: 'https://bulwark-cms-deploy.onrender.com/api',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',
  environment: 'production'
};

// Helper function to get current API URL
export const getApiUrl = () => {
  // Use deployed backend for testing
  return 'https://bulwark-cms-deploy.onrender.com/api';
};

// Helper function to get current frontend URL
export const getFrontendUrl = () => {
  return config.environment;
};

// Helper function to get current environment
export const getEnvironment = () => {
  return config.environment;
};

// Helper function to check if we're in development
export const isDevelopment = () => {
  return config.environment === 'local';
};

// Helper function to check if we're in production
export const isProduction = () => {
  return config.environment === 'production';
};
