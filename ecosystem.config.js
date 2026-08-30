module.exports = {
  apps: [{
    name: 'bloods-hub-bot',
    script: 'src/index.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
    },
    env_development: {
      NODE_ENV: 'development',
    },
    error_file: './logs/bot-error.log',
    out_file: './logs/bot-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    restart_delay: 5000,
    min_uptime: 10000,
    max_restarts: 10,
    kill_timeout: 5000,
  }],
};
