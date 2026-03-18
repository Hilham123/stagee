import { defineStore } from 'pinia'
import { authService } from '../services/api'

export const useAuthStore = defineStore('auth', {
state: () => ({
user:    JSON.parse(localStorage.getItem('user')) || null,
token:   localStorage.getItem('token') || null,
loading: false,
error:   null,
}),

getters: {
isAuthenticated: (state) => !!state.token,
userRole:  (state) => state.user?.roleName || state.user?.role || null,
isAdmin:   (state) => (state.user?.roleName || state.user?.role) === 'ADMIN',
isManager: (state) => (state.user?.roleName || state.user?.role) === 'MANAGER',
isEmployee:(state) => (state.user?.roleName || state.user?.role) === 'EMPLOYEE',
fullName:  (state) => state.user ? `${state.user.firstName} ${state.user.lastName}` : '',
},

actions: {
async login(email, password) {
    this.loading = true
    this.error   = null
    try {
    const response    = await authService.login({ email, password })
    const { user, token } = response.data.data
    this.user  = user
    this.token = token
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    return { success: true, user }
    } catch (error) {
    this.error = error.response?.data?.message || 'Erreur de connexion'
    return { success: false, message: this.error }
    } finally {
    this.loading = false
    }
},

logout() {
    this.user  = null
    this.token = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
},

async fetchMe() {
    try {
    const response = await authService.getMe()
    this.user = response.data.data
    localStorage.setItem('user', JSON.stringify(this.user))
    return this.user
    } catch (error) {
    this.logout()
    }
},
async fetchMe() {
  try {
    const response = await authService.getMe()
    const userData = response.data.data
    console.log('FETCHME RESPONSE:', userData)
    this.$patch({ user: userData })
    localStorage.setItem('user', JSON.stringify(userData))
    return userData
  } catch (error) {
    console.error('FETCHME ERREUR:', error.response?.status, error.response?.data)
    // NE PAS logout ici pour éviter de vider le localStorage !
    // this.logout()
  }
},
},
})