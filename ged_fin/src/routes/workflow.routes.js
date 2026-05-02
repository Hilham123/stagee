const express = require('express');
const router  = express.Router();
const workflowController = require('../controllers/workflow.controller');
const { authenticate }   = require('../middlewares/auth.middleware');
const { isAdmin, isManager, isEmployee, isViewer } = require('../middlewares/role.middleware');

// ROUTES WORKFLOWS
// Lister tous les workflows (filtré selon le rôle)
router.get('/',                     authenticate, isViewer,   workflowController.getWorkflows);

// Récupérer un workflow par ID
router.get('/:id',                  authenticate, isViewer,   workflowController.getWorkflow);

// Soumettre un document à la validation (EMPLOYEE+)
router.post('/submit',              authenticate, isEmployee, workflowController.submitDocument);

// Prendre en charge un workflow (MANAGER+)
router.put('/:id/take-charge',      authenticate, isManager,  workflowController.takeCharge);

// Approuver un document (MANAGER+)
router.put('/:id/approve',          authenticate, isManager,  workflowController.approveDocument);

// Rejeter un document (MANAGER+)
router.put('/:id/reject',           authenticate, isManager,  workflowController.rejectDocument);
// Archiver un document (MANAGER+)
router.put('/:id/archive', authenticate, isManager, workflowController.archiveDocument);

module.exports = router;