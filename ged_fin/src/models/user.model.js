const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
id: {
type: DataTypes.UUID,
defaultValue: DataTypes.UUIDV4,
primaryKey: true,
},
firstName: {
type: DataTypes.STRING(100),
allowNull: false,
field: 'first_name',
},
lastName: {
type: DataTypes.STRING(100),
allowNull: false,
field: 'last_name',
},
email: {
type: DataTypes.STRING(255),
allowNull: false,
unique: true,
validate: { isEmail: true },
},
password: {
type: DataTypes.STRING(255),
allowNull: false,
},
roleId: {
type: DataTypes.UUID,
allowNull: true,
field: 'role_id',
references: { model: 'roles', key: 'id' },
},
// Garde role string pour compatibilité temporaire
roleName: {
type: DataTypes.STRING(50),
allowNull: true,
field: 'role_name',
},
serviceId: {
type: DataTypes.UUID,
allowNull: true,
field: 'service_id',
references: { model: 'services', key: 'id' },
},

department: {
type: DataTypes.STRING(100),
allowNull: true,
},
isActive: {
type: DataTypes.BOOLEAN,
defaultValue: true,
field: 'is_active',
},
isDirecteur: {
type: DataTypes.BOOLEAN,
defaultValue: false,
field: 'is_directeur',
},
savedSignatureImage: {
type: DataTypes.TEXT,
allowNull: true,
field: 'saved_signature_image',
},
savedSignatureText: {
type: DataTypes.STRING(100),
allowNull: true,
field: 'saved_signature_text',
},
savedSignatureFont: {
type: DataTypes.STRING(100),
allowNull: true,
field: 'saved_signature_font',
},
lastLogin: {
type: DataTypes.DATE,
allowNull: true,
field: 'last_login',
},
}, {
tableName: 'users',
timestamps: true,
underscored: true,
hooks: {
beforeCreate: async (user) => {
if (user.password && !user.password.startsWith('$2')) {
user.password = await bcrypt.hash(user.password, 12);
}
},
beforeUpdate: async (user) => {
if (user.changed('password') && !user.password.startsWith('$2')) {
user.password = await bcrypt.hash(user.password, 12);
}
},
},
});

User.prototype.comparePassword = async function (candidatePassword) {
return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toSafeJSON = function () {
const values = { ...this.get() };
delete values.password;

if (this.userRole) {
values.roleName    = this.userRole.name;
values.roleLabel   = this.userRole.label;
values.roleColor   = this.userRole.color;
values.permissions = this.userRole.permissions;
}
if (this.service) {
values.serviceCode = this.service.code;
values.serviceNom  = this.service.nom;
}

values.role = values.roleName || 'EMPLOYEE';
return values;
};

module.exports = User;
