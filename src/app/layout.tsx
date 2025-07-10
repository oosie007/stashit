import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { createClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "StashIt",
  description: "Save anything from the web - links, highlights, and more",
  icons: {
    icon: '/images/logo.png',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#111827" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" sizes="180x180" href="/stashit-icons/ios/AppIcon.appiconset/Icon-App-60x60@3x.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/stashit-icons/ios/AppIcon.appiconset/Icon-App-76x76@2x.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/stashit-icons/ios/AppIcon.appiconset/Icon-App-83.5x83.5@2x.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/stashit-icons/android/ic_launcher-web.png" />
        <meta name="apple-mobile-web-app-title" content="StashIt" />
        <meta name="description" content="Save anything from the web - links, highlights, and more" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}