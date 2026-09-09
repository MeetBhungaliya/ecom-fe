// ============================================
// TABLE FEATURES — TanStack Table v9
// Tree-shakable feature registry.
// Defined OUTSIDE components to keep references stable.
// ============================================

import {
  tableFeatures,
  columnSizingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  createSortedRowModel,
  createFilteredRowModel,
} from '@tanstack/react-table';

export const features = tableFeatures({
  columnSizingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
});

export type TableFeaturesType = typeof features;
