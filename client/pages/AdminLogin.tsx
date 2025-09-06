import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "@/lib/config";
import { toast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const forgotControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => { forgotControllerRef.current?.abort(); }, []);

  const handleForgot = async () => {
    const err = validateEmail(forgotEmail);
    if (err) { toast({ title: 'Invalid email', description: err }); return; }
    const controller = new AbortController();
    forgotControllerRef.current = controller;
    try {
      const url = getApiUrl('/api/users/forgot-password/');
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmail.trim() }), signal: controller.signal });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || String(res.status));
      }
      toast({ title: 'Email sent', description: 'If the email exists, you will receive password reset instructions.' });
      setForgotOpen(false);
      setForgotEmail("");
    } catch (e: any) {
      if ((e as any)?.name === 'AbortError') return;
      toast({ title: 'Error', description: e?.message || 'Failed to request password reset.' });
    } finally {
      forgotControllerRef.current = null;
    }
  };

  // Respect saved theme preference like the landing page
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const isDark = saved ? saved === "dark" : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", !!isDark);
    } catch {}
  }, []);

  const validateEmail = (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Please enter a valid email.");
  const validatePassword = (v: string) => (v.trim().length >= 6 ? null : "Password must be at least 6 characters.");

  const submitControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => { submitControllerRef.current?.abort(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setTouched({ email: true, password: true });
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) {
      toast({ title: "Invalid form", description: "Please correct the highlighted fields." });
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    submitControllerRef.current = controller;
    const url = getApiUrl("/api/users/login/");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || String(res.status));
      const access = data?.access as string | undefined;
      const refresh = data?.refresh as string | undefined;
      if (!access || !refresh) throw new Error("Missing tokens");
      try { const { setTokens } = await import("@/lib/auth"); setTokens(access, refresh); } catch {}
      toast({ title: "Welcome", description: "Login successful." });
      navigate("/admin/dashboard", { replace: true });
    } catch (err: any) {
      if ((err as any)?.name === 'AbortError') return;
      const msg = err?.message || "Unable to authenticate. Please try again.";
      toast({ title: "Login failed", description: msg });
    } finally {
      submitControllerRef.current = null;
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-dark text-white overflow-hidden">
      {/* Background decorative elements (match root theme) */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-96 h-96 bg-orange-light rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-orange-light rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-10 lg:py-16 relative z-10">
        <div className="flex items-center justify-center min-h-[70vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 rounded-3xl">
              <CardHeader className="text-center">
                <CardTitle className="font-lufga text-3xl lg:text-4xl">
                  <span className="text-white">Admin </span>
                  <span className="text-orange">Login</span>
                </CardTitle>
                <CardDescription className="font-lufga text-base text-white/80">
                  Access the administration area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-lufga text-sm text-white/90">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError(validateEmail(e.target.value));
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      placeholder="you@example.com"
                      autoComplete="username"
                      aria-invalid={touched.email && !!emailError}
                      className="bg-white text-gray-800 placeholder-gray-500"
                      required
                    />
                    {touched.email && emailError && (
                      <p className="text-red-200 text-sm">{emailError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="font-lufga text-sm text-white/90">Password</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(validatePassword(e.target.value));
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-invalid={touched.password && !!passwordError}
                      className="bg-white text-gray-800 placeholder-gray-500"
                      required
                    />
                    {touched.password && passwordError && (
                      <p className="text-red-200 text-sm">{passwordError}</p>
                    )}

                    <div className="mt-2 text-right">
                      <button type="button" onClick={() => setForgotOpen(true)} className="text-white/70 hover:text-white text-sm">Forgot password?</button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !!validateEmail(email) || !!validatePassword(password)}
                    className="w-full h-12 rounded-full bg-orange text-white hover:bg-orange/90 font-lufga text-lg disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>

                {/* Forgot password inline dialog */}
                {forgotOpen && (
                  <div className="mt-4 rounded-xl p-4 bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-lufga text-sm text-white">Reset password</div>
                      <button className="text-white/70" onClick={() => setForgotOpen(false)}>Close</button>
                    </div>
                    <div className="space-y-2">
                      <label className="font-lufga text-sm text-white/80">Email</label>
                      <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" className="bg-white text-gray-800" />
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setForgotOpen(false)}>Cancel</Button>
                        <Button variant="admin" onClick={handleForgot} disabled={!!validateEmail(forgotEmail)}>Send reset</Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-center">
                  <button
                    onClick={() => navigate("/", { replace: true })}
                    className="text-white/80 hover:text-white font-lufga text-sm"
                  >
                    Back to Home
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
