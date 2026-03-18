const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
try {
    //Vérifier la présence du token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
        success: false,
        message: 'Token manquant. Veuillez vous connecter.',
    });
    }

    //Extraire et vérifier le token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //Vérifier que l'utilisateur existe toujours en base
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
    return res.status(401).json({
        success: false,
        message: 'Utilisateur introuvable ou désactivé.',
});
    }

    //Attacher l'utilisateur à la requête
    req.user = user.toSafeJSON();
    next();
} catch (error) {
    return res.status(401).json({
    success: false,
message: 'Token expiré ou invalide. Veuillez vous reconnecter.',
    });
}
};

module.exports = { authenticate };