<template>
  <div class="layout">
    <SidebarNav />
    <main class="main-content">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1><GitBranch :size="28" class="title-icon" /> Workflows</h1>
          <p>Gérez les validations de documents</p>
        </div>
      </div>

      <!-- Filtres -->
      <div class="card filters">
        <div class="filters-row">
          <div class="form-group">
            <label>Statut</label>
            <select v-model="filters.currentStep" @change="loadWorkflows">
              <option value="">Tous</option>
              <option value="EN_ATTENTE_VALIDATION">En attente</option>
              <option value="EN_COURS_VALIDATION">En cours</option>
              <option value="APPROUVE">Approuvé</option>
              <option value="REJETE">Rejeté</option>
              <option value="ARCHIVE">Archivé</option>
            </select>
          </div>
          <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:0">
            <button class="btn btn-secondary" @click="loadWorkflows" title="Rafraîchir">
              <RotateCcw :size="15" />
            </button>
          </div>
        </div>
      </div>

      <!-- Liste workflows -->
      <div class="card mt-16">
        <div v-if="loading" class="loading">
          <Loader :size="24" class="spin" /> Chargement...
        </div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>Document</th><th>Soumis par</th><th>Assigné à</th>
              <th>Étape</th><th>Priorité</th><th>Échéance</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="workflows.length === 0">
              <td colspan="7" style="text-align:center; color:#999">Aucun workflow trouvé</td>
            </tr>
            <tr v-for="wf in workflows" :key="wf.id">
              <td>
                <strong class="clickable" @click="openDetail(wf)">
                  {{ wf.document?.title || wf.documentId }}
                </strong>
              </td>
              <td>{{ wf.submitter?.firstName }} {{ wf.submitter?.lastName }}</td>
              <td>{{ wf.assignee?.firstName }} {{ wf.assignee?.lastName || '-' }}</td>
              <td>
                <span :class="`badge ${getBadgeClass(wf.currentStep)}`">
                  {{ formatStep(wf.currentStep) }}
                </span>
              </td>
              <td>
                <span :class="`badge ${getPriorityClass(wf.priority)}`">
                  {{ wf.priority }}
                </span>
              </td>
              <td>{{ formatDate(wf.dueDate) }}</td>
              <td>
                <div class="actions">
                  <button class="btn-action" @click="openDetail(wf)" title="Voir le document">
                    <Eye :size="15" />
                  </button>
                  <button
                    v-if="(authStore.isManager || authStore.isAdmin) && wf.currentStep === 'EN_ATTENTE_VALIDATION'"
                    class="btn-action btn-submit"
                    @click="takeCharge(wf)" title="Prendre en charge">
                    <UserCheck :size="15" />
                  </button>
                  <button
                    v-if="(authStore.isManager || authStore.isAdmin) && wf.currentStep === 'EN_COURS_VALIDATION'"
                    class="btn-action btn-success"
                    @click="openApprove(wf)" title="Approuver">
                    <ThumbsUp :size="15" />
                  </button>
                  <button
                    v-if="(authStore.isManager || authStore.isAdmin) && wf.currentStep === 'EN_COURS_VALIDATION'"
                    class="btn-action btn-danger"
                    @click="openReject(wf)" title="Rejeter">
                    <ThumbsDown :size="15" />
                  </button>
                  <button
                    v-if="(authStore.isAdmin || authStore.isManager) && wf.currentStep === 'APPROUVE'"
                    class="btn-action btn-archive"
                    @click="archiveWorkflow(wf)" title="Archiver">
                    <Archive :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Modal Détails + Prévisualisation -->
    <BaseModal :show="showDetailModal" large @close="showDetailModal = false">
      <template #title>
        <FileText :size="20" class="title-icon" /> {{ selectedWorkflow?.document?.title }}
      </template>

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
        <div class="detail-row">
          <span class="detail-label">Document</span>
          <span>{{ selectedWorkflow?.document?.title }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Statut</span>
          <span :class="`badge ${getBadgeClass(selectedWorkflow?.currentStep)}`">
            {{ formatStep(selectedWorkflow?.currentStep) }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Priorité</span>
          <span :class="`badge ${getPriorityClass(selectedWorkflow?.priority)}`">
            {{ selectedWorkflow?.priority }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Soumis par</span>
          <span>{{ selectedWorkflow?.submitter?.firstName }} {{ selectedWorkflow?.submitter?.lastName }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Assigné à</span>
          <span>{{ selectedWorkflow?.assignee?.firstName }} {{ selectedWorkflow?.assignee?.lastName || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Échéance</span>
          <span>{{ formatDate(selectedWorkflow?.dueDate) }}</span>
        </div>
        <div class="detail-row" v-if="selectedWorkflow?.comment">
          <span class="detail-label">Commentaire</span>
          <span>{{ selectedWorkflow?.comment }}</span>
        </div>
      </div>

      <!-- Prévisualisation -->
      <div v-if="activeTab === 'preview'">
        <DocumentPreview
          v-if="selectedWorkflow?.document"
          :doc-id="selectedWorkflow.document.id"
          :file-name="selectedWorkflow.document.fileName"
          :mime-type="selectedWorkflow.document.mimeType"
        />
      </div>

      <template #actions>
        <button
          v-if="(authStore.isManager || authStore.isAdmin) && selectedWorkflow?.currentStep === 'EN_ATTENTE_VALIDATION'"
          class="btn btn-submit" @click="takeCharge(selectedWorkflow); showDetailModal = false">
          <UserCheck :size="15" /> Prendre en charge
        </button>
        <button
          v-if="(authStore.isManager || authStore.isAdmin) && selectedWorkflow?.currentStep === 'EN_COURS_VALIDATION'"
          class="btn btn-success" @click="showDetailModal = false; openApprove(selectedWorkflow)">
          <ThumbsUp :size="15" /> Approuver
        </button>
        <button
          v-if="(authStore.isManager || authStore.isAdmin) && selectedWorkflow?.currentStep === 'EN_COURS_VALIDATION'"
          class="btn btn-danger" @click="showDetailModal = false; openReject(selectedWorkflow)">
          <ThumbsDown :size="15" /> Rejeter
        </button>
      </template>
    </BaseModal>

    <!-- Modal Approuver -->
    <BaseModal :show="showApproveModal" cancel-text="Annuler" @close="showApproveModal = false">
      <template #title>
        <ThumbsUp :size="20" class="title-icon" color="#16a34a" /> Approuver le document
      </template>
      <p style="color:#666; margin-bottom:16px">
        Document : <strong>{{ selectedWorkflow?.document?.title }}</strong>
      </p>
      <div class="form-group">
        <label>Commentaire</label>
        <textarea v-model="actionComment" rows="3" placeholder="Commentaire d'approbation..."></textarea>
      </div>
      <template #actions>
        <button class="btn btn-success" @click="handleApprove">
          <Check :size="15" /> Confirmer l'approbation
        </button>
      </template>
    </BaseModal>

    <!-- Modal Rejeter -->
    <BaseModal :show="showRejectModal" cancel-text="Annuler" @close="showRejectModal = false">
      <template #title>
        <ThumbsDown :size="20" class="title-icon" color="#dc2626" /> Rejeter le document
      </template>
      <p style="color:#666; margin-bottom:16px">
        Document : <strong>{{ selectedWorkflow?.document?.title }}</strong>
      </p>
      <div class="form-group">
        <label>Raison du rejet *</label>
        <textarea v-model="actionComment" rows="3" placeholder="Expliquez la raison du rejet..."></textarea>
      </div>
      <template #actions>
        <button class="btn btn-danger" @click="handleReject">
          <X :size="15" /> Confirmer le rejet
        </button>
      </template>
    </BaseModal>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore }    from '../stores/auth'
import { workflowService } from '../services/api'
import SidebarNav      from '../components/SidebarNav.vue'
import BaseModal       from '../components/BaseModal.vue'
import DocumentPreview from '../components/DocumentPreview.vue'
import {GitBranch, Loader, RotateCcw, UserCheck, Eye, FileText, Info,ThumbsUp, ThumbsDown, Archive, Check, X
} from 'lucide-vue-next'

const authStore = useAuthStore()
const workflows = ref([])
const loading   = ref(true)
const filters   = ref({ currentStep: '' })
const activeTab = ref('info')

const showDetailModal  = ref(false)
const showApproveModal = ref(false)
const showRejectModal  = ref(false)
const selectedWorkflow = ref(null)
const actionComment    = ref('')

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'
const formatStep = (step) => ({
  SOUMISSION: 'Soumission', EN_ATTENTE_VALIDATION: 'En attente',
  EN_COURS_VALIDATION: 'En cours', APPROUVE: 'Approuvé',
  REJETE: 'Rejeté', ARCHIVE: 'Archivé',
})[step] || step

const getBadgeClass = (step) => ({
  EN_ATTENTE_VALIDATION: 'badge-en_attente', EN_COURS_VALIDATION: 'badge-en_validation',
  APPROUVE: 'badge-approuve', REJETE: 'badge-rejete', ARCHIVE: 'badge-archive',
})[step] || 'badge-brouillon'

const getPriorityClass = (priority) => ({
  BASSE: 'badge-archive', NORMALE: 'badge-en_attente',
  HAUTE: 'badge-en_validation', URGENTE: 'badge-rejete',
})[priority] || 'badge-brouillon'

const loadWorkflows = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.value.currentStep) params.currentStep = filters.value.currentStep
    const response  = await workflowService.list(params)
    workflows.value = response.data.data
  } catch (error) {
    console.error('Erreur chargement workflows:', error)
  } finally {
    loading.value = false
  }
}

const openDetail = (wf) => {
  selectedWorkflow.value = wf
  activeTab.value        = 'info'
  showDetailModal.value  = true
}

const takeCharge = async (wf) => {
  try {
    await workflowService.takeCharge(wf.id)
    loadWorkflows()
    alert('Workflow pris en charge !')
  } catch (error) { alert(error.response?.data?.message || 'Erreur') }
}

const openApprove = (wf) => { selectedWorkflow.value = wf; actionComment.value = ''; showApproveModal.value = true }
const openReject  = (wf) => { selectedWorkflow.value = wf; actionComment.value = ''; showRejectModal.value  = true }

const handleApprove = async () => {
  try {
    await workflowService.approve(selectedWorkflow.value.id, { comment: actionComment.value })
    showApproveModal.value = false
    loadWorkflows()
    alert('Document approuvé avec succès !')
  } catch (error) { alert(error.response?.data?.message || 'Erreur') }
}

const handleReject = async () => {
  if (!actionComment.value.trim()) { alert('La raison du rejet est obligatoire !'); return }
  try {
    await workflowService.reject(selectedWorkflow.value.id, { comment: actionComment.value })
    showRejectModal.value = false
    loadWorkflows()
    alert('Document rejeté.')
  } catch (error) { alert(error.response?.data?.message || 'Erreur') }
}

const archiveWorkflow = async (wf) => {
  if (!confirm('Archiver ce document ?')) return
  try {
    await workflowService.archive(wf.id)
    loadWorkflows()
    alert('Document archivé avec succès !')
  } catch (error) { alert(error.response?.data?.message || 'Erreur') }
}

onMounted(() => loadWorkflows())
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p  { color: #666; margin-top: 4px; }
.filters { margin-bottom: 0; }
.filters-row { display: flex; gap: 16px; align-items: flex-end; }
.filters-row .form-group { margin-bottom: 0; min-width: 200px; }
.mt-16 { margin-top: 16px; }
.loading { text-align: center; padding: 48px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.clickable { cursor: pointer; color: #1a3a5c; }
.clickable:hover { text-decoration: underline; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-action { padding: 6px 10px; border: none; border-radius: 6px; cursor: pointer; background: #f0f4f8; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-action:hover { opacity: 0.7; }
.btn-submit  { background: #dbeafe; color: #2563eb; }
.btn-success { background: #dcfce7; color: #16a34a; }
.btn-danger  { background: #fee2e2; color: #dc2626; }
.btn-archive { background: #f3e8ff; color: #9333ea; }
.detail-grid { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; gap: 16px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; }
.detail-label { font-weight: 600; color: #555; min-width: 120px; font-size: 14px; }
.tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 0; }
.tab { padding: 8px 16px; border: none; background: none; cursor: pointer; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.tab:hover { color: #1a3a5c; }
.tab-active { color: #2563eb; border-bottom-color: #2563eb; }
.title-icon { display: inline-flex; vertical-align: middle; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>