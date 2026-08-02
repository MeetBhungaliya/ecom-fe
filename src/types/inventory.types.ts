import type { BaseEntity } from './common.types';

// ============================================
// INVENTORY TYPES — Product & Stock Management
// ============================================

/**
 * Stock status based on quantity vs threshold.
 */
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

/**
 * Stock transaction type.
 */
export type StockTransactionType = 'initial' | 'manual_add' | 'manual_deduct' | 'adjustment';

/**
 * Product entity from the API.
 */
export type Product = BaseEntity & {
  userId: number;
  name: string;
  price: number;
  currentStock: number;
  minimumStock: number;
  note: string | null;
  isActive: boolean;
  inventoryValue: number;
  stockStatus: StockStatus;
  imageUrl?: string | null;
};

/**
 * Stock transaction entity (audit log).
 */
export type StockTransaction = {
  id: number;
  productId: number;
  userId: number;
  changeAmount: number;
  stockAfter: number;
  type: StockTransactionType;
  note: string | null;
  createdAt: string;
};

/**
 * Product detail with recent transactions.
 */
export type ProductWithTransactions = Product & {
  recentTransactions: StockTransaction[];
};

/**
 * Analytics data for the inventory dashboard.
 */
export type InventoryAnalytics = {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoryBreakdown: Array<{
    name: string;
    count: number;
    value: number;
  }>;
  stockMovements: Array<{
    date: string;
    additions: number;
    deductions: number;
  }>;
  lowStockItems: Product[];
  outOfStockItems: Product[];
};

/**
 * Payload to create a product.
 */
export type CreateProductPayload = FormData | {
  name: string;
  price: number;
  currentStock?: number;
  minimumStock?: number;
  note?: string;
  image?: File;
};

/**
 * Payload to update a product.
 */
export type UpdateProductPayload = Partial<{
  name: string;
  price: number;
  minimumStock: number;
  note: string | null;
  isActive: boolean;
}>;

/**
 * Payload to adjust stock.
 */
export type AdjustStockPayload = {
  changeAmount: number;
  type: StockTransactionType;
  note?: string;
};

/**
 * List query params for products.
 */
export type ProductListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'name' | 'price' | 'currentStock' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  lowStockOnly?: boolean;
  isActive?: boolean;
};
