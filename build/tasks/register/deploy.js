module.exports = function (grunt) {
	grunt.registerTask('deploy', [
        'ftpush'
	]);
	grunt.registerTask('deployjs', [
        'ftpush:js', 'ftpush:manifest'
	]);
};