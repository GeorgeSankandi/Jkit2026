module.exports = {
  apps : [
    {
      name: "jkit-app",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false
    },
    {
      name: "mongodb",
      // --- THIS IS THE CORRECTED PATH ---
      script: "/home/dh_6fq5p3/mongodb/bin/mongod",
      args: "--dbpath /home/dh_6fq5p3/data/db",
      interpreter: "none",
      exec_mode: "fork"
    }
  ]
};