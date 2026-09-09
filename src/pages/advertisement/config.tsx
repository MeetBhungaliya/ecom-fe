import { ActionButton } from '@/components/ui/action-button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { useAccounts } from '@/hooks/use-accounts';
import { useAdConfig, useDeleteAdConfig, useSaveAdConfig } from '@/hooks/use-ad-config';
import { cn } from '@/lib/cn';
import { extractDeepKeys } from '@/lib/extract-keys';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { AlertCircle, ArrowLeft, Check, Code2, Globe, Save, Trash2, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

// ============================================
// HELPERS
// ============================================

function formatFieldName(path: string): string {
  return path.replace(/\./g, ' ➔ ');
}

// ============================================
// COMPONENTS
// ============================================

function MultiSelectDropdown({
  options,
  selected,
  onToggle,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">{placeholder}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors text-left',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input hover:bg-accent hover:text-foreground',
                )}
              >
                <div
                  className={cn(
                    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-all',
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-input',
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5" />}
                </div>
                <span className="font-mono truncate">{formatFieldName(option)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function AdConfigPage() {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const currentAccount = accounts?.find((a) => a.id.toString() === activeAccountIds[0]);

  const { data: savedConfig, isLoading } = useAdConfig(currentAccount?.id);
  const saveConfigMutation = useSaveAdConfig();
  const deleteConfigMutation = useDeleteAdConfig();

  const [apiUrl, setApiUrl] = useState('');
  const [payloadText, setPayloadText] = useState('');
  const [dynamicFields, setDynamicFields] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isFilteredKey = (key: string) => {
    const cleanKey = key.replace(/\[\]/g, '');
    const parts = cleanKey.split('.');
    const lastPart = parts[parts.length - 1];
    return ['supplier_id', 'campaign_name', 'start_time', 'end_time'].includes(lastPart);
  };

  useEffect(() => {
    if (savedConfig) {
      setApiUrl(savedConfig.apiUrl);
      setPayloadText(JSON.stringify(savedConfig.payload, null, 2));
      setDynamicFields((savedConfig.dynamicFields || []).filter((key) => !isFilteredKey(key)));
    }
  }, [savedConfig]);

  const { parsedPayload, isValidJson, extractedKeys } = useMemo(() => {
    if (!payloadText.trim()) return { parsedPayload: null, isValidJson: true, extractedKeys: [] };
    try {
      const parsed = JSON.parse(payloadText);
      const keys = extractDeepKeys(parsed).filter((key) => !isFilteredKey(key));
      return { parsedPayload: parsed, isValidJson: true, extractedKeys: keys };
    } catch {
      return { parsedPayload: null, isValidJson: false, extractedKeys: [] };
    }
  }, [payloadText]);

  const toggleDynamicField = (field: string) => {
    setDynamicFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  };

  const handleSave = async () => {
    if (!currentAccount) return;
    const newErrors: Record<string, string> = {};
    if (!apiUrl.trim()) newErrors.apiUrl = 'API URL is required';
    if (!payloadText.trim()) newErrors.payload = 'Payload is required';
    else if (!isValidJson) newErrors.payload = 'Payload must be valid JSON';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await saveConfigMutation.mutateAsync({
        accountId: Number(currentAccount.id),
        apiUrl: apiUrl.trim(),
        payload: parsedPayload!,
        dynamicFields,
      });
      toast.success('Configuration saved');
      navigate(ROUTES.ADVERTISEMENT);
    } catch (err: unknown) {
      toast.error('Failed to save configuration');
    }
  };

  const handleDelete = async () => {
    if (!currentAccount || !savedConfig) return;
    try {
      await deleteConfigMutation.mutateAsync(currentAccount.id);
      toast.success('Configuration deleted');
      navigate(ROUTES.ADVERTISEMENT);
    } catch {
      toast.error('Failed to delete configuration');
    }
  };

  if (!currentAccount) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground text-sm">Please select an account first</p>
        <ActionButton
          onClick={() => navigate(ROUTES.ADVERTISEMENT)}
          variant="outline"
          fullWidth={false}
        >
          Go Back
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(ROUTES.ADVERTISEMENT)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Configuration</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Set up the API endpoint and JSON payload schema.
          </p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* API URL */}
            <div className="space-y-2">
              <Label htmlFor="apiUrl" className="text-sm font-semibold flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-muted-foreground" />
                API URL
              </Label>
              <Input
                id="apiUrl"
                type="url"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setErrors((prev) => ({ ...prev, apiUrl: '' }));
                }}
                placeholder="https://api.example.com/v1/ads"
                className={cn('rounded-xl bg-background/50', errors.apiUrl && 'border-destructive')}
              />
              {errors.apiUrl && (
                <p className="text-destructive text-[11px] font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.apiUrl}
                </p>
              )}
            </div>

            {/* Payload */}
            <div className="space-y-2">
              <Label htmlFor="payload" className="text-sm font-semibold flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                Payload (JSON)
              </Label>
              <textarea
                id="payload"
                value={payloadText}
                onChange={(e) => {
                  setPayloadText(e.target.value);
                  setErrors((prev) => ({ ...prev, payload: '' }));
                }}
                placeholder={`{\n  "supplier_id": 11XXXX,\n  "campaign_name": "12XXXX - 01/01/1999",\n  "start_time": "1999-01-01T11:00:28+05:30",\n  "end_time": null,\n  "budget": 1XX,\n  "catalogs": [\n    {\n      "catalog_id": 528XXXXXX,\n      "catalog_source": "RECO_BOOST_SALES",\n      "cpc": 0.XX,\n      "budget": 1XX,\n      "bid": 5,\n      "prefilled_bid": 33\n    }\n  ],\n  "campaign_type": "DAILY_BUDGET",\n  "auto_cpc_enabled": true,\n  "campaign_src": "CREATION",\n  "bid_type": "CPO",\n  "till_budget_lasts": true,\n  "prefilled_budget": 1XX\n}`}
                className={cn(
                  'flex min-h-[200px] w-full rounded-xl border bg-background/50 px-3 py-3 text-sm font-mono shadow-sm placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-all resize-none leading-relaxed',
                  errors.payload ? 'border-destructive' : 'border-input',
                )}
                spellCheck={false}
              />
              {errors.payload && (
                <p className="text-destructive text-[11px] font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.payload}
                </p>
              )}
            </div>

            {/* Dynamic Fields */}
            <AnimatePresence>
              {extractedKeys.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 pt-2"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <Label className="text-sm font-semibold">Dynamic Fields</Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-2 mb-2">
                    Select fields from your payload that must be entered manually when creating an
                    offer.
                  </p>

                  <MultiSelectDropdown
                    options={extractedKeys}
                    selected={dynamicFields}
                    onToggle={toggleDynamicField}
                    placeholder="No fields available"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        )}
      </Card>

      <div className="flex items-center gap-3">
        <ActionButton
          onClick={handleSave}
          loading={saveConfigMutation.isPending}
          icon={Save}
          className="flex-1"
        >
          {savedConfig ? 'Update Configuration' : 'Save Configuration'}
        </ActionButton>

        {savedConfig && (
          <ActionButton
            variant="destructive"
            onClick={handleDelete}
            loading={deleteConfigMutation.isPending}
            icon={Trash2}
            fullWidth={false}
            className="w-12 h-11 px-0"
            aria-label="Delete configuration"
          />
        )}
      </div>
    </div>
  );
}
