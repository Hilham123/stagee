const courrierService = require('../services/courrier.service');

const courrierController = {

//LISTER LES COURRIERS
async listCourriers(req, res) {
try {
const { type, statut, priorite, nature, search, page, limit } = req.query;
const result = await courrierService.listCourriers(
{ type, statut, priorite, nature, search },
{ page, limit },
req.user 
);
res.json({ success: true, ...result });
} catch (error) {
res.status(500).json({ success: false, message: error.message });
}
},

//RÉCUPÉRER UN COURRIER 
async getCourrier(req, res) {
try {
const courrier = await courrierService.getCourrier(req.params.id);
res.json({ success: true, data: courrier });
} catch (error) {
res.status(404).json({ success: false, message: error.message });
}
},
async signerCourrier(req, res) {
try {
const courrier = await courrierService.signerCourrier(
    req.params.id, req.user.id, req.body
)
res.json({ success: true, data: courrier, message: 'Courrier signé avec succès' })
} catch (e) { res.status(400).json({ success: false, message: e.message }) }
},
//CRÉER UN COURRIER
async createCourrier(req, res) {
  try {
    const {
      type, nature, objet, expediteur, destinataire,
      dateReception, dateEnvoi, priorite, notes,
      documentId, serviceExpediteurId, serviceDestinataireId,
    } = req.body

    if (!type || !objet || !expediteur || !destinataire) {
      return res.status(400).json({
        success: false,
        message: 'Type, objet, expéditeur et destinataire sont obligatoires.',
      })
    }

    if (nature && !['INTERNE', 'EXTERNE'].includes(nature)) {
      return res.status(400).json({
        success: false,
        message: 'Nature invalide. Valeurs acceptées : INTERNE, EXTERNE.',
      })
    }

    let finalDocumentId = documentId || null

    // ✅ Si un fichier est joint, l'uploader dans Alfresco et créer un document
    if (req.file) {
      try {
        const alfrescoService = require('../services/alfresco.service')
        const { Document }    = require('../models')

        // Upload dans Alfresco
        const alfrescoNode = await alfrescoService.uploadDocument(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        )

        // Créer l'entrée dans la table documents
        const doc = await Document.create({
          title:          req.file.originalname,
          fileName:       req.file.originalname,
          mimeType:       req.file.mimetype,
          category:       'Courrier',
          status:         'APPROUVE',
          alfrescoNodeId: alfrescoNode.entry?.id || alfrescoNode.id,
          createdBy:      req.user.id,
        })

        finalDocumentId = doc.id
      } catch (fileErr) {
        console.warn('⚠️ Impossible d\'uploader le fichier joint:', fileErr.message)
        // On continue sans le fichier plutôt que de bloquer la création
      }
    }

    const courrier = await courrierService.createCourrier(
      {
        type,
        nature:                nature || 'EXTERNE',
        objet,
        expediteur,
        destinataire,
        dateReception:         dateReception || null,
        dateEnvoi:             dateEnvoi     || null,
        priorite,
        notes,
        documentId:            finalDocumentId,
        serviceExpediteurId:   serviceExpediteurId   || null,
        serviceDestinataireId: serviceDestinataireId || null,
      },
      req.user.id
    )

    res.status(201).json({
      success: true,
      message: 'Courrier créé avec succès.',
      data: courrier,
    })
  } catch (error) {
    console.error('COURRIER ERROR:', error.message, error.stack)
    res.status(500).json({ success: false, message: error.message })
  }
},

//METTRE À JOUR UN COURRIER 
async updateCourrier(req, res) {
try {
const courrier = await courrierService.updateCourrier(
req.params.id,
req.body,
req.user.id
);
res.json({
success: true,
message: 'Courrier mis à jour avec succès.',
data: courrier,
});
} catch (error) {
const status = error.message === 'Courrier introuvable.' ? 404 : 400;
res.status(status).json({ success: false, message: error.message });
}
},

//CHANGER LE STATUT 
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
statut,
req.user.id 
);

res.json({
success: true,
message: 'Statut mis à jour avec succès.',
data: courrier,
});
} catch (error) {
const status = error.message.includes('introuvable')  ? 404
        : error.message.includes('Transition')   ? 400
        : 500;
res.status(status).json({ success: false, message: error.message });
}
},
async dispatch(req, res) {
try {
const courrier = await courrierService.dispatchCourrier(
req.params.id, req.body, req.user.id
)
res.json({ success: true, data: courrier, message: 'Courrier dispatché avec succès' })
} catch (e) { res.status(400).json({ success: false, message: e.message }) }
},

async soumettreApprobation(req, res) {
try {
const courrier = await courrierService.soumettreApprobation(req.params.id, req.user.id)
res.json({ success: true, data: courrier, message: 'Soumis pour approbation' })
} catch (e) { res.status(400).json({ success: false, message: e.message }) }
},

async approuver(req, res) {
try {
const courrier = await courrierService.approuverCourrier(req.params.id, req.user.id)
res.json({ success: true, data: courrier, message: 'Courrier approuvé' })
} catch (e) { res.status(400).json({ success: false, message: e.message }) }
},

async creerReponse(req, res) {
try {
const reponse = await courrierService.creerReponse(
req.params.id, req.body, req.user.id
)
res.json({ success: true, data: reponse, message: 'Réponse créée avec succès' })
} catch (e) { res.status(400).json({ success: false, message: e.message }) }
},

async archiveCourrier(req, res) {
try {
const courrier = await courrierService.archiveCourrier(
req.params.id, req.user.id
)
res.json({ success: true, data: courrier, message: 'Courrier archivé avec succès' })
} catch (e) { res.status(400).json({ success: false, message: e.message }) }
},

async getHistorique(req, res) {
try {
const historique = await courrierService.getHistorique(req.params.id)
res.json({ success: true, data: historique })
} catch (e) { res.status(500).json({ success: false, message: e.message }) }
},

//SUPPRIMER UN COURRIER
async deleteCourrier(req, res) {
try {
await courrierService.deleteCourrier(req.params.id);
res.json({ success: true, message: 'Courrier supprimé avec succès.' });
} catch (error) {
res.status(404).json({ success: false, message: error.message });
}
},

//STATISTIQUES 
async getStats(req, res) {
try {
const stats = await courrierService.getStats(req.user); 
res.json({ success: true, data: stats });
} catch (error) {
res.status(500).json({ success: false, message: error.message });
}
},

// ✅ RÉCUPÉRER LES ARCHIVES DES COURRIERS (UNIQUEMENT)
async getCourrierArchives(req, res) {
try {
const { type, priorite, nature, search, page, limit } = req.query;
const result = await courrierService.listCourriersArchives(
{ type, priorite, nature, search },
{ page, limit },
req.user 
);
res.json({ success: true, ...result });
} catch (error) {
res.status(500).json({ success: false, message: error.message });
}
},
};

module.exports = courrierController;
