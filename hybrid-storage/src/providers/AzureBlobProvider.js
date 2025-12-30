/**
 * AzureBlobProvider - Azure Blob Storage provider
 * 
 * Supports THREE connection methods:
 * 1. Connection String (recommended) - easiest, single env variable
 * 2. Blob Endpoint + SAS Token - good for limited access
 * 3. Account Name + Key - more explicit
 */

const { 
  BlobServiceClient, 
  StorageSharedKeyCredential, 
  generateBlobSASQueryParameters, 
  BlobSASPermissions 
} = require('@azure/storage-blob');

class AzureBlobProvider {
  constructor(config) {
    this.name = 'azure';
    this.containerName = config.containerName || 'bugtracker';
    this.baseFolder = config.baseFolder || '';

    // =====================================================
    // Method 1: Connection String (RECOMMENDED - easiest)
    // =====================================================
    // Example: "DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net"
    if (config.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
      
      // Extract account info from connection string for SAS generation
      const nameMatch = config.connectionString.match(/AccountName=([^;]+)/);
      const keyMatch = config.connectionString.match(/AccountKey=([^;]+)/);
      
      if (nameMatch && keyMatch) {
        this.accountName = nameMatch[1];
        this.accountKey = keyMatch[1];
        this.sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
      }
      
      console.log('[AzureBlob] Connected via connection string');
    }
    // =====================================================
    // Method 2: Blob Endpoint + SAS Token
    // =====================================================
    // Example endpoint: "https://myaccount.blob.core.windows.net"
    // Example SAS: "sv=2021-06-08&ss=b&srt=sco&sp=rwdlacitfx&se=2025-12-31..."
    else if (config.blobEndpoint && config.sasToken) {
      // Remove leading ? from SAS token if present
      const sasToken = config.sasToken.startsWith('?') ? config.sasToken.slice(1) : config.sasToken;
      const url = `${config.blobEndpoint}?${sasToken}`;
      
      this.blobServiceClient = new BlobServiceClient(url);
      this.useSasToken = true;
      this.sasToken = sasToken;
      this.blobEndpoint = config.blobEndpoint;
      
      console.log('[AzureBlob] Connected via endpoint + SAS token');
    }
    // =====================================================
    // Method 3: Account Name + Account Key
    // =====================================================
    else if (config.accountName && config.accountKey) {
      this.accountName = config.accountName;
      this.accountKey = config.accountKey;
      this.sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountName,
        this.accountKey
      );
      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        this.sharedKeyCredential
      );
      
      console.log('[AzureBlob] Connected via account name + key');
    }
    else {
      throw new Error(
        'Azure Blob Storage requires one of:\n' +
        '  1. connectionString\n' +
        '  2. blobEndpoint + sasToken\n' +
        '  3. accountName + accountKey'
      );
    }

    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  _getFullPath(storagePath) {
    if (this.baseFolder) {
      return `${this.baseFolder}/${storagePath}`.replace(/\/+/g, '/');
    }
    return storagePath;
  }

  async upload(options) {
    const { file, storagePath, mimeType, metadata = {} } = options;
    const fullPath = this._getFullPath(storagePath);

    const blockBlobClient = this.containerClient.getBlockBlobClient(fullPath);

    await blockBlobClient.upload(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: mimeType
      },
      metadata: this._sanitizeMetadata(metadata)
    });

    return { 
      url: blockBlobClient.url.split('?')[0], // Remove SAS from stored URL
      storagePath: fullPath, 
      metadata 
    };
  }

  async download(storagePath) {
    const fullPath = this._getFullPath(storagePath);
    const blockBlobClient = this.containerClient.getBlockBlobClient(fullPath);

    const downloadResponse = await blockBlobClient.download(0);
    
    const chunks = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(chunk);
    }
    const file = Buffer.concat(chunks);

    return {
      file,
      mimeType: downloadResponse.contentType,
      size: downloadResponse.contentLength,
      metadata: downloadResponse.metadata
    };
  }

  async getSignedUrl(storagePath, expiresIn = 3600) {
    const fullPath = this._getFullPath(storagePath);
    const blockBlobClient = this.containerClient.getBlockBlobClient(fullPath);
    const baseUrl = blockBlobClient.url.split('?')[0]; // URL without any existing SAS

    // If using SAS token auth, append the existing SAS token
    if (this.useSasToken && this.sasToken) {
      return `${baseUrl}?${this.sasToken}`;
    }

    // Generate new SAS token for this specific blob
    if (this.sharedKeyCredential) {
      const startsOn = new Date();
      const expiresOn = new Date(startsOn.getTime() + expiresIn * 1000);

      const sasToken = generateBlobSASQueryParameters({
        containerName: this.containerName,
        blobName: fullPath,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
      }, this.sharedKeyCredential).toString();

      return `${baseUrl}?${sasToken}`;
    }

    // Fallback - return base URL (may not work without auth)
    return baseUrl;
  }

  async delete(storagePath) {
    const fullPath = this._getFullPath(storagePath);
    const blockBlobClient = this.containerClient.getBlockBlobClient(fullPath);
    await blockBlobClient.delete();
    return true;
  }

  async list(folder = '') {
    const prefix = this._getFullPath(folder);
    const items = [];

    for await (const blob of this.containerClient.listBlobsFlat({ 
      prefix: prefix ? `${prefix}/` : '' 
    })) {
      items.push({
        name: blob.name.split('/').pop(),
        path: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified,
        isFolder: false,
        mimeType: blob.properties.contentType
      });
    }

    return items;
  }

  async exists(storagePath) {
    const fullPath = this._getFullPath(storagePath);
    const blockBlobClient = this.containerClient.getBlockBlobClient(fullPath);
    return await blockBlobClient.exists();
  }

  _sanitizeMetadata(metadata) {
    const sanitized = {};
    for (const [key, value] of Object.entries(metadata)) {
      // Azure metadata keys must be valid C# identifiers (letters, digits, underscore)
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (sanitizedKey) {
        sanitized[sanitizedKey] = String(value);
      }
    }
    return sanitized;
  }
}

module.exports = AzureBlobProvider;

