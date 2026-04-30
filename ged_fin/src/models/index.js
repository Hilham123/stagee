const User               = require('./user.model');
const Document           = require('./document.model');
const Workflow           = require('./workflow.model');
const Signature          = require('./signature.model');
const Courrier           = require('./courrier.model');
const Role               = require('./role.model');
const Service            = require('./service.model');
const CourrierHistorique = require('./courrier-historique.model');

//  ASSOCIATIONS RÔLES 
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'userRole' });

//  ASSOCIATIONS SERVICES 
Service.hasMany(User, { foreignKey: 'service_id', as: 'membres' });
User.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

Service.hasMany(Courrier, { foreignKey: 'service_expediteur_id',   as: 'courriersEnvoyes' });
Service.hasMany(Courrier, { foreignKey: 'service_destinataire_id', as: 'courriersRecus' });
Courrier.belongsTo(Service, { foreignKey: 'service_expediteur_id',   as: 'serviceExpediteur' });
Courrier.belongsTo(Service, { foreignKey: 'service_destinataire_id', as: 'serviceDestinataire' });

// ASSOCIATIONS DOCUMENTS
User.hasMany(Document, { foreignKey: 'created_by', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Document.hasMany(Workflow, { foreignKey: 'document_id', as: 'workflows' });
Workflow.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

Workflow.belongsTo(User, { foreignKey: 'submitted_by', as: 'submitter' });
Workflow.belongsTo(User, { foreignKey: 'assigned_to',  as: 'assignee' });
Workflow.belongsTo(User, { foreignKey: 'processed_by', as: 'processor' });

Document.hasMany(Signature, { foreignKey: 'document_id', as: 'signatures' });
Signature.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

User.hasMany(Signature, { foreignKey: 'signed_by', as: 'signatures' });
Signature.belongsTo(User, { foreignKey: 'signed_by', as: 'signer' });

//  ASSOCIATIONS COURRIERS
User.hasMany(Courrier, { foreignKey: 'created_by', as: 'courriers' });
Courrier.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Courrier.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });
Document.hasMany(Courrier, { foreignKey: 'document_id', as: 'courriers' });

// Auto-référence pour les réponses liées
Courrier.belongsTo(Courrier, { foreignKey: 'courrier_parent_id', as: 'courrierParent' });
Courrier.hasMany(Courrier,   { foreignKey: 'courrier_parent_id', as: 'reponses' });

//  Utilisateur assigné à une étape du circuit
Courrier.belongsTo(User, { foreignKey: 'assigne_a', as: 'assignee' });
User.hasMany(Courrier,   { foreignKey: 'assigne_a', as: 'courriersAssignes' });

// ASSOCIATIONS HISTORIQUE COURRIERS 
Courrier.hasMany(CourrierHistorique, { foreignKey: 'courrier_id', as: 'historique', onDelete: 'CASCADE', hooks: true });
CourrierHistorique.belongsTo(Courrier, { foreignKey: 'courrier_id', as: 'courrier' });

User.hasMany(CourrierHistorique, { foreignKey: 'user_id', as: 'actionsEffectuees' });
CourrierHistorique.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Courrier.belongsTo(User, { foreignKey: 'signed_by', as: 'signataire' });
User.hasMany(Courrier, { foreignKey: 'signed_by', as: 'courriersSignes' });

module.exports = {
User,
Document,
Workflow,
Signature,
Courrier,
Role,
Service,
CourrierHistorique,
};
