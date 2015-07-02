define(['knockout', 'text!./nav-bar.html'], function(ko, template) {

  function NavBarViewModel(params) {

    // This viewmodel doesn't do anything except pass through the 'route' parameter to the view.
    // You could remove this viewmodel entirely, and define 'nav-bar' as a template-only component.
    // But in most apps, you'll want some viewmodel logic to determine what navigation options appear.

    this.route = params.route;
	
	this.componentLoaded = function(){
		require(['dash'], function(){ console.log("dash loaded") });
	}
  }

  return { viewModel: NavBarViewModel, template: template, synchronous: true };
});
