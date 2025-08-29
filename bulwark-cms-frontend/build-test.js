#!/usr/bin/env node

/**
 * Build test script for BULWARK CMS Frontend
 * This script helps debug build issues by checking imports and paths
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 BULWARK CMS Frontend - Build Test Script');
console.log('=============================================\n');

// Check current directory
console.log('📁 Current directory:', process.cwd());
console.log('📁 Script directory:', __dirname);
console.log('📁 Expected project root:', join(__dirname, '..'));
console.log('');

// Check if we're in the right place
const expectedFiles = [
  'package.json',
  'vite.config.js',
  'index.html',
  'src/main.jsx'
];

console.log('🔍 Checking for required files:');
expectedFiles.forEach(file => {
  const exists = fs.existsSync(join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});
console.log('');

// Check src directory structure
console.log('🔍 Checking src directory structure:');
const srcDir = join(__dirname, 'src');
if (fs.existsSync(srcDir)) {
  const srcContents = fs.readdirSync(srcDir);
  console.log('  📁 src/ contents:', srcContents.join(', '));
  
  // Check lib directory
  const libDir = join(srcDir, 'lib');
  if (fs.existsSync(libDir)) {
    const libContents = fs.readdirSync(libDir);
    console.log('  📁 src/lib/ contents:', libContents.join(', '));
  }
  
  // Check hooks directory
  const hooksDir = join(srcDir, 'hooks');
  if (fs.existsSync(hooksDir)) {
    const hooksContents = fs.readdirSync(hooksDir);
    console.log('  📁 src/hooks/ contents:', hooksContents.join(', '));
  }
} else {
  console.log('  ❌ src/ directory not found');
}
console.log('');

// Check package.json
console.log('🔍 Checking package.json:');
try {
  const packageJson = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf8'));
  console.log(`  📦 Name: ${packageJson.name}`);
  console.log(`  📦 Version: ${packageJson.version}`);
  console.log(`  📦 Type: ${packageJson.type}`);
  console.log(`  📦 Scripts: ${Object.keys(packageJson.scripts).join(', ')}`);
} catch (error) {
  console.log('  ❌ Error reading package.json:', error.message);
}
console.log('');

// Check vite config
console.log('🔍 Checking Vite configuration:');
try {
  const viteConfig = fs.readFileSync(join(__dirname, 'vite.config.js'), 'utf8');
  const hasAlias = viteConfig.includes('"@"');
  const hasPath = viteConfig.includes('path.resolve');
  console.log(`  ⚙️ Has @ alias: ${hasAlias ? '✅' : '❌'}`);
  console.log(`  ⚙️ Has path.resolve: ${hasPath ? '✅' : '❌'}`);
} catch (error) {
  console.log('  ❌ Error reading vite.config.js:', error.message);
}
console.log('');

console.log('🚀 Build test completed!');
console.log('If all checks pass, try running: npm run build');
