"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

export default function ChatLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { account, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !account) router.replace("/login");
  }, [account, isLoading, router]);

  if (isLoading || !account) {
    return (
      <div className="h-dvh w-screen flex items-center justify-center bg-white text-gray-500 text-sm">
        Đang tải…
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen flex overflow-hidden bg-white text-gray-900">
      {children}
    </div>
  );
}
