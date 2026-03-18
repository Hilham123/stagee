const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');


// ROUTES PUBLIQUES (sans token)
// Connexion
router.post('/login', authController.login);

// Inscription (réservée à l'admin en production)
router.post('/register', authController.register);

// ROUTES PROTÉGÉES (token requis)
// Récupérer son propre profil
router.get('/me', authenticate, authController.getMe);

// Changer son mot de passe
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;