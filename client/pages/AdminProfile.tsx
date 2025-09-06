import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminBack from "@/components/ui/AdminBack";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function AdminProfile() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const url = getApiUrl("/api/users/me/");
        const res = await fetchWithAuth(url, { cache: "no-store" });
        if (!res.ok) {
          toast({ title: "Error", description: "Unable to load profile.", duration: 3000 });
          return;
        }
        const data = await res.json();
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || "");
      } catch (e) {
        toast({ title: "Error", description: "Unable to load profile.", duration: 3000 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const url = getApiUrl("/api/users/me/");
      const res = await fetchWithAuth(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast({ title: "Error", description: payload.detail || "Unable to save.", duration: 3000 });
        return;
      }
      toast({ title: "Success", description: "Profile updated.", duration: 2000 });
    } catch (e) {
      toast({ title: "Error", description: "Unable to save.", duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    setPwSaving(true);
    try {
      const url = getApiUrl("/api/users/change-password/");
      const res = await fetchWithAuth(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const errMsg = payload.old_password ? (Array.isArray(payload.old_password) ? payload.old_password.join(" ") : String(payload.old_password)) : (payload.detail || "Error changing password");
        toast({ title: "Error", description: errMsg, duration: 4000 });
        return;
      }
      toast({ title: "Success", description: "Password changed.", duration: 2000 });
      setOldPassword("");
      setNewPassword("");
    } catch (e) {
      toast({ title: "Error", description: "Error changing password.", duration: 3000 });
    } finally {
      setPwSaving(false);
    }
  };

  const onSendResetEmail = async () => {
    try {
      const url = getApiUrl("/api/users/forgot-password/");
      const res = await fetchWithAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast({ title: "Error", description: payload.detail || "Unable to send email.", duration: 3000 });
        return;
      }
      toast({ title: "Success", description: "Reset link sent if the email exists.", duration: 3000 });
    } catch (e) {
      toast({ title: "Error", description: "Unable to send email.", duration: 3000 });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <AdminBack variant="admin" />
        </div>
        <h1 className="font-lufga text-3xl font-bold text-orange border-b-2 border-orange pb-1">Profile</h1>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="space-y-4">
            <label className="block">
              <div className="mb-1 text-sm text-muted-foreground">First name</div>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>

            <label className="block">
              <div className="mb-1 text-sm text-muted-foreground">Last name</div>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>

            <label className="block">
              <div className="mb-1 text-sm text-muted-foreground">Email</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <div className="flex items-center gap-3">
              <Button variant="admin" onClick={onSave} disabled={saving || loading}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-4 max-w-md">
            <label className="block">
              <div className="mb-1 text-sm text-muted-foreground">Current password</div>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            </label>
            <label className="block">
              <div className="mb-1 text-sm text-muted-foreground">New password</div>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>

            <div className="flex items-center gap-3">
              <Button variant="admin" onClick={onChangePassword} disabled={pwSaving}>{pwSaving ? "..." : "Change password"}</Button>
              <Button variant="secondary" onClick={onSendResetEmail}>Send reset link</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
