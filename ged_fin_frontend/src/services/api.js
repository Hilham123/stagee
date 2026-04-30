import axios from 'axios'
// INSTANCE AXIOS CONFIGURÉE
const api = axios.create({
baseURL: 'http://localhost:3000/api',
timeout: 30000,
headers: { 'Content-Type': 'application/json' },
})

//ajoute le token JWT
api.interceptors.request.use((config) => {
const token = localStorage.getItem('token')
if (token) {
config.headers.Authorization = `Bearer ${token}`
}
return config
})


// INTERCEPTEUR RESPONSE : gère les erreurs
api.interceptors.response.use(
(response) => response,
(error) => {
if (error.response?.status === 401) {
// Token expiré → déconnexion automatique
localStorage.removeItem('token')
localStorage.removeItem('user')
window.location.href = '/login'
}
return Promise.reject(error)
}
)
// SERVICES AUTH
export const authService = {
login:          (data) => api.post('/auth/login', data),
register:       (data) => api.post('/auth/register', data),
getMe:          ()     => api.get('/auth/me'),
changePassword: (data) => api.put('/auth/change-password', data),
}

export const courrierService = {
list:        (params)     => api.get('/courriers', { params }),
get:         (id)         => api.get(`/courriers/${id}`),
create:      (data)       => api.post('/courriers', data),
update:      (id, data)   => api.put(`/courriers/${id}`, data),
changeStatut:(id, statut) => api.put(`/courriers/${id}/statut`, { statut }),
delete:      (id)         => api.delete(`/courriers/${id}`),
stats:       (params) => api.get('/courriers/stats', { params }),
dispatch:           (id, data) => api.put(`/courriers/${id}/dispatch`, data),
approbation:        (id)       => api.put(`/courriers/${id}/approbation`),
approuver:          (id)       => api.put(`/courriers/${id}/approuver`),
creerReponse:       (id, data) => api.post(`/courriers/${id}/reponse`, data),
getHistorique:      (id)       => api.get(`/courriers/${id}/historique`),
signerCourrier:     (id, data) => api.put(`/courriers/${id}/signer`, data),
}


//  Ajouter le service pour les services
export const serviceService = {
getAll: () => api.get('/services'),
}

// SERVICES DOCUMENTS
export const documentService = {
list:     (params) => api.get('/documents', { params }),
get:      (id)     => api.get(`/documents/${id}`),
upload:   (data)   => api.post('/documents/upload', data, {
headers: { 'Content-Type': 'multipart/form-data' },
}),
update:   (id, data) => api.put(`/documents/${id}`, data),
delete:   (id)       => api.delete(`/documents/${id}`),
download: (id)       => api.get(`/documents/${id}/download`, {
responseType: 'blob',
}),
versions: (id)       => api.get(`/documents/${id}/versions`),
search:   (q)        => api.get('/documents/search', { params: { q } }),
}
// SERVICES WORKFLOWS
export const workflowService = {
list:       (params) => api.get('/workflows', { params }),
get:        (id)     => api.get(`/workflows/${id}`),
submit:     (data)   => api.post('/workflows/submit', data),
takeCharge: (id)     => api.put(`/workflows/${id}/take-charge`),
approve:    (id, data) => api.put(`/workflows/${id}/approve`, data),
reject:     (id, data) => api.put(`/workflows/${id}/reject`, data),
archive:    (id)       => api.put(`/workflows/${id}/archive`),
}
// SERVICES SIGNATURE
export const signatureService = {
sign:               (data) => api.post('/signatures/sign', data),
verify:             (id)   => api.get(`/signatures/${id}/verify`),
revoke:             (id, data) => api.put(`/signatures/${id}/revoke`, data),
getByDocument:      (documentId) => api.get(`/signatures/document/${documentId}`),
}
// SERVICES DASHBOARD
export const dashboardService = {
get: () => api.get('/dashboard'),
}



export default api