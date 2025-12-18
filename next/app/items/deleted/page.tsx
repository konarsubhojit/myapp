'use client';

import { useCallback } from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import ManageDeletedItems from '@/components/items/ManageDeletedItems';

export default function DeletedItemsPage() {
  const handleItemsChange = useCallback((): void => {
    // Items are managed internally by the component
  }, []);

  return (
    <AuthenticatedLayout>
      <ManageDeletedItems onItemsChange={handleItemsChange} />
    </AuthenticatedLayout>
  );
}
