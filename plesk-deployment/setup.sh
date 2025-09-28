#!/bin/bash
# Quick Plesk Setup Script

echo "🚀 Setting up Bulwark CMS on Plesk..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Run database migrations
echo "🗄️  Setting up database..."
npm run db:push

# Start the application
echo "🚀 Starting application..."
npm start

echo "✅ Setup complete!"
