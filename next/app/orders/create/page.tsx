'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress, Box, Typography } from '@mui/material';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import OrderForm from '@/components/orders/OrderForm';
import { getItems } from '@/lib/api/client';
import type { Item } from '@/types';

function CreateOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState<boolean>(true);
  const duplicateOrderId = searchParams.get('duplicateOrderId');

  useEffect(() => {
    const fetchItems = async (): Promise<void> => {
      try {
        setItemsLoading(true);
        const result = await getItems({ page: 1, limit: 1000 });
        setItems(result.items);
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setItemsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleOrderCreated = useCallback((): void => {
    router.push('/orders/history');
  }, [router]);

  if (itemsLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        gap={2}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading items...
        </Typography>
      </Box>
    );
  }

  return (
    <OrderForm 
      items={items}
      onOrderCreated={handleOrderCreated}
      duplicateOrderId={duplicateOrderId}
    />
  );
}

export default function CreateOrderPage() {
  return (
    <AuthenticatedLayout>
      <Suspense fallback={
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="60vh"
          gap={2}
        >
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      }>
        <CreateOrderContent />
      </Suspense>
    </AuthenticatedLayout>
  );
}
