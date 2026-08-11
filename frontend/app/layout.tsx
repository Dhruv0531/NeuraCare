import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';

export const metadata: Metadata = {
  title: 'NeuraCare — AI Mental Health Risk Assessment',
  description:
    'A free, anonymous AI-powered mental health screening tool for depression, anxiety, stress, and insomnia. Built for students and working professionals in India.',
  keywords: 'mental health, depression screening, anxiety test, PHQ-9, GAD-7, AI mental health India',
  openGraph: {
    title: 'NeuraCare — AI Mental Health Risk Assessment',
    description: 'Free AI-powered mental health screening for students and professionals in India.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background min-h-screen font-inter antialiased">
        <AuthProvider>
          <Navbar />
          <main className="pt-16">
            {children}
          </main>
          <Toast />
        </AuthProvider>
      </body>
    </html>
  );
}
