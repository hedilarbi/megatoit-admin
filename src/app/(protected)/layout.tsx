"use client";

import SideBar from "@/components/SideBar";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/connexion");
    }
  }, [loading, user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-50 flex w-screen max-w-screen max-h-screen">
      <SideBar />

      <main className="w-full h-screen">{children}</main>
    </div>
  );
}
