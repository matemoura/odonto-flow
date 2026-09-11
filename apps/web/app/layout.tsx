import type { ReactNode } from "react";
import { Instrument_Serif, Public_Sans } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-instrument-serif",
});

const ui = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-public-sans",
});

export const metadata = {
  title: "Odonto Flow — gestão de clínica odontológica",
  description: "Agenda, prontuário e financeiro para clínicas odontológicas.",
};

export const viewport = {
  themeColor: "#1e4638",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${ui.variable}`}>
      <body>
        <a className="pular-para-conteudo" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
