const crypto         = require('crypto');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const zlib           = require('zlib');
const { Signature, Document, User } = require('../models');
const alfrescoService = require('./alfresco.service');

const signatureService = {

generateHash(data) {
return crypto.createHash('sha256').update(data).digest('hex');
},

generateSignature(documentHash, userId, timestamp) {
return crypto.createHash('sha256')
.update(`${documentHash}:${userId}:${timestamp}`)
.digest('hex');
},

// DÉCOMPRESSER LES DONNÉES ALFRESCO SI NÉCESSAIRE
async decompressIfNeeded(data) {
const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
// Vérifier si c'est un PDF valide (%PDF = 37 80 68 70)
if (buf[0] === 37 && buf[1] === 80 && buf[2] === 68 && buf[3] === 70) {
return buf; // déjà un PDF valide
}
// Essayer de décompresser gzip
try {
return await new Promise((resolve, reject) => {
zlib.gunzip(buf, (err, result) => err ? reject(err) : resolve(result));
});
} catch {}
// Essayer inflate
try {
return await new Promise((resolve, reject) => {
zlib.inflate(buf, (err, result) => err ? reject(err) : resolve(result));
});
} catch {}
// Essayer brotli
try {
return await new Promise((resolve, reject) => {
zlib.brotliDecompress(buf, (err, result) => err ? reject(err) : resolve(result));
});
} catch {}
console.warn('Impossible de décompresser — retour données brutes');
return buf;
},

// EMBARQUER LA SIGNATURE DANS LE PDF
async embedSignatureInPdf(pdfBytes, signatureData) {
try {
const pdfDoc   = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
const pages    = pdfDoc.getPages();
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

const {
    x, y, pageIndex = pages.length - 1,
    signerName, signatureText, signatureType, signatureImage
} = signatureData;

const page  = pages[Math.min(pageIndex, pages.length - 1)];
const { width } = page.getSize();

const sigW = 240;
const sigH = 80;
const posX = x !== undefined ? x : width - sigW - 40;
const posY = y !== undefined ? y : 60;

if (signatureImage && signatureType === 'draw') {
    try {
    const base64Data = signatureImage.includes(',')
        ? signatureImage.split(',')[1]
        : signatureImage;
    const imgBytes = Buffer.from(base64Data, 'base64');
    const pngImage = await pdfDoc.embedPng(imgBytes);
    const imgDims  = pngImage.scaleToFit(sigW, sigH);
    page.drawImage(pngImage, {
        x:      posX + (sigW - imgDims.width) / 2,
        y:      posY + (sigH - imgDims.height) / 2,
        width:  imgDims.width,
        height: imgDims.height,
    });
    } catch (imgErr) {
    console.warn('Image signature non intégrable:', imgErr.message);
    page.drawText(signerName || 'Signature', {
        x: posX + 10, y: posY + 30,
        size: 28, font: boldFont, color: rgb(0.05, 0.1, 0.5),
    });
    }
} else {
    const displayText = (signatureText || signerName || 'Signature').substring(0, 25);
    const fontSize    = displayText.length > 15 ? 22 : 28;
    page.drawText(displayText, {
    x: posX + 10, y: posY + 30,
    size: fontSize, font: boldFont, color: rgb(0.05, 0.1, 0.5),
    });
}

return await pdfDoc.save();
} catch (e) {
console.error('Erreur embed PDF:', e.message);
return pdfBytes;
}
},

// SIGNER UN DOCUMENT
async signDocument(documentId, signedBy, signatureOptions = {}) {
const document = await Document.findByPk(documentId);
if (!document) throw new Error('Document introuvable.');
if (document.status !== 'APPROUVE' && document.status !== 'ARCHIVE')
throw new Error('Seuls les documents approuvés peuvent être signés.');
if (document.isSigned) throw new Error('Ce document est déjà signé.');

const signer = await User.findByPk(signedBy);
if (!signer) throw new Error('Signataire introuvable.');

const timestamp      = new Date().toISOString();
const dataToHash     = `${document.id}:${document.title}:${document.fileName}:${timestamp}`;
const documentHash   = this.generateHash(dataToHash);
const signatureValue = this.generateSignature(documentHash, signedBy, timestamp);

// Embarquer dans le PDF si c'est un PDF
if (document.alfrescoNodeId && document.mimeType?.includes('pdf')) {
try {
const { data } = await alfrescoService.downloadDocument(document.alfrescoNodeId);

// Décompresser si nécessaire
const pdfBytes = await this.decompressIfNeeded(data);

console.log('PDF après décompression - premiers bytes:', pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]);
console.log('PDF après décompression - taille:', pdfBytes.length);

// Vérifier que c'est bien un PDF
if (pdfBytes[0] === 37 && pdfBytes[1] === 80) {
const signedPdfBytes = await this.embedSignatureInPdf(pdfBytes, {
x:             signatureOptions.x,
y:             signatureOptions.y,
pageIndex:     signatureOptions.pageIndex,
signerName:    `${signer.firstName} ${signer.lastName}`,
signerRole:    signer.roleName || 'N/A',
signedAt:      timestamp,
signatureText: signatureOptions.signatureText || `${signer.firstName} ${signer.lastName}`,
signatureType: signatureOptions.signatureType || 'text',
signatureImage: signatureOptions.signatureImage || null, 
});

// ✅ Mettre à jour avec une version MAJEURE pour Alfresco
const updateResult = await alfrescoService.updateDocumentContent(
document.alfrescoNodeId,
Buffer.from(signedPdfBytes),
'application/pdf',
true // ← majorVersion = true pour créer une nouvelle version
);
console.log('✅ Signature embarquée dans le PDF avec succès - Nouvelle version créée');
console.log('Résultat update:', updateResult);
} else {
console.warn('⚠️ Les données ne sont pas un PDF valide — signature non embarquée');
}
} catch (e) {
console.warn('⚠️ Impossible d\'embarquer la signature PDF:', e.message);
}
}

const signature = await Signature.create({
documentId, signedBy, documentHash, signatureValue,
algorithm: 'SHA256', status: 'VALIDE', signedAt: timestamp,
metadata: {
signerName:    `${signer.firstName} ${signer.lastName}`,
signerEmail:   signer.email,
signerRole:    signer.roleName,
documentTitle: document.title,
timestamp,
signatureType: signatureOptions.signatureType || 'text',
placement:     { x: signatureOptions.x, y: signatureOptions.y, pageIndex: signatureOptions.pageIndex },
},
});

// ✅ Mettre à jour le document avec isSigned=true ET touch updatedAt (pour forcer le revalidation)
await document.update({ 
isSigned: true, 
signedAt: timestamp,
// Force la mise à jour du timestamp pour invalider le cache
}, { 
// Force le revalidation même si rien n'a changé
timestamps: true 
});

return signature;
},

// VÉRIFIER UNE SIGNATURE
async verifySignature(signatureId) {
const signature = await Signature.findByPk(signatureId, {
include: [
{ model: Document, as: 'document', attributes: ['id', 'title', 'fileName', 'status', 'isSigned'] },
{ model: User,     as: 'signer',   attributes: ['id', 'firstName', 'lastName', 'email', 'roleName'] },
],
});
if (!signature) throw new Error('Signature introuvable.');
if (signature.status === 'REVOQUEE')
return { isValid: false, reason: 'Signature révoquée.', signature };

const recalculated = this.generateSignature(
signature.documentHash, signature.signedBy, signature.metadata.timestamp
);
const isValid = recalculated === signature.signatureValue;
return {
isValid,
reason: isValid ? 'Signature valide.' : 'Signature invalide — document potentiellement modifié.',
signature,
};
},

// RÉVOQUER UNE SIGNATURE
async revokeSignature(signatureId, revokedBy, reason) {
const signature = await Signature.findByPk(signatureId);
if (!signature) throw new Error('Signature introuvable.');
if (signature.status === 'REVOQUEE') throw new Error('Cette signature est déjà révoquée.');
await signature.update({ status: 'REVOQUEE', revokedReason: reason, revokedAt: new Date() });
await Document.update({ isSigned: false, signedAt: null }, { where: { id: signature.documentId } });
return signature;
},

// LISTER LES SIGNATURES D'UN DOCUMENT
async getDocumentSignatures(documentId) {
return Signature.findAll({
where: { documentId },
include: [{ model: User, as: 'signer', attributes: ['id', 'firstName', 'lastName', 'email', 'roleName'] }],
order: [['signedAt', 'DESC']],
});
},
};

module.exports = signatureService;