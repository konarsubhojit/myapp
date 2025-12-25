# Frontend Architecture Documentation

## Overview

The frontend has been reorganized following React/Vite best practices with a feature-based architecture. This structure improves code maintainability, scalability, and developer experience.

## Folder Structure

```
frontend/src/
├── features/              # Feature-based modules
│   ├── auth/             # Authentication feature
│   │   ├── Login.tsx
│   │   ├── ForbiddenPage.tsx
│   │   ├── AuthContext.tsx
│   │   ├── authConfig.ts
│   │   └── index.ts
│   ├── orders/           # Order management feature
│   │   ├── OrderForm.tsx
│   │   ├── OrderHistory.tsx
│   │   ├── OrderDetails.tsx
│   │   ├── OrderDetailsPage.tsx
│   │   ├── PriorityNotificationPanel.tsx
│   │   ├── CurrencyContext.tsx
│   │   ├── useOrderDetails.ts
│   │   ├── useOrderFilters.ts
│   │   ├── useOrderPagination.ts
│   │   ├── usePriorityOrders.ts
│   │   ├── useOrdersMutations.ts
│   │   ├── useOrdersQueries.ts
│   │   ├── orderConstants.ts
│   │   ├── orderUtils.ts
│   │   ├── priorityUtils.ts
│   │   └── index.ts
│   ├── items/            # Item management feature
│   │   ├── CreateItem.tsx
│   │   ├── BrowseItems.tsx
│   │   ├── ManageDeletedItems.tsx
│   │   ├── ItemPanel.tsx
│   │   ├── ItemDetailsPage.tsx
│   │   ├── DesignManager.tsx
│   │   ├── useItemDetails.ts
│   │   ├── useItemForm.ts
│   │   ├── useItemsData.ts
│   │   ├── useDeletedItems.ts
│   │   ├── useItemsMutations.ts
│   │   ├── useItemsQueries.ts
│   │   └── index.ts
│   ├── analytics/        # Analytics and reporting
│   │   ├── SalesReport.tsx
│   │   ├── useSalesAnalytics.ts
│   │   ├── useSalesAnalyticsOptimized.ts
│   │   ├── useAnalyticsQueries.ts
│   │   └── index.ts
│   └── feedback/         # Feedback management
│       ├── FeedbackPanel.tsx
│       ├── FeedbackDialog.tsx
│       ├── useFeedbacksMutations.ts
│       ├── useFeedbacksQueries.ts
│       └── index.ts
├── components/           # Shared components
│   ├── layout/          # Layout components
│   │   ├── NavigationDrawer.tsx
│   │   ├── TopNavigationBar.tsx
│   │   └── navigation.tsx
│   └── ui/              # Reusable UI components
│       ├── CurrencySelector.tsx
│       ├── CustomerInfoSection.tsx
│       ├── DesignPicker.tsx
│       ├── ImageUploadField.tsx
│       ├── ItemCard.tsx
│       ├── ItemCardSkeleton.tsx
│       ├── MultipleDesignUpload.tsx
│       ├── OrderDialogContent.tsx
│       ├── OrderDialogTitle.tsx
│       ├── OrderFiltersSection.tsx
│       ├── OrderHistoryTableHeader.tsx
│       ├── OrderHistoryTableRow.tsx
│       ├── OrderInfoSection.tsx
│       ├── OrderItemsTable.tsx
│       ├── OrderRowSkeleton.tsx
│       ├── PaginationControls.tsx
│       ├── PaymentInfoSection.tsx
│       ├── ProgressBarWithLabel.tsx
│       └── StatCard.tsx
├── lib/                 # Shared libraries and utilities
│   ├── hooks/          # Shared custom hooks
│   │   ├── useImageProcessing.ts
│   │   ├── useInfiniteScroll.ts
│   │   ├── useUrlSync.ts
│   │   └── index.ts   # Re-exports from features
│   ├── NotificationContext.tsx
│   └── timeConstants.ts
├── services/           # API client and external services
│   └── api.ts
├── types/              # TypeScript type definitions
│   ├── index.ts
│   ├── entities.ts
│   └── brandedIds.ts
├── config/             # Configuration files
│   ├── theme.ts
│   └── version.ts
├── test/               # Test files
│   ├── components/
│   ├── hooks/
│   └── types/
├── assets/             # Static assets
├── App.tsx             # Main App component
├── main.tsx            # Application entry point
├── ErrorBoundary.tsx   # Error boundary wrapper
├── queryClient.ts      # TanStack Query client
├── queryKeys.ts        # Query key constants
└── rollbar.ts          # Error tracking

```

## Design Principles

### 1. Feature-Based Organization

Features are organized by domain (auth, orders, items, analytics, feedback). Each feature contains:
- **Components**: UI components specific to the feature
- **Hooks**: Business logic and state management hooks
- **Utils**: Helper functions and utilities
- **Constants**: Feature-specific constants
- **Types**: Feature-specific TypeScript types (when not shared)
- **index.ts**: Public API exports from the feature

**Benefits:**
- Clear separation of concerns
- Easy to locate related code
- Scalable as features grow
- Facilitates code splitting and lazy loading

### 2. Shared Components

UI components used across features are in `components/`:
- **layout/**: App-wide layout components (navigation, header)
- **ui/**: Reusable UI components (buttons, cards, forms, etc.)

### 3. Lib for Shared Code

The `lib/` folder contains:
- **hooks/**: Shared custom hooks that aren't feature-specific
- **contexts**: Shared React contexts (Notification)
- **constants**: Application-wide constants

The `lib/hooks/index.ts` re-exports hooks from features for convenient imports.

### 4. Clear Import Paths

- Features import from other features: `from '../orders/CurrencyContext'`
- Features import shared components: `from '../../components/ui/...'`
- Features import types: `from '../../types'`
- Features import services: `from '../../services/api'`
- Features import lib: `from '../../lib/...'`

## Adding a New Feature

1. Create a new feature folder: `mkdir -p features/newfeature`
2. Add your components, hooks, and utilities
3. Create an `index.ts` to export the public API
4. Update `lib/hooks/index.ts` if you need to re-export hooks
5. Import from the feature in other parts of the app

Example:
```typescript
// features/newfeature/index.ts
export { default as NewFeatureComponent } from './NewFeatureComponent';
export { useNewFeature } from './useNewFeature';

// Use in App.tsx
import { NewFeatureComponent } from './features/newfeature';
```

## Migration from Old Structure

The reorganization involved:
1. Moving files from flat structure to feature-based folders
2. Moving shared hooks to `lib/hooks/`
3. Moving UI components to `components/ui/`
4. Updating all import paths (automated via script)
5. Creating index files for each feature

All imports were automatically updated using the `update-imports.js` script.

## Benefits of New Structure

### Improved Maintainability
- Related code is grouped together
- Clear boundaries between features
- Easier to understand the codebase

### Better Scalability
- New features can be added without cluttering existing code
- Features can be developed and tested independently
- Easier to implement code splitting

### Enhanced Developer Experience
- Faster navigation between related files
- Clear separation of concerns
- Consistent patterns across features

### Easier Code Reuse
- Shared components are clearly identified
- Hooks can be easily extracted and reused
- Clear public APIs via index files

## Testing Structure

Tests follow the same feature-based structure:
```
test/
├── components/      # Tests for shared components
├── hooks/           # Tests for shared hooks
└── types/           # Tests for type utilities
```

Feature-specific tests should be co-located with the feature (future enhancement).

## Best Practices

### Do's
- ✅ Keep features independent
- ✅ Use index files to define public APIs
- ✅ Import from feature index files when possible
- ✅ Place shared code in `components/` or `lib/`
- ✅ Follow consistent naming conventions
- ✅ Document complex features

### Don'ts
- ❌ Don't create circular dependencies between features
- ❌ Don't put feature-specific code in `lib/` or `components/`
- ❌ Don't bypass index files for internal feature imports
- ❌ Don't mix multiple concerns in one feature
- ❌ Don't create deep nesting (max 2-3 levels)

## Future Enhancements

1. **Feature-specific tests**: Co-locate tests with features
2. **Feature-specific types**: Move types into features when not shared
3. **Lazy loading**: Implement code splitting by feature
4. **Micro-frontends**: Features can be extracted into separate apps
5. **Storybook**: Add component documentation

## References

- [React Official Docs: File Structure](https://react.dev/learn/thinking-in-react#step-1-break-the-ui-into-a-component-hierarchy)
- [Vite Guide: Building for Production](https://vitejs.dev/guide/build.html)
- [Feature-Sliced Design](https://feature-sliced.design/)
