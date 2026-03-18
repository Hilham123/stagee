const { Role, User } = require('../models');
const { Op } = require('sequelize');

// Rôles système par défaut (créés au démarrage)
const DEFAULT_ROLES = [
{
name: 'ADMIN',
label: 'Administrateur',
color: '#dc2626',
isSystem: true,
description: 'Accès complet à toutes les fonctionnalités',
permissions: {
    canUpload: true, canDownload: true, canSubmit: true,
    canApprove: true, canSign: true, canArchive: true,
    canManageUsers: true, canManageRoles: true, canViewAll: true,
},
},
{
name: 'MANAGER',
label: 'Manager',
color: '#d97706',
isSystem: true,
description: 'Validation et approbation des documents',
permissions: {
    canUpload: true, canDownload: true, canSubmit: true,
    canApprove: true, canSign: true, canArchive: false,
    canManageUsers: false, canManageRoles: false, canViewAll: true,
},
},
{
name: 'EMPLOYEE',
label: 'Employé',
color: '#2563eb',
isSystem: true,
description: 'Upload et soumission de documents',
permissions: {
    canUpload: true, canDownload: true, canSubmit: true,
    canApprove: false, canSign: false, canArchive: false,
    canManageUsers: false, canManageRoles: false, canViewAll: false,
},
},
];

const roleController = {

// Initialiser les rôles par défaut au démarrage
async initDefaultRoles() {
try {
for (const roleData of DEFAULT_ROLES) {
    await Role.findOrCreate({
    where: { name: roleData.name },
    defaults: roleData,
    });
}
console.log('✅ Rôles par défaut initialisés');

const roles = await Role.findAll();
const { sequelize } = require('../config/database')

for (const role of roles) {
    // On assigne un rôle par défaut EMPLOYEE si aucun role_id
    await sequelize.query(`
    UPDATE users
    SET role_id = '${role.id}', role_name = '${role.name}'
    WHERE role_id IS NULL
    AND role_name IS NULL
    AND '${role.name}' = 'EMPLOYEE'
    `).catch(() => {})

    // Cas 2 : users qui ont déjà role_id mais pas role_name
    await sequelize.query(`
    UPDATE users
    SET role_name = '${role.name}'
    WHERE role_id = '${role.id}'
    AND (role_name IS NULL OR role_name = '')
    `).catch(() => {})
}

console.log('✅ Migration utilisateurs terminée');
} catch (error) {
console.error('❌ Erreur init rôles:', error.message);
}
},

// GET tous les rôles
async getAll(req, res) {
try {
    const roles = await Role.findAll({
    order: [['createdAt', 'ASC']],
    include: [{
        model: User,
        as: 'users',
        attributes: ['id'],
    }],
    });
    // Ajouter le count d'utilisateurs
    const rolesWithCount = roles.map(r => ({
    ...r.toJSON(),
    userCount: r.users?.length || 0,
    }))
    res.json({ success: true, data: rolesWithCount })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},

// GET un rôle
async getOne(req, res) {
try {
    const role = await Role.findByPk(req.params.id)
    if (!role) return res.status(404).json({ success: false, message: 'Rôle non trouvé' })
    res.json({ success: true, data: role })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},

// POST créer un rôle
async create(req, res) {
try {
    const { name, label, color, description, permissions } = req.body
    if (!name || !label)
    return res.status(400).json({ success: false, message: 'Nom et label obligatoires' })

    const exists = await Role.findOne({ where: { name: name.toUpperCase() } })
    if (exists) return res.status(409).json({ success: false, message: 'Ce rôle existe déjà' })

    const role = await Role.create({
    name: name.toUpperCase(),
    label, color: color || '#1a3a5c',
    description, permissions, isSystem: false,
    })
    res.status(201).json({ success: true, data: role, message: 'Rôle créé avec succès' })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},

// PUT modifier un rôle
async update(req, res) {
try {
    const role = await Role.findByPk(req.params.id)
    if (!role) return res.status(404).json({ success: false, message: 'Rôle non trouvé' })

    const { label, color, description, permissions } = req.body
    // On ne peut pas changer le name d'un rôle système
    await role.update({ label, color, description, permissions })
    res.json({ success: true, data: role, message: 'Rôle modifié avec succès' })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},

// DELETE supprimer un rôle
async remove(req, res) {
try {
    const role = await Role.findByPk(req.params.id)
    if (!role) return res.status(404).json({ success: false, message: 'Rôle non trouvé' })
    if (role.isSystem) return res.status(400).json({ success: false, message: 'Impossible de supprimer un rôle système' })

    const userCount = await User.count({ where: { roleId: role.id } })
    if (userCount > 0) return res.status(400).json({
    success: false,
    message: `Impossible de supprimer — ${userCount} utilisateur(s) ont ce rôle`
    })

    await role.destroy()
    res.json({ success: true, message: 'Rôle supprimé avec succès' })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},
}

module.exports = roleController