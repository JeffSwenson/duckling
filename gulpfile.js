var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var exorcist = require('exorcist');
var jade = require('gulp-jade');
var jadens = require('gulp-jade-namespace');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var copy = require('gulp-copy');
var watch = require('gulp-watch');
var source = require('vinyl-source-stream')
var browserify = require('browserify');
var tsify = require('tsify');

function moveTask(taskName,fileName,dest) {
    gulp.task(taskName, function() {
        return gulp.src(fileName).pipe(gulp.dest(dest));
    });
}

gulp.task('typescript', function () {
    return browserify({debug : true})
        .add(['src/ts/main.ts','typings/typings.d.ts'])
        .plugin('tsify')
        .bundle()
        .pipe(exorcist('build/scripts/bundle/main.js.map'))
        .pipe(source('main.js'))
        .pipe(gulp.dest('build/scripts/bundle'));
});

gulp.task('views', function () {
    return gulp.src('src/jade/**/*.jade')
        .pipe(jade({
            client : true,
        }))
        .pipe(jadens({
            namespace : "views"
        }))
        .pipe(concat('duckling_views.js'))
        .pipe(gulp.dest('build/scripts/'));
});

var jsdepends = [
    'bower_components/jquery/dist/jquery.js',
    'node_modules/sightglass/index.js',
    'bower_components/rivets/dist/rivets.js',
    'bower_components/bootstrap/dist/js/bootstrap.js',
    'bower_components/bootstrap-select/dist/js/bootstrap-select.js',
    'bower_components/jade/runtime.js',
    'bower_components/mousetrap/mousetrap.js',
    'bower_components/EaselJS/lib/easeljs-0.8.2.combined.js',
    'build/scripts/duckling_views.js'
]

var cssdepends = [
    'bower_components/bootstrap/dist/css/bootstrap.css',
    'bower_components/bootstrap-select/dist/css/bootstrap-select.css',
    'bower_components/font-awesome/css/font-awesome.css',
    'build/css/main.css'
]

var DEPEND_LOCALS = {
    jsdepends : jsdepends,
    cssdepends : cssdepends
}

gulp.task('index', function() {
    return gulp.src('src/index.jade')
        .pipe(jade({
            locals : DEPEND_LOCALS,
            pretty : true
        }))
        .pipe(gulp.dest('build'));
});

gulp.task('css', function() {
    return gulp.src('src/sass/main.scss')
        .pipe(sass())
        .pipe(gulp.dest('build/css'));
});

gulp.task('fonts', function () {
    return gulp.src([
        'bower_components/font-awesome/fonts/**/*',
        'bower_components/bootstrap/fonts/**/*'
    ]).pipe(gulp.dest('build/fonts'));
});

gulp.task('babel-helpers', function () {
    return gulp.src('src/')
        .pipe(babel({externalHelpers: true}))
        .pipe(babelhelpers('babeleHelpers.js'))
        .pipe(gulp.dest('build/scripts'));
})

gulp.task('watch', function () {

});

moveTask('fonts', [
    'bower_components/font-awesome/fonts/**/*',
    'bower_components/bootstrap/fonts/**/*'
], 'build/fonts');
moveTask('resources', 'resources/**', 'build/resources');
moveTask('package', 'package.json', 'build/');
moveTask('specrunner', 'spec/SpecRunner.html', 'build/');

gulp.task('default', [
    'views',
    'index',
    'css',
    'fonts',
    'package',
    'specrunner',
    'resources'
]);
