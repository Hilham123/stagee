<template>
<div class="layout">
<SidebarNav />

<main class="main-content">
    <!-- Header -->
    <div class="page-header">
    <div>
        <h1><Mail :size="28" class="title-icon" /> Courriers</h1>
        <p>Gérez les courriers entrants et sortants</p>
    </div>
    <button v-if="!authStore.isViewer" class="btn btn-primary" @click="showCreateModal = true">
        <Plus :size="16" /> Nouveau courrier
    </button>
    </div>

    <!-- Stats -->
    <StatCards v-if="stats" :stats="statItems" />

    <!-- Filtres -->
    <div class="card mt-16">
    <div class="filters-row">
        <div class="form-group">
        <label>Type</label>
        <select v-model="filters.type" @change="loadCourriers()">
            <option value="">Tous</option>
            <option value="ENTRANT">Entrant</option>
            <option value="SORTANT">Sortant</option>
        </select>
        </div>
        <div class="form-group">
        <label>Statut</label>
        <select v-model="filters.statut" @change="loadCourriers()">
            <option value="">Tous</option>
            <option value="RECU">Reçu</option>
            <option value="EN_TRAITEMENT">En traitement</option>
            <option value="TRAITE">Traité</option>
            <option value="ENVOYE">Envoyé</option>
            <option value="ARCHIVE">Archivé</option>
        </select>
        </div>
        <div class="form-group">
        <label>Priorité</label>
        <select v-model="filters.priorite" @change="loadCourriers()">
            <option value="">Toutes</option>
            <option value="NORMALE">Normale</option>
            <option value="HAUTE">Haute</option>
            <option value="URGENTE">Urgente</option>
        </select>
        </div>
        <div class="form-group">
        <label>Recherche</label>
        <input v-model="filters.search" type="text" placeholder="Objet, expéditeur..."
            @keyup.enter="loadCourriers()" />
        </div>
        <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:0">
        <button class="btn btn-secondary" @click="loadCourriers()" title="Rechercher">
            <Search :size="15" />
        </button>
        <button class="btn btn-secondary" @click="resetFilters" title="Réinitialiser">
            <RotateCcw :size="15" />
        </button>
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
            <th>Référence</th>
            <th>Type</th>
            <th>Objet</th>
            <th>Expéditeur</th>
            <th>Destinataire</th>
            <th>Priorité</th>
            <th>Statut</th>
            <th>Date</th>
            <th>Actions</th>
        </tr>
        </thead>
        <tbody>
        <tr v-if="courriers.length === 0">
            <td colspan="9" style="text-align:center; color:#999">Aucun courrier trouvé</td>
        </tr>
        <tr v-for="c in courriers" :key="c.id">
            <td><strong class="clickable" @click="openDetail(c)">{{ c.reference }}</strong></td>
            <td>
            <span :class="`badge ${c.type === 'ENTRANT' ? 'badge-en_validation' : 'badge-approuve'}`">
                <ArrowDownCircle v-if="c.type === 'ENTRANT'" :size="13" />
                <ArrowUpCircle   v-else                       :size="13" />
                {{ c.type === 'ENTRANT' ? 'Entrant' : 'Sortant' }}
            </span>
            </td>
            <td>{{ c.objet }}</td>
            <td>{{ c.expediteur }}</td>
            <td>{{ c.destinataire }}</td>
            <td><span :class="`badge ${getPriorityClass(c.priorite)}`">{{ c.priorite }}</span></td>
            <td><span :class="`badge ${getStatutClass(c.statut)}`">{{ formatStatut(c.statut) }}</span></td>
            <td>{{ formatDate(c.dateReception || c.dateEnvoi) }}</td>
            <td>
            <div class="actions">
                <button class="btn-action" @click="openDetail(c)" title="Voir">
                <Eye :size="15" />
                </button>
                <button v-if="authStore.isManager || authStore.isAdmin"
                class="btn-action btn-submit" @click="openStatut(c)" title="Changer statut">
                <RefreshCw :size="15" />
                </button>
                <button v-if="authStore.isManager || authStore.isAdmin"
                class="btn-action btn-edit" @click="openEdit(c)" title="Modifier">
                <Pencil :size="15" />
                </button>
                <button v-if="authStore.isAdmin"
                class="btn-action btn-danger" @click="deleteCourrier(c)" title="Supprimer">
                <Trash2 :size="15" />
                </button>
            </div>
            </td>
        </tr>
        </tbody>
    </table>

    <div class="pagination" v-if="pagination.pages > 1">
        <button class="btn btn-secondary" :disabled="pagination.page === 1"
        @click="loadCourriers(pagination.page - 1)">
        <ChevronLeft :size="15" /> Précédent
        </button>
        <span>Page {{ pagination.page }} / {{ pagination.pages }}</span>
        <button class="btn btn-secondary" :disabled="pagination.page === pagination.pages"
        @click="loadCourriers(pagination.page + 1)">
        Suivant <ChevronRight :size="15" />
        </button>
    </div>
    </div>
</main>

<!-- Modal Détails -->
<BaseModal :show="showDetailModal" large @close="showDetailModal = false">
    <template #title>
    <Mail :size="20" class="title-icon" /> {{ selectedCourrier?.reference }}
    </template>
    <div class="detail-grid">
    <div class="detail-row" v-for="field in detailFields" :key="field.label">
        <span class="detail-label">{{ field.label }}</span>
        <span v-if="field.badge" :class="`badge ${field.badgeClass(selectedCourrier)}`">
        {{ field.format ? field.format(selectedCourrier) : selectedCourrier?.[field.key] }}
        </span>
        <span v-else>{{ field.format ? field.format(selectedCourrier) : selectedCourrier?.[field.key] || '-' }}</span>
    </div>
    </div>
    <template #actions>
    <button v-if="authStore.isManager || authStore.isAdmin" class="btn btn-primary"
        @click="showDetailModal = false; openStatut(selectedCourrier)">
        <RefreshCw :size="15" /> Changer statut
    </button>
    </template>
</BaseModal>

<!-- Modal Créer/Modifier -->
<BaseModal :show="showCreateModal || showEditModal" cancel-text="Annuler"
    @close="showCreateModal = false; showEditModal = false">
    <template #title>
    <Pencil v-if="showEditModal" :size="20" class="title-icon" />
    <Plus   v-else               :size="20" class="title-icon" />
    {{ showEditModal ? 'Modifier le courrier' : 'Nouveau courrier' }}
    </template>
    <div class="form-row">
    <div class="form-group">
        <label>Type *</label>
        <select v-model="form.type" :disabled="showEditModal">
        <option value="ENTRANT">Entrant</option>
        <option value="SORTANT">Sortant</option>
        </select>
    </div>
    <div class="form-group">
        <label>Priorité</label>
        <select v-model="form.priorite">
        <option value="NORMALE">Normale</option>
        <option value="HAUTE">Haute</option>
        <option value="URGENTE">Urgente</option>
        </select>
    </div>
    </div>
    <div class="form-group">
    <label>Objet *</label>
    <input v-model="form.objet" type="text" placeholder="Objet du courrier" />
    </div>
    <div class="form-row">
    <div class="form-group">
        <label>Expéditeur *</label>
        <input v-model="form.expediteur" type="text" placeholder="Expéditeur" />
    </div>
    <div class="form-group">
        <label>Destinataire *</label>
        <input v-model="form.destinataire" type="text" placeholder="Destinataire" />
    </div>
    </div>
    <div class="form-group" v-if="form.type === 'ENTRANT'">
    <label>Date de réception</label>
    <input v-model="form.dateReception" type="date" />
    </div>
    <div class="form-group" v-if="form.type === 'SORTANT'">
    <label>Date d'envoi</label>
    <input v-model="form.dateEnvoi" type="date" />
    </div>
    <div class="form-group">
    <label>Notes</label>
    <textarea v-model="form.notes" rows="2" placeholder="Notes..."></textarea>
    </div>
    <template #actions>
    <button class="btn btn-primary" @click="handleSave">
        <Save :size="15" /> {{ showEditModal ? 'Modifier' : 'Créer' }}
    </button>
    </template>
</BaseModal>

<!-- Modal Statut -->
<BaseModal :show="showStatutModal" cancel-text="Annuler" @close="showStatutModal = false">
    <template #title>
    <RefreshCw :size="20" class="title-icon" /> Changer le statut
    </template>
    <p style="color:#666; margin-bottom:16px">
    Courrier : <strong>{{ selectedCourrier?.reference }}</strong>
    </p>
    <div class="form-group">
    <label>Nouveau statut</label>
    <select v-model="newStatut">
        <option value="RECU">Reçu</option>
        <option value="EN_TRAITEMENT">En traitement</option>
        <option value="TRAITE">Traité</option>
        <option value="ENVOYE">Envoyé</option>
        <option value="ARCHIVE">Archivé</option>
    </select>
    </div>
    <template #actions>
    <button class="btn btn-primary" @click="handleStatut">
        <Check :size="15" /> Confirmer
    </button>
    </template>
</BaseModal>

</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore }    from '../stores/auth'
import { courrierService } from '../services/api'
import SidebarNav  from '../components/SidebarNav.vue'
import BaseModal   from '../components/BaseModal.vue'
import StatCards   from '../components/StatCards.vue'
import {
Mail, Eye, Trash2, Search, RotateCcw, Plus, RefreshCw,
Pencil, ChevronLeft, ChevronRight, Loader, Save, Check,
ArrowDownCircle, ArrowUpCircle, MailOpen, MailCheck,
Clock, AlertTriangle
} from 'lucide-vue-next'

const authStore  = useAuthStore()
const courriers  = ref([])
const stats      = ref(null)
const loading    = ref(true)
const pagination = ref({ page: 1, pages: 1 })
const filters    = ref({ type: '', statut: '', priorite: '', search: '' })

const showCreateModal  = ref(false)
const showEditModal    = ref(false)
const showStatutModal  = ref(false)
const showDetailModal  = ref(false)
const selectedCourrier = ref(null)
const newStatut        = ref('')

const emptyForm = () => ({
type: 'ENTRANT', objet: '', expediteur: '', destinataire: '',
dateReception: '', dateEnvoi: '', priorite: 'NORMALE', notes: ''
})
const form = ref(emptyForm())

const statItems = computed(() => stats.value ? [
{ icon: MailOpen,      value: stats.value.totalEntrants, label: 'Entrants',      color: '#dbeafe', iconColor: '#2563eb' },
{ icon: MailCheck,     value: stats.value.totalSortants, label: 'Sortants',      color: '#dcfce7', iconColor: '#16a34a' },
{ icon: Clock,         value: stats.value.enTraitement,  label: 'En traitement', color: '#fef9c3', iconColor: '#ca8a04' },
{ icon: AlertTriangle, value: stats.value.urgents,        label: 'Urgents',       color: '#fee2e2', iconColor: '#dc2626' },
] : [])

const formatDate       = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'
const formatStatut     = (s) => ({ RECU:'Reçu', EN_TRAITEMENT:'En traitement',
TRAITE:'Traité', ENVOYE:'Envoyé', ARCHIVE:'Archivé' })[s] || s
const getStatutClass   = (s) => ({ RECU:'badge-en_attente', EN_TRAITEMENT:'badge-en_validation',
TRAITE:'badge-approuve', ENVOYE:'badge-approuve', ARCHIVE:'badge-archive' })[s] || 'badge-brouillon'
const getPriorityClass = (p) => ({ NORMALE:'badge-archive', HAUTE:'badge-en_validation',
URGENTE:'badge-rejete' })[p] || 'badge-brouillon'

const detailFields = [
{ label: 'Type',         key: 'type',          badge: true,
badgeClass: (c) => c?.type === 'ENTRANT' ? 'badge-en_validation' : 'badge-approuve',
format: (c) => c?.type === 'ENTRANT' ? 'Entrant' : 'Sortant' },
{ label: 'Objet',        key: 'objet' },
{ label: 'Expéditeur',   key: 'expediteur' },
{ label: 'Destinataire', key: 'destinataire' },
{ label: 'Priorité',     key: 'priorite',      badge: true,
badgeClass: (c) => getPriorityClass(c?.priorite),
format: (c) => c?.priorite },
{ label: 'Statut',       key: 'statut',        badge: true,
badgeClass: (c) => getStatutClass(c?.statut),
format: (c) => formatStatut(c?.statut) },
{ label: 'Date',         key: 'dateReception',
format: (c) => formatDate(c?.dateReception || c?.dateEnvoi) },
{ label: 'Notes',        key: 'notes' },
]

const resetFilters = () => {
filters.value = { type: '', statut: '', priorite: '', search: '' }
loadCourriers()
}

const loadCourriers = async (page = 1) => {
loading.value = true
try {
const res = await courrierService.list({
    page, limit: 10,
    type:     filters.value.type     || undefined,
    statut:   filters.value.statut   || undefined,
    priorite: filters.value.priorite || undefined,
    search:   filters.value.search   || undefined,
})
courriers.value  = res.data.courriers
pagination.value = res.data.pagination
} catch (e) { console.error(e) }
finally { loading.value = false }
}

const loadStats = async () => {
try { stats.value = (await courrierService.stats()).data.data }
catch (e) { console.error(e) }
}

const openDetail = async (c) => {
try { selectedCourrier.value = (await courrierService.get(c.id)).data.data }
catch { selectedCourrier.value = c }
showDetailModal.value = true
}

const openEdit = (c) => {
selectedCourrier.value = c
form.value = {
type: c.type, objet: c.objet, expediteur: c.expediteur,
destinataire: c.destinataire, dateReception: c.dateReception || '',
dateEnvoi: c.dateEnvoi || '', priorite: c.priorite, notes: c.notes || ''
}
showEditModal.value = true
}

const openStatut = (c) => {
selectedCourrier.value = c
newStatut.value        = c.statut
showStatutModal.value  = true
}

const handleSave = async () => {
try {
showEditModal.value
    ? await courrierService.update(selectedCourrier.value.id, form.value)
    : await courrierService.create(form.value)
showCreateModal.value = false
showEditModal.value   = false
form.value = emptyForm()
loadCourriers(); loadStats()
} catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const handleStatut = async () => {
try {
await courrierService.changeStatut(selectedCourrier.value.id, newStatut.value)
showStatutModal.value = false
loadCourriers(); loadStats()
} catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const deleteCourrier = async (c) => {
if (!confirm(`Supprimer "${c.reference}" ?`)) return
try { await courrierService.delete(c.id); loadCourriers(); loadStats() }
catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

onMounted(() => { loadCourriers(); loadStats() })
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p  { color: #666; margin-top: 4px; }
.filters-row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
.filters-row .form-group { margin-bottom: 0; min-width: 150px; }
.mt-16 { margin-top: 16px; }
.loading { text-align: center; padding: 48px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.clickable { cursor: pointer; color: #1a3a5c; }
.clickable:hover { text-decoration: underline; }
.actions { display: flex; gap: 6px; }
.btn-action { padding: 6px 10px; border: none; border-radius: 6px; cursor: pointer; background: #f0f4f8; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-action:hover { opacity: 0.7; }
.btn-submit { background: #dbeafe; color: #2563eb; }
.btn-submit:hover { background: #bfdbfe; }
.btn-edit   { background: #fef9c3; color: #ca8a04; }
.btn-edit:hover { background: #fef08a; }
.btn-danger { background: #fee2e2; color: #dc2626; }
.btn-danger:hover { background: #fecaca; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.detail-grid { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; gap: 16px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; }
.detail-label { font-weight: 600; color: #555; min-width: 130px; font-size: 14px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.title-icon { display: inline-flex; vertical-align: middle; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>