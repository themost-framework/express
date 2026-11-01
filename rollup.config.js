import { babel } from '@rollup/plugin-babel';
import dts from 'rollup-plugin-dts';
const pkg = require('./package.json');
const external = Object.keys(pkg.dependencies).concat(Object.keys(pkg.peerDependencies));

/**
 * Returns the build configuration of the module or of a secondary module e.g. controllers
 * @param {string} input The entry point e.g. src/index.js
 * @param {string} outDir The output directory e.g. dist
 * @param {Array<string>=} extraExternal Additional external modules
 */
function createConfig(input, outDir, extraExternal = []) {
  return [
    {
      input: `${input}.js`,
      output: {
        file: `${outDir}/index.cjs.js`,
        format: 'cjs',
        sourcemap: true
      },
      external: external.concat(extraExternal),
      plugins: [babel({
        babelHelpers: 'bundled'
      })]
    },
    {
      input: `${input}.js`,
      output: {
        file: `${outDir}/index.esm.js`,
        format: 'esm',
        sourcemap: true
      },
      external: external.concat(extraExternal),
      plugins: [babel({
        babelHelpers: 'bundled'
      })]
    },
    {
      input: `${input}.d.ts`,
      output: [{ file: `${outDir}/index.d.ts`, format: 'es' }],
      external: external.concat(extraExternal),
      plugins: [dts({
        compilerOptions: {
          removeComments: true
        }
      })],
    }
  ];
}

const config = [
  ...createConfig('src/index', 'dist'),
  ...createConfig('controllers/src/index', 'controllers/dist', [ '@themost/express' ])
];

export default config;
