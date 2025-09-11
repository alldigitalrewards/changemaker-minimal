export default {
  default: {
    requireModule: ['tsx/register'],
    require: [
      'tests/e2e/support/**/*.ts',
      'tests/e2e/steps/**/*.ts'
    ],
    paths: ['tests/e2e/features/**/*.feature'],
    format: ['progress'],
    publishQuiet: true,
    parallel: 2,
    worldParameters: {}
  }
};


