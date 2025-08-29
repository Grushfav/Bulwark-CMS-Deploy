// Configuration file for easy URL switching
export const config = {
  // For local development
  local: {
    apiUrl: 'http://127.0.0.1:5000/api',
    frontendUrl: 'http://localhost:5173'
  },
  
  // For Render deployment
  render: {
    apiUrl: 'https://bulwark-cms-backend.onrender.com/api',
    frontendUrl: 'https://bulwark-cms-frontend.onrender.com'
  },
  
  // For Cursor port forwarding (update these with your actual URLs)
  cursor: {
    apiUrl: 'https://def456.cursor.sh/api', // Replace 'def456.cursor.sh' with your actual backend Cursor URL
    frontendUrl: 'https://abc123.cursor.sh' // Replace 'abc123.cursor.sh' with your actual frontend Cursor URL
  },
  
  // Current environment (change this to switch between local, render, and cursor)
  current: 'local' // Options: 'local', 'render', or 'cursor'
};

// Helper function to get current API URL
export const getApiUrl = () => {
  return config[config.current].apiUrl;
};

// Helper function to get current frontend URL
export const getFrontendUrl = () => {
  return config[config.current].frontendUrl;
};
