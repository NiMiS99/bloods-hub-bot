// deploy/ecosystem.config.cjs
// PM2 process file — alternative to Docker for bare-metal Linux VPS.
// Usage:  pm2 start deploy/ecosystem.config.cjs
//         pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'bloods-hub-bot',
      script: 'src/index.js',
      cwd: __dirname + '/..',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
