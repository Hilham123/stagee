const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define('Service', {
id: {
type: DataTypes.UUID,
defaultValue: DataTypes.UUIDV4,
primaryKey: true,
},
nom: {
type: DataTypes.STRING(100),
allowNull: false,
},
code: {
type: DataTypes.STRING(50),
allowNull: false,
unique: true,
},
description: {
type: DataTypes.TEXT,
allowNull: true,
},
isActive: {
type: DataTypes.BOOLEAN,
defaultValue: true,
field: 'is_active',
},
}, {
tableName: 'services',
timestamps: true,
underscored: true,
indexes: [
{ unique: true, fields: ['code'] },
],
});

module.exports = Service;
