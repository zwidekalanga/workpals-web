import type { Metadata } from 'next'
import { AuthListener } from '@/components/auth/auth-listener'
import { Provider } from '@/components/ui/provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Workpals',
  description: 'CV alignment engine — optimize your job applications',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Provider>
          <AuthListener>
            {children}
            <Toaster />
          </AuthListener>
        </Provider>
      </body>
    </html>
  )
}
