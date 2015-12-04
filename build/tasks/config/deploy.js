module.exports = function(grunt) {
	grunt.config.set('ftpush', {
	  shareAssets: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'mraKey'
		},
		src: '../../branches/static-share/www/',
		dest: '/myredditall/towerghostfordestiny.com/www/share',
		simple: true,
		exclusions: [ 'data' ]
	  },
	  shareImages: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'mraKey'
		},
		src: '../../branches/static-share/www/data/common',
		simple: true,
		dest: '/myredditall/towerghostfordestiny.com/www/share/data/common',
		exclusions: []
	  },	  
	  resources: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'mraKey'
		},
		src: '../www/resources/',
		dest: '/myredditall/towerghostfordestiny.com/www/www/resources',
		exclusions: []
	  },
	  locale: {
		auth: {
		  host: 'towerghostfordestiny.com',
		  port: 21,
		  authKey: 'mraKey'
		},
		src: 'locale/',
		dest: '/myredditall/towerghostfordestiny.com/www/locale',
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
		exclusions: [ 'resources','assets','css','data','js','lib','res','spec','templates', '*.xml', '*.png', '*.html' ]
	  }
	});

	grunt.loadNpmTasks('grunt-ftpush');
};
