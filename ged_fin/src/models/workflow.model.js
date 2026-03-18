const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Workflow = sequelize.define('Workflow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Document concerné
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'document_id',
  },
  // Utilisateur qui a soumis le document
  submittedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'submitted_by',
  },
  // Utilisateur qui doit valider (MANAGER)
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_to',
  },
  // Utilisateur qui a traité la demande
  processedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'processed_by',
  },
  // Étape actuelle du workflow
  currentStep: {
    type: DataTypes.ENUM(
      'SOUMISSION',
      'EN_ATTENTE_VALIDATION',
      'EN_COURS_VALIDATION',
      'APPROUVE',
      'REJETE',
      'ARCHIVE'
    ),
    defaultValue: 'SOUMISSION',
    field: 'current_step',
  },
  // Commentaire du validateur
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Date de soumission
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'submitted_at',
  },
  // Date de traitement
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processed_at',
  },
  // Délai limite de validation
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'due_date',
  },
  // Priorité
  priority: {
    type: DataTypes.ENUM('BASSE', 'NORMALE', 'HAUTE', 'URGENTE'),
    defaultValue: 'NORMALE',
  },
}, {
  tableName: 'workflows',
  timestamps: true,
  underscored: true,
});

module.exports = Workflow;