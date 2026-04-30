const multer = require('multer')
const path   = require('path')

const storage = multer.memoryStorage() // Stockage en mémoire (pas sur disque)

const fileFilter = (req, file, cb) => {
const allowed = [
'application/pdf',
'application/msword',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'image/jpeg', 'image/png', 'image/jpg',
]
if (allowed.includes(file.mimetype)) {
cb(null, true)
} else {
cb(new Error('Format de fichier non autorisé. PDF, DOC, DOCX, JPG, PNG uniquement.'), false)
}
}

const upload = multer({
storage,
fileFilter,
limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
})

module.exports = upload