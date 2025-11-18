import axios from "axios"

export const apiClient = axios.create({
    baseURL : "http://localhost:8080",
    headers : {
        "Content-Type": "application/json",
    },
    withCredentials: true,
})

apiClient.interceptors.request.use((config)=>{
    const token = localStorage.getItem("access_token")
    if(token){
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle 401 errors and refresh token
let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`
                        return apiClient(originalRequest)
                    })
                    .catch((err) => Promise.reject(err))
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                // Try to refresh token
                const response = await apiClient.post('/auth/refresh')
                const newToken = response.data.data.access_token

                // Save new token
                localStorage.setItem('access_token', newToken)

                // Update authorization header
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
                originalRequest.headers.Authorization = `Bearer ${newToken}`

                // Process queued requests
                processQueue(null, newToken)

                isRefreshing = false

                // Retry original request
                return apiClient(originalRequest)
            } catch (refreshError) {
                // Refresh failed - logout
                processQueue(refreshError, null)
                isRefreshing = false

                localStorage.removeItem('access_token')
                window.location.href = '/login'

                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    },

)