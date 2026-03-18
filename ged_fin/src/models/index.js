const User      = require('./user.model');
const Document  = require('./document.model');
const Workflow  = require('./workflow.model');
const Signature = require('./signature.model');
const Courrier  = require('./courrier.model');
const Role      = require('./role.model');

// ASSOCIATIONS ROLES
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'userRole' });

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

// ASSOCIATIONS COURRIERS
User.hasMany(Courrier, { foreignKey: 'created_by', as: 'courriers' });
Courrier.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Courrier.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });
Document.hasMany(Courrier,  { foreignKey: 'document_id', as: 'courriers' });

module.exports = { User, Document, Workflow, Signature, Courrier, Role };