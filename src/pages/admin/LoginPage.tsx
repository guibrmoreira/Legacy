import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { LogoBadge } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { signIn, session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && isAdmin) navigate(from, { replace: true });
  }, [loading, session, isAdmin, navigate, from]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-navy-950 px-4">
      <div className="hero-glow absolute inset-0" />
      <div className="dark-grid absolute inset-0" />
      <div className="barber-stripes absolute inset-x-0 top-0 h-1.5" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoBadge className="size-24 drop-shadow-[0_16px_32px_rgba(0,0,0,0.4)]" />
          <h1 className="mt-4 font-display text-xl font-semibold uppercase tracking-widest text-white">
            Painel administrativo
          </h1>
          <p className="mt-1 text-sm text-cream-100/50">Acesso restrito ao barbeiro</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl"
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="login-password">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-300 transition-colors hover:text-navy-600 cursor-pointer"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-crimson-50 px-3 py-2 text-sm text-crimson-700 animate-fade-in">
                {error}
              </p>
            )}

            <Button type="submit" variant="red" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="text-white" /> Entrando...
                </>
              ) : (
                <>
                  <Lock className="size-4" /> Entrar
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-5 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-cream-100/50 transition-colors hover:text-cream-100"
          >
            <ArrowLeft className="size-4" /> Voltar ao site
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
