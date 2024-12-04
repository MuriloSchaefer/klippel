module.exports = {
  branches: ["stable", 'unstable'],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/exec",
      {
        "prepareCmd": "npm version ${nextRelease.version}",
      }
    ],
    [
      "@semantic-release/git",
      {
        assets: ['./package.json', './package-lock.json'],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    ["@semantic-release/github", {
      assets: [
        { "path": "dist/ubuntu-latest", "label": "Ubuntu x64" },
        { "path": "dist/macos-latest", "label": "MacOs x64" },
        { "path": "dist/windows-latest", "label": "Windows x64" },
      ]
    }],
  ],
};
