/**
 * PM2 Ecosystem Configuration — Student Tracking System
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs          → start all apps
 *   pm2 start ecosystem.config.cjs --only sts-backend
 *   pm2 start ecosystem.config.cjs --only sts-frontend
 *   pm2 logs                                → tail all logs
 *   pm2 restart all                         → restart everything
 *   pm2 stop all                            → stop everything
 *   pm2 delete all                          → remove from PM2
 *   pm2 save                                → persist across reboots
 *   pm2 startup                             → generate OS startup script
 */
module.exports = {
  apps: [
    // ─── Backend API ───────────────────────────────────────
    {
      name: 'sts-backend',
      cwd: './backend',
      script: 'dist/index.js',
      interpreter: 'node',

      // Environment
      env_file: '../.env',
      env: {
        NODE_ENV: 'production',
      },

      // Process management
      instances: 1,               // Single instance (use 'max' for cluster mode)
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,        // 5s between restart attempts
      max_memory_restart: '500M',
      watch: false,               // Disable in production

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      log_type: 'json',

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },

    // ─── Frontend (Vite Preview / Static Serve) ───────────
    {
      name: 'sts-frontend',
      cwd: './frontend',
      script: 'npx',
      args: 'vite preview --port 5173 --host',
      interpreter: 'none',

      // Environment
      env: {
        NODE_ENV: 'production',
      },

      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 5,
      restart_delay: 3000,
      watch: false,

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
    },
  ],
};
