import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiUrl } from "@/lib/config";
import { toast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (v: string) => (v.trim().length >= 6 ? null : "Password must be at least 6 characters.");

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => { controllerRef.current?.abort(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePassword(password);
    if (err) return toast({ title: "Invalid password", description: err });
    if (password !== confirm) return toast({ title: "Mismatch", description: "Passwords do not match." });
    if (!uid || !token) return toast({ title: "Invalid link", description: "Missing reset token." });

    setLoading(true);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const url = getApiUrl("/api/users/password-reset-confirm/");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: password }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data) || String(res.status));
      toast({ title: "Success", description: "Password has been reset. You can now sign in." });
      navigate("/admin", { replace: true });
    } catch (e: any) {
      if ((e as any)?.name === 'AbortError') return;
      toast({ title: "Error", description: e?.message || "Failed to reset password." });
    } finally {
      controllerRef.current = null;
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-dark text-white overflow-hidden">
      <div className="container mx-auto max-w-3xl px-4 py-20">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-lg mx-auto">
          <h1 className="font-lufga text-2xl text-white mb-4">Reset password</h1>
          <p className="text-sm text-white/80 mb-4">Enter a new password for your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-lufga text-sm text-white/80">New password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 bg-white text-gray-800" />
            </div>

            <div>
              <label className="font-lufga text-sm text-white/80">Confirm password</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="mt-1 bg-white text-gray-800" />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" className="bg-orange" disabled={loading}>{loading ? "Saving..." : "Set new password"}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
