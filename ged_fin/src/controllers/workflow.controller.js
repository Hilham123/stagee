const workflowService = require('../services/workflow.service');
const { Op } = require('sequelize');

const workflowController = {
  // SOUMETTRE UN DOCUMENT
  // POST 
  async submitDocument(req, res) {
    try {
      const { documentId, priority, comment, dueDate } = req.body;

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: 'documentId est requis.',
        });
      }

      const workflow = await workflowService.submitDocument(
        documentId,
        req.user.id,
        { priority, comment, dueDate }
      );

      res.status(201).json({
        success: true,
        message: 'Document soumis à la validation avec succès.',
        data: workflow,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // PRENDRE EN CHARGE
  //put
  async takeCharge(req, res) {
    try {
      const workflow = await workflowService.takeCharge(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Workflow pris en charge avec succès.',
        data: workflow,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // APPROUVER
  // PUT 
  async approveDocument(req, res) {
    try {
      const { comment } = req.body;

      const workflow = await workflowService.approveDocument(
        req.params.id,
        req.user.id,
        comment
      );

      res.json({
        success: true,
        message: 'Document approuvé avec succès.',
        data: workflow,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // REJETER
  //PUT
  async rejectDocument(req, res) {
    try {
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({
          success: false,
          message: 'Un commentaire est obligatoire pour rejeter un document.',
        });
      }

      const workflow = await workflowService.rejectDocument(
        req.params.id,
        req.user.id,
        comment
      );

      res.json({
        success: true,
        message: 'Document rejeté.',
        data: workflow,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // ARCHIVER
  // PUT
  async archiveDocument(req, res) {
    try {
      const workflow = await workflowService.archiveDocument(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Document archivé avec succès.',
        data: workflow,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // LISTER LES WORKFLOWS
  //GET
  async getWorkflows(req, res) {
    try {
      const { currentStep } = req.query;
      const { User } = require('../models');
      const { Service } = require('../models');

      // Construire les filtres selon le rôle
      let filters = { where: {} };
      
      // ✅ RESPECTER le filtre frontend si fourni
      if (currentStep) {
        filters.where.currentStep = currentStep;
      } else {
        // Si pas de filtre frontend, appliquer la logique par défaut
        if (req.user.role !== 'ADMIN' && req.user.roleName !== 'ADMIN') {
          // Non-admin sans filtre → voir les workflows en cours + les terminés (pas archive)
          filters.where.currentStep = {
            [Op.in]: ['EN_ATTENTE_VALIDATION', 'EN_COURS_VALIDATION', 'APPROUVE', 'REJETE']
          };
        }
        // ADMIN sans filtre → voit TOUT (aucun filtre currentStep)
      }

      // Récupérer l'utilisateur complet pour accéder serviceId et isDirecteur
      const user = await User.findByPk(req.user.id);
      const userRole = req.user.role || req.user.roleName;

      if (userRole === 'EMPLOYEE') {
        // Un employé voit ses soumissions
        filters.where.submittedBy = req.user.id;
      } else if (userRole === 'MANAGER') {
        if (user?.isDirecteur) {
          // ✅ Manager directeur voit TOUS les workflows
          // Pas de filtre supplémentaire
        } else if (user?.serviceId) {
          // ✅ Manager normal voit les workflows de son département
          // Récupérer les IDs des utilisateurs du même service
          const serviceMembers = await User.findAll({
            where: { serviceId: user.serviceId },
            attributes: ['id'],
          });
          const memberIds = serviceMembers.map(m => m.id);

          filters.where[Op.or] = [
            { submittedBy: { [Op.in]: memberIds } },  // workflows soumis par son service
            { assignedTo: req.user.id }               // assignés à ce manager
          ];
        } else {
          // Manager sans service : ses workflows
          filters.where[Op.or] = [
            { assignedTo: req.user.id },
            { submittedBy: req.user.id }
          ];
        }
      }
      // ✅ ADMIN voit TOUS les workflows (aucun filtre supplémentaire)
      
      const workflows = await workflowService.getWorkflows(filters);

      res.json({
        success: true,
        data: workflows,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // RÉCUPÉRER UN WORKFLOW
  // GET
  async getWorkflow(req, res) {
    try {
      const workflow = await workflowService.getWorkflowById(req.params.id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow introuvable.',
        });
      }

      res.json({ success: true, data: workflow });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // RÉCUPÉRER LES ARCHIVES (documents archivés)
  // GET /archives
  async getArchives(req, res) {
    try {
      const { User } = require('../models');
      const userRole = req.user.role || req.user.roleName;

      let filters = {
        where: {
          currentStep: 'ARCHIVE'
        }
      };

      // Appliquer les filtres selon le rôle
      const user = await User.findByPk(req.user.id);

      if (userRole === 'EMPLOYEE') {
        // Un employé voit ses propres archives
        filters.where.submittedBy = req.user.id;
      } else if (userRole === 'MANAGER') {
        if (user?.isDirecteur) {
          // Manager directeur voit TOUTES les archives
          // Pas de filtre supplémentaire
        } else if (user?.serviceId) {
          // Manager normal voit les archives de son département
          const serviceMembers = await User.findAll({
            where: { serviceId: user.serviceId },
            attributes: ['id'],
          });
          const memberIds = serviceMembers.map(m => m.id);

          filters.where[Op.or] = [
            { submittedBy: { [Op.in]: memberIds } },
            { assignedTo: req.user.id }
          ];
        } else {
          // Manager sans service : ses archives
          filters.where[Op.or] = [
            { submittedBy: req.user.id },
            { assignedTo: req.user.id }
          ];
        }
      }
      // ADMIN voit toutes les archives (pas de filtre)

      const archives = await workflowService.getWorkflows(filters);

      res.json({
        success: true,
        message: 'Archives récupérées avec succès',
        data: archives,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = workflowController;