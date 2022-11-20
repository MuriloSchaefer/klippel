const { alias } = require("react-app-rewire-alias");

module.exports = function override(config) {
  alias({
    "@kernel": "src/kernel",
    "node_modules/@mui/styled-engine": "node_modules/@mui/styled-engine-sc",
  })(config);

  return config;
};
