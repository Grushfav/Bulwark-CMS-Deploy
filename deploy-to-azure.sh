#!/bin/bash

# Bulwark CMS - Azure Deployment Script
# This script automates the deployment to Azure Static Web Apps

set -e

echo "🚀 Starting Azure deployment for Bulwark CMS..."

# Configuration
RESOURCE_GROUP="bulwark-cms-rg"
APP_NAME="bulwark-cms-frontend"
LOCATION="East US"
GITHUB_REPO="https://github.com/yourusername/bulwark-cms"
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Azure CLI is installed
check_azure_cli() {
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first."
        print_status "Installation instructions: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    print_status "Azure CLI is installed"
}

# Check if logged into Azure
check_azure_login() {
    if ! az account show &> /dev/null; then
        print_warning "Not logged into Azure. Please login first."
        az login
    fi
    print_status "Logged into Azure"
}

# Create resource group
create_resource_group() {
    print_status "Creating resource group: $RESOURCE_GROUP"
    az group create \
        --name "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --tags "Project=BulwarkCMS" "Environment=Production" \
        --output none
    
    print_status "Resource group created successfully"
}

# Create Static Web App
create_static_web_app() {
    print_status "Creating Static Web App: $APP_NAME"
    
    # Check if app already exists
    if az staticwebapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Static Web App already exists. Updating configuration..."
        return
    fi
    
    az staticwebapp create \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --source "$GITHUB_REPO" \
        --branch "$BRANCH" \
        --app-location "bulwark-cms-frontend" \
        --api-location "" \
        --output-location "dist" \
        --login-with-github \
        --output none
    
    print_status "Static Web App created successfully"
}

# Configure environment variables
configure_environment() {
    print_status "Configuring environment variables..."
    
    # Get the app URL
    APP_URL=$(az staticwebapp show \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "defaultHostname" \
        --output tsv)
    
    print_status "App URL: https://$APP_URL"
    
    # Set environment variables
    az staticwebapp appsettings set \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --setting-names \
            "VITE_API_URL=https://bulwark-cms-backend.onrender.com/api" \
            "VITE_FRONTEND_URL=https://$APP_URL" \
            "VITE_ENVIRONMENT=azure" \
        --output none
    
    print_status "Environment variables configured"
}

# Display deployment information
display_info() {
    print_status "Deployment completed successfully!"
    echo ""
    echo "📋 Deployment Information:"
    echo "   Resource Group: $RESOURCE_GROUP"
    echo "   App Name: $APP_NAME"
    echo "   Location: $LOCATION"
    echo "   App URL: https://$APP_URL"
    echo ""
    echo "🔧 Next Steps:"
    echo "   1. Configure custom domain (optional)"
    echo "   2. Set up monitoring with Application Insights"
    echo "   3. Test the application"
    echo "   4. Configure CI/CD with GitHub Actions"
    echo ""
    echo "📚 Documentation:"
    echo "   - Azure Portal: https://portal.azure.com"
    echo "   - Static Web Apps: https://docs.microsoft.com/en-us/azure/static-web-apps/"
}

# Main deployment function
main() {
    print_status "Starting deployment process..."
    
    check_azure_cli
    check_azure_login
    create_resource_group
    create_static_web_app
    configure_environment
    display_info
    
    print_status "Deployment completed! 🎉"
}

# Run main function
main "$@"
