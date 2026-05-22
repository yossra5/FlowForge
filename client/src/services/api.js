// client/src/services/api.js
import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

export const authAPI = {
    register: (data) => api.post("/auth/register", data),
    login: (data) => api.post("/auth/login", data),
    logout: () => api.post("/auth/logout"),
    me: () => api.get("/auth/me"),
    updateAvatar: (data) => api.put("/auth/avatar", data),
};

export const workflowAPI = {
    list: () => api.get("/workflows"),
    get: (id) => api.get(`/workflows/${id}`),
    create: (payload) => api.post("/workflows", payload),
    save: (id, payload) => api.put(`/workflows/${id}`, payload),
    delete: (id) => api.delete(`/workflows/${id}`),
};

export const executeAPI = {
    runNode: (parameters) => api.post("/execute", { parameters }),
    runWorkflow: (workflow) => api.post("/execute/workflow", workflow),
};

export default api;