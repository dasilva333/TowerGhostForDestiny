module.exports = function(grunt) {
	grunt.config.set('ftp-deploy', {
	  js: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'key1'
		},
		src: '../www/js/',
		dest: '/myredditall/towerghostfordestiny.com/www/www/js',
		exclusions: []
	  },
	  css: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'key1'
		},
		src: '../www/css/',
		dest: '/myredditall/towerghostfordestiny.com/www/www/css',
		exclusions: []
	  },
	  data: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'key1'
		},
		src: '../www/data/',
		dest: '/myredditall/towerghostfordestiny.com/www/www/data',
		exclusions: []
	  },
	  manifest: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'key1'
		},
		src: '../www/bootstrap.json',
		dest: '/myredditall/towerghostfordestiny.com/www/www/bootstrap.json',
		exclusions: []
	  }
	});

	grunt.loadNpmTasks('grunt-ftp-deploy');
};
