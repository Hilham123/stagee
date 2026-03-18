const express = require('express');
const router  = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate }    = require('../middlewares/auth.middleware');
const { isAdmin, isManager, isEmployee, isViewer } = require('../middlewares/role.middleware');
// ROUTES DASHBOARD
// Dashboard automatique selon le rôle connecté
router.get('/',          authenticate, isViewer,   dashboardController.getDashboard);

// Dashboards spécifiques par rôle
router.get('/admin',     authenticate, isAdmin,    dashboardController.getAdminStats);
router.get('/manager',   authenticate, isManager,  dashboardController.getManagerStats);
router.get('/employee',  authenticate, isEmployee, dashboardController.getEmployeeStats);
router.get('/viewer',    authenticate, isViewer,   dashboardController.getViewerStats);

module.exports = router;