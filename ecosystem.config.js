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
      script: "/home/dh_6fq5p3/mongodb/bin/mongod",
      // --- THIS IS THE CORRECTED PART ---
      // Instead of using --dbpath, we now use --config to point to our new file.
      args: "--config /home/dh_6fq5p3/jkit-app/mongod.conf",
      interpreter: "none",
      exec_mode: "fork"
    }
  ]
};