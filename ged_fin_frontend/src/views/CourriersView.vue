<template>
  <div class="layout">
    <SidebarNav />
    <main class="main-content">

      <div class="page-header">
        <div>
          <h1><Mail :size="28" class="title-icon" /> Courriers</h1>
          <p>
            <span v-if="authStore.isAdmin">Gérez les courriers entrants, sortants et notes internes</span>
            <span v-else>Consultez les courriers et notes internes adressés à votre service</span>
          </p>
        </div>
        <button v-if="authStore.canCreateCourrier" class="btn btn-primary" @click="showCreateModal = true">
          <Plus :size="16" /> Nouveau courrier
        </button>
      </div>

      <div v-if="authStore.isAdmin" class="tabs-row">
        <button :class="['tab-btn', activeTab === 'EXTERNE' ? 'tab-active' : '']" @click="switchTab('EXTERNE')">
          <Globe :size="15" /> Courriers Externes
        </button>
        <button :class="['tab-btn', activeTab === 'INTERNE' ? 'tab-active' : '']" @click="switchTab('INTERNE')">
          <Building2 :size="15" /> Notes Internes
        </button>
      </div>

      <StatCards v-if="stats && authStore.canViewStatsCourrier" :stats="statItems" />

      <div class="card mt-16">
        <div class="filters-row">
          <div class="form-group">
            <label>Type</label>
            <select v-model="filters.type" @change="loadCourriers()">
              <option value="">Tous</option>
              <option value="ENTRANT">Entrant</option>
              <option value="SORTANT">Sortant</option>
            </select>
          </div>
          <div class="form-group">
            <label>Statut</label>
            <select v-model="filters.statut" @change="loadCourriers()">
              <option value="">Tous</option>
              <option value="RECU">Reçu</option>
              <option value="DISPATCHE">Dispatché</option>
              <option value="EN_TRAITEMENT">En traitement</option>
              <option value="EN_APPROBATION">En approbation</option>
              <option value="APPROUVE">Approuvé</option>
              <option value="ENVOYE">Envoyé</option>
              <option value="ARCHIVE">Archivé</option>
            </select>
          </div>
          <div class="form-group">
            <label>Priorité</label>
            <select v-model="filters.priorite" @change="loadCourriers()">
              <option value="">Toutes</option>
              <option value="NORMALE">Normale</option>
              <option value="HAUTE">Haute</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
          <div class="form-group">
            <label>Recherche</label>
            <input v-model="filters.search" type="text" placeholder="Objet, expéditeur..." @keyup.enter="loadCourriers()" />
          </div>
          <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:0">
            <button class="btn btn-secondary" @click="loadCourriers()" title="Rechercher"><Search :size="15" /></button>
            <button class="btn btn-secondary" @click="resetFilters" title="Réinitialiser"><RotateCcw :size="15" /></button>
          </div>
        </div>
      </div>

      <div class="card mt-16">
        <div v-if="loading" class="loading">
          <Loader :size="24" class="spin" /> Chargement...
        </div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>Référence</th><th>Type</th><th>Nature</th><th>Objet</th>
              <th>Expéditeur</th><th>Destinataire</th><th>Service dest.</th>
              <th>Assigné à</th><th>Priorité</th><th>Statut</th><th>Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="courriers.length === 0">
              <td :colspan="12" style="text-align:center; color:#999">Aucun courrier trouvé</td>
            </tr>
            <tr v-for="c in courriers" :key="c.id">
              <td><strong class="clickable" @click="openDetail(c)">{{ c.reference }}</strong></td>
              <td>
                <span :class="`badge-simple ${c.type === 'ENTRANT' ? 'type-entrant' : 'type-sortant'}`">
                  <ArrowDownCircle v-if="c.type === 'ENTRANT'" :size="12" />
                  <ArrowUpCircle   v-else :size="12" />
                  {{ c.type === 'ENTRANT' ? 'Entrant' : 'Sortant' }}
                </span>
              </td>
              <td>
                <span :class="`badge-simple ${c.nature === 'EXTERNE' ? 'nature-externe' : 'nature-interne'}`">
                  <Globe v-if="c.nature === 'EXTERNE'" :size="12" />
                  <Building2 v-else :size="12" />
                  {{ c.nature === 'EXTERNE' ? 'Externe' : 'Interne' }}
                </span>
              </td>
              <td>{{ c.objet }}</td>
              <td>{{ c.expediteur }}</td>
              <td>{{ c.destinataire }}</td>
              <td>
                <span v-if="c.serviceDestinataire" class="badge-simple nature-interne">{{ c.serviceDestinataire.nom }}</span>
                <span v-else class="text-muted">—</span>
              </td>
              <td>
                <span v-if="c.assignee" class="assignee-badge">
                  <User :size="11" /> {{ c.assignee.firstName }} {{ c.assignee.lastName }}
                </span>
                <span v-else class="text-muted">—</span>
              </td>
              <td><span :class="`badge-simple ${getPriorityClass(c.priorite)}`">{{ c.priorite }}</span></td>
              <td><span :class="`badge-simple ${getStatutClass(c.statut)}`">{{ formatStatut(c.statut) }}</span></td>
              <td>{{ formatDate(c.dateReception || c.dateEnvoi) }}</td>
              <td>
                <div class="actions">
                  <button class="btn-action" @click="openDetail(c)" title="Voir détails"><Eye :size="15" /></button>
                  <button v-if="authStore.canAccessCourrierExterne && c.statut === 'RECU'"
                    class="btn-action btn-dispatch" @click="openDispatch(c)" title="Dispatcher">
                    <Send :size="15" />
                  </button>
                  <button v-if="c.statut === 'EN_TRAITEMENT' && authStore.canChangeStatutCourrier"
                    class="btn-action btn-submit" @click="soumettreApprobation(c)" title="Soumettre pour approbation">
                    <CheckCircle :size="15" />
                  </button>
                  <button v-if="c.statut === 'EN_APPROBATION' && authStore.canChangeStatutCourrier"
                    class="btn-action btn-approve" @click="approuver(c)" title="Approuver">
                    <ThumbsUp :size="15" />
                  </button>

                  <!-- Rédiger le contenu (EN_TRAITEMENT uniquement) -->
                  <button v-if="c.type === 'SORTANT' && c.statut === 'EN_TRAITEMENT' && authStore.canChangeStatutCourrier"
                    class="btn-action btn-sign" @click="openRediger(c)" title="Rédiger le courrier">
                    <FileText :size="15" />
                  </button>

                  <!-- Signer le PDF généré (APPROUVE + PDF existant) -->
                  <button v-if="c.type === 'SORTANT' && !c.isSigned && c.statut === 'APPROUVE' && c.alfrescoPdfNodeId && authStore.canChangeStatutCourrier"
                    class="btn-action btn-sign" @click="openSigner(c)" title="Signer le courrier">
                    <PenLine :size="15" />
                  </button>

                  <button v-if="c.type === 'ENTRANT' && ['EN_TRAITEMENT','DISPATCHE'].includes(c.statut) && authStore.canCreateCourrier"
                    class="btn-action btn-reply" @click="openReponse(c)" title="Répondre">
                    <Reply :size="15" />
                  </button>
                  <button v-if="['APPROUVE','ENVOYE','TRAITE'].includes(c.statut) && authStore.canChangeStatutCourrier"
                    class="btn-action btn-archive" @click="archiverCourrier(c)" title="Archiver">
                    <Archive :size="15" />
                  </button>
                  <button v-if="authStore.canChangeStatutCourrier"
                    class="btn-action btn-statut" @click="openStatut(c)" title="Changer statut">
                    <RefreshCw :size="15" />
                  </button>
                  <button v-if="authStore.canUpdateCourrier"
                    class="btn-action btn-edit" @click="openEdit(c)" title="Modifier">
                    <Pencil :size="15" />
                  </button>
                  <button v-if="authStore.canDeleteCourrier"
                    class="btn-action btn-danger" @click="deleteCourrier(c)" title="Supprimer">
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" v-if="pagination.pages > 1">
          <button class="btn btn-secondary" :disabled="pagination.page === 1" @click="loadCourriers(pagination.page - 1)">
            <ChevronLeft :size="15" /> Précédent
          </button>
          <span>Page {{ pagination.page }} / {{ pagination.pages }}</span>
          <button class="btn btn-secondary" :disabled="pagination.page === pagination.pages" @click="loadCourriers(pagination.page + 1)">
            Suivant <ChevronRight :size="15" />
          </button>
        </div>
      </div>
    </main>

    <!-- Modal Détails -->
    <BaseModal :show="showDetailModal" large @close="showDetailModal = false; showPdfInDetail = false; pdfPreviewUrl = ''">
      <template #title>
        <Mail :size="20" class="title-icon" /> {{ selectedCourrier?.reference }}
        <span v-if="selectedCourrier?.isSigned" class="badge-simple statut-approuve" style="margin-left:8px; font-size:11px;">
          <PenLine :size="11" /> Signé
        </span>
      </template>

      <div v-if="selectedCourrier" class="circuit-bar">
        <div v-for="(etape, i) in circuitEtapes" :key="etape.value"
          :class="['circuit-step', getCircuitStepClass(etape.value, selectedCourrier)]">
          <div class="circuit-dot"></div>
          <span>{{ etape.label }}</span>
          <div v-if="i < circuitEtapes.length - 1" class="circuit-line"></div>
        </div>
      </div>

      <div v-if="selectedCourrier?.courrierParent" class="parent-info">
        <Reply :size="14" /> En réponse à :
        <strong>{{ selectedCourrier.courrierParent.reference }}</strong>
        — {{ selectedCourrier.courrierParent.objet }}
      </div>

      <div v-if="selectedCourrier?.reponses?.length" class="reponses-list">
        <p class="reponses-title"><MessageSquare :size="14" /> Réponses liées :</p>
        <div v-for="r in selectedCourrier.reponses" :key="r.id" class="reponse-item">
          <strong>{{ r.reference }}</strong>
          <span :class="`badge-simple ${getStatutClass(r.statut)}`">{{ formatStatut(r.statut) }}</span>
        </div>
      </div>

      <div v-if="selectedCourrier?.isSigned && selectedCourrier?.signatureData" class="signature-info">
        <PenLine :size="14" />
        Signé par <strong>{{ selectedCourrier.signatureData.signerName }}</strong>
        le {{ formatDate(selectedCourrier.signedAt) }}
      </div>

      <div class="detail-grid">
        <div class="detail-row" v-for="field in detailFields" :key="field.label">
          <span class="detail-label">{{ field.label }}</span>
          <span v-if="field.badge" :class="`badge-simple ${field.badgeClass(selectedCourrier)}`">
            {{ field.format ? field.format(selectedCourrier) : selectedCourrier?.[field.key] }}
          </span>
          <span v-else>{{ field.format ? field.format(selectedCourrier) : selectedCourrier?.[field.key] || '—' }}</span>
        </div>
      </div>

      <!-- Prévisualisation PDF si disponible -->
      <div v-if="selectedCourrier?.alfrescoPdfNodeId" style="margin-top: 16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <strong style="font-size:13px;">📄 Document PDF</strong>
          <button class="btn btn-secondary" style="font-size:12px; padding:4px 10px;" @click="togglePdfInDetail(selectedCourrier)">
            {{ showPdfInDetail ? 'Masquer le PDF' : 'Prévisualiser le PDF' }}
          </button>
        </div>
        <div v-if="loadingPdfPreview" class="pdf-loading-banner">
          <Loader :size="16" class="spin" /> Chargement du PDF...
        </div>
        <iframe
          v-else-if="showPdfInDetail && pdfPreviewUrl"
          :src="pdfPreviewUrl"
          style="width:100%; height:500px; border:1px solid #e2e8f0; border-radius:8px;"
        />
      </div>

      <template #actions>
        <button v-if="authStore.canAccessCourrierExterne && selectedCourrier?.statut === 'RECU'"
          class="btn btn-primary" @click="showDetailModal = false; openDispatch(selectedCourrier)">
          <Send :size="15" /> Dispatcher
        </button>
        <button v-if="selectedCourrier?.statut === 'EN_TRAITEMENT' && authStore.canChangeStatutCourrier"
          class="btn btn-primary" @click="showDetailModal = false; soumettreApprobation(selectedCourrier)">
          <CheckCircle :size="15" /> Soumettre approbation
        </button>
        <button v-if="selectedCourrier?.statut === 'EN_APPROBATION' && authStore.canChangeStatutCourrier"
          class="btn btn-primary" @click="showDetailModal = false; approuver(selectedCourrier)">
          <ThumbsUp :size="15" /> Approuver
        </button>
        <!-- Rédiger le contenu (EN_TRAITEMENT) -->
        <button v-if="selectedCourrier?.type === 'SORTANT' && selectedCourrier?.statut === 'EN_TRAITEMENT' && authStore.canChangeStatutCourrier"
          class="btn btn-sign-full" @click="showDetailModal = false; openRediger(selectedCourrier)">
          <FileText :size="15" /> Rédiger le courrier
        </button>
        <!-- Signer le PDF généré (APPROUVE + PDF disponible) -->
        <button v-if="selectedCourrier?.type === 'SORTANT' && !selectedCourrier?.isSigned && selectedCourrier?.statut === 'APPROUVE' && selectedCourrier?.alfrescoPdfNodeId && authStore.canChangeStatutCourrier"
          class="btn btn-sign-full" @click="showDetailModal = false; openSigner(selectedCourrier)">
          <PenLine :size="15" /> Signer le courrier
        </button>
        <button v-if="['APPROUVE','ENVOYE'].includes(selectedCourrier?.statut) && authStore.canChangeStatutCourrier"
          class="btn btn-secondary" @click="showDetailModal = false; archiverCourrier(selectedCourrier)">
          <Archive :size="15" /> Archiver
        </button>
        <button v-if="authStore.canChangeStatutCourrier"
          class="btn btn-secondary" @click="showDetailModal = false; openStatut(selectedCourrier)">
          <RefreshCw :size="15" /> Changer statut
        </button>
      </template>
    </BaseModal>

    <!-- Modal Créer/Modifier -->
    <BaseModal :show="showCreateModal || showEditModal" cancel-text="Annuler"
      @close="showCreateModal = false; showEditModal = false">
      <template #title>
        <Pencil v-if="showEditModal" :size="20" class="title-icon" />
        <Plus   v-else :size="20" class="title-icon" />
        {{ showEditModal ? 'Modifier le courrier' : 'Nouveau courrier' }}
      </template>

      <div v-if="authStore.canAccessCourrierExterne" class="form-group">
        <label>Nature *</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" v-model="form.nature" value="EXTERNE" :disabled="showEditModal" />
            <Globe :size="14" /> Externe
          </label>
          <label class="radio-label">
            <input type="radio" v-model="form.nature" value="INTERNE" :disabled="showEditModal" />
            <Building2 :size="14" /> Interne
          </label>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Type *</label>
          <select v-model="form.type" :disabled="showEditModal">
            <option value="ENTRANT">Entrant</option>
            <option value="SORTANT">Sortant</option>
          </select>
        </div>
        <div class="form-group">
          <label>Priorité</label>
          <select v-model="form.priorite">
            <option value="NORMALE">Normale</option>
            <option value="HAUTE">Haute</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Objet *</label>
        <input v-model="form.objet" type="text" placeholder="Objet du courrier" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Expéditeur *</label>
          <input v-model="form.expediteur" type="text" placeholder="Expéditeur" />
        </div>
        <div class="form-group">
          <label>Destinataire *</label>
          <input v-model="form.destinataire" type="text" placeholder="Destinataire" />
        </div>
      </div>

      <div class="form-group" v-if="form.type === 'ENTRANT'">
        <label>Date de réception</label>
        <input v-model="form.dateReception" type="date" />
      </div>
      <div class="form-group" v-if="form.type === 'SORTANT'">
        <label>Date d'envoi</label>
        <input v-model="form.dateEnvoi" type="date" />
      </div>

      <div class="form-group" v-if="form.nature === 'INTERNE'">
        <label class="radio-label">
          <input type="checkbox" v-model="form.destinataireTous" />
          <Globe :size="14" /> Envoyer à tous les services
        </label>
        <p class="field-hint" v-if="form.destinataireTous">
          Ce courrier sera visible par tous les services de l'organisation.
        </p>
      </div>

      <div class="form-group">
        <label>Notes</label>
        <textarea v-model="form.notes" rows="2" placeholder="Notes..."></textarea>
      </div>

      <div class="form-group">
        <label>Joindre un document (optionnel)</label>
        <div class="file-upload-area" @click="$refs.fileInput.click()" @dragover.prevent @drop.prevent="handleFileDrop">
          <Paperclip :size="18" />
          <span v-if="!form.fichierJoint">Cliquez ou glissez un fichier ici</span>
          <span v-else class="file-name">{{ form.fichierJoint.name }}</span>
        </div>
        <input ref="fileInput" type="file" style="display:none" accept=".pdf,.doc,.docx,.jpg,.png"
          @change="handleFileSelect" />
        <button v-if="form.fichierJoint" class="btn-clear-file" @click.stop="form.fichierJoint = null">
          <X :size="13" /> Supprimer le fichier
        </button>
      </div>

      <template #actions>
        <button class="btn btn-primary" @click="handleSave">
          <Save :size="15" /> {{ showEditModal ? 'Modifier' : 'Créer' }}
        </button>
      </template>
    </BaseModal>

    <!-- Modal Dispatch -->
    <BaseModal :show="showDispatchModal" cancel-text="Annuler" @close="showDispatchModal = false">
      <template #title>
        <Send :size="20" class="title-icon" /> Dispatcher le courrier
      </template>
      <p style="color:#666; margin-bottom:16px">Courrier : <strong>{{ selectedCourrier?.reference }}</strong></p>
      <div class="form-group">
        <label>Service destinataire *</label>
        <select v-model="dispatchForm.serviceDestinataireId" @change="loadMembresService">
          <option value="">— Sélectionner un service —</option>
          <option v-for="s in services" :key="s.id" :value="s.id">{{ s.nom }}</option>
        </select>
      </div>
      <div class="form-group" v-if="dispatchForm.serviceDestinataireId">
        <label><User :size="14" style="display:inline-flex;vertical-align:middle;margin-right:4px" /> Assigner à une personne (optionnel)</label>
        <div v-if="loadingMembres" class="membres-loading">
          <Loader :size="14" class="spin" /> Chargement des membres...
        </div>
        <select v-else v-model="dispatchForm.assigneA">
          <option value="">— Aucune personne spécifique (tout le service) —</option>
          <option v-for="m in membresService" :key="m.id" :value="m.id">
            {{ m.firstName }} {{ m.lastName }}{{ m.roleName ? ' — ' + m.roleName : '' }}
          </option>
        </select>
        <p class="field-hint">Si aucune personne n'est sélectionnée, le courrier sera visible par tout le service destinataire.</p>
      </div>
      <div class="form-group">
        <label>Instructions</label>
        <textarea v-model="dispatchForm.instructions" rows="3" placeholder="Instructions pour le service destinataire..."></textarea>
      </div>
      <template #actions>
        <button class="btn btn-primary" @click="handleDispatch"><Send :size="15" /> Dispatcher</button>
      </template>
    </BaseModal>

    <!-- Modal Réponse -->
    <BaseModal :show="showReponseModal" cancel-text="Annuler" @close="showReponseModal = false">
      <template #title>
        <Reply :size="20" class="title-icon" /> Répondre au courrier
      </template>
      <p style="color:#666; margin-bottom:16px">
        En réponse à : <strong>{{ selectedCourrier?.reference }}</strong> — {{ selectedCourrier?.objet }}
      </p>
      <div class="form-group">
        <label>Objet de la réponse *</label>
        <input v-model="reponseForm.objet" type="text" placeholder="Objet de la réponse" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Expéditeur *</label>
          <input v-model="reponseForm.expediteur" type="text" placeholder="Expéditeur" />
        </div>
        <div class="form-group">
          <label>Destinataire *</label>
          <input v-model="reponseForm.destinataire" type="text" placeholder="Destinataire" />
        </div>
      </div>
      <div class="form-group">
        <label>Priorité</label>
        <select v-model="reponseForm.priorite">
          <option value="NORMALE">Normale</option>
          <option value="HAUTE">Haute</option>
          <option value="URGENTE">Urgente</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea v-model="reponseForm.notes" rows="3" placeholder="Contenu de la réponse..."></textarea>
      </div>
      <template #actions>
        <button class="btn btn-primary" @click="handleReponse"><Save :size="15" /> Créer la réponse</button>
      </template>
    </BaseModal>

    <!-- ✅ NOUVELLE Modal : Rédiger & Générer PDF -->
    <BaseModal :show="showRedigerModal" large cancel-text="Annuler" @close="showRedigerModal = false">
      <template #title>
        <FileText :size="20" class="title-icon" color="#4338ca" /> Rédiger le courrier
      </template>
      <p style="color:#666; margin-bottom:4px">
        Courrier : <strong>{{ selectedCourrier?.reference }}</strong> — {{ selectedCourrier?.objet }}
      </p>
      <p style="color:#888; font-size:13px; margin-bottom:16px">
        Rédigez le contenu du courrier. Un PDF professionnel sera généré automatiquement et vous pourrez ensuite le signer.
      </p>

      <div class="form-group">
        <label>Corps du courrier *</label>
        <textarea
          v-model="corpsRedige"
          rows="12"
          placeholder="Madame, Monsieur,&#10;&#10;Suite à votre demande du ...&#10;&#10;Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées."
          style="font-family: 'Georgia', serif; font-size: 14px; line-height: 1.8; resize: vertical;"
        ></textarea>
        <p class="field-hint">{{ corpsRedige.length }} caractère(s)</p>
      </div>

      <template #actions>
        <button class="btn btn-primary" :disabled="!corpsRedige.trim() || generatingPdf" @click="handleGenererPdf">
          <Loader v-if="generatingPdf" :size="15" class="spin" />
          <FileText v-else :size="15" />
          {{ generatingPdf ? 'Génération...' : 'Générer le PDF & Signer' }}
        </button>
      </template>
    </BaseModal>

    <!-- Modal Signer -->
    <BaseModal :show="showSignerModal" large cancel-text="Annuler" @close="showSignerModal = false">
      <template #title>
        <PenLine :size="20" class="title-icon" /> Signer le courrier
      </template>
      <p style="color:#666; margin-bottom:16px">
        Courrier : <strong>{{ selectedCourrier?.reference }}</strong> — {{ selectedCourrier?.objet }}
      </p>

      <div v-if="loadingCourrierPdf" class="pdf-loading-banner">
        <Loader :size="16" class="spin" /> Chargement du document...
      </div>

      <div v-else-if="!courrierPdfBytes && !loadingCourrierPdf" class="no-pdf-banner">
        <FileText :size="16" />
        Aucun document joint — la signature sera enregistrée sans placement sur PDF.
      </div>

      <SignaturePad
        v-if="!loadingCourrierPdf"
        :signerName="authStore.fullName"
        :pdfBytes="courrierPdfBytes"
        :showPdf="!!courrierPdfBytes"
        @confirm="handleSigner"
      />
    </BaseModal>

    <!-- Modal Statut -->
    <BaseModal :show="showStatutModal" cancel-text="Annuler" @close="showStatutModal = false">
      <template #title>
        <RefreshCw :size="20" class="title-icon" /> Changer le statut
      </template>
      <p style="color:#666; margin-bottom:16px">Courrier : <strong>{{ selectedCourrier?.reference }}</strong></p>
      <div class="form-group">
        <label>Statut actuel</label>
        <span :class="`badge-simple ${getStatutClass(selectedCourrier?.statut)}`">
          {{ formatStatut(selectedCourrier?.statut) }}
        </span>
      </div>
      <div class="form-group">
        <label>Nouveau statut</label>
        <select v-model="newStatut">
          <option v-for="s in transitionsDisponibles" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <template #actions>
        <button class="btn btn-primary" @click="handleStatut"><Check :size="15" /> Confirmer</button>
      </template>
    </BaseModal>

    <!-- ✅ NOUVELLE Modal : Durée de conservation (Archives) -->
    <BaseModal :show="showRetentionModal" cancel-text="Annuler" @close="showRetentionModal = false">
      <template #title>
        <Clock :size="20" class="title-icon" color="#d97706" /> Durée de conservation
      </template>
      <p style="color:#666; margin-bottom:8px">
        Courrier : <strong>{{ selectedCourrier?.reference }}</strong>
      </p>
      <p style="color:#888; font-size:13px; margin-bottom:16px">
        Définissez la durée pendant laquelle ce courrier archivé doit être conservé.
      </p>
      <div class="form-group">
        <label>Durée de conservation (années)</label>
        <select v-model="retentionYears">
          <option :value="1">1 an</option>
          <option :value="2">2 ans</option>
          <option :value="3">3 ans</option>
          <option :value="5">5 ans (défaut)</option>
          <option :value="10">10 ans</option>
          <option :value="15">15 ans</option>
          <option :value="20">20 ans</option>
          <option :value="30">30 ans</option>
        </select>
      </div>
      <p class="field-hint">
        Date d'expiration estimée :
        <strong>{{ selectedCourrier?.archivedAt
          ? new Date(new Date(selectedCourrier.archivedAt).setFullYear(new Date(selectedCourrier.archivedAt).getFullYear() + retentionYears)).toLocaleDateString('fr-FR')
          : '—' }}</strong>
      </p>
      <template #actions>
        <button class="btn btn-primary" @click="handleRetention">
          <Check :size="15" /> Confirmer
        </button>
      </template>
    </BaseModal>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore }                    from '../stores/auth'
import { courrierService, serviceService } from '../services/api'
import api                                 from '../services/api'
import SidebarNav    from '../components/SidebarNav.vue'
import BaseModal     from '../components/BaseModal.vue'
import StatCards     from '../components/StatCards.vue'
import SignaturePad  from '../components/SignaturePad.vue'
import {
  Mail, Eye, Trash2, Search, RotateCcw, Plus, RefreshCw, Pencil,
  ChevronLeft, ChevronRight, Loader, ArrowDownCircle, ArrowUpCircle,
  Globe, Building2, Archive, User, Send, CheckCircle, ThumbsUp, Reply,
  PenLine, X, FileText
} from 'lucide-vue-next'

const authStore  = useAuthStore()
const courriers  = ref([])
const stats      = ref(null)
const services   = ref([])
const membresService  = ref([])
const loadingMembres  = ref(false)
const loading    = ref(true)
const pagination = ref({ page: 1, pages: 1 })
const filters    = ref({ type: '', statut: '', priorite: '', search: '' })
const activeTab  = ref(authStore.isAdmin ? 'EXTERNE' : 'ALL')

const showCreateModal   = ref(false)
const showEditModal     = ref(false)
const showStatutModal   = ref(false)
const showDetailModal   = ref(false)
const showDispatchModal = ref(false)
const showReponseModal  = ref(false)
const showSignerModal   = ref(false)
const showRedigerModal  = ref(false)   // ✅ NOUVEAU
const showRetentionModal = ref(false)  // ✅ NOUVEAU
const showPdfInDetail    = ref(false)
const pdfPreviewUrl      = ref('')
const loadingPdfPreview  = ref(false)

const selectedCourrier   = ref(null)
const newStatut          = ref('')
const fileInput          = ref(null)
const courrierPdfBytes   = ref('')
const loadingCourrierPdf = ref(false)
const corpsRedige        = ref('')     // ✅ NOUVEAU
const generatingPdf      = ref(false)  // ✅ NOUVEAU
const retentionYears     = ref(5)      // ✅ NOUVEAU

const dispatchForm = ref({ serviceDestinataireId: '', assigneA: '', instructions: '' })
const reponseForm  = ref({ objet: '', expediteur: '', destinataire: '', priorite: 'NORMALE', notes: '', nature: 'EXTERNE', type: 'SORTANT', dateEnvoi: '' })

const circuitEtapes = [
  { value: 'ENREGISTREMENT', label: 'Enregistré' },
  { value: 'DISPATCH',       label: 'Dispatché' },
  { value: 'EN_TRAITEMENT',  label: 'En traitement' },
  { value: 'EN_APPROBATION', label: 'En approbation' },
  { value: 'APPROUVE',       label: 'Approuvé' },
  { value: 'ENVOYE',         label: 'Expédié' },
]
const etapeOrder = circuitEtapes.map(e => e.value)

const getCircuitStepClass = (etapeValue, courrier) => {
  const ci = etapeOrder.indexOf(courrier?.etapeCircuit)
  const si = etapeOrder.indexOf(etapeValue)
  if (si < ci)   return 'step-done'
  if (si === ci) return 'step-current'
  return 'step-pending'
}

const TRANSITIONS = {
  RECU:          [{ value: 'DISPATCHE',      label: 'Dispatcher' },            { value: 'ARCHIVE', label: 'Archiver' }],
  DISPATCHE:     [{ value: 'EN_TRAITEMENT',  label: 'Prendre en charge' },     { value: 'ARCHIVE', label: 'Archiver' }],
  EN_TRAITEMENT: [{ value: 'EN_APPROBATION', label: 'Soumettre approbation' }, { value: 'DISPATCHE', label: 'Redispatcher' }, { value: 'ARCHIVE', label: 'Archiver' }],
  EN_APPROBATION:[{ value: 'APPROUVE',       label: 'Approuver' },             { value: 'EN_TRAITEMENT', label: 'Retourner en traitement' }],
  APPROUVE:      [{ value: 'ENVOYE',         label: 'Marquer envoyé' },        { value: 'EN_TRAITEMENT', label: 'Retourner en traitement' }],
  ENVOYE:        [{ value: 'ARCHIVE',        label: 'Archiver' }],
  ARCHIVE:       [],
}

const transitionsDisponibles = computed(() => TRANSITIONS[selectedCourrier.value?.statut] || [])

const emptyForm = () => ({
  nature: authStore.canAccessCourrierExterne ? 'EXTERNE' : 'INTERNE',
  type: 'ENTRANT', objet: '', expediteur: '', destinataire: '',
  dateReception: '', dateEnvoi: '', priorite: 'NORMALE', notes: '', fichierJoint: null,
})
const form = ref(emptyForm())

const statItems = computed(() => stats.value ? [
  { icon: MailOpen,      value: stats.value.totalEntrants, label: 'Entrants',      color: '#dbeafe', iconColor: '#2563eb' },
  { icon: MailCheck,     value: stats.value.totalSortants, label: 'Sortants',      color: '#dcfce7', iconColor: '#16a34a' },
  { icon: Clock,         value: stats.value.enTraitement,  label: 'En traitement', color: '#fef9c3', iconColor: '#ca8a04' },
  { icon: AlertTriangle, value: stats.value.urgents,       label: 'Urgents',       color: '#fee2e2', iconColor: '#dc2626' },
] : [])

const formatDate   = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
const formatStatut = (s) => ({ RECU:'Reçu', DISPATCHE:'Dispatché', EN_TRAITEMENT:'En traitement', EN_APPROBATION:'En approbation', APPROUVE:'Approuvé', ENVOYE:'Envoyé', ARCHIVE:'Archivé' })[s] || s
const formatEtape  = (e) => ({ ENREGISTREMENT:'Enregistré', DISPATCH:'Dispatché', EN_TRAITEMENT:'En traitement', EN_APPROBATION:'En approbation', APPROUVE:'Approuvé', ENVOYE:'Expédié' })[e] || e || '—'
const getStatutClass   = (s) => ({ RECU:'statut-recu', DISPATCHE:'statut-dispatche', EN_TRAITEMENT:'statut-traitement', EN_APPROBATION:'statut-approbation', APPROUVE:'statut-approuve', ENVOYE:'statut-envoye', ARCHIVE:'statut-archive' })[s] || 'statut-recu'
const getEtapeClass    = (e) => ({ ENREGISTREMENT:'statut-recu', DISPATCH:'statut-dispatche', EN_TRAITEMENT:'statut-traitement', EN_APPROBATION:'statut-approbation', APPROUVE:'statut-approuve', ENVOYE:'statut-envoye' })[e] || 'statut-recu'
const getPriorityClass = (p) => ({ NORMALE:'priorite-normale', HAUTE:'priorite-haute', URGENTE:'priorite-urgente' })[p] || 'priorite-normale'

const detailFields = [
  { label:'Nature',        key:'nature',        badge:true, badgeClass:(c)=>c?.nature==='EXTERNE'?'nature-externe':'nature-interne', format:(c)=>c?.nature==='EXTERNE'?'Externe':'Interne' },
  { label:'Type',          key:'type',          badge:true, badgeClass:(c)=>c?.type==='ENTRANT'?'type-entrant':'type-sortant', format:(c)=>c?.type==='ENTRANT'?'Entrant':'Sortant' },
  { label:'Statut',        key:'statut',        badge:true, badgeClass:(c)=>getStatutClass(c?.statut), format:(c)=>formatStatut(c?.statut) },
  { label:'Étape',         key:'etapeCircuit',  badge:true, badgeClass:(c)=>getEtapeClass(c?.etapeCircuit), format:(c)=>formatEtape(c?.etapeCircuit) },
  { label:'Objet',         key:'objet' },
  { label:'Expéditeur',    key:'expediteur' },
  { label:'Destinataire',  key:'destinataire' },
  { label:'Service dest.', key:'serviceDestinataire', format:(c)=>c?.serviceDestinataire?.nom||'—' },
  { label:'Assigné à',     key:'assignee', format:(c)=>c?.assignee?`${c.assignee.firstName} ${c.assignee.lastName}`:'—' },
  { label:'Instructions',  key:'instructionsDispatch' },
  { label:'Priorité',      key:'priorite', badge:true, badgeClass:(c)=>getPriorityClass(c?.priorite), format:(c)=>c?.priorite },
  { label:'Document joint',key:'document', format:(c)=>c?.document?.title||'—' },
  { label:'Date',          key:'dateReception', format:(c)=>formatDate(c?.dateReception||c?.dateEnvoi) },
  { label:'Notes',         key:'notes' },
]

const handleFileSelect = (e) => { form.value.fichierJoint = e.target.files[0] || null }
const handleFileDrop   = (e) => { form.value.fichierJoint = e.dataTransfer.files[0] || null }

const loadServices = async () => {
  try { services.value = (await serviceService.getAll()).data.data || [] } catch (e) { console.error(e) }
}

const loadMembresService = async () => {
  membresService.value = []
  dispatchForm.value.assigneA = ''
  if (!dispatchForm.value.serviceDestinataireId) return
  loadingMembres.value = true
  try { membresService.value = (await api.get(`/services/${dispatchForm.value.serviceDestinataireId}/membres`)).data.data || [] }
  catch (e) { console.error(e) }
  finally { loadingMembres.value = false }
}

const switchTab    = (tab) => { activeTab.value = tab; filters.value = { type:'', statut:'', priorite:'', search:'' }; loadCourriers() }
const resetFilters = () => { filters.value = { type:'', statut:'', priorite:'', search:'' }; loadCourriers() }

const loadCourriers = async (page = 1) => {
  loading.value = true
  try {
    const params = {
      page, limit: 10,
      type:     filters.value.type     || undefined,
      statut:   filters.value.statut   || undefined,
      priorite: filters.value.priorite || undefined,
      search:   filters.value.search   || undefined,
    }
    if (!authStore.isAdmin) {
      params.serviceDestinataireId = authStore.serviceId
    } else {
      params.nature = activeTab.value
    }
    const res = await courrierService.list(params)
    courriers.value  = res.data.courriers
    pagination.value = res.data.pagination
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const loadStats = async () => {
  if (!authStore.canViewStatsCourrier) return
  try {
    const params = {}
    if (!authStore.isAdmin) params.serviceDestinataireId = authStore.serviceId
    stats.value = (await courrierService.stats(params)).data.data
  } catch (e) { console.error(e) }
}

const openDetail = async (c) => {
  try { selectedCourrier.value = (await courrierService.get(c.id)).data.data } catch { selectedCourrier.value = c }
  showDetailModal.value = true
}

const openEdit = (c) => {
  selectedCourrier.value = c
  form.value = {
    nature: c.nature, type: c.type, objet: c.objet,
    expediteur: c.expediteur, destinataire: c.destinataire,
    dateReception: c.dateReception || '', dateEnvoi: c.dateEnvoi || '',
    priorite: c.priorite, notes: c.notes || '', fichierJoint: null
  }
  showEditModal.value = true
}

const openStatut = (c) => {
  selectedCourrier.value = c
  newStatut.value = (TRANSITIONS[c.statut]||[])[0]?.value || c.statut
  showStatutModal.value = true
}

const openDispatch = async (c) => {
  selectedCourrier.value = c
  dispatchForm.value = { serviceDestinataireId: c.serviceDestinataireId || '', assigneA: c.assigneA || '', instructions: '' }
  membresService.value = []
  if (c.serviceDestinataireId) {
    loadingMembres.value = true
    try { membresService.value = (await api.get(`/services/${c.serviceDestinataireId}/membres`)).data.data || [] }
    catch (e) { console.error(e) }
    finally { loadingMembres.value = false }
  }
  showDispatchModal.value = true
}

const openReponse = (c) => {
  selectedCourrier.value = c
  reponseForm.value = {
    objet: `RE: ${c.objet}`, expediteur: c.destinataire, destinataire: c.expediteur,
    priorite: c.priorite, notes: '', nature: c.nature, type: 'SORTANT',
    dateEnvoi: new Date().toISOString().split('T')[0]
  }
  showReponseModal.value = true
}

// Prévisualiser le PDF dans la modal de détail
const togglePdfInDetail = async (c) => {
  if (showPdfInDetail.value) {
    showPdfInDetail.value = false
    pdfPreviewUrl.value   = ''
    return
  }
  loadingPdfPreview.value = true
  showPdfInDetail.value   = true
  try {
    const res = await api.get(`/courriers/${c.id}/pdf`, { responseType: 'arraybuffer' })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    pdfPreviewUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    console.error('Erreur chargement PDF', e)
    showPdfInDetail.value = false
  } finally {
    loadingPdfPreview.value = false
  }
}

// ✅ NOUVEAU : Ouvrir la modal de rédaction
const openRediger = (c) => {
  selectedCourrier.value = c
  corpsRedige.value      = c.corps || ''
  showRedigerModal.value = true
}

// ✅ NOUVEAU : Générer le PDF puis ouvrir la signature
const handleGenererPdf = async () => {
  if (!corpsRedige.value.trim()) return
  generatingPdf.value = true
  try {
    const res = await api.post(`/courriers/${selectedCourrier.value.id}/generer-pdf`, {
      corps: corpsRedige.value
    })
    showRedigerModal.value = false
    // Ouvrir directement la modal de signature avec le PDF généré
    courrierPdfBytes.value = res.data.pdfBase64
    showSignerModal.value  = true
  } catch (e) {
    alert(e.response?.data?.message || 'Erreur lors de la génération du PDF')
  } finally {
    generatingPdf.value = false
  }
}

const openSigner = async (c) => {
  selectedCourrier.value = c
  courrierPdfBytes.value = ''

  // Priorité au PDF généré (alfrescoPdfNodeId) sinon document joint
  const nodeId = c.alfrescoPdfNodeId || null
  const docId  = c.documentId || c.document?.id || null

  if (nodeId || docId) {
    loadingCourrierPdf.value = true
    try {
      if (nodeId) {
        // Charger le PDF généré depuis Alfresco directement via le backend
        const res = await api.get(`/courriers/${c.id}/pdf`, { responseType: 'arraybuffer' })
        courrierPdfBytes.value = btoa(
          new Uint8Array(res.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
      } else {
        // Charger le document joint classique
        const res = await api.get(`/documents/${docId}/download`, { responseType: 'arraybuffer' })
        courrierPdfBytes.value = btoa(
          new Uint8Array(res.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
      }
    } catch (e) {
      console.error('Impossible de charger le PDF', e)
      courrierPdfBytes.value = ''
    } finally {
      loadingCourrierPdf.value = false
    }
  }
  showSignerModal.value = true
}

// ✅ NOUVEAU : Ouvrir la modal de rétention (appelée depuis ArchivesView)
const openRetention = (c) => {
  selectedCourrier.value = c
  retentionYears.value   = c.retentionYears || 5
  showRetentionModal.value = true
}

// ✅ NOUVEAU : Sauvegarder la durée de rétention
const handleRetention = async () => {
  try {
    await api.put(`/courriers/${selectedCourrier.value.id}/retention`, {
      retentionYears: retentionYears.value
    })
    showRetentionModal.value = false
    loadCourriers()
    alert('Durée de conservation mise à jour.')
  } catch (e) {
    alert(e.response?.data?.message || 'Erreur')
  }
}

const handleSave = async () => {
  try {
    if (showEditModal.value) {
      await courrierService.update(selectedCourrier.value.id, form.value)
    } else {
      if (form.value.fichierJoint) {
        const fd = new FormData()
        Object.entries(form.value).forEach(([k, v]) => { if (v && k !== 'fichierJoint') fd.append(k, v) })
        fd.append('fichier', form.value.fichierJoint)
        await api.post('/courriers', fd)
      } else {
        await courrierService.create(form.value)
      }
    }
    showCreateModal.value = false
    showEditModal.value   = false
    form.value = emptyForm()
    loadCourriers(); loadStats()
  } catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const handleStatut = async () => {
  try {
    await courrierService.changeStatut(selectedCourrier.value.id, newStatut.value)
    showStatutModal.value = false
    loadCourriers(); loadStats()
  } catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const handleDispatch = async () => {
  if (!dispatchForm.value.serviceDestinataireId) { alert('Veuillez sélectionner un service destinataire.'); return }
  try {
    await courrierService.dispatch(selectedCourrier.value.id, {
      serviceDestinataireId: dispatchForm.value.serviceDestinataireId,
      assigneA:              dispatchForm.value.assigneA || null,
      instructions:          dispatchForm.value.instructions,
    })
    showDispatchModal.value = false
    loadCourriers(); loadStats()
  } catch (e) { alert(e.response?.data?.message || 'Erreur lors du dispatch') }
}

const soumettreApprobation = async (c) => {
  if (!confirm(`Soumettre "${c.reference}" pour approbation ?`)) return
  try { await courrierService.approbation(c.id); loadCourriers(); loadStats() }
  catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const approuver = async (c) => {
  if (!confirm(`Approuver le courrier "${c.reference}" ?`)) return
  try { await courrierService.approuver(c.id); loadCourriers(); loadStats() }
  catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const handleSigner = async (sigData) => {
  try {
    await courrierService.signerCourrier(selectedCourrier.value.id, sigData)
    showSignerModal.value = false
    loadCourriers(); loadStats()
    alert('Courrier signé avec succès !')
  } catch (e) { alert(e.response?.data?.message || 'Erreur lors de la signature') }
}

const archiverCourrier = async (c) => {
  if (!confirm(`Archiver le courrier "${c.reference}" ?`)) return
  try { await courrierService.changeStatut(c.id, 'ARCHIVE'); loadCourriers(); loadStats() }
  catch (e) { alert(e.response?.data?.message || "Erreur lors de l'archivage") }
}

const handleReponse = async () => {
  try {
    await courrierService.creerReponse(selectedCourrier.value.id, reponseForm.value)
    showReponseModal.value = false
    loadCourriers(); loadStats()
  } catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

const deleteCourrier = async (c) => {
  if (!confirm(`Supprimer "${c.reference}" ?`)) return
  try { await courrierService.delete(c.id); loadCourriers(); loadStats() }
  catch (e) { alert(e.response?.data?.message || 'Erreur') }
}

// Exposer openRetention pour ArchivesView si besoin
defineExpose({ openRetention })

onMounted(() => { loadCourriers(); loadStats(); loadServices() })
</script>

<style scoped>
.layout       { display: flex; min-height: 100vh; }
.main-content { margin-left: 240px; flex: 1; padding: 32px; background: #f5f7fa; }
.page-header  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1a3a5c; display: flex; align-items: center; gap: 8px; }
.page-header p  { color: #666; margin-top: 4px; }
.tabs-row  { display: flex; gap: 8px; margin-bottom: 16px; }
.tab-btn   { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border: 2px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-size: 14px; font-weight: 500; color: #64748b; transition: all 0.2s; }
.tab-btn:hover { border-color: #1a3a5c; color: #1a3a5c; }
.tab-active    { border-color: #1a3a5c; background: #1a3a5c; color: white; }
.circuit-bar  { display: flex; align-items: flex-start; margin-bottom: 20px; padding: 16px; background: #f8f9fa; border-radius: 10px; overflow-x: auto; gap: 0; }
.circuit-step { display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; min-width: 90px; flex: 1; }
.circuit-dot  { width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1; z-index: 1; }
.circuit-step span { font-size: 11px; color: #94a3b8; text-align: center; white-space: nowrap; margin-top: 4px; }
.circuit-line { position: absolute; top: 6px; left: 50%; width: 100%; height: 2px; background: #e2e8f0; z-index: 0; }
.step-done    .circuit-dot  { background: #16a34a; }
.step-done    span          { color: #16a34a; font-weight: 600; }
.step-done    .circuit-line { background: #16a34a; }
.step-current .circuit-dot  { background: #2563eb; box-shadow: 0 0 0 3px #bfdbfe; }
.step-current span          { color: #2563eb; font-weight: 700; }
.parent-info   { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #eff6ff; border-radius: 6px; font-size: 13px; color: #1d4ed8; margin-bottom: 12px; }
.reponses-list { padding: 10px 12px; background: #f0fdf4; border-radius: 6px; margin-bottom: 12px; }
.reponses-title { font-size: 13px; color: #15803d; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.reponse-item  { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 4px 0; }
.signature-info { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; color: #166534; margin-bottom: 12px; }
.assignee-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 3px 8px; border-radius: 6px; background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; white-space: nowrap; }
.membres-loading { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; font-size: 13px; color: #666; }
.field-hint { font-size: 12px; color: #94a3b8; margin-top: 4px; font-style: italic; }
.file-upload-area { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border: 2px dashed #cbd5e1; border-radius: 8px; cursor: pointer; color: #64748b; font-size: 14px; transition: all 0.2s; background: #fafafa; }
.file-upload-area:hover { border-color: #1a3a5c; color: #1a3a5c; background: #f0f4f8; }
.file-name    { color: #1a3a5c; font-weight: 600; }
.btn-clear-file { margin-top: 6px; display: flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid #fecaca; border-radius: 6px; background: #fee2e2; color: #dc2626; font-size: 12px; cursor: pointer; }
.filters-row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
.filters-row .form-group { margin-bottom: 0; min-width: 140px; }
.mt-16 { margin-top: 16px; }
.loading { text-align: center; padding: 48px; color: #666; display: flex; align-items: center; justify-content: center; gap: 8px; }
.text-muted { color: #94a3b8; font-size: 13px; }
.clickable { cursor: pointer; color: #1a3a5c; }
.clickable:hover { text-decoration: underline; }
.actions { display: flex; gap: 4px; flex-wrap: wrap; }
.btn-action       { padding: 5px 8px; border: none; border-radius: 6px; cursor: pointer; background: #f0f4f8; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-action:hover { opacity: 0.7; }
.btn-submit   { background: #dbeafe; color: #2563eb; }
.btn-edit     { background: #fef9c3; color: #ca8a04; }
.btn-danger   { background: #fee2e2; color: #dc2626; }
.btn-dispatch { background: #e0f2fe; color: #0369a1; }
.btn-approve  { background: #dcfce7; color: #16a34a; }
.btn-reply    { background: #f3e8ff; color: #7c3aed; }
.btn-statut   { background: #fef3c7; color: #d97706; }
.btn-sign     { background: #e0e7ff; color: #4338ca; }
.btn-archive  { background: #f1f5f9; color: #475569; }
.btn-sign-full { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; background: #e0e7ff; color: #4338ca; font-weight: 600; font-size: 14px; transition: all 0.2s; }
.btn-sign-full:hover { background: #c7d2fe; }
.badge-simple       { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 3px 8px; border-radius: 6px; border: 1px solid; white-space: nowrap; }
.type-entrant       { color: #1d4ed8; background: #eff6ff;  border-color: #bfdbfe; }
.type-sortant       { color: #15803d; background: #f0fdf4;  border-color: #bbf7d0; }
.nature-externe     { color: #6d28d9; background: #f5f3ff;  border-color: #ddd6fe; }
.nature-interne     { color: #b45309; background: #fffbeb;  border-color: #fde68a; }
.statut-recu        { color: #1e40af; background: #eff6ff;  border-color: #bfdbfe; }
.statut-dispatche   { color: #0369a1; background: #e0f2fe;  border-color: #bae6fd; }
.statut-traitement  { color: #92400e; background: #fffbeb;  border-color: #fde68a; }
.statut-approbation { color: #7c3aed; background: #f5f3ff;  border-color: #ddd6fe; }
.statut-approuve    { color: #166534; background: #f0fdf4;  border-color: #bbf7d0; }
.statut-envoye      { color: #065f46; background: #ecfdf5;  border-color: #a7f3d0; }
.statut-archive     { color: #374151; background: #f9fafb;  border-color: #e5e7eb; }
.priorite-normale   { color: #374151; background: #f9fafb;  border-color: #e5e7eb; }
.priorite-haute     { color: #92400e; background: #fffbeb;  border-color: #fde68a; }
.priorite-urgente   { color: #991b1b; background: #fff1f2;  border-color: #fecdd3; }
.pagination  { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.detail-grid { display: flex; flex-direction: column; gap: 12px; }
.detail-row  { display: flex; gap: 16px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; }
.detail-label { font-weight: 600; color: #555; min-width: 130px; font-size: 14px; }
.form-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.title-icon  { display: inline-flex; vertical-align: middle; }
.radio-group { display: flex; gap: 20px; padding: 8px 0; }
.radio-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
.radio-label input { cursor: pointer; }
.pdf-loading-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; font-size: 13px; color: #0369a1; margin-bottom: 12px; }
.no-pdf-banner      { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 13px; color: #92400e; margin-bottom: 12px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
</style>