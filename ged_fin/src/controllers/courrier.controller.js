const courrierService = require('../services/courrier.service');
const { Courrier }    = require('../models');
const alfrescoService = require('../services/alfresco.service');
const alfrescoConfig  = require('../config/alfresco');

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

  // Télécharger le PDF généré depuis Alfresco
  async downloadPdf(req, res) {
    try {
      const courrier = await Courrier.findByPk(req.params.id)
      if (!courrier) return res.status(404).json({ success: false, message: 'Courrier introuvable.' })
      if (!courrier.alfrescoPdfNodeId) return res.status(404).json({ success: false, message: 'Aucun PDF généré pour ce courrier.' })

      const alfrescoService = require('../services/alfresco.service')
      const result = await alfrescoService.downloadDocument(courrier.alfrescoPdfNodeId)

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="courrier_${courrier.reference}.pdf"`)
      res.send(Buffer.from(result.data))
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
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
      if (!['EN_TRAITEMENT', 'EN_APPROBATION', 'APPROUVE'].includes(courrier.statut)) {
        return res.status(400).json({ success: false, message: 'Le courrier doit être en traitement pour pouvoir être rédigé.' });
      }

      // Sauvegarder le corps dans la base
      await courrier.update({ corps: corps.trim() });

      // Génération du PDF avec pdf-lib
      const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
      const alfrescoService = require('../services/alfresco.service');
      const fs   = require('fs');
      const path = require('path');

      const pdfDoc  = await PDFDocument.create();
      const page    = pdfDoc.addPage([595, 842]); // A4
      const { width, height } = page.getSize();

      const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const margin   = 50;
      let   cursorY  = height - margin;

      // ── EN-TÊTE : 3 LOGOS (gauche / centre / droite) ─────────────
      const imagesDir = path.join(__dirname, '../../../ged_fin_frontend');
      const logoHeight = 70;

      try {
        // Logo gauche : 1er image.png (System Integration)
        const img1Bytes = fs.readFileSync(path.join(imagesDir, '1er image.png'));
        const img1      = await pdfDoc.embedPng(img1Bytes);
        const img1Dims  = img1.scale(1);
        const img1W     = (img1Dims.width / img1Dims.height) * logoHeight;
        page.drawImage(img1, { x: margin, y: height - margin - logoHeight, width: img1W, height: logoHeight });

        // Logo centre : logo it.png (IT Integration)
        const img2Bytes = fs.readFileSync(path.join(imagesDir, 'logo it.png'));
        const img2      = await pdfDoc.embedPng(img2Bytes);
        const img2Dims  = img2.scale(1);
        const img2W     = (img2Dims.width / img2Dims.height) * logoHeight;
        page.drawImage(img2, { x: (width - img2W) / 2, y: height - margin - logoHeight, width: img2W, height: logoHeight });

        // Logo droite : 2eme image.png (Integration Solutions)
        const img3Bytes = fs.readFileSync(path.join(imagesDir, '2eme image.png'));
        const img3      = await pdfDoc.embedPng(img3Bytes);
        const img3Dims  = img3.scale(1);
        const img3W     = (img3Dims.width / img3Dims.height) * logoHeight;
        page.drawImage(img3, { x: width - margin - img3W, y: height - margin - logoHeight, width: img3W, height: logoHeight });
      } catch (imgErr) {
        console.warn('Images en-tête non trouvées, en-tête texte uniquement :', imgErr.message);
      }

      // Ligne séparatrice sous les logos
      const headerBottom = height - margin - logoHeight - 10;
      page.drawLine({
        start: { x: margin, y: headerBottom },
        end:   { x: width - margin, y: headerBottom },
        thickness: 1, color: rgb(0.1, 0.1, 0.1),
      });

      cursorY = headerBottom - 20;

      // ── BLOC DROIT : BURKINA FASO + destinataire ──────────────────
      page.drawText('BURKINA FASO', {
        x: width - margin - 170, y: cursorY,
        size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1),
      });
      cursorY -= 14;
      page.drawText('La Patrie ou la Mort, Nous Vaincrons', {
        x: width - margin - 170, y: cursorY,
        size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2),
      });
      cursorY -= 18;
      page.drawText('Le Directeur Général de IT INTEGRATION', {
        x: width - margin - 170, y: cursorY,
        size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1),
      });
      cursorY -= 14;
      page.drawText('A', {
        x: width - margin - 90, y: cursorY,
        size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1),
      });
      cursorY -= 14;
      page.drawText(courrier.destinataire || '', {
        x: width - margin - 170, y: cursorY,
        size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1),
      });

      cursorY -= 30;

      // Objet
      page.drawText(`Objet : ${courrier.objet}`, {
        x: margin, y: cursorY,
        size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1),
      });
      cursorY -= 30;

      // ── CORPS DU COURRIER ─────────────────────────────────────────
      const words = corps.trim().split(' ');
      const lines = [];
      let currentLine = '';
      for (const word of words) {
        const test = currentLine ? `${currentLine} ${word}` : word;
        if (test.length > 85) { lines.push(currentLine); currentLine = word; }
        else { currentLine = test; }
      }
      if (currentLine) lines.push(currentLine);

      for (const line of lines) {
        if (cursorY < 150) break;
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

      // ── PIED DE PAGE style IT Integration ────────────────────────
      page.drawLine({
        start: { x: 0, y: 55 }, end: { x: width, y: 55 },
        thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
      });
      page.drawText(
        'IFU : 00123277B, RCCM : BFOUA2019B5837, Régime d\'Imposition : RNI, Division fiscale : DME-CENTRE II 08',
        { x: 30, y: 42, size: 6.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) }
      );
      page.drawText(
        'Coris Bank : 01010 043747224101-53, secteur 48 08 BP 11720 Ouagadougou 08  TEL : (00226) 76315094 / 65881099 / 51231329',
        { x: 30, y: 32, size: 6.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) }
      );
      page.drawText(
        'site web: http://itintegration.net  Email : atiendrebeogo@itintegration.net',
        { x: 30, y: 22, size: 6.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) }
      );

      // ── EXPORT ET UPLOAD ALFRESCO ─────────────────────────────────
      const pdfBytes   = await pdfDoc.save();
      const fileName   = `courrier_${courrier.reference}_${Date.now()}.pdf`;
      const alfrescoNode = await alfrescoService.uploadDocument(
        alfrescoConfig.docLibraryId,
        Buffer.from(pdfBytes),
        fileName,
        { mimeType: 'application/pdf' }
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
          const { Document }    = require('../models');
          const alfrescoNode = await alfrescoService.uploadDocument(
            alfrescoConfig.docLibraryId,
            req.file.buffer,
            req.file.originalname,
            { mimeType: req.file.mimetype }
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