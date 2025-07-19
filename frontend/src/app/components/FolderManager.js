'use client';
import { useState } from 'react';
import styles from '../styles/FolderManager.module.css';

export default function FolderManager({ onCreateFolder, onCancel }) {
  const [folderData, setFolderData] = useState({
    name: '',
    description: '',
    color: '#4285f4'
  });
  const [isLoading, setIsLoading] = useState(false);

  const colorOptions = [
    '#4285f4', // Blue
    '#ea4335', // Red
    '#fbbc04', // Yellow
    '#34a853', // Green
    '#9c27b0', // Purple
    '#ff9800', // Orange
    '#795548', // Brown
    '#607d8b'  // Blue Grey
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!folderData.name.trim()) {
      alert('Please enter a folder name');
      return;
    }

    setIsLoading(true);
    try {
      await onCreateFolder(folderData);
      setFolderData({ name: '', description: '', color: '#4285f4' });
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.folderManager}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="folderName">Folder Name *</label>
          <input
            id="folderName"
            type="text"
            value={folderData.name}
            onChange={(e) => setFolderData({ ...folderData, name: e.target.value })}
            placeholder="Enter folder name..."
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="folderDescription">Description</label>
          <textarea
            id="folderDescription"
            value={folderData.description}
            onChange={(e) => setFolderData({ ...folderData, description: e.target.value })}
            placeholder="Optional description..."
            className={styles.textarea}
            rows={3}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Folder Color</label>
          <div className={styles.colorPicker}>
            {colorOptions.map(color => (
              <button
                key={color}
                type="button"
                className={`${styles.colorOption} ${folderData.color === color ? styles.selected : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setFolderData({ ...folderData, color })}
              />
            ))}
          </div>
        </div>

        <div className={styles.preview}>
          <h4>Preview:</h4>
          <div className={styles.folderPreview}>
            <span 
              className={styles.folderIcon}
              style={{ color: folderData.color }}
            >
              📁
            </span>
            <span className={styles.folderName}>
              {folderData.name || 'New Folder'}
            </span>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.createButton}
            disabled={isLoading || !folderData.name.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Folder'}
          </button>
        </div>
      </form>
    </div>
  );
}