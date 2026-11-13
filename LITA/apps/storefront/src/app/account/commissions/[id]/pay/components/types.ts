import type {
  Commission,
  CommissionMessage,
  CommissionImage,
} from "@/lib/data/commission";
import type { UpiPaymentInstructions } from "@/lib/data/upi";

export interface CommissionUpdate {
  id?: string;
  image_url: string;
  note: string;
  date: string;
  title?: string;
}

export type CustomerProfile = {
  id?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
} | null;

export type { Commission, CommissionMessage, CommissionImage, UpiPaymentInstructions };
