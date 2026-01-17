#!/usr/bin/env node

const { program } = require('commander');
const { build } = require('../index');

program
  .name('laravel-shb')
  .description('Prepare Laravel projects for shared hosting deployment')
  .version('1.2.1');

program.command('build')
  .description('Build Laravel project for shared hosting deployment')
  .option('-c, --clean', 'Clean dist folder before building', false)
  .action((options) => {
    build(options);
  });

program.parse(process.argv);
