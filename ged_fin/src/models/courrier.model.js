const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Courrier = sequelize.define('Courrier', {
id: {
type: DataTypes.UUID,
defaultValue: DataTypes.UUIDV4,
primaryKey: true,
},
// Référence unique 
reference: {
type: DataTypes.STRING(50),
allowNull: false,
unique: true,
field: 'reference',
},
// Type de courrier
type: {
type: DataTypes.ENUM('ENTRANT', 'SORTANT'),
allowNull: false,
field: 'type',
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
// Date de réception (courrier entrant)
dateReception: {
type: DataTypes.DATEONLY,
allowNull: true,
field: 'date_reception',
},
// Date d'envoi (courrier sortant)
dateEnvoi: {
type: DataTypes.DATEONLY,
allowNull: true,
field: 'date_envoi',
},
// Priorité
priorite: {
type: DataTypes.ENUM('NORMALE', 'HAUTE', 'URGENTE'),
defaultValue: 'NORMALE',
field: 'priorite',
},
// Statut
statut: {
type: DataTypes.ENUM('RECU', 'EN_TRAITEMENT', 'TRAITE', 'ENVOYE', 'ARCHIVE'),
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
// commentaires
notes: {
type: DataTypes.TEXT,
allowNull: true,
field: 'notes',
},
// Métadonnées supplémentaires
metadata: {
type: DataTypes.JSONB,
defaultValue: {},
field: 'metadata',
},
}, {
tableName: 'courriers',
timestamps: true,
underscored: true,
});

module.exports = Courrier;