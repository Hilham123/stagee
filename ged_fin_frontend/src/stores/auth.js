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

    //Permissions courrier depuis le JSONB du rôle
    permissions: (state) => state.user?.permissions || {},

    //Helpers de permission courrier
    canAccessCourrierExterne: (state) =>
      (state.user?.roleName || state.user?.role) === 'ADMIN' ||
      !!state.user?.permissions?.['courrier.externe.access'],

    canAccessCourrierInterne: (state) =>
      (state.user?.roleName || state.user?.role) === 'ADMIN' ||
      !!state.user?.permissions?.['courrier.interne.access'],

    canCreateCourrier: (state) =>
      (state.user?.roleName || state.user?.role) === 'ADMIN' ||
      !!state.user?.permissions?.['courrier.create'],

    canUpdateCourrier: (state) =>
      (state.user?.roleName || state.user?.role) === 'ADMIN' ||
      !!state.user?.permissions?.['courrier.update'],

    canChangeStatutCourrier: (state) =>
      (state.user?.roleName || state.user?.role) === 'ADMIN' ||
      !!state.user?.permissions?.['courrier.statut.change'],

    canDeleteCourrier: (state) =>
      (state.user?.roleName || state.user?.role) === 'ADMIN' ||
      !!state.user?.permissions?.['courrier.delete'],

    canViewStatsCourrier: (state) =>
      (state.user?.roleName || state.user?.role) === 'ADMIN' ||
      !!state.user?.permissions?.['courrier.stats'],
      savedSignature: (state) => ({
  image: state.user?.savedSignatureImage || null,
  text:  state.user?.savedSignatureText  || null,
  font:  state.user?.savedSignatureFont  || null,
}),
hasSavedSignature: (state) =>
  !!(state.user?.savedSignatureImage || state.user?.savedSignatureText),


    // Infos service de l'utilisateur
    serviceCode: (state) => state.user?.serviceCode || null,
    serviceNom:  (state) => state.user?.serviceNom  || null,
    serviceId:   (state) => state.user?.serviceId   || null,
  },

  actions: {
    async login(email, password) {
      this.loading = true
      this.error   = null
      try {
        const response        = await authService.login({ email, password })
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
        const userData = response.data.data
        this.$patch({ user: userData })
        localStorage.setItem('user', JSON.stringify(userData))
        return userData
      } catch (error) {
        console.error('FETCHME ERREUR:', error.response?.status, error.response?.data)
      }
    },

    async saveSignature(signatureImage, signatureText, signatureFont) {
  try {
    const axios = (await import('axios')).default
    await axios.put('http://localhost:3000/api/auth/signature', {
      signatureImage, signatureText, signatureFont
    }, {
      headers: { Authorization: `Bearer ${this.token}` }
    })
    // Mettre à jour le user local
    this.user = {
      ...this.user,
      savedSignatureImage: signatureImage || null,
      savedSignatureText:  signatureText  || null,
      savedSignatureFont:  signatureFont  || null,
    }
    localStorage.setItem('user', JSON.stringify(this.user))
    return { success: true }
  } catch (error) {
    return { success: false, message: error.response?.data?.message || 'Erreur' }
  }
},
  },
})
