module.exports = function(grunt) {
	grunt.config.set("jsbeautifier", {
		files: [
			'../www/index.html',
			'../www/templates/**/*.html',
			'../www/js*.js',
			'../www/js/app/*.js',
			'../www/js/core/*.js',
			'../www/js/tgd/*.js',
			'!../www/js/tgd/base.js',
			'../www/js/extras/*.js'
		],
		options: {
		  html: {
			  braceStyle: "collapse",
			  indentChar: " ",
			  indentScripts: "keep",
			  indentSize: 4,
			  maxPreserveNewlines: 10,
			  preserveNewlines: true,
			  unformatted: ["a", "sub", "sup", "b", "i", "u"],
			  wrapLineLength: 0
		  },
		  css: {
			  indentChar: " ",
			  indentSize: 4
		  },
		  js: {
			  braceStyle: "collapse",
			  breakChainedMethods: false,
			  e4x: false,
			  eol: "\r\n",
			  evalCode: false,
			  indentChar: " ",
			  indentLevel: 0,
			  indentSize: 4,
			  indentWithTabs: false,
			  jslintHappy: false,
			  keepArrayIndentation: false,
			  keepFunctionIndentation: false,
			  maxPreserveNewlines: 10,
			  preserveNewlines: true,
			  spaceBeforeConditional: true,
			  spaceInParen: false,
			  unescapeStrings: false,
			  wrapLineLength: 0,
			  endWithNewline: false
		  }
		}
	});

	grunt.loadNpmTasks('grunt-jsbeautifier');
};
