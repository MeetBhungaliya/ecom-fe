import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/constants/query-keys';
import type {
  Product,
  ProductWithTransactions,
  InventoryAnalytics,
  CreateProductPayload,
  UpdateProductPayload,
  AdjustStockPayload,
  ProductListParams,
  PaginatedResponse,
} from '@/types';
import { toast } from 'sonner';

// ============================================
// INVENTORY HOOKS
// React Query hooks for product & stock management
// ============================================

/**
 * Paginated product list with search, sort, filter.
 */
export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.list(params),
    queryFn: () =>
      api.get<PaginatedResponse<Product> & { message: string }>(
        '/inventory/products',
        params as Record<string, unknown>,
      ),
    select: (res) => ({
      products: res.data,
      meta: res.meta,
    }),
  });
}

/**
 * Single product with recent stock transactions.
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(id),
    queryFn: () => api.get<{ data: ProductWithTransactions }>(`/inventory/products/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

/**
 * Inventory analytics for the dashboard.
 */
export function useInventoryAnalytics() {
  return useQuery({
    queryKey: queryKeys.inventory.alerts(),
    queryFn: () => api.get<{ data: InventoryAnalytics }>('/inventory/products/analytics'),
    select: (res) => res.data,
  });
}

/**
 * Distinct categories for filter dropdown.
 */
export function useProductCategories() {
  return useQuery({
    queryKey: [...queryKeys.inventory.all, 'categories'] as const,
    queryFn: () => api.get<{ data: string[] }>('/inventory/products/categories'),
    select: (res) => res.data,
  });
}

/**
 * Create a new product.
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductPayload) =>
      api.post<{ data: Product; message: string }>('/inventory/products', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alerts() });
      toast.success(res.message || 'Product created successfully');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

/**
 * Update an existing product.
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductPayload }) =>
      api.put<{ data: Product; message: string }>(`/inventory/products/${id}`, data),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alerts() });
      toast.success(res.message || 'Product updated successfully');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to update product');
    },
  });
}

/**
 * Delete a product.
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/inventory/products/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alerts() });
      toast.success(res.message || 'Product deleted successfully');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });
}

/**
 * Adjust stock on a product.
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdjustStockPayload }) =>
      api.post<{ data: { product: Product }; message: string }>(
        `/inventory/products/${id}/adjust-stock`,
        data,
      ),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alerts() });
      toast.success(res.message || 'Stock adjusted successfully');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to adjust stock');
    },
  });
}
