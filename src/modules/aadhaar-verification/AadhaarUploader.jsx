/**
 * AadhaarUploader — Drag-and-drop file upload component
 * ─────────────────────────────────────────────────────
 */
import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, Image, X } from 'lucide-react';
import { ACCEPTED_TYPES, MAX_FILE_SIZE_MB } from './types';

export default function AadhaarUploader({ onFileSelect, disabled }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      setSelectedFile(file);
      onFileSelect?.(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  const handleChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = useCallback((e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const FileIcon = selectedFile?.type === 'application/pdf' ? FileText : Image;

  return (
    <div
      onClick={() => !disabled && !selectedFile && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        border: `2px dashed ${
          dragActive
            ? 'rgba(59,130,246,0.6)'
            : selectedFile
            ? 'rgba(34,197,94,0.4)'
            : 'rgba(255,255,255,0.12)'
        }`,
        borderRadius: 16,
        padding: selectedFile ? '20px 24px' : '40px 24px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.25s ease',
        background: dragActive
          ? 'rgba(59,130,246,0.06)'
          : selectedFile
          ? 'rgba(34,197,94,0.04)'
          : 'rgba(255,255,255,0.02)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpg,image/jpeg,application/pdf"
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {selectedFile ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(34,197,94,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileIcon size={20} style={{ color: '#22C55E' }} />
          </div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedFile.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {(selectedFile.size / 1024).toFixed(1)} KB
            </div>
          </div>
          {!disabled && (
            <button
              onClick={clearFile}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(239,68,68,0.08)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(59,130,246,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Upload
              size={24}
              style={{
                color: '#3B82F6',
                transition: 'transform 0.2s ease',
                transform: dragActive ? 'translateY(-2px)' : 'none',
              }}
            />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            {dragActive ? 'Drop your file here' : 'Upload Aadhaar Document'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Drag & drop or click to browse
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.7 }}>
            PNG, JPG, JPEG, PDF · Max {MAX_FILE_SIZE_MB}MB
          </div>
        </>
      )}
    </div>
  );
}
