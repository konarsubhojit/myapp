'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress, Box, Typography } from '@mui/material';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import CreateItem from '@/components/items/CreateItem';
import { getItems } from '@/lib/api/client';
import type { Item, ItemId } from '@/types';

function CreateItemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copyFromId = searchParams.get('copyFrom');
  const [copiedItem, setCopiedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadCopiedItem = async () => {
      if (!copyFromId) return;
      
      try {
        setLoading(true);
        const result = await getItems({ page: 1, limit: 1000 });
        const item = result.items.find(i => i.id === parseInt(copyFromId, 10) as ItemId);
        if (item) {
          setCopiedItem(item);
        }
      } catch (error) {
        console.error('Error loading item to copy:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCopiedItem();
  }, [copyFromId]);

  const handleItemCreated = useCallback((): void => {
    router.push('/items/browse');
  }, [router]);

  const handleCancelCopy = useCallback((): void => {
    setCopiedItem(null);
    router.push('/items/create');
  }, [router]);

  if (loading) {
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
          Loading item...
        </Typography>
      </Box>
    );
  }

  return (
    <CreateItem 
      onItemCreated={handleItemCreated}
      copiedItem={copiedItem}
      onCancelCopy={handleCancelCopy}
    />
  );
}

export default function CreateItemPage() {
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
        <CreateItemContent />
      </Suspense>
    </AuthenticatedLayout>
  );
}
