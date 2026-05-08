<template>
<div class="layout">
<SidebarNav />

<main class="main-content">
    <!-- Header -->
    <div class="page-header">
    <div>
        <h1><Shield :size="28" class="title-icon" /> Rôles & Permissions</h1>
        <p>Gérez les rôles et leurs permissions</p>
    </div>
    <button class="btn btn-primary" @click="showCreateModal = true">
        <Plus :size="16" /> Nouveau rôle
    </button>
    </div>

    <!-- Liste des rôles -->
    <div v-if="loading" class="loading">
    <Loader :size="24" class="spin" /> Chargement...
    </div>

    <div v-else class="roles-grid">
    <div v-for="role in roles" :key="role.id" class="role-card">
        <!-- Header carte -->
        <div class="role-header" :style="`background: ${role.color}`">
        <div class="role-header-left">
            <Shield :size="20" color="white" />
            <span class="role-name">{{ role.label }}</span>
            <span class="role-badge">{{ role.name }}</span>
        </div>
        <div class="role-actions" v-if="!role.isSystem || true">
            <button class="btn-icon" @click="openEdit(role)" title="Modifier">
            <Pencil :size="15" color="white" />
            </button>
            <button v-if="!role.isSystem" class="btn-icon btn-icon-danger"
            @click="deleteRole(role)" title="Supprimer">
            <Trash2 :size="15" color="white" />
            </button>
        </div>
        </div>

        <!-- Infos -->
        <div class="role-body">
        <p class="role-desc">{{ role.description || 'Aucune description' }}</p>
        <div class="role-meta">
            <span class="user-count">
            <Users :size="14" /> {{ role.userCount || 0 }} utilisateur(s)
            </span>
            <span v-if="role.isSystem" class="system-badge">
            <Lock :size="12" /> Système
            </span>
        </div>

        <!-- Permissions -->
        <div class="permissions-grid">
            <div v-for="(value, key) in role.permissions" :key="key"
            :class="`permission-item ${value ? 'active' : 'inactive'}`">
            <component :is="value ? CheckCircle : XCircle" :size="14"
                :color="value ? '#16a34a' : '#d1d5db'" />
            <span>{{ formatPermission(key) }}</span>
            </div>
        </div>
        </div>
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
    {{ showEditModal ? 'Modifier le rôle' : 'Nouveau rôle' }}
    </template>

    <div class="form-row">
    <div class="form-group">
        <label>Nom technique * <small>(ex: Technicien)</small></label>
        <input v-model="form.name" type="text" placeholder="NOM_ROLE"
        :disabled="showEditModal" style="text-transform:uppercase" />
    </div>
    <div class="form-group">
        <label>Label affiché *</label>
        <input v-model="form.label" type="text" placeholder="Ex: Technicien" />
    </div>
    </div>

    <div class="form-row">
    <div class="form-group">
        <label>Couleur</label>
        <div class="color-input">
        <input v-model="form.color" type="color" class="color-picker" />
        <input v-model="form.color" type="text" placeholder="#1a3a5c" />
        </div>
    </div>
    <div class="form-group">
        <label>Description</label>
        <input v-model="form.description" type="text" placeholder="Description du rôle" />
    </div>
    </div>

    <!-- Permissions -->
    <div class="form-group">
    <label>Permissions</label>
    <div class="permissions-form">
        <div v-for="(value, key) in form.permissions" :key="key" class="permission-toggle">
        <label class="toggle-label">
            <input type="checkbox" v-model="form.permissions[key]" />
            <span class="toggle-slider"></span>
            <span class="toggle-text">{{ formatPermission(key) }}</span>
        </label>
        </div>
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
import { ref, onMounted } from 'vue'
import axios from 'axios'
import SidebarNav from '../components/SidebarNav.vue'
import BaseModal  from '../components/BaseModal.vue'
import {
Shield, Plus, Loader, Pencil, Trash2,
Users, Lock
} from 'lucide-vue-next'

const roles           = ref([])
const loading         = ref(true)
const showCreateModal = ref(false)
const showEditModal   = ref(false)
const selectedRole    = ref(null)

const emptyPermissions = () => ({
canUpload: false, canDownload: true, canSubmit: false,
canApprove: false, canSign: false, canArchive: false,
canManageUsers: false, canManageRoles: false, canViewAll: false,
})

const emptyForm = () => ({
name: '', label: '', color: '#1a3a5c',
description: '', permissions: emptyPermissions()
})

const form = ref(emptyForm())

const formatPermission = (key) => ({
canUpload:       'Upload documents',
canDownload:     'Télécharger',
canSubmit:       'Soumettre workflow',
canApprove:      'Approuver',
canSign:         'Signer',
canArchive:      'Archiver',
canManageUsers:  'Gérer utilisateurs',
canManageRoles:  'Gérer rôles',
canViewAll:      'Voir tout',
})[key] || key

const api = () => axios.create({
baseURL: 'http://localhost:3000/api',
headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const loadRoles = async () => {
loading.value = true
try {
const res  = await api().get('/roles')
roles.value = res.data.data
} catch (e) { console.error(e) }
finally { loading.value = false }
}

const openEdit = (role) => {
selectedRole.value = role
form.value = {
name:        role.name,
label:       role.label,
color:       role.color,
description: role.description || '',
permissions: { ...emptyPermissions(), ...role.permissions }
}
showEditModal.value = true
}

const handleSave = async () => {
try {
const data = { ...form.value }
if (!showEditModal.value) data.name = data.name.toUpperCase()

showEditModal.value
    ? await api().put(`/roles/${selectedRole.value.id}`, data)
    : await api().post('/roles', data)

showCreateModal.value = false
showEditModal.value   = false
form.value = emptyForm()
loadRoles()
} catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const deleteRole = async (role) => {
if (!confirm(`Supprimer le rôle "${role.label}" ?`)) return
try {
await api().delete(`/roles/${role.id}`)
loadRoles()
} catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

onMounted(() => loadRoles())
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p  { color: #666; margin-top: 4px; }
.loading { text-align: center; padding: 48px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px; }
.role-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
.role-header { padding: 20px; display: flex; justify-content: space-between; align-items: center; }
.role-header-left { display: flex; align-items: center; gap: 10px; }
.role-name { font-size: 16px; font-weight: 700; color: white; }
.role-badge { background: rgba(255,255,255,0.2); color: white; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.role-actions { display: flex; gap: 6px; }
.btn-icon { background: rgba(255,255,255,0.2); border: none; border-radius: 6px; padding: 6px 8px; cursor: pointer; display: flex; align-items: center; transition: background 0.2s; }
.btn-icon:hover { background: rgba(255,255,255,0.35); }
.btn-icon-danger:hover { background: rgba(220,38,38,0.5) !important; }
.role-body { padding: 20px; }
.role-desc { color: #666; font-size: 13px; margin-bottom: 12px; }
.role-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.user-count { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555; }
.system-badge { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #9333ea; background: #f3e8ff; padding: 2px 8px; border-radius: 20px; }
.permissions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.permission-item { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 4px 0; }
.permission-item.active  { color: #333; }
.permission-item.inactive { color: #bbb; }
.permissions-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8f9fa; padding: 16px; border-radius: 8px; }
.permission-toggle { display: flex; align-items: center; }
.toggle-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; }
.toggle-label input[type="checkbox"] { width: 36px; height: 20px; cursor: pointer; accent-color: #1a3a5c; }
.toggle-text { color: #444; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.color-input { display: flex; gap: 8px; align-items: center; }
.color-picker { width: 44px; height: 38px; padding: 2px; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; }
.title-icon { display: inline-flex; vertical-align: middle; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>