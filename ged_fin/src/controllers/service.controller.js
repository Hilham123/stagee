const { Service, User } = require('../models');

const serviceController = {

// GET tous les services
async getAll(req, res) {
try {
    const services = await Service.findAll({
    where: { isActive: true },
    order: [['nom', 'ASC']],
    include: [{
        model:      User,
        as:         'membres',
        attributes: ['id', 'firstName', 'lastName', 'email'],
    }],
    });
    res.json({ success: true, data: services });
} catch (error) {
    res.status(500).json({ success: false, message: error.message });
}
},

// GET un service
async getOne(req, res) {
try {
    const service = await Service.findByPk(req.params.id, {
    include: [{
        model:      User,
        as:         'membres',
        attributes: ['id', 'firstName', 'lastName', 'email'],
    }],
    });
    if (!service) return res.status(404).json({ success: false, message: 'Service introuvable' });
    res.json({ success: true, data: service });
} catch (error) {
    res.status(500).json({ success: false, message: error.message });
}
},

// POST créer un service
async create(req, res) {
try {
    const { nom, code, description } = req.body;
    if (!nom || !code)
    return res.status(400).json({ success: false, message: 'Nom et code obligatoires' });

    const exists = await Service.findOne({ where: { code: code.toUpperCase() } });
    if (exists)
    return res.status(409).json({ success: false, message: 'Ce code service existe déjà' });

    const service = await Service.create({
    nom, description,
    code: code.toUpperCase(),
    });
    res.status(201).json({ success: true, data: service, message: 'Service créé avec succès' });
} catch (error) {
    res.status(500).json({ success: false, message: error.message });
}
},

// PUT modifier un service
async update(req, res) {
try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service introuvable' });
    const { nom, description, isActive } = req.body;
    await service.update({ nom, description, isActive });
    res.json({ success: true, data: service, message: 'Service modifié avec succès' });
} catch (error) {
    res.status(500).json({ success: false, message: error.message });
}
},

// GET membres d'un service
async getMembres(req, res) {
try {
    const service = await Service.findByPk(req.params.id, {
    include: [{
        model:      User,
        as:         'membres',
        attributes: ['id', 'firstName', 'lastName', 'email', 'roleName'],
    }],
    });
    if (!service) return res.status(404).json({ success: false, message: 'Service introuvable' });
    res.json({ success: true, data: service.membres });
} catch (error) {
    res.status(500).json({ success: false, message: error.message });
}
},
};

module.exports = serviceController;