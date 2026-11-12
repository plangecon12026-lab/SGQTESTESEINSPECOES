import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./sgq.css";
import "./plangecon-design.css";
import ContractGate from './contract-gate';
import './contracts.css';
import PWAInstall from "./pwa-install";

export const metadata: Metadata = {
  title: "SGQ | Testes e Inspeções",
  applicationName: "SGQ",
  description: "Plataforma de testes, inspeções e relatórios do Sistema de Gestão da Qualidade.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SGQ",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/sgq-icon-cartoon.png",
    shortcut: "/sgq-icon-cartoon.png",
    apple: "/icons/sgq-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#103f32",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className="antialiased"
      >
        <ContractGate>{children}<PWAInstall /></ContractGate>
      </body>
    </html>
  );
}
