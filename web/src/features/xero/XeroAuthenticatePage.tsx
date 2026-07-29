import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { xeroApi } from "@mytask/api";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";

const VERIFIER_KEY = "xero_verifier";

type XeroState = {
  userId?: number;
  organisationId?: number;
  organisationCode?: string;
};

function decodeState(raw?: string | null): XeroState | null {
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw)) as XeroState;
  } catch {
    return null;
  }
}

export function XeroAuthenticatePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToastStore();
  const started = useRef(false);
  const [message, setMessage] = useState("Connecting to Xero…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const state = decodeState(params.get("state"));
    const orgCode = state?.organisationCode;
    const fallback = orgCode
      ? ROUTES.settings(orgCode)
      : "/";

    async function run() {
      if (params.get("error")) {
        const description =
          params.get("error_description") ||
          params.get("error") ||
          "Unable to connect with Xero";
        localStorage.removeItem(VERIFIER_KEY);
        setError(description);
        toast.error("Xero connection failed", description);
        navigate(fallback, { replace: true });
        return;
      }

      const code = params.get("code");
      const verifier = localStorage.getItem(VERIFIER_KEY);
      if (!code || !verifier || !state) {
        setError("Missing OAuth code or verifier");
        toast.error("Xero connection failed", "Missing OAuth parameters");
        navigate(fallback, { replace: true });
        return;
      }

      try {
        setMessage("Finalising Xero connection…");
        const res = await xeroApi.finalize({
          code,
          verifier,
          state,
        });
        localStorage.removeItem(VERIFIER_KEY);
        const org = (res.data as { data?: { code?: string } }).data;
        const codeFromResponse = org?.code || orgCode;
        toast.success("Xero connected");
        navigate(
          codeFromResponse
            ? `${ROUTES.settings(codeFromResponse)}?selectDefaultOrdinaryHoursEarningRate=true`
            : "/",
          { replace: true },
        );
      } catch (err) {
        localStorage.removeItem(VERIFIER_KEY);
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error("Xero connection failed", msg);
        navigate(fallback, { replace: true });
      }
    }

    void run();
  }, [navigate, params, toast]);

  return (
    <Card className="mx-auto mt-10 max-w-md">
      {error ? (
        <div>
          <h1 className="text-xl font-bold text-[var(--mt-text)]">
            Xero connection failed
          </h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
        </div>
      ) : (
        <LoadingState label={message} />
      )}
    </Card>
  );
}

export async function startXeroConnect() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem(VERIFIER_KEY, verifier);
  const res = await xeroApi.connect({ challenge });
  const url = (res.data as { data?: string }).data;
  if (!url) throw new Error("No Xero consent URL returned");
  window.location.href = url;
}

function generateCodeVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
