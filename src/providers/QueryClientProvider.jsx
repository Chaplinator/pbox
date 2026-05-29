import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query'
import { logError, logWarning } from '@/utils/errorLogger'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache stale data for 5 minutes before refetching
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed queries 3 times with exponential backoff
      retry: (failureCount, error) => {
        if (failureCount > 2) return false
        if (error?.status === 404) return false
        if (error?.status === 401) return false
        return true
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
      // Don't refetch when component remounts
      refetchOnMount: false,
      // Don't refetch on reconnect
      refetchOnReconnect: 'stale',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})

// Error handling hook
queryClient.getDefaultOptions().queries.onError = (error, query) => {
  const context = `query:${query.queryKey?.[0] ?? 'unknown'}`
  logError(context, error, { queryKey: query.queryKey })
}

queryClient.getDefaultOptions().mutations.onError = (error, variables, context) => {
  logError('mutation:error', error, { variables })
}

export function QueryClientProviderComponent({ children }) {
  return <TanStackQueryClientProvider client={queryClient}>{children}</TanStackQueryClientProvider>
}

export { queryClient }
