const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Signature = sequelize.define('Signature', {
id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
},
  // Document signé
documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'document_id',
},
  // Utilisateur signataire
signedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'signed_by',
},
  // Hash SHA256 du document
documentHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'document_hash',
},
  // Signature numérique
signatureValue: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'signature_value',
},
  // Algorithme utilisé
algorithm: {
    type: DataTypes.STRING(50),
    defaultValue: 'SHA256',
},
  // Statut de la signature
status: {
    type: DataTypes.ENUM('VALIDE', 'INVALIDE', 'REVOQUEE'),
    defaultValue: 'VALIDE',
},
  // Raison de révocation
revokedReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'revoked_reason',
},
  // Date de révocation
revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'revoked_at',
},
// Date de signature
signedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'signed_at',
},
  // Métadonnées supplémentaires
metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
},
}, {
tableName: 'signatures',
timestamps: true,
underscored: true,
});

module.exports = Signature;