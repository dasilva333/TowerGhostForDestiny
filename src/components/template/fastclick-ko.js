define(['knockout', "fastclick-lib"], function(ko, FastClick) {

	ko.bindingHandlers.fastclick = {
	    init: function(element, valueAccessor) {
	        FastClick.attach(element);
	        return ko.bindingHandlers.click.init.apply(this, arguments);
	    }
	};

});
	