const { User, Document, Workflow, Signature, Courrier } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// ── Helper: documents par mois ──────────────────────────────
const getMonthlyDocuments = async (whereClause = {}) => {
  const rows = await Document.findAll({
    attributes: [
      [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM "created_at"')), 'month'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: {
      ...whereClause,
      createdAt: { [Op.gte]: new Date(new Date().getFullYear(), 0, 1) },
    },
    group: [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM "created_at"'))],
    raw: true,
  });
  const result = {}
  rows.forEach(r => { result[parseInt(r.month)] = parseInt(r.count) })
  return result
}

// ── Helper: courriers par mois ──────────────────────────────
const getMonthlyCourriers = async (whereClause = {}) => {
  try {
    const rows = await Courrier.findAll({
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM "created_at"')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: {
        ...whereClause,
        createdAt: { [Op.gte]: new Date(new Date().getFullYear(), 0, 1) },
      },
      group: [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM "created_at"'))],
      raw: true,
    });
    const result = {}
    rows.forEach(r => { result[parseInt(r.month)] = parseInt(r.count) })
    return result
  } catch { return {} }
}

// ── Helper: répartition par catégorie ───────────────────────
const getCategoryStats = async (whereClause = {}) => {
  const rows = await Document.findAll({
    attributes: [
      'category',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: whereClause,
    group: ['category'],
    raw: true,
  });
  const result = {}
  rows.forEach(r => { result[r.category || 'Autres'] = parseInt(r.count) })
  return result
}

const dashboardController = {

  // ── ADMIN ──────────────────────────────────────────────────
  async getAdminStats(req, res) {
    try {
      const totalUsers    = await User.count();
      const activeUsers   = await User.count({ where: { isActive: true } });
      const usersByRole = await User.findAll({attributes: ['roleName', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
  group: ['roleName'], raw: true,
});
      const totalDocuments    = await Document.count();
      const documentsByStatus = await Document.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'], raw: true,
      });
      const signedDocuments = await Document.count({ where: { isSigned: true } });

      const totalWorkflows  = await Workflow.count();
      const workflowsByStep = await Workflow.findAll({
        attributes: ['currentStep', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['currentStep'], raw: true,
      });
      const pendingWorkflows = await Workflow.count({
        where: { currentStep: 'EN_ATTENTE_VALIDATION' },
      });

      const totalSignatures = await Signature.count();
      const validSignatures = await Signature.count({ where: { status: 'VALIDE' } });

      const recentDocuments = await Document.findAll({
        limit: 5, order: [['createdAt', 'DESC']],
        include: [{ model: User, as: 'creator', attributes: ['firstName', 'lastName'] }],
      });

      // Graphiques
      const monthly = {
        documents: await getMonthlyDocuments(),
        courriers:  await getMonthlyCourriers(),
      }
      const categories = await getCategoryStats()

      res.json({
        success: true,
        data: {
          users:     { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers, byRole: usersByRole },
          documents: { total: totalDocuments, signed: signedDocuments, unsigned: totalDocuments - signedDocuments, byStatus: documentsByStatus },
          workflows: { total: totalWorkflows, pending: pendingWorkflows, byStep: workflowsByStep },
          signatures: { total: totalSignatures, valid: validSignatures },
          recentDocuments,
          monthly,
          categories,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ── MANAGER ───────────────────────────────────────────────
  async getManagerStats(req, res) {
    try {
      const managerId = req.user.id;

      const totalAssigned     = await Workflow.count({ where: { assignedTo: managerId } });
      const pendingValidation = await Workflow.count({ where: { assignedTo: managerId, currentStep: 'EN_ATTENTE_VALIDATION' } });
      const inProgress        = await Workflow.count({ where: { assignedTo: managerId, currentStep: 'EN_COURS_VALIDATION' } });
      const approved          = await Workflow.count({ where: { assignedTo: managerId, currentStep: 'APPROUVE' } });
      const rejected          = await Workflow.count({ where: { assignedTo: managerId, currentStep: 'REJETE' } });
      const overdueWorkflows  = await Workflow.count({
        where: { assignedTo: managerId, currentStep: ['EN_ATTENTE_VALIDATION', 'EN_COURS_VALIDATION'], dueDate: { [Op.lt]: new Date() } },
      });

      const urgentWorkflows = await Workflow.findAll({
        where: { assignedTo: managerId, priority: 'URGENTE', currentStep: ['EN_ATTENTE_VALIDATION', 'EN_COURS_VALIDATION'] },
        include: [{ model: Document, as: 'document', attributes: ['id', 'title', 'fileName', 'category'] }],
        limit: 5, order: [['createdAt', 'ASC']],
      });

      // Graphiques
      const monthly    = { documents: await getMonthlyDocuments(), courriers: await getMonthlyCourriers() }
      const categories = await getCategoryStats()

      res.json({
        success: true,
        data: {
          workflows: { total: totalAssigned, pending: pendingValidation, inProgress, approved, rejected, overdue: overdueWorkflows },
          urgentWorkflows,
          monthly,
          categories,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ── EMPLOYEE ──────────────────────────────────────────────
  async getEmployeeStats(req, res) {
    try {
      const userId = req.user.id;

      const totalDocuments    = await Document.count({ where: { createdBy: userId } });
      const documentsByStatus = await Document.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { createdBy: userId }, group: ['status'], raw: true,
      });

      const totalSubmitted    = await Workflow.count({ where: { submittedBy: userId } });
      const pendingWorkflows  = await Workflow.count({ where: { submittedBy: userId, currentStep: ['EN_ATTENTE_VALIDATION', 'EN_COURS_VALIDATION'] } });
      const approvedWorkflows = await Workflow.count({ where: { submittedBy: userId, currentStep: 'APPROUVE' } });
      const rejectedWorkflows = await Workflow.count({ where: { submittedBy: userId, currentStep: 'REJETE' } });

      const recentDocuments = await Document.findAll({
        where: { createdBy: userId }, limit: 5, order: [['createdAt', 'DESC']],
      });

      // Graphiques (uniquement ses documents)
      const monthly    = { documents: await getMonthlyDocuments({ createdBy: userId }), courriers: {} }
      const categories = await getCategoryStats({ createdBy: userId })

      res.json({
        success: true,
        data: {
          documents: { total: totalDocuments, byStatus: documentsByStatus },
          workflows: { total: totalSubmitted, pending: pendingWorkflows, approved: approvedWorkflows, rejected: rejectedWorkflows },
          recentDocuments,
          monthly,
          categories,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ── VIEWER ────────────────────────────────────────────────
  async getViewerStats(req, res) {
    try {
      const totalDocuments = await Document.count();
      const approvedDocs   = await Document.count({ where: { status: 'APPROUVE' } });
      const archivedDocs   = await Document.count({ where: { status: 'ARCHIVE' } });
      const signedDocs     = await Document.count({ where: { isSigned: true } });

      const recentDocuments = await Document.findAll({
        where: { status: ['APPROUVE', 'ARCHIVE'] },
        limit: 5, order: [['createdAt', 'DESC']],
        include: [{ model: User, as: 'creator', attributes: ['firstName', 'lastName'] }],
      });

      // Graphiques
      const monthly    = { documents: await getMonthlyDocuments(), courriers: await getMonthlyCourriers() }
      const categories = await getCategoryStats()

      res.json({
        success: true,
        data: {
          documents: { total: totalDocuments, approved: approvedDocs, archived: archivedDocs, signed: signedDocs },
          recentDocuments,
          monthly,
          categories,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ── AUTO (selon rôle) ─────────────────────────────────────
  async getDashboard(req, res) {
    switch (req.user.role) {
      case 'ADMIN':   return dashboardController.getAdminStats(req, res);
      case 'MANAGER': return dashboardController.getManagerStats(req, res);
      case 'EMPLOYEE':return dashboardController.getEmployeeStats(req, res);
      case 'VIEWER':  return dashboardController.getViewerStats(req, res);
      default:        return res.status(403).json({ success: false, message: 'Rôle non reconnu.' });
    }
  },
};

module.exports = dashboardController;