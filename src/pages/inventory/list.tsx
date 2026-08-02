import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useProducts } from '@/hooks/use-inventory';
import { useInventoryTransmit } from '@/hooks/use-inventory-transmit';
import { useIsDesktop } from '@/hooks/use-media-query';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from './components/product-card';
import { DeleteProductDialog } from './components/delete-product-dialog';
import {
  Plus,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Product, ProductListParams } from '@/types';

export default function InventoryListPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();


  // Subscribe to real-time inventory updates via SSE
  useInventoryTransmit();

  // --- Query Params ---
  const [params, setParams] = useState<ProductListParams>({
    page: 1,
    pageSize: 20,
  });

  const { data, isLoading } = useProducts(params);

  // --- Dialogs ---
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  // --- Handlers ---
  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const products = data?.products ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        {!isDesktop && (
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Inventory</h1>
          </div>
        )}
        {isDesktop && <div />}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate(ROUTES.INVENTORY_ADD)} className="h-8 text-xs px-3">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      {meta && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          <span>
            {meta.total} {meta.total === 1 ? 'product' : 'products'}
          </span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Product List */}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center">
                <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-xs font-semibold text-foreground">No products found</p>
                <Button
                  size="sm"
                  className="mt-3 h-8 text-xs px-3"
                  onClick={() => navigate(ROUTES.INVENTORY_ADD)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Product
                </Button>
              </div>
            ) : (
              products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onDelete={setDeleteProduct}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-muted-foreground font-medium">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  disabled={meta.page <= 1}
                  onClick={() => handlePageChange(meta.page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (meta.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (meta.page <= 3) {
                    pageNum = i + 1;
                  } else if (meta.page >= meta.totalPages - 2) {
                    pageNum = meta.totalPages - 4 + i;
                  } else {
                    pageNum = meta.page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={meta.page === pageNum ? 'default' : 'outline'}
                      size="icon"
                      className="h-7 w-7 text-[10px] rounded-lg font-semibold"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => handlePageChange(meta.page + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <DeleteProductDialog
        product={deleteProduct}
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
      />
    </div>
  );
}
