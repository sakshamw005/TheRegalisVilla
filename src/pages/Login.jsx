import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import supabase from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { authError } = useAuth();

  // Populate authError from context if we redirected here with an error
  useEffect(() => {
    if (authError && ['pending_approval', 'rejected', 'suspended', 'user_not_registered'].includes(authError.type)) {
      setError(authError.message);
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (authError) {
        if (authError.message === "Email not confirmed") {
          setError("Your email address is not verified. Please check your inbox and verify your email.");
        } else if (authError.message === "Invalid login credentials") {
          setError("Invalid email or password.");
        } else {
          setError(authError.message || "Login failed");
        }
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError("Login failed. No user returned.");
        setLoading(false);
        return;
      }

      // Check the profile status immediately in the database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        setError("Your profile could not be found. Please contact an administrator.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (profile.status === 'pending') {
        setError("Access Restricted. Your account is pending approval. Administrator approval required.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (profile.status === 'rejected') {
        setError("Your request has been rejected.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (profile.status === 'suspended') {
        setError("Your account has been suspended. Please contact an administrator.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Allow dashboard access if status is active
      window.location.href = "/";
    } catch (err) {
      setError(err?.message || "Login failed");
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      toast({ title: 'Google sign-in failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Welcome back"
      subtitle="Log in to continue"
      footer={
        <>
          Don't have an account? {" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium animate-fade-up" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="text-sm text-center text-muted-foreground mt-4">
        <Link to="/forgot-password" className="text-primary font-medium hover:underline">
          Forgot your password?
        </Link>
      </div>
    </AuthLayout>
  );
}
