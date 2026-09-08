import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

// Storage keys (for API tokens)
const ACCESS_TOKEN_KEY  = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Types

interface AuthTokens {
    token: string;
    refresh_token?: string;
}

interface QueuedRequest {
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}

// Helpers

export const tokenStorage = {
    getAccess: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
    getRefresh: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
    setAccess: (token: string): void => { localStorage.setItem(ACCESS_TOKEN_KEY, token); },
    setRefresh: (token: string): void => { localStorage.setItem(REFRESH_TOKEN_KEY, token); },
    setTokens: ({ token, refresh_token }: AuthTokens): void => {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    },
    clear: (): void => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
};

// Axios Instantiation

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Inject Bearer token

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        const token = tokenStorage.getAccess();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: unknown) => Promise.reject(error)
);

// Manage expired tokens

let isRefreshing    = false;
let failedQueue: QueuedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
    failedQueue.forEach(({ resolve, reject }) =>
        error ? reject(error) : resolve(token!)
    );
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    async (error: unknown) => {
        const axiosError = error as { config: AxiosRequestConfig & { _retry?: boolean }; response?: { status: number } };
        const originalRequest = axiosError.config;

        // If token expired (401) and there is no retry of the original request
        if (axiosError.response?.status === 401 && !originalRequest._retry) {
            const refreshToken = tokenStorage.getRefresh();
            const accessToken = tokenStorage.getAccess();

            // No refresh token → logout
            if (!refreshToken) {
                tokenStorage.clear();
                window.dispatchEvent(new Event('auth:logout'));
                return Promise.reject(error);
            }

            // Queue the request if a refresh is already in progress
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post<AuthTokens>(
                    `${API_BASE_URL}/api/token/refresh`,
                    { refresh_token: refreshToken, token: accessToken }
                );

                tokenStorage.setTokens(data);
                processQueue(null, data.token);

                (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${data.token}`;
                return apiClient(originalRequest);

            } catch (refreshError: unknown) {
                processQueue(refreshError, null);
                tokenStorage.clear();
                window.dispatchEvent(new Event('auth:logout'));
                return Promise.reject(refreshError);

            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;