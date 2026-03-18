const express = require('express');
const router  = express.Router();
const signatureController = require('../controllers/signature.controller');
const { authenticate }    = require('../middlewares/auth.middleware');
const { isAdmin, isManager, isViewer } = require('../middlewares/role.middleware');

// ROUTES SIGNATURES
// Signer un document (MANAGER et ADMIN uniquement)
router.post('/sign',                        authenticate, isManager,  signatureController.signDocument);

// Vérifier une signature (tout le monde)
router.get('/:id/verify',                   authenticate, isViewer,   signatureController.verifySignature);

// Révoquer une signature (ADMIN uniquement)
router.put('/:id/revoke',                   authenticate, isAdmin,    signatureController.revokeSignature);

// Lister les signatures d'un document (tout le monde)
router.get('/document/:documentId',         authenticate, isViewer,   signatureController.getDocumentSignatures);

module.exports = router;