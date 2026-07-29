import { useNavigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-2xl bg-muted/50 p-5">
        <FileQuestion className="h-12 w-12 text-muted-foreground/50" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate(ROUTES.DASHBOARD)}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>
    </div>
  );
}
