<template>
<div class="login-page">
<div class="login-container">

    <!-- Logo et titre -->
    <div class="login-header">
    <div class="logo"></div>
    <h1>IT-GED</h1>
    <p>Connectez-vous pour accéder à votre espace de gestion documentaire</p>
    </div>

    <!-- Formulaire -->

    <form class="login-form" @submit.prevent="handleLogin">

    <div class="form-group">
        <label>Email</label>
        <input
        v-model="form.email"
        type="email"
        placeholder="votre@email.com"
        required
        />
    </div>

    <div class="form-group">
        <label>Mot de passe</label>
        <input
        v-model="form.password"
        type="password"
        placeholder="••••••••"
        required
        />
    </div>

    <!-- Message d'erreur -->

    <div v-if="error" class="error-message">
        {{ error }}
    </div>

    <!-- Bouton connexion -->

    <button type="submit" :disabled="loading" class="btn-login">
        {{ loading ? 'Connexion...' : 'Se connecter' }}
    </button>

    </form>

    <!-- Infos rôles pour les tests -->

    <div class="test-accounts">
    <p>Comptes de test :</p>
    <span @click="fillAccount('admin@ged.com', 'Admin1234!')">Admin</span>
    <span @click="fillAccount('hicham@ged.com', '1234!')">Manager</span>
    <span @click="fillAccount('employee@ged.com', 'Employee1234!')">Employee</span>
    <span @click="fillAccount('viewer@ged.com', 'Viewer1234!')">Viewer</span>
    </div>

</div>
</div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router    = useRouter()
const authStore = useAuthStore()

const form = ref({
email:    '',
password: '',
})
const loading = ref(false)
const error   = ref('')

// Remplir automatiquement les comptes de test
const fillAccount = (email, password) => {
form.value.email    = email
form.value.password = password
}

// Gérer la connexion
const handleLogin = async () => {
loading.value = true
error.value   = ''

const result = await authStore.login(form.value.email, form.value.password)

if (result.success) {
router.push('/')
} else {
error.value = result.message
}

loading.value = false
}
</script>

<style scoped>
.login-page {
min-height: 100vh;
background: linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 100%);
display: flex;
align-items: center;
justify-content: center;
}

.login-container {
background: white;
border-radius: 16px;
padding: 48px;
width: 100%;
max-width: 420px;
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
text-align: center;
margin-bottom: 32px;
}

.logo {
font-size: 48px;
margin-bottom: 12px;
}

.login-header h1 {
font-size: 24px;
font-weight: 700;
color: #1a3a5c;
margin: 0 0 8px;
}

.login-header p {
color: #666;
font-size: 14px;
margin: 0;
}

.form-group {
margin-bottom: 20px;
}

.form-group label {
display: block;
font-size: 14px;
font-weight: 600;
color: #333;
margin-bottom: 8px;
}

.form-group input {
width: 100%;
padding: 12px 16px;
border: 2px solid #e0e0e0;
border-radius: 8px;
font-size: 15px;
transition: border-color 0.2s;
box-sizing: border-box;
}

.form-group input:focus {
outline: none;
border-color: #1a3a5c;
}

.error-message {
background: #fee;
border: 1px solid #fcc;
color: #c33;
padding: 10px 14px;
border-radius: 8px;
font-size: 14px;
margin-bottom: 16px;
}

.btn-login {
width: 100%;
padding: 14px;
background: #1a3a5c;
color: white;
border: none;
border-radius: 8px;
font-size: 16px;
font-weight: 600;
cursor: pointer;
transition: background 0.2s;
}

.btn-login:hover:not(:disabled) {
background: #2a5a8c;
}

.btn-login:disabled {
opacity: 0.7;
cursor: not-allowed;
}

.test-accounts {
margin-top: 24px;
text-align: center;
font-size: 13px;
color: #999;
}

.test-accounts span {
display: inline-block;
margin: 4px;
padding: 4px 10px;
background: #f0f4f8;
border-radius: 20px;
cursor: pointer;
color: #1a3a5c;
font-weight: 500;
transition: background 0.2s;
}

.test-accounts span:hover {
background: #d0e0f0;
}
</style>