<template>
<div :class="`cachet-container ${signed ? 'cachet-signed' : ''}`">
<div v-if="signed" class="cachet-valid-banner">
    <CheckCircle :size="18" color="white" /> SIGNATURE VALIDE
</div>
<div class="cachet-header">
    <ShieldCheck :size="22" color="white" />
    <span>SIGNATURE ÉLECTRONIQUE</span>
</div>
<div class="cachet-body">
    <div class="cachet-row" v-for="row in rows" :key="row.label">
    <span class="cachet-label">{{ row.label }}</span>
    <span class="cachet-value">{{ row.value }}</span>
    </div>
    <div class="cachet-hash">
    <span class="cachet-label">Hash document</span>
    <span class="hash-value">{{ data.documentHash }}</span>
    </div>
    <div v-if="signed" class="cachet-hash">
    <span class="cachet-label">Signature</span>
    <span class="hash-value">{{ data.signatureValue }}</span>
    </div>
</div>
<div class="cachet-footer">
    <Lock :size="12" /> Document certifié — GED Électronique
</div>
</div>
</template>

<script setup>
import { computed } from 'vue'
import { CheckCircle, ShieldCheck, Lock } from 'lucide-vue-next'

const props = defineProps({
data:   { type: Object, required: true },
signed: { type: Boolean, default: false },
})

const formatDateHeure = (d) => d ? new Date(d).toLocaleString('fr-FR') : '-'

const rows = computed(() => [
{ label: 'Signataire', value: props.data.signerName },
{ label: 'Rôle',       value: props.data.signerRole },
{ label: 'Document',   value: props.data.documentTitle },
{ label: props.signed ? 'Signé le' : 'Date', value: formatDateHeure(props.data.signedAt || new Date()) },
{ label: 'Algorithme', value: 'SHA-256' },
])
</script>

<style scoped>
.cachet-container { border: 2px solid #1a3a5c; border-radius: 10px; overflow: hidden; max-width: 420px; margin: 0 auto; font-family: 'Courier New', monospace; }
.cachet-signed { border-color: #16a34a; }
.cachet-valid-banner { background: #16a34a; color: white; text-align: center; padding: 6px; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; }
.cachet-header { background: #1a3a5c; color: white; padding: 12px 16px; display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 13px; letter-spacing: 1px; }
.cachet-signed .cachet-header { background: #14532d; }
.cachet-body { padding: 14px 16px; background: white; }
.cachet-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #e5e7eb; font-size: 13px; }
.cachet-label { color: #6b7280; font-size: 11px; text-transform: uppercase; }
.cachet-value { color: #1a3a5c; font-weight: 600; font-size: 13px; }
.cachet-hash { padding: 8px 0 4px; border-top: 1px dashed #e5e7eb; margin-top: 4px; }
.hash-value { color: #6b7280; font-size: 10px; word-break: break-all; display: block; margin-top: 2px; background: #f3f4f6; padding: 4px 6px; border-radius: 4px; }
.cachet-footer { background: #f3f4f6; color: #6b7280; text-align: center; padding: 8px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px; }
</style>