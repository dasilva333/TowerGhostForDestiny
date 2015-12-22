(function($, ko) {
  'use strict';
  // TODO: Hook into image load event before loading others...
  function KoLazyLoad() {
    var self = this;
    
    var updatebit = ko.observable(true).extend({ throttle: 50 });

    var handlers = {
      img: updateImage
    };
    
    function flagForLoadCheck() {
      updatebit(!updatebit());
    }
    
    $(window).on('scroll', flagForLoadCheck);
    $(window).on('resize', flagForLoadCheck);

    function isInViewport(element) {
      var rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.right > 0 && 
        rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
        rect.left < (window.innerWidth || document.documentElement.clientWidth);
    }
    
    function updateImage(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var value = ko.unwrap(valueAccessor());
      if(isInViewport(element)) {
        element.src = value;
        $(element).data('kolazy', true);
      }
    }
    
    function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var initArgs = arguments;
      updatebit.subscribe(function() {
        update.apply(self, initArgs);
      });
    }
    
    function update(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var $element = $(element);
    
      if ($element.is(':hidden') || $element.css('visibility') == 'hidden' || $element.data('kolazy')) {
        return;
      }
    
      var handlerName = element.tagName.toLowerCase();
      if (handlers.hasOwnProperty(handlerName)) {
        return handlers[handlerName].apply(this, arguments);
      } else {
        throw new Error('No lazy handler defined for "' + handlerName + '"');
      }
    }
    
    return {
      handlers: handlers,
      init: init,
      update: update
    }
  }
  
  ko.bindingHandlers.lazyload = new KoLazyLoad();
  
})(jQuery, ko);
