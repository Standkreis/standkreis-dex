import type { ReactNode } from 'react'
import '../globals.css'

// Root layout for `/` only: it picks a locale on the client and leaves. Everything else lives under [locale].
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body className="font-sans">{children}</body>
    </html>
  )
}
