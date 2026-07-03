/**
 * useFilters — per-clip filter management hook.
 * Adapted from Omniclip's filtersManager.
 *
 * Applies, removes, and queries CSS/FFmpeg filters on image/video clips.
 * Preview thumbnails are generated externally (via the filmstrip pipeline);
 * this hook only manages the applied state.
 */

import { useCallback, useMemo } from 'react';
import { findFilterPreset, getFilterCss, getFilterFfmpeg } from '../constants/filters.js';
import type { AppliedFilter } from '../types/filter.js';
import type { AnyClip } from '../types/clip.js';

interface UseFiltersOptions {
  /** Applied filters from the project store */
  filters: AppliedFilter[];
  onApplyFilter: (filter: AppliedFilter) => void;
  onRemoveFilter: (filterId: string) => void;
  onUpdateFilter: (filterId: string, propertyValues: Record<string, unknown>) => void;
}

interface UseFiltersResult {
  /** Get the filter applied to a clip (null = original) */
  getClipFilter: (clip: AnyClip | null) => AppliedFilter | null;
  /** True if the given preset is applied to the clip */
  isFilterSelected: (clip: AnyClip | null, presetId: string) => boolean;
  /** Get CSS filter string for a clip (for live preview) */
  getCssFilter: (clip: AnyClip | null) => string;
  /** Get FFmpeg filter string for a clip (for export) */
  getFfmpegFilter: (clip: AnyClip | null) => string;
  /** Apply or toggle a filter preset on a clip */
  applyFilter: (clip: AnyClip, presetId: string) => void;
  /** Remove any filter from a clip */
  removeFilter: (clip: AnyClip) => void;
  /** Update per-property values of an applied filter */
  updateFilterProperties: (
    clip: AnyClip,
    propertyValues: Record<string, unknown>,
  ) => void;
}

export function useFilters(options: UseFiltersOptions): UseFiltersResult {
  const { filters, onApplyFilter, onRemoveFilter, onUpdateFilter } = options;

  const getClipFilter = useCallback(
    (clip: AnyClip | null): AppliedFilter | null => {
      if (!clip) return null;
      return filters.find((f) => f.targetClipId === clip.id) ?? null;
    },
    [filters],
  );

  const isFilterSelected = useCallback(
    (clip: AnyClip | null, presetId: string): boolean => {
      if (!clip) return false;
      return filters.some(
        (f) => f.targetClipId === clip.id && f.presetId === presetId,
      );
    },
    [filters],
  );

  const getCssFilter = useCallback(
    (clip: AnyClip | null): string => {
      const f = getClipFilter(clip);
      if (!f) return 'none';
      return getFilterCss(f.presetId);
    },
    [getClipFilter],
  );

  const getFfmpegFilter = useCallback(
    (clip: AnyClip | null): string => {
      const f = getClipFilter(clip);
      if (!f) return '';
      return getFilterFfmpeg(f.presetId);
    },
    [getClipFilter],
  );

  const applyFilter = useCallback(
    (clip: AnyClip, presetId: string) => {
      const existing = filters.find((f) => f.targetClipId === clip.id);
      const preset = findFilterPreset(presetId);
      if (!preset) return;

      if (existing?.presetId === presetId) {
        // Toggle off — clicking same filter removes it
        onRemoveFilter(existing.id);
        return;
      }

      const filter: AppliedFilter = {
        id: existing?.id ?? `filter-${Date.now()}`,
        targetClipId: clip.id,
        presetId,
        propertyValues: {},
      };
      onApplyFilter(filter);
    },
    [filters, onApplyFilter, onRemoveFilter],
  );

  const removeFilter = useCallback(
    (clip: AnyClip) => {
      const existing = filters.find((f) => f.targetClipId === clip.id);
      if (existing) onRemoveFilter(existing.id);
    },
    [filters, onRemoveFilter],
  );

  const updateFilterProperties = useCallback(
    (clip: AnyClip, propertyValues: Record<string, unknown>) => {
      const existing = filters.find((f) => f.targetClipId === clip.id);
      if (existing) onUpdateFilter(existing.id, propertyValues);
    },
    [filters, onUpdateFilter],
  );

  return {
    getClipFilter,
    isFilterSelected,
    getCssFilter,
    getFfmpegFilter,
    applyFilter,
    removeFilter,
    updateFilterProperties,
  };
}
