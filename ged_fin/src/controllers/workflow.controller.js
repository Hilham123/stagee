const workflowService = require('../services/workflow.service');

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

      // Filtrer selon le rôle
      const filters = {};
      if (currentStep) filters.currentStep = currentStep;

      if (req.user.role === 'EMPLOYEE') {
        // Un employé ne voit que ses propres soumissions
        filters.submittedBy = req.user.id;
      } else if (req.user.role === 'MANAGER') {
        // Un manager voit les workflows qui lui sont assignés
        filters.assignedTo = req.user.id;
      }
      // ADMIN voit tout
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