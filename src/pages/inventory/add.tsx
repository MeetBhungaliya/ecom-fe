import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useCreateProduct } from '@/hooks/use-inventory';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { useIsDesktop } from '@/hooks/use-media-query';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(255),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  currentStock: z.coerce.number().int().min(0, 'Stock must be non-negative').optional(),
  minimumStock: z.coerce.number().int().min(0, 'Must be non-negative').optional(),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddProductPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const createProduct = useCreateProduct();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      price: 0,
      currentStock: 0,
      minimumStock: 0,
      note: '',
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  function onSubmit(values: FormValues) {
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('price', String(values.price));
    if (values.currentStock !== undefined) {
      formData.append('currentStock', String(values.currentStock));
    }
    if (values.minimumStock !== undefined) {
      formData.append('minimumStock', String(values.minimumStock));
    }
    if (values.note) {
      formData.append('note', values.note);
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }

    createProduct.mutate(formData as any, {
      onSuccess: () => {
        navigate(ROUTES.INVENTORY);
      },
    });
  }

  const isPending = createProduct.isPending || isSubmitting;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted"
          onClick={() => navigate(ROUTES.INVENTORY)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {!isDesktop && (
          <h1 className="text-xl font-bold tracking-tight text-foreground">New Product</h1>
        )}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="sm:col-span-2">
            <Input
              id="name"
              label="Product Name"
              placeholder="e.g. Cotton T-Shirt Blue"
              autoFocus
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          {/* Price */}
          <div>
            <Input
              id="price"
              label="Price (₹)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.price?.message}
              {...register('price')}
            />
          </div>

          {/* Initial Stock */}
          <div>
            <Input
              id="currentStock"
              label="Initial Stock"
              type="number"
              min="0"
              placeholder="0"
              error={errors.currentStock?.message}
              {...register('currentStock')}
            />
          </div>

          {/* Minimum Stock */}
          <div>
            <Input
              id="minimumStock"
              label="Min Stock Threshold"
              type="number"
              min="0"
              placeholder="0"
              error={errors.minimumStock?.message}
              {...register('minimumStock')}
            />
          </div>

          {/* Optional Image */}
          <div>
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80 block mb-1.5">
              Product Image
            </span>
            {imagePreview ? (
              <div className="relative h-10 w-24 rounded-lg overflow-hidden border border-border group">
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-input bg-background/50 hover:bg-accent/30 cursor-pointer transition-colors text-xs text-muted-foreground">
                <Upload className="h-4 w-4" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Notes */}
          <div className="sm:col-span-2 space-y-1.5">
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80 block">
              Notes
            </span>
            <Textarea
              id="note"
              placeholder="Optional notes about this product..."
              rows={2}
              className="resize-none min-h-[60px]"
              {...register('note')}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.INVENTORY)}
            disabled={isPending}
            className="h-9 px-4 text-xs font-medium"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="h-9 px-4 text-xs font-medium">
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Product'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
