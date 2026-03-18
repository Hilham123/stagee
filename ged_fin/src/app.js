require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const { connectDB } = require('./config/database');

// Import des modèles (initialise les associations)
require('./models');

// Import des routes
const authRoutes       = require('./routes/auth.routes');
const documentRoutes   = require('./routes/documents.routes');
const workflowRoutes   = require('./routes/workflow.routes');
const signatureRoutes  = require('./routes/signature.routes');
const dashboardRoutes  = require('./routes/dashboard.routes');
const courrierRoutes   = require('./routes/courrier.routes');
const userRoutes       = require('./routes/user.routes');
const roleRoutes       = require('./routes/role.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARES GLOBAUX
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ROUTES
app.get('/api/health', (req, res) => {
  res.json({
    status:    'OK',
    message:   'Serveur GED opérationnel',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth',       authRoutes);
app.use('/api/roles',      roleRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/documents',  documentRoutes);
app.use('/api/workflows',  workflowRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/courriers',  courrierRoutes);

// GESTION DES ERREURS GLOBALE
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
  });
});

// DÉMARRAGE DU SERVEUR
const start = async () => {
  await connectDB();

  // Initialiser les rôles par défaut
  const roleController = require('./controllers/role.controller');
  await roleController.initDefaultRoles();

  app.listen(PORT, () => {
    console.log('─────────────────────────────────────');
    console.log(` Serveur GED     : http://localhost:${PORT}`);
    console.log(` Alfresco        : ${process.env.ALFRESCO_BASE_URL}`);
    console.log(` Base de données : ${process.env.DB_NAME}`);
    console.log(` Environnement   : ${process.env.NODE_ENV}`);
    console.log('─────────────────────────────────────');
  });
};

start();

module.exports = app;