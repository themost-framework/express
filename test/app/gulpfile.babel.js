/*eslint no-const: "off"*/
let gulp = require('gulp');
let del = require('del');
let babel = require('gulp-babel');
let eslint = require('gulp-eslint');
let child_process = require('child_process');
let options = require('./.themost-cli.json');
let path = require('path');

//server source directory
let buildDir = options.out;
//server source directory
let serverDir = options.base;
//server startup script
let serverScript = path.resolve(serverDir, "server.js");


//clean dist server modules
gulp.task('clean', ()=> {
    return del([`${buildDir}`]);
});

// lint server modules
gulp.task('lint', () => {
    return gulp.src(`${serverDir}/**/*.js`)
        .pipe(eslint())
        .pipe(eslint.format());
});
// copy server files
gulp.task('copy', ()=> {
    return gulp.src([`${serverDir}/**/*`, `!${serverDir}/**/*.js`])
        .pipe(gulp.dest(buildDir));
});

// build server modules
gulp.task('build', ['lint', 'copy'], () => {
    return gulp.src(`${serverDir}/**/*.js`)
        .pipe(babel())
        .pipe(gulp.dest(buildDir));
});

// serve app
gulp.task('serve', [], () => {
    let server, options, execArgv = [];
    //get debug argument
    const debug = process.execArgv.filter((x) => { return /^--inspect(-brk)?=\d+$/.test(x); })[0];
    //if process is running in debug mode (--debug or --debug-brk arguments)
    if (debug) {
        //find debug port
        const debugPort = parseInt(/^--inspect(-brk)?=(\d+)$/.exec(debug)[2]);
        //get execution arguments except --debug or --debug-brk
        execArgv = process.execArgv.filter((x) => { return !/^--inspect(-brk)?=\d+$/.test(x); }).splice(0);
        //push debug argument (while increasing debug port by 1)
        execArgv.push(debug.substr(0,debug.indexOf('=')+1)+(debugPort+1));
    }
    else {
        //otherwise get execution arguments
        execArgv = process.execArgv.splice(0);
    }
    //build child process options
    options = {
        //get parent process env variables
        env:process.env,
        //get execution arguments
        execArgv:execArgv
    };
    //push babel-core/register arguments
    if (execArgv.indexOf('@babel/register')<0) {
        execArgv.push('--require');
        execArgv.push('@babel/register');
    }
    //start child process (an express application)
    server = child_process.fork(serverScript,options);
    //watch for server module changes
    return gulp.watch(`${serverDir}/**/*`, () => {
        //wait for process to exit
        server.on('exit', function() {
            server = child_process.fork(serverScript,options);
        });
        //kill child process and wait to build server again
        server.kill("SIGINT");
    });
});

//set the default task (build only server modules)
gulp.task('default', ['clean'], () => {
    return gulp.start('build');
});