"use client";

// Formulário de login (client component).
// POST /api/auth/login (JSON). Erro 401 => "Credenciais inválidas".
// Inclui box destacado com as contas demo e botões de preenchimento rápido.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";

const DEMO_ACCOUNTS = [
  { email: "demo@megasorte.demo", label: "Conta demo (participante)" },
  { email: "admin@megasorte.demo", label: "Conta demo (admin)" },
] as const;

const DEMO_PASSWORD = "demo123";

interface LoginFormProps {
  next?: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function fillDemo(accountEmail: string) {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Credenciais inválidas. Verifique o e-mail e a senha e tente novamente.");
        } else {
          setError("Não foi possível entrar. Tente novamente em instantes.");
        }
        return;
      }
      router.push(next && next.startsWith("/") ? next : "/painel");
      router.refresh();
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>Acesse sua conta para participar das campanhas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <Separator className="my-6" />

          {/* Box de contas demo */}
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-primary">
                DEMO
              </Badge>
              <p className="text-sm font-medium">Contas demo</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Senha das contas demo: <code className="font-mono font-medium text-foreground">{DEMO_PASSWORD}</code>
            </p>
            <div className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <div
                  key={account.email}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{account.email}</p>
                    <p className="text-xs text-muted-foreground">{account.label}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fillDemo(account.email)}
                  >
                    Preencher
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-primary underline-offset-4 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
