<template>
  <div class="layout">
    <SidebarNav />
    <main class="main-content">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1><Archive :size="28" class="title-icon" /> Archives</h1>
          <p>Consultation des documents archivés</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <Archive :size="20" color="#6b7280" />
          <div><span class="stat-num">{{ stats.total }}</span><span class="stat-label">Total archivés</span></div>
        </div>
        <div class="stat-card">
          <ShieldCheck :size="20" color="#16a34a" />
          <div><span class="stat-num">{{ stats.signed }}</span><span class="stat-label">Signés</span></div>
        </div>
        <div class="stat-card">
          <FolderOpen :size="20" color="#2563eb" />
          <div><span class="stat-num">{{ stats.categories }}</span><span class="stat-label">Catégories</span></div>
        </div>
        <div class="stat-card">
          <Clock :size="20" color="#d97706" />
          <div><span class="stat-num">{{ stats.thisMonth }}</span><span class="stat-label">Ce mois</span></div>
        </div>
      </div>

      <!-- Filtres -->
      <div class="card">
        <div class="filters-row">
          <div class="form-group">
            <label>Catégorie</label>
            <select v-model="filters.category" @change="loadArchives()">
              <option value="">Toutes</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Signé</label>
            <select v-model="filters.signed" @change="loadArchives()">
              <option value="">Tous</option>
              <option value="true">Signé</option>
              <option value="false">Non signé</option>
            </select>
          </div>
          <div class="form-group">
            <label>Recherche</label>
            <input v-model="filters.search" type="text" placeholder="Titre, description..."
              @keyup.enter="loadArchives()" />
          </div>
          <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:0">
            <button class="btn btn-secondary" @click="loadArchives()"><Search :size="15" /></button>
            <button class="btn btn-secondary" @click="resetFilters()"><RotateCcw :size="15" /></button>
          </div>
        </div>
      </div>

      <!-- Tableau -->
      <div class="card mt-16">
        <div v-if="loading" class="loading">
          <Loader :size="24" class="spin" /> Chargement...
        </div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>Titre</th><th>Catégorie</th><th>Signé</th>
              <th>Créé par</th><th>Archivé le</th><th>Conservation</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="archives.length === 0">
              <td colspan="7" style="text-align:center; color:#999">Aucun document archivé</td>
            </tr>
            <tr v-for="doc in archives" :key="doc.id">
              <td>
                <div class="doc-title">
                  <FileText :size="15" color="#6b7280" />
                  <strong class="clickable" @click="openDetail(doc)">{{ doc.title }}</strong>
                </div>
                <div v-if="doc.description" class="doc-desc">{{ doc.description }}</div>
              </td>
              <td><span class="badge-cat">{{ doc.category || '-' }}</span></td>
              <td>
                <div class="signed-cell">
                  <CheckCircle v-if="doc.isSigned" :size="16" color="#22c55e" />
                  <XCircle    v-else               :size="16" color="#d1d5db" />
                  <button v-if="doc.isSigned" class="btn-cachet" @click="openCachet(doc)">
                    <ShieldCheck :size="12" /> Cachet
                  </button>
                </div>
              </td>
              <td>{{ doc.creator?.firstName }} {{ doc.creator?.lastName }}</td>
              <td>{{ formatDate(doc.archivedAt || doc.updatedAt) }}</td>
              <td>
                <div class="retention-cell">
                  <span class="retention-expiry">Exp: {{ formatDate(getRetentionExpiry(doc)) }}</span>
                  <span :class="`retention-badge ${getRetentionClass(doc)}`">
                    {{ getRetentionLabel(doc) }}
                  </span>
                </div>
              </td>
              <td>
                <div class="actions">
                  <button class="btn-action" @click="openDetail(doc)" title="Voir">
                    <Eye :size="15" />
                  </button>
                  <button class="btn-action" @click="downloadDoc(doc)" title="Télécharger">
                    <Download :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" v-if="pagination.pages > 1">
          <button class="btn btn-secondary" :disabled="pagination.page === 1"
            @click="loadArchives(pagination.page - 1)">
            <ChevronLeft :size="15" /> Précédent
          </button>
          <span>Page {{ pagination.page }} / {{ pagination.pages }}</span>
          <button class="btn btn-secondary" :disabled="pagination.page === pagination.pages"
            @click="loadArchives(pagination.page + 1)">
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
      </div>

      <!-- Infos -->
      <div v-if="activeTab === 'info'" class="detail-grid">
        <div class="detail-row" v-for="f in detailFields" :key="f.label">
          <span class="detail-label">{{ f.label }}</span>
          <span>{{ f.format ? f.format(selectedDoc) : selectedDoc?.[f.key] || '-' }}</span>
        </div>
      </div>

      <!-- Prévisualisation -->
      <div v-if="activeTab === 'preview'">
        <DocumentPreview
          v-if="selectedDoc"
          :doc-id="selectedDoc.id"
          :file-name="selectedDoc.fileName"
          :mime-type="selectedDoc.mimeType"
          @download="downloadDoc(selectedDoc)"
        />
      </div>

      <template #actions>
        <button class="btn btn-primary" @click="downloadDoc(selectedDoc)">
          <Download :size="15" /> Télécharger
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
import { ref, onMounted } from 'vue'
import axios from 'axios'
import SidebarNav      from '../components/SidebarNav.vue'
import BaseModal       from '../components/BaseModal.vue'
import SignatureCachet from '../components/SignatureCachet.vue'
import DocumentPreview from '../components/DocumentPreview.vue'
import {
  Archive, FolderOpen, FileText, ShieldCheck, Clock, Info,
  Search, RotateCcw, Loader, Eye, Download,
  CheckCircle, XCircle, ChevronLeft, ChevronRight
} from 'lucide-vue-next'

const archives   = ref([])
const loading    = ref(true)
const pagination = ref({ page: 1, pages: 1 })
const filters    = ref({ category: '', signed: '', search: '' })
const categories = ['Technique', 'Commercial', 'Administratif']
const stats      = ref({ total: 0, signed: 0, categories: 0, thisMonth: 0 })
const activeTab  = ref('info')

const showDetailModal = ref(false)
const showCachetModal = ref(false)
const selectedDoc     = ref(null)
const cachetData      = ref(null)

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'

const getRetentionExpiry = (doc) => {
  const base = doc.archivedAt || doc.updatedAt
  if (!base) return null
  const expiry = new Date(base)
  expiry.setFullYear(expiry.getFullYear() + (doc.retentionYears || 5))
  return expiry
}

const getRetentionClass = (doc) => {
  const expiry   = getRetentionExpiry(doc)
  if (!expiry) return 'retention-unknown'
  const diffDays = Math.floor((expiry - new Date()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0)   return 'retention-expired'
  if (diffDays < 180) return 'retention-warning'
  return 'retention-ok'
}

const getRetentionLabel = (doc) => {
  const expiry = getRetentionExpiry(doc)
  if (!expiry) return 'N/A'
  const diffDays = Math.floor((expiry - new Date()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return '⚠️ Expiré'
  if (diffDays < 180) return `⚠️ ${Math.floor(diffDays / 30)} mois`
  const years  = Math.floor(diffDays / 365)
  const months = Math.floor((diffDays % 365) / 30)
  return years > 0 ? `✅ ${years}a ${months}m` : `✅ ${months} mois`
}

const detailFields = [
  { label: 'Titre',        key: 'title' },
  { label: 'Catégorie',    key: 'category' },
  { label: 'Fichier',      key: 'fileName' },
  { label: 'Signé',        format: (doc) => doc?.isSigned ? 'Oui' : 'Non' },
  { label: 'Description',  key: 'description' },
  { label: 'Créé le',      format: (doc) => formatDate(doc?.createdAt) },
  { label: 'Archivé le',   format: (doc) => formatDate(doc?.archivedAt || doc?.updatedAt) },
  { label: 'Conservation', format: (doc) => `${doc?.retentionYears || 5} ans` },
  { label: 'Expiration',   format: (doc) => formatDate(getRetentionExpiry(doc)) },
]

const api = () => axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const loadArchives = async (page = 1) => {
  loading.value = true
  try {
    const params = { page, limit: 10, status: 'ARCHIVE' }
    if (filters.value.category) params.category = filters.value.category
    if (filters.value.search)   params.search   = filters.value.search
    const res  = await api().get('/documents', { params })
    let docs   = res.data.data || []
    if (filters.value.signed !== '')
      docs = docs.filter(d => String(d.isSigned) === filters.value.signed)
    archives.value   = docs
    pagination.value = res.data.pagination || { page: 1, pages: 1 }
    stats.value.total      = res.data.pagination?.total || docs.length
    stats.value.signed     = docs.filter(d => d.isSigned).length
    stats.value.categories = [...new Set(docs.map(d => d.category).filter(Boolean))].length
    const thisMonth        = new Date().getMonth()
    stats.value.thisMonth  = docs.filter(d => new Date(d.updatedAt).getMonth() === thisMonth).length
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const resetFilters = () => { filters.value = { category: '', signed: '', search: '' }; loadArchives() }

const openDetail = (doc) => {
  selectedDoc.value     = doc
  activeTab.value       = 'info'
  showDetailModal.value = true
}

const downloadDoc = async (doc) => {
  try {
    const res  = await api().get(`/documents/${doc.id}/download`, { responseType: 'blob' })
    const url  = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', doc.fileName || doc.title)
    document.body.appendChild(link); link.click(); link.remove()
  } catch { alert('Erreur téléchargement') }
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

onMounted(() => loadArchives())
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p { color: #666; margin-top: 4px; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: white; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-num { display: block; font-size: 24px; font-weight: 700; color: #1a3a5c; }
.stat-label { font-size: 12px; color: #6b7280; }
.filters-row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
.filters-row .form-group { margin-bottom: 0; min-width: 150px; }
.mt-16 { margin-top: 16px; }
.loading { text-align: center; padding: 48px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.clickable { cursor: pointer; color: #1a3a5c; }
.clickable:hover { text-decoration: underline; }
.doc-title { display: flex; align-items: center; gap: 6px; }
.doc-desc { font-size: 12px; color: #9ca3af; margin-top: 2px; padding-left: 21px; }
.badge-cat { background: #eff6ff; color: #2563eb; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.signed-cell { display: flex; align-items: center; gap: 6px; }
.btn-cachet { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 20px; padding: 2px 8px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 3px; font-weight: 600; }
.btn-cachet:hover { background: #dcfce7; }
.actions { display: flex; gap: 8px; }
.btn-action { padding: 6px 10px; border: none; border-radius: 6px; cursor: pointer; background: #f0f4f8; transition: opacity 0.2s; display: flex; align-items: center; }
.btn-action:hover { opacity: 0.7; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.detail-grid { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; gap: 16px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; }
.detail-label { font-weight: 600; color: #555; min-width: 120px; font-size: 14px; }
.title-icon { display: inline-flex; vertical-align: middle; }
.tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
.tab { padding: 8px 16px; border: none; background: none; cursor: pointer; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.tab:hover { color: #1a3a5c; }
.tab-active { color: #2563eb; border-bottom-color: #2563eb; }
.retention-cell { display: flex; flex-direction: column; gap: 4px; }
.retention-expiry { font-size: 11px; color: #6b7280; }
.retention-badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 600; width: fit-content; }
.retention-ok      { background: #dcfce7; color: #16a34a; }
.retention-warning { background: #fff7ed; color: #ea580c; }
.retention-expired { background: #fee2e2; color: #dc2626; }
.retention-unknown { background: #f3f4f6; color: #6b7280; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>