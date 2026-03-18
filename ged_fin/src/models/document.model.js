const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
},
  // ID du noeud dans Alfresco
alfrescoNodeId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    field: 'alfresco_node_id',
},
title: {
    type: DataTypes.STRING(255),
    allowNull: false,
},
description: {
    type: DataTypes.TEXT,
    allowNull: true,
},
fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'file_name',
},
mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'mime_type',
},
fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'file_size',
},
  // Catégorie du document 
category: {
    type: DataTypes.STRING(100),
    allowNull: true,
},
  // Statut dans le workflow
status: {
    type: DataTypes.ENUM('BROUILLON', 'EN_ATTENTE', 'EN_VALIDATION', 'APPROUVE', 'REJETE', 'ARCHIVE'),
    defaultValue: 'BROUILLON',
},
  // Chemin dans Alfresco
alfrescoPath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'alfresco_path',
},
  // Métadonnées supplémentaires
metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
},
  // Signature électronique
isSigned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_signed',
},
signedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'signed_at',
},

// Archivage
archivedAt: {
type: DataTypes.DATE,
allowNull: true,
field: 'archived_at',
},
retentionYears: {
type: DataTypes.INTEGER,
allowNull: true,
defaultValue: 5,
field: 'retention_years',
},
  // Clé étrangère vers l'utilisateur créateur
createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
},
}, {
tableName: 'documents',
timestamps: true,
underscored: true,
});

module.exports = Document;