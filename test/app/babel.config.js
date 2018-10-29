module.exports = function (api) {
    api.cache(false);
    return {
        "sourceMaps": "inline",
        "retainLines": true,
        "presets": [
            "@babel/preset-env"
        ],
        "plugins": [
            [
                "@babel/plugin-proposal-export-default-from"
            ],
            [
                "@babel/plugin-proposal-export-namespace-from"
            ],
            [
                "@babel/plugin-transform-modules-commonjs"
            ],
            [
                "@babel/plugin-proposal-decorators",
                {
                    "legacy": true
                }
            ],
            [
                "@babel/plugin-proposal-class-properties",
                {
                    "loose": true
                }
            ]
        ]
    };
};