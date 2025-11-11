'use client'
import { useAppSelector } from "@/hooks/useRedux";
import Sidebar from "../../../components/Sidebar";
import { useEffect } from "react";





export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}