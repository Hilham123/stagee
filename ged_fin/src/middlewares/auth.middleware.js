const jwt    = require('jsonwebtoken');
const { User, Role } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token manquant. Veuillez vous connecter.' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'userRole' }]
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable ou désactivé.' });
    }

    const safeUser = user.toSafeJSON()
    // S'assurer que role est bien défini depuis userRole
    if (user.userRole) {
      safeUser.role        = user.userRole.name
      safeUser.roleLabel   = user.userRole.label
      safeUser.roleColor   = user.userRole.color
      safeUser.permissions = user.userRole.permissions
    }

    req.user = safeUser
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token expiré ou invalide. Veuillez vous reconnecter.' });
  }
};

module.exports = { authenticate };