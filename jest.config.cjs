module.exports = {
    // preset: "ts-jest",
    // transform: {
    //     "^.+\\.(ts|tsx|js|jsx)$": ["babel-jest"],
    // },
    //moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
    testEnvironment: "jsdom",
    roots: ["<rootDir>/src/"],
    // From https://jestjs.io/docs/webpack#mocking-css-modules
    moduleNameMapper: {
        "\\.(css|less)$": "identity-obj-proxy",
        //"@zarrita/core":
        //    "<rootDir>/node_modules/@zarrita/core/dist/src/index.js",
        // "reference-spec-reader":
        //     "<rootDir>/node_modules/@aics/volume-viewer/node_modules/reference-spec-reader/src/index.js",
    },
    transformIgnorePatterns: ["<rootDir>/node_modules/three/examples/(?!jsm/)"],
    setupFiles: ["<rootDir>/src/test/testSetup.ts"],
};
