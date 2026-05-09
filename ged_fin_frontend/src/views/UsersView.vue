<template>
<div class="layout">
<SidebarNav />

<main class="main-content">
<!-- Header -->
<div class="page-header">
<div>
<h1><Users :size="28" class="title-icon" /> Utilisateurs</h1>
<p>Gérez les membres et leurs rôles</p>
</div>
<button class="btn btn-primary" @click="showCreateModal = true">
<Plus :size="16" /> Nouvel utilisateur
</button>
</div>

<!-- Filtres -->
<div class="card">
<div class="filters-row">
<div class="form-group">
<label>Rôle</label>
<select v-model="filters.role" @change="loadUsers()">
    <option value="">Tous</option>
    <option v-for="r in rolesList" :key="r.id" :value="r.name">
    {{ r.label }}
    </option>
</select>
</div>
<div class="form-group">
<label>Recherche</label>
<input v-model="filters.search" type="text"
    placeholder="Nom, prénom, email..." @keyup.enter="loadUsers()" />
</div>
<div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:0">
<button class="btn btn-secondary" @click="loadUsers()" title="Rechercher">
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
<LoaderCircle :size="24" class="spin" /> Chargement...
</div>
<table v-else class="table">
<thead>
<tr>
    <th>Utilisateur</th>
    <th>Email</th>
    <th>Rôle</th>
    <th>Service</th>
    <th>Directeur</th>
    <th>Statut</th>
    <th>Créé le</th>
    <th>Actions</th>
</tr>
</thead>
<tbody>
<tr v-if="users.length === 0">
    <td colspan="8" style="text-align:center; color:#999">Aucun utilisateur trouvé</td>
</tr>
<tr v-for="u in users" :key="u.id">
    <td>
    <div class="user-cell">
        <div class="user-avatar-sm" :style="`background: ${getRoleColor(u)}`">
        {{ initials(u) }}
        </div>
        <span><strong>{{ u.firstName }} {{ u.lastName }}</strong></span>
    </div>
    </td>
    <td>{{ u.email }}</td>
    <td>
    <span class="badge" :style="`background: ${getRoleColor(u)}22; color: ${getRoleColor(u)}`">
        {{ u.userRole?.label || u.roleName || '-' }}
    </span>
    </td>
    <td>
    <span v-if="u.service" class="service-badge">
        <Building2 :size="11" /> {{ u.service.nom }}
    </span>
    <span v-else class="text-muted">—</span>
    </td>
    <!-- Badge Directeur — visible uniquement pour les Managers -->
    <td>
    <span v-if="(u.userRole?.name || u.roleName) === 'MANAGER'" 
        :class="`directeur-badge ${u.isDirecteur ? 'directeur-oui' : 'directeur-non'}`">
        <Crown :size="11" />
        {{ u.isDirecteur ? 'Directeur' : 'Manager' }}
    </span>
    <span v-else class="text-muted">—</span>
    </td>
    <td>
    <span :class="`badge ${u.isActive ? 'badge-approuve' : 'badge-rejete'}`">
        {{ u.isActive ? 'Actif' : 'Inactif' }}
    </span>
    </td>
    <td>{{ formatDate(u.createdAt) }}</td>
    <td>
    <div class="actions">
        <button class="btn-action btn-edit" @click="openEdit(u)" title="Modifier">
        <Pencil :size="15" />
        </button>
        <button class="btn-action"
        :class="u.isActive ? 'btn-warning' : 'btn-success'"
        @click="toggleActive(u)"
        :title="u.isActive ? 'Désactiver' : 'Activer'">
        <UserCheck v-if="!u.isActive" :size="15" />
        <UserX     v-else              :size="15" />
        </button>
        <button class="btn-action btn-danger"
        @click="deleteUser(u)" title="Supprimer"
        :disabled="u.id === authStore.user?.id">
        <Trash2 :size="15" />
        </button>
    </div>
    </td>
</tr>
</tbody>
</table>

<div class="pagination" v-if="pagination.pages > 1">
<button class="btn btn-secondary" :disabled="pagination.page === 1"
@click="loadUsers(pagination.page - 1)">
<ChevronLeft :size="15" /> Précédent
</button>
<span>Page {{ pagination.page }} / {{ pagination.pages }}</span>
<button class="btn btn-secondary" :disabled="pagination.page === pagination.pages"
@click="loadUsers(pagination.page + 1)">
Suivant <ChevronRight :size="15" />
</button>
</div>
</div>
</main>

<!-- Modal Créer / Modifier -->
<BaseModal :show="showCreateModal || showEditModal"
cancel-text="Annuler"
@close="showCreateModal = false; showEditModal = false">
<template #title>
<Pencil v-if="showEditModal" :size="20" class="title-icon" />
<Plus   v-else               :size="20" class="title-icon" />
{{ showEditModal ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur' }}
</template>

<div class="form-row">
<div class="form-group">
<label>Prénom *</label>
<input v-model="form.firstName" type="text" placeholder="Prénom" />
</div>
<div class="form-group">
<label>Nom *</label>
<input v-model="form.lastName" type="text" placeholder="Nom" />
</div>
</div>

<div class="form-group">
<label>Email *</label>
<input v-model="form.email" type="email" placeholder="email@exemple.com" />
</div>

<div class="form-row">
<div class="form-group">
<label>Rôle *</label>
<select v-model="form.roleId">
<option value="" disabled>Sélectionner un rôle</option>
<option v-for="r in rolesList" :key="r.id" :value="r.id">
    {{ r.label }}
</option>
</select>
</div>
<div class="form-group">
<label>Service</label>
<select v-model="form.serviceId">
<option value="">— Aucun service —</option>
<option v-for="s in servicesList" :key="s.id" :value="s.id">
    {{ s.nom }}
</option>
</select>
</div>
</div>

<div class="form-group">
<label>Département</label>
<input v-model="form.department" type="text" placeholder="Ex: CM, IT..." />
</div>

<!-- ✅ Toggle Directeur — visible uniquement si le rôle sélectionné est MANAGER -->
<div v-if="selectedRoleIsManager" class="form-group">
<div class="directeur-toggle">
<div class="directeur-toggle-info">
<Crown :size="16" color="#7c3aed" />
<div>
    <span class="directeur-toggle-label">Accès Directeur</span>
    <p class="directeur-toggle-hint">
    Le Directeur a accès à tous les documents et courriers de tous les départements.
    Un Manager normal ne voit que son service.
    </p>
</div>
</div>
<label class="toggle-switch">
<input type="checkbox" v-model="form.isDirecteur" />
<span class="toggle-slider"></span>
</label>
</div>
</div>

<div class="form-group">
<label>{{ showEditModal ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *' }}</label>
<div class="password-input">
<input v-model="form.password" :type="showPassword ? 'text' : 'password'"
placeholder="Mot de passe" />
<button class="btn-eye" @click="showPassword = !showPassword" type="button">
<Eye v-if="!showPassword" :size="16" />
<EyeOff v-else            :size="16" />
</button>
</div>
</div>

<template #actions>
<button class="btn btn-primary" @click="handleSave">
<Save :size="15" /> {{ showEditModal ? 'Modifier' : 'Créer' }}
</button>
</template>
</BaseModal>

</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import axios from 'axios'
import SidebarNav from '../components/SidebarNav.vue'
import BaseModal  from '../components/BaseModal.vue'
import {
Users, Plus, Search, RotateCcw, Loader, Pencil,
Trash2, UserCheck, UserX, ChevronLeft, ChevronRight,
Save, Eye, EyeOff, Building2, Crown  // ← Save était manquant
} from 'lucide-vue-next'

const authStore  = useAuthStore()
const users      = ref([])
const rolesList  = ref([])
const servicesList = ref([])
const loading    = ref(true)
const pagination = ref({ page: 1, pages: 1 })
const filters    = ref({ role: '', search: '' })

const showCreateModal = ref(false)
const showEditModal   = ref(false)
const showPassword    = ref(false)
const selectedUser    = ref(null)

const emptyForm = () => ({
firstName:   '',
lastName:    '',
email:       '',
roleId:      '',
serviceId:   '',
department:  '',
password:    '',
isDirecteur: false,
})
const form = ref(emptyForm())

// ✅ Computed — vrai si le rôle sélectionné est MANAGER
const selectedRoleIsManager = computed(() => {
const role = rolesList.value.find(r => r.id === form.value.roleId)
return role?.name === 'MANAGER'
})

const formatDate   = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'
const initials     = (u) => `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase()
const getRoleColor = (u) => u.userRole?.color || '#1a3a5c'

const api = () => axios.create({
baseURL: 'http://localhost:3000/api',
headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const loadUsers = async (page = 1) => {
loading.value = true
try {
const res = await api().get('/users', {
params: {
page, limit: 10,
role:   filters.value.role   || undefined,
search: filters.value.search || undefined,
}
})
users.value      = res.data.data.users
pagination.value = res.data.data.pagination
} catch (e) { console.error(e) }
finally { loading.value = false }
}

const loadRolesList = async () => {
try {
const res = await api().get('/roles')
rolesList.value = res.data.data
} catch (e) { console.error(e) }
}

const loadServicesList = async () => {
try {
const res = await api().get('/services')
servicesList.value = res.data.data || []
} catch (e) { console.error(e) }
}

const resetFilters = () => {
filters.value = { role: '', search: '' }
loadUsers()
}

const openEdit = (u) => {
selectedUser.value = u
form.value = {
firstName:   u.firstName,
lastName:    u.lastName,
email:       u.email,
roleId:      u.roleId || u.userRole?.id || '',
serviceId:   u.serviceId || u.service?.id || '',
department:  u.department || '',
password:    '',
isDirecteur: u.isDirecteur || false,
}
showEditModal.value = true
}

const handleSave = async () => {
try {
const data = { ...form.value }
if (showEditModal.value && !data.password) delete data.password
// Si pas Manager, forcer isDirecteur à false
if (!selectedRoleIsManager.value) data.isDirecteur = false

showEditModal.value
? await api().put(`/users/${selectedUser.value.id}`, data)
: await api().post('/users', data)

showCreateModal.value = false
showEditModal.value   = false
form.value = emptyForm()
showPassword.value = false
loadUsers()
} catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const toggleActive = async (u) => {
try {
await api().put(`/users/${u.id}/toggle`)
loadUsers()
} catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const deleteUser = async (u) => {
if (u.id === authStore.user?.id) return
if (!confirm(`Supprimer "${u.firstName} ${u.lastName}" ?`)) return
try {
await api().delete(`/users/${u.id}`)
loadUsers()
} catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

onMounted(() => {
loadUsers()
loadRolesList()
loadServicesList()
})
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p  { color: #666; margin-top: 4px; }

.filters-row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
.filters-row .form-group { margin-bottom: 0; min-width: 150px; }
.mt-16 { margin-top: 16px; }

.loading   { text-align: center; padding: 48px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.text-muted { color: #94a3b8; font-size: 13px; }

.user-cell      { display: flex; align-items: center; gap: 10px; }
.user-avatar-sm { width: 34px; height: 34px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }

/* Badge service */
.service-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 3px 8px; border-radius: 6px; background: #fffbeb; border: 1px solid #fde68a; color: #b45309; white-space: nowrap; }

/* Badge directeur */
.directeur-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
.directeur-oui   { background: #f5f3ff; border: 1px solid #ddd6fe; color: #7c3aed; }
.directeur-non   { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; }

/* Toggle Directeur */
.directeur-toggle { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 10px; }
.directeur-toggle-info  { display: flex; align-items: flex-start; gap: 10px; }
.directeur-toggle-label { font-weight: 600; font-size: 14px; color: #7c3aed; display: block; margin-bottom: 2px; }
.directeur-toggle-hint  { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.4; max-width: 300px; }

/* Switch toggle */
.toggle-switch   { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider   { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #cbd5e1; border-radius: 24px; transition: 0.3s; }
.toggle-slider::before { position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
.toggle-switch input:checked + .toggle-slider { background: #7c3aed; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }

.actions    { display: flex; gap: 6px; }
.btn-action { padding: 6px 10px; border: none; border-radius: 6px; cursor: pointer; background: #f0f4f8; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-action:disabled          { opacity: 0.3; cursor: not-allowed; }
.btn-action:hover:not(:disabled) { opacity: 0.7; }
.btn-edit    { background: #fef9c3; color: #ca8a04; }
.btn-success { background: #dcfce7; color: #16a34a; }
.btn-warning { background: #fff7ed; color: #ea580c; }
.btn-danger  { background: #fee2e2; color: #dc2626; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.password-input         { position: relative; display: flex; }
.password-input input   { flex: 1; padding-right: 40px; }
.btn-eye { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #666; display: flex; align-items: center; }
.title-icon { display: inline-flex; vertical-align: middle; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>
