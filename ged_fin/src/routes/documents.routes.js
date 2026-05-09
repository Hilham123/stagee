const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticate }   = require('../middlewares/auth.middleware');
const { isAdmin, isManager, isEmployee } = require('../middlewares/role.middleware');
// CONFIGURATION MULTER
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/plain',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`), false);
    }
  },
});

// ROUTES DOCUMENTS
// Recherche (avant /:id pour éviter les conflits de routing)
router.get('/search',          authenticate, isEmployee,   documentController.searchDocuments);

// Récupérer les archives des documents (uniquement)
router.get('/archives/list',   authenticate, isEmployee,   documentController.getDocumentArchives);

// Lister tous les documents (actifs - SANS archives ni courriers)
router.get('/',                authenticate, isEmployee,   documentController.listDocuments);

// Récupérer un document par son ID
router.get('/:id',             authenticate, isEmployee,   documentController.getDocument);

// Uploader un nouveau document
router.post('/upload',         authenticate, isEmployee, upload.single('file'), documentController.uploadDocument);

// Mettre à jour un document
router.put('/:id',             authenticate, isManager,  documentController.updateDocument);

// Supprimer un document
router.delete('/:id',          authenticate, isAdmin,    documentController.deleteDocument);

// Télécharger le fichier
router.get('/:id/download',    authenticate, isEmployee,   documentController.downloadDocument);

// Lister les versions
router.get('/:id/versions',    authenticate, isEmployee,   documentController.getVersions);

// Modifier la durée de conservation
router.put('/:id/retention', authenticate, isAdmin, documentController.updateRetention);


module.exports = router;