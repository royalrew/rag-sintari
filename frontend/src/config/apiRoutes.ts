/**
 * API Routes Configuration
 * Central mapping of all backend endpoints
 */
export const apiRoutes = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
  },
  workspaces: {
    list: '/workspaces',
    detail: (id: string) => `/workspaces/${id}`,
    create: '/workspaces',
    update: (id: string) => `/workspaces/${id}`,
    delete: (id: string) => `/workspaces/${id}`,
  },
  documents: {
    list: '/documents',
    detail: (id: string) => `/documents/${id}`,
    upload: '/documents/upload',
    delete: (id: string) => `/documents/${id}`,
  },
  chat: {
    // Legacy app-level routes; can be mapped to ragRoutes when backend is ready
    ask: '/chat/ask',
    history: '/chat/history',
  },
  evaluation: {
    run: '/evaluation/run',
    summary: '/evaluation/summary',
    testCases: '/evaluation/test-cases',
  },
  billing: {
    checkout: '/billing/checkout',
    portal: '/billing/portal',
    subscription: '/billing/subscription',
  },
} as const;

// RAG backend (FastAPI) endpoints
export const ragRoutes = {
  health: '/health',
  query: '/query',
} as const;
