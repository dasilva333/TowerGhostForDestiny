tgd.imageErrorHandler = function(src, element) {
    return function() {
        if (element && element.src && element.src !== "") {
            var source = element.src;
            if (source.indexOf(tgd.remoteImagePath) == -1) {
                element.src = tgd.remoteImagePath + src;
            }
        }
    };
};

tgd.getEventDelegate = function(target, selector) {
    var delegate;
    while (target && target != this.el) {
        delegate = $(target).filter(selector)[0];
        if (delegate) {
            return delegate;
        }
        target = target.parentNode;
    }
    return undefined;
};

window.ko.bindingHandlers.itemImageHandler = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var icon = ko.unwrap(valueAccessor());
        element.src = icon;
        element.onerror = tgd.imageErrorHandler(icon, element);
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var icon = ko.unwrap(valueAccessor());
        element.src = icon;
        element.onerror = tgd.imageErrorHandler(icon, element);
    }
};

window.ko.bindingHandlers.refreshableSection = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        //tgd.localLog(element);
        //event: { mouseenter: $root.toggleSectionRefresh, mouseleave: $root.toggleSectionRefresh }, css: { titleHover: $root.showSectionRefresh }
        if (isMobile) {
            return;
        }
        $(element)
            .bind("mouseenter", function() {
                $(this).addClass("titleHover");
                $(this).find(".titleRefresh").show();
            })
            .bind("mouseleave", function() {
                $(this).removeClass("titleHover");
                $(this).find(".titleRefresh").hide();
            });
    }
};

window.ko.bindingHandlers.refreshableEmblem = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (isMobile) {
            return;
        }
        $(element)
            .bind("mouseenter", function() {
                $(this).addClass("emblemHover");
                //$(this).find(".emblemRefresh").show();
            })
            .bind("mouseleave", function() {
                $(this).removeClass("emblemHover");
                //$(this).find(".emblemRefresh").hide();
            });
    }
};

window.ko.bindingHandlers.scrollToView = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        Hammer(element, {
                time: 2000
            })
            .on("tap", function(ev) {
                var target = tgd.getEventDelegate(ev.target, ".mobile-characters");
                var index = $(target).index(),
                    distance = $(".profile:eq(" + index + ")");
                if (distance.length > 0) {
                    distance = distance.position().top - 50;
                    app.scrollTo(distance);
                }
            })
            .on("press", function(ev) {
                var target = tgd.getEventDelegate(ev.target, ".mobile-characters-image");
                var item = ko.contextFor(target).$data;
                $.toaster({
                    priority: 'info',
                    title: 'Info',
                    message: app.activeText().this_icon + item.uniqueName(),
                    settings: {
                        timeout: tgd.defaults.toastTimeout
                    }
                });
            });
    }
};

window.ko.bindingHandlers.fastclick = {
    init: function(element, valueAccessor) {
        FastClick.attach(element);
        return ko.bindingHandlers.click.init.apply(this, arguments);
    }
};

window.ko.bindingHandlers.moveItem = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        Hammer(element, {
                time: 2000
            })
            .on("tap", function(ev) {
                tgd.localLog("item.tap");
                var target = tgd.getEventDelegate(ev.target, ".itemLink");
                if (target) {
                    var item = ko.contextFor(target).$data;
                    tgd.moveItemPositionHandler(target, item);
                }
            })
            .on("doubletap", function(ev) {
                tgd.localLog("item.doubletap");
                var target = tgd.getEventDelegate(ev.target, ".itemLink");
                if (target) {
                    var context = ko.contextFor(target);
                    if (context && "$data" in context) {
                        var item = context.$data;
                        if (item.transferStatus < 2 || item.bucketType == "Subclasses") {
                            if (app.dynamicMode() === false) {
                                app.dynamicMode(true);
                                app.createLoadout();
                            }
                            tgd.localLog("double tap");
                            if (item._id > 0) {
                                app.activeLoadout().addUniqueItem({
                                    id: item._id,
                                    bucketType: item.bucketType,
                                    doEquip: false
                                });
                            } else {
                                app.activeLoadout().addGenericItem({
                                    hash: item.id,
                                    bucketType: item.bucketType,
                                    primaryStat: item.primaryStat()
                                });
                            }
                        } else {
                            $.toaster({
                                priority: 'danger',
                                title: 'Warning',
                                message: app.activeText().unable_create_loadout_for_type,
                                settings: {
                                    timeout: tgd.defaults.toastTimeout
                                }
                            });
                        }
                    }
                }
            })
            // press is actually hold 
            .on("press", function(ev) {
                tgd.localLog("item.press");
                var target = tgd.getEventDelegate(ev.target, ".itemLink");
                if (target) {
                    var context = ko.contextFor(target);
                    if (context && "$data" in context) {
                        var item = context.$data;
                        if (item && item.doEquip && app.loadoutMode() === true) {
                            item.doEquip(!item.doEquip());
                            item.markAsEquip(item, {
                                target: target
                            });
                        } else if (!isMobile) {
                            tgd.moveItemPositionHandler(target, item);
                        } else {
                            $ZamTooltips.lastElement = target;
                            $ZamTooltips.show("destinydb", "items", item.id, target);
                        }
                    }
                }
            });
    }
};