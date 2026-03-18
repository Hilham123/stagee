const authorize = (allowedRoles = []) => {
return (req, res, next) => {
    //Vérifier que l'utilisateur est authentifié
    if (!req.user) {
    return res.status(401).json({
        success: false,
        message: 'Non authentifié. Veuillez vous connecter.',
    });
    }

    //Vérifier que le rôle est autorisé
    if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôle(s) requis : ${allowedRoles.join(', ')}. Votre rôle : ${req.user.role}`,
    });
    }

    next();
};
};

//Raccourcis pratiques par rôle
const isAdmin    = authorize(['ADMIN']);
const isManager  = authorize(['ADMIN', 'MANAGER']);
const isEmployee = authorize(['ADMIN', 'MANAGER', 'EMPLOYEE']);
const isViewer   = authorize(['ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER']);

module.exports = { authorize, isAdmin, isManager, isEmployee, isViewer };