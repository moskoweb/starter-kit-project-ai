import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text, render, toPlainText } from "react-email";
import React, { type ReactNode } from "react";

export type AuthEmail =
  | { type: "verification"; url: string }
  | { type: "reset-password"; url: string }
  | { type: "invitation"; url: string; organizationName: string }
  | { type: "otp"; code: string };

export type RenderedEmail = { subject: string; html: string; text: string };

function actionUrl(value: string): string {
  if (typeof value !== "string" || value.length > 8192 || /[\s\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("Invalid email action URL");
  }
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid email action URL"); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || !(url.protocol === "https:" || (url.protocol === "http:" && local && process.env.NODE_ENV !== "production"))) {
    throw new Error("Email action URL requires HTTPS (HTTP loopback allowed outside production)");
  }
  return url.href;
}

function organizationText(value: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 255 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("Invalid email organization name");
  }
  return value;
}

function content(props: AuthEmail): { subject: string; body: ReactNode; url?: string; action?: string } {
  switch (props.type) {
    case "verification":
      return { subject: "Verificar email", body: "Confirme seu endereço de email para continuar com sua conta.", url: actionUrl(props.url), action: "Verificar email" };
    case "reset-password":
      return { subject: "Redefinir senha", body: "Recebemos uma solicitação para redefinir sua senha. Use o link abaixo para escolher uma nova senha.", url: actionUrl(props.url), action: "Redefinir senha" };
    case "invitation": {
      const organizationName = organizationText(props.organizationName);
      return { subject: `Convite para ${organizationName}`, body: <>Você recebeu um convite para participar de <strong>{organizationName}</strong>. Entre com o endereço que recebeu este convite para continuar.</>, url: actionUrl(props.url), action: "Ver convite" };
    }
    case "otp":
      if (typeof props.code !== "string" || !/^[0-9]{6}$/.test(props.code)) throw new Error("Invalid email OTP code");
      return { subject: "Código de autenticação", body: <>Seu código de autenticação é:<br /><strong style={{ fontSize: "28px", letterSpacing: "6px" }}>{props.code}</strong><br />Não compartilhe este código.</> };
    default:
      throw new Error("Invalid email template type");
  }
}

export function AuthEmailTemplate(props: AuthEmail) {
  const { subject, body, url, action } = content(props);
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "Arial, sans-serif", color: "#18181b", margin: 0 }}>
        <Container style={{ backgroundColor: "#ffffff", maxWidth: "560px", margin: "32px auto", padding: "32px" }}>
          <Heading as="h1" style={{ fontSize: "24px", lineHeight: "32px" }}>{subject}</Heading>
          <Text style={{ fontSize: "16px", lineHeight: "26px" }}>{body}</Text>
          {url && <>
            <Button href={url} style={{ backgroundColor: "#18181b", color: "#ffffff", padding: "14px 20px", borderRadius: "6px", fontSize: "16px" }}>{action}</Button>
            <Text>Se o botão não funcionar, copie e cole este endereço no navegador:</Text>
            <Link href={url} style={{ color: "#27272a", wordBreak: "break-all" }}>{url}</Link>
          </>}
          <Text style={{ color: "#52525b", fontSize: "14px", lineHeight: "22px" }}>Se você não esperava esta mensagem, ignore-a. Nenhuma ação será realizada apenas por receber este email.</Text>
        </Container>
      </Body>
    </Html>
  );
}

// Pure rendering entrypoint: no transport, environment credentials or server-only marker.
export async function renderAuthEmail(props: AuthEmail): Promise<RenderedEmail> {
  const { subject } = content(props);
  const html = await render(<AuthEmailTemplate {...props} />);
  return { subject, html, text: toPlainText(html) };
}
