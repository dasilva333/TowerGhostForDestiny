/*
 * jQuery Touch Gestures
 * @version 1.1
 * @ported > QuoJS
 * @copyright QuoJS 2.2.0 (c) 2011, 2012 Javi Jiménez Villar (@soyjavi)
 * @see http://quojs.tapquo.com
 */
(function($) {
    var CURRENT_TOUCH, FIRST_TOUCH, GESTURE, GESTURES, HOLD_DELAY, TOUCH_TIMEOUT, _angle, _capturePinch, _captureRotation, _cleanGesture, _distance, _fingersPosition, _getTouches, _hold, _isSwipe, _listenTouches, _onTouchEnd, _onTouchMove, _onTouchStart, _parentIfText, _swipeDirection, _trigger, _current;

    _current = null;
    GESTURE = {};
    FIRST_TOUCH = [];
    CURRENT_TOUCH = [];
    TOUCH_TIMEOUT = void 0;
    HOLD_DELAY = 650;
    GESTURES = ["singleTap", "doubleTap", "hold", "swipe", "swiping", "swipeLeft", "swipeRight", "swipeUp", "swipeDown", "rotate", "rotating", "rotateLeft", "rotateRight", "pinch", "pinching", "pinchIn", "pinchOut", "drag", "dragLeft", "dragRight", "dragUp", "dragDown"];

    $.each({ touch: "touchstart", tap: "tap" }, function(event, shortcut) {
        $.fn[event] = function(callback) {
            return $(document.body).on(shortcut, this, callback);
        };
    });

    $.each(GESTURES, function(k, event) {
        $.fn[event] = function (callback) {
            return this.on(event, this.selector, callback);
        };
    });

    $(document).ready(function () {
        return _listenTouches();
    });

    _listenTouches = function () {
        return $(document.body)
            .on("touchstart", _onTouchStart)
            .on("touchmove", _onTouchMove)
            .on("touchend", _onTouchEnd)
            .on("touchcancel", _cleanGesture);
    };

    _onTouchStart = function (event) {
        var delta, fingers, now, touches;
        now = Date.now();
        delta = now - (GESTURE.last || now);
        TOUCH_TIMEOUT && clearTimeout(TOUCH_TIMEOUT);
        touches = _getTouches(event);
        fingers = touches.length;
        FIRST_TOUCH = _fingersPosition(touches, fingers);
        GESTURE.el = $(_parentIfText(touches[0].target));
        GESTURE.fingers = fingers;
        GESTURE.last = now;
        if (fingers === 1) {
            GESTURE.isDoubleTap = delta > 0 && delta <= 250;
            return setTimeout(_hold, HOLD_DELAY);
        } else if (fingers === 2) {
            GESTURE.initial_angle = parseInt(_angle(FIRST_TOUCH), 10);
            GESTURE.initial_distance = parseInt(_distance(FIRST_TOUCH), 10);
            GESTURE.angle_difference = 0;
            return GESTURE.distance_difference = 0;
        }
    };

    _onTouchMove = function (event) {
        var fingers, touches;
        if (GESTURE.el) {
            touches = _getTouches(event);
            fingers = touches.length;
            if (fingers === GESTURE.fingers) {
                CURRENT_TOUCH = _fingersPosition(touches, fingers);
                if (_isSwipe(event)) {
                    _trigger("swiping");
                }
                if (fingers === 2) {
                    _captureRotation();
                    _capturePinch();
                    event.preventDefault();
                }
            } else {
                _cleanGesture();
            }
        }
        return true;
    };

    _isSwipe = function () {
        var move_horizontal, move_vertical, ret;
        ret = false;
        if (CURRENT_TOUCH[0]) {
            move_horizontal = Math.abs(FIRST_TOUCH[0].x - CURRENT_TOUCH[0].x) > 30;
            move_vertical = Math.abs(FIRST_TOUCH[0].y - CURRENT_TOUCH[0].y) > 30;
            ret = GESTURE.el && (move_horizontal || move_vertical);
        }
        return ret;
    };

    _onTouchEnd = function () {
        var anyevent, drag_direction, pinch_direction, rotation_direction, swipe_direction;
        if (GESTURE.fingers === 1) {
            if (_isSwipe()) {
                _trigger("swipe");
                swipe_direction = _swipeDirection(FIRST_TOUCH[0].x, CURRENT_TOUCH[0].x, FIRST_TOUCH[0].y, CURRENT_TOUCH[0].y);
                _trigger("swipe" + swipe_direction);
                return _cleanGesture();
            } else {
                if (GESTURE.isDoubleTap) {
                    _trigger("doubleTap");
                    return _cleanGesture();
                } else {
                    TOUCH_TIMEOUT = setTimeout(function () {
                        _trigger("singleTap");
                        _cleanGesture();
                    }, 250);
                    return TOUCH_TIMEOUT;
                }
            }
        } else if (GESTURE.fingers === 2) {
            anyevent = false;

            if (GESTURE.angle_difference !== 0) {
                _trigger("rotate", {
                    angle: GESTURE.angle_difference
                });
                rotation_direction = GESTURE.angle_difference > 0 ? "rotateRight" : "rotateLeft";
                _trigger(rotation_direction, {
                    angle: GESTURE.angle_difference
                });
                anyevent = true;
            }

            if (GESTURE.distance_difference !== 0) {
                _trigger("pinch", {
                    angle: GESTURE.distance_difference
                });
                pinch_direction = GESTURE.distance_difference > 0 ? "pinchOut" : "pinchIn";
                _trigger(pinch_direction, {
                    distance: GESTURE.distance_difference
                });
                anyevent = true;
            }

            if (!anyevent && CURRENT_TOUCH[0]) {
                if (Math.abs(FIRST_TOUCH[0].x - CURRENT_TOUCH[0].x) > 10 || Math.abs(FIRST_TOUCH[0].y - CURRENT_TOUCH[0].y) > 10) {
                    _trigger("drag");
                    drag_direction = _swipeDirection(FIRST_TOUCH[0].x, CURRENT_TOUCH[0].x, FIRST_TOUCH[0].y, CURRENT_TOUCH[0].y);
                    _trigger("drag" + drag_direction);
                }
            }
            return _cleanGesture();
        }
    };

    _fingersPosition = function (touches, fingers) {
        var result = [],
            i = 0;
        touches = touches[0].targetTouches ? touches[0].targetTouches : touches;
        while (i < fingers) {
            result.push({
                x: touches[i].pageX,
                y: touches[i].pageY
            });
            i++;
        }
        return result;
    };

    _captureRotation = function () {
        var angle, diff, i, symbol;
        angle = parseInt(_angle(CURRENT_TOUCH), 10);
        diff = parseInt(GESTURE.initial_angle - angle, 10);
        if (Math.abs(diff) > 20 || GESTURE.angle_difference !== 0) {
            i = 0;
            symbol = GESTURE.angle_difference < 0 ? "-" : "+";
            while (Math.abs(diff - GESTURE.angle_difference) > 90 && i++ < 10) {
                eval("diff " + symbol + "= 180;");
            }
            GESTURE.angle_difference = parseInt(diff, 10);
            return _trigger("rotating", {
                angle: GESTURE.angle_difference
            });
        }
    };

    _capturePinch = function () {
        var diff, distance;
        distance = parseInt(_distance(CURRENT_TOUCH), 10);
        diff = GESTURE.initial_distance - distance;
        if (Math.abs(diff) > 10) {
            GESTURE.distance_difference = diff;
            return _trigger("pinching", {
                distance: diff
            });
        }
    };

    _trigger = function (type, params) {
        if (GESTURE.el) {
            params = params || {};
            if (CURRENT_TOUCH[0]) {
                params.iniTouch = (GESTURE.fingers > 1 ? FIRST_TOUCH : FIRST_TOUCH[0]);
                params.currentTouch = (GESTURE.fingers > 1 ? CURRENT_TOUCH : CURRENT_TOUCH[0]);
            }
            return GESTURE.el.trigger(type, params);
        }
    };

    _cleanGesture = function () {
        FIRST_TOUCH = [];
        CURRENT_TOUCH = [];
        GESTURE = {};
        return clearTimeout(TOUCH_TIMEOUT);
    };

    _angle = function (touches_data) {
        var A = touches_data[0],
            B = touches_data[1],
            angle = Math.atan((B.y - A.y) * -1 / (B.x - A.x)) * (180 / Math.PI);
        return (angle < 0) ? angle + 180 : angle;
    };

    _distance = function (touches_data) {
        var A = touches_data[0],
            B = touches_data[1];
        return Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y)) * -1;
    };

    _getTouches = function (event) {
        var e = event.originalEvent || event;
        return e.touches || [e];
    };

    _parentIfText = function (node) {
        return ("tagName" in node) ? node : node.parentNode;
    };

    _swipeDirection = function (x1, x2, y1, y2) {
        if (Math.abs(x1 - x2) >= Math.abs(y1 - y2)) {
            return (x1 - x2 > 0) ? "Left" : "Right";
        } else {
            return (y1 - y2 > 0) ? "Up" : "Down";
        }
    };

    _hold = function() {
        if (GESTURE.last && (Date.now() - GESTURE.last >= HOLD_DELAY)) {
            _trigger("hold");
            return _cleanGesture();
        }
    };
}(jQuery));