module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    // moduleFileExtensions: ["ts", "js", "tsx", "jsx"],
    extensionsToTreatAsEsm: [".ts", ".tsx", ".jsx"],
    globals: {
        "ts-jest": {
            tsconfig: "tsconfig.jest.json",
            useESM: true,
        },
    },
    transform: {
        "^.+\\.(ts|tsx|js|jsx)?$": "ts-jest",
        // "^.+\\.(js|jsx)$": "babel-jest",
    },
    //  https://jestjs.io/docs/webpack#mocking-css-modules
    moduleNameMapper: {
        "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
            "<rootDir>/scripts/jestAssetTransformer.js",
        "\\.(css|less)$": "identity-obj-proxy",
    },
    transformIgnorePatterns: ["<rootDir>/node_modules/three/examples/(?!jsm/)"],
};
