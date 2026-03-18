<template>
<div v-if="show" class="modal-overlay" @click.self="$emit('close')">
<div :class="`modal ${large ? 'modal-large' : ''}`">
    <h2>{{ title }}</h2>
    <slot />
    <div class="modal-actions">
    <button class="btn btn-secondary" @click="$emit('close')">{{ cancelText }}</button>
    <slot name="actions" />
    </div>
</div>
</div>
</template>

<script setup>
defineProps({
show:       { type: Boolean, default: false },
title:      { type: String,  default: '' },
large:      { type: Boolean, default: false },
cancelText: { type: String,  default: 'Fermer' },
})
defineEmits(['close'])
</script>

<style scoped>
.modal-overlay {
position: fixed;
inset: 0;
background: rgba(0,0,0,0.5);
display: flex;
align-items: center;
justify-content: center;
z-index: 1000;
}
.modal {
background: white;
border-radius: 16px;
padding: 32px;
width: 100%;
max-width: 480px;
box-shadow: 0 20px 60px rgba(0,0,0,0.3);
max-height: 90vh;
overflow-y: auto;
}
.modal-large { max-width: 680px; }
.modal h2 { font-size: 20px; font-weight: 700; color: #1a3a5c; margin-bottom: 24px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
</style>