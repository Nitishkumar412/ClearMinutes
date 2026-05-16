import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 120000, // 2 minutes — important for Render's free tier
});

export const getTaskStatuses = (jobId) => api.get(`/api/jobs/${jobId}/tasks`);

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export const updateTaskStatus = (jobId, index, data) =>
  api.patch(`/api/jobs/${jobId}/tasks/${index}`, data);

export const uploadAudio = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        if (onUploadProgress) onUploadProgress(percent);
      }
    },
  });
};

export const getJob = (jobId) => api.get(`/api/jobs/${jobId}`);

export const getDashboard = () => api.get("/api/dashboard");

export const exportJob = (jobId) => {
  window.open(
    `${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/export`,
    "_blank",
  );
};

export default api;
