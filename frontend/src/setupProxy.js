// Used only by `npm start` (the development server); production builds ignore this file.
// Forwards API and file requests so the dev server can run with REACT_APP_API_URL=/api/.
//
// Default: the backend running on this PC (scripts/dev-backend.ps1) and MinIO from docker-compose.dev.yml.
// To use the full Docker stack instead, set before `npm start`:
//   $env:DEV_API_TARGET="http://localhost:3000/api"; $env:DEV_STORAGE_TARGET="http://localhost:3000/storage"
const { createProxyMiddleware } = require('http-proxy-middleware');

const apiTarget = process.env.DEV_API_TARGET || 'http://localhost:8080';
const storageTarget = process.env.DEV_STORAGE_TARGET || 'http://localhost:9000';

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/api': '' }
    })
  );
  app.use(
    '/storage',
    createProxyMiddleware({
      target: storageTarget,
      changeOrigin: true,
      pathRewrite: { '^/storage': '' }
    })
  );
};
