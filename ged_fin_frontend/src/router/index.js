import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
{
  path: '/login',
  name: 'Login',
  component: () => import('../views/LoginView.vue'),
  meta: { requiresAuth: false },
},
{
  path: '/',
  name: 'Dashboard',
  component: () => import('../views/DashboardView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/courriers',
  name: 'Courriers',
  component: () => import('../views/CourriersView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/documents',
  name: 'Documents',
  component: () => import('../views/DocumentsView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/workflows',
  name: 'Workflows',
  component: () => import('../views/WorkflowsView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/signatures',
  name: 'Signatures',
  component: () => import('../views/SignaturesView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/archives',
  name: 'Archives',
  component: () => import('../views/ArchivesView.vue'),
  meta: { requiresAuth: true },
},
{
  path: '/users',
  name: 'Users',
  component: () => import('../views/UsersView.vue'),
  meta: { requiresAuth: true, adminOnly: true },
},
{
  path: '/roles',
  name: 'Roles',
  component: () => import('../views/RolesView.vue'),
  meta: { requiresAuth: true, adminOnly: true },
},
{
  path: '/:pathMatch(.*)*',
  redirect: '/',
},
]

const router = createRouter({
history: createWebHistory(),
routes,
})

router.beforeEach((to, from, next) => {
const authStore = useAuthStore()
const role      = authStore.user?.roleName || authStore.user?.role

// Page admin uniquement
if (to.meta.adminOnly && role !== 'ADMIN') {
  return next({ name: 'Dashboard' })
}

// Page protégée sans token → login
if (to.meta.requiresAuth && !authStore.isAuthenticated) {
  return next({ name: 'Login' })
}

// Déjà connecté → pas besoin de revoir le login
if (to.name === 'Login' && authStore.isAuthenticated) {
  return next({ name: 'Dashboard' })
}

next()
})

export default router