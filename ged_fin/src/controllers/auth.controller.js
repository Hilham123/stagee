const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    {
      id:         user.id,
      email:      user.email,
      role:       user.roleName || user.role,  // ← fix
      firstName:  user.firstName,
      lastName:   user.lastName,
      department: user.department,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const authController = {

  async register(req, res) {
    try {
      const { firstName, lastName, email, password, role, department } = req.body;
      if (!firstName || !lastName || !email || !password)
        return res.status(400).json({ success: false, message: 'Champs requis : prénom, nom, email, mot de passe.' });

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser)
        return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });

      const user  = await User.create({ firstName, lastName, email, password, role: role || 'EMPLOYEE', department: department || null });
      const token = generateToken(user);
      res.status(201).json({ success: true, message: 'Compte créé avec succès.', data: { user: user.toSafeJSON(), token } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });

      const user = await User.findOne({
        where: { email },
        include: [{ model: Role, as: 'userRole' }]  // ← charge le rôle
      });
      if (!user)
        return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
      if (!user.isActive)
        return res.status(403).json({ success: false, message: 'Compte désactivé. Contactez votre administrateur.' });

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid)
        return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });

      const token = generateToken(user);
      res.json({ success: true, message: 'Connexion réussie.', data: { user: user.toSafeJSON(), token } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getMe(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        include: [{ model: Role, as: 'userRole' }]  // ← charge le rôle
      });
      if (!user)
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
      res.json({ success: true, data: user.toSafeJSON() });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword)
        return res.status(400).json({ success: false, message: 'Mot de passe actuel et nouveau mot de passe requis.' });

      const user    = await User.findByPk(req.user.id);
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid)
        return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect.' });

      await user.update({ password: newPassword });
      res.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = authController;