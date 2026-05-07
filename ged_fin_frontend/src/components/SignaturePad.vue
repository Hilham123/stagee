<template>
  <div class="sigpad-container">

    <!-- Signature sauvegardée -->
    <div v-if="authStore.hasSavedSignature && !usingSaved" class="saved-sig-banner">
      <div class="saved-sig-preview">
        <span class="saved-sig-label"><BookMarked :size="14" /> Signature enregistrée</span>
        <div v-if="authStore.savedSignature.image" class="saved-sig-img-wrap">
          <img :src="authStore.savedSignature.image" class="saved-sig-img" />
        </div>
        <div v-else-if="authStore.savedSignature.text" class="saved-sig-text-preview"
          :style="{ fontFamily: authStore.savedSignature.font }">
          {{ authStore.savedSignature.text }}
        </div>
      </div>
      <button class="btn btn-primary btn-sm" @click="useSavedSignature">
        <Check :size="14" /> Utiliser cette signature
      </button>
    </div>

    <!-- Signature utilisée -->
    <div v-if="usingSaved" class="using-saved-banner">
      <div class="using-saved-info">
        <CheckCircle :size="16" color="#16a34a" />
        <span>Signature enregistrée sélectionnée</span>
        <div v-if="authStore.savedSignature.image" class="saved-sig-img-wrap-sm">
          <img :src="authStore.savedSignature.image" class="saved-sig-img-sm" />
        </div>
        <span v-else-if="authStore.savedSignature.text"
          class="saved-text-inline"
          :style="{ fontFamily: authStore.savedSignature.font }">
          {{ authStore.savedSignature.text }}
        </span>
      </div>
      <button class="btn-clear" @click="usingSaved = false; placement = null">
        <RotateCcw :size="13" /> Changer
      </button>
    </div>

    <!-- Tabs si pas de signature sauvegardée utilisée -->
    <template v-if="!usingSaved">
      <div class="sigpad-tabs">
        <button :class="`sigpad-tab ${mode === 'draw' ? 'active' : ''}`" @click="mode = 'draw'">
          <PenLine :size="15" /> Dessiner
        </button>
        <button :class="`sigpad-tab ${mode === 'text' ? 'active' : ''}`" @click="mode = 'text'">
          <Type :size="15" /> Écrire
        </button>
      </div>

      <!-- Mode Dessin -->
      <div v-if="mode === 'draw'" class="draw-area">
        <p class="hint">Dessinez votre signature ci-dessous</p>
        <canvas
          ref="canvas" class="sig-canvas"
          @mousedown="startDraw" @mousemove="draw" @mouseup="stopDraw" @mouseleave="stopDraw"
          @touchstart.prevent="startDrawTouch" @touchmove.prevent="drawTouch" @touchend="stopDraw"
        />
        <div class="draw-actions">
          <button class="btn-clear" @click="clearCanvas"><Trash2 :size="14" /> Effacer</button>
          <button v-if="hasDrawing" class="btn-save" @click="saveCurrentSignature">
            <BookMarked :size="14" /> Enregistrer cette signature
          </button>
        </div>
      </div>

      <!-- Mode Texte -->
      <div v-if="mode === 'text'" class="text-area">
        <p class="hint">Tapez votre signature</p>
        <input v-model="signatureText" type="text" class="sig-input" placeholder="Votre nom ou initiales..." />
        <div class="sig-preview-text" :style="{ fontFamily: selectedFont }">
          {{ signatureText || 'Aperçu...' }}
        </div>
        <div class="font-selector">
          <button
            v-for="f in fonts" :key="f.name"
            :class="`font-btn ${selectedFont === f.value ? 'active' : ''}`"
            :style="{ fontFamily: f.value }"
            @click="selectedFont = f.value"
          >{{ f.name }}</button>
        </div>
        <button v-if="signatureText.trim()" class="btn-save mt-8" @click="saveCurrentSignature">
          <BookMarked :size="14" /> Enregistrer cette signature
        </button>
      </div>
    </template>

    <!-- Message enregistrement -->
    <div v-if="savedMessage" class="saved-success">
      <CheckCircle :size="15" color="#16a34a" /> {{ savedMessage }}
    </div>

    <!-- Placement sur le PDF -->
    <div v-if="hasSignature" class="placement-area">
      <p class="hint">
        <MousePointerClick :size="14" style="display:inline-flex;vertical-align:middle" />
        <strong> Cliquez sur le PDF</strong> pour placer votre signature
      </p>

      <div v-if="pdfLoading" class="pdf-loading">
        <Loader :size="20" class="spin" /> Chargement du PDF...
      </div>
      <div v-else-if="pdfError" class="pdf-error">
        <FileX :size="24" color="#dc2626" /> {{ pdfError }}
      </div>

      <template v-else>
        <div class="page-selector" v-if="totalPages > 1">
          <button :disabled="currentPage <= 1" @click="changePage(-1)"><ChevronLeft :size="15" /></button>
          <span>Page {{ currentPage }} / {{ totalPages }}</span>
          <button :disabled="currentPage >= totalPages" @click="changePage(1)"><ChevronRight :size="15" /></button>
        </div>
        <div class="pdf-wrapper" ref="pdfWrapper">
          <canvas ref="pdfCanvas" class="pdf-canvas" @click="placeSig" />
          <div
            v-if="placement" class="sig-overlay"
            :style="{ left: placement.displayX + 'px', top: placement.displayY + 'px' }"
          >
            <img v-if="usingSaved && authStore.savedSignature.image"
              :src="authStore.savedSignature.image"
              class="sig-overlay-img" />
            <div v-else class="sig-overlay-inner"
              :style="{ fontFamily: usingSaved ? authStore.savedSignature.font : (mode === 'text' ? selectedFont : 'cursive') }">
              {{ getCurrentSignatureText() }}
            </div>
            <div class="sig-overlay-meta">{{ signerName }} · {{ formatDate(new Date()) }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- Boutons confirmer -->
    <div class="sigpad-actions" v-if="canConfirm">
      <button class="btn btn-primary" @click="confirm">
        <Check :size="15" /> Confirmer la signature
      </button>
      <button class="btn btn-secondary" @click="resetPlacement">
        <RotateCcw :size="15" /> Repositionner
      </button>
    </div>

    <div v-else-if="hasSignature && !placement && !pdfLoading && !pdfError && props.showPdf" class="hint-placement">
      <MousePointerClick :size="16" /> Cliquez sur le document pour placer votre signature
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  PenLine, Type, Trash2, Check, RotateCcw,
  ChevronLeft, ChevronRight, MousePointerClick,
  Loader, FileX, BookMarked, CheckCircle
} from 'lucide-vue-next'

const props = defineProps({
  pdfBytes:   { type: String, required: false, default: '' },
  signerName: { type: String, default: '' },
  showPdf:    { type: Boolean, default: true },
})

const emit = defineEmits(['confirm'])
const authStore = useAuthStore()

let pdfDocRaw = null

const mode          = ref('draw')
const signatureText = ref('')
const selectedFont  = ref('Dancing Script, cursive')
const canvas        = ref(null)
const pdfCanvas     = ref(null)
const pdfWrapper    = ref(null)
const isDrawing     = ref(false)
const hasDrawing    = ref(false)
const placement     = ref(null)
const currentPage   = ref(1)
const totalPages    = ref(1)
const pdfLoading    = ref(false)
const pdfError      = ref(null)
const usingSaved    = ref(false)
const savedMessage  = ref('')

const fonts = [
  { name: 'Script',  value: 'Dancing Script, cursive' },
  { name: 'Cursive', value: 'Pacifico, cursive' },
  { name: 'Élégant', value: 'Great Vibes, cursive' },
  { name: 'Simple',  value: 'Arial, sans-serif' },
]

const hasSignature = computed(() => {
  if (usingSaved.value) return true
  if (mode.value === 'draw') return hasDrawing.value
  return signatureText.value.trim().length > 0
})

const canConfirm = computed(() => {
  if (!hasSignature.value) return false
  if (!props.showPdf) return true
  return !!placement.value
})

const formatDate = (d) => d.toLocaleDateString('fr-FR')

const getCurrentSignatureText = () => {
  if (usingSaved.value) return authStore.savedSignature.text || props.signerName
  if (mode.value === 'text') return signatureText.value || props.signerName
  return props.signerName
}

const useSavedSignature = () => {
  usingSaved.value = true
  placement.value  = null
}

const saveCurrentSignature = async () => {
  let imageData = null
  let textData  = null
  let fontData  = null

  if (mode.value === 'draw' && canvas.value) {
    imageData = canvas.value.toDataURL('image/png')
  } else if (mode.value === 'text' && signatureText.value.trim()) {
    textData = signatureText.value
    fontData = selectedFont.value
  }

  const result = await authStore.saveSignature(imageData, textData, fontData)
  if (result.success) {
    savedMessage.value = 'Signature enregistrée avec succès !'
    setTimeout(() => { savedMessage.value = '' }, 3000)
  } else {
    alert(result.message || 'Erreur lors de la sauvegarde')
  }
}

const getCtx = () => canvas.value?.getContext('2d')

const initCanvas = () => {
  if (!canvas.value) return
  canvas.value.width  = 500
  canvas.value.height = 160
  const ctx = getCtx()
  ctx.strokeStyle = '#1a237e'
  ctx.lineWidth   = 2.5
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
}

const getPos = (e) => {
  const rect = canvas.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.value.width  / rect.width),
    y: (e.clientY - rect.top)  * (canvas.value.height / rect.height)
  }
}

const startDraw = (e) => {
  isDrawing.value = true
  const { x, y } = getPos(e)
  const ctx = getCtx()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

const draw = (e) => {
  if (!isDrawing.value) return
  const { x, y } = getPos(e)
  const ctx = getCtx()
  ctx.lineTo(x, y)
  ctx.stroke()
  hasDrawing.value = true
}

const stopDraw       = () => { isDrawing.value = false }
const startDrawTouch = (e) => { const t = e.touches[0]; startDraw({ clientX: t.clientX, clientY: t.clientY }) }
const drawTouch      = (e) => { const t = e.touches[0]; draw({ clientX: t.clientX, clientY: t.clientY }) }

const clearCanvas = () => {
  getCtx()?.clearRect(0, 0, canvas.value.width, canvas.value.height)
  hasDrawing.value = false
  placement.value  = null
}

const loadPdf = async (base64) => {
  if (!base64 || !props.showPdf) { pdfLoading.value = false; return }
  pdfLoading.value = true
  pdfError.value   = null
  try {
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href

    const binary = atob(base64)
    const data   = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i)

    pdfDocRaw        = await pdfjsLib.getDocument({ data }).promise
    totalPages.value = pdfDocRaw.numPages
  } catch (e) {
    console.error('Erreur PDF:', e)
    pdfError.value = 'Impossible d\'afficher le PDF. Vous pouvez quand même signer.'
  } finally {
    pdfLoading.value = false
  }
}

const renderPage = async (pageNum) => {
  if (!pdfDocRaw || !pdfCanvas.value) return
  const page     = await pdfDocRaw.getPage(pageNum)
  const viewport = page.getViewport({ scale: 1.3 })
  pdfCanvas.value.width  = viewport.width
  pdfCanvas.value.height = viewport.height
  await page.render({ canvasContext: pdfCanvas.value.getContext('2d'), viewport }).promise
}

const changePage = async (dir) => {
  currentPage.value += dir
  placement.value    = null
  await renderPage(currentPage.value)
}

// ✅ CORRIGÉ : accolade fermante présente + calcul coordonnées correct
const placeSig = (e) => {
  const rect   = pdfCanvas.value.getBoundingClientRect()
  const scaleX = pdfCanvas.value.width  / rect.width
  const scaleY = pdfCanvas.value.height / rect.height

  const displayX = e.clientX - rect.left
  const displayY = e.clientY - rect.top

  const canvasX = displayX * scaleX
  const canvasY = displayY * scaleY

  // pdf-lib : origine en bas à gauche — 120 = hauteur du cachet
  const pdfX = canvasX
  const pdfY = pdfCanvas.value.height - canvasY - 120

  placement.value = {
    displayX,
    displayY,
    pdfX:      Math.max(0, pdfX),
    pdfY:      Math.max(0, pdfY),
    pageIndex: currentPage.value - 1,
  }
} // ← accolade fermante qui manquait !

const resetPlacement = () => { placement.value = null }

const confirm = () => {
  let sigType  = mode.value
  let sigText  = mode.value === 'text' ? (signatureText.value || props.signerName) : props.signerName
  let sigImage = null

  if (usingSaved.value) {
    sigType  = authStore.savedSignature.image ? 'draw' : 'text'
    sigText  = authStore.savedSignature.text  || props.signerName
    sigImage = authStore.savedSignature.image || null
  } else if (mode.value === 'draw' && canvas.value) {
    sigImage = canvas.value.toDataURL('image/png')
  }

  emit('confirm', {
    signatureType:  sigType,
    signatureText:  sigText,
    signatureImage: sigImage,
    x:         placement.value?.pdfX      || null,
    y:         placement.value?.pdfY      || null,
    pageIndex: placement.value?.pageIndex ?? null,
  })
}

onMounted(async () => {
  initCanvas()
  if (props.pdfBytes && props.showPdf) await loadPdf(props.pdfBytes)
  else pdfLoading.value = false
})

watch(hasSignature, async (val) => {
  if (val && pdfDocRaw) {
    await nextTick()
    await nextTick()
    await renderPage(currentPage.value)
  }
})

watch(() => props.pdfBytes, async (bytes) => {
  if (bytes && props.showPdf) await loadPdf(bytes)
})
</script>

<style scoped>
.sigpad-container { display: flex; flex-direction: column; gap: 20px; }
.saved-sig-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; }
.saved-sig-preview { display: flex; align-items: center; gap: 12px; }
.saved-sig-label { font-size: 13px; font-weight: 600; color: #1d4ed8; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
.saved-sig-img-wrap { border: 1px solid #bfdbfe; border-radius: 6px; padding: 4px; background: white; }
.saved-sig-img { height: 40px; max-width: 160px; object-fit: contain; display: block; }
.saved-sig-text-preview { font-size: 22px; color: #1a237e; padding: 0 8px; }
.btn-sm { padding: 6px 14px; font-size: 13px; white-space: nowrap; }
.using-saved-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; }
.using-saved-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #166534; font-weight: 500; }
.saved-sig-img-wrap-sm { border: 1px solid #bbf7d0; border-radius: 4px; padding: 2px; background: white; }
.saved-sig-img-sm { height: 32px; max-width: 120px; object-fit: contain; display: block; }
.saved-text-inline { font-size: 18px; color: #1a237e; }
.saved-success { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; color: #166534; font-weight: 500; }
.draw-actions { display: flex; gap: 8px; align-items: center; }
.btn-save { padding: 6px 14px; border: 1.5px solid #2563eb; border-radius: 6px; cursor: pointer; background: #eff6ff; color: #2563eb; font-size: 13px; display: flex; align-items: center; gap: 4px; font-weight: 600; transition: all 0.2s; }
.btn-save:hover { background: #dbeafe; }
.mt-8 { margin-top: 8px; align-self: flex-start; }
.sigpad-tabs { display: flex; gap: 8px; }
.sigpad-tab { padding: 8px 20px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; background: white; font-weight: 600; color: #6b7280; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
.sigpad-tab.active { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
.hint { font-size: 13px; color: #6b7280; margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
.hint-placement { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: #fffbeb; border-radius: 8px; color: #d97706; font-weight: 500; }
.draw-area, .text-area { display: flex; flex-direction: column; gap: 8px; }
.sig-canvas { border: 2px dashed #cbd5e1; border-radius: 8px; cursor: crosshair; background: #fafafa; width: 100%; max-width: 500px; touch-action: none; }
.btn-clear { align-self: flex-start; padding: 6px 12px; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; background: white; color: #6b7280; font-size: 13px; display: flex; align-items: center; gap: 4px; }
.btn-clear:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
.sig-input { padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; width: 100%; }
.sig-input:focus { outline: none; border-color: #2563eb; }
.sig-preview-text { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 28px; color: #1a237e; min-height: 60px; background: #fafafa; text-align: center; }
.font-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.font-btn { padding: 6px 14px; border: 2px solid #e5e7eb; border-radius: 6px; cursor: pointer; background: white; font-size: 16px; transition: all 0.2s; }
.font-btn.active { border-color: #2563eb; background: #eff6ff; }
.placement-area { display: flex; flex-direction: column; gap: 8px; }
.page-selector { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #555; }
.page-selector button { padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; background: white; display: flex; align-items: center; }
.page-selector button:disabled { opacity: 0.4; cursor: default; }
.pdf-wrapper { position: relative; border: 2px solid #e5e7eb; border-radius: 8px; cursor: crosshair; height: 500px; overflow-y: scroll; background: #525659; }
.pdf-canvas { display: block; width: 100%; height: auto; }
.sig-overlay { position: absolute; background: rgba(239,246,255,0.92); border: 1.5px solid #1a3a5c; border-radius: 6px; padding: 6px 10px; pointer-events: none; min-width: 200px; }
.sig-overlay-img { height: 36px; max-width: 160px; object-fit: contain; display: block; }
.sig-overlay-inner { font-size: 18px; color: #1a237e; }
.sig-overlay-meta { font-size: 10px; color: #555; margin-top: 2px; }
.sigpad-actions { display: flex; gap: 12px; }
.pdf-loading { display: flex; align-items: center; gap: 8px; padding: 32px; justify-content: center; color: #666; background: #f8f9fa; border-radius: 8px; }
.pdf-error { display: flex; align-items: center; gap: 8px; padding: 16px; color: #dc2626; background: #fee2e2; border-radius: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>