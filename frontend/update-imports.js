#!/usr/bin/env node

/**
 * Script to update import paths after frontend reorganization
 * 
 * This script updates all import statements in the frontend to reflect
 * the new feature-based folder structure.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mapping of old paths to new paths
const pathMappings = [
  // Auth
  { from: /from ['"]\.\.\/components\/Login['"]/, to: "from '../features/auth/Login'" },
  { from: /from ['"]\.\/components\/Login['"]/, to: "from './features/auth/Login'" },
  { from: /from ['"]\.\.\/components\/ForbiddenPage['"]/, to: "from '../features/auth/ForbiddenPage'" },
  { from: /from ['"]\.\/components\/ForbiddenPage['"]/, to: "from './features/auth/ForbiddenPage'" },
  { from: /from ['"]\.\.\/contexts\/AuthContext['"]/, to: "from '../features/auth/AuthContext'" },
  { from: /from ['"]\.\/contexts\/AuthContext['"]/, to: "from './features/auth/AuthContext'" },
  { from: /from ['"]\.\.\/config\/authConfig['"]/, to: "from '../features/auth/authConfig'" },
  { from: /from ['"]\.\/config\/authConfig['"]/, to: "from './features/auth/authConfig'" },
  
  // Orders
  { from: /from ['"]\.\.\/components\/OrderForm['"]/, to: "from '../features/orders/OrderForm'" },
  { from: /from ['"]\.\/components\/OrderForm['"]/, to: "from './features/orders/OrderForm'" },
  { from: /from ['"]\.\.\/components\/OrderHistory['"]/, to: "from '../features/orders/OrderHistory'" },
  { from: /from ['"]\.\/components\/OrderHistory['"]/, to: "from './features/orders/OrderHistory'" },
  { from: /from ['"]\.\.\/components\/OrderDetails['"]/, to: "from '../features/orders/OrderDetails'" },
  { from: /from ['"]\.\/components\/OrderDetails['"]/, to: "from './features/orders/OrderDetails'" },
  { from: /from ['"]\.\.\/components\/OrderDetailsPage['"]/, to: "from '../features/orders/OrderDetailsPage'" },
  { from: /from ['"]\.\/components\/OrderDetailsPage['"]/, to: "from './features/orders/OrderDetailsPage'" },
  { from: /from ['"]\.\.\/components\/PriorityNotificationPanel['"]/, to: "from '../features/orders/PriorityNotificationPanel'" },
  { from: /from ['"]\.\/components\/PriorityNotificationPanel['"]/, to: "from './features/orders/PriorityNotificationPanel'" },
  { from: /from ['"]\.\.\/contexts\/CurrencyContext['"]/, to: "from '../features/orders/CurrencyContext'" },
  { from: /from ['"]\.\/contexts\/CurrencyContext['"]/, to: "from './features/orders/CurrencyContext'" },
  { from: /from ['"]\.\.\/hooks\/useOrderDetails['"]/, to: "from '../features/orders/useOrderDetails'" },
  { from: /from ['"]\.\/hooks\/useOrderDetails['"]/, to: "from './features/orders/useOrderDetails'" },
  { from: /from ['"]\.\.\/hooks\/useOrderFilters['"]/, to: "from '../features/orders/useOrderFilters'" },
  { from: /from ['"]\.\.\/hooks\/useOrderPagination['"]/, to: "from '../features/orders/useOrderPagination'" },
  { from: /from ['"]\.\.\/hooks\/usePriorityOrders['"]/, to: "from '../features/orders/usePriorityOrders'" },
  { from: /from ['"]\.\.\/hooks\/mutations\/useOrdersMutations['"]/, to: "from '../features/orders/useOrdersMutations'" },
  { from: /from ['"]\.\.\/hooks\/queries\/useOrdersQueries['"]/, to: "from '../features/orders/useOrdersQueries'" },
  { from: /from ['"]\.\.\/constants\/orderConstants['"]/, to: "from '../features/orders/orderConstants'" },
  { from: /from ['"]\.\.\/utils\/orderUtils['"]/, to: "from '../features/orders/orderUtils'" },
  { from: /from ['"]\.\.\/utils\/priorityUtils['"]/, to: "from '../features/orders/priorityUtils'" },
  
  // Items
  { from: /from ['"]\.\.\/components\/CreateItem['"]/, to: "from '../features/items/CreateItem'" },
  { from: /from ['"]\.\/components\/CreateItem['"]/, to: "from './features/items/CreateItem'" },
  { from: /from ['"]\.\.\/components\/BrowseItems['"]/, to: "from '../features/items/BrowseItems'" },
  { from: /from ['"]\.\/components\/BrowseItems['"]/, to: "from './features/items/BrowseItems'" },
  { from: /from ['"]\.\.\/components\/ManageDeletedItems['"]/, to: "from '../features/items/ManageDeletedItems'" },
  { from: /from ['"]\.\/components\/ManageDeletedItems['"]/, to: "from './features/items/ManageDeletedItems'" },
  { from: /from ['"]\.\.\/components\/ItemPanel['"]/, to: "from '../features/items/ItemPanel'" },
  { from: /from ['"]\.\.\/components\/ItemDetailsPage['"]/, to: "from '../features/items/ItemDetailsPage'" },
  { from: /from ['"]\.\.\/components\/items\/DesignManager['"]/, to: "from '../features/items/DesignManager'" },
  { from: /from ['"]\.\.\/hooks\/useItemDetails['"]/, to: "from '../features/items/useItemDetails'" },
  { from: /from ['"]\.\.\/hooks\/useItemForm['"]/, to: "from '../features/items/useItemForm'" },
  { from: /from ['"]\.\.\/hooks\/useItemsData['"]/, to: "from '../features/items/useItemsData'" },
  { from: /from ['"]\.\.\/hooks\/useDeletedItems['"]/, to: "from '../features/items/useDeletedItems'" },
  { from: /from ['"]\.\.\/hooks\/mutations\/useItemsMutations['"]/, to: "from '../features/items/useItemsMutations'" },
  { from: /from ['"]\.\.\/hooks\/queries\/useItemsQueries['"]/, to: "from '../features/items/useItemsQueries'" },
  
  // Analytics
  { from: /from ['"]\.\.\/components\/SalesReport['"]/, to: "from '../features/analytics/SalesReport'" },
  { from: /from ['"]\.\/components\/SalesReport['"]/, to: "from './features/analytics/SalesReport'" },
  { from: /from ['"]\.\.\/hooks\/useSalesAnalytics['"]/, to: "from '../features/analytics/useSalesAnalytics'" },
  { from: /from ['"]\.\.\/hooks\/useSalesAnalyticsOptimized['"]/, to: "from '../features/analytics/useSalesAnalyticsOptimized'" },
  { from: /from ['"]\.\.\/hooks\/queries\/useAnalyticsQueries['"]/, to: "from '../features/analytics/useAnalyticsQueries'" },
  
  // Feedback
  { from: /from ['"]\.\.\/components\/FeedbackPanel['"]/, to: "from '../features/feedback/FeedbackPanel'" },
  { from: /from ['"]\.\/components\/FeedbackPanel['"]/, to: "from './features/feedback/FeedbackPanel'" },
  { from: /from ['"]\.\.\/components\/FeedbackDialog['"]/, to: "from '../features/feedback/FeedbackDialog'" },
  { from: /from ['"]\.\.\/hooks\/mutations\/useFeedbacksMutations['"]/, to: "from '../features/feedback/useFeedbacksMutations'" },
  { from: /from ['"]\.\.\/hooks\/queries\/useFeedbacksQueries['"]/, to: "from '../features/feedback/useFeedbacksQueries'" },
  
  // Layout
  { from: /from ['"]\.\.\/components\/NavigationDrawer['"]/, to: "from '../components/layout/NavigationDrawer'" },
  { from: /from ['"]\.\/components\/NavigationDrawer['"]/, to: "from './components/layout/NavigationDrawer'" },
  { from: /from ['"]\.\.\/components\/TopNavigationBar['"]/, to: "from '../components/layout/TopNavigationBar'" },
  { from: /from ['"]\.\/components\/TopNavigationBar['"]/, to: "from './components/layout/TopNavigationBar'" },
  { from: /from ['"]\.\.\/constants\/navigation\.tsx['"]/, to: "from '../components/layout/navigation'" },
  { from: /from ['"]\.\.\/constants\/navigation['"]/, to: "from '../components/layout/navigation'" },
  
  // UI Components (common -> ui)
  { from: /from ['"]\.\.\/components\/common\//, to: "from '../components/ui/" },
  { from: /from ['"]\.\/components\/common\//, to: "from './components/ui/" },
  { from: /from ['"]\.\.\/components\/CurrencySelector['"]/, to: "from '../components/ui/CurrencySelector'" },
  
  // Lib
  { from: /from ['"]\.\.\/contexts\/NotificationContext['"]/, to: "from '../lib/NotificationContext'" },
  { from: /from ['"]\.\/contexts\/NotificationContext['"]/, to: "from './lib/NotificationContext'" },
  { from: /from ['"]\.\.\/hooks\/useImageProcessing['"]/, to: "from '../lib/hooks/useImageProcessing'" },
  { from: /from ['"]\.\.\/hooks\/useInfiniteScroll['"]/, to: "from '../lib/hooks/useInfiniteScroll'" },
  { from: /from ['"]\.\.\/hooks\/useUrlSync['"]/, to: "from '../lib/hooks/useUrlSync'" },
  { from: /from ['"]\.\.\/constants\/timeConstants['"]/, to: "from '../lib/timeConstants'" },
];

function updateImportsInFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const mapping of pathMappings) {
      if (mapping.from.test(content)) {
        content = content.replace(mapping.from, mapping.to);
        modified = true;
      }
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  const entries = readdirSync(dirPath);
  let filesUpdated = 0;
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && entry !== 'node_modules' && entry !== '.git') {
      filesUpdated += processDirectory(fullPath);
    } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.js') || entry.endsWith('.jsx'))) {
      if (updateImportsInFile(fullPath)) {
        filesUpdated++;
      }
    }
  }
  
  return filesUpdated;
}

// Start processing from frontend/src
const srcPath = join(__dirname, 'src');
console.log(`🔄 Updating import paths in frontend...\nProcessing: ${srcPath}\n`);
const filesUpdated = processDirectory(srcPath);
console.log(`\n✅ Done! Updated ${filesUpdated} files.`);
