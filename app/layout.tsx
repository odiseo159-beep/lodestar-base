import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import BootSequence from "./boot-sequence";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "lodestar — agent-curated discovery",
  description:
    "Discover the best repos, projects and creators — curated by an agent. On Base.",
};

// Inline boot script — runs before hydration so the theme attribute is
// present on <html> from the very first paint. Without this we'd flash
// dark theme for a frame on light-mode users.
const themeBoot = `
  try {
    var t = localStorage.getItem('lodestar.theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: themeBoot }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-screen text-ink">
        <BootSequence>{children}</BootSequence>
      </body>
    </html>
  );
}
