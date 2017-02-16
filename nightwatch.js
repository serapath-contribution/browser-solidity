'use strict'

var TEST
if (process.env.TRAVIS_JOB_NUMBER === 'test' || process.env.TRAVIS_JOB_NUMBER === undefined) {
  TEST = 'test'
} else {
  TEST = 'browsersoliditytests' + process.env.TRAVIS_JOB_NUMBER
}

module.exports = {
  'src_folders': ['test-browser/tests'],
  'output_folder': 'reports',
  'custom_commands_path': '',
  'custom_assertions_path': '',
  'page_objects_path': '',
  'globals_path': '',

  'test_settings': {
    'default': {
      'launch_url': 'http://ondemand.saucelabs.com:80',
      'selenium_host': 'ondemand.saucelabs.com',
      'selenium_port': 80,
      'silent': true,
      'username': process.env.SAUCE_USER,
      'access_key': process.env.SAUCE_GUID,
      'use_ssl': false,
      'globals': {
        'waitForConditionTimeout': 10000,
        'asyncHookTimeout': 100000
      },
      'screenshots': {
        'enabled': false,
        'path': ''
      },
      'desiredCapabilities': {
        'browserName': 'firefox',
        'javascriptEnabled': true,
        'acceptSslCerts': true,
        'build': 'build-' + process.env.TRAVIS_JOB_NUMBER,
        'tunnel-identifier': TEST
      }
    },

    'chrome': {
      'desiredCapabilities': {
        'browserName': 'chrome',
        'javascriptEnabled': true,
        'acceptSslCerts': true,
        'build': 'build-' + process.env.TRAVIS_JOB_NUMBER,
        'tunnel-identifier': TEST
      }
    },

    'safari': {
      'desiredCapabilities': {
        'browserName': 'safari',
        'javascriptEnabled': true,
        'platform': 'OS X 10.10',
        'version': '8.0',
        'acceptSslCerts': true,
        'build': 'build-' + process.env.TRAVIS_JOB_NUMBER,
        'tunnel-identifier': TEST
      }
    },

    'ie': {
      'desiredCapabilities': {
        'browserName': 'internet explorer',
        'javascriptEnabled': true,
        'acceptSslCerts': true,
        'platform': 'WIN8.1',
        'version': '11',
        'build': 'build-' + process.env.TRAVIS_JOB_NUMBER,
        'tunnel-identifier': TEST
      }
    },

    'local': {
      'launch_url': 'http://localhost:8080',
      'selenium_port': 4444,
      'selenium_host': 'localhost',
      'desiredCapabilities': {
        'browserName': 'firefox',
        'javascriptEnabled': true,
        'acceptSslCerts': true
      }
    }
  }
}
