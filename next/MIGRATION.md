# Next.js Migration Guide

This document provides guidance for migrating the remaining components and features from the React/Vite version to Next.js.

## Current Status

### ✅ Completed

#### Foundation
- Next.js 15 with App Router
- TypeScript configuration
- Material-UI v6 integration
- Custom theme and styling
- ESLint configuration
- Code review fixes applied

#### Authentication
- NextAuth.js with Google OAuth
- Session management
- Login page
- Protected routes (basic)

#### Type System
- All entity types migrated
- Branded ID types
- API types
- Form validation types

#### API Client
- Complete API client library
- Items API functions
- Orders API functions
- Feedbacks API functions
- Analytics API functions

#### Utilities
- Order utilities
- Priority utilities
- Constants migrated

#### Contexts ✅ NEW
- **CurrencyContext** - Multi-currency support (INR, USD, EUR, GBP, JPY)
- **NotificationContext** - Toast notifications with Material-UI

#### Navigation Components ✅ NEW
- **NavigationDrawer** - Collapsible side navigation (mobile/desktop)
- **TopNavigationBar** - Horizontal dropdown navigation for desktop

### 🔧 In Progress / Todo

#### Core Components
The following components need to be migrated from `frontend/src/components/`:

1. **Common Components**
   - [ ] Common UI components (buttons, dialogs, etc.)
   
2. **Order Management** - Priority
   - [ ] OrderForm - Create/edit orders with item selection
   - [ ] OrderHistory - Order list with cursor pagination
   - [ ] OrderDetails - Order details view/edit
   - [ ] OrderDetailsPage - Full order management page
   
3. **Item Management** - Priority
   - [ ] CreateItem - Add items with image upload
   - [ ] BrowseItems - Item catalog with search/filter
   - [ ] ItemPanel - Item card component
   - [ ] ItemDetailsPage - Full item details view
   - [ ] ManageDeletedItems - Restore soft-deleted items
   
4. **Analytics & Feedback**
   - [ ] SalesReport - Sales analytics dashboard
   - [ ] FeedbackPanel - Customer feedback management
   - [ ] FeedbackDialog - Feedback submission form
   - [ ] PriorityNotificationPanel - Urgent orders indicator
   
5. **Other**
   - [ ] CurrencySelector - Currency selection dropdown

## Migration Steps for Components

### Step 1: Copy Component File

```bash
# Example: Migrating OrderForm
cp frontend/src/components/OrderForm.tsx next/components/orders/OrderForm.tsx
```

### Step 2: Add 'use client' Directive

For components that use hooks, state, or browser APIs:

```tsx
'use client';

import { useState } from 'react';
// ... rest of imports
```

### Step 3: Update Import Paths

Change relative imports to use the `@/` alias:

```tsx
// Before
import { getOrders } from '../services/api';
import type { Order } from '../types';

// After
import { getOrders } from '@/lib/api/client';
import type { Order } from '@/types';
```

### Step 4: Replace Router Imports

```tsx
// Before (React Router)
import { useNavigate, useLocation } from 'react-router-dom';

// After (Next.js)
import { useRouter, usePathname } from 'next/navigation';
```

### Step 5: Update Image Components

```tsx
// Before
<img src={item.imageUrl} alt={item.name} />

// After
import Image from 'next/image';
<Image src={item.imageUrl} alt={item.name} width={200} height={200} />
```

### Step 6: Update Navigation

```tsx
// Before (React Router)
const navigate = useNavigate();
navigate('/dashboard');

// After (Next.js)
const router = useRouter();
router.push('/dashboard');
```

## Context Migration

### CurrencyContext Example

1. Copy the context file:
```bash
cp frontend/src/contexts/CurrencyContext.tsx next/contexts/CurrencyContext.tsx
```

2. Add 'use client' directive
3. Update import paths
4. Wrap in the layout or a client component

## Hooks Migration

Custom hooks can be migrated with minimal changes:

1. Copy to `next/hooks/`
2. Add 'use client' if using browser APIs
3. Update import paths

## Pages Creation

### Creating a New Page

```bash
# Create a new page directory
mkdir -p next/app/orders/create

# Create page.tsx
touch next/app/orders/create/page.tsx
```

Page structure:
```tsx
'use client';

import { SomeComponent } from '@/components/orders/SomeComponent';

export default function CreateOrderPage() {
  return (
    <div>
      <SomeComponent />
    </div>
  );
}
```

## Common Migration Patterns

### Pattern 1: State Management

No changes needed - React state works the same:
```tsx
const [state, setState] = useState(initialValue);
```

### Pattern 2: Effect Hooks

No changes needed:
```tsx
useEffect(() => {
  // effect logic
}, [dependencies]);
```

### Pattern 3: API Calls

Update the import path:
```tsx
// Before
import { getItems } from '../services/api';

// After
import { getItems } from '@/lib/api/client';

// Usage remains the same
const items = await getItems({ page: 1, limit: 10 });
```

### Pattern 4: Authentication

```tsx
// Before (React version)
import { useAuth } from '@/contexts/AuthContext';
const { user, logout } = useAuth();

// After (Next.js)
import { useSession, signOut } from 'next-auth/react';
const { data: session } = useSession();
const user = session?.user;
const logout = () => signOut();
```

## Testing Strategy

1. **Unit Tests**: Continue using existing test patterns
2. **Integration Tests**: Update imports and mocks
3. **E2E Tests**: No changes needed if using Playwright

## Deployment Checklist

- [ ] Set environment variables in Vercel/hosting platform
- [ ] Configure Google OAuth redirect URIs
- [ ] Set NEXTAUTH_URL and NEXTAUTH_SECRET
- [ ] Test production build: `npm run build`
- [ ] Verify backend API connectivity
- [ ] Test authentication flow
- [ ] Verify image optimization works

## Performance Optimization

### Server Components

Consider making these pages Server Components:
- Analytics/Reports pages (pre-fetch data)
- Item listing pages
- Order history pages

### Client Components

These should remain Client Components:
- Forms (OrderForm, CreateItem)
- Interactive components (Navigation, Dialogs)
- Components using browser APIs

## Differences from React Version

### Routing
- **React**: React Router with `<Route>` components
- **Next.js**: File-based routing in `app/` directory

### Authentication
- **React**: `@react-oauth/google` with custom AuthContext
- **Next.js**: NextAuth.js with built-in session management

### Data Fetching
- **React**: Client-side only with React Query
- **Next.js**: Server Components + Client Components + React Query

### Image Optimization
- **React**: Basic `<img>` tags or manual optimization
- **Next.js**: Automatic optimization with `<Image>` component

### Build Output
- **React**: Static files from Vite
- **Next.js**: Optimized production build with SSR/SSG

## Troubleshooting

### "use client" directive required
**Error**: Component uses hooks but doesn't have 'use client'
**Solution**: Add `'use client';` at the top of the file

### Module not found
**Error**: Cannot find module '@/...'
**Solution**: Check tsconfig.json paths and import aliases

### NextAuth session undefined
**Error**: Session is always undefined
**Solution**: Ensure SessionProvider wraps the app in layout.tsx

### Build fails with type errors
**Error**: TypeScript compilation errors
**Solution**: Check import paths and type definitions

## Next Steps

1. Migrate CurrencyContext and NotificationContext
2. Migrate navigation components
3. Migrate order management components
4. Migrate item management components
5. Create proper page routes
6. Add loading states and Suspense boundaries
7. Implement middleware for route protection
8. Add comprehensive tests
9. Optimize bundle size
10. Deploy to production

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Material-UI with Next.js](https://mui.com/material-ui/integrations/nextjs/)
- [React Query in Next.js](https://tanstack.com/query/latest/docs/framework/react/guides/nextjs)
