import type { Metadata } from "next";
import { AuthListener } from "@/components/auth/auth-listener";
import { Provider } from "@/components/ui/provider";
import { Toaster } from "@/components/ui/toaster";
import { Albert_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const albertSans = Albert_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const domine = localFont({
  src: "./fonts/Domine-VariableFont_wght.ttf",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Workpals",
  description: "CV alignment engine — optimize your job applications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${albertSans.variable} ${domine.variable}`}
    >
      <body
        suppressHydrationWarning
        style={{ fontFamily: "var(--font-sans), sans-serif" }}
      >
        <Provider>
          <AuthListener>
            <div style={{ position: "relative" }}>
              {/* Global dotted background — top of page, scrolls with content */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "80vh",
                  zIndex: 0,
                  pointerEvents: "none",
                  backgroundImage:
                    "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  maskImage:
                    "linear-gradient(to bottom, black 0%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 0%, transparent 100%)",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
            </div>
            <Toaster />
          </AuthListener>
        </Provider>
      </body>
    </html>
  );
}
