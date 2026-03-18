const express = require('express');
const router  = express.Router();
const courrierController = require('../controllers/courrier.controller');
const { authenticate }   = require('../middlewares/auth.middleware');
const { isAdmin, isManager, isEmployee, isViewer } = require('../middlewares/role.middleware');

// ROUTES COURRIERS
// Statistiques
router.get('/stats',     authenticate, isViewer,   courrierController.getStats);

// Lister les courriers (tout le monde)
router.get('/',          authenticate, isViewer,   courrierController.listCourriers);

// Récupérer un courrier
router.get('/:id',       authenticate, isViewer,   courrierController.getCourrier);

// Créer un courrier (EMPLOYEE+)
router.post('/',         authenticate, isEmployee, courrierController.createCourrier);

// Mettre à jour un courrier (MANAGER+)
router.put('/:id',       authenticate, isManager,  courrierController.updateCourrier);

// Changer le statut (MANAGER+)
router.put('/:id/statut', authenticate, isManager, courrierController.changeStatut);

// Supprimer un courrier (ADMIN)
router.delete('/:id',    authenticate, isAdmin,    courrierController.deleteCourrier);

module.exports = router;