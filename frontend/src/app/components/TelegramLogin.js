'use client';
import { useEffect, useState, useRef } from 'react';

export default function TelegramLogin({ onLogin }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const isLoadedRef = useRef(isLoaded);

  // Keep ref updated when state changes
  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadTelegramWidget = async () => {
      try {
        console.log('🔄 Starting Telegram widget initialization...');
        setDebugInfo('Initializing...');

        // Clear any existing widgets
        const existingWidget = document.querySelector('#telegram-login-widget');
        if (existingWidget) {
          existingWidget.innerHTML = '';
          console.log('🧹 Cleared existing widget');
        }

        // Remove existing scripts
        const existingScripts = document.querySelectorAll('script[src*="telegram.org/js/telegram-widget"]');
        existingScripts.forEach(script => script.remove());
        console.log('🧹 Removed existing scripts');

        // Create new script
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', 'tesyt3233_bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '10');
        script.setAttribute('data-auth-url', 'https://tgdrive-mugz.onrender.com/api/auth/telegram');
        script.setAttribute('data-request-access', 'write');
        script.async = true;

        console.log('📝 Created script with attributes:', {
          src: script.src,
          login: script.getAttribute('data-telegram-login'),
          size: script.getAttribute('data-size'),
          onauth: script.getAttribute('data-onauth')
        });

        script.onload = () => {
          console.log('✅ Telegram widget script loaded successfully');
          setIsLoaded(true);
          setError(null);
          setDebugInfo('Widget loaded');
        };

        script.onerror = (err) => {
          console.error('❌ Failed to load Telegram widget script:', err);
          setError('Failed to load Telegram widget');
          setIsLoaded(false);
          setDebugInfo('Script load failed');
        };

        const container = document.querySelector('#telegram-login-widget');
        if (container) {
          container.appendChild(script);
          console.log('📦 Script added to container');
          setDebugInfo('Script added to DOM');
        } else {
          console.error('❌ Container #telegram-login-widget not found');
          setError('Widget container not found');
          setDebugInfo('Container not found');
        }

        // Add a timeout to detect if widget doesn't load
        setTimeout(() => {
          if (!isLoadedRef.current) {
            console.warn('⚠️ Telegram widget taking longer than expected to load');
            setDebugInfo('Widget loading timeout - check bot configuration');
          }
        }, 5000);

      } catch (err) {
        console.error('❌ Error initializing Telegram widget:', err);
        setError('Error initializing Telegram widget');
        setDebugInfo(`Error: ${err.message}`);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadTelegramWidget, 200);

    return () => {
      clearTimeout(timer);
      if (typeof window !== 'undefined' && window.onTelegramAuth) {
        delete window.onTelegramAuth;
      }
    };
  }, [onLogin]);

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <span style={styles.errorText}>Unable to load login</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {!isLoaded && (
        <div style={styles.placeholder}>
          <div style={styles.loadingSpinner}>🔄</div>
          <span style={styles.loadingText}>Loading Telegram Login...</span>
        </div>
      )}
      <div 
        id="telegram-login-widget" 
        style={{
          ...styles.widget,
          display: isLoaded ? 'block' : 'none'
        }}
      />
    </div>
  );
}

const styles = {
  container: {
    display: 'inline-block',
    position: 'relative',
    minHeight: '50px',
    minWidth: '200px',
  },
  widget: {
    display: 'inline-block',
    position: 'relative',
    zIndex: 1000,
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#0088cc',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
  },
  loadingSpinner: {
    fontSize: '16px',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#dc2626',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: '16px',
  },
  errorText: {
    fontSize: '14px',
  }
};