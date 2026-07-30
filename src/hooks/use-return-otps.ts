import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface ReturnOtpData {
  accountId: string;
  accountName: string;
  mobileNumber: string;
  data: {
    supplier_delivery_otp?: Array<{
      carrier_name: string;
      otp?: string;
      count: number;
      awbs: string[];
      otp_expiry_timestamp: string;
      carrier_details?: {
        name: string;
        icon: string;
      };
      otp_details?: Array<{
        otp: string;
        expiry_timestamp: string;
        type: string;
        display_text: string;
        active: boolean;
      }>;
      delivery_shipment_details?: {
        total_shipment_count: number;
        awb_download_url?: string;
      };
    }>;
  } | null;
  error: string | null;
}

export const returnOtpsKeys = {
  all: ['returnOtps'] as const,
  byAccounts: (accountIds: string[]) => [...returnOtpsKeys.all, { accountIds }] as const,
};

export function useReturnOtps(accountIds: string[]) {
  return useQuery({
    queryKey: returnOtpsKeys.byAccounts(accountIds),
    queryFn: () => api.post<ReturnOtpData[]>('/accounts/return-otps', { accountIds }),
    enabled: accountIds.length > 0,
  });
}
