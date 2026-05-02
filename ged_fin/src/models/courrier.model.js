const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Courrier = sequelize.define('Courrier', {
id: {
type: DataTypes.UUID,
defaultValue: DataTypes.UUIDV4,
primaryKey: true,
},

// Référence unique (ex: CE-2025-0001)
reference: {
type: DataTypes.STRING(50),
allowNull: false,
unique: true,
field: 'reference',
},

// Type : ENTRANT ou SORTANT
type: {
type: DataTypes.ENUM('ENTRANT', 'SORTANT'),
allowNull: false,
field: 'type',
},

//INTERNE ou EXTERNE
nature: {
type: DataTypes.ENUM('INTERNE', 'EXTERNE'),
allowNull: false,
defaultValue: 'EXTERNE',
field: 'nature',
},

// Objet du courrier
objet: {
type: DataTypes.STRING(500),
allowNull: false,
field: 'objet',
},

// Expéditeur 
expediteur: {
type: DataTypes.STRING(255),
allowNull: false,
field: 'expediteur',
},

// Destinataire 
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

// pour courriers internes
serviceDestinataireId: {
type: DataTypes.UUID,
allowNull: true,
field: 'service_destinataire_id',
references: { model: 'services', key: 'id' },
},

// Date de réception courrier entrant
dateReception: {
type: DataTypes.DATEONLY,
allowNull: true,
field: 'date_reception',
},

//Date d'envoi courrier sortant
dateEnvoi: {
type: DataTypes.DATEONLY,
allowNull: true,
field: 'date_envoi',
},
// Étape du circuit
etapeCircuit: {
type: DataTypes.ENUM(
'ENREGISTREMENT',
'DISPATCH',
'EN_TRAITEMENT',
'EN_APPROBATION',
'APPROUVE',
'EXPEDIE'
),
defaultValue: 'ENREGISTREMENT',
field: 'etape_circuit',
},

// Assigné à (utilisateur qui doit agir)
assigneA: {
type: DataTypes.UUID,
allowNull: true,
field: 'assigne_a',
references: { model: 'users', key: 'id' },
},

// Courrier parent (pour les réponses)
courrierParentId: {
type: DataTypes.UUID,
allowNull: true,
field: 'courrier_parent_id',
references: { model: 'courriers', key: 'id' },
},

// Instructions de dispatch
instructionsDispatch: {
type: DataTypes.TEXT,
allowNull: true,
field: 'instructions_dispatch',
},

// Priorité
priorite: {
type: DataTypes.ENUM('NORMALE', 'HAUTE', 'URGENTE'),
defaultValue: 'NORMALE',
field: 'priorite',
},

// Statut
statut: {
type: DataTypes.ENUM('RECU','DISPATCHE','EN_TRAITEMENT','EN_APPROBATION','APPROUVE','ENVOYE','ARCHIVE'),
defaultValue: 'RECU',
field: 'statut',
},
// Document scanné associé
documentId: {
type: DataTypes.UUID,
allowNull: true,
field: 'document_id',
},

// Créé par
createdBy: {
type: DataTypes.UUID,
allowNull: true,
field: 'created_by',
},

// Notes / commentaires
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

// Métadonnées supplémentaires
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

// Date d'archivage
archivedAt: {
type: DataTypes.DATE,
allowNull: true,
field: 'archived_at',
},
}, {
tableName: 'courriers',
timestamps: true,
underscored: true,
}


);

module.exports = Courrier;
