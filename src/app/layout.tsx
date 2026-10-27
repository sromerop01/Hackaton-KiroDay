import type { Metadata, Viewport } from "next";
import { Creepster, Inter } from "next/font/google";
import "./globals.css";

// Creepster solo para la marca y títulos temáticos; Inter para todo lo que se lee.
const creepster = Creepster({
  variable: "--font-creepster",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FrankenForms",
  description: "Revive tus formularios en papel y conviértelos en formularios web.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${creepster.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
