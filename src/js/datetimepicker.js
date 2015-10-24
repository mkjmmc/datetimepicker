/* =========================================================
 * datetimepicker.js
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

  function elementOrParentIsFixed (element) {
    var $element = $(element);
    var $checkElements = $element.add($element.parents());
    var isFixed = false;
    $checkElements.each(function(){
      if ($(this).css('position') === 'fixed') {
        isFixed = true;
        return false;
      }
    });
    return isFixed;
  }

  function UTCDate() {
    return new Date(Date.UTC.apply(Date, arguments));
  }

  function UTCToday() {
    var today = new Date();
    return UTCDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), today.getUTCHours(), today.getUTCMinutes(), today.getUTCSeconds(), 0);
  }

  // Picker object
  var Datetimepicker = function (element, options) {
    var that = this;

    this.element = $(element);
	
    // add container for single page application
    // when page switch the datetimepicker div will be removed also.
    this.container = options.container || 'body';
    this.language = options.language || this.element.data('date-language') || 'en';
    this.language = this.language in dates ? this.language : this.language.split('-')[0]; // fr-CA fallback to fr
    this.language = this.language in dates ? this.language : 'en';
    this.isRTL = dates[this.language].rtl || false;
    this.formatType = options.formatType || this.element.data('format-type') || 'standard';
    this.format = DPGlobal.parseFormat(options.format || this.element.data('date-format') || dates[this.language].format || DPGlobal.getDefaultFormat(this.formatType, 'input'), this.formatType);
    this.isInline = false;
    this.isVisible = false;
    this.isInput = this.element.is('input');


    this._attachEvents();
    this.clickedOutside = function (e) {
        // Clicked outside the datetimepicker, hide it
        if ($(e.target).closest('.datetimepicker').length === 0) {
            that.hide();
        }
    }
	var template = DPGlobal.template;
/*    while (template.indexOf('{iconType}') !== -1) {
      template = template.replace('{iconType}', this.icontype);
    }
    while (template.indexOf('{leftArrow}') !== -1) {
      template = template.replace('{leftArrow}', this.icons.leftArrow);
    }
    while (template.indexOf('{rightArrow}') !== -1) {
      template = template.replace('{rightArrow}', this.icons.rightArrow);
    }*/

	this.picker = $(template)
      .appendTo(this.isInline ? this.element : this.container) // 'body')
      .on({
        click:     $.proxy(this.click, this),
        mousedown: $.proxy(this.mousedown, this)
      });
	
    $(document).on('mousedown', this.clickedOutside);
    this.autoclose = false;
	
	
	this.startDate = -Infinity;
    this.endDate = Infinity;

    this.fillYears();
    this.fillMonths();
    this.update();
  };
  Datetimepicker.prototype = {
    constructor: Datetimepicker,

    _events:       [],
	    _attachEvents: function () {
      this._detachEvents();
      if (this.isInput) { // single input
        this._events = [
          [this.element, {
            focus:   $.proxy(this.show, this),
            keyup:   $.proxy(this.update, this),
            keydown: $.proxy(this.keydown, this)
          }]
        ];
      }
      else if (this.component && this.hasInput) { // component: input + button
        this._events = [
          // For components that are not readonly, allow keyboard nav
          [this.element.find('input'), {
            focus:   $.proxy(this.show, this),
            keyup:   $.proxy(this.update, this),
            keydown: $.proxy(this.keydown, this)
          }],
          [this.component, {
            click: $.proxy(this.show, this)
          }]
        ];
        if (this.componentReset) {
          this._events.push([
            this.componentReset,
            {click: $.proxy(this.reset, this)}
          ]);
        }
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
        type: 'show',
        date: this.date
      });
    },

    hide: function (e) {
      if (!this.isVisible) return;
      if (this.isInline) return;
      this.picker.hide();
      $(window).off('resize', this.place);
      //this.viewMode = this.startViewMode;
      //this.showMode();
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
	
	fillMonths: function () {
      var html = '',
        i = 0;
      while (i < 12) {
        html += '<span class="month">' + dates[this.language].monthsShort[i++] + '</span>';
      }
      this.picker.find('.datetimepicker-months .datetimepicker-selecter').html(html);
    },
	fillYears: function () {
      var html = '',
        i = 1;
      while (i < 10000) {
        html += '<span class="year">' + i++ + '年' + '</span>';
      }
      this.picker.find('.datetimepicker-years .datetimepicker-selecter').html(html);
    },

    fill: function () {
      if (this.date == null || this.viewDate == null) {
        return;
      }
      var d = new Date(this.viewDate),
        year = d.getUTCFullYear(),
        month = d.getUTCMonth(),
        dayMonth = d.getUTCDate(),
        hours = d.getUTCHours(),
        minutes = d.getUTCMinutes(),
        startYear = this.startDate !== -Infinity ? this.startDate.getUTCFullYear() : -Infinity,
        startMonth = this.startDate !== -Infinity ? this.startDate.getUTCMonth() + 1 : -Infinity,
        endYear = this.endDate !== Infinity ? this.endDate.getUTCFullYear() : Infinity,
        endMonth = this.endDate !== Infinity ? this.endDate.getUTCMonth() + 1 : Infinity,
        currentDate = (new UTCDate(this.date.getUTCFullYear(), this.date.getUTCMonth(), this.date.getUTCDate())).valueOf(),
        today = new Date();
//      this.picker.find('.datetimepicker-days thead th:eq(1)')
//        .text(dates[this.language].months[month] + ' ' + year);
//      if (this.formatViewType == 'time') {
//        var formatted = this.getFormattedDate();
//        this.picker.find('.datetimepicker-hours thead th:eq(1)').text(formatted);
//        this.picker.find('.datetimepicker-minutes thead th:eq(1)').text(formatted);
//      } else {
//        this.picker.find('.datetimepicker-hours thead th:eq(1)')
//          .text(dayMonth + ' ' + dates[this.language].months[month] + ' ' + year);
//        this.picker.find('.datetimepicker-minutes thead th:eq(1)')
//          .text(dayMonth + ' ' + dates[this.language].months[month] + ' ' + year);
//      }
//      this.picker.find('tfoot th.today')
//        .text(dates[this.language].today)
//        .toggle(this.todayBtn !== false);
//      this.updateNavArrows();
      this.fillMonths();
      /*var prevMonth = UTCDate(year, month, 0,0,0,0,0);
       prevMonth.setUTCDate(prevMonth.getDate() - (prevMonth.getUTCDay() - this.weekStart + 7)%7);*/
      var prevMonth = UTCDate(year, month, 1, 0, 0, 0, 0),
        day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
      var nextMonth = new Date(prevMonth);
      nextMonth.setUTCDate(nextMonth.getUTCDate() + day);
      nextMonth = nextMonth.valueOf();
      var html = [];
      var clsName;
      while (prevMonth.valueOf() < nextMonth) {
        clsName = '';
        if (this.todayHighlight &&
          prevMonth.getUTCFullYear() == today.getFullYear() &&
          prevMonth.getUTCMonth() == today.getMonth() &&
          prevMonth.getUTCDate() == today.getDate()) {
          clsName += ' today';
        }
        if (prevMonth.valueOf() == currentDate) {
          clsName += ' active';
        }
        if ((prevMonth.valueOf() + 86400000) <= this.startDate || prevMonth.valueOf() > this.endDate ||
          $.inArray(prevMonth.getUTCDay(), this.daysOfWeekDisabled) !== -1) {
          clsName += ' disabled';
        }
        html.push('<td class="day' + clsName + '">' + prevMonth.getUTCDate() + '</td>');
        prevMonth.setUTCDate(prevMonth.getUTCDate() + 1);
      }
      this.picker.find('.datetimepicker-days .datetimepicker-selecter').html(html.join(''));

//      prevMonth.setUTCDate(day);
//      prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.weekStart + 7) % 7);
//      var nextMonth = new Date(prevMonth);
//      nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
//      nextMonth = nextMonth.valueOf();
//      var html = [];
//      var clsName;
//      while (prevMonth.valueOf() < nextMonth) {
//        if (prevMonth.getUTCDay() == this.weekStart) {
//          html.push('<tr>');
//        }
//        clsName = '';
//        if (prevMonth.getUTCFullYear() < year || (prevMonth.getUTCFullYear() == year && prevMonth.getUTCMonth() < month)) {
//          clsName += ' old';
//        } else if (prevMonth.getUTCFullYear() > year || (prevMonth.getUTCFullYear() == year && prevMonth.getUTCMonth() > month)) {
//          clsName += ' new';
//        }
//        // Compare internal UTC date with local today, not UTC today
//        if (this.todayHighlight &&
//          prevMonth.getUTCFullYear() == today.getFullYear() &&
//          prevMonth.getUTCMonth() == today.getMonth() &&
//          prevMonth.getUTCDate() == today.getDate()) {
//          clsName += ' today';
//        }
//        if (prevMonth.valueOf() == currentDate) {
//          clsName += ' active';
//        }
//        if ((prevMonth.valueOf() + 86400000) <= this.startDate || prevMonth.valueOf() > this.endDate ||
//          $.inArray(prevMonth.getUTCDay(), this.daysOfWeekDisabled) !== -1) {
//          clsName += ' disabled';
//        }
//        html.push('<td class="day' + clsName + '">' + prevMonth.getUTCDate() + '</td>');
//        if (prevMonth.getUTCDay() == this.weekEnd) {
//          html.push('</tr>');
//        }
//        prevMonth.setUTCDate(prevMonth.getUTCDate() + 1);
//      }
//      this.picker.find('.datetimepicker-days tbody').empty().append(html.join(''));
//
//      html = [];
//      var txt = '', meridian = '', meridianOld = '';
//      var hoursDisabled = this.hoursDisabled || [];
//      for (var i = 0; i < 24; i++) {
//        if (hoursDisabled.indexOf(i) !== -1) continue;
//        var actual = UTCDate(year, month, dayMonth, i);
//        clsName = '';
//        // We want the previous hour for the startDate
//        if ((actual.valueOf() + 3600000) <= this.startDate || actual.valueOf() > this.endDate) {
//          clsName += ' disabled';
//        } else if (hours == i) {
//          clsName += ' active';
//        }
//        if (this.showMeridian && dates[this.language].meridiem.length == 2) {
//          meridian = (i < 12 ? dates[this.language].meridiem[0] : dates[this.language].meridiem[1]);
//          if (meridian != meridianOld) {
//            if (meridianOld != '') {
//              html.push('</fieldset>');
//            }
//            html.push('<fieldset class="hour"><legend>' + meridian.toUpperCase() + '</legend>');
//          }
//          meridianOld = meridian;
//          txt = (i % 12 ? i % 12 : 12);
//          html.push('<span class="hour' + clsName + ' hour_' + (i < 12 ? 'am' : 'pm') + '">' + txt + '</span>');
//          if (i == 23) {
//            html.push('</fieldset>');
//          }
//        } else {
//          txt = i + ':00';
//          html.push('<span class="hour' + clsName + '">' + txt + '</span>');
//        }
//      }
//      this.picker.find('.datetimepicker-hours td').html(html.join(''));
//
//      html = [];
//      txt = '', meridian = '', meridianOld = '';
//      var minutesDisabled = this.minutesDisabled || [];
//      for (var i = 0; i < 60; i += this.minuteStep) {
//        if (minutesDisabled.indexOf(i) !== -1) continue;
//        var actual = UTCDate(year, month, dayMonth, hours, i, 0);
//        clsName = '';
//        if (actual.valueOf() < this.startDate || actual.valueOf() > this.endDate) {
//          clsName += ' disabled';
//        } else if (Math.floor(minutes / this.minuteStep) == Math.floor(i / this.minuteStep)) {
//          clsName += ' active';
//        }
//        if (this.showMeridian && dates[this.language].meridiem.length == 2) {
//          meridian = (hours < 12 ? dates[this.language].meridiem[0] : dates[this.language].meridiem[1]);
//          if (meridian != meridianOld) {
//            if (meridianOld != '') {
//              html.push('</fieldset>');
//            }
//            html.push('<fieldset class="minute"><legend>' + meridian.toUpperCase() + '</legend>');
//          }
//          meridianOld = meridian;
//          txt = (hours % 12 ? hours % 12 : 12);
//          //html.push('<span class="minute'+clsName+' minute_'+(hours<12?'am':'pm')+'">'+txt+'</span>');
//          html.push('<span class="minute' + clsName + '">' + txt + ':' + (i < 10 ? '0' + i : i) + '</span>');
//          if (i == 59) {
//            html.push('</fieldset>');
//          }
//        } else {
//          txt = i + ':00';
//          //html.push('<span class="hour'+clsName+'">'+txt+'</span>');
//          html.push('<span class="minute' + clsName + '">' + hours + ':' + (i < 10 ? '0' + i : i) + '</span>');
//        }
//      }
//      this.picker.find('.datetimepicker-minutes td').html(html.join(''));
//
//      var currentYear = this.date.getUTCFullYear();
//      var months = this.picker.find('.datetimepicker-months')
//        .find('th:eq(1)')
//        .text(year)
//        .end()
//        .find('span').removeClass('active');
//      if (currentYear == year) {
//        // getUTCMonths() returns 0 based, and we need to select the next one
//                // To cater bootstrap 2 we don't need to select the next one
//                var offset = months.length - 12;
//        months.eq(this.date.getUTCMonth() + offset).addClass('active');
//      }
//      if (year < startYear || year > endYear) {
//        months.addClass('disabled');
//      }
//      if (year == startYear) {
//        months.slice(0, startMonth + 1).addClass('disabled');
//      }
//      if (year == endYear) {
//        months.slice(endMonth).addClass('disabled');
//      }
//
//
//      html = '';
//      year = parseInt(year / 10, 10) * 10;
//      var yearCont = this.picker.find('.datetimepicker-years')
//        .find('th:eq(1)')
//        .text(year + '-' + (year + 9))
//        .end()
//        .find('td');
//      year -= 1;
//      for (var i = -1; i < 11; i++) {
//        html += '<span class="year' + (i == -1 || i == 10 ? ' old' : '') + (currentYear == year ? ' active' : '') + (year < startYear || year > endYear ? ' disabled' : '') + '">' + year + '</span>';
//        year += 1;
//      }
//      yearCont.html(html);
      this.place();
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
        top:    top,
        left:   left,
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
          date = date.replace(/^\s+|\s+$/g,'');
        }
      }

      if (!date) {
        date = new Date();
        fromArgs = false;
      }

      this.date = DPGlobal.parseDate(date, this.format, this.language, this.formatType);

      if (fromArgs) this.setValue();

      if (this.date < this.startDate) {
        this.viewDate = new Date(this.startDate);
      } else if (this.date > this.endDate) {
        this.viewDate = new Date(this.endDate);
      } else {
        this.viewDate = new Date(this.date);
      }
      this.fill();
    },

  };

  var old = $.fn.datetimepicker;
  $.fn.datetimepicker = function (option) {
    var args = Array.apply(null, arguments);
    args.shift();
    var internal_return;
    this.each(function () {
      var $this = $(this),
        data = $this.data('datetimepicker'),
        options = typeof option == 'object' && option;
      if (!data) {
        $this.data('datetimepicker', (data = new Datetimepicker(this, $.extend({}, $.fn.datetimepicker.defaults, options))));
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

  $.fn.datetimepicker.defaults = {
  };
  $.fn.datetimepicker.Constructor = Datetimepicker;
  var dates = $.fn.datetimepicker.dates = {
    en: {
      days:        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      daysShort:   ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      daysMin:     ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
      months:      ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      meridiem:    ['am', 'pm'],
      suffix:      ['st', 'nd', 'rd', 'th'],
      today:       'Today'
    }
  };

  var DPGlobal = {
    modes:            [
      {
        clsName: 'minutes',
        navFnc:  'Hours',
        navStep: 1
      },
      {
        clsName: 'hours',
        navFnc:  'Date',
        navStep: 1
      },
      {
        clsName: 'days',
        navFnc:  'Month',
        navStep: 1
      },
      {
        clsName: 'months',
        navFnc:  'FullYear',
        navStep: 1
      },
      {
        clsName: 'years',
        navFnc:  'FullYear',
        navStep: 10
      }
    ],
    isLeapYear:       function (year) {
      return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0))
    },
    getDaysInMonth:   function (year, month) {
      return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
    },
    getDefaultFormat: function (type, field) {
      if (type == 'standard') {
        if (field == 'input')
          return 'yyyy-mm-dd hh:ii';
        else
          return 'yyyy-mm-dd hh:ii:ss';
      } else if (type == 'php') {
        if (field == 'input')
          return 'Y-m-d H:i';
        else
          return 'Y-m-d H:i:s';
      } else {
        throw new Error('Invalid format type.');
      }
    },
    validParts: function (type) {
      if (type == 'standard') {
        return /hh?|HH?|p|P|ii?|ss?|dd?|DD?|mm?|MM?|yy(?:yy)?/g;
      } else if (type == 'php') {
        return /[dDjlNwzFmMnStyYaABgGhHis]/g;
      } else {
        throw new Error('Invalid format type.');
      }
    },
    nonpunctuation: /[^ -\/:-@\[-`{-~\t\n\rTZ]+/g,
    parseFormat: function (format, type) {
      // IE treats \0 as a string end in inputs (truncating the value),
      // so it's a bad format delimiter, anyway
      var separators = format.replace(this.validParts(type), '\0').split('\0'),
        parts = format.match(this.validParts(type));
      if (!separators || !separators.length || !parts || parts.length == 0) {
        throw new Error('Invalid date format.');
      }
      return {separators: separators, parts: parts};
    },
    parseDate: function (date, format, language, type) {
      if (date instanceof Date) {
        var dateUTC = new Date(date.valueOf() - date.getTimezoneOffset() * 60000);
        dateUTC.setMilliseconds(0);
        return dateUTC;
      }
      if (/^\d{4}\-\d{1,2}\-\d{1,2}$/.test(date)) {
        format = this.parseFormat('yyyy-mm-dd', type);
      }
      if (/^\d{4}\-\d{1,2}\-\d{1,2}[T ]\d{1,2}\:\d{1,2}$/.test(date)) {
        format = this.parseFormat('yyyy-mm-dd hh:ii', type);
      }
      if (/^\d{4}\-\d{1,2}\-\d{1,2}[T ]\d{1,2}\:\d{1,2}\:\d{1,2}[Z]{0,1}$/.test(date)) {
        format = this.parseFormat('yyyy-mm-dd hh:ii:ss', type);
      }
      if (/^[-+]\d+[dmwy]([\s,]+[-+]\d+[dmwy])*$/.test(date)) {
        var part_re = /([-+]\d+)([dmwy])/,
          parts = date.match(/([-+]\d+)([dmwy])/g),
          part, dir;
        date = new Date();
        for (var i = 0; i < parts.length; i++) {
          part = part_re.exec(parts[i]);
          dir = parseInt(part[1]);
          switch (part[2]) {
            case 'd':
              date.setUTCDate(date.getUTCDate() + dir);
              break;
            case 'm':
              date = Datetimepicker.prototype.moveMonth.call(Datetimepicker.prototype, date, dir);
              break;
            case 'w':
              date.setUTCDate(date.getUTCDate() + dir * 7);
              break;
            case 'y':
              date = Datetimepicker.prototype.moveYear.call(Datetimepicker.prototype, date, dir);
              break;
          }
        }
        return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), 0);
      }
      var parts = date && date.toString().match(this.nonpunctuation) || [],
        date = new Date(0, 0, 0, 0, 0, 0, 0),
        parsed = {},
        setters_order = ['hh', 'h', 'ii', 'i', 'ss', 's', 'yyyy', 'yy', 'M', 'MM', 'm', 'mm', 'D', 'DD', 'd', 'dd', 'H', 'HH', 'p', 'P'],
        setters_map = {
          hh:   function (d, v) {
            return d.setUTCHours(v);
          },
          h:    function (d, v) {
            return d.setUTCHours(v);
          },
          HH:   function (d, v) {
            return d.setUTCHours(v == 12 ? 0 : v);
          },
          H:    function (d, v) {
            return d.setUTCHours(v == 12 ? 0 : v);
          },
          ii:   function (d, v) {
            return d.setUTCMinutes(v);
          },
          i:    function (d, v) {
            return d.setUTCMinutes(v);
          },
          ss:   function (d, v) {
            return d.setUTCSeconds(v);
          },
          s:    function (d, v) {
            return d.setUTCSeconds(v);
          },
          yyyy: function (d, v) {
            return d.setUTCFullYear(v);
          },
          yy:   function (d, v) {
            return d.setUTCFullYear(2000 + v);
          },
          m:    function (d, v) {
            v -= 1;
            while (v < 0) v += 12;
            v %= 12;
            d.setUTCMonth(v);
            while (d.getUTCMonth() != v)
              if (isNaN(d.getUTCMonth()))
                return d;
              else
                d.setUTCDate(d.getUTCDate() - 1);
            return d;
          },
          d:    function (d, v) {
            return d.setUTCDate(v);
          },
          p:    function (d, v) {
            return d.setUTCHours(v == 1 ? d.getUTCHours() + 12 : d.getUTCHours());
          }
        },
        val, filtered, part;
      setters_map['M'] = setters_map['MM'] = setters_map['mm'] = setters_map['m'];
      setters_map['dd'] = setters_map['d'];
      setters_map['P'] = setters_map['p'];
      date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
      if (parts.length == format.parts.length) {
        for (var i = 0, cnt = format.parts.length; i < cnt; i++) {
          val = parseInt(parts[i], 10);
          part = format.parts[i];
          if (isNaN(val)) {
            switch (part) {
              case 'MM':
                filtered = $(dates[language].months).filter(function () {
                  var m = this.slice(0, parts[i].length),
                    p = parts[i].slice(0, m.length);
                  return m == p;
                });
                val = $.inArray(filtered[0], dates[language].months) + 1;
                break;
              case 'M':
                filtered = $(dates[language].monthsShort).filter(function () {
                  var m = this.slice(0, parts[i].length),
                    p = parts[i].slice(0, m.length);
                  return m.toLowerCase() == p.toLowerCase();
                });
                val = $.inArray(filtered[0], dates[language].monthsShort) + 1;
                break;
              case 'p':
              case 'P':
                val = $.inArray(parts[i].toLowerCase(), dates[language].meridiem);
                break;
            }
          }
          parsed[part] = val;
        }
        for (var i = 0, s; i < setters_order.length; i++) {
          s = setters_order[i];
          if (s in parsed && !isNaN(parsed[s]))
            setters_map[s](date, parsed[s])
        }
      }
      return date;
    },
    formatDate:       function (date, format, language, type) {
      if (date == null) {
        return '';
      }
      var val;
      if (type == 'standard') {
        val = {
          // year
          yy:   date.getUTCFullYear().toString().substring(2),
          yyyy: date.getUTCFullYear(),
          // month
          m:    date.getUTCMonth() + 1,
          M:    dates[language].monthsShort[date.getUTCMonth()],
          MM:   dates[language].months[date.getUTCMonth()],
          // day
          d:    date.getUTCDate(),
          D:    dates[language].daysShort[date.getUTCDay()],
          DD:   dates[language].days[date.getUTCDay()],
          p:    (dates[language].meridiem.length == 2 ? dates[language].meridiem[date.getUTCHours() < 12 ? 0 : 1] : ''),
          // hour
          h:    date.getUTCHours(),
          // minute
          i:    date.getUTCMinutes(),
          // second
          s:    date.getUTCSeconds()
        };

        if (dates[language].meridiem.length == 2) {
          val.H = (val.h % 12 == 0 ? 12 : val.h % 12);
        }
        else {
          val.H = val.h;
        }
        val.HH = (val.H < 10 ? '0' : '') + val.H;
        val.P = val.p.toUpperCase();
        val.hh = (val.h < 10 ? '0' : '') + val.h;
        val.ii = (val.i < 10 ? '0' : '') + val.i;
        val.ss = (val.s < 10 ? '0' : '') + val.s;
        val.dd = (val.d < 10 ? '0' : '') + val.d;
        val.mm = (val.m < 10 ? '0' : '') + val.m;
      } else if (type == 'php') {
        // php format
        val = {
          // year
          y: date.getUTCFullYear().toString().substring(2),
          Y: date.getUTCFullYear(),
          // month
          F: dates[language].months[date.getUTCMonth()],
          M: dates[language].monthsShort[date.getUTCMonth()],
          n: date.getUTCMonth() + 1,
          t: DPGlobal.getDaysInMonth(date.getUTCFullYear(), date.getUTCMonth()),
          // day
          j: date.getUTCDate(),
          l: dates[language].days[date.getUTCDay()],
          D: dates[language].daysShort[date.getUTCDay()],
          w: date.getUTCDay(), // 0 -> 6
          N: (date.getUTCDay() == 0 ? 7 : date.getUTCDay()),       // 1 -> 7
          S: (date.getUTCDate() % 10 <= dates[language].suffix.length ? dates[language].suffix[date.getUTCDate() % 10 - 1] : ''),
          // hour
          a: (dates[language].meridiem.length == 2 ? dates[language].meridiem[date.getUTCHours() < 12 ? 0 : 1] : ''),
          g: (date.getUTCHours() % 12 == 0 ? 12 : date.getUTCHours() % 12),
          G: date.getUTCHours(),
          // minute
          i: date.getUTCMinutes(),
          // second
          s: date.getUTCSeconds()
        };
        val.m = (val.n < 10 ? '0' : '') + val.n;
        val.d = (val.j < 10 ? '0' : '') + val.j;
        val.A = val.a.toString().toUpperCase();
        val.h = (val.g < 10 ? '0' : '') + val.g;
        val.H = (val.G < 10 ? '0' : '') + val.G;
        val.i = (val.i < 10 ? '0' : '') + val.i;
        val.s = (val.s < 10 ? '0' : '') + val.s;
      } else {
        throw new Error('Invalid format type.');
      }
      var date = [],
        seps = $.extend([], format.separators);
      for (var i = 0, cnt = format.parts.length; i < cnt; i++) {
        if (seps.length) {
          date.push(seps.shift());
        }
        date.push(val[format.parts[i]]);
      }
      if (seps.length) {
        date.push(seps.shift());
      }
      return date.join('');
    },
    convertViewMode:  function (viewMode) {
      switch (viewMode) {
        case 4:
        case 'decade':
          viewMode = 4;
          break;
        case 3:
        case 'year':
          viewMode = 3;
          break;
        case 2:
        case 'month':
          viewMode = 2;
          break;
        case 1:
        case 'day':
          viewMode = 1;
          break;
        case 0:
        case 'hour':
          viewMode = 0;
          break;
      }

      return viewMode;
    },
    headTemplate: '<div></div>',
    contTemplate: '<div class="datetimepicker-current"></div><div class="datetimepicker-selecter"></div>',
    footTemplate: '<div></div>'
  };
  DPGlobal.template = '<div class="datetimepicker">' +
    '<div class="datetimepicker-years">' +
    DPGlobal.headTemplate +
    DPGlobal.contTemplate +
    DPGlobal.footTemplate +
    '</div>' +
    '<div class="datetimepicker-months">' +
    DPGlobal.headTemplate +
    DPGlobal.contTemplate +
    DPGlobal.footTemplate +
    '</div>' +
    '<div class="datetimepicker-days">' +
    DPGlobal.headTemplate +
    DPGlobal.contTemplate +
    DPGlobal.footTemplate +
    '</div>' +
    '<div class="datetimepicker-hours">' +
    DPGlobal.headTemplate +
    DPGlobal.contTemplate +
    DPGlobal.footTemplate +
    '</div>' +
    '<div class="datetimepicker-minutes">' +
    DPGlobal.headTemplate +
    DPGlobal.contTemplate +
    DPGlobal.footTemplate +
    '</div>' +
    '</div>';
  $.fn.datetimepicker.DPGlobal = DPGlobal;

  /* DATETIMEPICKER NO CONFLICT
   * =================== */

  $.fn.datetimepicker.noConflict = function () {
    $.fn.datetimepicker = old;
    return this;
  };

  /* DATETIMEPICKER DATA-API
   * ================== */

  $(document).on(
    'focus.datetimepicker.data-api click.datetimepicker.data-api',
    '[data-provide="datetimepicker"]',
    function (e) {
      var $this = $(this);
      if ($this.data('datetimepicker')) return;
      e.preventDefault();
      // component click requires us to explicitly show it
      $this.datetimepicker('show');
    }
  );
  $(function () {
    $('[data-provide="datetimepicker-inline"]').datetimepicker();
  });

}(window.jQuery);