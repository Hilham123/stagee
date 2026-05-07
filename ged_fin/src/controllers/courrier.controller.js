const courrierService = require('../services/courrier.service');
const { Courrier }    = require('../models');

const courrierController = {

  // LISTER LES COURRIERS
  async listCourriers(req, res) {
    try {
      const { type, statut, priorite, nature, search, page, limit } = req.query;
      const result = await courrierService.listCourriers(
        { type, statut, priorite, nature, search },
        { page, limit },
        req.user
      );
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // RÉCUPÉRER UN COURRIER
  async getCourrier(req, res) {
    try {
      const courrier = await courrierService.getCourrier(req.params.id);
      res.json({ success: true, data: courrier });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  // SIGNER UN COURRIER
  async signerCourrier(req, res) {
    try {
      const courrier = await courrierService.signerCourrier(
        req.params.id, req.user.id, req.body
      );
      res.json({ success: true, data: courrier, message: 'Courrier signé avec succès' });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  },

  // METTRE À JOUR LA DURÉE DE RÉTENTION
  async updateRetention(req, res) {
    try {
      const { retentionYears } = req.body;
      if (!retentionYears || retentionYears < 1 || retentionYears > 50) {
        return res.status(400).json({ success: false, message: 'Durée invalide (1-50 ans).' });
      }
      const courrier = await Courrier.findByPk(req.params.id);
      if (!courrier) return res.status(404).json({ success: false, message: 'Courrier introuvable.' });
      await courrier.update({ retentionYears: parseInt(retentionYears) });
      res.json({ success: true, message: 'Durée de conservation mise à jour.', data: courrier });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ✅ NOUVEAU : GÉNÉRER LE PDF DU COURRIER ET LE STOCKER DANS ALFRESCO
  async genererPdf(req, res) {
    try {
      const { corps } = req.body;
      if (!corps || !corps.trim()) {
        return res.status(400).json({ success: false, message: 'Le corps du courrier est obligatoire.' });
      }

      const courrier = await Courrier.findByPk(req.params.id);
      if (!courrier) return res.status(404).json({ success: false, message: 'Courrier introuvable.' });
      if (courrier.type !== 'SORTANT') {
        return res.status(400).json({ success: false, message: 'Seuls les courriers sortants peuvent être générés en PDF.' });
      }
      if (courrier.statut !== 'APPROUVE') {
        return res.status(400).json({ success: false, message: 'Le courrier doit être approuvé avant génération du PDF.' });
      }

      // Sauvegarder le corps dans la base
      await courrier.update({ corps: corps.trim() });

      // Génération du PDF avec pdf-lib
      const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
      const alfrescoService = require('../services/alfresco.service');

      const pdfDoc  = await PDFDocument.create();
      const page    = pdfDoc.addPage([595, 842]); // A4
      const { width, height } = page.getSize();

      const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const margin    = 60;
      const colWidth  = width - margin * 2;
      let   cursorY   = height - margin;

      // ── EN-TÊTE ──────────────────────────────────────────────────
      page.drawRectangle({
        x: 0, y: height - 100,
        width, height: 100,
        color: rgb(0.12, 0.22, 0.39),
      });
      page.drawText('IT INTEGRATION SARL', {
        x: margin, y: height - 45,
        size: 20, font: fontBold, color: rgb(1, 1, 1),
      });
      page.drawText('Gestion Électronique des Documents', {
        x: margin, y: height - 68,
        size: 11, font: fontRegular, color: rgb(0.8, 0.85, 0.95),
      });
      page.drawText(`Réf : ${courrier.reference}`, {
        x: width - margin - 160, y: height - 45,
        size: 10, font: fontBold, color: rgb(1, 1, 1),
      });
      page.drawText(`Date : ${new Date().toLocaleDateString('fr-FR')}`, {
        x: width - margin - 160, y: height - 65,
        size: 10, font: fontRegular, color: rgb(0.8, 0.85, 0.95),
      });

      cursorY = height - 130;

      // ── MÉTADONNÉES ───────────────────────────────────────────────
      const drawMeta = (label, value, y) => {
        page.drawText(`${label} :`, {
          x: margin, y,
          size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2),
        });
        page.drawText(value || '-', {
          x: margin + 110, y,
          size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2),
        });
      };

      drawMeta('Expéditeur',  courrier.expediteur,  cursorY);  cursorY -= 20;
      drawMeta('Destinataire', courrier.destinataire, cursorY); cursorY -= 20;
      drawMeta('Objet',       courrier.objet,        cursorY); cursorY -= 20;
      drawMeta('Priorité',    courrier.priorite,     cursorY); cursorY -= 20;

      // Ligne séparatrice
      cursorY -= 10;
      page.drawLine({
        start: { x: margin, y: cursorY },
        end:   { x: width - margin, y: cursorY },
        thickness: 1, color: rgb(0.7, 0.7, 0.7),
      });
      cursorY -= 25;

      // ── CORPS DU COURRIER ─────────────────────────────────────────
      page.drawText('Contenu du courrier :', {
        x: margin, y: cursorY,
        size: 11, font: fontBold, color: rgb(0.12, 0.22, 0.39),
      });
      cursorY -= 20;

      // Découper le corps en lignes de ~85 caractères
      const words    = corps.trim().split(' ');
      const lines    = [];
      let   currentLine = '';
      for (const word of words) {
        const test = currentLine ? `${currentLine} ${word}` : word;
        if (test.length > 85) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) lines.push(currentLine);

      for (const line of lines) {
        if (cursorY < 150) break; // Marge basse
        page.drawText(line, {
          x: margin, y: cursorY,
          size: 11, font: fontRegular, color: rgb(0.15, 0.15, 0.15),
        });
        cursorY -= 18;
      }

      // ── ZONE SIGNATURE ────────────────────────────────────────────
      const sigY = 120;
      page.drawText('Signature autorisée :', {
        x: margin, y: sigY + 40,
        size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2),
      });
      page.drawRectangle({
        x: margin, y: sigY - 10,
        width: 200, height: 50,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
      });

      // ── PIED DE PAGE ──────────────────────────────────────────────
      page.drawLine({
        start: { x: margin, y: 40 },
        end:   { x: width - margin, y: 40 },
        thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
      });
      page.drawText('IT Integration SARL — Document généré par le système GED', {
        x: margin, y: 25,
        size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5),
      });

      // ── EXPORT ET UPLOAD ALFRESCO ─────────────────────────────────
      const pdfBytes   = await pdfDoc.save();
      const fileName   = `courrier_${courrier.reference}_${Date.now()}.pdf`;
      const alfrescoNode = await alfrescoService.uploadDocument(
        Buffer.from(pdfBytes),
        fileName,
        'application/pdf'
      );
      const nodeId = alfrescoNode.entry?.id || alfrescoNode.id;

      // Sauvegarder l'ID Alfresco dans le courrier
      await courrier.update({ alfrescoPdfNodeId: nodeId });

      // Retourner le PDF en base64 pour la signature côté frontend
      const base64Pdf = Buffer.from(pdfBytes).toString('base64');

      res.json({
        success:    true,
        message:    'PDF généré avec succès.',
        pdfBase64:  base64Pdf,
        nodeId,
        data:       courrier,
      });

    } catch (error) {
      console.error('Erreur génération PDF courrier:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // CRÉER UN COURRIER
  async createCourrier(req, res) {
    try {
      const {
        type, nature, objet, expediteur, destinataire,
        dateReception, dateEnvoi, priorite, notes,
        documentId, serviceExpediteurId, serviceDestinataireId,
      } = req.body;

      if (!type || !objet || !expediteur || !destinataire) {
        return res.status(400).json({
          success: false,
          message: 'Type, objet, expéditeur et destinataire sont obligatoires.',
        });
      }

      if (nature && !['INTERNE', 'EXTERNE'].includes(nature)) {
        return res.status(400).json({
          success: false,
          message: 'Nature invalide. Valeurs acceptées : INTERNE, EXTERNE.',
        });
      }

      let finalDocumentId = documentId || null;

      if (req.file) {
        try {
          const alfrescoService = require('../services/alfresco.service');
          const { Document }    = require('../models');
          const alfrescoNode = await alfrescoService.uploadDocument(
            req.file.buffer, req.file.originalname, req.file.mimetype
          );
          const doc = await Document.create({
            title:          req.file.originalname,
            fileName:       req.file.originalname,
            mimeType:       req.file.mimetype,
            category:       'Courrier',
            status:         'APPROUVE',
            alfrescoNodeId: alfrescoNode.entry?.id || alfrescoNode.id,
            createdBy:      req.user.id,
          });
          finalDocumentId = doc.id;
        } catch (fileErr) {
          console.warn('⚠️ Impossible d\'uploader le fichier joint:', fileErr.message);
        }
      }

      const courrier = await courrierService.createCourrier(
        {
          type, nature: nature || 'EXTERNE', objet,
          expediteur, destinataire,
          dateReception: dateReception || null,
          dateEnvoi:     dateEnvoi     || null,
          priorite, notes,
          documentId:            finalDocumentId,
          serviceExpediteurId:   serviceExpediteurId   || null,
          serviceDestinataireId: serviceDestinataireId || null,
        },
        req.user.id
      );

      res.status(201).json({ success: true, message: 'Courrier créé avec succès.', data: courrier });
    } catch (error) {
      console.error('COURRIER ERROR:', error.message, error.stack);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // METTRE À JOUR UN COURRIER
  async updateCourrier(req, res) {
    try {
      const courrier = await courrierService.updateCourrier(req.params.id, req.body, req.user.id);
      res.json({ success: true, message: 'Courrier mis à jour avec succès.', data: courrier });
    } catch (error) {
      const status = error.message === 'Courrier introuvable.' ? 404 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  // CHANGER LE STATUT
  async changeStatut(req, res) {
    try {
      const { statut } = req.body;
      if (!statut) return res.status(400).json({ success: false, message: 'Statut obligatoire.' });
      const courrier = await courrierService.changeStatut(req.params.id, statut, req.user.id);
      res.json({ success: true, message: 'Statut mis à jour avec succès.', data: courrier });
    } catch (error) {
      const status = error.message.includes('introuvable') ? 404
                   : error.message.includes('Transition')  ? 400 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async dispatch(req, res) {
    try {
      const courrier = await courrierService.dispatchCourrier(req.params.id, req.body, req.user.id);
      res.json({ success: true, data: courrier, message: 'Courrier dispatché avec succès' });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  },

  async soumettreApprobation(req, res) {
    try {
      const courrier = await courrierService.soumettreApprobation(req.params.id, req.user.id);
      res.json({ success: true, data: courrier, message: 'Soumis pour approbation' });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  },

  async approuver(req, res) {
    try {
      const courrier = await courrierService.approuverCourrier(req.params.id, req.user.id);
      res.json({ success: true, data: courrier, message: 'Courrier approuvé' });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  },

  async creerReponse(req, res) {
    try {
      const reponse = await courrierService.creerReponse(req.params.id, req.body, req.user.id);
      res.json({ success: true, data: reponse, message: 'Réponse créée avec succès' });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  },

  async archiveCourrier(req, res) {
    try {
      const courrier = await courrierService.archiveCourrier(req.params.id, req.user.id);
      res.json({ success: true, data: courrier, message: 'Courrier archivé avec succès' });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  },

  async getHistorique(req, res) {
    try {
      const historique = await courrierService.getHistorique(req.params.id);
      res.json({ success: true, data: historique });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },

  async deleteCourrier(req, res) {
    try {
      await courrierService.deleteCourrier(req.params.id);
      res.json({ success: true, message: 'Courrier supprimé avec succès.' });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async getStats(req, res) {
    try {
      const stats = await courrierService.getStats(req.user);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getCourrierArchives(req, res) {
    try {
      const { type, priorite, nature, search, page, limit } = req.query;
      const result = await courrierService.listCourriersArchives(
        { type, priorite, nature, search },
        { page, limit },
        req.user
      );
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = courrierController;