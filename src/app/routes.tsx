import { createBrowserRouter, Navigate } from 'react-router-dom';

import HomePlaceholder from '@/HomePlaceholder';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePlaceholder />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
