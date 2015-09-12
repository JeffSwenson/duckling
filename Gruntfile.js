/**
 * Function that defines the order to include directories for typescript compilation. The
 * purpose is to enforce a strict dependency chain and reduce the number of required
 * references.
 */
function getTSDirs() {
    var directories = ["src/bootstrap.ts"];

    for (var i = 0; i < arguments.length; i++) {
        directories.push("src/ts/" + arguments[i] + "/**/*.ts");
    }

    return directories;
}

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-image');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-jade');
    grunt.loadNpmTasks("grunt-bower-task");
    grunt.loadNpmTasks("grunt-tsd");

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bower: {
            install : {

            }
        },
        tsd: {
            refresh : {
                options: {
                    command: 'reinstall',
                    latest: true,
                    config: 'tsd.json',
                }

            }
        },
        typescript: {
            duckling: {
                src: getTSDirs(
                    "util",
                    "framework",
                    "math",
                    "entitysystem",
                    "editorcanvas",
                    "splash"
                ),
                dest: 'build/scripts/duckling.js',
                options: {
                    module: 'commonjs',
                    sourceMap: true,
                    target: 'es5',
                    references: [
                        "typings/tsd.d.ts"
                    ]
                }
            }
        },
        concat: {
            jsdepend: {
                options: {
                    separator: ';'
                },
                src: [
                    'bower_components/jquery/dist/jquery.js',
                    'node_modules/sightglass/index.js',
                    'bower_components/rivets/dist/rivets.js',
                    'bower_components/bootstrap/dist/js/bootstrap.js',
                    'bower_components/bootstrap-select/dist/js/bootstrap-select.js',
                    'bower_components/jade/runtime.js',
                    'bower_components/mousetrap/mousetrap.js',
                    'bower_components/EaselJS/lib/easeljs-0.8.1.combined.js'
                ],
                dest: 'build/dependencies/dependencies.js'
            },
            cssdepend: {
                src: [
                    'bower_components/bootstrap/dist/css/bootstrap.css',
                    'bower_components/bootstrap-select/dist/css/bootstrap-select.css',
                    'bower_components/font-awesome/css/font-awesome.css'
                ],
                dest: 'build/dependencies/dependencies.css'
            }
        },
        sass: {
            dist : {
                files: {
                    'build/styles/duckling.css': 'src/sass/main.scss'
                }
            }
        },
        image: {
            dynamic: {
                files: [{
                    expand: true,
                    cwd: 'resources',
                    src: ['**/*.{png,jpg,gif,svg}'],
                    dest: 'build/resources'
                }]
            }
        },
        copy: {
            package: {
                files: [
                    {
                        expand: true,
                        src: 'package.json',
                        dest: 'build'
                    },
                    {
                        expand: true,
                        cwd: 'bower_components/font-awesome/fonts',
                        src: '**/*',
                        dest: 'build/fonts',
                        flatten: true,
                        filter: 'isFile'
                    },
                    {
                        expand: true,
                        cwd: 'bower_components/bootstrap/fonts',
                        src: '**/*',
                        dest: 'build/fonts',
                        flatten: true,
                        filter: 'isFile'
                    }
                ]
            }
        },
        jade: {
            index: {
                files: {
                    "build/index.html" : ["src/index.jade"]
                }
            },
            views: {
                options: {
                    client: "true",
                    namespace: "views.templates",
                    processName: function(filename) {
                        return filename.slice("src/jade/".length,-".jade".length);
                    }
                },
                files: {
                    "build/scripts/duckling_views.js" : ["src/jade/**/*.jade"]
                }
            }
        }
    });
    grunt.registerTask('default', ['typescript','concat','copy','jade','sass','image']);
    grunt.registerTask('install', ['bower','tsd']);
};