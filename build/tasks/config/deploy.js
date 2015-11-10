module.exports = function(grunt) {
	grunt.config.set('ftpush', {
	  js: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'mraKey'
		},
		src: '../www/js/',
		dest: '/myredditall/towerghostfordestiny.com/www/www/js',
		exclusions: []
	  },
	  css: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'mraKey'
		},
		src: '../www/css/',
		dest: '/myredditall/towerghostfordestiny.com/www/www/css',
		exclusions: []
	  },
	  definitions: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'mraKey'
		},
		src: '../www/data/definitions/',
		dest: '/myredditall/towerghostfordestiny.com/www/www/data/definitions',
		exclusions: []
	  },
	  images: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'mraKey'
		},
		src: '../www/data/common/',
		dest: '/myredditall/towerghostfordestiny.com/www/www/data/common',
		simple: true,
		exclusions: []
	  },
	  manifest: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'mraKey'
		},
		src: '../www/',
		dest: '/myredditall/towerghostfordestiny.com/www/www/',
		simple: true,
		keep: [ '/myredditall/towerghostfordestiny.com/www/js/', '/myredditall/towerghostfordestiny.com/www/data/', '/myredditall/towerghostfordestiny.com/www/css/' ],
		exclusions: [ 'assets','css','data','js','lib','res','spec','templates', '*.xml', '*.png', '*.html' ]
	  }
	});

	grunt.loadNpmTasks('grunt-ftpush');
};
