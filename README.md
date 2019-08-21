template-npm-package
=======================

This is a template for an npm package. It supports three output targets: CommonJS, EcmaScript module, and UMD.

Description of Gradle tasks:

| script | comments |
| ------ | -------- |
| build  | create CommonJS, ES module, and UMD builds |
| bundle | run Webpack to create a UMD bundle |
| clean | remove generated artifacts |
| format | run prettier on `src` directory |
| generateTypes | generate type declarations |
| lint | run eslint on `src` directory |
| transpileCommonJs | run babel on `src` directory; transpile `import/export` statements for a CommonJS compatible build |
| transpileES |  run babel on `src` directory; *do not* transpile `import/export` statements for an ES module compatible build (used by bundlers for tree-shaking) |
| test | run `mocha`; searches for any files matching the pattern "src/**/*.test.js" |
| typeCheck | run `tsc` in type-check only mode |
| start  | runs an example app from `examples` for testing. Runs at `localhost:8080/public/`. Run ./gradlew build to see new changes from `src` | 
