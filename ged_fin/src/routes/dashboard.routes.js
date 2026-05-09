const express = require('express');
const router  = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate }    = require('../middlewares/auth.middleware');
const { isAdmin, isManager, isEmployee } = require('../middlewares/role.middleware');
// ROUTES DASHBOARD
// Dashboard automatique selon le rôle connecté
router.get('/',          authenticate,isEmployee,   dashboardController.getDashboard);

// Dashboards spécifiques par rôle
router.get('/admin',     authenticate, isAdmin,    dashboardController.getAdminStats);
router.get('/manager',   authenticate, isManager,  dashboardController.getManagerStats);
router.get('/employee',  authenticate, isEmployee, dashboardController.getEmployeeStats);

module.exports = router;