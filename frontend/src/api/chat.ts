/**
 * Chat API
 * Handles chat and question-answering operations
 */

import { apiPost } from './client';
import { ragRoutes } from '@/config/apiRoutes';
import { ChatMessage, HistoryItem, mockChatHistory, mockHistory } from '@/lib/mockData';

export interface AskQuestionRequest {
  question: string;
  workspaceId: string;
  documentIds?: string[];
  workspaceIds?: string[];
}

export interface AskQuestionResponse {
  answer: ChatMessage;
}

/**
 * Ask a question against RAG backend
 * POST /query
 */
export const askQuestion = async (
  request: AskQuestionRequest
): Promise<AskQuestionResponse> => {
  const body = {
    query: request.question,
    workspace: request.workspaceId || 'default',
    doc_ids: request.documentIds,
    mode: 'answer',
    verbose: false,
  };

  const res = await apiPost<any>(ragRoutes.query, body);

  const answer: ChatMessage = {
    id: Date.now().toString(),
    role: 'assistant',
    content: res?.answer ?? '',
    sources: (res?.sources ?? []).map((s: any) => ({
      documentName: s?.document_name,
      page: s?.page_number,
      excerpt: s?.snippet,
    })),
    timestamp: new Date().toLocaleString('sv-SE'),
  };

  return { answer };
};

/**
 * Get chat history (mock for now)
 */
export const getChatHistory = async (
  workspaceId?: string,
  limit?: number
): Promise<HistoryItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let history = [...mockHistory];
      if (workspaceId) {
        history = history.filter((item) => item.workspace === (workspaceId || 'default'));
      }
      if (limit) {
        history = history.slice(0, limit);
      }
      resolve(history);
    }, 100);
  });
};

/**
 * Get conversation messages (mock)
 */
export const getConversationMessages = async (
  conversationId: string
): Promise<ChatMessage[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockChatHistory);
    }, 100);
  });
};
