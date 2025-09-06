import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "./button";

export default function AdminBack({ onClick, variant = "ghost", className = "" }: { onClick?: () => void; variant?: "ghost" | "admin" | "outline" | "destructive"; className?: string; }) {
  const navigate = useNavigate();
  const handle = () => { if (onClick) onClick(); else navigate(-1); };

  return (
    <Button variant={variant as any} onClick={handle} className={`inline-flex items-center gap-2 ${className}`}>
      <ChevronLeft className="w-5 h-5" />
      <span className="text-base">Back</span>
    </Button>
  );
}
