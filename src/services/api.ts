export const API_BASE_URL =
  'https://api.ethnicsparkles.com/api/';

export type ApiResponse<T> = {
  data: T;
  status: number;
  statusMessage: string;
};

