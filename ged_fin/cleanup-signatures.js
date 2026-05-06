/**
 * Script de nettoyage des signatures
 * À exécuter une fois si vous avez trop de signatures anciennes
 */

require('dotenv').config();
const { sequelize, Signature, Document } = require('./src/models');

async function cleanupSignatures() {
  try {
    console.log('🧹 Nettoyage des signatures commencé...\n');

    // 1. Lister toutes les signatures
    const allSignatures = await Signature.count();
    console.log(`📊 Total signatures actuellement: ${allSignatures}`);

    // 2. Lister les signatures par statut
    const validSigs = await Signature.count({ where: { status: 'VALIDE' } });
    const revokedSigs = await Signature.count({ where: { status: 'REVOQUEE' } });
    const invalidSigs = await Signature.count({ where: { status: 'INVALIDE' } });

    console.log(`   - Valides: ${validSigs}`);
    console.log(`   - Révoquées: ${revokedSigs}`);
    console.log(`   - Invalides: ${invalidSigs}\n`);

    // 3. Lister les signatures par document
    const sigsByDoc = await Signature.findAll({
      attributes: ['documentId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['documentId'],
      raw: true,
    });

    console.log('📄 Signatures par document:');
    for (const doc of sigsByDoc) {
      const document = await Document.findByPk(doc.documentId);
      console.log(`   - ${document?.title || 'N/A'} (${doc.documentId}): ${doc.count} signatures`);
    }

    // 4. Option de nettoyage (décommentez si vous voulez supprimer les révoquées)
    console.log('\n⚠️  NETTOYAGE DISPONIBLE (commentez/décommentez selon vos besoins):');
    
    // // Supprimer les signatures révoquées
    // const deleted = await Signature.destroy({ where: { status: 'REVOQUEE' } });
    // console.log(`🗑️  ${deleted} signatures révoquées supprimées`);

    console.log('\n✅ Analyse complète!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

cleanupSignatures();
