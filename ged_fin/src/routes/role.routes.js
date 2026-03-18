const express        = require('express')
const router         = express.Router()
const roleController = require('../controllers/role.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const { isAdmin }      = require('../middlewares/role.middleware')

router.use(authenticate)

router.get('/',    roleController.getAll)              // Tous peuvent voir les rôles
router.get('/:id', roleController.getOne)
router.post('/',   isAdmin, roleController.create)     // ADMIN seulement
router.put('/:id', isAdmin, roleController.update)
router.delete('/:id', isAdmin, roleController.remove)

module.exports = router