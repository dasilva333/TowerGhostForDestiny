define(

	[
		"text"
	],

	function (text) {

		var parseJSON = JSON && JSON.parse ? JSON.parse : function (val) {
			return eval("(" + val + ")"); //quick and dirty
		};

		return {

			load : function (name, req, load, config) {

				if (!config.isBuild) {
					req(["text!" + name], function (val) {
						load(parseJSON(val));
					});
				}

				else {
					load("");
				}
			},

			loadFromFileSystem : function (plugin, name) {

				var fs = nodeRequire("fs");
				var file = require.toUrl(name);
				var val = fs.readFileSync(file).toString();

				val = 'define("' + plugin + '!' + name  + '", function () {\nreturn ' + val + ';\n});\n';

				return val;
			},

			write: function (pluginName, moduleName, write) {
				write(this.loadFromFileSystem(pluginName, moduleName));
			}

		};
	}
);