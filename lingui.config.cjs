const { formatter } = require("@lingui/format-json");

module.exports = {
  locales: ["en", "es", "ko"],
  catalogs: [
    {
      path: "i18n/locales/{locale}.json",
      include: ["app", "components", "providers", "hooks"],
    },
  ],
  format: formatter({ style: "minimal" })
};
