export const routes = {
  // Public routes
  home: '/',
  useCases: '/use-cases',
  pricing: '/pricing',
  about: '/about',
  contact: '/contact',
  legal: '/legal',
  privacy: '/privacy',

  // Auth routes
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',

  // App routes
  app: {
    overview: '/app/overview',
    documents: '/app/documents',
    chat: '/app/chat',
    workspaces: '/app/workspaces',
    workspaceDetail: (id: string) => `/app/workspaces/${id}`,
    history: '/app/history',
    historyDetail: (id: string) => `/app/history/${id}`,
    evaluation: '/app/evaluation',
    settings: '/app/settings',
    billing: '/app/billing',
    account: '/app/account',
    help: '/app/help',
    guide: '/app/guide',
    feedback: '/app/feedback',
    videos: '/app/videos',
    community: '/app/community',
  },
} as const;
