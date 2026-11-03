// Página de cadastro. Server component.
// Usuário já logado é redirecionado para o painel.

import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/register-form";
import { getSession } from "@/lib/auth";

export default async function CadastroPage() {
  const session = await getSession();
  if (session) {
    redirect("/painel");
  }
  return <RegisterForm />;
}
