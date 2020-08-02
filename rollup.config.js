// rollup.config.js
const rollup_ts = require('@rollup/plugin-typescript');
const rollup_resolve = require('@rollup/plugin-node-resolve');
const rollup_cjs = require('@rollup/plugin-commonjs');
const rollup_json = require('@rollup/plugin-json');
const rollup_copy = require('rollup-plugin-copy');
const rollup_node = require('rollup-plugin-node-polyfills');
const rollup_replace = require('@rollup/plugin-replace');

export default {
  input: 'src/lancer.ts',
  output: {
    file: 'dist/lancer.js',
    format: 'es'
  },
  plugins: [
			rollup_ts(),
			rollup_json(),
			rollup_resolve.nodeResolve({
				browser: true, // Doesn't seem to work
				mainFields: ["browser", "module", "main"]
			}),
			rollup_cjs({
				transformMixedEsModules: true,
			}),
			// TODO: Copy doesn't seem to be working. Config issue?
			rollup_copy({
				targets: [
					{src: 'node_modules/@mdi/font/**/*', dest: 'dist/fonts/mdi'}
				]
			}),
			rollup_node(),
			rollup_replace({
				"process.stderr.fd": 3,
				"lib/rng": "lib/rng-browser"
			})
};