import { z } from "zod";
import {
  INDIAN_STATES,
  hasFirstAndLastName,
  isValidIndianPhone,
  isValidIndianPincode,
  normalizeIndianPhone,
  splitFullName,
} from "./address-utils.js";

export { INDIAN_STATES, normalizeIndianPhone, splitFullName };

const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your full name.")
  .superRefine((value, context) => {
    if (!hasFirstAndLastName(value)) {
      context.addIssue({
        code: "custom",
        message: "Enter both your first and last name.",
      });
    }
  });

export const addressSchema = z.object({
  full_name: fullNameSchema,
  phone: z
    .string()
    .trim()
    .refine(isValidIndianPhone, "Enter a valid 10-digit mobile number.")
    .transform(normalizeIndianPhone),
  postal_code: z
    .string()
    .trim()
    .refine(isValidIndianPincode, "Enter a valid 6-digit PIN code."),
  address_1: z.string().trim().min(1, "Enter your flat, house, or building."),
  address_2: z.string().trim().min(1, "Enter your area or street."),
  landmark: z.string().trim().max(200, "Landmark must be 200 characters or fewer.").optional().default(""),
  city: z.string().trim().min(1, "Enter your town or city."),
  province: z.enum(INDIAN_STATES, {
    error: "Choose an Indian state or union territory.",
  }),
  delivery_instructions: z
    .string()
    .trim()
    .max(200, "Delivery instructions must be 200 characters or fewer.")
    .optional()
    .default(""),
  is_default_shipping: z.boolean().optional().default(false),
  country_code: z.string().refine((value) => value === "in", {
    error: "Delivery addresses must be in India.",
  }),
  company: z.string().trim().optional().default(""),
});

export const checkoutAddressSchema = addressSchema.extend({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export type AddressFormValues = {
  full_name: string;
  phone: string;
  postal_code: string;
  address_1: string;
  address_2: string;
  landmark: string;
  city: string;
  province: string;
  delivery_instructions: string;
  is_default_shipping: boolean;
  country_code: string;
  company: string;
};
export type ValidAddressFormValues = z.output<typeof addressSchema>;
export type CheckoutAddressInput = AddressFormValues & { email: string };
export type ValidCheckoutAddressInput = z.output<typeof checkoutAddressSchema>;

export type AddressLike = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  postal_code?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  province?: string | null;
  country_code?: string | null;
  company?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function addressToFormValues(
  address?: AddressLike | null,
  options?: { deliveryInstructions?: string; isDefaultShipping?: boolean }
): AddressFormValues {
  const savedInstructions =
    typeof address?.metadata?.delivery_instructions === "string"
      ? address.metadata.delivery_instructions
      : "";

  return {
    full_name: [address?.first_name, address?.last_name].filter(Boolean).join(" "),
    phone: normalizeIndianPhone(address?.phone ?? ""),
    postal_code: address?.postal_code ?? "",
    address_1: address?.address_1 ?? "",
    address_2: address?.address_2 ?? "",
    landmark:
      typeof address?.metadata?.landmark === "string"
        ? address.metadata.landmark
        : "",
    city: address?.city ?? "",
    province: INDIAN_STATES.find(
      (state) => state.toLowerCase() === address?.province?.toLowerCase()
    ) ?? "",
    delivery_instructions:
      options?.deliveryInstructions ?? savedInstructions,
    is_default_shipping: options?.isDefaultShipping ?? false,
    country_code: "in",
    company: address?.company ?? "",
  };
}

export function getAddressFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0]?.toString();
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}
