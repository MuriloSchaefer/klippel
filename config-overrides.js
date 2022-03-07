const { alias } = require("react-app-rewire-alias");

module.exports = function override(config) {
  alias({
    "@kernel": "src/kernel",
  })(config);

  return config;
};
