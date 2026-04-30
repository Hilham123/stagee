const signatureService = require('../services/signature.service');

const signatureController = {

// SIGNER UN DOCUMENT
//  POST 
async signDocument(req, res) {
try {
const {
    documentId,
    signatureType,
    signatureText,
    signatureImage,
    x,
    y,
    pageIndex,
} = req.body;

if (!documentId) {
    return res.status(400).json({
    success: false,
    message: 'documentId est requis.',
    });
}

const signature = await signatureService.signDocument(
    documentId,
    req.user.id,
    {
    signatureType,
    signatureText,
    signatureImage,
    x,
    y,
    pageIndex,
    }
);

res.status(201).json({
    success: true,
    message: 'Document signé avec succès.',
    data: signature,
});
} catch (error) {
res.status(400).json({ success: false, message: error.message });
}
},
// VÉRIFIER UNE SIGNATURE
//GET 
async verifySignature(req, res) {
try {
const result = await signatureService.verifySignature(req.params.id);

res.json({
    success: true,
    data: {
    isValid:   result.isValid,
    reason:    result.reason,
    signature: result.signature,
    },
});
} catch (error) {
res.status(400).json({ success: false, message: error.message });
}
},

// RÉVOQUER UNE SIGNATURE
// POST
async revokeSignature(req, res) {
try {
const { reason } = req.body;

if (!reason) {
    return res.status(400).json({
    success: false,
    message: 'Une raison de révocation est obligatoire.',
    });
}

const signature = await signatureService.revokeSignature(
    req.params.id,
    req.user.id,
    reason
);

res.json({
    success: true,
    message: 'Signature révoquée avec succès.',
    data: signature,
});
} catch (error) {
res.status(400).json({ success: false, message: error.message });
}
},

// LISTER LES SIGNATURES D'UN DOCUMENT
// GET 
async getDocumentSignatures(req, res) {
try {
const signatures = await signatureService.getDocumentSignatures(
    req.params.documentId
);

res.json({
    success: true,
    data: signatures,
});
} catch (error) {
res.status(500).json({ success: false, message: error.message });
}
},
};

module.exports = signatureController;