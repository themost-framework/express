import rollupBabel from 'rollup-plugin-babel';
import rollupResolve from 'rollup-plugin-node-resolve';
import autoExternal from 'rollup-plugin-auto-external';
import dts from "rollup-plugin-dts";

const dist = './dist/';
const name = 'themost_express';

module.exports = [{
    input: './src/index.js',
    output: [
        {
            file: `${dist}${name}.cjs.js`,
            format: 'cjs'
        },
        {
            file: `${dist}${name}.esm.js`,
            format: 'esm'
        }
    ],
    plugins: [
        rollupBabel({
            exclude: [/\/node_modules\//]
        }),
        rollupResolve(),
        autoExternal()
    ]
}, {
    input: './src/index.d.ts',
    output: [{
        file: `${dist}${name}.d.ts`,
        format: "es"
    }],
    plugins: [dts()],
}];
