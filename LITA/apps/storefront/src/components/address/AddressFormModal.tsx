"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  addressSchema,
  getAddressFieldErrors,
  type AddressFormValues,
} from "@/lib/validation/address";
import { INDIAN_STATES } from "@/lib/validation/address";

type FieldErrors = Record<string, string>;

type AddressFormFieldsProps = {
  values: AddressFormValues;
  onChange: (field: keyof AddressFormValues, value: string | boolean) => void;
  errors?: FieldErrors;
  idPrefix: string;
  isLoggedIn: boolean;
};

type AddressFormModalProps = {
  open: boolean;
  initialValues: AddressFormValues;
  isLoggedIn: boolean;
  pending?: boolean;
  error?: string | null;
  triggerRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  instructionsOpen?: boolean;
};

function fieldProps(id: string, field: string, errors: FieldErrors) {
  const error = errors[field];
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

export function AddressFormFields({
  values,
  onChange,
  errors = {},
  idPrefix,
  isLoggedIn,
}: AddressFormFieldsProps) {
  const id = (field: string) => `${idPrefix}-${field}`;
  const message = (field: string) =>
    errors[field] ? (
      <p id={id(`${field}-error`)} className="mt-1 text-sm text-red-700">
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={id("country")} className="label">Country/Region</label>
        <select id={id("country")} value="in" disabled className="field disabled:cursor-not-allowed disabled:opacity-70">
          <option value="in">India</option>
        </select>
      </div>

      <div>
        <label htmlFor={id("full-name")} className="label">Full name (First and Last name)</label>
        <input
          id={id("full-name")}
          autoComplete="name"
          value={values.full_name}
          onChange={(event) => onChange("full_name", event.target.value)}
          className="field"
          {...fieldProps(id("full_name"), "full_name", errors)}
        />
        {message("full_name")}
      </div>

      <div>
        <label htmlFor={id("phone")} className="label">Mobile number</label>
        <div className="flex items-center border border-dust bg-wall focus-within:border-ink">
          <span aria-hidden="true" className="border-r border-dust px-3 py-3 text-sm text-graphite">+91</span>
          <input
            id={id("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={values.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[15px] text-ink focus:outline-none"
            {...fieldProps(id("phone"), "phone", errors)}
          />
        </div>
        <p className="mt-1 text-sm text-graphite">May be used to assist delivery</p>
        {message("phone")}
      </div>

      <div>
        <label htmlFor={id("postal-code")} className="label">Pincode</label>
        <input
          id={id("postal-code")}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="6 digits [0-9] PIN code"
          value={values.postal_code}
          onChange={(event) => onChange("postal_code", event.target.value)}
          className="field"
          {...fieldProps(id("postal_code"), "postal_code", errors)}
        />
        {message("postal_code")}
      </div>

      <div>
        <label htmlFor={id("address-1")} className="label">
          Flat, House no., Building, Company, Apartment
        </label>
        <input
          id={id("address-1")}
          autoComplete="address-line1"
          value={values.address_1}
          onChange={(event) => onChange("address_1", event.target.value)}
          className="field"
          {...fieldProps(id("address_1"), "address_1", errors)}
        />
        {message("address_1")}
      </div>

      <div>
        <label htmlFor={id("address-2")} className="label">Area, Street, Sector, Village</label>
        <input
          id={id("address-2")}
          autoComplete="address-line2"
          value={values.address_2}
          onChange={(event) => onChange("address_2", event.target.value)}
          className="field"
          {...fieldProps(id("address_2"), "address_2", errors)}
        />
        {message("address_2")}
      </div>

      <div>
        <label htmlFor={id("landmark")} className="label">Landmark (optional)</label>
        <input
          id={id("landmark")}
          placeholder="E.g. near apollo hospital"
          maxLength={200}
          value={values.landmark}
          onChange={(event) => onChange("landmark", event.target.value)}
          className="field"
          {...fieldProps(id("landmark"), "landmark", errors)}
        />
        {message("landmark")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={id("city")} className="label">Town/City</label>
          <input
            id={id("city")}
            autoComplete="address-level2"
            value={values.city}
            onChange={(event) => onChange("city", event.target.value)}
            className="field"
            {...fieldProps(id("city"), "city", errors)}
          />
          {message("city")}
        </div>
        <div>
          <label htmlFor={id("province")} className="label">State</label>
          <select
            id={id("province")}
            autoComplete="address-level1"
            value={values.province}
            onChange={(event) => onChange("province", event.target.value)}
            className="field"
            {...fieldProps(id("province"), "province", errors)}
          >
            <option value="">Choose a state</option>
            {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          {message("province")}
        </div>
      </div>

      {isLoggedIn && (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={values.is_default_shipping ?? false}
            onChange={(event) => onChange("is_default_shipping", event.target.checked)}
            className="mt-1 accent-[#2A3590]"
          />
          <span>Make this my default address</span>
        </label>
      )}

      <details className="group">
        <summary className="cursor-pointer text-sm">
          <span className="block font-medium">Delivery instructions (optional)</span>
          <span className="link">Add preferences, notes, access codes and more</span>
        </summary>
        <div className="pt-3">
          <label htmlFor={id("delivery-instructions")} className="label">
            Delivery instructions (optional)
          </label>
          <textarea
            id={id("delivery-instructions")}
            rows={3}
            maxLength={200}
            value={values.delivery_instructions}
            onChange={(event) => onChange("delivery_instructions", event.target.value)}
            className="field"
            {...fieldProps(id("delivery_instructions"), "delivery_instructions", errors)}
          />
          <p className="mt-1 text-right text-xs text-graphite">
            {values.delivery_instructions.length}/200
          </p>
          {message("delivery_instructions")}
        </div>
      </details>
    </div>
  );
}

export function AddressFormModal({
  open,
  initialValues,
  isLoggedIn,
  pending = false,
  error,
  triggerRef,
  onClose,
  onSubmit,
  onDelete,
  instructionsOpen = false,
}: AddressFormModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const onCloseRef = useRef(onClose);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocusTarget = triggerRef?.current;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () =>
      dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
    const first = formRef.current?.querySelector<HTMLElement>(
      'input:not([type="checkbox"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(focusable() ?? []);
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault();
        firstItem.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusTarget?.focus();
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (open && instructionsOpen) {
      formRef.current?.querySelector("details")?.setAttribute("open", "");
    }
  }, [instructionsOpen, open]);

  if (!open) return null;

  const update = (field: keyof AddressFormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = addressSchema.safeParse(values);
    if (!result.success) {
      setFieldErrors(getAddressFieldErrors(result.error));
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    await onSubmit(result.data);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-modal-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-dust bg-paper p-5 shadow-xl sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-dust pb-4">
          <h2 id="address-modal-title" className="text-xl">
            {onDelete ? "Edit address" : "Enter a new delivery address"}
          </h2>
          <button type="button" className="link text-sm" onClick={onClose} aria-label="Close address form">
            Close
          </button>
        </div>

        <form ref={formRef} onSubmit={submit} className="space-y-5">
          <AddressFormFields
            values={values}
            onChange={update}
            errors={fieldErrors}
            idPrefix="modal-address"
            isLoggedIn={isLoggedIn}
          />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-3 border-t border-dust pt-4 sm:flex-row sm:items-center sm:justify-between">
            {onDelete ? (
              <button
                type="button"
                disabled={pending}
                className="link self-start text-sm"
                onClick={() => {
                  if (window.confirm("Are you sure you want to remove this address?")) {
                    void onDelete();
                  }
                }}
              >
                Delete address
              </button>
            ) : <span />}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" className="btn-line" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-solid" disabled={pending}>
                {pending ? "Saving…" : "Use this address"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
