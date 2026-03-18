<template>
  <div class="sigpad-container">

    <div class="sigpad-tabs">
      <button :class="`sigpad-tab ${mode === 'draw' ? 'active' : ''}`" @click="mode = 'draw'">
        <PenLine :size="15" /> Dessiner
      </button>
      <button :class="`sigpad-tab ${mode === 'text' ? 'active' : ''}`" @click="mode = 'text'">
        <Type :size="15" /> Écrire
      </button>
    </div>

    <div v-if="mode === 'draw'" class="draw-area">
      <p class="hint">Dessinez votre signature ci-dessous</p>
      <canvas
        ref="canvas" class="sig-canvas"
        @mousedown="startDraw" @mousemove="draw" @mouseup="stopDraw" @mouseleave="stopDraw"
        @touchstart.prevent="startDrawTouch" @touchmove.prevent="drawTouch" @touchend="stopDraw"
      />
      <button class="btn-clear" @click="clearCanvas"><Trash2 :size="14" /> Effacer</button>
    </div>

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
    </div>

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
            <div class="sig-overlay-inner" :style="{ fontFamily: mode === 'text' ? selectedFont : 'cursive' }">
              {{ getCurrentSignatureText() }}
            </div>
            <div class="sig-overlay-meta">{{ signerName }} · {{ formatDate(new Date()) }}</div>
          </div>
        </div>
      </template>
    </div>

    <div class="sigpad-actions" v-if="hasSignature && placement">
      <button class="btn btn-primary" @click="confirm">
        <Check :size="15" /> Confirmer la signature
      </button>
      <button class="btn btn-secondary" @click="resetPlacement">
        <RotateCcw :size="15" /> Repositionner
      </button>
    </div>

    <div v-else-if="hasSignature && !placement && !pdfLoading && !pdfError" class="hint-placement">
      <MousePointerClick :size="16" /> Cliquez sur le document pour placer votre signature
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import {
  PenLine, Type, Trash2, Check, RotateCcw,
  ChevronLeft, ChevronRight, MousePointerClick, Loader, FileX
} from 'lucide-vue-next'

const props = defineProps({
  pdfBytes:   { type: String, required: true },
  signerName: { type: String, default: '' },
})

const emit = defineEmits(['confirm'])

// ← Variable NON-réactive pour pdfjs
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
const pdfLoading    = ref(true)
const pdfError      = ref(null)

const fonts = [
  { name: 'Script',  value: 'Dancing Script, cursive' },
  { name: 'Cursive', value: 'Pacifico, cursive' },
  { name: 'Élégant', value: 'Great Vibes, cursive' },
  { name: 'Simple',  value: 'Arial, sans-serif' },
]

const hasSignature = computed(() => {
  if (mode.value === 'draw') return hasDrawing.value
  return signatureText.value.trim().length > 0
})

const formatDate = (d) => d.toLocaleDateString('fr-FR')
const getCurrentSignatureText = () => {
  if (mode.value === 'text') return signatureText.value || props.signerName
  return props.signerName
}

// ── Canvas dessin ─────────────────────────────────────────────
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

// ── Rendu PDF ─────────────────────────────────────────────────
const loadPdf = async (base64) => {
  pdfLoading.value = true
  pdfError.value   = null
  try {
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href

    const binary = atob(base64)
    const data   = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i)

    console.log('PDF premiers bytes:', data[0], data[1], data[2], data[3])

    // ← Stocker dans variable NON-réactive
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
  if (!pdfDocRaw || !pdfCanvas.value) {
    console.log('renderPage manquant:', !!pdfDocRaw, !!pdfCanvas.value)
    return
  }
  console.log('Rendu page', pageNum)
  const page     = await pdfDocRaw.getPage(pageNum)
  const viewport = page.getViewport({ scale: 1.3 })
  pdfCanvas.value.width  = viewport.width
  pdfCanvas.value.height = viewport.height
  await page.render({ canvasContext: pdfCanvas.value.getContext('2d'), viewport }).promise
  console.log('✅ Page rendue:', viewport.width, 'x', viewport.height)
}

const changePage = async (dir) => {
  currentPage.value += dir
  placement.value    = null
  await renderPage(currentPage.value)
}

// ── Placement ─────────────────────────────────────────────────
const placeSig = (e) => {
  const rect     = pdfCanvas.value.getBoundingClientRect()
  const scaleX   = pdfCanvas.value.width  / rect.width
  const scaleY   = pdfCanvas.value.height / rect.height
  const displayX = e.clientX - rect.left - 140
  const displayY = e.clientY - rect.top  - 30
  const pdfX     = displayX * scaleX
  const pdfY     = pdfCanvas.value.height - ((e.clientY - rect.top) * scaleY) - 110

  placement.value = {
    displayX, displayY,
    pdfX:      Math.max(0, pdfX),
    pdfY:      Math.max(0, pdfY),
    pageIndex: currentPage.value - 1,
  }
}

const resetPlacement = () => { placement.value = null }

// ── Confirmer ─────────────────────────────────────────────────
const confirm = () => {
  emit('confirm', {
    signatureType: mode.value,
    signatureText: mode.value === 'text' ? (signatureText.value || props.signerName) : props.signerName,
    x:         placement.value?.pdfX,
    y:         placement.value?.pdfY,
    pageIndex: placement.value?.pageIndex || 0,
  })
}

// ── Init ──────────────────────────────────────────────────────
onMounted(async () => {
  initCanvas()
  if (props.pdfBytes) await loadPdf(props.pdfBytes)
})

// ← Re-rendre quand la signature devient visible
watch(hasSignature, async (val) => {
  if (val && pdfDocRaw) {
    await nextTick()
    await nextTick()
    await renderPage(currentPage.value)
  }
})

watch(() => props.pdfBytes, async (bytes) => {
  if (bytes) await loadPdf(bytes)
})
</script>

<style scoped>
.sigpad-container { display: flex; flex-direction: column; gap: 20px; }
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
.sig-overlay-inner { font-size: 18px; color: #1a237e; }
.sig-overlay-meta { font-size: 10px; color: #555; margin-top: 2px; }
.sigpad-actions { display: flex; gap: 12px; }
.pdf-loading { display: flex; align-items: center; gap: 8px; padding: 32px; justify-content: center; color: #666; background: #f8f9fa; border-radius: 8px; }
.pdf-error { display: flex; align-items: center; gap: 8px; padding: 16px; color: #dc2626; background: #fee2e2; border-radius: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>