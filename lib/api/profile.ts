// Akses data domain: profile.

import type {
  ApiUserProfile,
  ApiUserProfileUpdate,
} from './types';
import { authenticatedJsonRequest } from './client';

export const profileApi = {
  get: async (): Promise<ApiUserProfile> => {
    return authenticatedJsonRequest<ApiUserProfile>('/api/profile', { method: 'GET' });
  },

  save: async (payload: ApiUserProfileUpdate): Promise<ApiUserProfile> => {
    return authenticatedJsonRequest<ApiUserProfile>('/api/profile', { method: 'PATCH', body: payload });
  },
};
