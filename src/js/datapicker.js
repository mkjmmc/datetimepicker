/* =========================================================
 * datapicker.js
 * =========================================================
 * Copyright 2015 mao kejia
 *
 * Project URL : https://github.com/mkjmmc/datetimepicker/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * $('#id').datapicker()
 * 
 * ========================================================= */
!function ($) {

    // Add ECMA262-5 Array methods if not supported natively (IE8)
    if (!('indexOf' in Array.prototype)) {
        Array.prototype.indexOf = function (find, i) {
            if (i === undefined) i = 0;
            if (i < 0) i += this.length;
            if (i < 0) i = 0;
            for (var n = this.length; i < n; i++) {
                if (i in this && this[i] === find) {
                    return i;
                }
            }
            return -1;
        }
    }

    // CSS transform变换应用
    var transform = function (element, value, key) {
        key = key || "transform";
        ["-moz-", "-o-", "-ms-", "-webkit-", ""].forEach(function (prefix) {
            element.style[prefix + key] = value;
        });

        return element;
    }

    function elementOrParentIsFixed(element) {
        var $element = $(element);
        var $checkElements = $element.add($element.parents());
        var isFixed = false;
        $checkElements.each(function () {
            if ($(this).css('position') === 'fixed') {
                isFixed = true;
                return false;
            }
        });
        return isFixed;
    }

    // Picker object
    var Datapicker = function (element, options) {
        var that = this;
        this.element = $(element);
        this.container = options.container || 'body';
        this.lineHeight = options.lineHeight || this.element.data('date-lineHeight') || 30;
        this.deg = options.deg || this.element.data('date-deg') || 20;
        this.width = options.width || this.element.width();
        this.selectedValue = null;
        this.selectedItem = null;
        this.selectedIndex = null;
        // display inline
        this.isInline = false;
        this.isVisible = false;
        this.isInput = this.element.is('input');
        this.isSelect = this.element.is('select');

        // events
        this._attachEvents();
        this.clickedOutside = function (e) {
            // Clicked outside the datetimepicker, hide it
            if ($(e.target).closest('.datapicker').length === 0) {
                that.hide();
            }
        }

        // template
        var template = DPGlobal.template;

        // picker
        this.picker = $(template)
            .appendTo(this.isInline ? this.element : this.container) // 'body')
            .on({
                click: $.proxy(this.click, this),
                mousedown: $.proxy(this.mousedown, this),
                mousewheel: $.proxy(this.mousewheel, this)
            });
        if (this.width != 'auto') {
            this.picker.width(this.width);
        }

        this.scroller = this.picker.find('.picker-scroller');
        this.clone = this.picker.find('.clone-scroller');

        // click outside event
        $(document).on('mousedown', this.clickedOutside);

        // autoclose
        this.autoclose = false;

        // display view
        this.update();
    };
    Datapicker.prototype = {
        constructor: Datapicker,

        _events: [],
        _attachEvents: function () {
            this._detachEvents();
            if (this.isInput || this.isSelect) { // single input
                this._events = [
                    [this.element, {
                        focus: $.proxy(this.show, this),
                        keyup: $.proxy(this.update, this),
                        keydown: $.proxy(this.keydown, this)
                    }]
                ];
            }
            else if (this.element.is('div')) {  // inline datetimepicker
                this.isInline = true;
            }
            else {
                this._events = [
                    [this.element, {
                        click: $.proxy(this.show, this)
                    }]
                ];
            }
            for (var i = 0, el, ev; i < this._events.length; i++) {
                el = this._events[i][0];
                ev = this._events[i][1];
                el.on(ev);
            }
        },

        _detachEvents: function () {
            for (var i = 0, el, ev; i < this._events.length; i++) {
                el = this._events[i][0];
                ev = this._events[i][1];
                el.off(ev);
            }
            this._events = [];
        },
        show: function (e) {
            this.picker.show();
            this.height = this.component ? this.component.outerHeight() : this.element.outerHeight();
            if (this.forceParse) {
                this.update();
            }
            this.place();
            $(window).on('resize', $.proxy(this.place, this));
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            this.isVisible = true;
            this.element.trigger({
                type: 'show'
            });
        },

        hide: function (e) {
            if (!this.isVisible) return;
            if (this.isInline) return;
            this.picker.hide();
            $(window).off('resize', this.place);
            if (!this.isInput) {
                $(document).off('mousedown', this.hide);
            }

            if (
                this.forceParse &&
                (
                    this.isInput && this.element.val() ||
                    this.hasInput && this.element.find('input').val()
                )
            )
                this.setValue();
            this.isVisible = false;
            this.element.trigger({
                type: 'hide',
                date: this.date
            });
        },

        fill: function () {
            var that = this;
            // 填充数据
            if (this.isSelect) {
                var options = this.element.find('option');
                var html = [];
                var clsName;
                for (var i = 0; i < options.length; i++) {
                    clsName = '';
                    html.push('<span class="option' + clsName + '" data-value="' + options.eq(i).val() + '">' + options.eq(i).text() + '</span>');
                }

                // 填充数据
                this.clone.html(html.join(''));
                this.scroller.html(html.join(''));

                // 计算角度
                var unit = this.deg / this.lineHeight;
                unit = Math.round(unit / this.deg) * this.deg;
                transform(this.scroller[0], "translateZ(-90px) rotateX(" + unit + "deg)")

                // 设置显示区域
                this.clone.css({
                    "margin-top": (this.lineHeight * 3) + "px",
                    "margin-bottom": (this.lineHeight * 3) + "px"
                });

                // 设置显示区域
                this.scroller.css({
                    "padding-top": (this.lineHeight * 3) + "px",
                    "padding-bottom": (this.lineHeight * 3) + "px"
                });

                this.scroller.find(".option").each(function (index, $option) {
                    $option = $($option);
                    transform($option[0], "rotateX(-" + (that.deg * index) + "deg) translateZ(90px)");
                    $option.css('line-height', that.lineHeight + 'px');
                    //$option.css("-webkit-transform", "rotateX(-" + (this.deg * index) + "deg) translateZ(90px)");
                    if (index > 9) {
                        $option.hide();
                    }
                });

                this.setValue(this.element.find('option').index('[value=' + this.element.val() + ']'));

                //this.setValue(this.element.find().val())
            }
            this.place();
        },
        setValue: function (index) {
            // set value
            this.selectedIndex = index;
            this.selectedItem = this.element.find('option').eq(index);
            this.selectedValue = this.selectedItem.val();
            this.element.val( this.selectedValue );

            // 开始旋转
            var unit = ( this.selectedIndex) * this.deg;
            transform(this.scroller[0], "translateZ(-90px) rotateX(" + unit + "deg)");
            // 显示和隐藏项
            var $options = this.scroller.find('.option');
            $options.hide()
            if (index > 4) {
                for (i = index - 4; i < (index + 4); i++) {
                    $options.eq(i).show();
                }
            }
            else{
                for (i =0; i < (index + 9); i++) {
                    $options.eq(i).show();
                }
            }

        },
        mousewheel: function (e) {
            // this.selectedIndex+= event.deltaY;
            this.setValue(this.selectedIndex - e.deltaY);
            //transform(this.picker.find('.picker-scroller')[0], "translateZ(-90px) rotateX(" + 20 + "deg)")
            //var mtop = parseInt($('.datetimepicker-selecter').css('margin-top'));
//			index += event.deltaY;
//			$(this).find('.datetimepicker-selecter').animate({
//				marginTop: (35*index)+'px'
//				},0)
////			transform($('.datetimepicker-selecter')[0], 'translateY('+(35*index)+'px'+')')
//		//$('.datetimepicker-selecter').css('margin-top', (mtop+35*event.deltaY)+'px');
//			console.log(event.deltaX, event.deltaY, event.deltaFactor);
        },
        click: function (e) {
        },
        place: function () {
            if (this.isInline) return;

            if (!this.zIndex) {
                var index_highest = 0;
                $('div').each(function () {
                    var index_current = parseInt($(this).css('zIndex'), 10);
                    if (index_current > index_highest) {
                        index_highest = index_current;
                    }
                });
                this.zIndex = index_highest + 10;
            }

            var offset, top, left, containerOffset;
            if (this.container instanceof $) {
                containerOffset = this.container.offset();
            } else {
                containerOffset = $(this.container).offset();
            }

            if (this.component) {
                offset = this.component.offset();
                left = offset.left;
                if (this.pickerPosition == 'bottom-left' || this.pickerPosition == 'top-left') {
                    left += this.component.outerWidth() - this.picker.outerWidth();
                }
            } else {
                offset = this.element.offset();
                left = offset.left;
            }

            var bodyWidth = document.body.clientWidth || window.innerWidth;
            if (left + 220 > bodyWidth) {
                left = bodyWidth - 220;
            }

            if (this.pickerPosition == 'top-left' || this.pickerPosition == 'top-right') {
                top = offset.top - this.picker.outerHeight();
            } else {
                top = offset.top + this.height;
            }

            top = top - containerOffset.top;
            left = left - containerOffset.left;

            this.picker.css({
                top: top,
                left: left,
                zIndex: this.zIndex
            });
        },
        update: function () {
            var date, fromArgs = false;
            if (arguments && arguments.length && (typeof arguments[0] === 'string' || arguments[0] instanceof Date)) {
                date = arguments[0];
                fromArgs = true;
            } else {
                date = (this.isInput ? this.element.val() : this.element.find('input').val()) || this.element.data('date') || this.initialDate;
                if (typeof date == 'string' || date instanceof String) {
                    date = date.replace(/^\s+|\s+$/g, '');
                }
            }
            if (fromArgs) this.setValue();
            this.fill();
        },

    };

    var old = $.fn.datapicker;
    $.fn.datapicker = function (option) {
        var args = Array.apply(null, arguments);
        args.shift();
        var internal_return;
        this.each(function () {
            var $this = $(this),
                data = $this.data('datapicker'),
                options = typeof option == 'object' && option;
            if (!data) {
                $this.data('datapicker', (data = new Datapicker(this, $.extend({}, $.fn.datapicker.defaults, options))));
            }
            if (typeof option == 'string' && typeof data[option] == 'function') {
                internal_return = data[option].apply(data, args);
                if (internal_return !== undefined) {
                    return false;
                }
            }
        });
        if (internal_return !== undefined)
            return internal_return;
        else
            return this;
    };

    $.fn.datapicker.defaults = {};
    $.fn.datapicker.Constructor = Datapicker;

    var DPGlobal = {
        template: '<div class="datapicker">' +
        '<div class="clone-scroller"></div>' +
        '<div class="picker-up"></div>' +
        '<div class="picker-down"></div>' +
        '<div class="picker-scroller"></div>' +
        '</div>'

    };
    $.fn.datapicker.DPGlobal = DPGlobal;

    /* DATETIMEPICKER NO CONFLICT
     * =================== */

    $.fn.datapicker.noConflict = function () {
        $.fn.datapicker = old;
        return this;
    };

    /* DATETIMEPICKER DATA-API
     * ================== */

    $(document).on(
        'focus.datapicker.data-api click.datapicker.data-api',
        '[data-provide="datapicker"]',
        function (e) {
            var $this = $(this);
            if ($this.data('datapicker')) return;
            e.preventDefault();
            // component click requires us to explicitly show it
            $this.datapicker('show');
        }
    );
    $(function () {
        $('[data-provide="datapicker-inline"]').datapicker();
    });

}(window.jQuery);