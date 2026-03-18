const courrierService = require('../services/courrier.service');

const courrierController = {

// LISTER LES COURRIERS
async listCourriers(req, res) {
try {
    const { type, statut, priorite, search, page, limit } = req.query;
    const result = await courrierService.listCourriers(
    { type, statut, priorite, search },
    { page, limit }
    );
    res.json({ success: true, ...result });
} catch (error) {
    res.status(500).json({ success: false, message: error.message });
}
},
// RÉCUPÉRER UN COURRIER
async getCourrier(req, res) {
try {
    const courrier = await courrierService.getCourrier(req.params.id);
    res.json({ success: true, data: courrier });
} catch (error) {
    res.status(404).json({ success: false, message: error.message });
}
},
// CRÉER UN COURRIER
async createCourrier(req, res) {
try {
    const {
    type, objet, expediteur, destinataire,
    dateReception, dateEnvoi, priorite, notes, documentId,
    } = req.body;

    if (!type || !objet || !expediteur || !destinataire) {
    return res.status(400).json({
        success: false,
        message: 'Type, objet, expéditeur et destinataire sont obligatoires.',
    });
    }

const courrier = await courrierService.createCourrier(
{
    type, objet, expediteur, destinataire,
    dateReception: dateReception || null,
    dateEnvoi:     dateEnvoi     || null,
    priorite, notes, documentId,
},
req.user.id
);

    res.status(201).json({
    success: true,
    message: 'Courrier créé avec succès.',
    data: courrier,
    });
} catch (error) {
console.error('❌ COURRIER ERROR:', error.message, error.stack)
res.status(500).json({ success: false, message: error.message });
}
},
// METTRE À JOUR UN COURRIER
async updateCourrier(req, res) {
try {
    const courrier = await courrierService.updateCourrier(
    req.params.id,
    req.body
    );
    res.json({
    success: true,
    message: 'Courrier mis à jour avec succès.',
    data: courrier,
    });
} catch (error) {
    res.status(404).json({ success: false, message: error.message });
}
},

// CHANGER LE STATUT
async changeStatut(req, res) {
try {
    const { statut } = req.body;
    if (!statut) {
    return res.status(400).json({
        success: false,
        message: 'Statut obligatoire.',
    });
    }

    const courrier = await courrierService.changeStatut(
    req.params.id,
    statut
    );
    res.json({
    success: true,
    message: 'Statut mis à jour avec succès.',
    data: courrier,
    });
} catch (error) {
    res.status(404).json({ success: false, message: error.message });
}
},
// SUPPRIMER UN COURRIER
async deleteCourrier(req, res) {
try {
    await courrierService.deleteCourrier(req.params.id);
    res.json({
    success: true,
    message: 'Courrier supprimé avec succès.',
    });
} catch (error) {
    res.status(404).json({ success: false, message: error.message });
}
},

// STATISTIQUES
async getStats(req, res) {
try {
    const stats = await courrierService.getStats();
    res.json({ success: true, data: stats });
} catch (error) {
    res.status(500).json({ success: false, message: error.message });
}
},
};

module.exports = courrierController;