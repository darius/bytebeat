#!/usr/local/bin/node
var glitchparse = require('./glitchparse')
  , sys = require('sys')
  , octo = 'glitch://octo!a2k14had!a2000he!a8!a11k3h1fde!m!aEk7Fhn!20g'


sys.puts(glitchparse.infix_of(process.argv[2]))
