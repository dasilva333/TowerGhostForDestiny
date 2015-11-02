/*   Original loader block  
	<script type="text/javascript" src="data/itemDefs.json"></script>
    <script type="text/javascript" src="data/statDefs.json"></script>
    <script type="text/javascript" src="data/perkDefs.json"></script>
    <script type="text/javascript" src="data/talentGridDefs.json"></script>
    <script type="text/javascript" src="data/raceDefs.json"></script>
    <script type="text/javascript" src="data/setDefs.json"></script>
    <script type="text/javascript" src="data/objectiveDefs.json"></script>
    <script type="text/javascript" src="data/tgdDefs.js"></script>
    <script type="text/javascript" src="js/utils.js"></script>
    <script type="text/javascript" src="js/buy.js"></script>
    <script charset="utf-8" type="text/javascript" src="js/locale.js"></script>
    <script type="text/javascript" src="js/version.js"></script>
    <script type="text/javascript" src="js/dependencies/modernizr.custom.js"></script>
    <script type="text/javascript" src="js/dependencies/jquery.js"></script>
    <script type="text/javascript" src="js/dependencies/jquery-ui.js"></script>
    <script type="text/javascript" src="js/dependencies/jquery-ui.touchpunch.js"></script>
    <script type="text/javascript" src="js/dependencies/jquery.toaster.js"></script>
    <script type="text/javascript" src="js/dependencies/idle-timer.min.js"></script>
    <script type="text/javascript" src="js/dependencies/hammer.js"></script>
    <script type="text/javascript" src="js/dependencies/bootstrap.js"></script>
    <script type="text/javascript" src="js/dependencies/bootstrap-dialog.js"></script>
    <script type="text/javascript" src="js/dependencies/knockout.js"></script>
    <script type="text/javascript" src="js/dependencies/knockout-sortable.js"></script>
    <script type="text/javascript" src="js/dependencies/underscore-min.js"></script>
    <script type="text/javascript" src="js/dependencies/fastclick.js"></script>
    <script type="text/javascript" src="js/dependencies/analytics.js"></script>
    <script type="text/javascript" src="js/firefox-xhr.js"></script>
    <script type="text/javascript" src="scripts/bungie.js"></script>
    <script type="text/javascript" src="js/loadouts.js"></script>
    <script type="text/javascript" src="js/Profile.js"></script>
    <script type="text/javascript" src="js/Item.js"></script>
    <script type="text/javascript" src="js/app.js"></script>
    <script type="text/javascript" src="js/ga.js"></script>
    <script type="text/javascript" src="js/tooltips.min.js"></script>
	
    <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css">
    <link rel="stylesheet" type="text/css" href="css/style.css">
    <link rel="stylesheet" type="text/css" href="css/tooltip.css">
    <link rel="stylesheet" type="text/css" href="css/style_new.css">
	*/

module.exports = function(grunt) {
	grunt.config.set('jsonmanifest',{
      generate: {
        options: {
          basePath: '../www/',
          exclude: [],
          //load all found assets
          loadall: true,
          //manually add files to the manifest
          files: {},
          //manually define the files that should be injected into the page
          load: [],
          // root location of files to be loaded in the load array.
          root: "./"
        },
        src: [
			'data/*.json',
			'data/*.js',
			'scripts/*.js',
			'js/utils.js',
			'js/buy.js',
			'js/locale.js',
			'js/version.js',
			'js/dependencies/cordova-app-loader-complete.js',
			'js/dependencies/underscore-min.js',
			'js/dependencies/jquery.js',
			'js/dependencies/jquery-ui.js',
			'js/dependencies/jquery-ui.touchpunch.js',
			'js/dependencies/jquery.toaster.js',
			'js/dependencies/bootstrap.js',
			'js/dependencies/bootstrap-dialog.js',
			'js/dependencies/knockout.js',
			'js/dependencies/knockout-sortable.js',
			'js/dependencies/hammer.js',
			'js/dependencies/idle-timer.min.js',
			'js/dependencies/fastclick.js',
			'js/dependencies/analytics.js',
			'js/firefox-xhr.js',
			'js/loadouts.js',
			'js/Profile.js',
			'js/Item.js',
			'js/app.js',
			'js/ga.js',
			'js/tooltips.min.js',
			'js/autoupdate.js',
            'css/bootstrap.min.css',
			'css/style.css',
			'css/tooltip.css',
			'css/style_new.css',
        ],
        dest: ['../www/manifest.json']
      }
    });

};
	