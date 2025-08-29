import express from 'express';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import clientRoutes from './routes/clients.js';
import saleRoutes from './routes/sales.js';
import goalRoutes from './routes/goals.js';
import reminderRoutes from './routes/reminders.js';
import contentRoutes from './routes/content.js';
import teamRoutes from './routes/team.js';
import reportRoutes from './routes/reports.js';
import fileRoutes from './routes/files.js';
import productRoutes from './routes/products.js';

const app = express();

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Bulwark CMS Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      users: '/users',
      clients: '/clients',
      sales: '/sales',
      goals: '/goals',
      reminders: '/reminders',
      content: '/content-management',
      team: '/team',
      reports: '/reports',
      files: '/files',
      products: '/products'
    },
    documentation: 'API documentation and usage examples available in the README'
  });
});

// Route definitions
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/clients', clientRoutes);
app.use('/sales', saleRoutes);
app.use('/goals', goalRoutes);
app.use('/reminders', reminderRoutes);
app.use('/content-management', contentRoutes);
app.use('/team', teamRoutes);
app.use('/reports', reportRoutes);
app.use('/files', fileRoutes);
app.use('/products', productRoutes);

export default app;
