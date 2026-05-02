const { Workflow, Document, User } = require('../models');
const workflowService = {

  // SOUMETTRE UN DOCUMENT À LA VALIDATION
  async submitDocument(documentId, submittedBy, options = {}) {
    const { priority = 'NORMALE', comment, dueDate } = options;

    //Vérifier que le document existe
    const document = await Document.findByPk(documentId);
    if (!document) {
      throw new Error('Document introuvable.');
    }

    //Vérifier que le document n'est pas déjà en cours de validation
    const existingWorkflow = await Workflow.findOne({
      where: {
        documentId,
        currentStep: ['SOUMISSION', 'EN_ATTENTE_VALIDATION', 'EN_COURS_VALIDATION'],
      },
    });
    if (existingWorkflow) {
      throw new Error('Ce document est déjà en cours de validation.');
    }

    // Par :
const manager = await User.findOne({
  where: { roleName: 'MANAGER', isActive: true },
});
    //Créer le workflow
    const workflow = await Workflow.create({
      documentId,
      submittedBy,
      assignedTo:  manager?.id || null,
      currentStep: 'EN_ATTENTE_VALIDATION',
      priority,
      comment,
      submittedAt: new Date(),
      dueDate:     dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours par défaut
    });

    // Mettre à jour le statut du document
    await document.update({ status: 'EN_ATTENTE' });

    return workflow;
  },
  // PRENDRE EN CHARGE UN WORKFLOW (MANAGER)  
async takeCharge(workflowId, managerId) {
    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) {
      throw new Error('Workflow introuvable.');
    }

    if (workflow.currentStep !== 'EN_ATTENTE_VALIDATION') {
      throw new Error('Ce workflow ne peut pas être pris en charge.');
    }

    await workflow.update({
      currentStep: 'EN_COURS_VALIDATION',
      assignedTo:  managerId,
    });

    // Mettre à jour le statut du document
    await Document.update(
      { status: 'EN_VALIDATION' },
      { where: { id: workflow.documentId } }
    );

    return workflow;
  },
  // APPROUVER UN DOCUMENT
  async approveDocument(workflowId, processedBy, comment = '') {
    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) {
      throw new Error('Workflow introuvable.');
    }

    if (workflow.currentStep !== 'EN_COURS_VALIDATION') {
      throw new Error('Ce workflow ne peut pas être approuvé dans son état actuel.');
    }

    // Mettre à jour le workflow
    await workflow.update({
      currentStep: 'APPROUVE',
      processedBy,
      processedAt: new Date(),
      comment,
    });

    // Mettre à jour le statut du document
    await Document.update(
      { status: 'APPROUVE' },
      { where: { id: workflow.documentId } }
    );

    return workflow;
  },

  // REJETER UN DOCUMENT
  async rejectDocument(workflowId, processedBy, comment = '') {
    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) {
      throw new Error('Workflow introuvable.');
    }

    if (workflow.currentStep !== 'EN_COURS_VALIDATION') {
      throw new Error('Ce workflow ne peut pas être rejeté dans son état actuel.');
    }

    // Mettre à jour le workflow
    await workflow.update({
      currentStep: 'REJETE',
      processedBy,
      processedAt: new Date(),
      comment,
    });

    // Remettre le document en BROUILLON
    await Document.update(
      { status: 'REJETE' },
      { where: { id: workflow.documentId } }
    );

    return workflow;
  },
  // ARCHIVER UN DOCUMENT (ADMIN)
  async archiveDocument(workflowId, processedBy) {
  const workflow = await Workflow.findByPk(workflowId);
  if (!workflow) throw new Error('Workflow introuvable.');
  if (workflow.currentStep !== 'APPROUVE')
    throw new Error('Seuls les documents approuvés peuvent être archivés.');

  await workflow.update({
    currentStep: 'ARCHIVE',
    processedBy,
    processedAt: new Date(),
  });

  await Document.update(
    {
      status:         'ARCHIVE',
      archivedAt:     new Date(),
      retentionYears: 5, // 5 ans par défaut
    },
    { where: { id: workflow.documentId } }
  );

  return workflow;
},

  // RÉCUPÉRER LES WORKFLOWS
  async getWorkflows(filters = {}) {
    // Accepter soit un objet `where` complexe, soit des filtres simples
    let where = {};
    
    if (filters.where) {
      // Si on reçoit un objet `where` complexe (avec Op.or, Op.and, etc.)
      where = filters.where;
    } else {
      // Sinon utiliser les filtres simples (ancienne méthode)
      const { currentStep, assignedTo, submittedBy } = filters;
      if (currentStep) where.currentStep = currentStep;
      if (assignedTo)  where.assignedTo  = assignedTo;
      if (submittedBy) where.submittedBy = submittedBy;
    }

    const workflows = await Workflow.findAll({
    where,
    include: [
        {
        model:      Document,
        as:         'document',
        attributes: ['id', 'title', 'fileName', 'category', 'status'],
        },
        {
        model:      User,
        as:         'submitter',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
        model:      User,
        as:         'assignee',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        },
    ],
    order: [['createdAt', 'DESC']],
    });

    return workflows;
},
};

module.exports = workflowService;