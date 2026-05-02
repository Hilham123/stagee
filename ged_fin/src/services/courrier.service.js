const { Courrier, User, Document: DocumentModel, Service, CourrierHistorique } = require('../models')
const { Op, QueryTypes } = require('sequelize');

//TRANSITIONS DE STATUTS AUTORISÉES
const TRANSITIONS_AUTORISEES = {
RECU:           ['DISPATCHE', 'ARCHIVE'],
DISPATCHE:      ['EN_TRAITEMENT', 'ARCHIVE'],
EN_TRAITEMENT:  ['EN_APPROBATION', 'DISPATCHE', 'ARCHIVE'],
EN_APPROBATION: ['APPROUVE', 'EN_TRAITEMENT'],
APPROUVE:      ['ENVOYE', 'EN_TRAITEMENT', 'ARCHIVE'],
ENVOYE:         ['ARCHIVE'],
ARCHIVE:        [],
}

const courrierService = {
async dispatchCourrier(id, data, userId) {
const { serviceDestinataireId, assigneA, instructions } = data
const courrier = await Courrier.findByPk(id)
if (!courrier) throw new Error('Courrier introuvable.')

// ← Accepte RECU et DISPATCHE (re-dispatch possible)
if (!['RECU', 'DISPATCHE'].includes(courrier.statut))
throw new Error('Seuls les courriers reçus ou dispatchés peuvent être re-dispatchés.')

await courrier.update({
statut:                'DISPATCHE',
etapeCircuit:          'DISPATCH',
serviceDestinataireId: serviceDestinataireId || courrier.serviceDestinataireId,
assigneA:              assigneA || null,
instructionsDispatch:  instructions || null,
})

await this.ajouterHistorique(
id, userId, 'DISPATCH',
`Courrier dispatché vers le service ${serviceDestinataireId}`
)
return courrier
},

// Soumettre pour approbation
async soumettreApprobation(id, userId) {
const courrier = await Courrier.findByPk(id)
if (!courrier) throw new Error('Courrier introuvable.')
if (courrier.statut !== 'EN_TRAITEMENT')
throw new Error('Le courrier doit être en traitement pour être soumis à approbation.')

await courrier.update({ statut: 'EN_APPROBATION', etapeCircuit: 'EN_APPROBATION' })
await this.ajouterHistorique(id, userId, 'SOUMISSION_APPROBATION', 'Soumis pour approbation')
return courrier
},

// Approuver
async approuverCourrier(id, userId) {
const courrier = await Courrier.findByPk(id)
if (!courrier) throw new Error('Courrier introuvable.')
if (courrier.statut !== 'EN_APPROBATION')
throw new Error('Le courrier doit être en approbation.')

// Retrouver le service administratif
const serviceAdmin = await Service.findOne({ 
where: { code: 'SERVICE_ADMINISTRATIF' } 
})

await courrier.update({
statut:                'APPROUVE',
etapeCircuit:          'APPROUVE',
// Retour automatique vers le service administratif pour expédition
serviceDestinataireId: serviceAdmin?.id || courrier.serviceDestinataireId,
assigneA:              null, 
})

await this.ajouterHistorique(
id, userId, 'APPROBATION',
`Courrier approuvé — retourné au service administratif pour expédition`
)
return courrier
},

// Créer une réponse liée
async creerReponse(courrierParentId, data, userId) {
const parent = await Courrier.findByPk(courrierParentId)
if (!parent) throw new Error('Courrier parent introuvable.')

const reponse = await this.createCourrierRecord({
...data,
nature:              parent.nature,
type:                'SORTANT',
createdBy:           userId,
statut:              'EN_TRAITEMENT',
etapeCircuit:        'EN_TRAITEMENT',
courrierParentId,
serviceExpediteurId: parent.serviceDestinataireId,
})

await this.ajouterHistorique(
reponse.id, userId, 'CREATION',
`Réponse au courrier ${parent.reference}`
)
return reponse
},

//GÉNÉRER UNE RÉFÉRENCE UNIQUE 
async generateReference(type, nature) {
const year = new Date().getFullYear();

const prefixes = {
EXTERNE_ENTRANT: 'CE', 
EXTERNE_SORTANT: 'CS',  
INTERNE_ENTRANT: 'NI', 
INTERNE_SORTANT: 'NS', 
};

const key    = `${nature}_${type}`;
const prefix = prefixes[key] || 'CO';
const pattern = `${prefix}-${year}-%`;

const [result] = await Courrier.sequelize.query(
`SELECT MAX(CAST(REGEXP_REPLACE(reference, '^.*-(\\d+)$', '\\1') AS INTEGER)) AS max_seq
FROM courriers
WHERE reference LIKE :pattern`,
{
replacements: { pattern },
type: QueryTypes.SELECT,
}
);

const nextNumber = (result?.max_seq || 0) + 1;
const numero = String(nextNumber).padStart(4, '0');
return `${prefix}-${year}-${numero}`;
},

async createCourrierRecord(data) {
const maxAttempts = 10
let attempt = 0

while (attempt < maxAttempts) {
attempt += 1
const reference = await this.generateReference(data.type, data.nature)

try {
return await Courrier.create({ ...data, reference })
} catch (error) {
const isDuplicateError =
error.name === 'SequelizeUniqueConstraintError' ||
error.name === 'SequelizeDatabaseError' ||
error.parent?.code === '23505' ||
error.original?.code === '23505'

const isReferenceDuplicate = isDuplicateError && (
error.errors?.some((e) => e.path === 'reference' || e.field === 'reference') ||
error.fields?.reference ||
(typeof error.parent?.constraint === 'string' && error.parent.constraint.includes('reference')) ||
(typeof error.original?.constraint === 'string' && error.original.constraint.includes('reference'))
)

if (isReferenceDuplicate && attempt < maxAttempts) {
continue
}
throw error
}
}

throw new Error('Impossible de générer une référence unique après plusieurs tentatives.')
},

//CRÉER UN COURRIER 
async createCourrier(data, userId) {
const nature = data.nature || 'EXTERNE';

// Statut initial logique selon le type
const statutInitial = data.type === 'ENTRANT' ? 'RECU' : 'EN_TRAITEMENT';

const courrier = await this.createCourrierRecord({
...data,
nature,
createdBy:             userId,
statut:                statutInitial,
dateReception:         data.dateReception ? new Date(data.dateReception) : null,
dateEnvoi:             data.dateEnvoi     ? new Date(data.dateEnvoi)     : null,
serviceExpediteurId:   data.serviceExpediteurId   || null,
serviceDestinataireId: data.serviceDestinataireId || null,
});
await this.ajouterHistorique(
courrier.id, userId, 'CREATION',
`Courrier ${nature} ${data.type} créé avec le statut ${statutInitial}`
);

return courrier;
},

//LISTER LES COURRIERS 
async listCourriers(filters = {}, pagination = {}, user) {
const { type, statut, priorite, nature, search } = filters;
const { page = 1, limit = 10 } = pagination;
const offset = (page - 1) * limit;

const where = {};
if (filters.etapeCircuit) where.etapeCircuit = filters.etapeCircuit;
if (filters.assigneA)     where.assigneA     = filters.assigneA;

// ✅ Filtrer par rôle et service - CORRECT
const roleFilters = [];

if (user.role !== 'ADMIN' && user.roleName !== 'ADMIN') {
  const isServiceAdmin = user.serviceCode === 'SERVICE_ADMINISTRATIF'
  const isDirecteur    = user.isDirecteur

  if (isServiceAdmin || isDirecteur) {
    // Service admin et Directeur : EXTERNE + leur service + archives
    roleFilters.push(
      { nature: 'EXTERNE' },  // Courriers externes
      { [Op.and]: [{ nature: 'INTERNE' }, { [Op.or]: [
        { serviceDestinataireId: user.serviceId },
        { serviceExpediteurId:   user.serviceId }
      ]}]},
      { statut: 'ARCHIVE' }  // Archives accessibles
    )
  } else if (user.serviceId) {
    // Manager normal et Employee : UNIQUEMENT leur service + créés par eux + archives
    roleFilters.push(
      { [Op.and]: [{ nature: 'INTERNE' }, { serviceDestinataireId: user.serviceId }]},
      { [Op.and]: [{ nature: 'INTERNE' }, { serviceExpediteurId: user.serviceId }]},
      { createdBy: user.id },
      { destinataireTous: true },
      { statut: 'ARCHIVE' }  // Archives accessibles
    )
  } else {
    // Pas de service : voir ses propres courriers + archives
    roleFilters.push(
      { createdBy: user.id },
      { destinataireTous: true },
      { statut: 'ARCHIVE' }
    )
  }
}

// ✅ Combiner le filtrage par rôle avec la recherche
if (search) {
  const searchFilters = [
    { objet:        { [Op.iLike]: `%${search}%` } },
    { expediteur:   { [Op.iLike]: `%${search}%` } },
    { destinataire: { [Op.iLike]: `%${search}%` } },
    { reference:    { [Op.iLike]: `%${search}%` } },
  ]
  
  if (roleFilters.length > 0) {
    where[Op.and] = [
      { [Op.or]: roleFilters },
      { [Op.or]: searchFilters }
    ]
  } else {
    where[Op.or] = searchFilters
  }
} else if (roleFilters.length > 0) {
  where[Op.or] = roleFilters
}

if (type)     where.type     = type;
if (statut)   where.statut   = statut;
if (priorite) where.priorite = priorite;
if (nature)   where.nature   = nature;

const { rows: courriers, count } = await Courrier.findAndCountAll({
where,
limit:  parseInt(limit),
offset,
order:  [['createdAt', 'DESC']],
include: [
{
model:      User,
as:         'creator',
attributes: ['id', 'firstName', 'lastName', 'email'],
},
{
model:      DocumentModel,
as:         'document',
attributes: ['id', 'title', 'fileName'],
required:   false,
},
{ model: User, 
as: 'assignee', 
attributes: ['id', 'firstName', 'lastName'], 
required: false 
},
{
model:      Service,
as:         'serviceDestinataire',
attributes: ['id', 'nom', 'code'],
required:   false,
},
{
model:      Service,
as:         'serviceExpediteur',
attributes: ['id', 'nom', 'code'],
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

//RÉCUPÉRER UN COURRIER
async getCourrier(id) {
const courrier = await Courrier.findByPk(id, {
include: [
{
model:      User,
as:         'creator',
attributes: ['id', 'firstName', 'lastName', 'email'],
},
{
model:      DocumentModel,
as:         'document',
attributes: ['id', 'title', 'fileName'],
required:   false,
},
{
model:      Service,
as:         'serviceDestinataire',
attributes: ['id', 'nom', 'code'],
required:   false,
},
{
model:      Service,
as:         'serviceExpediteur',
attributes: ['id', 'nom', 'code'],
required:   false,
},
{ model: User,    
as: 'assignee',     
attributes: ['id', 'firstName', 'lastName'], 
required: false },
{ model: Courrier, 
as: 'courrierParent',
attributes: ['id', 'reference', 'objet'],   
required: false },
{ model: Courrier, 
as: 'reponses',       
attributes: ['id', 'reference', 'statut', 'etapeCircuit'], 
required: false },
],
});

if (!courrier) throw new Error('Courrier introuvable.');
return courrier;
},
//METTRE À JOUR UN COURRIER 
async updateCourrier(id, data, userId) {
const courrier = await Courrier.findByPk(id);
if (!courrier) throw new Error('Courrier introuvable.');

await courrier.update(data);

await this.ajouterHistorique(id, userId, 'MODIFICATION', 'Courrier mis à jour');

return courrier;
},

//CHANGER LE STATUT
async changeStatut(id, nouveauStatut, userId) {
const courrier = await Courrier.findByPk(id);
if (!courrier) throw new Error('Courrier introuvable.');

const transitionsAutorisees = TRANSITIONS_AUTORISEES[courrier.statut];

if (!transitionsAutorisees.includes(nouveauStatut)) {
throw new Error(
`Transition invalide : ${courrier.statut} → ${nouveauStatut}. ` +
`Transitions autorisées : ${transitionsAutorisees.join(', ') || 'aucune (statut final)'}`
);
}

const ancienStatut = courrier.statut;
await courrier.update({ statut: nouveauStatut });

await this.ajouterHistorique(
id, userId, 'CHANGEMENT_STATUT',
`Statut changé : ${ancienStatut} → ${nouveauStatut}`
);

return courrier;
},

// ARCHIVER UN COURRIER
async archiveCourrier(id, userId) {
const courrier = await Courrier.findByPk(id);
if (!courrier) throw new Error('Courrier introuvable.');

const transitionsAutorisees = TRANSITIONS_AUTORISEES[courrier.statut];
if (!transitionsAutorisees.includes('ARCHIVE')) {
throw new Error(
`Ce courrier ne peut pas être archivé depuis le statut ${courrier.statut}. ` +
`Statuts archivables : ${Object.keys(TRANSITIONS_AUTORISEES).filter(s => TRANSITIONS_AUTORISEES[s].includes('ARCHIVE')).join(', ')}`
);
}

await courrier.update({ 
statut: 'ARCHIVE',
archivedAt: new Date(),
});

await this.ajouterHistorique(
id, userId, 'ARCHIVAGE',
`Courrier archivé`
);

return courrier;
},

//SUPPRIMER UN COURRIER
async deleteCourrier(id) {
const courrier = await Courrier.findByPk(id);
if (!courrier) throw new Error('Courrier introuvable.');

// Supprimer d'abord l'historique lié pour éviter les contraintes de clé étrangère.
await CourrierHistorique.destroy({ where: { courrierId: id } });

// Supprimer récursivement les réponses associées avant le courrier parent.
const reponses = await Courrier.findAll({ where: { courrierParentId: id } });
for (const reponse of reponses) {
await this.deleteCourrier(reponse.id);
}

await courrier.destroy();
return { success: true };
},
// HISTORIQUE 
async ajouterHistorique(courrierId, userId, action, details) {
await CourrierHistorique.create({ courrierId, userId, action, details });
},
async signerCourrier(id, userId, signatureOptions = {}) {
const courrier = await Courrier.findByPk(id)
if (!courrier) throw new Error('Courrier introuvable.')
if (courrier.isSigned) throw new Error('Ce courrier est déjà signé.')
if (!['EN_APPROBATION', 'APPROUVE', 'EN_TRAITEMENT'].includes(courrier.statut))
throw new Error('Le courrier doit être en traitement ou en approbation pour être signé.')

const signer    = await User.findByPk(userId)
const timestamp = new Date().toISOString()

await courrier.update({
isSigned:      true,
signedAt:      timestamp,
signedBy:      userId,
signatureData: {
signerName:    `${signer.firstName} ${signer.lastName}`,
signerRole:    signer.roleName,
signedAt:      timestamp,
signatureType: signatureOptions.signatureType || 'text',
signatureText: signatureOptions.signatureText || `${signer.firstName} ${signer.lastName}`,
},
})

await this.ajouterHistorique(id, userId, 'SIGNATURE', `Courrier signé par ${signer.firstName} ${signer.lastName}`)
return courrier
},

async getHistorique(courrierId) {
return CourrierHistorique.findAll({
where: { courrierId },
order: [['createdAt', 'ASC']],
include: [{
model:      User,
as:         'user',
attributes: ['id', 'firstName', 'lastName'],
}],
});
},

//STATISTIQUES
async getStats(user) {
const whereBase = user.role === 'ADMIN' ? {} : {
[Op.or]: [
{ serviceDestinataireId: user.serviceId },
{ serviceExpediteurId:   user.serviceId },
],
};

const [totalEntrants, totalSortants, enTraitement, urgents] = await Promise.all([
Courrier.count({ where: { ...whereBase, type: 'ENTRANT' } }),
Courrier.count({ where: { ...whereBase, type: 'SORTANT' } }),
Courrier.count({ where: { ...whereBase, statut: 'EN_TRAITEMENT' } }),
Courrier.count({ where: { ...whereBase, priorite: 'URGENTE' } }),
]);

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
