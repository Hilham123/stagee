const express            = require('express');
const router             = express.Router();
const courrierController = require('../controllers/courrier.controller');
const upload             = require('../config/multer.config');
const { authenticate }   = require('../middlewares/auth.middleware');
const { hasPermission }  = require('../middlewares/role.middleware');

// STATISTIQUES
router.get('/stats',
  authenticate,
  hasPermission('courrier.stats'),
  courrierController.getStats
);

// ARCHIVES
router.get('/archives/list',
  authenticate,
  hasPermission('courrier.interne.access'),
  courrierController.getCourrierArchives
);

// LISTER
router.get('/',
  authenticate,
  hasPermission('courrier.interne.access'),
  courrierController.listCourriers
);

// CRÉER
router.post('/',
  authenticate,
  hasPermission('courrier.create'),
  upload.single('fichier'),
  courrierController.createCourrier
);

// RÉCUPÉRER UN COURRIER
router.get('/:id',
  authenticate,
  hasPermission('courrier.interne.access'),
  courrierController.getCourrier
);

// HISTORIQUE
router.get('/:id/historique',
  authenticate,
  hasPermission('courrier.interne.access'),
  courrierController.getHistorique
);

// METTRE À JOUR
router.put('/:id',
  authenticate,
  hasPermission('courrier.update'),
  courrierController.updateCourrier
);

// CHANGER LE STATUT
router.put('/:id/statut',
  authenticate,
  hasPermission('courrier.statut.change'),
  courrierController.changeStatut
);

// DISPATCH
router.put('/:id/dispatch',
  authenticate,
  hasPermission('courrier.externe.access'),
  courrierController.dispatch
);

// SOUMETTRE POUR APPROBATION
router.put('/:id/approbation',
  authenticate,
  hasPermission('courrier.statut.change'),
  courrierController.soumettreApprobation
);

// APPROUVER
router.put('/:id/approuver',
  authenticate,
  hasPermission('courrier.statut.change'),
  courrierController.approuver
);

// SIGNER
router.put('/:id/signer',
  authenticate,
  hasPermission('courrier.statut.change'),
  courrierController.signerCourrier
);

// ✅ NOUVEAU : GÉNÉRER LE PDF DU COURRIER
router.post('/:id/generer-pdf',
  authenticate,
  hasPermission('courrier.statut.change'),
  courrierController.genererPdf
);

// ✅ NOUVEAU : DURÉE DE RÉTENTION
router.put('/:id/retention',
  authenticate,
  hasPermission('courrier.statut.change'),
  courrierController.updateRetention
);

// ARCHIVER
router.put('/:id/archive',
  authenticate,
  hasPermission('courrier.statut.change'),
  courrierController.archiveCourrier
);

// CRÉER UNE RÉPONSE
router.post('/:id/reponse',
  authenticate,
  hasPermission('courrier.create'),
  courrierController.creerReponse
);

// SUPPRIMER
router.delete('/:id',
  authenticate,
  hasPermission('courrier.delete'),
  courrierController.deleteCourrier
);

module.exports = router;