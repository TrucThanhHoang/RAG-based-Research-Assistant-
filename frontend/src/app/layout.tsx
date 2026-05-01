import "./globals.css";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata = {
  title: "Research Paper Assistant",
  description: "AI-powered research paper Q&A with citations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "ra-toast",
              title: "ra-toast-title",
              description: "ra-toast-description",
              actionButton: "ra-toast-action",
              cancelButton: "ra-toast-cancel",
              closeButton: "ra-toast-close",
            },
          }}
        />
      </body>
    </html>
  );
}
