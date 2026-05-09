const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');


// ROUTES PUBLIQUES (sans token)
// Connexion
router.post('/login', authController.login);

// ROUTES PROTÉGÉES (token requis)
// Inscription — réservée à l'admin uniquement
router.post('/register', authenticate, isAdmin, authController.register);

// Récupérer son propre profil
router.get('/me', authenticate, authController.getMe);

// Changer son mot de passe
router.put('/change-password', authenticate, authController.changePassword);

router.put('/signature', authenticate, authController.saveSignature)

module.exports = router;