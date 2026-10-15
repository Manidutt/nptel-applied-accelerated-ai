import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Q_Rice — Instructor-Led Quiz Management System',
  description: 'Smart Assessments. Secure Quizzes. Meaningful Results.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
