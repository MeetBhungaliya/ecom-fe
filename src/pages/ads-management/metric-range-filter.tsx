import React, { useMemo, useState, useRef } from 'react';
import type { AdsCampaign } from '@/types';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/cn';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingBag,
} from 'lucide-react';

export type MetricKey =
  'budget' | 'budget_utilized' | 'avg_roi' | 'orders' | 'revenue' | 'views' | 'clicks';

export interface MetricRange {
  min?: number;
  max?: number;
}

export type ActiveMetricFilters = Partial<Record<MetricKey, MetricRange>>;

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unitPrefix?: string;
  unitSuffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  step: number;
  decimals: number;
  getValue: (campaign: AdsCampaign) => number;
  formatValue: (val: number) => string;
  presets: { label: string; min?: number; max?: number }[];
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    key: 'budget',
    label: 'Budget',
    shortLabel: 'Budget',
    unitPrefix: '₹',
    icon: DollarSign,
    step: 50,
    decimals: 0,
    getValue: (c) => Number(c.total_budget ?? c.budget ?? 0),
    formatValue: (val) => `₹${Math.round(val).toLocaleString('en-IN')}`,
    presets: [
      { label: '< ₹500', max: 500 },
      { label: '₹500 - ₹2k', min: 500, max: 2000 },
      { label: '₹2k - ₹5k', min: 2000, max: 5000 },
      { label: '₹5k+', min: 5000 },
    ],
  },
  {
    key: 'budget_utilized',
    label: 'Spent (Utilized)',
    shortLabel: 'Spent',
    unitPrefix: '₹',
    icon: DollarSign,
    step: 50,
    decimals: 0,
    getValue: (c) =>
      Number(c.perf_details?.budget_utilised ?? c.budget_spent ?? (c as any).budget_utilized ?? 0),
    formatValue: (val) => `₹${Math.round(val).toLocaleString('en-IN')}`,
    presets: [
      { label: '₹0', max: 0 },
      { label: '₹1 - ₹1k', min: 1, max: 1000 },
      { label: '₹1k - ₹5k', min: 1000, max: 5000 },
      { label: '₹5k+', min: 5000 },
    ],
  },
  {
    key: 'avg_roi',
    label: 'Avg ROI',
    shortLabel: 'ROI',
    unitSuffix: 'x',
    icon: TrendingUp,
    step: 0.1,
    decimals: 2,
    getValue: (c) => Number(c.perf_details?.roi ?? c.roas ?? (c as any).avg_roi ?? 0),
    formatValue: (val) => `${val.toFixed(2)}x`,
    presets: [
      { label: '< 1.5x (Low)', max: 1.5 },
      { label: '1.5x - 3.0x', min: 1.5, max: 3.0 },
      { label: '3.0x - 5.0x', min: 3.0, max: 5.0 },
      { label: '5.0x+ (Top)', min: 5.0 },
    ],
  },
  {
    key: 'orders',
    label: 'Orders',
    shortLabel: 'Orders',
    icon: ShoppingBag,
    step: 1,
    decimals: 0,
    getValue: (c) =>
      Number(c.perf_details?.order_count ?? c.orders ?? (c as any).total_orders ?? 0),
    formatValue: (val) => `${Math.round(val).toLocaleString('en-IN')}`,
    presets: [
      { label: '0 Orders', max: 0 },
      { label: '1 - 10', min: 1, max: 10 },
      { label: '11 - 50', min: 11, max: 50 },
      { label: '50+', min: 50 },
    ],
  },
  {
    key: 'revenue',
    label: 'Revenue',
    shortLabel: 'Revenue',
    unitPrefix: '₹',
    icon: Sparkles,
    step: 100,
    decimals: 0,
    getValue: (c) => Number(c.perf_details?.revenue ?? c.revenue ?? (c as any).total_revenue ?? 0),
    formatValue: (val) => `₹${Math.round(val).toLocaleString('en-IN')}`,
    presets: [
      { label: '₹0 Rev', max: 0 },
      { label: '₹1 - ₹5k', min: 1, max: 5000 },
      { label: '₹5k - ₹25k', min: 5000, max: 25000 },
      { label: '₹25k+', min: 25000 },
    ],
  },
  {
    key: 'views',
    label: 'Views',
    shortLabel: 'Views',
    icon: Eye,
    step: 100,
    decimals: 0,
    getValue: (c) => Number(c.perf_details?.total_views ?? c.views ?? c.impressions ?? 0),
    formatValue: (val) => `${Math.round(val).toLocaleString('en-IN')}`,
    presets: [
      { label: '< 1k', max: 1000 },
      { label: '1k - 10k', min: 1000, max: 10000 },
      { label: '10k - 50k', min: 10000, max: 50000 },
      { label: '50k+', min: 50000 },
    ],
  },
  {
    key: 'clicks',
    label: 'Clicks',
    shortLabel: 'Clicks',
    icon: MousePointer,
    step: 10,
    decimals: 0,
    getValue: (c) => Number(c.perf_details?.total_clicks ?? c.clicks ?? 0),
    formatValue: (val) => `${Math.round(val).toLocaleString('en-IN')}`,
    presets: [
      { label: '< 100', max: 100 },
      { label: '100 - 500', min: 100, max: 500 },
      { label: '500 - 2k', min: 500, max: 2000 },
      { label: '2k+', min: 2000 },
    ],
  },
];

interface MetricRangeFilterProps {
  campaigns: AdsCampaign[];
  filters: ActiveMetricFilters;
  onChange: (filters: ActiveMetricFilters) => void;
  filteredCount: number;
  totalCount: number;
}

export function MetricRangeFilter({
  campaigns,
  filters,
  onChange,
  filteredCount,
  totalCount,
}: MetricRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMetricKey, setSelectedMetricKey] = useState<MetricKey>('budget');

  const selectedDef = useMemo(
    () => METRIC_DEFINITIONS.find((d) => d.key === selectedMetricKey) || METRIC_DEFINITIONS[0],
    [selectedMetricKey],
  );

  // Calculate actual min, max, avg for the selected metric across currently available campaigns
  const metricStats = useMemo(() => {
    if (campaigns.length === 0) {
      return { min: 0, max: 100, avg: 0, count: 0 };
    }
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    campaigns.forEach((c) => {
      const val = selectedDef.getValue(c);
      if (val < min) min = val;
      if (val > max) max = val;
      sum += val;
    });

    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 100;
    if (min === max) {
      max = min + (selectedDef.step || 10);
    }

    return {
      min: Math.floor(min),
      max: Math.ceil(max),
      avg: sum / campaigns.length,
      count: campaigns.length,
    };
  }, [campaigns, selectedDef]);

  // Current active filter for selected metric
  const currentFilter = filters[selectedMetricKey];
  const activeFilterCount = Object.keys(filters).length;

  // Local draft values for the inputs
  const [minInput, setMinInput] = useState<string>(
    currentFilter?.min != null ? String(currentFilter.min) : '',
  );
  const [maxInput, setMaxInput] = useState<string>(
    currentFilter?.max != null ? String(currentFilter.max) : '',
  );

  // Sync draft inputs when selected metric or outer filters change
  React.useEffect(() => {
    const f = filters[selectedMetricKey];
    setMinInput(f?.min != null ? String(f.min) : '');
    setMaxInput(f?.max != null ? String(f.max) : '');
  }, [selectedMetricKey, filters]);

  // Handle applying min / max
  const applyRange = (newMin?: number, newMax?: number) => {
    const nextFilters = { ...filters };
    if (newMin == null && newMax == null) {
      delete nextFilters[selectedMetricKey];
    } else {
      nextFilters[selectedMetricKey] = {
        min: newMin,
        max: newMax,
      };
    }
    onChange(nextFilters);
  };

  // Debounce ref for typed inputs to avoid thrashing datatable on every keystroke
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced applyRange for typed numeric inputs
  const debounceApply = (newMin?: number, newMax?: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      applyRange(newMin, newMax);
    }, 200);
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMinInput(val);
    const parsed = val === '' ? undefined : Number(val);
    const parsedMax = maxInput === '' ? undefined : Number(maxInput);
    if (val === '' || (!isNaN(parsed!) && parsed! >= 0)) {
      debounceApply(parsed, parsedMax);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMaxInput(val);
    const parsed = val === '' ? undefined : Number(val);
    const parsedMin = minInput === '' ? undefined : Number(minInput);
    if (val === '' || (!isNaN(parsed!) && parsed! >= 0)) {
      debounceApply(parsedMin, parsed);
    }
  };

  const handlePresetClick = (preset: { min?: number; max?: number }) => {
    setMinInput(preset.min != null ? String(preset.min) : '');
    setMaxInput(preset.max != null ? String(preset.max) : '');
    applyRange(preset.min, preset.max);
  };

  // Slider bounds and values
  const sliderCurrentValues = useMemo(() => {
    const minVal =
      currentFilter?.min != null ? Math.max(metricStats.min, currentFilter.min) : metricStats.min;
    const maxVal =
      currentFilter?.max != null ? Math.min(metricStats.max, currentFilter.max) : metricStats.max;
    return [minVal, maxVal];
  }, [currentFilter, metricStats]);

  // Local draft slider values so dragging is 60fps smooth and doesn't flicker the table
  const [sliderDraft, setSliderDraft] = useState<number[]>(sliderCurrentValues);

  React.useEffect(() => {
    setSliderDraft(sliderCurrentValues);
  }, [sliderCurrentValues]);

  const handleSliderValueChange = (vals: number[]) => {
    setSliderDraft(vals);
    const [sliderMin, sliderMax] = vals;
    const isAtAbsoluteMin = sliderMin <= metricStats.min;
    const isAtAbsoluteMax = sliderMax >= metricStats.max;
    setMinInput(isAtAbsoluteMin ? '' : String(sliderMin));
    setMaxInput(isAtAbsoluteMax ? '' : String(sliderMax));
  };

  const handleSliderCommit = (vals: number[]) => {
    const [sliderMin, sliderMax] = vals;
    const isAtAbsoluteMin = sliderMin <= metricStats.min;
    const isAtAbsoluteMax = sliderMax >= metricStats.max;

    const newMin = isAtAbsoluteMin ? undefined : sliderMin;
    const newMax = isAtAbsoluteMax ? undefined : sliderMax;
    applyRange(newMin, newMax);
  };

  const handleClearCurrent = () => {
    setMinInput('');
    setMaxInput('');
    const next = { ...filters };
    delete next[selectedMetricKey];
    onChange(next);
  };

  const handleClearAll = () => {
    setMinInput('');
    setMaxInput('');
    onChange({});
  };

  // Check if min > max
  const isInputInvalid = minInput !== '' && maxInput !== '' && Number(minInput) > Number(maxInput);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            'inline-flex items-center h-9 text-[11px] font-mono font-medium rounded-lg border transition-colors select-none shrink-0 shadow-xs overflow-hidden',
            activeFilterCount > 0
              ? 'border-[#0ea5e9]/50 bg-[#0ea5e9]/10 text-[#0ea5e9]'
              : 'border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/60',
          )}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-full px-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus-visible:outline-none"
            >
              <SlidersHorizontal
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  activeFilterCount > 0 ? 'text-[#0ea5e9]' : 'text-zinc-400 dark:text-zinc-500',
                )}
              />
              <span className="tracking-wider">FILTER</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold bg-[#0ea5e9] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </PopoverTrigger>

          {activeFilterCount > 0 && (
            <>
              <div className="h-4 w-px bg-[#0ea5e9]/30 shrink-0" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="flex items-center justify-center h-full px-2 text-[#0ea5e9] hover:bg-[#0ea5e9]/20 transition-colors cursor-pointer focus-visible:outline-none"
                title="Clear all range filters"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[360px] sm:w-[420px] p-0 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden z-50 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0ea5e9]/10 text-[#0ea5e9]">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Metric Range Filter
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                Filter campaigns by From & To range
              </p>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset all</span>
            </button>
          )}
        </div>

        {/* Active Filters Summary inside Popover */}
        {activeFilterCount > 0 && (
          <div className="px-4 py-2 bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold mr-0.5">
              Active:
            </span>
            {(Object.entries(filters) as [MetricKey, MetricRange][]).map(([key, range]) => {
              const def = METRIC_DEFINITIONS.find((d) => d.key === key);
              if (!def || !range) return null;
              let label = '';
              if (range.min != null && range.max != null) {
                label = `${def.shortLabel}: ${def.formatValue(range.min)} - ${def.formatValue(range.max)}`;
              } else if (range.min != null) {
                label = `${def.shortLabel} ≥ ${def.formatValue(range.min)}`;
              } else if (range.max != null) {
                label = `${def.shortLabel} ≤ ${def.formatValue(range.max)}`;
              }
              const isCurrent = key === selectedMetricKey;
              return (
                <span
                  key={key}
                  onClick={() => setSelectedMetricKey(key)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors',
                    isCurrent
                      ? 'bg-[#0ea5e9] text-white'
                      : 'bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[#0ea5e9] hover:bg-[#0ea5e9]/20',
                  )}
                >
                  <span>{label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = { ...filters };
                      delete next[key];
                      onChange(next);
                    }}
                    className={cn(
                      'rounded p-0.5',
                      isCurrent
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:text-red-500 text-[#0ea5e9]',
                    )}
                    title={`Remove ${def.label} filter`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* Metric Selector Pills */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <label className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase mb-2 block">
            Select Metric
          </label>
          <div className="flex flex-wrap gap-1.5">
            {METRIC_DEFINITIONS.map((def) => {
              const isSelected = def.key === selectedMetricKey;
              const hasActiveFilter = filters[def.key] != null;
              const Icon = def.icon;

              return (
                <button
                  key={def.key}
                  type="button"
                  onClick={() => setSelectedMetricKey(def.key)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg border transition-all cursor-pointer select-none',
                    isSelected
                      ? 'bg-[#0ea5e9] text-white border-[#0ea5e9] shadow-xs'
                      : hasActiveFilter
                        ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border-[#0ea5e9]/30 hover:bg-[#0ea5e9]/20'
                        : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60',
                  )}
                >
                  <Icon className={cn('h-3 w-3', isSelected ? 'text-white' : 'text-zinc-400')} />
                  <span>{def.shortLabel}</span>
                  {hasActiveFilter && !isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Range Controls for Selected Metric */}
        <div className="p-4 space-y-4">
          {/* Metric Stats Banner */}
          <div className="flex items-center justify-between text-[11px] font-mono px-3 py-1.5 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/40 text-zinc-500">
            <span>
              Available Range:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {selectedDef.formatValue(metricStats.min)}
              </strong>{' '}
              to{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {selectedDef.formatValue(metricStats.max)}
              </strong>
            </span>
            {metricStats.count > 0 && (
              <span className="text-[10px] text-zinc-400">
                Avg: {selectedDef.formatValue(metricStats.avg)}
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                Quick Presets
              </span>
              {currentFilter && (
                <button
                  type="button"
                  onClick={handleClearCurrent}
                  className="text-[10px] font-mono text-[#0ea5e9] hover:underline cursor-pointer"
                >
                  Clear {selectedDef.shortLabel}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {selectedDef.presets.map((preset, idx) => {
                const isMatch =
                  currentFilter?.min === preset.min && currentFilter?.max === preset.max;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      'px-2 py-1.5 text-[11px] font-mono rounded-lg border text-center transition-all cursor-pointer whitespace-nowrap',
                      isMatch
                        ? 'bg-[#0ea5e9]/15 text-[#0ea5e9] border-[#0ea5e9]/40 font-semibold'
                        : 'bg-zinc-50 dark:bg-zinc-800/30 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Range Slider */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>{selectedDef.formatValue(sliderDraft[0] ?? metricStats.min)}</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                Drag to adjust
              </span>
              <span>{selectedDef.formatValue(sliderDraft[1] ?? metricStats.max)}</span>
            </div>
            <Slider
              min={metricStats.min}
              max={metricStats.max}
              step={selectedDef.step}
              value={sliderDraft}
              onValueChange={handleSliderValueChange}
              onValueCommit={handleSliderCommit}
              className="py-1"
            />
          </div>

          {/* From & To Custom Inputs */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* From (Min) Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
                <span>From (Min)</span>
                {minInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinInput('');
                      applyRange(undefined, maxInput === '' ? undefined : Number(maxInput));
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </label>
              <div className="relative flex items-center">
                {selectedDef.unitPrefix && (
                  <span className="absolute left-2.5 text-xs font-mono text-zinc-400 pointer-events-none">
                    {selectedDef.unitPrefix}
                  </span>
                )}
                <input
                  type="number"
                  step={selectedDef.step}
                  min={0}
                  value={minInput}
                  onChange={handleMinInputChange}
                  placeholder={String(metricStats.min)}
                  className={cn(
                    'w-full py-1.5 text-xs font-mono rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/30 transition-all placeholder:text-zinc-400',
                    selectedDef.unitPrefix
                      ? 'pl-6 pr-2'
                      : selectedDef.unitSuffix
                        ? 'pl-2.5 pr-6'
                        : 'px-2.5',
                  )}
                />
                {selectedDef.unitSuffix && (
                  <span className="absolute right-2.5 text-xs font-mono text-zinc-400 pointer-events-none">
                    {selectedDef.unitSuffix}
                  </span>
                )}
              </div>
            </div>

            {/* To (Max) Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
                <span>To (Max)</span>
                {maxInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setMaxInput('');
                      applyRange(minInput === '' ? undefined : Number(minInput), undefined);
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </label>
              <div className="relative flex items-center">
                {selectedDef.unitPrefix && (
                  <span className="absolute left-2.5 text-xs font-mono text-zinc-400 pointer-events-none">
                    {selectedDef.unitPrefix}
                  </span>
                )}
                <input
                  type="number"
                  step={selectedDef.step}
                  min={0}
                  value={maxInput}
                  onChange={handleMaxInputChange}
                  placeholder={String(metricStats.max)}
                  className={cn(
                    'w-full py-1.5 text-xs font-mono rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/30 transition-all placeholder:text-zinc-400',
                    selectedDef.unitPrefix
                      ? 'pl-6 pr-2'
                      : selectedDef.unitSuffix
                        ? 'pl-2.5 pr-6'
                        : 'px-2.5',
                  )}
                />
                {selectedDef.unitSuffix && (
                  <span className="absolute right-2.5 text-xs font-mono text-zinc-400 pointer-events-none">
                    {selectedDef.unitSuffix}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Error Message if Min > Max */}
          {isInputInvalid && (
            <p className="text-[11px] font-mono text-red-500">
              * Minimum value cannot be greater than maximum value
            </p>
          )}
        </div>

        {/* Footer with Match Count and Done Button */}
        <div className="px-4 py-3 bg-zinc-50/80 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="text-[11px] font-mono text-zinc-500">
            Matching:{' '}
            <strong className="text-[#0ea5e9] font-bold">{filteredCount.toLocaleString()}</strong>{' '}
            of {totalCount.toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg bg-[#0ea5e9] hover:bg-[#0284c7] text-white shadow-xs transition-colors cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Filter Chip List rendered under the toolbar when one or more range filters are active
 */
export function MetricRangeFilterChips({
  filters,
  onChange,
  onOpenFilter,
}: {
  filters: ActiveMetricFilters;
  onChange: (filters: ActiveMetricFilters) => void;
  onOpenFilter?: (key: MetricKey) => void;
}) {
  const activeEntries = Object.entries(filters) as [MetricKey, MetricRange][];
  if (activeEntries.length === 0) return null;

  const removeFilter = (key: MetricKey) => {
    const next = { ...filters };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-1">
      <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 mr-1 flex items-center gap-1">
        <SlidersHorizontal className="h-3 w-3" />
        <span>RANGES:</span>
      </span>

      {activeEntries.map(([key, range]) => {
        const def = METRIC_DEFINITIONS.find((d) => d.key === key);
        if (!def) return null;

        let label = '';
        if (range.min != null && range.max != null) {
          label = `${def.shortLabel}: ${def.formatValue(range.min)} - ${def.formatValue(range.max)}`;
        } else if (range.min != null) {
          label = `${def.shortLabel} ≥ ${def.formatValue(range.min)}`;
        } else if (range.max != null) {
          label = `${def.shortLabel} ≤ ${def.formatValue(range.max)}`;
        }

        return (
          <div
            key={key}
            className="group flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[#0ea5e9] transition-colors"
          >
            <span
              onClick={() => onOpenFilter?.(key)}
              className="cursor-pointer hover:underline"
              title="Click to edit range"
            >
              {label}
            </span>
            <button
              type="button"
              onClick={() => removeFilter(key)}
              className="p-0.5 rounded-full hover:bg-[#0ea5e9]/20 text-[#0ea5e9] transition-colors cursor-pointer"
              title={`Remove ${def.label} filter`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange({})}
        className="text-[10px] font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 uppercase tracking-wider underline cursor-pointer ml-1"
      >
        Clear all
      </button>
    </div>
  );
}

/**
 * Filter evaluator: checks if a campaign matches all active metric range filters
 */
export function matchesMetricFilters(campaign: AdsCampaign, filters: ActiveMetricFilters): boolean {
  for (const [metricKey, range] of Object.entries(filters) as [MetricKey, MetricRange][]) {
    if (!range) continue;
    const def = METRIC_DEFINITIONS.find((d) => d.key === metricKey);
    if (!def) continue;

    const val = def.getValue(campaign);

    if (range.min != null && val < range.min) {
      return false;
    }
    if (range.max != null && val > range.max) {
      return false;
    }
  }
  return true;
}
