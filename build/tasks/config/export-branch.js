module.exports = function(grunt) {
	grunt.config.set('export-branch',{
      ios: {
        branch: "ios"
      },
	  android: {
        branch: "android"
      },
	  winphone: {
        branch: "windows-phone"
      },
	  share: {
        branch: "static-share"
      }
    });

};
	