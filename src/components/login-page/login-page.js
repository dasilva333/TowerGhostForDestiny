define(['knockout', 'text!./login-page.html', "tk_i18n", "fastclick", "bungie"],  function(ko, templateMarkup, il8n, fastclick, bungie) {

  function LoginPage(params) {
	window.bungie = bungie;
	this.openBungieWindow = function(type){
		return bungie.openWindow(type);
	}
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  LoginPage.prototype.dispose = function() { };
  
  return { viewModel: LoginPage, template: templateMarkup };

});
