'use client'

import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'

// Mints the anonymous identity on first launch by asking who we are. Renders nothing; M7 builds on this.
export function IdentityBoot() {
  const trpc = useTRPC()
  useQuery(trpc.identity.me.queryOptions())
  return null
}
