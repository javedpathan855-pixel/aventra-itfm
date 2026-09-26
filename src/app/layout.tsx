import { ReactNode } from "react";
import "./globals.css";
import {
  Great_Vibes,
  Lato,
  Montserrat,
} from "next/font/google";
import { ToastProvider } from "@/shared/components/ui/toast";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-montserrat",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-greatVibes",
});

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body
        className={`${lato.variable} ${montserrat.variable} ${greatVibes.variable} h-screen w-full antialiased`}
        suppressHydrationWarning
      >
        <ToastProvider position="bottom-right">
          {children}
        </ToastProvider>
      </body>
    </html>
  );
};

export default RootLayout;
