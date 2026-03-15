import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

/*
  Storage polyfill: In Claude artifacts, window.storage is provided.
  For standalone deployment (Netlify/GitHub), we use localStorage
  with the same async API shape.
*/
if (!window.storage) {
  window.storage = {
    get: function(key) {
      return new Promise(function(resolve, reject) {
        try {
          var val = localStorage.getItem(key);
          if (val !== null) {
            resolve({ key: key, value: val, shared: false });
          } else {
            reject(new Error('Key not found'));
          }
        } catch(e) {
          reject(e);
        }
      });
    },
    set: function(key, value) {
      return new Promise(function(resolve, reject) {
        try {
          localStorage.setItem(key, value);
          resolve({ key: key, value: value, shared: false });
        } catch(e) {
          reject(e);
        }
      });
    },
    delete: function(key) {
      return new Promise(function(resolve) {
        try {
          localStorage.removeItem(key);
          resolve({ key: key, deleted: true, shared: false });
        } catch(e) {
          resolve({ key: key, deleted: false, shared: false });
        }
      });
    },
    list: function(prefix) {
      return new Promise(function(resolve) {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (!prefix || k.indexOf(prefix) === 0) keys.push(k);
        }
        resolve({ keys: keys, shared: false });
      });
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(App)
  )
)
