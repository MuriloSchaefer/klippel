// const { FusesPlugin } = require('@electron-forge/plugin-fuses');
// const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  hooks: {
    /**
     * Fetch the cr-sqlite extension for the platform being packaged.
     *
     * At **build** time, never at run time: a packaged app has to work with no
     * network, and an install that silently shipped without the extension
     * would run single-peer with sync quietly off. Forge passes the target
     * platform/arch, so cross-packaging fetches the right binary rather than
     * the build host's.
     */
    generateAssets: async (_forgeConfig, platform, arch) => {
      const { fetchCrsqlite } = await import(
        './scripts/devtools/fetch-crsqlite.mjs'
      );
      await fetchCrsqlite(`${platform}-${arch}`);
    },
  },
  packagerConfig: {
    asar: true,
    // The cr-sqlite loadable extension. Outside the asar because SQLite loads
    // it by path with dlopen, which cannot read from an archive. Populated per
    // platform by `scripts/devtools/fetch-crsqlite.mjs`; without it the app
    // runs single-peer with sync off.
    extraResource: ['resources/crsqlite'],
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
