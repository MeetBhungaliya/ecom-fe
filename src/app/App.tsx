import { RouterProvider } from 'react-router';
import { Providers } from './providers';
import { router } from './router';

/**
 * App — Root component.
 * Wraps the router with all providers.
 */
export default function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
