import apiClient from './api';
import type {
  InspectionCreate,
  InspectionUpdate,
  InspectionResponse,
  InspectionDetailResponse,
  ImageUploadResponse,
} from '../types/inspection';

const INSPECTIONS_PREFIX = '/api/inspections';

/**
 * Inspections service — all inspection-related API calls.
 */
const inspectionsService = {
  /** GET /api/v1/inspections — list all inspections */
  list: async (): Promise<InspectionResponse[]> => {
    const { data } = await apiClient.get<InspectionResponse[]>(INSPECTIONS_PREFIX);
    return data;
  },

  /** POST /api/v1/inspections — create new inspection */
  create: async (payload: InspectionCreate = {}): Promise<InspectionResponse> => {
    const { data } = await apiClient.post<InspectionResponse>(INSPECTIONS_PREFIX, payload);
    return data;
  },

  /** GET /api/v1/inspections/:id — get full inspection detail */
  getById: async (id: string): Promise<InspectionDetailResponse> => {
    const { data } = await apiClient.get<InspectionDetailResponse>(`${INSPECTIONS_PREFIX}/${id}`);
    return data;
  },

  /** PATCH /api/v1/inspections/:id — update inspection */
  update: async (id: string, payload: InspectionUpdate): Promise<InspectionResponse> => {
    const { data } = await apiClient.patch<InspectionResponse>(
      `${INSPECTIONS_PREFIX}/${id}`,
      payload,
    );
    return data;
  },

  /** DELETE /api/v1/inspections/:id — delete inspection */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${INSPECTIONS_PREFIX}/${id}`);
  },

  /**
   * POST /api/v1/inspections/:id/images — upload images for an inspection.
   * Accepts one or more File objects.
   */
  uploadImages: async (id: string, files: File[]): Promise<ImageUploadResponse> => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    const { data } = await apiClient.post<ImageUploadResponse>(
      `${INSPECTIONS_PREFIX}/${id}/images`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  /** POST /api/inspections/:id/analyze — trigger OCR + compliance analysis */
  analyze: async (id: string): Promise<InspectionDetailResponse> => {
    const { data } = await apiClient.post<InspectionDetailResponse>(`${INSPECTIONS_PREFIX}/${id}/analyze`);
    return data;
  },

  /** POST /api/inspections/:id/review — submit officer review decision */
  submitReview: async (id: string, payload: { decision: string; comment: string }): Promise<any> => {
    const { data } = await apiClient.post(`${INSPECTIONS_PREFIX}/${id}/review`, payload);
    return data;
  },
};

export default inspectionsService;
