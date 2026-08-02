import { useDeleteProduct } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import type { Product } from '@/types';

// ============================================
// DELETE PRODUCT DIALOG
// Confirmation modal before deleting a product
// ============================================

type DeleteProductDialogProps = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteProductDialog({ product, open, onOpenChange }: DeleteProductDialogProps) {
  const deleteProduct = useDeleteProduct();

  function handleDelete() {
    if (!product) return;
    deleteProduct.mutate(String(product.id), {
      onSuccess: () => onOpenChange(false),
    });
  }

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Delete Product</DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to delete <strong>{product.name}</strong>?
            This action cannot be undone. All stock transaction history for this product will also
            be removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteProduct.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteProduct.isPending}
            className="w-full sm:w-auto"
          >
            {deleteProduct.isPending ? 'Deleting...' : 'Delete Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
