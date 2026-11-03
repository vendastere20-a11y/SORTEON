// Página de login. Server component (searchParams é Promise no Next 16).
// Usuário já logado é redirecionado para o painel.

import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  if (session) {
    redirect("/painel");
  }
  const params = await searchParams;
  return <LoginForm next={params.next} />;
}
