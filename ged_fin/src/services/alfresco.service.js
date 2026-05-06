const axios = require('axios');
const FormData = require('form-data');
const alfrescoConfig = require('../config/alfresco');

class AlfrescoService {
  constructor() {
    this.baseURL = alfrescoConfig.baseURL;
    this.endpoints = alfrescoConfig.endpoints;
    this.ticket = null;
    this.ticketExpiry = null;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use(async (config) => {
      const ticket = await this.getTicket();
      config.headers['Authorization'] = `Basic ${ticket}`;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.ticket = null;
          const ticket = await this.authenticate();
          error.config.headers['Authorization'] = `Basic ${ticket}`;
          return this.client.request(error.config);
        }
        throw this._formatError(error);
      }
    );
  }

  async authenticate() {
    try {
      const response = await axios.post(
        `${this.baseURL}${this.endpoints.auth}`,
        { userId: alfrescoConfig.user, password: alfrescoConfig.password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const ticketValue = response.data?.entry?.id;
      if (!ticketValue) throw new Error('Ticket Alfresco introuvable');

      this.ticket = Buffer.from(
        `${alfrescoConfig.user}:${alfrescoConfig.password}`
      ).toString('base64');
      this.ticketExpiry = Date.now() + (60 * 60 * 1000);
      console.log('Authentification Alfresco réussie');
      return this.ticket;
    } catch (error) {
      console.error('Erreur auth Alfresco:', error.message);
      throw new Error('Impossible de se connecter à Alfresco');
    }
  }

  async getTicket() {
    const isExpired = !this.ticketExpiry || Date.now() >= this.ticketExpiry;
    if (!this.ticket || isExpired) {
      await this.authenticate();
    }
    return this.ticket;
  }

  async getNode(nodeId) {
    const response = await this.client.get(`${this.endpoints.nodes}/${nodeId}`);
    return response.data.entry;
  }

  async listChildren(nodeId = '-root-', options = {}) {
    const { skipCount = 0, maxItems = 25, orderBy = 'name ASC', where } = options;
    const params = { skipCount, maxItems, orderBy };
    if (where) params.where = where;

    const response = await this.client.get(
      this.endpoints.children(nodeId),
      { params }
    );
    return {
      entries: response.data.list.entries.map(e => e.entry),
      pagination: response.data.list.pagination,
    };
  }

  async createFolder(parentNodeId, folderName) {
    const response = await this.client.post(
      this.endpoints.children(parentNodeId),
      { name: folderName, nodeType: 'cm:folder' }
    );
    return response.data.entry;
  }

  async uploadDocument(parentNodeId, fileBuffer, fileName, metadata = {}) {
    const formData = new FormData();
    formData.append('filedata', fileBuffer, {
      filename: fileName,
      contentType: metadata.mimeType || 'application/octet-stream',
    });
    formData.append('name', fileName);
    formData.append('nodeType', 'cm:content');
    if (metadata.title)       formData.append('cm:title', metadata.title);
    if (metadata.description) formData.append('cm:description', metadata.description);

    const response = await this.client.post(
      this.endpoints.children(parentNodeId),
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );
    return response.data.entry;
  }

  async downloadDocument(nodeId, version = null) {
    // ✅ Si une version est demandée, la récupérer
    let endpoint = this.endpoints.content(nodeId);
    
    const response = await this.client.get(
      endpoint,
      { 
        responseType: 'arraybuffer',
        // ✅ Forcer le bypass du cache côté client Axios
        params: version ? { version } : {},
        headers: {
          // ✅ Ajouter des headers pour forcer la récupération depuis Alfresco
          'Cache-Control': 'no-cache, must-revalidate',
        }
      }
    );
    return {
      data: response.data,
      contentType: response.headers['content-type'],
      contentDisposition: response.headers['content-disposition'],
    };
  }

  async updateNode(nodeId, updates) {
    const response = await this.client.put(
      `${this.endpoints.nodes}/${nodeId}`,
      { properties: updates }
    );
    return response.data.entry;
  }

  async updateDocumentContent(nodeId, fileBuffer, mimeType, majorVersion = false) {
    const ticket = await this.getTicket();
    const response = await axios.put(
      `${this.baseURL}${this.endpoints.content(nodeId)}`,
      fileBuffer,
      {
        headers: {
          'Content-Type': mimeType,
          'Authorization': `Basic ${ticket}`,
        },
        params: {
          majorVersion,
          comment: majorVersion ? 'Nouvelle version majeure' : 'Mise à jour',
        },
      }
    );
    return response.data.entry;
  }

  async deleteNode(nodeId, permanent = false) {
    await this.client.delete(
      `${this.endpoints.nodes}/${nodeId}`,
      { params: { permanent } }
    );
    return { success: true, nodeId };
  }

  async listVersions(nodeId) {
    const response = await this.client.get(this.endpoints.versions(nodeId));
    return response.data.list.entries.map(e => e.entry);
  }

  async downloadVersion(nodeId, versionId) {
    const response = await this.client.get(
      `${this.endpoints.versions(nodeId)}/${versionId}/content`,
      { responseType: 'arraybuffer' }
    );
    return {
      data: response.data,
      contentType: response.headers['content-type'],
    };
  }

  async searchDocuments(keyword, options = {}) {
    const { maxItems = 25, skipCount = 0, siteId } = options;
    let query = `cm:name:*${keyword}* OR cm:title:*${keyword}* OR TEXT:*${keyword}*`;
    if (siteId) query += ` AND SITE:"${siteId}"`;

    const response = await this.client.post(this.endpoints.search, {
      query: { query, language: 'afts' },
      paging: { maxItems, skipCount },
      include: ['properties', 'path'],
    });

    return {
      entries: response.data.list.entries.map(e => e.entry),
      pagination: response.data.list.pagination,
    };
  }

  async getPermissions(nodeId) {
    const response = await this.client.get(
      `${this.endpoints.nodes}/${nodeId}`,
      { params: { include: 'permissions' } }
    );
    return response.data.entry.permissions;
  }

  async setPermissions(nodeId, permissions) {
    const response = await this.client.put(
      `${this.endpoints.nodes}/${nodeId}`,
      {
        permissions: {
          isInheritanceEnabled: true,
          locallySet: permissions,
        },
      }
    );
    return response.data.entry;
  }

  async getSite(siteId = alfrescoConfig.siteId) {
    const response = await this.client.get(`${this.endpoints.sites}/${siteId}`);
    return response.data.entry;
  }

  async getSiteDocumentLibrary(siteId = alfrescoConfig.siteId) {
    const response = await this.client.get(
      `${this.endpoints.sites}/${siteId}/containers/documentLibrary`
    );
    return response.data.entry;
  }

  _formatError(error) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.briefSummary || error.message;
    const err = new Error(`Alfresco [${status}]: ${message}`);
    err.status = status;
    err.alfrescoError = error.response?.data?.error;
    return err;
  }
}

module.exports = new AlfrescoService();