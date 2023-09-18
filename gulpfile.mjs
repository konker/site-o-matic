import gulp from 'gulp';
import packageJson from './package.json' assert { type: 'json' };

gulp.task('copy-static', async () =>
  packageJson.staticFiles
    ? gulp
        .src(packageJson.staticFiles || '', {
          base: '.',
        })
        .pipe(gulp.dest('dist'))
    : undefined
);
