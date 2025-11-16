/**
 * Evaluation API
 * Handles RAG system evaluation and testing
 */

import { apiPost, apiGet } from './client';
import { apiRoutes } from '@/config/apiRoutes';
import { TestCase, mockTestCases } from '@/lib/mockData';

export interface EvaluationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  pending: number;
  averageAccuracy: number;
}

export interface RunEvaluationRequest {
  workspaceId: string;
  testCaseIds?: string[];
}

export interface RunEvaluationResponse {
  results: TestCase[];
  summary: EvaluationSummary;
}

/**
 * Run evaluation tests
 * POST /api/evaluation/run
 * Body: { workspaceId, testCaseIds? }
 * Returns: Test results and summary
 */
export const runEvaluation = async (
  request: RunEvaluationRequest
): Promise<RunEvaluationResponse> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiPost<RunEvaluationResponse>(apiRoutes.evaluation.run, request);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      const results = mockTestCases;
      const passed = results.filter((t) => t.status === 'pass').length;
      const failed = results.filter((t) => t.status === 'fail').length;
      const pending = results.filter((t) => t.status === 'pending').length;
      const averageAccuracy =
        results.reduce((sum, t) => sum + t.accuracy, 0) / results.length;

      resolve({
        results,
        summary: {
          totalTests: results.length,
          passed,
          failed,
          pending,
          averageAccuracy: Math.round(averageAccuracy),
        },
      });
    }, 2000);
  });
};

/**
 * Get evaluation summary
 * GET /api/evaluation/summary
 * Query params: workspaceId
 * Returns: Evaluation summary statistics
 */
export const getEvaluationSummary = async (
  workspaceId: string
): Promise<EvaluationSummary> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiGet<EvaluationSummary>(`${apiRoutes.evaluation.summary}?workspaceId=${workspaceId}`);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      const results = mockTestCases;
      const passed = results.filter((t) => t.status === 'pass').length;
      const failed = results.filter((t) => t.status === 'fail').length;
      const pending = results.filter((t) => t.status === 'pending').length;
      const averageAccuracy =
        results.reduce((sum, t) => sum + t.accuracy, 0) / results.length;

      resolve({
        totalTests: results.length,
        passed,
        failed,
        pending,
        averageAccuracy: Math.round(averageAccuracy),
      });
    }, 100);
  });
};

/**
 * Get test cases
 * GET /api/evaluation/test-cases
 * Query params: workspaceId
 * Returns: Array of test cases
 */
export const getTestCases = async (workspaceId: string): Promise<TestCase[]> => {
  // TODO: Replace with actual API call when backend is ready
  // return apiGet<TestCase[]>(`${apiRoutes.evaluation.testCases}?workspaceId=${workspaceId}`);
  
  // Mock implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockTestCases);
    }, 100);
  });
};
