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
// On garde role string pour compatibilité temporaire
roleName: {
type: DataTypes.STRING(50),
allowNull: true,
field: 'role_name',
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

// Récupère roleName depuis l'association userRole si disponible
if (this.userRole) {
values.roleName = this.userRole.name;
values.roleLabel = this.userRole.label;
values.roleColor = this.userRole.color;
values.permissions = this.userRole.permissions;
}

values.role = values.roleName || 'VIEWER';
return values;
};
module.exports = User;