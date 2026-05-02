const alfrescoService  = require('../services/alfresco.service');
const alfrescoConfig   = require('../config/alfresco');
const { Document, User } = require('../models');
const { Op } = require('sequelize');

const documentController = {

  // LISTER LES DOCUMENTS
  async listDocuments(req, res) {
    try {
      const { page = 1, limit = 25, status, category } = req.query
      const offset = (page - 1) * limit
      const where  = {}

      if (status)   where.status   = status
      if (category) where.category = category

      const userRole = req.user.roleName || req.user.role
      const userId   = req.user.id

      // Récupérer les infos complètes de l'utilisateur
      const user = await User.findByPk(userId)

      if (userRole === 'ADMIN') {
        // ✅ ADMIN voit TOUT — aucun filtre supplémentaire
      } else if (userRole === 'MANAGER') {
        if (user?.isDirecteur) {
          // ✅ Directeur voit TOUT — aucun filtre supplémentaire
        } else if (user?.serviceId) {
          // ✅ Manager normal — voit les docs de son service
          // On cherche les IDs des utilisateurs du même service
          const { Service } = require('../models')
          const serviceMembers = await User.findAll({
            where: { serviceId: user.serviceId },
            attributes: ['id'],
          })
          const memberIds = serviceMembers.map(m => m.id)

          where[Op.or] = [
            { createdBy: { [Op.in]: memberIds } }, // docs créés par son service
            { createdBy: userId },                  // ses propres docs
            { status: 'ARCHIVE' },                  // toutes les archives visibles
          ]
        } else {
          // Manager sans service — voit ses docs + archives
          where[Op.or] = [
            { createdBy: userId },
            { status: 'ARCHIVE' },
          ]
        }
      } else {
        // ✅ EMPLOYEE — voit SES documents + toutes les archives
        where[Op.or] = [
          { createdBy: userId },
          { status: 'ARCHIVE' },
        ]
      }

      const { rows: documents, count } = await Document.findAndCountAll({
        where,
        limit:   parseInt(limit),
        offset,
        order:   [['createdAt', 'DESC']],
        include: [{
          model:      User,
          as:         'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'serviceId'],
        }],
      })

      res.json({
        success: true,
        data: documents,
        pagination: {
          total: count,
          page:  parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
        },
      })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async updateRetention(req, res) {
  try {
    const { retentionYears } = req.body
    if (!retentionYears || isNaN(retentionYears) || retentionYears < 1) {
      return res.status(400).json({
        success: false,
        message: 'Durée de conservation invalide. Minimum 1 an.'
      })
    }
    const document = await Document.findByPk(req.params.id)
    if (!document) return res.status(404).json({ success: false, message: 'Document introuvable.' })
    if (document.status !== 'ARCHIVE') return res.status(400).json({ success: false, message: 'Seuls les documents archivés peuvent être modifiés.' })

    await document.update({ retentionYears: parseInt(retentionYears) })
    res.json({ success: true, message: 'Durée de conservation mise à jour.', data: document })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
},

  // RÉCUPÉRER UN DOCUMENT
  async getDocument(req, res) {
    try {
      const document = await Document.findByPk(req.params.id, {
        include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      });
      if (!document) return res.status(404).json({ success: false, message: 'Document introuvable.' });

      let alfrescoInfo = null;
      if (document.alfrescoNodeId) {
        try { alfrescoInfo = await alfrescoService.getNode(document.alfrescoNodeId); }
        catch (e) { console.warn('Noeud Alfresco introuvable:', e.message); }
      }
      res.json({ success: true, data: { ...document.toJSON(), alfrescoInfo } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // UPLOAD D'UN DOCUMENT
  async uploadDocument(req, res) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });

      const { title, description, category, parentNodeId } = req.body;
      const alfrescoNode = await alfrescoService.uploadDocument(
        parentNodeId || alfrescoConfig.docLibraryId,
        req.file.buffer,
        req.file.originalname,
        { title: title || req.file.originalname, description, mimeType: req.file.mimetype }
      );
      const document = await Document.create({
        title:          title || req.file.originalname,
        description,
        fileName:       req.file.originalname,
        mimeType:       req.file.mimetype,
        fileSize:       req.file.size,
        category,
        alfrescoNodeId: alfrescoNode.id,
        alfrescoPath:   alfrescoNode.path?.name,
        status:         'BROUILLON',
        createdBy:      req.user.id,
        metadata: { uploadedAt: new Date().toISOString(), originalName: req.file.originalname },
      });
      res.status(201).json({ success: true, message: 'Document uploadé avec succès.', data: { document, alfrescoNode } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // TÉLÉCHARGER UN DOCUMENT
  async downloadDocument(req, res) {
    try {
      const document = await Document.findByPk(req.params.id);
      if (!document || !document.alfrescoNodeId)
        return res.status(404).json({ success: false, message: 'Document introuvable.' });

      const { data, contentType } = await alfrescoService.downloadDocument(document.alfrescoNodeId);
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      console.log('Download - premiers bytes:', buffer[0], buffer[1], buffer[2], buffer[3]);
      console.log('Download - contentType:', contentType);
      console.log('Download - taille:', buffer.length);

      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Content-Type', contentType || document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // METTRE À JOUR UN DOCUMENT
  async updateDocument(req, res) {
    try {
      const document = await Document.findByPk(req.params.id);
      if (!document) return res.status(404).json({ success: false, message: 'Document introuvable.' });

      const { title, description, category, status } = req.body;
      await document.update({ title, description, category, status });
      if (document.alfrescoNodeId) {
        await alfrescoService.updateNode(document.alfrescoNodeId, {
          'cm:title': title, 'cm:description': description,
        });
      }
      res.json({ success: true, message: 'Document mis à jour avec succès.', data: document });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // SUPPRIMER UN DOCUMENT
  async deleteDocument(req, res) {
    try {
      const document = await Document.findByPk(req.params.id);
      if (!document) return res.status(404).json({ success: false, message: 'Document introuvable.' });
      if (document.alfrescoNodeId) await alfrescoService.deleteNode(document.alfrescoNodeId);
      await document.destroy();
      res.json({ success: true, message: 'Document supprimé avec succès.' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // VERSIONS
  async getVersions(req, res) {
    try {
      const document = await Document.findByPk(req.params.id);
      if (!document || !document.alfrescoNodeId)
        return res.status(404).json({ success: false, message: 'Document introuvable.' });
      const versions = await alfrescoService.listVersions(document.alfrescoNodeId);
      res.json({ success: true, data: versions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // RECHERCHE
  async searchDocuments(req, res) {
    try {
      const { q, maxItems = 25 } = req.query;
      if (!q) return res.status(400).json({ success: false, message: 'Paramètre "q" requis.' });
      const results = await alfrescoService.searchDocuments(q, { maxItems });
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // SUPPRIMER AVEC PROTECTION ARCHIVE
  async delete(req, res) {
    try {
      const doc = await Document.findByPk(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'Document introuvable' });
      if (doc.status === 'ARCHIVE')
        return res.status(403).json({ success: false, message: 'Impossible de supprimer un document archivé' });
      await doc.destroy();
      res.json({ success: true, message: 'Document supprimé' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = documentController;