import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

/**
 * Simple FileUpload Component - Bugzilla style
 * Just a button that opens file picker
 */
function FileUpload({ bugId, onUploadComplete, disabled = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('local');
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Get default provider (Azure preferred, local fallback)
    const fetchProvider = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/attachments/providers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Prefer Azure, then S3, then SharePoint, finally local
        const providers = res.data.providers || [];
        if (providers.includes('azure')) {
          setProvider('azure');
        } else if (providers.includes('s3')) {
          setProvider('s3');
        } else if (providers.includes('sharepoint')) {
          setProvider('sharepoint');
        } else {
          setProvider('local');
        }
      } catch (err) {
        setProvider('local');
      }
    };
    fetchProvider();
  }, []);

  const handleClick = () => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    e.target.value = ''; // Reset for re-selection
    setError('');
    setUploading(true);

    const token = localStorage.getItem('token');
    const uploadedFiles = [];

    for (const file of files) {
      // Validate size
      if (file.size > 25 * 1024 * 1024) {
        setError(`${file.name} exceeds 25MB limit`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('provider', provider);

      try {
        const res = await axios.post(`/api/attachments/${bugId}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        uploadedFiles.push(res.data);
      } catch (err) {
        setError(`Failed to upload ${file.name}: ${err.response?.data?.error || err.message}`);
      }
    }

    setUploading(false);

    if (onUploadComplete && uploadedFiles.length > 0) {
      onUploadComplete(uploadedFiles);
    }
  };

  return (
    <div className="simple-upload">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />
      
      <button
        type="button"
        className="btn btn-attachment"
        onClick={handleClick}
        disabled={disabled || uploading || !bugId}
      >
        {uploading ? '⏳ Uploading...' : '📎 Add Attachment'}
      </button>
      
      {!bugId && (
        <span className="upload-hint">Save bug first to attach files</span>
      )}
      
      {error && <span className="upload-error">{error}</span>}
    </div>
  );
}

export default FileUpload;
