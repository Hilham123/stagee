const express    = require('express')
const router     = express.Router()
const userController = require('../controllers/user.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const { isAdmin }      = require('../middlewares/role.middleware')

router.use(authenticate)
router.use(isAdmin)

router.get('/',           userController.getAll)
router.get('/:id',        userController.getOne)
router.post('/',          userController.create)
router.put('/:id',        userController.update)
router.delete('/:id',     userController.remove)
router.put('/:id/toggle', userController.toggleActive)

module.exports = router