<template>
<div class="preview-container">

<!-- Chargement -->
<div v-if="loading" class="preview-loading">
    <Loader :size="24" class="spin" /> Chargement de la prévisualisation...
</div>

<!-- Erreur -->
<div v-else-if="error" class="preview-error">
    <FileX :size="32" color="#dc2626" />
    <p>{{ error }}</p>
</div>

<!-- PDF -->
<iframe v-else-if="type === 'pdf'" :src="blobUrl" class="preview-iframe" />

<!-- Image -->
<div v-else-if="type === 'image'" class="preview-image-wrap">
    <img :src="blobUrl" class="preview-image" />
</div>

<!-- DOCX -->
<div v-else-if="type === 'docx'" class="preview-docx" v-html="docxHtml" />

<div v-else class="preview-unsupported">
    <FileQuestion :size="32" color="#6b7280" />
    <p>Prévisualisation non disponible pour ce type de fichier</p>
    <button class="btn btn-primary" @click="$emit('download')">
    <Download :size="15" /> Télécharger pour voir
    </button>
</div>

</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import axios from 'axios'
import { Loader, FileX, FileQuestion, Download } from 'lucide-vue-next'

const props = defineProps({
docId:    { type: String, required: true },
fileName: { type: String, default: '' },
mimeType: { type: String, default: '' },
})

defineEmits(['download'])

const loading  = ref(true)
const error    = ref(null)
const blobUrl  = ref(null)
const docxHtml = ref('')
const type     = ref(null)

const getType = (fileName, mimeType) => {
const ext = fileName?.split('.').pop()?.toLowerCase()
if (mimeType?.includes('pdf')   || ext === 'pdf')  return 'pdf'
if (mimeType?.includes('image') || ['jpg','jpeg','png','gif','webp'].includes(ext)) return 'image'
if (mimeType?.includes('wordprocessingml') || ext === 'docx' || ext === 'doc') return 'docx'
return 'unsupported'
}

const api = () => axios.create({
baseURL: 'http://localhost:3000/api',
headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
})

const load = async () => {
loading.value = true
error.value   = null
type.value    = getType(props.fileName, props.mimeType)

try {
const res = await api().get(`/documents/${props.docId}/download`, {
    responseType: 'arraybuffer'
})

if (type.value === 'docx') {
    const mammoth = await import('mammoth')
    const result  = await mammoth.convertToHtml({ arrayBuffer: res.data })
    docxHtml.value = result.value
} else if (type.value !== 'unsupported') {
    const mime    = props.mimeType || (type.value === 'pdf' ? 'application/pdf' : 'image/jpeg')
    const blob    = new Blob([res.data], { type: mime })
    blobUrl.value = URL.createObjectURL(blob)
}
} catch (e) {
error.value = 'Impossible de charger le document.'
console.error(e)
} finally {
loading.value = false
}
}

onMounted(() => load())
watch(() => props.docId, () => load())
onUnmounted(() => { if (blobUrl.value) URL.revokeObjectURL(blobUrl.value) })
</script>

<style scoped>
.preview-container { width: 100%; min-height: 400px; display: flex; flex-direction: column; }
.preview-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 48px; color: #666; }
.preview-error, .preview-unsupported { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 48px; color: #666; text-align: center; }
.preview-iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
.preview-image-wrap { display: flex; justify-content: center; padding: 16px; }
.preview-image { max-width: 100%; max-height: 600px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.preview-docx { padding: 32px; background: white; border-radius: 8px; max-height: 600px; overflow-y: auto; line-height: 1.6; font-size: 14px; }
.preview-docx :deep(h1), .preview-docx :deep(h2), .preview-docx :deep(h3) { color: #1a3a5c; margin: 16px 0 8px; }
.preview-docx :deep(p) { margin: 8px 0; }
.preview-docx :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; }
.preview-docx :deep(td), .preview-docx :deep(th) { border: 1px solid #ddd; padding: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>