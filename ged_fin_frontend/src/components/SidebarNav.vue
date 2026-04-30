<template>
<aside class="sidebar">

<!-- Logo -->
<div class="sidebar-logo">
    <div class="logo-icon-wrap">
    <FolderOpen :size="22" color="white" />
    </div>
    <span class="logo-text">GED</span>
</div>

<!-- Infos utilisateur -->
<div class="sidebar-user">
    <div class="user-avatar">{{ initials }}</div>
    <div class="user-info">
    <div class="user-name">{{ authStore.fullName }}</div>
    <div class="user-role">{{ authStore.userRole }}</div>
    <!--  Affiche le service de l'utilisateur -->
    <div class="user-service" v-if="authStore.serviceNom">
        {{ authStore.serviceNom }}
    </div>
    </div>
</div>

<!-- Navigation -->
<nav class="sidebar-nav">
    <router-link to="/" class="nav-item" active-class="active" exact>
    <LayoutDashboard :size="18" />
    <span>Dashboard</span>
    </router-link>
    <router-link
    v-if="authStore.canAccessCourrierInterne || authStore.canAccessCourrierExterne"
    to="/courriers"
    class="nav-item"
    active-class="active"
    >
    <Mail :size="18" />
    <span>Courriers</span>
    </router-link>

    <router-link to="/documents" class="nav-item" active-class="active">
    <FileText :size="18" />
    <span>Documents</span>
    </router-link>

    <router-link to="/workflows" class="nav-item" active-class="active">
    <GitBranch :size="18" />
    <span>Workflows</span>
    </router-link>

    <router-link to="/signatures" class="nav-item" active-class="active">
    <PenLine :size="18" />
    <span>Signatures</span>
    </router-link>

    <router-link to="/archives" class="nav-item" active-class="active">
    <Archive :size="18" />
    <span>Archives</span>
    </router-link>

    <router-link v-if="authStore.isAdmin" to="/users" class="nav-item" active-class="active">
    <Users :size="18" />
    <span>Utilisateurs</span>
    </router-link>

    <router-link v-if="authStore.isAdmin" to="/roles" class="nav-item" active-class="active">
    <Shield :size="18" />
    <span>Rôles</span>
    </router-link>
</nav>

<!-- Déconnexion -->
<div class="sidebar-footer">
    <button class="btn-logout" @click="handleLogout">
    <LogOut :size="16" />
    <span>Déconnexion</span>
    </button>
</div>

</aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
FolderOpen, LayoutDashboard, Mail, FileText,
GitBranch, PenLine, LogOut, Users, Shield, Archive
} from 'lucide-vue-next'

const router    = useRouter()
const authStore = useAuthStore()

const initials = computed(() => {
if (!authStore.user) return '?'
return `${authStore.user.firstName?.[0]}${authStore.user.lastName?.[0]}`.toUpperCase()
})

const handleLogout = () => {
authStore.logout()
router.push('/login')
}
</script>

<style scoped>
.sidebar {
width: 240px;
min-height: 100vh;
background: #1a3a5c;
display: flex;
flex-direction: column;
position: fixed;
left: 0; top: 0; bottom: 0;
z-index: 100;
}

.sidebar-logo {
padding: 24px 20px;
display: flex;
align-items: center;
gap: 12px;
border-bottom: 1px solid rgba(255,255,255,0.1);
}

.logo-icon-wrap {
width: 38px;
height: 38px;
background: #2a5a8c;
border-radius: 10px;
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;
}

.logo-text {
font-size: 20px;
font-weight: 700;
color: white;
letter-spacing: 2px;
}

.sidebar-user {
padding: 20px;
display: flex;
align-items: center;
gap: 12px;
border-bottom: 1px solid rgba(255,255,255,0.1);
}

.user-avatar {
width: 40px;
height: 40px;
border-radius: 50%;
background: #2a5a8c;
color: white;
display: flex;
align-items: center;
justify-content: center;
font-weight: 700;
font-size: 14px;
flex-shrink: 0;
}
.user-name    { color: white; font-size: 14px; font-weight: 600; }
.user-role    { color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 2px; }
.user-service { color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 2px; font-style: italic; }
.sidebar-nav { flex: 1; padding: 16px 0; }
.nav-item {display: flex;align-items: center;
gap: 12px;
padding: 12px 20px;
color: rgba(255,255,255,0.7);
text-decoration: none;
font-size: 14px;
font-weight: 500;
transition: all 0.2s;
}
.nav-item:hover  { background: rgba(255,255,255,0.1); color: white; }
.nav-item.active { background: rgba(255,255,255,0.15); color: white; border-right: 3px solid #4a9eff; }
.sidebar-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
.btn-logout {
width: 100%;
padding: 10px;
background: rgba(255,255,255,0.1);
border: none;
border-radius: 8px;
color: rgba(255,255,255,0.7);
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
font-size: 14px;
transition: all 0.2s;
}
.btn-logout:hover { background: rgba(255,0,0,0.2); color: white; }
</style>
