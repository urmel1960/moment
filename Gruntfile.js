module.exports = function (grunt) {
    var embedOption = grunt.option('embedLocales'),
        embedLocaleDest = embedOption ?
            'min/moment-with-customlocales.js' :
            'min/moment-with-locales.js',
        embedLocaleSrc = 'locale/*.js';

    if (embedOption && embedOption.match(/,/)) {
        embedLocaleSrc = 'locale/{' + embedOption + '}.js';
    }
    else if (embedOption) {
        embedLocaleSrc = 'locale/' + embedOption + '.js';
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat : {
            locales: {
                src: 'locale/*.js',
                dest: 'min/locales.js'
            },
            tests: {
                src: [
                    'test/browser-prefix.js',
                    'test/moment/*.js',
                    'test/locale/*.js',
                    'test/browser-suffix.js'
                ],
                dest: 'min/tests.js'
            }
        },
        env : {
            sauceLabs : (grunt.file.exists('.sauce-labs.creds') ?
                    grunt.file.readJSON('.sauce-labs.creds') : {})
        },
        karma : {
            options: {
                frameworks: ['nodeunit'],
                files: [
                    'min/moment-with-locales.js',
                    'min/tests.js',
                    'test/browser.js'
                ],
                sauceLabs: {
                    startConnect: true,
                    testName: 'MomentJS'
                },
                customLaunchers: {
                    slChromeWinXp: {
                        base: 'SauceLabs',
                        browserName: 'chrome',
                        platform: 'Windows XP'
                    },
                    slIe9Win7: {
                        base: 'SauceLabs',
                        browserName: 'internet explorer',
                        platform: 'Windows 7',
                        version: '9'
                    },
                    slIe8Win7: {
                        base: 'SauceLabs',
                        browserName: 'internet explorer',
                        platform: 'Windows 7',
                        version: '8'
                    },
                    slFfLinux: {
                        base: 'SauceLabs',
                        browserName: 'firefox',
                        platform: 'Linux'
                    },
                    slSafariOsx: {
                        base: 'SauceLabs',
                        browserName: 'safari',
                        platform: 'OS X 10.8'
                    }
                }
            },
            server: {
                browsers: []
            },
            chrome: {
                singleRun: true,
                browsers: ['Chrome']
            },
            firefox: {
                singleRun: true,
                browsers: ['Firefox']
            },
            sauce: {
                options: {reporters: ['dots']},
                singleRun: true,
                browsers: [
                    'slChromeWinXp',
                    'slIe9Win7',
                    'slIe8Win7',
                    'slFfLinux',
                    'slSafariOsx'
                ]
            }
        },

        uglify : {
            main: {
                files: {
                    'min/moment-with-locales.min.js'     : 'min/moment-with-locales.js',
                    'min/locales.min.js'                 : 'min/locales.js',
                    'min/moment.min.js'                  : 'moment.js'
                }
            },
            customlocales: {
                files: {
                    'min/moment-with-customlocales.min.js' : 'min/moment-with-customlocales.js'
                }
            },
            options: {
                mangle: true,
                compress: {
                    dead_code: false // jshint ignore:line
                },
                output: {
                    ascii_only: true // jshint ignore:line
                },
                report: 'min',
                preserveComments: 'some'
            }
        },
        nodeunit : {
            all : ['test/moment/**/*.js', 'test/locale/**/*.js']
        },
        jshint: {
            all: [
                'Gruntfile.js', 'moment.js', 'locale/**/*.js', 'test/**/*.js',
                '!test/browser*.js'
            ],
            options: {
                jshintrc: true
            }
        },
        jscs: {
            all: [
                'Gruntfile.js', 'moment.js', 'locale/**/*.js',
                'test/**/*.js', '!test/browser*.js'
            ],
            options: {
                config: '.jscs.json'
            }
        },
        watch : {
            test : {
                files : [
                    'moment.js',
                    'locale/*.js',
                    'test/**/*.js'
                ],
                tasks: ['nodeunit']
            },
            jshint : {
                files : '<%= jshint.all %>',
                tasks: ['jshint']
            }
        },
        embedLocales: {
            moment: 'moment.js',
            dest: embedLocaleDest,
            targetLocales: embedLocaleSrc
        },
        benchmark: {
            all: {
                src: ['benchmarks/*.js']
            }
        },
        exec: {
            'meteor-init': {
                command: [
                    // Make sure Meteor is installed, per https://meteor.com/install.
                    // The curl'ed script is safe; takes 2 minutes to read source & check.
                    'type meteor >/dev/null 2>&1 || { curl https://install.meteor.com/ | sh; }',
                    // Meteor expects package.js to be in the root directory of
                    // the checkout, but we already have a package.js for Dojo
                    'mv package.js package.dojo && cp meteor/package.js .'
                ].join(';')
            },
            'meteor-cleanup': {
                // remove build files and restore Dojo's package.js
                command: 'rm -rf ".build.*" versions.json; mv package.dojo package.js'
            },
            'meteor-test': {
                command: 'spacejam --mongo-url mongodb:// test-packages ./'
            },
            'meteor-publish': {
                command: 'meteor publish'
            }
        }

    });

    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    require('load-grunt-tasks')(grunt);

    // Default task.
    grunt.registerTask('default', ['jshint', 'jscs', 'nodeunit']);

    // test tasks
    grunt.registerTask('test', ['test:node', 'test:browser']);
    grunt.registerTask('test:node', ['nodeunit']);
    grunt.registerTask('test:server', ['concat', 'embedLocales', 'karma:server']);
    grunt.registerTask('test:browser', ['concat', 'embedLocales', 'karma:chrome', 'karma:firefox']);
    grunt.registerTask('test:sauce-browser', ['concat', 'embedLocales', 'env:sauceLabs', 'karma:sauce']);
    grunt.registerTask('test:travis-sauce-browser', ['concat', 'embedLocales', 'karma:sauce']);
    grunt.registerTask('test:meteor', ['exec:meteor-init', 'exec:meteor-test', 'exec:meteor-cleanup']);

    // travis build task
    grunt.registerTask('build:travis', [
        // code style
        'jshint', 'jscs',
        // node tests
        'test:node'
    ]);

    grunt.registerTask('meteor-publish', ['exec:meteor-init', 'exec:meteor-publish', 'exec:meteor-cleanup']);

    // Task to be run when releasing a new version
    grunt.registerTask('release', [
        'jshint', 'nodeunit', 'concat', 'embedLocales',
        'component', 'uglify:main'
    ]);
};
