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
    canUpload: false, canDownload: true, canSubmit: false,
    canApprove: false, canSign: false, canArchive: false,
    canManageUsers: false, canManageRoles: false, canViewAll: false,
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
{ unique: true, fields: ['name'] }
],
});

module.exports = Role;