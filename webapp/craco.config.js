const path = require("path");

module.exports = {
  webpack: {
    alias: {
      "@kernel": path.resolve(__dirname, "./src/kernel/"),
      "@system": path.resolve(__dirname, "./src/system/"),
    },
  },
};
