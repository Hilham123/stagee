const { User, Role } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const userController = {

async getAll(req, res) {
try {
    const { role, search, page = 1, limit = 10 } = req.query
    const where = {}
    if (search) where[Op.or] = [
    { firstName: { [Op.iLike]: `%${search}%` } },
    { lastName:  { [Op.iLike]: `%${search}%` } },
    { email:     { [Op.iLike]: `%${search}%` } },
    ]

    // Filtre par rôle via la relation
    const includeRole = {
    model: Role, as: 'userRole', attributes: ['id', 'name', 'label', 'color', 'permissions'],
    }
    if (role) includeRole.where = { name: role }

    const offset = (page - 1) * limit
    const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    include: [includeRole],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset),
    })
    res.json({
    success: true,
    data: {
        users: rows,
        pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) }
    }
    })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},

async getOne(req, res) {
try {
    const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
    include: [{ model: Role, as: 'userRole', attributes: ['id', 'name', 'label', 'color', 'permissions'] }]
    })
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' })
    res.json({ success: true, data: user })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},

async create(req, res) {
try {
    const { firstName, lastName, email, password, roleId, department } = req.body
    if (!firstName || !lastName || !email || !password || !roleId)
    return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' })

    const exists = await User.findOne({ where: { email } })
    if (exists) return res.status(409).json({ success: false, message: 'Email déjà utilisé' })

    // Récupérer le rôle pour avoir le name
    const role = await Role.findByPk(roleId)
    if (!role) return res.status(404).json({ success: false, message: 'Rôle non trouvé' })

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
    firstName, lastName, email,
    password: hashedPassword,
    roleId, roleName: role.name,
    department, isActive: true
    })
    const { password: _, ...userData } = user.toJSON()
    res.status(201).json({ success: true, data: userData, message: 'Utilisateur créé avec succès' })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},

async update(req, res) {
try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' })

    const { firstName, lastName, email, roleId, department, isActive, password } = req.body
    const updateData = { firstName, lastName, email, department, isActive }

    if (roleId) {
    const role = await Role.findByPk(roleId)
    if (!role) return res.status(404).json({ success: false, message: 'Rôle non trouvé' })
    updateData.roleId    = roleId
    updateData.roleName  = role.name
    }

    if (password) updateData.password = await bcrypt.hash(password, 12)

    await user.update(updateData)
    const updated = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
    include: [{ model: Role, as: 'userRole' }]
    })
    res.json({ success: true, data: updated, message: 'Utilisateur modifié avec succès' })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},

async remove(req, res) {
try {
    if (req.params.id === req.user.id)
    return res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte' })

    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' })

    await user.destroy()
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},

async toggleActive(req, res) {
try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' })
    await user.update({ isActive: !user.isActive })
    res.json({ success: true, message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'}`, data: { isActive: user.isActive } })
} catch (error) {
    res.status(500).json({ success: false, message: error.message })
}
},
}

module.exports = userController