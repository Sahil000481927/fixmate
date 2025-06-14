import React from 'react';
        import './App.css';

        function App() {
          return (
            <div
              style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src="/logo.svg"
                  alt="ViteMate"
                  style={{
                    width: 48,
                    height: 48,
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))',
                  }}
                />
                <h1 style={{ fontWeight: 700, fontSize: 32, margin: 0 }}>ViteMate</h1>
              </div>
              <p style={{ color: '#888', marginTop: 16 }}>
                Welcome to ViteMate!
              </p>
            </div>
          );
        }

        export default App;