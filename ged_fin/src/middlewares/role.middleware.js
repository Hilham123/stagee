const { Role } = require('../models');

const hasPermission = (permission) => {
return async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Non authentifié' })

    const roleName = req.user.roleName || req.user.role
    const role = await Role.findOne({ where: { name: roleName } })
    if (!role) return res.status(403).json({ success: false, message: 'Rôle introuvable' })

    if (!role.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permission refusée : ${permission}`
      })
    }
    req.userPermissions = role.permissions
    next()
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
}

const authorize = (allowedRoles = []) => {
return (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Non authentifié' })
  
  // ← Fix : supporte roleName ET role
  const userRole = req.user.roleName || req.user.role
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: `Accès refusé. Rôle(s) requis : ${allowedRoles.join(', ')}`
    })
  }
  next()
}
}

const isAdmin    = authorize(['ADMIN'])
const isManager  = authorize(['ADMIN', 'MANAGER'])
const isEmployee = authorize(['ADMIN', 'MANAGER', 'EMPLOYEE'])
const isViewer   = authorize(['ADMIN', 'MANAGER', 'EMPLOYEE'])

module.exports = { authorize, hasPermission, isAdmin, isManager, isEmployee, isViewer }