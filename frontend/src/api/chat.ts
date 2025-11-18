/**
 * Chat API
 * Handles chat and question-answering operations
 */

import { ChatMessage, HistoryItem, mockChatHistory, mockHistory } from '@/lib/mockData';
import { queryRAG } from './ragClient';

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
  const res = await queryRAG({
    query: request.question,
    workspace: request.workspaceId || 'default',
    doc_ids: request.documentIds,
    mode: 'answer',
    verbose: false,
  });

  // Extract sources from response
  const sources = (res?.sources ?? []).map((s) => ({
    documentName: s?.document_name ?? 'Okänt dokument',
    page: s?.page_number, // Optional - may be undefined
    excerpt: s?.snippet ?? '',
  }));

  // Clean answer content - remove sources section if we have sources array
  // Backend sometimes includes "Källor:\n- ..." in the answer text
  let cleanedContent = res?.answer ?? '';
  if (sources.length > 0) {
    // Remove common source patterns from answer text
    // Matches patterns like:
    // - "Källor:\n- T100.docx s.1"
    // - "Källor: T100.docx (s. 1)"
    // - "Källor:\nT100.docx s.1\n20:23"
    cleanedContent = cleanedContent
      // Remove "Källor:" followed by bullet list or text, up to timestamp or end
      .replace(/\n?\s*Källor:\s*\n?(-.*?)(?:\n\n|\n\d{1,2}:\d{2}|\n$|$)/gis, '')
      .replace(/\n?\s*Källor:\s*([^\n]+(?:\n[^\n]+)*?)(?:\n\n|\n\d{1,2}:\d{2}|\n$|$)/gis, '')
      // Also remove standalone source lines that match our source format
      .replace(/\n?\s*([A-Za-z0-9_-]+\.(?:docx?|pdf|txt|md))\s*\(?s\.\s*\d+\)?\s*(?:\n\n|\n\d{1,2}:\d{2}|\n$|$)/gi, '')
      .trim();
  }

  const answer: ChatMessage = {
    id: Date.now().toString(),
    role: 'assistant',
    content: cleanedContent,
    sources: sources,
    timestamp: new Date().toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
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
