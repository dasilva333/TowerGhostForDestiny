module.exports = function(grunt) {
	grunt.config.set('jag',{
      definitions: {
        files: {
			'../www/resources/en/definitions.json': '../www/resources/en/definitions.json.gz',
			'../www/resources/de/definitions.json': '../www/resources/de/definitions.json.gz',
			'../www/resources/es/definitions.json': '../www/resources/es/definitions.json.gz',
			'../www/resources/fr/definitions.json': '../www/resources/fr/definitions.json.gz',
			'../www/resources/it/definitions.json': '../www/resources/it/definitions.json.gz',
			'../www/resources/ja/definitions.json': '../www/resources/ja/definitions.json.gz',
			'../www/resources/pt-br/definitions.json': '../www/resources/pt-br/definitions.json.gz',
        }
      }
    });
};
	