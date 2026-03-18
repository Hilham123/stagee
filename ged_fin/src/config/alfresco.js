require('dotenv').config();

const alfrescoConfig = {
  baseURL:        process.env.ALFRESCO_BASE_URL || 'http://localhost:8080',
  user:           process.env.ALFRESCO_USER     || 'admin',
  password:       process.env.ALFRESCO_PASSWORD || 'admin',
  siteId:         process.env.ALFRESCO_SITE_ID  || 'it-ged',

  // ID du dossier documentLibrary du site GED
  docLibraryId:   process.env.ALFRESCO_DOC_LIBRARY_ID || '210d68e1-b83e-481d-8d68-e1b83ed81dc2',

  // Endpoints Alfresco REST API
  endpoints: {
    auth:       '/alfresco/api/-default-/public/authentication/versions/1/tickets',
    nodes:      '/alfresco/api/-default-/public/alfresco/versions/1/nodes',
    sites:      '/alfresco/api/-default-/public/alfresco/versions/1/sites',
    people:     '/alfresco/api/-default-/public/alfresco/versions/1/people',
    search:     '/alfresco/api/-default-/public/search/versions/1/search',
    versions:   (nodeId) => `/alfresco/api/-default-/public/alfresco/versions/1/nodes/${nodeId}/versions`,
    content:    (nodeId) => `/alfresco/api/-default-/public/alfresco/versions/1/nodes/${nodeId}/content`,
    children:   (nodeId) => `/alfresco/api/-default-/public/alfresco/versions/1/nodes/${nodeId}/children`,
    renditions: (nodeId) => `/alfresco/api/-default-/public/alfresco/versions/1/nodes/${nodeId}/renditions`,
  },
};

module.exports = alfrescoConfig;