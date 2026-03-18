const { Courrier, User, Document } = require('../models');
const { Op } = require('sequelize');

const courrierService = {

// GÉNÉRER UNE RÉFÉRENCE UNIQUE
async generateReference(type) {
const year    = new Date().getFullYear();
const prefix  = type === 'ENTRANT' ? 'CE' : 'CS';
const count   = await Courrier.count({
    where: {
    type,
    createdAt: {
        [Op.gte]: new Date(`${year}-01-01`),
    },
    },
});
const numero  = String(count + 1).padStart(4, '0');
return `${prefix}-${year}-${numero}`;
},

// CRÉER UN COURRIER
async createCourrier(data, userId) {
const reference = await this.generateReference(data.type);

const courrier = await Courrier.create({
...data,
reference,
createdBy: userId,
statut:        data.type === 'ENTRANT' ? 'RECU' : 'ENVOYE',
dateReception: data.dateReception ? new Date(data.dateReception) : null,
dateEnvoi:     data.dateEnvoi     ? new Date(data.dateEnvoi)     : null,
});

return courrier;
},

// LISTER LES COURRIERS
async listCourriers(filters = {}, pagination = {}) {
const { type, statut, priorite, search } = filters;
const { page = 1, limit = 10 } = pagination;
const offset = (page - 1) * limit;

const where = {};
if (type)    where.type    = type;
if (statut)  where.statut  = statut;
if (priorite) where.priorite = priorite;
if (search) {
    where[Op.or] = [
    { objet:        { [Op.iLike]: `%${search}%` } },
    { expediteur:   { [Op.iLike]: `%${search}%` } },
    { destinataire: { [Op.iLike]: `%${search}%` } },
    { reference:    { [Op.iLike]: `%${search}%` } },
    ];
}

const { rows: courriers, count } = await Courrier.findAndCountAll({
    where,
    limit:   parseInt(limit),
    offset,
    order:   [['createdAt', 'DESC']],
    include: [
    {
        model:      User,
        as:         'creator',
        attributes: ['id', 'firstName', 'lastName', 'email'],
    },
    {
        model:      Document,
        as:         'document',
        attributes: ['id', 'title', 'fileName'],
        required:   false,
    },
    ],
});

return {
    courriers,
    pagination: {
    total: count,
    page:  parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(count / limit),
    },
};
},

// RÉCUPÉRER UN COURRIER
async getCourrier(id) {
const courrier = await Courrier.findByPk(id, {
    include: [
    {
        model:      User,
        as:         'creator',
        attributes: ['id', 'firstName', 'lastName', 'email'],
    },
    {
        model:      Document,
        as:         'document',
        attributes: ['id', 'title', 'fileName'],
        required:   false,
    },
    ],
});

if (!courrier) throw new Error('Courrier introuvable.');
return courrier;
},

// METTRE À JOUR UN COURRIER
async updateCourrier(id, data) {
const courrier = await Courrier.findByPk(id);
if (!courrier) throw new Error('Courrier introuvable.');

await courrier.update(data);
return courrier;
},

// CHANGER LE STATUT
async changeStatut(id, statut) {
const courrier = await Courrier.findByPk(id);
if (!courrier) throw new Error('Courrier introuvable.');

await courrier.update({ statut });
return courrier;
},
// SUPPRIMER UN COURRIER
async deleteCourrier(id) {
const courrier = await Courrier.findByPk(id);
if (!courrier) throw new Error('Courrier introuvable.');

await courrier.destroy();
return { success: true };
},
// STATISTIQUES
async getStats() {
const totalEntrants  = await Courrier.count({ where: { type: 'ENTRANT' } });
const totalSortants  = await Courrier.count({ where: { type: 'SORTANT' } });
const enTraitement   = await Courrier.count({ where: { statut: 'EN_TRAITEMENT' } });
const urgents        = await Courrier.count({ where: { priorite: 'URGENTE' } });

return {
    totalEntrants,
    totalSortants,
    enTraitement,
    urgents,
    total: totalEntrants + totalSortants,
};
},
};

module.exports = courrierService;