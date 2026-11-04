"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import {
  getUpiPayment,
  getUpiUploadUrl,
  submitUpiProof,
  type UpiPaymentInstructions,
  type UpiPaymentStatus,
} from "@/lib/data/upi";
import { isValidUtr } from "@/lib/upi-validation";
import { Turnstile } from "@/components/Turnstile";

const ALLOWED_SCREENSHOT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;

type UpiPayPanelProps = {
  orderId: string;
  initialPayment: UpiPaymentInstructions;
};

function remainingTime(expiresAt: string, now: number): string {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function UpiPayPanel({
  orderId,
  initialPayment,
}: UpiPayPanelProps) {
  const [payment, setPayment] = useState(initialPayment);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [utr, setUtr] = useState("");
  const [utrError, setUtrError] = useState("");
  const [payerVpa, setPayerVpa] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [screenshotKey, setScreenshotKey] = useState("");
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [pending, setPending] = useState(false);
  const websiteRef = useRef<HTMLInputElement>(null);

  const isExpired =
    payment.status === "expired" ||
    new Date(payment.expires_at).getTime() <= now;
  const status: UpiPaymentStatus = isExpired ? "expired" : payment.status;
  const canShowProofForm = status === "awaiting_proof" || status === "rejected";
  const isTerminal = status === "verified" || status === "expired";

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken("");
    setError("Security verification could not be completed. Please try again.");
  }, []);

  const refreshPayment = useCallback(async () => {
    const result = await getUpiPayment(orderId);
    if (result.payment) {
      setPayment(result.payment);
    } else if (result.error) {
      setError("Payment status could not be refreshed. Please try again.");
    }
  }, [orderId]);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payment.upi_link, { width: 240, margin: 1 })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setError("The payment QR code could not be generated.");
      });

    return () => {
      active = false;
    };
  }, [payment.upi_link]);

  useEffect(() => {
    if (isTerminal) return;

    const pollIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshPayment();
      }
    };
    const interval = window.setInterval(pollIfVisible, 30_000);
    document.addEventListener("visibilitychange", pollIfVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", pollIfVisible);
    };
  }, [isTerminal, refreshPayment]);

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied`);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}. Please copy it manually.`);
    }
  }

  async function uploadScreenshot(file?: File) {
    setError("");
    setUploadMessage("");
    if (!file) return;

    if (!ALLOWED_SCREENSHOT_TYPES.includes(file.type)) {
      setUploadState("error");
      setUploadMessage("Choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_SCREENSHOT_SIZE) {
      setUploadState("error");
      setUploadMessage("Screenshot must be no larger than 5 MB.");
      return;
    }

    setUploadState("uploading");
    try {
      const upload = await getUpiUploadUrl(payment.reference_code, payment.proof_token, {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      if (!upload.ok) throw new Error(upload.error);

      const result = await fetch(upload.data.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) {
        throw new Error(`Screenshot upload failed with status ${result.status}.`);
      }

      setScreenshotKey(upload.data.key);
      setPayment((current) => ({ ...current, has_screenshot: true }));
      setUploadState("done");
      setUploadMessage("Screenshot uploaded.");
    } catch (uploadError) {
      setUploadState("error");
      setUploadMessage(
        uploadError instanceof Error ? uploadError.message : "Screenshot upload failed."
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanUtr = utr.trim();
    if (cleanUtr && !isValidUtr(cleanUtr)) {
      setUtrError("Enter exactly 12 digits.");
      return;
    }
    setUtrError("");
    if (!cleanUtr && !screenshotKey && !payment.has_screenshot) {
      setError("Enter your UTR or upload a payment screenshot.");
      return;
    }
    if (uploadState === "uploading") {
      setError("Wait for the screenshot upload to finish.");
      return;
    }
    if (!turnstileToken) {
      setError("Complete the security check before submitting your proof.");
      return;
    }

    setPending(true);
    const result = await submitUpiProof(
      payment.reference_code,
      payment.proof_token,
      orderId,
      {
        utr: cleanUtr || undefined,
        screenshot_key: screenshotKey || undefined,
        payer_vpa: payerVpa.trim() || undefined,
        turnstile_token: turnstileToken,
        website: websiteRef.current?.value ?? "",
      }
    );
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (!result.data.status) {
      await refreshPayment();
      return;
    }

    setPayment((current) => ({
      ...current,
      status: result.data.status ?? current.status,
      utr_last4: cleanUtr ? cleanUtr.slice(-4) : current.utr_last4,
      reject_reason: null,
    }));
    setTurnstileToken("");
    setNotice("Your payment proof has been submitted.");
  }

  return (
    <section
      aria-labelledby="upi-payment-heading"
      className="my-8 space-y-6 border border-dust bg-wall p-5 sm:p-8"
    >
      <div>
        <h2 id="upi-payment-heading" className="text-2xl">
          Complete your payment
        </h2>
        <p className="mt-2 text-lg font-medium tabular-nums">
          {formatMoney(payment.amount, payment.currency_code)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span>
            Reference code: <strong>{payment.reference_code}</strong>
          </span>
          <button
            type="button"
            className="link"
            onClick={() => void copyValue("Reference code", payment.reference_code)}
            aria-label="Copy reference code"
          >
            Copy
          </button>
        </div>
        {!isTerminal && (
          <p className="mt-2 text-sm text-graphite" aria-live="polite">
            Payment window: {remainingTime(payment.expires_at, now)}
          </p>
        )}
      </div>

      {status === "submitted" && (
        <div role="status" aria-live="polite" className="border border-dust p-4">
          <p>
            We are checking your payment. This usually takes a few hours during
            studio hours.
          </p>
          {payment.utr_last4 && (
            <p className="mt-1 text-sm text-graphite">
              UTR ending in {payment.utr_last4}
            </p>
          )}
        </div>
      )}

      {status === "verified" && (
        <div role="status" aria-live="polite" className="border border-dust p-4">
          Your payment has been verified. Thank you.
        </div>
      )}

      {status === "expired" && (
        <div role="status" aria-live="polite" className="space-y-3 border border-dust p-4">
          <p>
            The payment window has expired. This order can no longer be paid
            through this UPI request.
          </p>
          <Link href="/artworks" className="link">
            Browse artworks
          </Link>
        </div>
      )}

      {canShowProofForm && (
        <>
          {status === "rejected" && (
            <div role="alert" className="border border-dust p-4">
              <p>Your payment proof was not accepted.</p>
              {payment.reject_reason && (
                <p className="mt-1 text-sm text-graphite">
                  {payment.reject_reason}
                </p>
              )}
              <p className="mt-2 text-sm">You can submit updated proof below.</p>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
            {isMobile ? (
              <a href={payment.upi_link} className="btn-solid text-center">
                Open UPI app
              </a>
            ) : (
              <div className="flex justify-center">
                {qrDataUrl ? (
                  // QR is encoded from the server-generated UPI link.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="UPI payment QR code"
                    width={240}
                    height={240}
                    className="border border-dust bg-white p-2"
                  />
                ) : (
                  <p role="status" className="text-sm text-graphite">
                    Preparing payment QR…
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <p>
                UPI ID: <strong>{payment.vpa}</strong>{" "}
                <button
                  type="button"
                  className="link"
                  onClick={() => void copyValue("UPI ID", payment.vpa)}
                  aria-label="Copy UPI ID"
                >
                  Copy
                </button>
              </p>
              <p>
                Payee: <strong>{payment.payee_name}</strong>{" "}
                <button
                  type="button"
                  className="link"
                  onClick={() => void copyValue("Payee name", payment.payee_name)}
                  aria-label="Copy payee name"
                >
                  Copy
                </button>
              </p>
              <p>
                Pay the exact amount of{" "}
                <strong>{formatMoney(payment.amount, payment.currency_code)}</strong>.
                Put reference code <strong>{payment.reference_code}</strong> in
                the payment note.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={websiteRef}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <div>
              <label htmlFor="upi-utr" className="label">
                UTR / transaction reference (optional if uploading a screenshot)
              </label>
              <input
                id="upi-utr"
                name="utr"
                type="text"
                inputMode="numeric"
                maxLength={12}
                autoComplete="off"
                value={utr}
                onChange={(event) => {
                  setUtr(event.target.value);
                  setUtrError("");
                }}
                onBlur={() => {
                  if (utr.trim() && !isValidUtr(utr)) {
                    setUtrError("Enter exactly 12 digits.");
                  }
                }}
                aria-invalid={Boolean(utrError)}
                aria-describedby={utrError ? "upi-utr-error" : undefined}
                className="field"
              />
              {utrError && (
                <p id="upi-utr-error" role="alert" className="mt-1 text-sm text-red-700">
                  {utrError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="upi-payer-vpa" className="label">
                Your UPI ID (optional)
              </label>
              <input
                id="upi-payer-vpa"
                name="payer_vpa"
                type="text"
                autoComplete="off"
                maxLength={255}
                value={payerVpa}
                onChange={(event) => setPayerVpa(event.target.value)}
                className="field"
              />
            </div>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void uploadScreenshot(event.dataTransfer.files[0]);
              }}
              className="space-y-2 border border-dust p-4"
            >
              <label htmlFor="upi-screenshot" className="label">
                Payment screenshot (optional, JPG / PNG / WEBP, up to 5 MB)
              </label>
              <input
                id="upi-screenshot"
                name="screenshot"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadState === "uploading"}
                aria-describedby="upi-upload-status"
                onChange={(event) => {
                  setScreenshotKey("");
                  void uploadScreenshot(event.target.files?.[0]);
                  event.target.value = "";
                }}
                className="field"
              />
              <p className="text-sm text-graphite">
                Or drag and drop one screenshot here.
              </p>
              <p
                id="upi-upload-status"
                role={uploadState === "error" ? "alert" : "status"}
                className="mt-1 text-sm text-graphite"
                aria-live="polite"
              >
                {uploadState === "uploading"
                  ? "Uploading screenshot…"
                  : uploadMessage}
              </p>
              {screenshotKey && (
                <p className="text-sm text-graphite">Screenshot ready to submit.</p>
              )}
            </div>

            <Turnstile
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              onError={handleTurnstileError}
            />

            {error && (
              <p role="alert" className="border border-dust p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" aria-live="polite" className="text-sm text-graphite">
                {notice}
              </p>
            )}
            {copied && (
              <p role="status" aria-live="polite" className="text-sm text-graphite">
                {copied}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || uploadState === "uploading"}
              className="btn-solid disabled:opacity-50"
            >
              {pending ? "Submitting proof…" : "Submit payment proof"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
