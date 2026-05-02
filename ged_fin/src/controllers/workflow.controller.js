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

      // Construire les filtres selon le rôle
      let filters = {};
      
      if (currentStep) {
        filters.where = { currentStep };
      } else {
        filters.where = {};
      }

      // ✅ Appliquer les filtres par rôle
      if (req.user.role === 'EMPLOYEE' || req.user.roleName === 'EMPLOYEE') {
        // Un employé voit ses soumissions + archives
        filters.where[Op.or] = [
          { submittedBy: req.user.id },
          { currentStep: 'ARCHIVE' }
        ];
      } else if (req.user.role === 'MANAGER' || req.user.roleName === 'MANAGER') {
        // Un manager voit ses assignations + ses soumissions + archives
        filters.where[Op.or] = [
          { assignedTo: req.user.id },
          { submittedBy: req.user.id },
          { currentStep: 'ARCHIVE' }
        ];
      }
      // ADMIN voit tout (pas de filtre)
      
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
    const workflows = await workflowService.getWorkflows({});
    const workflow = workflows.find(w => w.id === req.params.id);

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
};

module.exports = workflowController;