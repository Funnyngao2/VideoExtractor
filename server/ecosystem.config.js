module.exports = {
  apps: [{
    name: 'videoextractor-api',
    script: './index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    // Auto-restart if app crashes
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
