/**
 * Script pour réinitialiser les rôles avec les bonnes permissions
 * Exécuter avec: node fix-roles.js
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const Role = require('./src/models/role.model');

const DEFAULT_ROLES = [
  {
    name: 'ADMIN',
    label: 'Administrateur',
    color: '#dc2626',
    isSystem: true,
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: {
      canUpload: true, canDownload: true, canSubmit: true,
      canApprove: true, canSign: true, canArchive: true,
      canManageUsers: true, canManageRoles: true, canViewAll: true,
      'courrier.stats': true,
      'courrier.interne.access': true,
      'courrier.create': true,
      'courrier.update': true,
      'courrier.statut.change': true,
      'courrier.externe.access': true,
      'courrier.delete': true,
      'courrier.archive': true,
    },
  },
  {
    name: 'MANAGER',
    label: 'Manager',
    color: '#d97706',
    isSystem: true,
    description: 'Validation et approbation des documents',
    permissions: {
      canUpload: true, canDownload: true, canSubmit: true,
      canApprove: true, canSign: true, canArchive: true,
      canManageUsers: false, canManageRoles: false, canViewAll: true,
      'courrier.stats': true,
      'courrier.interne.access': true,
      'courrier.create': true,
      'courrier.update': true,
      'courrier.statut.change': true,
      'courrier.externe.access': false,
      'courrier.delete': false,
      'courrier.archive': true,
    },
  },
  {
    name: 'EMPLOYEE',
    label: 'Employé',
    color: '#2563eb',
    isSystem: true,
    description: 'Upload et soumission de documents',
    permissions: {
      canUpload: true, canDownload: true, canSubmit: true,
      canApprove: false, canSign: false, canArchive: false,
      canManageUsers: false, canManageRoles: false, canViewAll: false,
      'courrier.stats': false,
      'courrier.interne.access': true,
      'courrier.create': true,
      'courrier.update': false,
      'courrier.statut.change': false,
      'courrier.externe.access': false,
      'courrier.delete': false,
      'courrier.archive': false,
    },
  },
];

async function fixRoles() {
  try {
    console.log('🔄 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connecté');

    console.log('🔄 Mise à jour des rôles...');
    for (const roleData of DEFAULT_ROLES) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: roleData,
      });

      if (!created) {
        await role.update({ permissions: roleData.permissions });
        console.log(`✅ ${roleData.name} mis à jour`);
      } else {
        console.log(`✅ ${roleData.name} créé`);
      }
    }

    console.log('\n✅ Rôles et permissions restaurés avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

fixRoles();
