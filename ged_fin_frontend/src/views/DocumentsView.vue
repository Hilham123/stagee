<template>
<div class="layout">
<SidebarNav />
<main class="main-content">

<!-- Header -->
<div class="page-header">
<div>
    <h1><FileText :size="28" class="title-icon" /> Documents</h1>
    <p>Gérez vos documents électroniques</p>
</div>
<button class="btn btn-primary" @click="showUploadModal = true">
    <Plus :size="16" /> Nouveau document
</button>
</div>

<!-- Filtres -->
<div class="card filters">
<div class="filters-row">
    <div class="form-group">
    <label>Statut</label>
    <select v-model="filters.status" @change="loadDocuments()">
        <option value="">Tous</option>
        <option value="BROUILLON">Brouillon</option>
        <option value="EN_ATTENTE">En attente</option>
        <option value="EN_VALIDATION">En validation</option>
        <option value="APPROUVE">Approuvé</option>
        <option value="REJETE">Rejeté</option>
        <option value="ARCHIVE">Archivé</option>
    </select>
    </div>
    <div class="form-group">
    <label>Catégorie</label>
    <select v-model="filters.category" @change="loadDocuments()">
        <option value="">Toutes</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
    </select>
    </div>
    <div class="form-group">
    <label>Recherche</label>
    <input v-model="searchQuery" type="text" placeholder="Rechercher..."
        @keyup.enter="handleSearch" />
    </div>
    <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:0">
    <button class="btn btn-secondary" @click="handleSearch"><Search :size="15" /></button>
    <button class="btn btn-secondary" @click="resetFilters"><RotateCcw :size="15" /></button>
    </div>
</div>
</div>

<!-- Tableau -->
<div class="card mt-16">
<div v-if="loading" class="loading">
    <LoaderCircle :size="24" class="spin" /> Chargement...
</div>
<table v-else class="table">
    <thead>
    <tr>
        <th>Titre</th><th>Catégorie</th><th>Statut</th>
        <th>Signé</th><th>Créé par</th><th>Date</th><th>Actions</th>
    </tr>
    </thead>
    <tbody>
    <tr v-if="documents.length === 0">
        <td colspan="7" style="text-align:center; color:#999">Aucun document trouvé</td>
    </tr>
    <tr v-for="doc in documents" :key="doc.id">
        <td><strong class="clickable" @click="openDetail(doc)">{{ doc.title }}</strong></td>
        <td>{{ doc.category || '-' }}</td>
        <td>
        <span :class="`badge badge-${doc.status?.toLowerCase()}`">
            {{ formatStatut(doc.status) }}
        </span>
        </td>
        <td>
        <div class="signed-cell">
            <CheckCircle v-if="doc.isSigned" :size="18" color="#22c55e" />
            <XCircle    v-else               :size="18" color="#ef4444" />
            <button v-if="doc.isSigned" class="btn-cachet" @click="openCachet(doc)">
            <ShieldCheck :size="13" /> Cachet
            </button>
        </div>
        </td>
        <td>{{ doc.creator?.firstName }} {{ doc.creator?.lastName }}</td>
        <td>{{ formatDate(doc.createdAt) }}</td>
        <td>
        <div class="actions">
            <button class="btn-action" @click="openDetail(doc)" title="Voir"><Eye :size="15" /></button>
            <button class="btn-action" @click="downloadDoc(doc)" title="Télécharger"><Download :size="15" /></button>
            <button v-if="doc.status === 'BROUILLON'"
            class="btn-action btn-submit" @click="submitWorkflow(doc)" title="Soumettre">
            <Send :size="15" />
            </button>
            <button v-if="doc.status !== 'ARCHIVE' && (authStore.isAdmin || (doc.status === 'BROUILLON' && authStore.isEmployee))"
            class="btn-action btn-danger" @click="deleteDoc(doc)" title="Supprimer">
            <Trash2 :size="15" />
            </button>
        </div>
        </td>
    </tr>
    </tbody>
</table>

<div class="pagination" v-if="pagination.pages > 1">
    <button class="btn btn-secondary" :disabled="pagination.page === 1"
    @click="loadDocuments(pagination.page - 1)">
    <ChevronLeft :size="15" /> Précédent
    </button>
    <span>Page {{ pagination.page }} / {{ pagination.pages }}</span>
    <button class="btn btn-secondary" :disabled="pagination.page === pagination.pages"
    @click="loadDocuments(pagination.page + 1)">
    Suivant <ChevronRight :size="15" />
    </button>
</div>
</div>

</main>

<!-- Modal Détails + Prévisualisation -->
<BaseModal :show="showDetailModal" large @close="showDetailModal = false">
<template #title><FileText :size="20" class="title-icon" /> {{ selectedDoc?.title }}</template>

<!-- Onglets -->
<div class="tabs">
<button :class="`tab ${activeTab === 'info' ? 'tab-active' : ''}`" @click="activeTab = 'info'">
    <Info :size="14" /> Informations
</button>
<button :class="`tab ${activeTab === 'preview' ? 'tab-active' : ''}`" @click="activeTab = 'preview'">
    <Eye :size="14" /> Prévisualisation
</button>
<button v-if="selectedDoc?.workflows?.length"
    :class="`tab ${activeTab === 'history' ? 'tab-active' : ''}`" @click="activeTab = 'history'">
    <History :size="14" /> Historique
</button>
</div>

<!-- Onglet Infos -->
<div v-if="activeTab === 'info'" class="detail-grid">
<div class="detail-row" v-for="field in detailFields" :key="field.label">
    <span class="detail-label">{{ field.label }}</span>
    <span v-if="field.badge" :class="`badge badge-${selectedDoc?.[field.key]?.toLowerCase()}`">
    {{ formatStatut(selectedDoc?.[field.key]) }}
    </span>
    <span v-else>{{ field.format ? field.format(selectedDoc?.[field.key]) : selectedDoc?.[field.key] || '-' }}</span>
</div>
</div>

<!-- Onglet Prévisualisation -->
<div v-if="activeTab === 'preview'">
<DocumentPreview
    v-if="selectedDoc"
    :doc-id="selectedDoc.id"
    :file-name="selectedDoc.fileName"
    :mime-type="selectedDoc.mimeType"
    @download="downloadDoc(selectedDoc)"
/>
</div>

<!-- Onglet Historique -->
<div v-if="activeTab === 'history' && selectedDoc?.workflows?.length">
<table class="table">
    <thead><tr><th>Étape</th><th>Assigné à</th><th>Date</th></tr></thead>
    <tbody>
    <tr v-for="wf in selectedDoc.workflows" :key="wf.id">
        <td><span :class="`badge badge-${wf.currentStep?.toLowerCase()}`">{{ formatStep(wf.currentStep) }}</span></td>
        <td>{{ wf.assignee?.firstName }} {{ wf.assignee?.lastName || '-' }}</td>
        <td>{{ formatDate(wf.updatedAt) }}</td>
    </tr>
    </tbody>
</table>
</div>

<template #actions>
<button class="btn btn-primary" @click="downloadDoc(selectedDoc)">
    <Download :size="15" /> Télécharger
</button>
</template>
</BaseModal>

<!-- Modal Upload -->
<BaseModal :show="showUploadModal" cancel-text="Annuler" @close="showUploadModal = false">
<template #title><Upload :size="20" class="title-icon" /> Nouveau document</template>
<div class="form-group">
<label>Titre *</label>
<input v-model="uploadForm.title" type="text" placeholder="Titre du document" />
</div>
<div class="form-group">
<label>Description</label>
<textarea v-model="uploadForm.description" rows="2" placeholder="Description..."></textarea>
</div>
<div class="form-group">
<label>Catégorie</label>
<select v-model="uploadForm.category">
    <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
</select>
</div>
<div class="form-group">
<label>Fichier *</label>
<input type="file" @change="e => uploadForm.file = e.target.files[0]"
    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png" />
</div>
<div v-if="uploadError" class="error-message">{{ uploadError }}</div>
<template #actions>
<button class="btn btn-primary" @click="handleUpload" :disabled="uploading">
    <LoaderCircle v-if="uploading" :size="15" class="spin" />
    <Upload v-else :size="15" />
    {{ uploading ? 'Upload...' : 'Uploader' }}
</button>
</template>
</BaseModal>

<!-- Modal Workflow -->
<BaseModal :show="showWorkflowModal" cancel-text="Annuler" @close="showWorkflowModal = false">
<template #title><Send :size="20" class="title-icon" /> Soumettre à validation</template>
<p style="color:#666; margin-bottom:16px">Document : <strong>{{ selectedDoc?.title }}</strong></p>
<div class="form-group">
<label>Priorité</label>
<select v-model="workflowForm.priority">
    <option value="BASSE">Basse</option>
    <option value="NORMALE">Normale</option>
    <option value="HAUTE">Haute</option>
    <option value="URGENTE">Urgente</option>
</select>
</div>
<div class="form-group">
<label>Commentaire</label>
<textarea v-model="workflowForm.comment" rows="2" placeholder="Commentaire..."></textarea>
</div>
<template #actions>
<button class="btn btn-primary" @click="handleSubmitWorkflow">
    <Send :size="15" /> Soumettre
</button>
</template>
</BaseModal>



<!-- Modal Cachet -->
<BaseModal :show="showCachetModal" @close="showCachetModal = false">
<template #title><ShieldCheck :size="20" class="title-icon" /> Cachet de signature</template>
<SignatureCachet :data="cachetData || {}" :signed="true" />
</BaseModal>

</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { documentService, workflowService } from '../services/api'
import axios from 'axios'
import SidebarNav       from '../components/SidebarNav.vue'
import BaseModal        from '../components/BaseModal.vue'
import SignatureCachet  from '../components/SignatureCachet.vue'
import DocumentPreview  from '../components/DocumentPreview.vue'
import {FileText, Eye, Download, Send, Trash2, Search, RotateCcw,Plus, CheckCircle, XCircle, ChevronLeft, ChevronRight,LoaderCircle, Upload, History, PenLine, ShieldCheck, AlertTriangle, Info} from 'lucide-vue-next'


const pdfBytesForSign = ref(null)
const loadingPdf      = ref(false)
const authStore   = useAuthStore()
const documents   = ref([])
const loading     = ref(true)
const pagination  = ref({ page: 1, pages: 1 })
const filters     = ref({ status: '', category: '' })
const searchQuery = ref('')
const categories  = ['Technique', 'Commercial', 'Administratif']
const activeTab   = ref('info')

const showUploadModal   = ref(false)
const showWorkflowModal = ref(false)
const showDetailModal   = ref(false)
const showSignModal     = ref(false)
const showCachetModal   = ref(false)
const selectedDoc       = ref(null)
const cachetData        = ref(null)
const uploading         = ref(false)
const signing           = ref(false)
const uploadError       = ref('')

const uploadForm   = ref({ title: '', description: '', category: 'Technique', file: null })
const workflowForm = ref({ priority: 'NORMALE', comment: '' })

const formatDate   = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'
const formatStatut = (s) => ({ BROUILLON:'Brouillon', EN_ATTENTE:'En attente',
EN_VALIDATION:'En validation', APPROUVE:'Approuvé', REJETE:'Rejeté', ARCHIVE:'Archivé' })[s] || s
const formatStep   = (s) => ({ EN_ATTENTE_VALIDATION:'En attente', EN_COURS_VALIDATION:'En cours',
APPROUVE:'Approuvé', REJETE:'Rejeté', ARCHIVE:'Archivé' })[s] || s
const canSign      = (doc) => ['APPROUVE','ARCHIVE'].includes(doc.status)
&& !doc.isSigned && (authStore.isAdmin || authStore.isManager)

const previewHash = computed(() => {
if (!selectedDoc.value) return ''
const str = `${selectedDoc.value.id}:${selectedDoc.value.title}`
return Array.from(str)
.reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)
.toString(16).padStart(8, '0') + '...' + selectedDoc.value.id.slice(-8)
})

const detailFields = [
{ label: 'Statut',      key: 'status',      badge: true },
{ label: 'Catégorie',   key: 'category' },
{ label: 'Fichier',     key: 'fileName' },
{ label: 'Signé',       key: 'isSigned',    format: (v) => v ? 'Oui' : 'Non' },
{ label: 'Description', key: 'description' },
{ label: 'Date',        key: 'createdAt',   format: formatDate },
]

const api = () => axios.create({
baseURL: 'http://localhost:3000/api',
headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const loadDocuments = async (page = 1) => {
loading.value = true
try {
const res        = await documentService.list({ page, limit: 10,
status: filters.value.status || undefined, category: filters.value.category || undefined })
documents.value  = res.data.data
pagination.value = res.data.pagination
} catch (e) { console.error(e) }
finally { loading.value = false }
}

const resetFilters = () => { filters.value = { status: '', category: '' }; searchQuery.value = ''; loadDocuments() }

const handleSearch = async () => {
if (!searchQuery.value.trim()) return loadDocuments()
loading.value = true
try {
const res = await documentService.search(searchQuery.value)
documents.value = res.data.data?.entries || res.data.data || []
} catch (e) { console.error(e) }
finally { loading.value = false }
}

const openDetail = async (doc) => {
activeTab.value = 'info'
try { selectedDoc.value = (await documentService.get(doc.id)).data.data }
catch { selectedDoc.value = doc }
showDetailModal.value = true
}

const handleUpload = async () => {
if (!uploadForm.value.title || !uploadForm.value.file) {
uploadError.value = 'Titre et fichier sont obligatoires.'; return
}
uploading.value = true; uploadError.value = ''
try {
const fd = new FormData()
fd.append('title', uploadForm.value.title)
fd.append('description', uploadForm.value.description)
fd.append('category', uploadForm.value.category)
fd.append('file', uploadForm.value.file)
await documentService.upload(fd)
showUploadModal.value = false
uploadForm.value = { title: '', description: '', category: 'Technique', file: null }
loadDocuments()
} catch (e) { uploadError.value = e.response?.data?.message || 'Erreur upload' }
finally { uploading.value = false }
}

const downloadDoc = async (doc) => {
try {
const res  = await documentService.download(doc.id)
const url  = window.URL.createObjectURL(new Blob([res.data]))
const link = document.createElement('a')
link.href  = url; link.setAttribute('download', doc.fileName || doc.title)
document.body.appendChild(link); link.click(); link.remove()
} catch { alert('Erreur téléchargement') }
}

const submitWorkflow      = (doc) => { selectedDoc.value = doc; showWorkflowModal.value = true }
const openSignModal = async (doc) => {
selectedDoc.value     = doc
pdfBytesForSign.value = null
loadingPdf.value      = true
showSignModal.value   = true

try {
    const res = await documentService.download(doc.id)
    const bytes = new Uint8Array(res.data)
const base64 = btoa(bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), ''))
pdfBytesForSign.value = base64
} catch (e) {
    alert('Impossible de charger le document pour signature')
    showSignModal.value = false
} finally {
    loadingPdf.value = false
}
}
const handleSubmitWorkflow = async () => {
try {
await workflowService.submit({ documentId: selectedDoc.value.id, ...workflowForm.value })
showWorkflowModal.value = false
workflowForm.value = { priority: 'NORMALE', comment: '' }
loadDocuments(); alert('Document soumis avec succès !')
} catch (e) { alert(e.response?.data?.message || 'Erreur') }
}
const handleSign = async (signatureOptions) => {
signing.value = true
try {
const res = await api().post('/signatures/sign', {
    documentId: selectedDoc.value.id,
    ...signatureOptions
})
const sig = res.data.data
cachetData.value = {
    signerName:     `${authStore.user.firstName} ${authStore.user.lastName}`,
    signerRole:     authStore.user.role,
    documentTitle:  selectedDoc.value.title,
    signedAt:       sig.signedAt,
    documentHash:   sig.documentHash,
    signatureValue: sig.signatureValue,
}
showSignModal.value  = false
showCachetModal.value = true
loadDocuments()
} catch (e) { alert(e.response?.data?.message || 'Erreur signature') }
finally { signing.value = false }
}
const openCachet = async (doc) => {
try {
const res = await api().get(`/signatures/document/${doc.id}`)
const sig = res.data.data?.[0]
if (!sig) return alert('Aucune signature trouvée')
cachetData.value = {
signerName:     `${sig.signer?.firstName} ${sig.signer?.lastName}`,
signerRole:     sig.signer?.roleName || sig.metadata?.signerRole || '-',
documentTitle:  sig.metadata?.documentTitle || doc.title,
signedAt:       sig.signedAt,
documentHash:   sig.documentHash,
signatureValue: sig.signatureValue,
}
showCachetModal.value = true
} catch { alert('Erreur chargement cachet') }
}
const deleteDoc = async (doc) => {
if (!confirm(`Supprimer "${doc.title}" ?`)) return
try { await documentService.delete(doc.id); loadDocuments() }
catch { alert('Erreur suppression') }
}
onMounted(() => loadDocuments())
</script>
<style scoped>
.layout { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p { color: #666; margin-top: 4px; }
.filters { margin-bottom: 0; }
.filters-row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
.filters-row .form-group { margin-bottom: 0; min-width: 150px; }
.mt-16 { margin-top: 16px; }
.loading { text-align: center; padding: 48px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.clickable { cursor: pointer; color: #1a3a5c; }
.clickable:hover { text-decoration: underline; }
.signed-cell { display: flex; align-items: center; gap: 6px; }
.btn-cachet { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 20px; padding: 2px 8px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 3px; font-weight: 600; }
.btn-cachet:hover { background: #dcfce7; }
.actions { display: flex; gap: 8px; }
.btn-action { padding: 6px 10px; border: none; border-radius: 6px; cursor: pointer; background: #f0f4f8; transition: opacity 0.2s; display: flex; align-items: center; }
.btn-action:hover { opacity: 0.7; }
.btn-submit { background: #dbeafe; color: #2563eb; }
.btn-danger  { background: #fee2e2; color: #dc2626; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.detail-grid { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; gap: 16px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; }
.detail-label { font-weight: 600; color: #555; min-width: 120px; font-size: 14px; }
.title-icon { display: inline-flex; vertical-align: middle; }
.error-message { background: #fee; border: 1px solid #fcc; color: #c33; padding: 10px 14px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
.cachet-preview { background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.sign-warning { color: #d97706; font-size: 13px; display: flex; align-items: center; gap: 6px; background: #fffbeb; padding: 10px 14px; border-radius: 8px; border: 1px solid #fde68a; }
.tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 0; }
.tab { padding: 8px 16px; border: none; background: none; cursor: pointer; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.tab:hover { color: #1a3a5c; }
.tab-active { color: #2563eb; border-bottom-color: #2563eb; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>