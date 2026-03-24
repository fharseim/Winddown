require('dotenv').config({ path: __dirname + '/.env' })

module.exports = {
  apps: [
    {
      name: 'rise-crawler',
      script: 'server.js',
      cwd: '/root/Winddown/crawler',

      // Restart behaviour
      kill_timeout: 5000,          // wait 5s for graceful shutdown before SIGKILL
      listen_timeout: 10000,       // give server time to bind port
      exp_backoff_restart_delay: 100, // back off on crash loops
      max_memory_restart: '400M',

      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '3001',
        API_SECRET: process.env.API_SECRET || '',
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
      },
    },
  ],
}
