const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
id: {
type: DataTypes.UUID,
defaultValue: DataTypes.UUIDV4,
primaryKey: true,
},
name: {
type: DataTypes.STRING(50),
allowNull: false,
comment: 'Nom technique ex: ADMIN, MANAGER',
},
label: {
type: DataTypes.STRING(100),
allowNull: false,
comment: 'Nom affiché ex: Administrateur',
},
color: {
type: DataTypes.STRING(20),
defaultValue: '#1a3a5c',
},
permissions: {
type: DataTypes.JSONB,
defaultValue: {
    // — Permissions documents (existantes) —
    canUpload:       false,
    canDownload:     true,
    canSubmit:       false,
    canApprove:      false,
    canSign:         false,
    canArchive:      false,
    canManageUsers:  false,
    canManageRoles:  false,
    canViewAll:      false,

    // Permissions courriers
    // Accès au module courrier externe (réservé service administratif)
    'courrier.externe':  false,
    // Accès au module courrier interne (tous les employés)
    'courrier.interne':  false,
    // Créer un courrier
    'creer.courrier':          false,
    // Modifier un courrier
    'Mise a jour.Courrier':          false,
    // Changer le statut d'un courrier
    'change.statut.courrier':   false,
    // Supprimer un courrier (admin uniquement)
    'Supprimer.courrier':          false,
    // Voir les statistiques courriers
    'stat.courrier':           false,
},
},
isSystem: {
type: DataTypes.BOOLEAN,
defaultValue: false,
field: 'is_system',
},
description: {
type: DataTypes.TEXT,
allowNull: true,
},
}, {
tableName: 'roles',
timestamps: true,
underscored: true,
indexes: [
{ unique: true, fields: ['name'] },
],
});

module.exports = Role;