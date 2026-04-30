const express           = require('express');
const router            = express.Router();
const serviceController = require('../controllers/service.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { isAdmin, isEmployee } = require('../middlewares/role.middleware');

router.get('/',           authenticate, isEmployee, serviceController.getAll);
router.get('/:id',        authenticate, isEmployee, serviceController.getOne);
router.get('/:id/membres',authenticate, isEmployee, serviceController.getMembres);
router.post('/',          authenticate, isAdmin,    serviceController.create);
router.put('/:id',        authenticate, isAdmin,    serviceController.update);

module.exports = router;