<template>
<div class="layout">
<SidebarNav />
<main class="main-content">

    <!-- Header -->
    <div class="page-header">
    <div>
        <h1><LayoutDashboard :size="28" class="title-icon" /> Tableau de bord</h1>
        <p>Bienvenue, {{ authStore.fullName }} ({{ authStore.userRole }})</p>
    </div>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="loading">
    <LoaderCircle :size="24" class="spin" /> Chargement des statistiques...
    </div>

    <template v-else-if="stats">

    <!-- ADMIN -->
    <div v-if="authStore.isAdmin">
        <StatCards :stats="adminStats" />
        <div class="charts-row mt-24">
        <div class="card chart-card">
            <h2 class="card-title"><BarChart2 :size="18" class="title-icon" /> Documents et Courriers par mois</h2>
            <Bar :data="barData" :options="barOptions" />
        </div>
        <div class="card chart-card">
            <h2 class="card-title"><PieChart :size="18" class="title-icon" /> Répartition par catégorie</h2>
            <Pie :data="pieData" :options="pieOptions" />
        </div>
        </div>
        <div class="card mt-24">
        <h2 class="card-title"><Clock :size="18" class="title-icon" /> Documents récents</h2>
        <table class="table">
            <thead>
            <tr><th>Titre</th><th>Créé par</th><th>Statut</th><th>Date</th></tr>
            </thead>
            <tbody>
            <tr v-for="doc in stats.recentDocuments" :key="doc.id">
                <td>{{ doc.title }}</td>
                <td>{{ doc.creator?.firstName }} {{ doc.creator?.lastName }}</td>
                <td>
                <span :class="`badge badge-${doc.status.toLowerCase()}`">
                    {{ formatStatut(doc.status) }}
                </span>
                </td>
                <td>{{ formatDate(doc.createdAt) }}</td>
            </tr>
            </tbody>
        </table>
        </div>
    </div>

    <!-- MANAGER -->
    <div v-else-if="authStore.isManager">
        <StatCards :stats="managerStats" />
        <div class="charts-row mt-24">
        <div class="card chart-card">
            <h2 class="card-title"><BarChart2 :size="18" class="title-icon" /> Documents et Courriers par mois</h2>
            <Bar :data="barData" :options="barOptions" />
        </div>
        <div class="card chart-card">
            <h2 class="card-title"><PieChart :size="18" class="title-icon" /> Répartition par catégorie</h2>
            <Pie :data="pieData" :options="pieOptions" />
        </div>
        </div>
        <div class="card mt-24" v-if="stats.urgentWorkflows?.length">
        <h2 class="card-title">
            <AlertTriangle :size="18" class="title-icon" color="#dc2626" /> Workflows urgents
        </h2>
        <table class="table">
            <thead>
            <tr><th>Document</th><th>Priorité</th><th>Échéance</th></tr>
            </thead>
            <tbody>
            <tr v-for="wf in stats.urgentWorkflows" :key="wf.id">
                <td>{{ wf.document?.title }}</td>
                <td><span class="badge badge-rejete">{{ wf.priority }}</span></td>
                <td>{{ formatDate(wf.dueDate) }}</td>
            </tr>
            </tbody>
        </table>
        </div>
    </div>

    <!-- EMPLOYEE + tout autre rôle -->
    <div v-else>
        <StatCards :stats="employeeStats" />
        <div class="charts-row mt-24">
        <div class="card chart-card">
            <h2 class="card-title"><BarChart2 :size="18" class="title-icon" /> Documents par mois</h2>
            <Bar :data="barData" :options="barOptions" />
        </div>
        <div class="card chart-card">
            <h2 class="card-title"><PieChart :size="18" class="title-icon" /> Répartition par catégorie</h2>
            <Pie :data="pieData" :options="pieOptions" />
        </div>
        </div>
    </div>

    </template>
</main>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore }     from '../stores/auth'
import { dashboardService } from '../services/api'
import SidebarNav from '../components/SidebarNav.vue'
import StatCards  from '../components/StatCards.vue'
import { Bar, Pie } from 'vue-chartjs'
import {Chart as ChartJS, CategoryScale, LinearScale, BarElement,ArcElement, Title, Tooltip, Legend} from 'chart.js'
import {LayoutDashboard, LoaderCircle, Clock, AlertTriangle,Users, FileText, PenLine, BarChart2, PieChart,ClipboardList, CheckCircle, XCircle,} from 'lucide-vue-next'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

const authStore = useAuthStore()
const stats     = ref(null)
const loading   = ref(true)

const formatDate   = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-'
const formatStatut = (s) => ({
BROUILLON:'Brouillon', EN_ATTENTE:'En attente',
EN_VALIDATION:'En validation', APPROUVE:'Approuvé',
REJETE:'Rejeté', ARCHIVE:'Archivé'
})[s] || s

const barData = computed(() => {
const monthly = stats.value?.monthly || {}
const months  = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
return {
labels: months,
datasets: [
    { label: 'Documents', data: months.map((_, i) => monthly.documents?.[i+1] || 0), backgroundColor: '#3b82f6' },
    { label: 'Courriers', data: months.map((_, i) => monthly.courriers?.[i+1]  || 0), backgroundColor: '#8b5cf6' },
]
}
})

const barOptions = {
responsive: true,
plugins: { legend: { position: 'bottom' } },
scales:  { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
}

const pieData = computed(() => {
const cat    = stats.value?.categories || {}
const labels = Object.keys(cat).length ? Object.keys(cat) : ['Technique','Commercial','Administratif','Autres']
const values = Object.keys(cat).length ? Object.values(cat) : [25, 30, 18, 17]
return {
labels,
datasets: [{
    data: values,
    backgroundColor: ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444'],
    borderWidth: 2, borderColor: '#fff'
}]
}
})

const pieOptions = {
responsive: true,
plugins: { legend: { position: 'right', labels: { padding: 16, font: { size: 16 } } } }
}

const adminStats = computed(() => stats.value ? [
{ icon: Users,        value: stats.value.users?.total,       label: 'Utilisateurs', color: '#dbeafe', iconColor: '#2563eb' },
{ icon: FileText,     value: stats.value.documents?.total,   label: 'Documents',    color: '#dcfce7', iconColor: '#16a34a' },
{ icon: ClipboardList,value: stats.value.workflows?.pending, label: 'En attente',   color: '#fef9c3', iconColor: '#ca8a04' },
{ icon: PenLine,      value: stats.value.signatures?.total,  label: 'Signatures',   color: '#f3e8ff', iconColor: '#9333ea' },
] : [])

const managerStats = computed(() => stats.value ? [
{ icon: ClipboardList, value: stats.value.workflows?.total,    label: 'Total assignés', color: '#dbeafe', iconColor: '#2563eb' },
{ icon: Clock,         value: stats.value.workflows?.pending,  label: 'En attente',     color: '#fef9c3', iconColor: '#ca8a04' },
{ icon: CheckCircle,   value: stats.value.workflows?.approved, label: 'Approuvés',      color: '#dcfce7', iconColor: '#16a34a' },
{ icon: XCircle,       value: stats.value.workflows?.rejected, label: 'Rejetés',        color: '#fee2e2', iconColor: '#dc2626' },
] : [])

const employeeStats = computed(() => stats.value ? [
{ icon: FileText,    value: stats.value.documents?.total,    label: 'Mes documents', color: '#dbeafe', iconColor: '#2563eb' },
{ icon: Clock,       value: stats.value.workflows?.pending,  label: 'En attente',    color: '#fef9c3', iconColor: '#ca8a04' },
{ icon: CheckCircle, value: stats.value.workflows?.approved, label: 'Approuvés',     color: '#dcfce7', iconColor: '#16a34a' },
{ icon: XCircle,     value: stats.value.workflows?.rejected, label: 'Rejetés',       color: '#fee2e2', iconColor: '#dc2626' },
] : [])

onMounted(async () => {
try {
const response = await dashboardService.get()
stats.value    = response.data.data
} catch (error) {
console.error('Erreur dashboard:', error)
} finally {
loading.value = false
}
})
</script>

<style scoped>
.layout       { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header  { margin-bottom: 32px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p  { color: #666; margin-top: 4px; }
.card-title { font-size: 18px; font-weight: 600; color: #1a3a5c; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.mt-24 { margin-top: 24px; }
.loading { text-align: center; padding: 48px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.title-icon { display: inline-flex; vertical-align: middle; }
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.chart-card { padding: 30px; max-height: 380px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>