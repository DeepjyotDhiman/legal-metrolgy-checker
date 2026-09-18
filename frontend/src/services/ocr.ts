import apiClient from './api';
import type { OCRResultResponse } from '../types/inspection';
import type { TriggerOCRResponse } from '../types/ocr';

const OCR_PREFIX = '/api/inspections';

/**
 * OCR service — OCR-specific API calls.
 * Note: trigger analyze lives in inspectionsService.analyze().
 * This service exposes result retrieval helpers.
 */
const ocrService = {
  /**
   * GET /api/v1/inspections/:id/ocr — get OCR results for an inspection.
   */
  getResults: async (inspectionId: string): Promise<OCRResultResponse[]> => {
    const { data } = await apiClient.get<OCRResultResponse[]>(
      `${OCR_PREFIX}/${inspectionId}/ocr`,
    );
    return data;
  },

  /**
   * POST /api/v1/inspections/:id/analyze — trigger full OCR + compliance pipeline.
   * Thin wrapper; full trigger is also available in inspectionsService.
   */
  triggerAnalysis: async (inspectionId: string): Promise<TriggerOCRResponse> => {
    const { data } = await apiClient.post<TriggerOCRResponse>(
      `${OCR_PREFIX}/${inspectionId}/analyze`,
    );
    return data;
  },
};

export default ocrService;
