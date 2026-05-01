// const { FusesPlugin } = require('@electron-forge/plugin-fuses');
// const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    ignore: [
      /^\/src/,
      /(.eslintrc.json)|(.gitignore)|(electron.vite.config.ts)|(forge.config.cjs)|(tsconfig.*)/,
      // Exclude prebuilt native modules for non-target platforms.
      // rpmbuild's brp-strip fails on .bare files for foreign architectures.
      /node_modules\/.+\/prebuilds\/(android|linux-arm)/,
      // Strip docs, tests, and source maps from node_modules to shrink the payload Squirrel compresses.
      /node_modules\/.+\/(test|tests|__tests__|example|examples|docs|doc)(\/|$)/,
      /node_modules\/.+\.(md|markdown|ts|map|d\.ts)$/,
      /node_modules\/.+\/(LICENSE|LICENCE|CHANGELOG|HISTORY|AUTHORS|CONTRIBUTORS)(\..*)?$/i,
      /node_modules\/.+\/\.(github|vscode|idea|nyc_output|circleci)(\/|$)/,
      /node_modules\/.+\/(\.editorconfig|\.eslintrc.*|\.prettierrc.*|\.babelrc.*|\.npmignore|\.travis\.yml|\.gitattributes)$/,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        bin: 'Klippel'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        bin: 'Klippel',
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        bin: 'Klippel',
        options: {
          license: 'GPL-3.0',
          maintainer: 'Murilo Schaefer',
          homepage: 'https://klippel.app.br'
        },
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'MuriloSchaefer',
          name: 'klippel'
        },
        prerelease: true,
        draft: true
      }
    }
  ]
};
