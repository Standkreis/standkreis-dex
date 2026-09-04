'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import superjson from 'superjson'
import type { AppRouter } from '@/server/routers/_app'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

// Same origin in dev and `next start`; the static export (Capacitor) points NEXT_PUBLIC_API_URL at the API host.
const apiUrl = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/trpc`

export function TRPCReactProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }))
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: apiUrl, transformer: superjson, fetch: (url, opts) => fetch(url, { ...opts, credentials: 'include' }) })] }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>{children}</TRPCProvider>
    </QueryClientProvider>
  )
}
