"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  DoctorPublic,
  ExpertPublic,
  ManagerPublic,
  PatientPublic,
} from "@pr_hospitalagent/types";
import { ACCOUNT_KEY, API_URL, TOKEN_KEY } from "@/lib/api";

export type AuthAccount =
  | { role: "doctor"; doctor: DoctorPublic }
  | { role: "manager"; manager: ManagerPublic }
  | { role: "patient"; patient: PatientPublic }
  | { role: "expert"; expert: ExpertPublic };

type AuthState = {
  account: AuthAccount | null;
  doctor: DoctorPublic | null;
  manager: ManagerPublic | null;
  patient: PatientPublic | null;
  expert: ExpertPublic | null;
  role: "doctor" | "manager" | "patient" | "expert" | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, account: AuthAccount) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

type MeResponse =
  | { role: "doctor"; doctor: DoctorPublic }
  | { role: "manager"; manager: ManagerPublic }
  | { role: "patient"; patient: PatientPublic }
  | { role: "expert"; expert: ExpertPublic };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setAccount(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ACCOUNT_KEY);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedAccount = localStorage.getItem(ACCOUNT_KEY);
    if (!storedToken || !storedAccount) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          clearAuth();
          return;
        }
        const data = (await res.json()) as MeResponse;
        const next: AuthAccount =
          data.role === "manager"
            ? { role: "manager", manager: data.manager }
            : data.role === "patient"
            ? { role: "patient", patient: data.patient }
            : data.role === "expert"
            ? { role: "expert", expert: data.expert }
            : { role: "doctor", doctor: data.doctor };
        setToken(storedToken);
        setAccount(next);
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
      } catch {
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearAuth]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && e.newValue === null) {
        clearAuth();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clearAuth]);

  const login = useCallback(
    (nextToken: string, nextAccount: AuthAccount) => {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextAccount));
      setToken(nextToken);
      setAccount(nextAccount);
    },
    []
  );

  const doctor = account?.role === "doctor" ? account.doctor : null;
  const manager = account?.role === "manager" ? account.manager : null;
  const patient = account?.role === "patient" ? account.patient : null;
  const expert = account?.role === "expert" ? account.expert : null;
  const role = account?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        account,
        doctor,
        manager,
        patient,
        expert,
        role,
        token,
        isLoading,
        login,
        logout: clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
