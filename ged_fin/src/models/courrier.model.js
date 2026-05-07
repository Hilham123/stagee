const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Courrier = sequelize.define('Courrier', {
id: {
type: DataTypes.UUID,
defaultValue: DataTypes.UUIDV4,
primaryKey: true,
},

reference: {
type: DataTypes.STRING(50),
allowNull: false,
unique: true,
field: 'reference',
},

type: {
type: DataTypes.ENUM('ENTRANT', 'SORTANT'),
allowNull: false,
field: 'type',
},

nature: {
type: DataTypes.ENUM('INTERNE', 'EXTERNE'),
allowNull: false,
defaultValue: 'EXTERNE',
field: 'nature',
},

objet: {
type: DataTypes.STRING(500),
allowNull: false,
field: 'objet',
},

// ✅ NOUVEAU : Corps du courrier (contenu rédigé)
corps: {
type: DataTypes.TEXT,
allowNull: true,
field: 'corps',
},

expediteur: {
type: DataTypes.STRING(255),
allowNull: false,
field: 'expediteur',
},

destinataire: {
type: DataTypes.STRING(255),
allowNull: false,
field: 'destinataire',
},

serviceExpediteurId: {
type: DataTypes.UUID,
allowNull: true,
field: 'service_expediteur_id',
references: { model: 'services', key: 'id' },
},

serviceDestinataireId: {
type: DataTypes.UUID,
allowNull: true,
field: 'service_destinataire_id',
references: { model: 'services', key: 'id' },
},

dateReception: {
type: DataTypes.DATEONLY,
allowNull: true,
field: 'date_reception',
},

dateEnvoi: {
type: DataTypes.DATEONLY,
allowNull: true,
field: 'date_envoi',
},

etapeCircuit: {
type: DataTypes.ENUM(
    'ENREGISTREMENT', 'DISPATCH', 'EN_TRAITEMENT',
    'EN_APPROBATION', 'APPROUVE', 'EXPEDIE'
),
defaultValue: 'ENREGISTREMENT',
field: 'etape_circuit',
},

assigneA: {
type: DataTypes.UUID,
allowNull: true,
field: 'assigne_a',
references: { model: 'users', key: 'id' },
},

courrierParentId: {
type: DataTypes.UUID,
allowNull: true,
field: 'courrier_parent_id',
references: { model: 'courriers', key: 'id' },
},

instructionsDispatch: {
type: DataTypes.TEXT,
allowNull: true,
field: 'instructions_dispatch',
},

priorite: {
type: DataTypes.ENUM('NORMALE', 'HAUTE', 'URGENTE'),
defaultValue: 'NORMALE',
field: 'priorite',
},

statut: {
type: DataTypes.ENUM('RECU','DISPATCHE','EN_TRAITEMENT','EN_APPROBATION','APPROUVE','ENVOYE','ARCHIVE'),
defaultValue: 'RECU',
field: 'statut',
},

documentId: {
type: DataTypes.UUID,
allowNull: true,
field: 'document_id',
},

createdBy: {
type: DataTypes.UUID,
allowNull: true,
field: 'created_by',
},

notes: {
type: DataTypes.TEXT,
allowNull: true,
field: 'notes',
},

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

signedBy: {
type: DataTypes.UUID,
allowNull: true,
field: 'signed_by',
references: { model: 'users', key: 'id' },
},

signatureData: {
type: DataTypes.JSONB,
defaultValue: {},
field: 'signature_data',
},

// ✅ NOUVEAU : ID du nœud Alfresco du PDF généré
alfrescoPdfNodeId: {
type: DataTypes.STRING,
allowNull: true,
field: 'alfresco_pdf_node_id',
},

metadata: {
type: DataTypes.JSONB,
defaultValue: {},
field: 'metadata',
},

destinataireTous: {
type: DataTypes.BOOLEAN,
defaultValue: false,
field: 'destinataire_tous',
},

archivedAt: {
type: DataTypes.DATE,
allowNull: true,
field: 'archived_at',
},

// ✅ NOUVEAU : Durée de conservation en années
retentionYears: {
type: DataTypes.INTEGER,
defaultValue: 5,
field: 'retention_years',
},

}, {
tableName: 'courriers',
timestamps: true,
underscored: true,
});

module.exports = Courrier;