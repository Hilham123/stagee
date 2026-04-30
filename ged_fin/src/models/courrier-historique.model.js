const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CourrierHistorique = sequelize.define('CourrierHistorique', {
id: {
type: DataTypes.UUID,
defaultValue: DataTypes.UUIDV4,
primaryKey: true,
},

// Courrier concerné
courrierId: {
type: DataTypes.UUID,
allowNull: false,
field: 'courrier_id',
references: { model: 'courriers', key: 'id' },
},

// Utilisateur ayant effectué l'action
userId: {
type: DataTypes.UUID,
allowNull: true,
field: 'user_id',
references: { model: 'users', key: 'id' },
},

// Type d'action

action: {
type: DataTypes.ENUM(
'CREATION',
'MODIFICATION',
'CHANGEMENT_STATUT',
'SUPPRESSION',
'ARCHIVAGE',
'DISPATCH',
'SOUMISSION_APPROBATION',
'APPROBATION',
'SIGNATURE'    
),
allowNull: false,
},

// Détail lisible de l'action
details: {
type: DataTypes.TEXT,
allowNull: true,
},

// Données avant/après 
metadata: {
type: DataTypes.JSONB,
defaultValue: {},
},
}, {
tableName: 'courrier_historiques',
timestamps: true,
underscored: true,
updatedAt: false, 
});

module.exports = CourrierHistorique;
