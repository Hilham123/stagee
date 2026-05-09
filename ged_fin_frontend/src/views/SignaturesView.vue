<template>
<div class="layout">
<SidebarNav />
<main class="main-content">

<!-- Header -->
<div class="page-header">
<div>
<h1><PenLine :size="28" class="title-icon" /> Signatures</h1>
<p>Gérez les signatures électroniques des documents</p>
</div>
</div>
<!-- Documents approuvés à signer -->
<div class="card" v-if="authStore.isManager || authStore.isAdmin">
<h2 class="card-title">
<FileCheck :size="18" class="title-icon" /> Documents approuvés à signer
</h2>
<div v-if="loadingDocs" class="loading">
<LoaderCircle :size="20" class="spin" /> Chargement...
</div>
<table v-else class="table">
<thead>
<tr><th>Titre</th><th>Catégorie</th><th>Statut</th><th>Signé</th><th>Actions</th></tr>
</thead>
<tbody>
<tr v-if="approvedDocs.length === 0">
<td colspan="5" style="text-align:center; color:#999">Aucun document approuvé à signer</td>
</tr>
<tr v-for="doc in approvedDocs" :key="doc.id">
<td><strong class="clickable" @click="openDocPreview(doc)">{{ doc.title }}</strong></td>
<td>{{ doc.category || '-' }}</td>
<td>
<span :class="`badge badge-${doc.status?.toLowerCase()}`">{{ doc.status }}</span>
</td>
<td>
<CheckCircle v-if="doc.isSigned"  :size="18" color="#16a34a" />
<XCircle     v-else                :size="18" color="#dc2626" />
</td>
<td>
<div class="actions">
    <button class="btn-action" @click="openDocPreview(doc)" title="Prévisualiser">
    <Eye :size="15" />
    </button>
    <button v-if="!doc.isSigned"
    class="btn-action btn-submit" @click="signDocument(doc)" title="Signer">
    <PenLine :size="15" />
    </button>
    <button v-if="doc.isSigned"
    class="btn-action btn-info" @click="viewSignatures(doc)" title="Voir signatures">
    <ShieldCheck :size="15" />
    </button>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<!-- Liste des signatures -->
<div class="card mt-16">
<h2 class="card-title">
<ClipboardList :size="18" class="title-icon" /> Toutes les signatures
</h2>
<div v-if="loadingSigs" class="loading">
<LoaderCircle :size="20" class="spin" /> Chargement...
</div>
<table v-else class="table">
<thead>
<tr><th>Document</th><th>Signé par</th><th>Algorithme</th><th>Statut</th><th>Date</th><th>Actions</th></tr>
</thead>
<tbody>
<tr v-if="signatures.length === 0">
<td colspan="6" style="text-align:center; color:#999">Aucune signature trouvée</td>
</tr>
<tr v-for="sig in signatures" :key="sig.id">
<td>
<strong class="clickable" @click="openSigPreview(sig)">
    {{ sig.metadata?.documentTitle || '-' }}
</strong>
</td>
<td>{{ sig.metadata?.signerName || '-' }}</td>
<td>{{ sig.algorithm }}</td>
<td>
<span :class="`badge ${getSignBadge(sig.status)}`">{{ sig.status }}</span>
</td>
<td>{{ formatDate(sig.signedAt) }}</td>
<td>
<div class="actions">
    <button class="btn-action" @click="openSigPreview(sig)" title="Prévisualiser">
    <Eye :size="15" />
    </button>
    <button class="btn-action btn-info" @click="verifySignature(sig)" title="Vérifier">
    <ShieldCheck :size="15" />
    </button>
    <button v-if="authStore.isAdmin && sig.status === 'VALIDE'"
    class="btn-action btn-danger" @click="openRevoke(sig)" title="Révoquer">
    <ShieldOff :size="15" />
    </button>
</div>
</td>
</tr>
</tbody>
</table>
</div>

</main>

<!-- Modal Prévisualisation Document -->
<BaseModal :show="showPreviewModal" large @close="showPreviewModal = false">
<template #title>
<FileText :size="20" class="title-icon" /> {{ previewDoc?.title }}
</template>

<div class="tabs">
<button :class="`tab ${activeTab === 'info' ? 'tab-active' : ''}`" @click="activeTab = 'info'">
<Info :size="14" /> Informations
</button>
<button :class="`tab ${activeTab === 'preview' ? 'tab-active' : ''}`" @click="activeTab = 'preview'">
<Eye :size="14" /> Prévisualisation
</button>
</div>

<!-- Infos -->
<div v-if="activeTab === 'info'" class="detail-grid">
<div class="detail-row">
<span class="detail-label">Titre</span>
<span>{{ previewDoc?.title }}</span>
</div>
<div class="detail-row">
<span class="detail-label">Catégorie</span>
<span>{{ previewDoc?.category || '-' }}</span>
</div>
<div class="detail-row">
<span class="detail-label">Statut</span>
<span :class="`badge badge-${previewDoc?.status?.toLowerCase()}`">
{{ previewDoc?.status }}
</span>
</div>
<div class="detail-row">
<span class="detail-label">Signé</span>
<span>{{ previewDoc?.isSigned ? 'Oui' : 'Non' }}</span>
</div>
<div class="detail-row">
<span class="detail-label">Fichier</span>
<span>{{ previewDoc?.fileName }}</span>
</div>
</div>

<!-- Prévisualisation -->
<div v-if="activeTab === 'preview'">
<DocumentPreview
v-if="previewDoc"
:key="`doc-${previewDoc.id}-${previewRefresh}`"
:doc-id="previewDoc.id"
:file-name="previewDoc.fileName"
:mime-type="previewDoc.mimeType"
/>
</div>

<template #actions>
<button v-if="previewDoc && !previewDoc.isSigned"
class="btn btn-primary" @click="signDocument(previewDoc); showPreviewModal = false">
<PenLine :size="15" /> Signer
</button>
</template>
</BaseModal>

<!-- Modal Vérification -->
<BaseModal :show="showVerifyModal" @close="showVerifyModal = false">
<template #title>
<ShieldCheck :size="20" class="title-icon" /> Résultat de vérification
</template>
<div v-if="verifyResult" class="verify-result">
<div :class="`verify-status ${verifyResult.isValid ? 'valid' : 'invalid'}`">
<CheckCircle v-if="verifyResult.isValid" :size="24" />
<XCircle     v-else                       :size="24" />
{{ verifyResult.isValid ? 'Signature valide' : 'Signature invalide' }}
</div>
<p class="verify-reason">{{ verifyResult.reason }}</p>
<div class="verify-details" v-if="verifyResult.signature">
<div class="detail-row">
<span class="detail-label">Signataire</span>
<span>{{ verifyResult.signature.metadata?.signerName }}</span>
</div>
<div class="detail-row">
<span class="detail-label">Rôle</span>
<span>{{ verifyResult.signature.metadata?.signerRole }}</span>
</div>
<div class="detail-row">
<span class="detail-label">Date</span>
<span>{{ formatDate(verifyResult.signature.signedAt) }}</span>
</div>
<div class="detail-row">
<span class="detail-label">Algorithme</span>
<span>{{ verifyResult.signature.algorithm }}</span>
</div>
</div>
</div>
</BaseModal>

<!-- Modal Révoquer -->
<BaseModal :show="showRevokeModal" cancel-text="Annuler" @close="showRevokeModal = false">
<template #title>
<ShieldOff :size="20" class="title-icon" color="#dc2626" /> Révoquer la signature
</template>
<div class="form-group">
<label>Raison de révocation *</label>
<textarea v-model="revokeReason" rows="3" placeholder="Expliquez la raison..."></textarea>
</div>
<template #actions>
<button class="btn btn-danger" @click="handleRevoke">
<ShieldOff :size="15" /> Confirmer
</button>
</template>
</BaseModal>
<!-- Modal SignaturePad -->
<BaseModal :show="showSignPadModal" cancel-text="Annuler" @close="showSignPadModal = false" large>
<template #title>
<PenLine :size="20" class="title-icon" /> Signer le document
</template>
<p style="color:#666; margin-bottom:16px">
Document : <strong>{{ docToSign?.title }}</strong>
</p>

<div v-if="loadingPdf" class="loading">
<LoaderCircle :size="20" class="spin" /> Chargement du document...
</div>

<SignaturePad
v-else-if="pdfBytesForSign"
:pdf-bytes="pdfBytesForSign"
:signer-name="authStore.user?.firstName + ' ' + authStore.user?.lastName"
@confirm="handleSign"
/>

<p style="color:#d97706; font-size:13px; display:flex; align-items:center; gap:6px; margin-top:12px; background:#fffbeb; padding:10px 14px; border-radius:8px; border:1px solid #fde68a;">
<AlertTriangle :size="14" /> Cette action est irréversible.
</p>
</BaseModal>

</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore }      from '../stores/auth'
import { documentService, signatureService } from '../services/api'
import SidebarNav      from '../components/SidebarNav.vue'
import BaseModal       from '../components/BaseModal.vue'
import DocumentPreview from '../components/DocumentPreview.vue'
import SignaturePad from '../components/SignaturePad.vue'
import axios from 'axios'
import { PenLine, FileCheck, ClipboardList, LoaderCircle, FileText, CheckCircle, XCircle, Eye, ShieldCheck, ShieldOff, Info, AlertTriangle } from 'lucide-vue-next'
const api = () => axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})
const showSignPadModal = ref(false)
const pdfBytesForSign  = ref(null)
const loadingPdf       = ref(false)
const docToSign        = ref(null)
const authStore    = useAuthStore()
const approvedDocs = ref([])
const signatures   = ref([])
const loadingDocs  = ref(true)
const loadingSigs  = ref(true)
const activeTab    = ref('info')
const previewRefresh = ref(0)  // Force refresh du preview

const showPreviewModal = ref(false)
const showVerifyModal  = ref(false)
const showRevokeModal  = ref(false)
const verifyResult     = ref(null)
const selectedSig      = ref(null)
const previewDoc       = ref(null)
const revokeReason     = ref('')

const formatDate   = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'
const getSignBadge = (s) => ({
VALIDE: 'badge-approuve', INVALIDE: 'badge-rejete', REVOQUEE: 'badge-archive'
})[s] || 'badge-brouillon'

const loadApprovedDocs = async () => {
loadingDocs.value = true
try {
const res = await documentService.list({ status: 'APPROUVE', limit: 50 })
approvedDocs.value = res.data.data
} catch (e) { console.error(e) }
finally { loadingDocs.value = false }
}

const loadSignatures = async () => {
loadingSigs.value = true
try {
const res  = await documentService.list({ limit: 50 })
const docs = res.data.data.filter(d => d.isSigned)
const allSigs = []
for (const doc of docs) {
try {
const r = await signatureService.getByDocument(doc.id)
allSigs.push(...r.data.data)
} catch {}
}
signatures.value = allSigs
} catch (e) { console.error(e) }
finally { loadingSigs.value = false }
}

const openDocPreview = (doc) => {
previewDoc.value       = doc
activeTab.value        = 'info'
previewRefresh.value++
showPreviewModal.value = true
}

const openSigPreview = async (sig) => {
// Charger le document associé à la signature
try {
const res = await documentService.get(sig.documentId)
previewDoc.value = res.data.data
} catch {
previewDoc.value = {
id: sig.documentId,
title: sig.metadata?.documentTitle || 'Document',
fileName: sig.metadata?.fileName || '',
mimeType: '',
}
}
activeTab.value        = 'info'
showPreviewModal.value = true
}

const signDocument = async (doc) => {
docToSign.value        = doc
pdfBytesForSign.value  = null
loadingPdf.value       = true
showSignPadModal.value = true

try {
const res = await api().get(`/documents/${doc.id}/download`, {
responseType: 'arraybuffer'
})
const bytes = new Uint8Array(res.data)
const base64 = btoa(bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), ''))
pdfBytesForSign.value = base64
} catch (e) {
alert('Impossible de charger le document')
showSignPadModal.value = false
} finally {
loadingPdf.value = false
}
}

const handleSign = async (signatureOptions) => {
console.log('SignatureOptions reçues:', signatureOptions)
console.log('signatureImage présent:', !!signatureOptions.signatureImage)
console.log('signatureType:', signatureOptions.signatureType)
try {
const res = await api().post('/signatures/sign', {
    documentId: docToSign.value.id,
    ...signatureOptions
})
const sig = res.data.data
showSignPadModal.value = false
alert(`Document "${docToSign.value.title}" signé avec succès !`)
previewRefresh.value++  // Force le rechargement du preview
loadApprovedDocs()
loadSignatures()
} catch (e) { alert(e.response?.data?.message || 'Erreur signature') }
}

const viewSignatures = async (doc) => {
try {
const r = await signatureService.getByDocument(doc.id)
signatures.value = r.data.data
} catch { alert('Erreur chargement signatures') }
}

const verifySignature = async (sig) => {
try {
const r = await signatureService.verify(sig.id)
verifyResult.value    = r.data.data
showVerifyModal.value = true
} catch { alert('Erreur vérification') }
}

const openRevoke = (sig) => {
selectedSig.value     = sig
revokeReason.value    = ''
showRevokeModal.value = true
}

const handleRevoke = async () => {
if (!revokeReason.value.trim()) { alert('La raison est obligatoire !'); return }
try {
await signatureService.revoke(selectedSig.value.id, { reason: revokeReason.value })
showRevokeModal.value = false
loadSignatures()
alert('Signature révoquée avec succès !')
} catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

onMounted(() => { loadApprovedDocs(); loadSignatures() })
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p  { color: #666; margin-top: 4px; }
.card-title { font-size: 18px; font-weight: 600; color: #1a3a5c; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.mt-16 { margin-top: 16px; }
.loading { text-align: center; padding: 48px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.clickable { cursor: pointer; color: #1a3a5c; }
.clickable:hover { text-decoration: underline; }
.actions { display: flex; gap: 8px; }
.btn-action { padding: 6px 10px; border: none; border-radius: 6px; cursor: pointer; background: #f0f4f8; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-action:hover { opacity: 0.7; }
.btn-submit { background: #dbeafe; color: #2563eb; }
.btn-info   { background: #f0fdf4; color: #16a34a; }
.btn-danger { background: #fee2e2; color: #dc2626; }
.detail-grid { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; gap: 16px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; }
.detail-label { font-weight: 600; color: #555; min-width: 120px; font-size: 14px; }
.tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
.tab { padding: 8px 16px; border: none; background: none; cursor: pointer; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.tab:hover { color: #1a3a5c; }
.tab-active { color: #2563eb; border-bottom-color: #2563eb; }
.title-icon { display: inline-flex; vertical-align: middle; }
.verify-result { text-align: center; padding: 16px 0; }
.verify-status { font-size: 18px; font-weight: 700; padding: 16px; border-radius: 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.valid   { background: #d4edda; color: #155724; }
.invalid { background: #f8d7da; color: #721c24; }
.verify-reason  { color: #666; margin-bottom: 16px; }
.verify-details { text-align: left; background: #f8f9fa; border-radius: 8px; padding: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>