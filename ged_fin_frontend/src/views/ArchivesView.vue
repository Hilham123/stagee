<template>
<div class="layout">
  <SidebarNav />
  <main class="main-content">

    <div class="page-header">
      <div>
        <h1><Archive :size="28" class="title-icon" /> Archives</h1>
        <p>Consultation des documents et courriers archivés</p>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <Archive :size="20" color="#6b7280" />
        <div>
          <span class="stat-num">{{ stats.totalDocs + stats.totalCourriers }}</span>
          <span class="stat-label">Total archivés</span>
        </div>
      </div>
      <div class="stat-card">
        <FileText :size="20" color="#2563eb" />
        <div>
          <span class="stat-num">{{ stats.totalDocs }}</span>
          <span class="stat-label">Documents</span>
        </div>
      </div>
      <div class="stat-card">
        <Mail :size="20" color="#7c3aed" />
        <div>
          <span class="stat-num">{{ stats.totalCourriers }}</span>
          <span class="stat-label">Courriers</span>
        </div>
      </div>
      <div class="stat-card">
        <ShieldCheck :size="20" color="#16a34a" />
        <div>
          <span class="stat-num">{{ stats.signed }}</span>
          <span class="stat-label">Signés</span>
        </div>
      </div>
    </div>

    <div class="main-tabs-row">
      <button :class="['main-tab', activeMainTab === 'documents' ? 'main-tab-active' : '']"
        @click="switchMainTab('documents')">
        <FileText :size="15" /> Documents archivés
        <span class="tab-count">{{ stats.totalDocs }}</span>
      </button>
      <button :class="['main-tab', activeMainTab === 'courriers' ? 'main-tab-active' : '']"
        @click="switchMainTab('courriers')">
        <Mail :size="15" /> Courriers archivés
        <span class="tab-count">{{ stats.totalCourriers }}</span>
      </button>
    </div>

    <!-- SECTION DOCUMENTS -->
    <template v-if="activeMainTab === 'documents'">
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
            <input v-model="filters.search" type="text" placeholder="Titre..." @keyup.enter="loadArchives()" />
          </div>
          <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:0">
            <button class="btn btn-secondary" @click="loadArchives()"><Search :size="15" /></button>
            <button class="btn btn-secondary" @click="resetFilters()"><RotateCcw :size="15" /></button>
          </div>
        </div>
      </div>

      <div class="card mt-16">
        <div v-if="loading" class="loading">
          <LoaderCircle :size="24" class="spin" /> Chargement...
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
                  <button class="btn-action" @click="openDetail(doc)" title="Voir"><Eye :size="15" /></button>
                  <button class="btn-action" @click="downloadDoc(doc)" title="Télécharger"><Download :size="15" /></button>
                  <button class="btn-action btn-retention" @click="openDocRetention(doc)" title="Modifier durée">
                    <Clock :size="15" />
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
    </template>

    <!-- SECTION COURRIERS -->
    <template v-if="activeMainTab === 'courriers'">
      <div class="card">
        <div class="filters-row">
          <div class="form-group">
            <label>Type</label>
            <select v-model="courrierFilters.type" @change="loadCourrierArchives()">
              <option value="">Tous</option>
              <option value="ENTRANT">Entrant</option>
              <option value="SORTANT">Sortant</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nature</label>
            <select v-model="courrierFilters.nature" @change="loadCourrierArchives()">
              <option value="">Toutes</option>
              <option value="EXTERNE">Externe</option>
              <option value="INTERNE">Interne</option>
            </select>
          </div>
          <div class="form-group">
            <label>Recherche</label>
            <input v-model="courrierFilters.search" type="text" placeholder="Objet, expéditeur..."
              @keyup.enter="loadCourrierArchives()" />
          </div>
          <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:0">
            <button class="btn btn-secondary" @click="loadCourrierArchives()"><Search :size="15" /></button>
            <button class="btn btn-secondary" @click="resetCourrierFilters()"><RotateCcw :size="15" /></button>
          </div>
        </div>
      </div>

      <div class="card mt-16">
        <div v-if="loadingCourriers" class="loading">
          <LoaderCircle :size="24" class="spin" /> Chargement...
        </div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>Référence</th><th>Type</th><th>Nature</th>
              <th>Objet</th><th>Expéditeur</th><th>Destinataire</th>
              <!-- ✅ NOUVEAU : colonne Conservation -->
              <th>Signé</th><th>Archivé le</th><th>Conservation</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="courrierArchives.length === 0">
              <td colspan="10" style="text-align:center; color:#999">Aucun courrier archivé</td>
            </tr>
            <tr v-for="c in courrierArchives" :key="c.id">
              <td>
                <strong class="clickable" @click="openCourrierDetail(c)">{{ c.reference }}</strong>
              </td>
              <td>
                <span :class="`badge-simple ${c.type === 'ENTRANT' ? 'type-entrant' : 'type-sortant'}`">
                  <ArrowDownCircle v-if="c.type === 'ENTRANT'" :size="11" />
                  <ArrowUpCircle   v-else :size="11" />
                  {{ c.type === 'ENTRANT' ? 'Entrant' : 'Sortant' }}
                </span>
              </td>
              <td>
                <span :class="`badge-simple ${c.nature === 'EXTERNE' ? 'nature-externe' : 'nature-interne'}`">
                  <Globe     v-if="c.nature === 'EXTERNE'" :size="11" />
                  <Building2 v-else :size="11" />
                  {{ c.nature === 'EXTERNE' ? 'Externe' : 'Interne' }}
                </span>
              </td>
              <td>{{ c.objet }}</td>
              <td>{{ c.expediteur }}</td>
              <td>{{ c.destinataire }}</td>
              <td>
                <div class="signed-cell">
                  <CheckCircle v-if="c.isSigned" :size="16" color="#22c55e" />
                  <XCircle    v-else              :size="16" color="#d1d5db" />
                </div>
              </td>
              <td>{{ formatDate(c.archivedAt || c.updatedAt) }}</td>
              <!-- ✅ NOUVEAU : cellule conservation courrier -->
              <td>
                <div class="retention-cell">
                  <span class="retention-expiry">Exp: {{ formatDate(getRetentionExpiry(c)) }}</span>
                  <span :class="`retention-badge ${getRetentionClass(c)}`">
                    {{ getRetentionLabel(c) }}
                  </span>
                </div>
              </td>
              <td>
                <div class="actions">
                  <button class="btn-action" @click="openCourrierDetail(c)" title="Voir détails">
                    <Eye :size="15" />
                  </button>
                  <!-- ✅ NOUVEAU : bouton modifier durée courrier -->
                  <button class="btn-action btn-retention" @click="openCourrierRetention(c)" title="Modifier durée">
                    <Clock :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" v-if="courrierPagination.pages > 1">
          <button class="btn btn-secondary" :disabled="courrierPagination.page === 1"
            @click="loadCourrierArchives(courrierPagination.page - 1)">
            <ChevronLeft :size="15" /> Précédent
          </button>
          <span>Page {{ courrierPagination.page }} / {{ courrierPagination.pages }}</span>
          <button class="btn btn-secondary" :disabled="courrierPagination.page === courrierPagination.pages"
            @click="loadCourrierArchives(courrierPagination.page + 1)">
            Suivant <ChevronRight :size="15" />
          </button>
        </div>
      </div>
    </template>

  </main>

  <!-- Modal Détails Document -->
  <BaseModal :show="showDetailModal" large @close="showDetailModal = false">
    <template #title><FileText :size="20" class="title-icon" /> {{ selectedDoc?.title }}</template>
    <div class="tabs">
      <button :class="`tab ${activeTab === 'info' ? 'tab-active' : ''}`" @click="activeTab = 'info'">
        <Info :size="14" /> Informations
      </button>
      <button :class="`tab ${activeTab === 'preview' ? 'tab-active' : ''}`" @click="activeTab = 'preview'">
        <Eye :size="14" /> Prévisualisation
      </button>
    </div>
    <div v-if="activeTab === 'info'" class="detail-grid">
      <div class="detail-row" v-for="f in detailFields" :key="f.label">
        <span class="detail-label">{{ f.label }}</span>
        <span>{{ f.format ? f.format(selectedDoc) : selectedDoc?.[f.key] || '-' }}</span>
      </div>
    </div>
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

  <!-- Modal Détails Courrier -->
  <BaseModal :show="showCourrierDetailModal" large @close="showCourrierDetailModal = false">
    <template #title>
      <Mail :size="20" class="title-icon" /> {{ selectedCourrier?.reference }}
      <span v-if="selectedCourrier?.isSigned" class="badge-simple statut-approuve"
        style="margin-left:8px; font-size:11px;">
        <PenLine :size="11" /> Signé
      </span>
    </template>
    <div class="detail-grid">
      <div class="detail-row">
        <span class="detail-label">Référence</span>
        <span>{{ selectedCourrier?.reference }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Type</span>
        <span :class="`badge-simple ${selectedCourrier?.type === 'ENTRANT' ? 'type-entrant' : 'type-sortant'}`">
          {{ selectedCourrier?.type === 'ENTRANT' ? 'Entrant' : 'Sortant' }}
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Nature</span>
        <span :class="`badge-simple ${selectedCourrier?.nature === 'EXTERNE' ? 'nature-externe' : 'nature-interne'}`">
          {{ selectedCourrier?.nature === 'EXTERNE' ? 'Externe' : 'Interne' }}
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Objet</span>
        <span>{{ selectedCourrier?.objet }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Expéditeur</span>
        <span>{{ selectedCourrier?.expediteur }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Destinataire</span>
        <span>{{ selectedCourrier?.destinataire }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Service dest.</span>
        <span>{{ selectedCourrier?.serviceDestinataire?.nom || '—' }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Priorité</span>
        <span :class="`badge-simple ${getPriorityClass(selectedCourrier?.priorite)}`">
          {{ selectedCourrier?.priorite }}
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Signé</span>
        <span>{{ selectedCourrier?.isSigned ? 'Oui' : 'Non' }}</span>
      </div>
      <div class="detail-row" v-if="selectedCourrier?.isSigned">
        <span class="detail-label">Signé par</span>
        <span>{{ selectedCourrier?.signatureData?.signerName || '—' }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Notes</span>
        <span>{{ selectedCourrier?.notes || '—' }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Archivé le</span>
        <span>{{ formatDate(selectedCourrier?.archivedAt || selectedCourrier?.updatedAt) }}</span>
      </div>
      <!-- ✅ NOUVEAU : Conservation dans le détail -->
      <div class="detail-row">
        <span class="detail-label">Conservation</span>
        <span>{{ selectedCourrier?.retentionYears || 5 }} ans</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Expiration</span>
        <span>{{ formatDate(getRetentionExpiry(selectedCourrier)) }}</span>
      </div>
    </div>
    <div v-if="courrierHistorique.length" class="historique-section">
      <h3 class="historique-title"><Clock :size="14" /> Historique</h3>
      <div v-for="h in courrierHistorique" :key="h.id" class="historique-item">
        <span class="historique-action">{{ formatAction(h.action) }}</span>
        <span class="historique-details">{{ h.details }}</span>
        <span class="historique-date">{{ formatDate(h.createdAt) }}</span>
        <span class="historique-user">{{ h.user?.firstName }} {{ h.user?.lastName }}</span>
      </div>
    </div>
  </BaseModal>

  <!-- Modal Cachet -->
  <BaseModal :show="showCachetModal" @close="showCachetModal = false">
    <template #title><ShieldCheck :size="20" class="title-icon" /> Cachet de signature</template>
    <SignatureCachet :data="cachetData || {}" :signed="true" />
  </BaseModal>

  <!-- Modal Durée de rétention — DOCUMENTS -->
  <BaseModal :show="showRetentionModal" cancel-text="Annuler" @close="showRetentionModal = false">
    <template #title>
      <Clock :size="20" class="title-icon" /> Modifier la durée de conservation
    </template>
    <p style="color:#666; margin-bottom:16px">
      Document : <strong>{{ retentionDoc?.title }}</strong>
    </p>
    <div class="form-group">
      <label>Durée de conservation (en années) *</label>
      <input v-model.number="newRetentionYears" type="number" min="1" max="99" placeholder="Ex: 5" />
      <p class="field-hint">
        Date d'expiration actuelle :
        <strong>{{ formatDate(getRetentionExpiry(retentionDoc)) }}</strong>
      </p>
    </div>
    <template #actions>
      <button class="btn btn-primary" @click="handleDocRetention">
        <Clock :size="15" /> Confirmer
      </button>
    </template>
  </BaseModal>

  <!-- ✅ NOUVELLE Modal Durée de rétention — COURRIERS -->
  <BaseModal :show="showCourrierRetentionModal" cancel-text="Annuler" @close="showCourrierRetentionModal = false">
    <template #title>
      <Clock :size="20" class="title-icon" color="#7c3aed" /> Durée de conservation — Courrier
    </template>
    <p style="color:#666; margin-bottom:8px">
      Courrier : <strong>{{ retentionCourrier?.reference }}</strong>
    </p>
    <p style="color:#888; font-size:13px; margin-bottom:16px">
      Objet : {{ retentionCourrier?.objet }}
    </p>
    <div class="form-group">
      <label>Durée de conservation (années)</label>
      <select v-model="newCourrierRetentionYears">
        <option :value="1">1 an</option>
        <option :value="2">2 ans</option>
        <option :value="3">3 ans</option>
        <option :value="5">5 ans (défaut)</option>
        <option :value="10">10 ans</option>
        <option :value="15">15 ans</option>
        <option :value="20">20 ans</option>
        <option :value="30">30 ans</option>
      </select>
      <p class="field-hint">
        Date d'expiration estimée :
        <strong>{{
          retentionCourrier?.archivedAt || retentionCourrier?.updatedAt
            ? formatDate(new Date(new Date(retentionCourrier.archivedAt || retentionCourrier.updatedAt).setFullYear(
                new Date(retentionCourrier.archivedAt || retentionCourrier.updatedAt).getFullYear() + newCourrierRetentionYears
              )))
            : '—'
        }}</strong>
      </p>
    </div>
    <template #actions>
      <button class="btn btn-primary" @click="handleCourrierRetention">
        <Clock :size="15" /> Confirmer
      </button>
    </template>
  </BaseModal>

</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import SidebarNav      from '../components/SidebarNav.vue'
import BaseModal       from '../components/BaseModal.vue'
import SignatureCachet from '../components/SignatureCachet.vue'
import DocumentPreview from '../components/DocumentPreview.vue'
import {
  Archive, FileText, ShieldCheck, Clock, Info,
  Search, RotateCcw, LoaderCircle, Eye, Download, Mail, PenLine,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  ArrowDownCircle, ArrowUpCircle, Globe, Building2
} from 'lucide-vue-next'

const activeMainTab = ref('documents')
const stats = ref({ totalDocs: 0, totalCourriers: 0, signed: 0, thisMonth: 0 })

// ── Documents ─────────────────────────────────────────────────────────────────
const archives    = ref([])
const loading     = ref(true)
const pagination  = ref({ page: 1, pages: 1 })
const filters     = ref({ category: '', signed: '', search: '' })
const categories  = ['Technique', 'Commercial', 'Administratif']
const activeTab   = ref('info')
const showDetailModal = ref(false)
const showCachetModal = ref(false)
const selectedDoc     = ref(null)
const cachetData      = ref(null)

// Rétention documents
const showRetentionModal = ref(false)
const retentionDoc       = ref(null)
const newRetentionYears  = ref(5)

// ── Courriers ─────────────────────────────────────────────────────────────────
const courrierArchives        = ref([])
const loadingCourriers        = ref(false)
const courrierPagination      = ref({ page: 1, pages: 1 })
const courrierFilters         = ref({ type: '', nature: '', search: '' })
const showCourrierDetailModal = ref(false)
const selectedCourrier        = ref(null)
const courrierHistorique      = ref([])

// ✅ NOUVEAU : Rétention courriers
const showCourrierRetentionModal = ref(false)
const retentionCourrier          = ref(null)
const newCourrierRetentionYears  = ref(5)

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

const getPriorityClass = (p) => ({
  NORMALE: 'priorite-normale', HAUTE: 'priorite-haute', URGENTE: 'priorite-urgente'
})[p] || 'priorite-normale'

const formatAction = (a) => ({
  CREATION: 'Création', MODIFICATION: 'Modification',
  CHANGEMENT_STATUT: 'Changement statut', SUPPRESSION: 'Suppression',
  ARCHIVAGE: 'Archivage', DISPATCH: 'Dispatch',
  SOUMISSION_APPROBATION: 'Soumission approbation',
  APPROBATION: 'Approbation', SIGNATURE: 'Signature',
})[a] || a

const getRetentionExpiry = (item) => {
  if (!item) return null
  const base = item.archivedAt || item.updatedAt
  if (!base) return null
  const expiry = new Date(base)
  expiry.setFullYear(expiry.getFullYear() + (item.retentionYears || 5))
  return expiry
}

const getRetentionClass = (item) => {
  const expiry   = getRetentionExpiry(item)
  if (!expiry) return 'retention-unknown'
  const diffDays = Math.floor((expiry - new Date()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0)   return 'retention-expired'
  if (diffDays < 180) return 'retention-warning'
  return 'retention-ok'
}

const getRetentionLabel = (item) => {
  const expiry = getRetentionExpiry(item)
  if (!expiry) return 'N/A'
  const diffDays = Math.floor((expiry - new Date()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Expiré'
  if (diffDays < 180) return `${Math.floor(diffDays / 30)} mois`
  const years  = Math.floor(diffDays / 365)
  const months = Math.floor((diffDays % 365) / 30)
  return years > 0 ? `${years}a ${months}m` : `${months} mois`
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

// ── Onglets ───────────────────────────────────────────────────────────────────
const switchMainTab = (tab) => {
  activeMainTab.value = tab
  if (tab === 'courriers' && courrierArchives.value.length === 0) loadCourrierArchives()
}

// ── Chargement documents ──────────────────────────────────────────────────────
const loadArchives = async (page = 1) => {
  loading.value = true
  try {
    const params = { page, limit: 10 }
    if (filters.value.category) params.category = filters.value.category
    if (filters.value.search)   params.search   = filters.value.search
    // ✅ CORRIGÉ : bonne route
    const res  = await api.get('/documents/archives/list', { params })
    let docs   = res.data.data || []
    if (filters.value.signed !== '')
      docs = docs.filter(d => String(d.isSigned) === filters.value.signed)
    archives.value        = docs
    pagination.value      = res.data.pagination || { page: 1, pages: 1 }
    stats.value.totalDocs = res.data.pagination?.total || docs.length
    stats.value.signed    = docs.filter(d => d.isSigned).length
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const resetFilters = () => {
  filters.value = { category: '', signed: '', search: '' }
  loadArchives()
}

// Rétention documents
const openDocRetention = (doc) => {
  retentionDoc.value       = doc
  newRetentionYears.value  = doc.retentionYears || 5
  showRetentionModal.value = true
}

const handleDocRetention = async () => {
  if (!newRetentionYears.value || newRetentionYears.value < 1) {
    alert('Durée invalide — minimum 1 an')
    return
  }
  try {
    await api.put(`/documents/${retentionDoc.value.id}/retention`, {
      retentionYears: parseInt(newRetentionYears.value)
    })
    showRetentionModal.value = false
    loadArchives()
    alert('Durée de conservation mise à jour !')
  } catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

// ── Chargement courriers ──────────────────────────────────────────────────────
const loadCourrierArchives = async (page = 1) => {
  loadingCourriers.value = true
  try {
    const params = { page, limit: 10 }
    if (courrierFilters.value.type)   params.type   = courrierFilters.value.type
    if (courrierFilters.value.nature) params.nature = courrierFilters.value.nature
    if (courrierFilters.value.search) params.search = courrierFilters.value.search
    // ✅ CORRIGÉ : bonne route
    const res = await api.get('/courriers/archives/list', { params })
    courrierArchives.value        = res.data.courriers || []
    courrierPagination.value      = res.data.pagination || { page: 1, pages: 1 }
    stats.value.totalCourriers    = res.data.pagination?.total || courrierArchives.value.length
  } catch (e) { console.error(e) }
  finally { loadingCourriers.value = false }
}

const resetCourrierFilters = () => {
  courrierFilters.value = { type: '', nature: '', search: '' }
  loadCourrierArchives()
}

// ✅ NOUVEAU : Rétention courriers
const openCourrierRetention = (c) => {
  retentionCourrier.value          = c
  newCourrierRetentionYears.value  = c.retentionYears || 5
  showCourrierRetentionModal.value = true
}

const handleCourrierRetention = async () => {
  try {
    await api.put(`/courriers/${retentionCourrier.value.id}/retention`, {
      retentionYears: newCourrierRetentionYears.value
    })
    showCourrierRetentionModal.value = false
    loadCourrierArchives()
    alert('Durée de conservation mise à jour !')
  } catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

// ── Actions documents ─────────────────────────────────────────────────────────
const openDetail = (doc) => {
  selectedDoc.value     = doc
  activeTab.value       = 'info'
  showDetailModal.value = true
}

const downloadDoc = async (doc) => {
  try {
    const res  = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' })
    const url  = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', doc.fileName || doc.title)
    document.body.appendChild(link); link.click(); link.remove()
  } catch { alert('Erreur téléchargement') }
}

const openCachet = async (doc) => {
  try {
    const res = await api.get(`/signatures/document/${doc.id}`)
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

// ── Actions courriers ─────────────────────────────────────────────────────────
const openCourrierDetail = async (c) => {
  selectedCourrier.value        = c
  courrierHistorique.value      = []
  showCourrierDetailModal.value = true
  try {
    const res = await api.get(`/courriers/${c.id}/historique`)
    courrierHistorique.value = res.data.data || []
  } catch (e) { console.error(e) }
}

onMounted(() => {
  loadArchives()
  loadCourrierArchives()
})
</script>

<style scoped>
.btn-retention { background: #f0f9ff; color: #0369a1; }
.field-hint    { font-size: 12px; color: #94a3b8; margin-top: 4px; font-style: italic; }
.layout { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p { color: #666; margin-top: 4px; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: white; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-num { display: block; font-size: 24px; font-weight: 700; color: #1a3a5c; }
.stat-label { font-size: 12px; color: #6b7280; }
.main-tabs-row { display: flex; gap: 8px; margin-bottom: 16px; }
.main-tab { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border: 2px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-size: 14px; font-weight: 500; color: #64748b; transition: all 0.2s; }
.main-tab:hover { border-color: #1a3a5c; color: #1a3a5c; }
.main-tab-active { border-color: #1a3a5c; background: #1a3a5c; color: white; }
.tab-count { background: rgba(255,255,255,0.2); border-radius: 20px; padding: 1px 8px; font-size: 12px; font-weight: 700; }
.main-tab:not(.main-tab-active) .tab-count { background: #e2e8f0; color: #374151; }
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
.badge-simple       { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 3px 8px; border-radius: 6px; border: 1px solid; white-space: nowrap; }
.type-entrant       { color: #1d4ed8; background: #eff6ff;  border-color: #bfdbfe; }
.type-sortant       { color: #15803d; background: #f0fdf4;  border-color: #bbf7d0; }
.nature-externe     { color: #6d28d9; background: #f5f3ff;  border-color: #ddd6fe; }
.nature-interne     { color: #b45309; background: #fffbeb;  border-color: #fde68a; }
.statut-approuve    { color: #166534; background: #f0fdf4;  border-color: #bbf7d0; }
.priorite-normale   { color: #374151; background: #f9fafb;  border-color: #e5e7eb; }
.priorite-haute     { color: #92400e; background: #fffbeb;  border-color: #fde68a; }
.priorite-urgente   { color: #991b1b; background: #fff1f2;  border-color: #fecdd3; }
.historique-section { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
.historique-title   { font-size: 14px; font-weight: 600; color: #1a3a5c; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.historique-item    { display: grid; grid-template-columns: 140px 1fr 100px 120px; gap: 8px; padding: 8px 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 6px; font-size: 12px; align-items: center; }
.historique-action  { font-weight: 600; color: #1a3a5c; }
.historique-details { color: #555; }
.historique-date    { color: #9ca3af; text-align: right; }
.historique-user    { color: #6b7280; font-style: italic; }
.retention-cell    { display: flex; flex-direction: column; gap: 4px; }
.retention-expiry  { font-size: 11px; color: #6b7280; }
.retention-badge   { font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 600; width: fit-content; }
.retention-ok      { background: #dcfce7; color: #16a34a; }
.retention-warning { background: #fff7ed; color: #ea580c; }
.retention-expired { background: #fee2e2; color: #dc2626; }
.retention-unknown { background: #f3f4f6; color: #6b7280; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.detail-grid  { display: flex; flex-direction: column; gap: 12px; }
.detail-row   { display: flex; gap: 16px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; }
.detail-label { font-weight: 600; color: #555; min-width: 120px; font-size: 14px; }
.title-icon   { display: inline-flex; vertical-align: middle; }
.tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
.tab { padding: 8px 16px; border: none; background: none; cursor: pointer; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.tab:hover { color: #1a3a5c; }
.tab-active { color: #2563eb; border-bottom-color: #2563eb; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>