module.exports = {
  apps: [
    {
      name: "teleclip",
      script: "server/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        BASE_PATH: "/",
        PUBLIC_URL: "https://teleclip.hadibtf.ir",
        DATA_DIR: "./data",
        CLIP_TTL_SECONDS: 600,
        MAX_TEXT_LENGTH: 10000,
        RATE_LIMIT_WINDOW_MS: 60000,
        RATE_LIMIT_MAX: 30,
        TRUST_PROXY: 1
      }
    }
  ]
};
