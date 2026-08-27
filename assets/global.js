if ((typeof window.Shopify) == 'undefined') {
    window.Shopify = {};
}

function debounce(func) {
    var timer;
    return function(event) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(func, 1000, event);
    };
}
var DOMAnimations = {
    slideUp: function(element, duration = 500) {
        return new Promise(function(resolve, reject) {
            element.style.height = element.offsetHeight + 'px';
            element.style.transitionProperty = `height, margin, padding`;
            element.style.transitionDuration = duration + 'ms';
            element.offsetHeight;
            element.style.overflow = 'hidden';
            element.style.height = 0;
            element.style.paddingTop = 0;
            element.style.paddingBottom = 0;
            element.style.marginTop = 0;
            element.style.marginBottom = 0;
            window.setTimeout(function() {
                element.style.display = 'none';
                element.style.removeProperty('height');
                element.style.removeProperty('padding-top');
                element.style.removeProperty('padding-bottom');
                element.style.removeProperty('margin-top');
                element.style.removeProperty('margin-bottom');
                element.style.removeProperty('overflow');
                element.style.removeProperty('transition-duration');
                element.style.removeProperty('transition-property');
                resolve(false);
            }, duration)
        })
    },

    slideDown: function(element, duration = 500) {

        return new Promise(function(resolve, reject) {

            element.style.removeProperty('display');
            let display = window.getComputedStyle(element).display;

            if (display === 'none')
                display = 'block';

            element.style.display = display;
            let height = element.offsetHeight;
            element.style.overflow = 'hidden';
            element.style.height = 0;
            element.style.paddingTop = 0;
            element.style.paddingBottom = 0;
            element.style.marginTop = 0;
            element.style.marginBottom = 0;
            element.offsetHeight;
            element.style.transitionProperty = `height, margin, padding`;
            element.style.transitionDuration = duration + 'ms';
            element.style.height = height + 'px';
            element.style.removeProperty('padding-top');
            element.style.removeProperty('padding-bottom');
            element.style.removeProperty('margin-top');
            element.style.removeProperty('margin-bottom');
            window.setTimeout(function() {
                element.style.removeProperty('height');
                element.style.removeProperty('overflow');
                element.style.removeProperty('transition-duration');
                element.style.removeProperty('transition-property');
            }, duration)
        })
    },

    slideToggle: function(element, duration = 500) {
        if (window.getComputedStyle(element).display === 'none') {
            return this.slideDown(element, duration);
        } else {
            return this.slideUp(element, duration);
        }
    },

    classToggle: function(element, className) {
        if (element.classList.contains(className)) {
            element.classList.remove(className)
        } else {
            element.classList.add(className)
        }
    }
}

if (!Element.prototype.fadeIn) {
    Element.prototype.fadeIn = function() {
        let ms = !isNaN(arguments[0]) ? arguments[0] : 400,
            func = typeof arguments[0] === 'function' ? arguments[0] : (
                typeof arguments[1] === 'function' ? arguments[1] : null
            );

        this.style.opacity = 0;
        this.style.filter = "alpha(opacity=0)";
        this.style.display = "inline-block";
        this.style.visibility = "visible";

        let $this = this,
            opacity = 0,
            timer = setInterval(function() {
                opacity += 50 / ms;
                if (opacity >= 1) {
                    clearInterval(timer);
                    opacity = 1;

                    if (func) func('done!');
                }
                $this.style.opacity = opacity;
                $this.style.filter = "alpha(opacity=" + opacity * 100 + ")";
            }, 50);
    }
}

if (!Element.prototype.fadeOut) {
    Element.prototype.fadeOut = function() {
        let ms = !isNaN(arguments[0]) ? arguments[0] : 400,
            func = typeof arguments[0] === 'function' ? arguments[0] : (
                typeof arguments[1] === 'function' ? arguments[1] : null
            );

        let $this = this,
            opacity = 1,
            timer = setInterval(function() {
                opacity -= 50 / ms;
                if (opacity <= 0) {
                    clearInterval(timer);
                    opacity = 0;
                    $this.style.display = "none";
                    $this.style.visibility = "hidden";

                    if (func) func('done!');
                }
                $this.style.opacity = opacity;
                $this.style.filter = "alpha(opacity=" + opacity * 100 + ")";
            }, 50);
    }
}

Shopify.bind = function(fn, scope) {
    return function() {
        return fn.apply(scope, arguments);
    }
};
Shopify.setSelectorByValue = function(selector, value) {
    for (var i = 0, count = selector.options.length; i < count; i++) {
        var option = selector.options[i];
        if (value == option.value || value == option.innerHTML) {
            selector.selectedIndex = i;
            return i;
        }
    }
};
Shopify.addListener = function(target, eventName, callback) {
    target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent('on' + eventName, callback);
};
Shopify.postLink = function(path, options) {
    options = options || {};
    var method = options['method'] || 'post';
    var parameters = options['parameters'] || {};

    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for (var key in parameters) {
        var fields = document.createElement("input");
        fields.setAttribute("type", "hidden");
        fields.setAttribute("name", key);
        fields.setAttribute("value", parameters[key]);
        form.appendChild(fields);
    }
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
};
Shopify.CountryProvinceSelector = function(country_domid, province_domid, options) {
    this.countryEl = document.getElementById(country_domid);
    this.provinceEl = document.getElementById(province_domid);
    this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);
    Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

    this.initCountry();
    this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
    initCountry: function() {
        var value = this.countryEl.getAttribute('data-default');
        Shopify.setSelectorByValue(this.countryEl, value);
        this.countryHandler();
    },

    initProvince: function() {
        var value = this.provinceEl.getAttribute('data-default');
        if (value && this.provinceEl.options.length > 0) {
            Shopify.setSelectorByValue(this.provinceEl, value);
        }
    },

    countryHandler: function(e) {
        var opt = this.countryEl.options[this.countryEl.selectedIndex];
        var raw = opt.getAttribute('data-provinces');
        var provinces = JSON.parse(raw);

        this.clearOptions(this.provinceEl);
        if (provinces && provinces.length == 0) {
            if (this.provinceContainer) {
                this.provinceContainer.style.display = 'none';
            }
        } else {
            for (var i = 0; i < provinces.length; i++) {
                var opt = document.createElement('option');
                opt.value = provinces[i][0];
                opt.innerHTML = provinces[i][1];
                this.provinceEl.appendChild(opt);
            }

            if (this.provinceContainer) {
                this.provinceContainer.style.display = '';
            }
        }
    },

    clearOptions: function(selector) {
        while (selector.firstChild) {
            selector.removeChild(selector.firstChild);
        }
    },

    setOptions: function(selector, values) {
        for (var i = 0, count = values.length; i < values.length; i++) {
            var opt = document.createElement('option');
            opt.value = values[i];
            opt.innerHTML = values[i];
            selector.appendChild(opt);
        }
    }
};
class Accordion {
    constructor(el) {
        this.el = el;
        this.summary = el.querySelector('summary');
        this.content = el.querySelector('[detail-expand]');
        this.animation = null;
        this.isClosing = false;
        this.isExpanding = false;
        this.summary.addEventListener('click', (e) => this.onClick(e));
    }
    onClick(e) {

        e.preventDefault();

        this.el.style.overflow = 'hidden';

        if (this.isClosing || !this.el.open) {
            this.open();

        } else if (this.isExpanding || this.el.open) {
            this.shrink();
        }
    }
    shrink() {
        this.isClosing = true;
        const startHeight = `${this.el.offsetHeight}px`;
        const endHeight = `${this.summary.offsetHeight}px`;
        if (this.animation) {

            this.animation.cancel();
        }
        // Start a WAAPI animation
        this.animation = this.el.animate({
            height: [startHeight, endHeight]
        }, {
            duration: 400,
            easing: 'ease-out'
        });

        // When the animation is complete, call onAnimationFinish()
        this.animation.onfinish = () => this.onAnimationFinish(false);
        this.animation.oncancel = () => this.isClosing = false;
    }
    open() {
        this.el.style.height = `${this.el.offsetHeight}px`;
        this.el.open = true;
        window.requestAnimationFrame(() => this.expand());
    }
    expand() {
        // Set the element as "being expanding"
        this.isExpanding = true;
        const startHeight = `${this.el.offsetHeight}px`;
        const endHeight = `${this.summary.offsetHeight + this.content.offsetHeight}px`;

        if (this.animation) {
            this.animation.cancel();
        }
        this.animation = this.el.animate({
            height: [startHeight, endHeight]
        }, {
            duration: 400,
            easing: 'ease-out'
        });

        this.animation.onfinish = () => this.onAnimationFinish(true);
        this.animation.oncancel = () => this.isExpanding = false;
    }
    onAnimationFinish(open) {
        this.el.open = open;
        this.animation = null;
        this.isClosing = false;
        this.isExpanding = false;
        this.el.style.height = this.el.style.overflow = '';
    }
}
if ((typeof Shopify) === 'undefined') { Shopify = {}; }
if (!Shopify.formatMoney) {
    Shopify.formatMoney = function(cents, format) {
        var value = '',
            placeholderRegex = /\{\{\s*(\w+)\s*\}\}/,
            formatString = (format || this.money_format);

        if (typeof cents == 'string') {
            cents = cents.replace('.', '');
        }

        function defaultOption(opt, def) {
            return (typeof opt == 'undefined' ? def : opt);
        }

        function formatWithDelimiters(number, precision, thousands, decimal) {
            precision = defaultOption(precision, 2);
            thousands = defaultOption(thousands, ',');
            decimal = defaultOption(decimal, '.');

            if (isNaN(number) || number == null) {
                return 0;
            }

            number = (number / 100.0).toFixed(precision);

            var parts = number.split('.'),
                dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
                cents = parts[1] ? (decimal + parts[1]) : '';

            return dollars + cents;
        }

        switch (formatString.match(placeholderRegex)[1]) {
            case 'amount':
                value = formatWithDelimiters(cents, 2);
                break;
            case 'amount_no_decimals':
                value = formatWithDelimiters(cents, 0);
                break;
            case 'amount_with_comma_separator':
                value = formatWithDelimiters(cents, 2, '.', ',');
                break;
            case 'amount_no_decimals_with_comma_separator':
                value = formatWithDelimiters(cents, 0, '.', ',');
                break;
            case 'amount_no_decimals_with_space_separator':
                value = formatWithDelimiters(cents, 0, ' ', ' ');
                break;
        }
        return formatString.replace(placeholderRegex, value);
    };
}

function focusableElements(wrapper) {
    if (!wrapper) return false;
    let elements = Array.from(
        wrapper.querySelectorAll("hamburger-menu,summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe")
    );
    return elements;
}
const listFocusElements = {};
var previousFocusElement = '';

function focusElementsRotation(wrapper) {
    stopFocusRotation();
    let elements = focusableElements(wrapper);
    if (elements == false) return false;
    let first = elements[0];
    first.focus();
    let last = elements[elements.length - 1];
    listFocusElements.focusin = (e) => {
        if (
            e.target !== wrapper &&
            e.target !== last &&
            e.target !== first
        )
            return;

        document.addEventListener('keydown', listFocusElements.keydown);
    };

    listFocusElements.focusout = function() {
        document.removeEventListener('keydown', listFocusElements.keydown);
    };

    listFocusElements.keydown = function(e) {
        if (e.code.toUpperCase() !== 'TAB') return;
        if (e.target === last && !e.shiftKey) {
            e.preventDefault();
            first.focus();
        }
        if ((e.target === wrapper[0] || e.target === first) && e.shiftKey) {
            e.preventDefault();
            last.focus();
        }
    };

    document.addEventListener('focusout', listFocusElements.focusout);
    document.addEventListener('focusin', listFocusElements.focusin);
}

function stopFocusRotation() {
    document.removeEventListener('focusin', listFocusElements.focusin);
    document.removeEventListener('focusout', listFocusElements.focusout);
    document.removeEventListener('keydown', listFocusElements.keydown);
}

function pad(num, size) {
    return num.toString().padStart(size, "0");
}

function parseDate(date) {
    const parsed = Date.parse(date);
    if (!isNaN(parsed)) return parsed
    return Date.parse(date.replace(/-/g, '/').replace(/[a-z]+/gi, ' '));
}

function getTimeRemaining(endtime) {
    const total = parseDate(endtime) - Date.parse(new Date());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return {
        total,
        days,
        hours,
        minutes,
        seconds,
    };
}

function shippingEstimates() {
    if (Shopify && Shopify.CountryProvinceSelector) {
        var country = document.getElementById("shippingCountry");
        if (!country) {
            return false;
        }
        var shipping = new Shopify.CountryProvinceSelector(
            "shippingCountry",
            "shippingProvince", {
                hideElement: "shipping-province-container",
            }
        );
        setupEventListeners();
    }
}

function setupEventListeners() {
    if (document.getElementById("fetch-sipping-estimates")) {
        const button = document.getElementById("fetch-sipping-estimates");
        button.addEventListener("click", (e) => {
            e.preventDefault();
            const shippingEstimatesResponse = document.getElementById("shipping-estimates-response");
            shippingEstimatesResponse.innerHTML = "";
            shippingEstimatesResponse.classList.remove("success");
            shippingEstimatesResponse.classList.remove("error");
            shippingEstimatesResponse.hidden = true;

            const shippingAddress = {};
            shippingAddress.zip = document.getElementById("shippingZip").value || "";
            shippingAddress.country = document.getElementById("shippingCountry").value || "";
            shippingAddress.province = document.getElementById("shippingProvince").value || "";
            fetchShippingEstimates(shippingAddress);
        });
    }

}

const fetchShippingEstimates = async(shippingAddress) => {
    const response = await fetch("/cart/shipping_rates.json", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ shipping_address: shippingAddress }),
    })
    if (response.ok) {
        const shippingRates = await response.json();
        _fetchResponse(shippingRates);
    } else {
        const errresponse = await response.json();
        _fetchError(errresponse);
    }
};


const _fetchError = (XMLHttpRequest, textStatus) => {
    const shippingEstimatesResponse = document.getElementById("shipping-estimates-response");

    for (const [property, messages] of Object.entries(XMLHttpRequest)) {
        for (const message of messages) {
            shippingEstimatesResponse.innerHTML = `<p class="error-message no-bg">${message}</p>`;
        }
    }
    shippingEstimatesResponse.style.display = 'block';
};

const _fetchResponse = (response) => {
        const shippingEstimatesResponse = document.getElementById("shipping-estimates-response");
        if (response.shipping_rates && response.shipping_rates.length > 0) {
            const html = `${response.shipping_rates.map((shipping) => {
            return `<p><strong>${shipping.name}</strong>: ${Shopify.formatMoney(shipping.price * 100, moneyFormat)}</p>`;
        }).join("")}`;
        const shippingEstimateMultipleMessages = `<div class="success-message">${html}</div>`;
        shippingEstimatesResponse.innerHTML = shippingEstimateMultipleMessages;
        shippingEstimatesResponse.style.display = 'block';
    } else {
        shippingEstimatesResponse.innerHTML = `<p class="error-message no-bg">${shipRateUnavailable}</p>`;
        shippingEstimatesResponse.style.display = 'block';
    }
};
  

function countdownClock(section = document) {
    const parentSelectors = section.querySelectorAll("[data-countdown]");
    if (parentSelectors) {
      Array.from(parentSelectors).forEach(function (parentSelector) {
        const dateSelector = parentSelector.querySelector("[data-countdown-input]");
        if (dateSelector.value != "") {
          const myArr = dateSelector.value.split("/");
          let _day = myArr[0];
          let _month = myArr[1];
          let _year = myArr[2];
          const endtime = _month + "/" + _day + "/" + _year + " 00:00:00";
          const days = parentSelector.querySelector("#days");
          const hours = parentSelector.querySelector("#hours");
          const minutes = parentSelector.querySelector("#minutes");
          const seconds = parentSelector.querySelector("#seconds");
  
          var timeinterval = setInterval(function () {
            var time = getTimeRemaining(endtime);
            if (time.total <= 0) {
              parentSelector.style.display = "none";
              clearInterval(timeinterval);
            } else {
              days.innerHTML = pad(time.days, 2);
              hours.innerHTML = pad(time.hours, 2);
              minutes.innerHTML = pad(time.minutes, 2);
              seconds.innerHTML = pad(time.seconds, 2);
            }
          }, 1000);
        }
      });
    }
}

slickSlider = function(selector, slideIndex) {
    var optionContainer = selector.attr('data-slick');
    if (optionContainer) {
        var options = JSON.parse(optionContainer);
        let optionsnew = Object.assign(options, { prevArrow: prevArrow, nextArrow: nextArrow });
        if (selector.hasClass('slick-slider')) {
            selector.slick('resize');
        } else {
            if (slideIndex) {
                selector.not('.slick-slider').slick(optionsnew).slick('select', slideIndex);
            } else {
                selector.not('.slick-slider').slick(optionsnew).slick('resize');
            }
        }
        selector.on('beforeChange', function(event, slick, currentSlide, nextSlide) {
          if (selector.hasClass("carousel-block-color-true")) {
            let nxtSlide = $(slick.$slides.get(nextSlide))
            let textColor = nxtSlide.find(".announcement-bar-item").attr("data-color");
            let backgroundColor = nxtSlide.find(".announcement-bar-item").attr("data-bg");
            let linkColor = nxtSlide.find(".announcement-bar-item").attr("data-link");
            selector.closest(".announcement-bar-main").css({ "--announcement-bar-background":backgroundColor, "--announcement-bar-color":textColor, "--announcement-bar-link-color":linkColor });
  
          }
          if(selector.hasClass("block-color-enable")){
            let nxtSlide = $(slick.$slides.get(nextSlide));
            let backgroundColor = nxtSlide.find(".slideshow-item").attr("data-color");
            selector.closest(".section-container").css({"--body-background":backgroundColor})
          }
          
          selector[0].querySelectorAll(".youtube_video,.youtube-video,iframe[src*='www.youtube.com']").forEach((video) => {
                if(video.getAttribute('data-autoplay') == 'true' || video.hasAttribute('autoplay')) return false;
                video.contentWindow.postMessage('{"event":"command","func":"' + "pauseVideo" + '","args":""}',"*");
            });
            selector[0].querySelectorAll(".vimeo_video,.vimeo-video, iframe[src*='player.vimeo.com']").forEach((video) => {
                if(video.getAttribute('data-autoplay') == 'true' || video.hasAttribute('autoplay')) return false;
                video.contentWindow.postMessage('{"method":"pause"}', "*");
            });
            selector[0].querySelectorAll("video").forEach((video) => {
                if(video.getAttribute('data-autoplay') == 'true' || video.hasAttribute('autoplay')) return false;
                video.pause();
            });
        });

    }
}
sliders = function() {
        var sliders = jQuery('body').find('[data-slick]');
        if (sliders.length > 0) {
            sliders.each(function(index) {
                if (!jQuery(this).hasClass('slick-slider')) {
                    let slider = jQuery(this);
                    slickSlider(slider);
                } else {
                    jQuery(this).slick('resize');
                }
            });
        }
       
    }
  

function detailDisclouserInit(section = document) {
    let detailsElements = section.querySelectorAll('[data-detail-button]');
    Array.from(detailsElements).forEach((detailsElement) => {
        new Accordion(detailsElement);
      
    });
    
}
/*-------------collapsible-content------------------ */
function collapsiblecontentClose() {
    var closeButtons = document.querySelectorAll('[data-close-button]');
    Array.from(closeButtons).forEach(function(closeButton) {
        closeButton.addEventListener("click", (event) => {
            event.preventDefault();
            closeButton.closest(".accordion-item").removeAttribute("open");
        });
    });

}

function sideDrawerInt() {
    let sideDrawerSelectors = document.querySelectorAll('[data-sidedrawer-button]');
    let sideDrawerBodySelectors = document.querySelectorAll('[data-sidedrawer-wrapper]');
    let id = '';
    if (sideDrawerSelectors) {
        Array.from(sideDrawerSelectors).forEach(function(element) {
            element.addEventListener("click", (e) => {
                e.preventDefault();
                Array.from(sideDrawerBodySelectors).forEach(function(sideElement) {
                    if (sideElement.classList.contains("show")) {
                        setTimeout(() => {
                            sideElement.style.display = "none";
                        }, 300)
                        setTimeout(() => {
                            sideElement.classList.remove('show');
                        }, 200);
                    }
                })
                id = element.getAttribute("data-id");
                let sideElementBody = document.querySelector("#" + id);
                document.querySelector("body").classList.add("no-scroll");
                if(id=='pickup-side-drawer'){
                    let drawerid = document.querySelector("#"+id);
                    document.querySelector("body").classList.add("pickup-side-drawer-open");
                    if (drawerid.querySelector("[data-slick]")) {
                        let slider = drawerid.querySelector("[data-slick]")
                        setTimeout(function(){
                            if (slider.classList.contains("slick-initialized")) {
                                jQuery(slider)[0].slick.refresh();
                            }
                        },500)
                       
                    }
                }
                if(id=='cart-side-drawer'){
                    let drawerid = document.querySelector("#"+id);
                    if (drawerid.querySelector("[data-slick]")) {
                        let slider = drawerid.querySelector("[data-slick]")
                        setTimeout(function(){
                            if (slider.classList.contains("slick-initialized")) {
                                jQuery(slider)[0].slick.refresh();
                            }
                        },500)
                       
                    }
                }

                setTimeout(() => {
                    sideElementBody.style.display = 'flex';
                }, 200)
                setTimeout(() => {
                    sideElementBody.classList.add('show');
                }, 300);

                setTimeout(()=>{
                    if(previousFocusElement == ''){
                        previousFocusElement = element;
                    }
                    focusElementsRotation(sideElementBody);
                },1000)
            });
        })
    }
    let sideDrawerClose = document.querySelectorAll('[data-sidedrawer-close]');
    if (sideDrawerClose) {
        Array.from(sideDrawerClose).forEach(function(element) {
            element.addEventListener("click", (e) => {
                e.preventDefault();

                Array.from(sideDrawerBodySelectors).forEach(function(sideElement) {
                    if (sideElement.classList.contains("show")) {
                        setTimeout(() => {
                            document.querySelector("body").classList.remove("no-scroll");
                            document.querySelector("body").classList.remove("pickup-side-drawer-open");
                            sideElement.classList.remove('show');
                            if(sideElement.classList.contains("quickview-side-drawer")){
                             sideElement.querySelector('[data-quickview-content]').innerHTML='';
                            }
                        }, 300);
                        setTimeout(() => {
                          
                            sideElement.style.display = "none";
                        }, 500)
                        stopFocusRotation();
                        if(previousFocusElement){
                            previousFocusElement.focus();
                            previousFocusElement = "";
                        }
                     
                        
                    }
                })

            });
        })
    }
}

function quickViewElements(section = document) {
    let quickviewElements = section.querySelectorAll("[data-quickview-action]");
    Array.from(quickviewElements).forEach(function(element) {
        initQuickView(element);
    });
}

function initQuickView(element) {
    element.addEventListener('click', (event) => {
        event.preventDefault();
        if(element.getAttribute("href")){
            var _url = element.getAttribute("href");
                if (_url.indexOf("?") > -1) {
                    _url = _url.split("?");
                    _url = _url[0];
                }
                var productUrl = _url + '?section_id=quick-view';
                element.classList.add("loading")
                //quickviewContainer.querySelector('[data-quickview-content]').innerHTML = preLoaderIcon;
                fetch(productUrl)
                    .then((response) => response.text())
                    .then((text) => {
                        var sectionhtml = new DOMParser().parseFromString(text, "text/html").querySelector(".shopify-section");
                        element.classList.remove("loading")
                        if(document.querySelector('[data-quickview-content-wrapper]')){
                            let quickviewContainer = document.querySelector('[data-quickview-content-wrapper]'); 
                                setTimeout(() => {
                                    quickviewContainer.style.display  = 'flex';
                                }, 200)    
                                setTimeout(function(){
                                    quickviewContainer.classList.add('show');
                                    document.querySelector('body').classList.add('no-scroll');
                                },400)
                                quickviewContainer.innerHTML = sectionhtml.querySelector("[data-quickview-content-wrapper]").innerHTML;
                                if (Shopify.PaymentButton) {
                                    Shopify.PaymentButton.init();
                                }
                                customDropdownElements(quickviewContainer);
                                productVariantOption();
                                getAddToCartElements(quickviewContainer);
                                quantitySelectors(quickviewContainer);
                                popupContentElements();
                                setTimeout(function(){
                                sideDrawerInt();
                                productMedia3dModel();
                                videoPauseOnScroll();
                                },1000)
                            
                        }else{
                            if (window.innerWidth >767){
                                if(element.closest('.shopify-section').querySelectorAll('.quick-view-active')){
                                    let activeQuickViews = element.closest('.shopify-section').querySelectorAll('.quick-view-active')
                                    Array.from(activeQuickViews).forEach(function(activeQuick) {
                                        setTimeout(function(){
                                        activeQuick.classList.remove('quick-view-active');
                                        },70)
                                        setTimeout(function(){
                                        activeQuick.querySelector('[data-grid-quick-view-content]').innerHTML = '';
                                        },200)
                                    });
                                }
                                let currentGridViewCard = element.closest('[data-product-card]');
                                currentGridViewCard.querySelector('[data-grid-quick-view]').classList.add('quick-view-active');
                                let quickViewContent = currentGridViewCard.querySelector('[data-grid-quick-view-content]');
                                if(sectionhtml.querySelector(".shopify-payment-button")){
                                    sectionhtml.querySelector(".shopify-payment-button").remove();
                                }
                               
                                // currentGridViewCard.querySelector(".product-card-quick-view-content").appendChild(sectionhtml.querySelector("[data-grid-quick-view-close").cloneNode(true))
                                quickViewContent.appendChild(sectionhtml.querySelector("[data-price-wrapper]").cloneNode(true));
                                quickViewContent.appendChild(sectionhtml.querySelector("[data-product-variants]").cloneNode(true)); 
                                quickViewContent.appendChild(sectionhtml.querySelector(".quantity-atc-button-wrapper").cloneNode(true));
                                quickViewContent.appendChild(sectionhtml.querySelector("[data-quick-card-error]").cloneNode(true));
                                
                                customDropdownElements(currentGridViewCard);
                                productVariantOption(currentGridViewCard);
                                getAddToCartElements(currentGridViewCard);
                                quantitySelectors(currentGridViewCard);
                                popupContentElements(); 
                                setTimeout(function(){
                                productMedia3dModel();
                                videoPauseOnScroll();
                                },1000)
                            }else{
                                if(document.querySelector('[data-quickview-content-mobile]')){
                                    let quickviewContainer = document.querySelector('[data-quickview-content-mobile]'); 
                                        setTimeout(() => {
                                            quickviewContainer.style.display  = 'flex';
                                        }, 200)    
                                        setTimeout(function(){
                                            quickviewContainer.classList.add('show');
                                            document.querySelector('body').classList.add('no-scroll');
                                        },400)
                                        quickviewContainer.innerHTML = sectionhtml.querySelector("[data-quickview-content-mobile]").innerHTML;
                                        if (Shopify.PaymentButton) {
                                            Shopify.PaymentButton.init();
                                        }
                                        customDropdownElements(quickviewContainer);
                                        productVariantOption();
                                        getAddToCartElements(quickviewContainer);
                                        quantitySelectors(quickviewContainer);
                                        popupContentElements();
                                        setTimeout(function(){
                                        sideDrawerInt();
                                        productMedia3dModel();
                                        videoPauseOnScroll();
                                        },1000)
                                      
                                    }
                            }

                        }
                    }).catch((e) => {
                        console.log(`Error: ${e}`);
                    });
        }
    });
}


/*-------------shipping bar ------------------ */
let convertShippingAmount = freeShippingAmount;

function checkShippingAvailablity() {
    let selectedCountry = Shopify.country;
    let shippingCountriesContainer = $('#shipping-countries');

    if (shippingCountriesContainer.length == 0) {
        shippingCountriesContainer = $('#shippingCountry');
    }

    if (shippingCountriesContainer && shippingCountriesContainer.find('option').length > 0) {
        let shippingSelectedCountry = countryListData[selectedCountry];
        if (shippingCountriesContainer.find('[value="' + shippingSelectedCountry + '"]').length > 0) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function fsShippingTotal(fallbackTotal) {
    var mode = (window.FS_INSIDER && window.FS_INSIDER.mode) || 'insider';
    if (mode !== 'insider') return fallbackTotal;

    // Scoped to the footer on purpose. That block is replaced on every cart
    // update, so its value is current; anything outside it is not re-rendered
    // and would go stale after a quantity change.
    var el = document.querySelector('[data-cart-drawer-footer] [data-insider-total]');
    if (!el) return fallbackTotal;

    var insiderTotal = parseInt(el.getAttribute('data-insider-total'), 10);
    return isNaN(insiderTotal) ? fallbackTotal : insiderTotal;
}

function freeShippingBar(totalPrice, itemCount) {
    totalPrice = fsShippingTotal(totalPrice);
    let shippingCountryAvailable = checkShippingAvailablity();
      console.log("shippingCountryAvailable",shippingCountryAvailable)
  
    let shippingBarContainer = document.querySelector('[data-free-shipping-wrapper]');
      console.log("shippingBarContainer",shippingBarContainer)
  
    if (itemCount == 0  && document.querySelector('[data-shipping-message]')) {
        document.querySelector('[data-shipping-message]').classList.add('hidden');
        shippingBarContainer.classList.add('hidden');
        return false;
    }
    if (shippingCountryAvailable && shippingBarContainer) {
        shippingBarContainer.classList.add('hidden');
        let cartTotalPrice = totalPrice;
      console.log("test1",cartTotalPrice)
        let freeShippingNeedPrice = Shopify.formatMoney((convertShippingAmount - cartTotalPrice), moneyFormat);
      console.log("test2",freeShippingNeedPrice)
      
        let shippingPercentage = parseFloat((cartTotalPrice * 100) / convertShippingAmount).toFixed(2);
      console.log("test3",shippingPercentage)
      
        if (shippingPercentage > 10 && shippingPercentage < 100) {
            shippingPercentage = shippingPercentage - 5;
      console.log("test4",shippingPercentage)
          
        } else if (shippingPercentage > 100) {
            shippingPercentage = 100
        }
        if (document.querySelector('[data-shipping-message]')) {
            if (shippingPercentage >= 100) {

                document.querySelector('[data-shipping-message]').textContent = freeShippingBarSuccessText;
            } else {
                document.querySelector('[data-shipping-message]').textContent = ShippingBarText.replace('||amount||', freeShippingNeedPrice);
            }
        }

        if (document.querySelector('[data-shipping-bar]')) {
            document.querySelector('[data-shipping-bar]').style.width = shippingPercentage + '%';
        }
  
        shippingBarContainer.classList.remove('hidden');
        document.querySelector('[data-shipping-message]').classList.remove('hidden')
      

    }
}
if (freeShippingBarStatus) {
    freeShippingBar(cartTotalPrice, cartItemCount);
}

function quantitySelectors(section = document) {
    let quantityElements = section.querySelectorAll("[data-quantity-wrapper]");
    Array.from(quantityElements).forEach(function(element) {
        initQuantityAction(element);
    });
    let cartGiftWrapATC = section.querySelectorAll("[data-gift-atc]");
    Array.from(cartGiftWrapATC).forEach(function(cartGiftWrap) {
        cartGiftWrap.addEventListener('click', (event) => {
            let formParent = cartGiftWrap.closest('[data-cart-giftwrap]');
            let form = formParent.querySelector('form');
            addItemToCart(formParent, form, cartGiftWrap);
        });
    });
}

function initQuantityAction(element) {
    let quantityInput = element.querySelector('[data-quantity-input]')
    let quantityIncrement = element.querySelector('[data-quantity-increment]')
    let quantityDecrement = element.querySelector('[data-quantity-decrement]')
    if (quantityInput.classList.contains('ajax-quantity')) {
        quantityInput.addEventListener('change', (event) => {
            setTimeout(function() {
                let currentValue = parseInt(quantityInput.value);
                let section = quantityInput.closest('[data-cart-content]');
                if(currentValue <= 0){
                    quantityInput.value = 0;
                    currentValue = 0
                }
                let line = quantityInput.dataset.line;                
                if (quantityInput.closest('[data-cart-item]').querySelector('.error-message')) {
                    quantityInput.closest('[data-cart-item]').querySelector('.error-message').classList.add('hidden');
                    quantityInput.closest('[data-cart-item]').querySelector('.error-message').innerHTML = '';
                }
                updateCartItem(line, currentValue, section,quantityInput.closest('[data-cart-item]'))
            }, 500)
        });
    }else{
        quantityInput.addEventListener('change', (event) => {
            setTimeout(function() {
                let currentValue = parseInt(quantityInput.value);  
                if(currentValue <= 0){
                    quantityInput.value = 0
                }
            }, 500)
        });
    }
    quantityIncrement.addEventListener('click', (event) => {
        event.preventDefault();
        let currentValue = parseInt(quantityInput.value);
        quantityInput.value = currentValue + 1;
        if (quantityInput.classList.contains('ajax-quantity')) {
            updateQuantity(quantityInput)
        }
    });
    quantityDecrement.addEventListener('click', (event) => {
        event.preventDefault();
        let currentValue = parseInt(quantityInput.value);
        let updatedValue = currentValue - 1;
        if (updatedValue <= 0 && quantityDecrement.closest(".cart-update")) {
            quantityInput.value = 0;
        }else{
           
            if(updatedValue <= 0){

                updatedValue = 0;

            }
            if(updatedValue > 0 ){
                quantityInput.value = updatedValue;
            }
        
        }
        if (quantityInput.classList.contains('ajax-quantity')) {
            updateQuantity(quantityInput)
        }
        
    });
}

function updateQuantity(quantityInput) {
    let section = quantityInput.closest('[data-cart-content]');
    quantityInput.closest('[data-cart-item]').classList.add('disabled')
    let quantity = parseInt(quantityInput.value);
    let line = quantityInput.dataset.line;    
    if (quantityInput.closest('[data-cart-item]').querySelector('.error-message')) {
        quantityInput.closest('[data-cart-item]').querySelector('.error-message').classList.add('hidden');
        quantityInput.closest('[data-cart-item]').querySelector('.error-message').innerHTML = '';
    }
    updateCartItem(line, quantity, section,quantityInput.closest('[data-cart-item]'))
}

// function updateCartItem(line, quantity, section,lineItem) {
//     let sectionId = section.dataset.section;
//     const body = JSON.stringify({
//         line,
//         quantity,
//         sections: [sectionId]
//     });
//     fetch(cartChangeUrl, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json', 'Accept': `application/json` },
//             body
//         })
//         .then((response) => {
//             return response.text();
//         })
//         .then((state) => {
//             const cart = JSON.parse(state);
//             if (cart.status) {
//                 if (lineItem.querySelector('.error-message')) {
//                     lineItem.querySelector('.error-message').innerHTML = cart.description;
//                     lineItem.querySelector('.error-message').classList.remove('hidden');
//                 }
//                 return false;
//             }
//             updateCartHtml(section, cart, sectionId)
               

//         })
// }

function updateCartItem(line, quantity, section,lineItem) {
    let sectionId = section.dataset.section;
    const body = JSON.stringify({
        line,
        quantity,
        sections: [sectionId]
    });
    fetch(cartChangeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': `application/json` },
            body
        })
        .then((response) => {
            return response.text();
        })
        .then((state) => {
            const cart = JSON.parse(state);
            if (cart.status) {
                if (lineItem.querySelector('.error-message')) {
                    lineItem.querySelector('.error-message').innerHTML = cart.description;
                    lineItem.querySelector('.error-message').classList.remove('hidden');
                    let quantityWrapper = lineItem.querySelectorAll(".ajax-quantity")
                     Array.from(quantityWrapper).forEach(function(element) {
                        element.value = element.getAttribute('data-previous-value')
                    })
                }
                return false;
            }
            updateCartHtml(section, cart, sectionId)
        })
}

function updateCartHtml(section, cart, sectionId) {
    if (cart.sections) {
        let cartcount = cart.item_count;
        let updatedCartHtml = new DOMParser().parseFromString(cart.sections[sectionId], 'text/html');
        let itemCount = parseInt(updatedCartHtml.querySelector('[data-cart-content]').dataset.cartItem);
        let totalPrice = parseInt(updatedCartHtml.querySelector('[data-cart-content]').dataset.cartTotalPrice);
        if (itemCount >= 1) {
            section.querySelector('[data-cart-form]').innerHTML = updatedCartHtml.querySelector('[data-cart-form]').innerHTML;
            section.querySelector('[data-cart-prices]').innerHTML = updatedCartHtml.querySelector('[data-cart-prices]').innerHTML;
            if (section.querySelector('[data-cart-note-wrapper]') && updatedCartHtml.querySelector('[data-cart-note-wrapper]')) {
                section.querySelector('[data-cart-note-wrapper]').innerHTML = updatedCartHtml.querySelector('[data-cart-note-wrapper]').innerHTML;
            }
            if (section.querySelector('[data-cart-giftwrap]') && updatedCartHtml.querySelector('[data-cart-giftwrap]')) {
                section.querySelector('[data-cart-giftwrap]').innerHTML = updatedCartHtml.querySelector('[data-cart-giftwrap]').innerHTML;
            }
            cartCountUpdate(itemCount)
            quantitySelectors(section);
            cartItemRemoveElements(section);
            updateCartNote();
            cartDrawerNoteInit();
            if (freeShippingBarStatus) {
                freeShippingBar(totalPrice, cartcount)
            }

            let slider = updatedCartHtml.querySelector("[data-slick]");
                if (slider) {
                    let sliderId = slider.getAttribute("id");
                    if (!slider.classList.contains("slick-initialized")) {
                        slickSlider($("#" + sliderId));
                    }
                }
        } else { 
            if(updatedCartHtml.querySelector('[data-notification]')){
                document.querySelector('[data-notification]').innerHTML = updatedCartHtml.querySelector('[data-notification]').innerHTML;
            }
            document.querySelector('[data-cart-content]').innerHTML = updatedCartHtml.querySelector('[data-cart-content]').innerHTML;
            
            if(updatedCartHtml.querySelector('[data-cart-drawer-footer]')){
                document.querySelector('[data-cart-drawer-footer]').innerHTML = updatedCartHtml.querySelector('[data-cart-drawer-footer]').innerHTML;
            }
          
            let cartCount = updatedCartHtml.querySelector('[data-cart-content]').getAttribute('data-item-count');
            let cartDrawertotalPrice = updatedCartHtml.querySelector('[data-cart-content]').getAttribute('data-cart-total-price');
            let itemcount = cart.item_count;
            if (sectionId == 'ajax-cart') {
                let datasection = document.querySelector('[data-cart-drawer-body]');
                if (cart.item_count === 0) {
                    datasection.classList.add('empty-mini-cart');
                }
                quantitySelectors(datasection);
                cartItemRemoveElements(datasection);
            }
            if(itemcount != undefined){
                cartCount =itemcount;
            }
            cartCountUpdate(cartCount)
            updateCartNote();
            cartDrawerNoteInit();
            if (freeShippingBarStatus) {
                freeShippingBar(cartDrawertotalPrice, cartCount)
            }
            let slider = updatedCartHtml.querySelector("[data-slick]");
            if (slider) {
                let sliderId = slider.getAttribute("id");
                if (!slider.classList.contains("slick-initialized")) {
                    slickSlider($("#" + sliderId));
                }
            }
        }
    }
}

function cartItemRemoveElements(section = document) {
    let cartItemRemoveElements = section.querySelectorAll("[data-remove-item]");
    Array.from(cartItemRemoveElements).forEach(function(element) {
        element.addEventListener('click', (event) => {
            event.preventDefault();
            let section = element.closest('[data-cart-content]');
            element.closest('[data-cart-item]').classList.add('disabled')
            let line = element.dataset.line;            
            if (element.closest('[data-cart-item]').querySelector('.error-message')) {
                element.closest('[data-cart-item]').querySelector('.error-message').classList.add('hidden');
                element.closest('[data-cart-item]').querySelector('.error-message').innerHTML = '';
            }
            updateCartItem(line, 0, section,element.closest('[data-cart-item]'))
        });

    });
}

function updateCartNote() {
    let cartNoteElements = document.querySelectorAll('[data-cart-note]')
    var cartNoteTyping;
    Array.from(cartNoteElements).forEach(function(element) {
        element.addEventListener('keydown', (event) => {
            clearTimeout(cartNoteTyping);
        });
        element.addEventListener('keyup', (event) => {
            clearTimeout(cartNoteTyping);
            cartNoteTyping = setTimeout(function() {
                const body = JSON.stringify({
                    note: element.value
                });
                // cartNoteAPI(body);
                fetch(cartUpdateUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': `application/json` },
                        body
                    })
                    .then((response) => {
                        return response.text();
                    })
            }, 1000);
        });
    })
    if(document.querySelector("[data-cart-note-trigger]")){
        let cartnotupdate  =document.querySelector("[data-cart-note-trigger]");
        cartnotupdate.addEventListener('click',function(event){
            let element = document.querySelector('[data-cart-note]');
            const body = JSON.stringify({
                note: element.value
            });
            fetch(cartUpdateUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': `application/json` },
                body
            })
            .then((response) => {
                return response.text();
            })
        })
    
    }
  
}

function cartNoteAPI(body) {
    fetch(cartUpdateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': `application/json` },
            body
        })
        .then((response) => {
            return response.text();
        })
}

/* get variant based on selected options start */
function getVariantDetails(options, type, selector, allVariants, parent) {
    let currentVariant = allVariants.find((variant) => {
        if (type === "options") {
            return !variant.options.map((option, index) => {
                return options[index] === option;
            }).includes(false);
        }
        if (type === "id") {
            return variant.id == options;
        }
    });
    if (!parent.classList.contains("show-unavailable-variant")) {
        if (!currentVariant) {
            return getFirstAvailableVariant(options, type, selector, allVariants);
        } else {
            return currentVariant;
        }
    } else {
        return currentVariant;
    }
}

function getFirstAvailableVariant(options, type, selector, allVariants) {
    let availableVariant = null,
        slicedCount = 0;
    do {
        options.pop();
        slicedCount += 1;
        availableVariant = allVariants.find((variant) => {
            return variant["options"].slice(0, variant["options"].length - slicedCount).every((value, index) => value === options[index]);
        });
    } while (!availableVariant && options.length > 0);
    if (availableVariant) {
        let fieldsets = Array.from(selector.querySelectorAll(".product-loop-variants"));
        fieldsets.forEach((fieldset, index) => {
            let option = fieldset.querySelector('input[value="' + availableVariant['options'][index] + '"]')
            if (option && option.checked == false) {
                option.click();
                if (option.hasAttribute('custom-dropdown')) {
                    option.closest('.custom-select').querySelector('.custom-select-text').innerHTML = '<strong>' + availableVariant['options'][index] + '</strong>';
                    option.closest('.custom-select').querySelector('.custom-select-button ').setAttribute('data-type', availableVariant['options'][index])
                }
            }
        });
    }
    return availableVariant;
}

function updateUrl(selectedVariant) {
    const baseURL = window.location.pathname;
    if (baseURL.indexOf("/products/") == -1) return;
    const UpdatedURL = baseURL + "?variant=" + selectedVariant.id;
    window.history.replaceState({}, '', `${UpdatedURL}`);
}

function updateAllVariantInput(selectedVariant, _productParent) {
    let productFormsInputs = _productParent.querySelectorAll(`input[name="id"]`);
    productFormsInputs.forEach((productFormInput) => {
        productFormInput.value = selectedVariant.id;
        productFormInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    if (_productParent.querySelector("shopify-payment-terms")) {
        _productParent.querySelector(
            "shopify-payment-terms"
        ).style.display = "block";
    }
}

// /* update the price based on selected variant start */
// function updateVariantPrice(_productSection, priceContainer, selectedVariant, showSaved) {
    
//     if (priceContainer) {
//         if (selectedVariant != undefined) {
//             priceContainer.style.display = 'block';
//             var compareAtPrice = parseInt(selectedVariant.compare_at_price);
//             var comparePriceSelectors = priceContainer.querySelectorAll('[data-compare-price]');
//             var price = parseInt(selectedVariant.price);
//             var priceSelectors = priceContainer.querySelectorAll('[data-actual-price]');
//             var savingPercentage = Math.round((compareAtPrice - price) * 100 / compareAtPrice) + "% " + saleOffText;
//             var savingPercentageSelector = priceContainer.querySelectorAll('[data-price-saving]');
//             var unitPriceSelectors = priceContainer.querySelectorAll('[data-unit-price]');
//             var soldoutTextSelectors = priceContainer.querySelectorAll('[data-soldout-text]');
//             Array.from(priceSelectors).forEach(function(priceSelector) {
//                 priceSelector.innerHTML = Shopify.formatMoney(price, moneyFormat);
//             })


//             Array.from(comparePriceSelectors).forEach(function(comparePriceSelector) {
//                 if (compareAtPrice > price) {
//                     if (comparePriceSelector) {
//                         comparePriceSelector.innerHTML = Shopify.formatMoney(compareAtPrice, moneyFormat);
//                         comparePriceSelector.classList.remove('hidden');
//                         Array.from(savingPercentageSelector).forEach(function(spSelector) {
//                             spSelector.innerHTML = savingPercentage;
//                             spSelector.classList.remove('hidden');
//                         })
//                     }
//                 } else {
//                     comparePriceSelector.innerHTML = Shopify.formatMoney(compareAtPrice, moneyFormat);
//                     comparePriceSelector.classList.add('hidden');
//                     Array.from(savingPercentageSelector).forEach(function(spSelector) {
//                         spSelector.innerHTML = savingPercentage;
//                         spSelector.classList.add('hidden');
//                     })
//                 }
//             })

//             Array.from(unitPriceSelectors).forEach(function(unitPriceSelector) {
//                 if (unitPriceSelector) {
//                     if (selectedVariant.unit_price_measurement) {
//                         var unitpriceText = Shopify.formatMoney(selectedVariant.unit_price, moneyFormat) + " / ";
//                         unitpriceText +=
//                             selectedVariant.reference_value == 1 ? "" : selectedVariant.unit_price_measurement.reference_value;
//                         unitpriceText += selectedVariant.unit_price_measurement.reference_unit + "</p>";
//                         unitPriceSelector.innerHTML = unitpriceText;
//                         unitPriceSelector.classList.remove('hidden');
//                     } else {
//                         unitPriceSelector.classList.add('hidden');
//                     }
//                 }
//                 Array.from(soldoutTextSelectors).forEach(function(soldoutTextSelector) {
//                     if (soldoutTextSelector) {
//                         if (selectedVariant.available != true) {
//                             soldoutTextSelector.innerHTML = soldOutText;
//                         } else {
//                             soldoutTextSelector.innerHTML = '';
//                         }
//                     }
//                 })
//             })
//         }
//         else{
//             priceContainer.style.display = 'none';
//         }
//     }
// }

/* update the price based on selected variant start */

/**
 * Variant metafields are absent from `product.variants | json`, so Insider
 * prices are published separately by snippets/product-price.liquid as a JSON
 * map of variant id to amount in cents. Null means the variant has no Insider
 * price at all.
 */
function getInsiderPriceMap(priceContainer) {
    var selector = '[type="application/json"][data-name="product-insider-prices"]';
    var node = priceContainer.querySelector(selector);

    if (!node) {
        // Sticky bars and quick views render the price snippet in a different
        // subtree, so fall back to the nearest product wrapper, then the page.
        var wrapper = priceContainer.closest('[data-product-wrapper]')
            || priceContainer.closest('.main-product')
            || document;
        node = wrapper.querySelector(selector);
    }

    if (!node) return {};

    try {
        return JSON.parse(node.textContent) || {};
    } catch (error) {
        console.warn('Insider price map could not be parsed', error);
        return {};
    }
}

function updateVariantPrice(_productSection, priceContainer, selectedVariant, showSaved) {

    if (priceContainer) {
        if (selectedVariant != undefined) {
            priceContainer.style.display = 'block';
            var compareAtPrice = parseInt(selectedVariant.compare_at_price);
            var comparePriceSelectors = priceContainer.querySelectorAll('[data-compare-price]');
            var price = parseInt(selectedVariant.price);
            var priceSelectors = priceContainer.querySelectorAll('[data-actual-price]');
            var savingPercentageSelector = priceContainer.querySelectorAll('[data-price-saving]');
            var unitPriceSelectors = priceContainer.querySelectorAll('[data-unit-price]');
            var soldoutTextSelectors = priceContainer.querySelectorAll('[data-soldout-text]');

            var insiderMap = getInsiderPriceMap(priceContainer);
            var insiderCents = parseInt(insiderMap[selectedVariant.id]);
            if (isNaN(insiderCents)) insiderCents = 0;

            // Mirrors the Liquid condition exactly: strictly below the selling
            // price. Variants outside the Insider programme, and variants whose
            // compare-at merely equals the price, both land here as false.
            var hasInsiderPrice = insiderCents > 0 && insiderCents < price;

            var hasCompareAt = compareAtPrice > price;

            // Prefer the Insider gap, fall back to compare-at. Before the price
            // flip nothing has an Insider gap, so the fallback keeps existing
            // discount badges alive.
            var showSaving = false;
            var savingPercentage = '';
            if (hasInsiderPrice) {
                savingPercentage = Math.round((price - insiderCents) * 100 / price) + '% ' + saleOffText;
                showSaving = true;
            } else if (hasCompareAt) {
                savingPercentage = Math.round((compareAtPrice - price) * 100 / compareAtPrice) + '% ' + saleOffText;
                showSaving = true;
            }

            // The Insider block carries the metafield amount when there is one,
            // otherwise it is the only price on screen and shows variant.price.
            Array.from(priceSelectors).forEach(function(priceSelector) {
                priceSelector.innerHTML = Shopify.formatMoney(
                    hasInsiderPrice ? insiderCents : price,
                    moneyFormat
                );
            });

            Array.from(priceContainer.querySelectorAll('[data-full-price]')).forEach(function(fullPriceSelector) {
                fullPriceSelector.innerHTML = Shopify.formatMoney(price, moneyFormat);
            });

            // Both blocks and labels always exist in the DOM, so only classes
            // need toggling here.
            Array.from(priceContainer.querySelectorAll('[data-full-block]')).forEach(function(block) {
                block.classList.toggle('hidden', !hasInsiderPrice);
            });

            Array.from(priceContainer.querySelectorAll('[data-insider-label]')).forEach(function(label) {
                label.classList.toggle('hidden', !hasInsiderPrice);
            });

            Array.from(priceContainer.querySelectorAll('[data-price-group]')).forEach(function(group) {
                group.classList.toggle('is-single-price', !hasInsiderPrice);
                group.setAttribute('data-has-insider', hasInsiderPrice ? 'true' : 'false');
            });

            Array.from(savingPercentageSelector).forEach(function(spSelector) {
                spSelector.innerHTML = showSaving ? savingPercentage : '';
                spSelector.classList.toggle('hidden', !showSaving);
            });

            Array.from(comparePriceSelectors).forEach(function(comparePriceSelector) {
                if (!comparePriceSelector) return;
                comparePriceSelector.innerHTML = hasCompareAt
                    ? Shopify.formatMoney(compareAtPrice, moneyFormat)
                    : '';
                comparePriceSelector.classList.toggle('hidden', !hasCompareAt);
            });

            Array.from(unitPriceSelectors).forEach(function(unitPriceSelector) {
                if (unitPriceSelector) {
                    if (selectedVariant.unit_price_measurement) {
                        var unitpriceText = Shopify.formatMoney(selectedVariant.unit_price, moneyFormat) + " / ";
                        unitpriceText +=
                            selectedVariant.reference_value == 1 ? "" : selectedVariant.unit_price_measurement.reference_value;
                        unitpriceText += selectedVariant.unit_price_measurement.reference_unit + "</p>";
                        unitPriceSelector.innerHTML = unitpriceText;
                        unitPriceSelector.classList.remove('hidden');
                    } else {
                        unitPriceSelector.classList.add('hidden');
                    }
                }
            });

            // Moved out of the unit price loop: it was previously nested inside,
            // so the sold out text was rewritten once per unit price element and
            // skipped entirely on products with none.
            Array.from(soldoutTextSelectors).forEach(function(soldoutTextSelector) {
                if (soldoutTextSelector) {
                    soldoutTextSelector.innerHTML = selectedVariant.available != true ? soldOutText : '';
                }
            });
        }
        else {
            priceContainer.style.display = 'none';
        }
    }
}


/* variant sku update on change */
function updateVariantSku(selectedVariant, _productParent) {
    let variantSku = "";
    if (selectedVariant && selectedVariant.sku) {
        variantSku = selectedVariant.sku;
    }
    let variantSkuContainer = _productParent.querySelector("[data-variant-sku]");
    if (variantSkuContainer) {
        variantSkuContainer.innerHTML = variantSku;
    }
}

/* Update inventory bar start */
function updateInventroyBar(variantQty, variantPolicy, variant) {
    let productInventoryBar = document.querySelector("[data-product-inventory-bar-wrapper]");
    if (productInventoryBar) {
        let quantity = productInventoryBar.querySelector("[data-inventory-check]").dataset.quantity;
        if (variantQty >= 0 && variantPolicy != '') {
            quantity = variantQty;
            if (quantity > 0 && quantity <= minInventroyQty && variantPolicy == "deny") {
                productInventoryBar.classList.remove("hidden", "full-inventory");
                productInventoryBar.classList.add("low-inventory");
                let quantityHtml = `<strong> ${variantQty} </strong>`;
                let newStatus = invLowStatus.replace("||inventory||", quantityHtml);
                productInventoryBar.querySelector("[data-inventory-message]").innerHTML = newStatus;
             
            } else if (quantity >= 0 && variant.available == true) {
                productInventoryBar.classList.remove("hidden", "low-inventory");
                productInventoryBar.classList.add("full-inventory");
                productInventoryBar.querySelector("[data-inventory-message]").innerHTML = invAvailableStatus;

            } else {
                productInventoryBar.classList.add("hidden");
            }
            productInventoryBar.querySelector("[data-inventory-check]").setAttribute("data-quantity", variantQty);
        } else {
            productInventoryBar.classList.add("hidden");
        }
    }
}
/* Update variant image in gallery based on selected variant start */
function updateVariantImage(variant, _productParent) {
    if (variant.featured_media) {
        let variantMediaId = variant.featured_media.id;
        let variantMedia = _productParent.querySelector('#productMedia-' + variantMediaId);
        let mediaParent = _productParent.querySelector('[data-product-main-media]');
        if (variantMedia && mediaParent) {
            if (mediaParent.classList.contains('slick-initialized')) {
                let slickIndex = variantMedia.closest(".slick-slide").getAttribute("data-slick-index");
                let slider = $(mediaParent)
                slider.slick('slickGoTo', slickIndex);
            } else {
                let childCount = mediaParent.children.length;
                let firstChild = mediaParent.firstChild;
                if (childCount > 1) {
                    mediaParent.insertBefore(variantMedia, firstChild)
                }
            }

        }
    }

}
/* Update buttons according selected variant */
function updateButtonText(selectedVariant, _productParent, variantInventory, AddToCartButtonWrapper, AddToCartButtonText) {
    if (selectedVariant.available == true) {
        if (AddToCartButtonWrapper) {
            AddToCartButtonWrapper.removeAttribute("disabled");
        }
        if (AddToCartButtonText) {
            if (preorderStatus && variantInventory.inventory_policy == "continue" && variantInventory.inventory_quantity <= 0) {
                AddToCartButtonText.innerHTML = preorderText;
            } else {
                AddToCartButtonText.innerHTML = addToCartText;
            }
        }

    } else {
        if (AddToCartButtonWrapper) {
            AddToCartButtonWrapper.setAttribute("disabled", true);
        }
        if (AddToCartButtonText) {
            AddToCartButtonText.innerHTML = soldOutText;
        }
    }

}

function pickUpAvialabiliy(parentSection, variant) {
    let pickupSection = parentSection.querySelector('[data-pickup-availability]');
    let pickupContent = parentSection.querySelector('[data-pickup-availability-content]');
    let pickupDrawer = parentSection.querySelector('[data-pickup-location-list]');
    if (pickupSection) {
        if (variant != undefined && variant.available == true) {
            var rootUrl = pickupSection.dataset.rootUrl;
            var variantId = variant.id;
            if (!rootUrl.endsWith("/")) {
                rootUrl = rootUrl + "/";
            }
            var variantSectionUrl = `${rootUrl}variants/${variantId}/?section_id=pickup-availability`;

            fetch(variantSectionUrl)
                .then((response) => response.text())
                .then((text) => {
                    
                    if(pickupDrawer && pickupDrawer.classList.contains('slick-initialized')){
                        $(pickupDrawer).slick('unslick');
                    }
                    var pickupAvailabilityHTML = new DOMParser().parseFromString(text, "text/html").querySelector(".shopify-section");
                    let currentVariantPickupContent = pickupAvailabilityHTML.querySelector('[data-pickup-availability-content]');
                    let currentVariantPickuplist = pickupAvailabilityHTML.querySelector('[data-pickup-location-list]');
                    pickupContent.innerHTML = currentVariantPickupContent ? currentVariantPickupContent.innerHTML : '';
                    pickupDrawer.innerHTML = currentVariantPickuplist ? currentVariantPickuplist.innerHTML : '';
                    if (currentVariantPickupContent.innerHTML != '') {
                        pickupSection.setAttribute('available', '')
                    } else {
                        pickupSection.removeAttribute('available')
                    }
                    if(pickupDrawer){
                        slickSlider($(pickupDrawer))
                    }
                    // sideDrawerEventsInit(parentSection)
                    sideDrawerInt();
                })
                .catch((e) => {});
        } else {
            pickupContent.innerHTML = '';
            pickupDrawer.innerHTML = '';
            pickupSection.removeAttribute('available')
        }
    }

}
/// add to cart element 
function getAddToCartElements(section = document) {
    let cartAtcElements = section.querySelectorAll("[data-add-to-cart]");
    Array.from(cartAtcElements).forEach(function(element) {
        initAddToCart(element);
    });

}
/// initialize add to cart element 
function initAddToCart(element) {
    element.addEventListener('click', (event) => {
        event.preventDefault();
        let form = element.closest('form');
        let formParent = element.closest('.shopify-section');
        if (element.hasAttribute('data-add-to-cart')) {
            element.classList.add('loading');
        }
        if (!form) {
            let productFrom = formParent.querySelector('.main-product-form');
            if (productFrom) {
                let atcButton = productFrom.querySelector("[data-add-to-cart]");
                if (atcButton) {
                    previousFocusElement = element;
                    atcButton.click();
                }
            }
            return false;
        }
        if (formParent) {
            if(formParent.querySelector('[data-gift-card-box]')){
                let giftCardSection = formParent.querySelector('[data-gift-card-box]');
                let errormessageWrapper = giftCardSection.querySelector('[data-gift-card-errors]');
                let errorMessage = errormessageWrapper.querySelector('.error-message')
                errormessageWrapper.classList.add('hidden')
                errorMessage.innerHTML = '';
            }
            if (formParent.querySelector('.error-message')) {
                formParent.querySelector('.error-message').style.display = 'none';
                formParent.querySelector('.error-message').innerHTML = '';
            }
        }
        
       
        addItemToCart(formParent, form, element) 
    });
}

function addItemToCart(formParent, form, element) {
    const config = {
        method: 'POST',
        headers: {
            'X-Requested-With': `XMLHttpRequest`,
            'Accept': `application/javascript`
        }
    };
   
    const formData = new FormData(form);
    let sectionId = 'ajax-cart';
    let cartSection = document.querySelector('[data-cart-content]');
    var baseUrl = window.location.pathname;
    if (baseUrl.indexOf("/cart") > -1) {
        if (cartSection) {
            sectionId = cartSection.dataset.section;
        }
    }
    const checkCartDrawer = element.getAttribute("data-cart-drawer-status");
    formData.append('sections', [sectionId]);
    config.body = formData;
    fetch(cartAddUrl, config)
        .then((response) => {
            return response.text();
        })
        .then((result) => {
            const cart = JSON.parse(result);

            setTimeout(() => {
                element.classList.remove('loading');
                let stickyATC = formParent.querySelector('[data-sticky-atc-wrapper]');
                if (stickyATC) {
                    stickyATC.classList.remove('loading');
                }
            }, 100);
            if (element.hasAttribute('data-add-to-cart')) {
                element.classList.remove('loading')
            }
  
            if (cart.status) {
                if (cart.errors) {
                    let giftCardWrapper = formParent.querySelector('[data-gift-card-box]');
                    if (giftCardWrapper && cart.errors['email']) {
                        let errormessageWrapper = giftCardWrapper.querySelector('[data-gift-card-errors]');
                        let giftCardEmail = formParent.querySelector('[type=email]');
                        let errorMessage = errormessageWrapper.querySelector('.error-message');
                        errorMessage.innerHTML = giftCardEmail.dataset.attr + ' ' + cart.errors['email'];
                        errorMessage.style.display = 'block';
                        errormessageWrapper.classList.remove('hidden')
                            // giftCardErrors
                    }
                } else

                if(form.closest("[data-grid-quick-view-content]")){
                    form.closest("[data-grid-quick-view-content]").querySelector('[data-error-text]').innerHTML = cart.description;
                    form.closest("[data-grid-quick-view-content]").querySelector('[data-error-text]').style.display = 'block';
                }
                
                if (formParent.querySelector('.error-message')) {
                   
                    formParent.querySelector('[data-error-text]').innerHTML = cart.description;
                    formParent.querySelector('.error-message').style.display = 'block';
                    if (isOnScreen(formParent.querySelector('.error-message'))) {
                        return false;
                    }
                    var scrollDiv = document.querySelector('.error-message').offsetTop;
                    window.scrollTo({ top: scrollDiv, behavior: 'smooth' });
                }
                return false;
            }
            let cartHtml = new DOMParser().parseFromString(cart.sections[sectionId], 'text/html').querySelector('.shopify-section');
            if (baseUrl.indexOf("/cart") > -1){
                updateCartHtml(cartSection,cart,sectionId)
                var scrollDiv = cartSection.offsetTop;
                window.scrollTo({ top: scrollDiv, behavior: 'smooth' });
            }
            else{
              if(checkCartDrawer == 'true'){
                let cartDrawer = document.querySelector('#cart-side-drawer');
                if(cartDrawer) {
                    let cartCount = parseInt(cartHtml.querySelector("[data-section]").getAttribute('data-item-count'));
                    document.querySelector('[data-cart-drawer]').innerHTML = cartHtml.querySelector('[data-cart-drawer]').innerHTML;
                    if(formParent.classList.contains("quickview-side-drawer") || formParent.classList.contains("show")){
                        setTimeout(function() {  formParent.classList.remove("show")},200);
                        setTimeout(function() { formParent.style.display = "none"},300);     
                    }
                    sideDrawerInt();
                    cartDrawer.style.display = "flex";
                    document.querySelector('body').classList.add('no-scroll');
                    setTimeout(function() { cartDrawer.classList.add("show"); }, 400)

                    if (previousFocusElement == '') {
                        previousFocusElement = element;
                    }
                    setTimeout(() => {
                        focusElementsRotation(document.querySelector('[data-cart-drawer]'));
                    },1500);
                    updateCartHtml(cartSection, cart, sectionId)
               
                }
              }else{
                 window.location = mainCartUrl;
              }
                
            }
            // if (freeShippingBarStatus) {
            //     freeShippingBar(cart.final_line_price, cart.item_count)
            // }
        })
}


function cartDrawerNoteInit() {
    if(document.querySelector("[data-cart-toggle]") && document.querySelector("[data-cart-note-wrapper]")) {
        let cartDrawerNoteBtn = document.querySelector("[data-cart-toggle]");
        let cartDrawerNoteWrap = document.querySelector("[data-cart-note-wrapper]");
        let cartDrawerApiTrigger = document.querySelectorAll("[data-cart-note-trigger]");
        Array.from(cartDrawerApiTrigger).forEach(function(element) {
            element.addEventListener("click", function(event) {
                DOMAnimations.slideUp(cartDrawerNoteWrap, 300);
            });
            
        })

        // let cartDrawerApiTrigger = document.querySelector("[data-cart-note-trigger]");
        cartDrawerNoteBtn.addEventListener("click", function(event) {
            DOMAnimations.slideToggle(cartDrawerNoteWrap, 300);
        });
       
    }
}

function cartCountUpdate(count) {
    let cartselector = document.querySelector("[data-header-cart-count]")
    if (count == 0) {
        cartselector.textContent = 0;
        cartselector.classList.add("hidden")

    } else {
        if(count<=99){
            cartselector.classList.remove('large-count');
            count=count;
        }else{
            count='';
            cartselector.classList.add('large-count');
        }
        cartselector.textContent = count;
        cartselector.classList.remove("hidden")
    }
}

function colorSwatchesMediaChanged(section = document) {
    let gridSwatchTriggers = section.querySelectorAll("[card-color-option]");
    Array.from(gridSwatchTriggers).forEach(function(element) {
        element.addEventListener("mouseover", function(event) {
            let productGrid = element.closest('[data-product-card]');
            let gridMainImage = productGrid.querySelector('[data-main-image]')
            let moreImageElement = element.querySelector('script');
            if (productGrid.querySelector(".variant-item.active")) {
                productGrid.querySelector(".variant-item.active").classList.remove("active");
            }
            element.classList.add("active");
            if (moreImageElement && gridMainImage) {
                let swatchMedia = new DOMParser().parseFromString(JSON.parse(moreImageElement.textContent), "text/html").querySelector('.media-content');
                gridMainImage.innerHTML = swatchMedia.innerHTML;
            }
        });
        element.addEventListener("click", function(event) {
            let url = element.getAttribute('data-url');
            if (url) {
                let finalUrl = window.location.origin + url;
                window.location.href = finalUrl
            }
        })
    })

}
/* change product option on select */
function productVariantOption(section = document) {
    let productContentContainers = section.querySelectorAll('[data-product-content]');
    Array.from(productContentContainers).forEach(function(productContentContainer) {
        let selectIds = productContentContainer.querySelectorAll('[name="id"]');
        Array.from(selectIds).forEach(function(selectId) {
            selectId.removeAttribute("disabled");
        });
        let option = productContentContainer.querySelectorAll('.option');
        option.forEach((element) => {
            element.addEventListener('click', (event) => {
                let parent = event.target.closest('.custom-select').children[0];
                parent.setAttribute('data-type', event.target.getAttribute('data-type'));
                parent.querySelector(".custom-select-text").innerHTML = '<strong>' + event.target.innerText + '</strong>';
            });
        });
        let currentfieldsets = Array.from(productContentContainer.querySelectorAll(".product-loop-variants"));
        var productOptions = productContentContainer.getElementsByClassName("productOption");
        if (productOptions) {
            var options = [];
            let optionStyle = 'select';
            let eventType = "change";
            // productdetails
            let productDetail = '';
            if (productContentContainer.querySelector('[type="application/json"][data-name="product-variants"]')) {
                productDetail = JSON.parse(productContentContainer.querySelector('[type="application/json"][data-name="product-variants"]').textContent);
            }

          
            let productOptionsWithValues = '';
            if (productContentContainer.querySelector('[type="application/json"][data-name="product-options"]')) {
                productOptionsWithValues = JSON.parse(productContentContainer.querySelector('[type="application/json"][data-name="product-options"]').textContent
                );
            }
            let productvariantInventory = '';
            let variantInventory = '';
            if (productContentContainer.querySelector('[type="application/json"][data-name="product-inventories"]')) {
                productvariantInventory = JSON.parse(productContentContainer.querySelector('[type="application/json"][data-name="product-inventories"]').textContent);
            }
            if (productDetail != '' && productOptionsWithValues != '') {
                options = currentfieldsets.map((fieldset) => { 
                    if(fieldset.classList.contains('product-variants-list')) return false;
                    return Array.from(fieldset.querySelectorAll("input")).find((radio) => radio.checked).value; 
                });        
                var _productSection = productContentContainer.closest(".shopify-section");
                var selectedVariant = getVariantDetails(options, "options", productContentContainer, productDetail, productContentContainer);    
                updateBackInStock(selectedVariant,productContentContainer);
                updateOptions(productDetail, productOptionsWithValues, selectedVariant, currentfieldsets);
                let inventoryBar = productContentContainer.querySelector("[data-product-inventory-bar-wrapper]");
                if (inventoryBar && productvariantInventory != '' && selectedVariant != undefined) {
                    variantInventory = productvariantInventory.find((variant) => {
                        return variant.id == selectedVariant.id;
                    });
                    inventoryBar.classList.remove("hidden");
                    updateInventroyBar(variantInventory.inventory_quantity, variantInventory.inventory_policy, selectedVariant);
                }
               
            }
            let mainConatinerSection = productContentContainer.closest(".main-product");
            if(productContentContainer.closest(".main-product")){

            updateStickyBarOptions(mainConatinerSection)
            }
         

            Array.from(productOptions).forEach(function(productOption) {
                productOption.addEventListener(eventType, () => {
                    var _productParent = productOption.closest("[data-product-wrapper]");
                    var partent = productOption.closest(".product-loop-variants");
                    let productPageSection = _productParent.closest(".shopify-section"); 
                    if(_productParent.closest('[data-quickview-content]')){
                      productPageSection = _productParent.closest("[data-quickview-content]"); 
                    } 
                    const fieldsets = Array.from(_productParent.querySelectorAll(".product-loop-variants"));
                    if (optionStyle == "dropdown") {
                        options = fieldsets.map((fieldset) => {
                            return Array.from(fieldset.querySelectorAll("select")).find((select) => select).value;
                        });
                    } else {

                        options = fieldsets.map((fieldset) => {
                            return Array.from(fieldset.querySelectorAll("input")).find((radio) => radio.checked).value;
                        });
                    }
                    if (partent) {
                        if (partent.querySelector("li.variant-item.active")) {
                            partent.querySelector("li.variant-item.active").classList.remove("active");
                        }
                        if (productOption.closest('li.variant-item')) {
                            productOption.closest("li.variant-item").classList.add("active")
                        }
                    }
                    var selectedVariant = getVariantDetails(options, "options", _productParent, productDetail, productContentContainer);
                    updateOptions(productDetail, productOptionsWithValues, selectedVariant, fieldsets)
                    var priceContainer = productContentContainer.querySelector("[data-price-wrapper]");
                    updateVariantPrice(productPageSection, priceContainer, selectedVariant, true);

                    let stickyWrapper = _productSection.querySelector('[data-sticky-products-wrapper]');
                    if (stickyWrapper) {
                        let stickyPriceWrapper = stickyWrapper.querySelector('[data-price-wrapper]');
                        if (stickyPriceWrapper) {
                            updateVariantPrice(_productSection, stickyPriceWrapper, selectedVariant, true);
                        }
                    }
                    let errorWrappers = productPageSection.querySelectorAll(".error-message");
                    if (errorWrappers) {
                        Array.from(errorWrappers).forEach(function(errorWrapper) {
                            errorWrapper.innerHTML = "";
                            errorWrapper.style.display = "none";
                        });
                    }
                    var AddToCartButtonWrapper = _productParent.querySelector("[data-addtocart-wrapper]");
                    var AddToCartButtonText = AddToCartButtonWrapper.querySelector("[data-addtocart-text]");
                    let inventoryBar = _productParent.querySelector("[data-product-inventory-bar-wrapper]");

                    if (stickyWrapper) {
                        var stickyPaymentButtonWrapper = _productSection.querySelector("[data-sticky-atc-wrapper]");
                        if (stickyPaymentButtonWrapper) {
                            var stickypaymentButton = stickyPaymentButtonWrapper.querySelector("[data-addtocart-text]");
                        }
                    }

                    pickUpAvialabiliy(productPageSection, selectedVariant)
                    if (selectedVariant != undefined) {
                        updateAllVariantInput(selectedVariant, _productParent);
                        updateVariantSku(selectedVariant, _productParent);
                        updateUrl(selectedVariant);
                        if (productvariantInventory != '') {
                            variantInventory = productvariantInventory.find((variant) => {
                                return variant.id == selectedVariant.id;
                            });
                        }
                        updateButtonText(selectedVariant, _productParent, variantInventory, AddToCartButtonWrapper, AddToCartButtonText);
                        if(stickyWrapper && stickyPaymentButtonWrapper){
                            updateButtonText(selectedVariant, _productParent, variantInventory, stickyPaymentButtonWrapper, stickypaymentButton);
                        }
                       
                        variantInventory = productvariantInventory.find((variant) => {
                            return variant.id == selectedVariant.id;
                        });
                        if (inventoryBar) {
                            inventoryBar.classList.remove("hidden");
                            updateInventroyBar(variantInventory.inventory_quantity, variantInventory.inventory_policy, selectedVariant);
                        }
                        updateVariantImage(selectedVariant, _productParent);
                        updateBackInStock(selectedVariant,productContentContainer);

                    } else {
                        let inventoryBar = _productParent.querySelector("[data-product-inventory-bar-wrapper]");
                        if (inventoryBar) {
                            inventoryBar.classList.add("hidden");
                        }
                        if (_productParent.querySelector("shopify-payment-terms")) {
                            _productParent.querySelector(
                                "shopify-payment-terms"
                            ).style.display = "none";
                        }
                        if (AddToCartButtonWrapper) {
                            AddToCartButtonWrapper.setAttribute("disabled", true);
                        }
                        if (AddToCartButtonText) {
                            AddToCartButtonText.innerHTML = unavailableText;
                        }
                        if (stickyPaymentButtonWrapper) {
                            stickyPaymentButtonWrapper.setAttribute("disabled", true);
                        }
                        if (stickyPaymentButtonWrapper && stickypaymentButton) {
                            stickypaymentButton.innerHTML = unavailableText;
                        }
                    }
                    setTimeout(() => {
                        if(productContentContainer.closest(".main-product")){
                            updateStickyBarOptions(mainConatinerSection)
                           }  
                    }, 100);
                    
                   
                });
            });
        }
    });
}

function updateStickyBarOptions(container){

    if(document.querySelector("[data-sticky-products-wrapper]") && container.querySelector(".product-variants-options")){
            let getproductoptionsHtmls = container.querySelector(".product-variants-options").innerHTML;
            let optionscontainer = container.querySelector("[data-sticky-products-wrapper] .product-variants-options");
            let divContent = document.createElement('div');
            divContent.innerHTML = getproductoptionsHtmls;
            let optionsitems = divContent.querySelectorAll(".productOption");
            Array.from(optionsitems).forEach(function(option){
                let optionsId = option.getAttribute("id");
                
                optionsId="sticky-"+optionsId;
               console.log("optionsId",optionsId)
                option.setAttribute("id",optionsId);
                if(option.closest(".custom-select-item")){
                   let optionParent  = option.closest(".custom-select-item");
                   optionParent.querySelector(".option").setAttribute("for",optionsId)
                }

            if(option.getAttribute("name").indexOf("sticky") == -1){
                option.setAttribute("name","sticky-"+option.getAttribute("name"));
                option.removeAttribute("form");
                option.removeAttribute("checked");
                if(option.parentElement.classList.contains('active')){
                    option.setAttribute("checked",true);
                }
            } 
            })
            optionscontainer.innerHTML = divContent.innerHTML;
            stickyProductOptions();
          
    }
}

function stickyProductOptions(section=document){
   let productContainers = section.querySelectorAll('[data-sticky-products-wrapper]');
    productContainers.forEach((container) => {
        let selectOptions = container.querySelectorAll('[data-custom-select]');
        selectOptions.forEach((selectOption) => {
            selectOption.addEventListener('click', () => {
                DOMAnimations.slideDown(selectOption.querySelector('[data-custom-select-summary]'), 200);
            });
            selectOption.onkeydown = function (e) {
                if (e.keyCode == 13 || e.keyCode == 32) {
                    selectOption.click();
                }
            };
            section.addEventListener('click', (event) => {
                if (!selectOption.parentNode.contains(event.target)) {
                    DOMAnimations.slideUp(selectOption.querySelector('[data-custom-select-summary]'), 300);
                }
            });
        });
        let stickyProductOptions = container.querySelectorAll(".productOption");
        if (stickyProductOptions.length > 0) {
            stickyProductOptions.forEach((productOption) => {
                productOption.addEventListener("click", () => {
                    let optionId = productOption.getAttribute("id").replace('sticky-', '');
                    let targetElement = variantStyle === 'dropdown'
                        ? document.querySelector("label.option[for='" + optionId + "']")
                        : document.querySelector("#" + optionId);

                    if (targetElement) {
                        targetElement.click();
                    }
                });
            });
        }
    });
}
function updateOptions(product, productOptions, selectedVariant, optionSelectors) {
    if (!selectedVariant) {
        return;
    }
   
    if (optionSelectors && optionSelectors[0]) {
        productOptions[0]["values"].forEach((value, valueIndex) => {
            const combinationExists = product.some((variant) => variant["option1"] === value && variant),
            availableVariantExists = product.some((variant) => variant["option1"] === value && variant["available"]);
            classAddToSelector(optionSelectors[0], valueIndex, availableVariantExists, combinationExists);
            if (optionSelectors[1]) {
                productOptions[1]["values"].forEach((value2, valueIndex2) => {
                    const combinationExists2 = product.some((variant) => variant["option2"] === value2 && variant["option1"] === selectedVariant["option1"] && variant),
                        availableVariantExists2 = product.some((variant) => variant["option2"] === value2 && variant["option1"] === selectedVariant["option1"] && variant["available"]);
                    classAddToSelector(optionSelectors[1], valueIndex2, availableVariantExists2, combinationExists2);
                    if (optionSelectors[2]) {
                        productOptions[2]["values"].forEach((value3, valueIndex3) => {
                            const combinationExists3 = product.some((variant) => variant["option3"] === value3 && variant["option1"] === selectedVariant["option1"] && variant["option2"] === selectedVariant["option2"] && variant),
                                availableVariantExists3 = product.some((variant) => variant["option3"] === value3 && variant["option1"] === selectedVariant["option1"] && variant["option2"] === selectedVariant["option2"] && variant["available"]);
                            classAddToSelector(optionSelectors[2], valueIndex3, availableVariantExists3, combinationExists3);
                        });
                    }
                });
            }
        });
    }
}


function updateBackInStock(variant,container){
    if(container){
        let backInStockWrapper = container.querySelector('[data-back-in-stock]')
        if(backInStockWrapper){
            let backInStockVariant = container.querySelector('[data-variant-title]')
            let backInStockVariantUrl = container.querySelector('[data-variant-url]')
            if (variant != undefined) {
                let baseUrl = window.location.pathname;
                if (baseUrl.indexOf("/products/") > -1) {
                    let _updateUrl = baseUrl + "?variant=" + variant.id+"&contact_posted=true";
                    backInStockVariantUrl.value =  _updateUrl;
                }
                backInStockVariant.value = variant.name;
                if(variant.available){
                    if(!Shopify.designMode){
                        backInStockWrapper.classList.add('hidden')
                    }
                }
                else{
                    backInStockWrapper.classList.remove('hidden')
                }
            }
            else{
                if(!Shopify.designMode){
                    backInStockWrapper.classList.add('hidden')
                }
            }
        }
    }
}


function initStickyAddToCart(section = document) {
    let mainProductForm = section.querySelector('.main-product-form[action^="' + cartAdd + '"]');
    let footerElement = document.querySelector("footer")
    if (mainProductForm) {
        let formScrollTop = mainProductForm.offsetTop;
        let stickyBar = section.querySelector('[data-sticky-products-wrapper]');
        if (stickyBar) {
            if (stickyBar.querySelector('.sticky-cart-button')) {
                let stickyButton = stickyBar.querySelector('.sticky-cart-button');
                stickyButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    let optionsElement = stickyBar.querySelector(".sticky-cart-options");
                    if(stickyButton.classList.contains('open')){
                        stickyButton.classList.remove('open')
                        DOMAnimations.slideUp(optionsElement, 300);
                    }else{
                        stickyButton.classList.add('open');
                        DOMAnimations.slideDown(optionsElement, 300);
                    }
                    
                })
            }
            window.addEventListener('scroll', function(event) {
               
                if(isOnScreen(footerElement, true)){
                    stickyBar.classList.remove('show');
                }else{
                    if (isOnScreen(mainProductForm, true) || window.scrollY < (formScrollTop + 100) ) {
                        stickyBar.classList.remove('show');
                    } else {
                        stickyBar.classList.add('show');
                    }
                }
            
            });
        }
    }
}

/* get variant based on selected options end */
const classAddToSelector = (selector, valueIndex, available, combinationExists) => {
    const optionValue = Array.from(selector.querySelectorAll(".productOption"))[valueIndex];
    if (optionValue.hasAttribute('custom-dropdown')) {
        optionValue.parentElement.classList.toggle("hidden", !combinationExists);
        optionValue.classList.toggle("not-available", !available);
    } else {
        optionValue.parentElement.classList.toggle("hidden", !combinationExists);
        optionValue.classList.toggle("not-available", !available);
    }
};

function isOnScreen(elem, form) {
    if (elem.length == 0) {
        return;
    }
    var $window = $(window);
    var viewport_top = $window.scrollTop();
    var viewport_height = $window.height();
    var viewport_bottom = viewport_top + viewport_height;
    var $elem = $(elem);
    var top = $elem.offset().top;
    var height = $elem.height();
    var bottom = top + height;

    return (
        (top >= viewport_top && top < viewport_bottom) ||
        (bottom > viewport_top && bottom <= viewport_bottom) ||
        (height > viewport_height &&
            top <= viewport_top &&
            bottom >= viewport_bottom)
    );
}
// Product recommendation start 
function productRecommendations() {
    const productRecommendationsSections = document.querySelectorAll("[product-recommendations]");
    Array.from(productRecommendationsSections).forEach(function(productRecommendationsSection) {
        productRecommendationsInit(productRecommendationsSection);
    });
}

function productRecommendationsInit(productRecommendationsSection) {
    const url = productRecommendationsSection.dataset.url;
    fetch(url)
        .then((response) => response.text())
        .then((text) => {
            const html = document.createElement("div");
            html.innerHTML = text;
            const recommendations = html.querySelector("[product-recommendations]");
            if (recommendations && recommendations.innerHTML.trim().length) {
                productRecommendationsSection.innerHTML = recommendations.innerHTML;
                productRecommendationsSection.closest('.shopify-section').style.display = 'block'
                let slider = productRecommendationsSection.querySelector("[data-slick]");
                if (slider) {
                    let sliderId = slider.getAttribute("id");
                    if (!slider.classList.contains("slick-initialized")) {
                        slickSlider($("#" + sliderId));
                    }
                }
                quickViewElements(productRecommendationsSection);
                colorSwatchesMediaChanged();
                productCardHoverInit();
                if(animationStatus){
                    if (AOS) { 
                      AOS.refreshHard() 
                    }
                  }
            }
        })
        .catch((e) => {
            console.error(e);
        });
}
// document.addEventListener("shopify:section:load",productRecommendations,false);
function recentlyViewedProducts() {
    let rvpWrappers = document.querySelectorAll('[data-recent-viewed-products]')
    Array.from(rvpWrappers).forEach(function(element) {
        let currentProduct = parseInt(element.dataset.product);
        let section = element.closest('.shopify-section');
        let cookieName = 'recently-viewed-products';
        let rvProducts = JSON.parse(window.localStorage.getItem(cookieName) || '[]');
        if (!isNaN(currentProduct)) {
            if (!rvProducts.includes(currentProduct)) {
                rvProducts.unshift(currentProduct);
            }
            window.localStorage.setItem(cookieName, JSON.stringify(rvProducts.slice(0, 14)));

            if (rvProducts.includes(parseInt(currentProduct))) {
                rvProducts.splice(rvProducts.indexOf(parseInt(currentProduct)), 1);
            }
        }
        let currentItems = rvProducts.map((item) => "id:" + item).slice(0, 14).join(" OR ");
        fetch(element.dataset.section + currentItems)
            .then(response => response.text())
            .then(text => {
                const html = document.createElement('div');
                html.innerHTML = text;
                const recents = html.querySelector('[data-recent-viewed-products]');
                if (recents && recents.innerHTML.trim().length) {
                    element.innerHTML = recents.innerHTML;
                    element.closest('.shopify-section').classList.remove('hidden');
                    let slider = section.querySelector("[data-slick]");
                    if (slider) {
                        let sliderId = slider.getAttribute("id");
                        if (!slider.classList.contains("slick-initialized")) {
                            slickSlider($("#" + sliderId));
                        }
                    }
                    quickViewElements(section);
                    colorSwatchesMediaChanged();
                    productCardHoverInit();
                    if(animationStatus){
                        if (AOS) { 
                          AOS.refreshHard() 
                        }
                      }
                   
                }
            })
            .catch(e => {
                console.error(e);
            });
    })
}

function marqueeScrollBar(selector) {
    var marqueeElement = selector;
    var marqueeParent = marqueeElement.closest('.shopify-section');
    var position = marqueeParent.getBoundingClientRect();
    var elementPosition = marqueeElement.getBoundingClientRect();
    var Elewidth = position.width;
    if (isOnScreen(marqueeParent)) {

        let speed = parseInt(marqueeElement.getAttribute('data-marquee-speed'))
        if (window.innerWidth < 768 && marqueeElement.hasAttribute('data-marquee-speed-mobile')) {
            speed = parseInt(marqueeElement.getAttribute("data-marquee-speed-mobile"));
        }
        if (marqueeElement.classList.contains('rtl-direction')) {
            var marqueepsoition = -(Elewidth / 2) + elementPosition.top;
            marqueeElement.style.transform = `translate3d(${(marqueepsoition / speed) * 10}px, 0px, 0px)`;
        } else {
            var marqueepsoition = (Elewidth / 2) - elementPosition.top;
            marqueeElement.style.transform = `translate3d(${marqueepsoition / speed * 10}px, 0px, 0px)`;
        }
    }
}

function marqueeTextScroll(section = document) {
    let marqueeElements = section.querySelectorAll('[data-marquee-on-scroll]');
    Array.from(marqueeElements).forEach((element) => {
        window.addEventListener('scroll', function() {
            marqueeScrollBar(element);
        });
    });
}

function marqueeTextAutoplay(section = document) {
    let marqueeElements = section.querySelectorAll('[data-marquee-text]');
    Array.from(marqueeElements).forEach((element) => {
        if (!element.querySelector("[data-marque-node]")) return false;
        let resizedMobile = false;
        let resizedDesktop = false;
        marqueeTextAutoplayInit(element)
        window.addEventListener('resize', function() {
            if (window.innerWidth > 767 && resizedDesktop == false) {
                marqueeTextAutoplayInit(element)
                resizedDesktop = true;
                resizedMobile = false;
            } else if (window.innerWidth < 768 && resizedMobile == false) {
                marqueeTextAutoplayInit(element)
                resizedMobile = true;
                resizedDesktop = true;
            }
        });
    });
}

function marqueeTextAutoplayInit(element) {
    let scrollingSpeed = parseInt(element.getAttribute("data-marquee-speed") || 15);
    if (window.innerWidth < 768 && element.hasAttribute('data-marquee-speed-mobile')) {
        scrollingSpeed = parseInt(element.getAttribute("data-marquee-speed-mobile"));
    }
    const contentWidth = element.clientWidth,
        node = element.querySelector("[data-marque-node]"),
        nodeWidth = node.clientWidth;
    // windowWidth = window.innerWidth;
    let slowFactor = 1 + (Math.max(1600, contentWidth) - 375) / (1600 - 375);
    element.parentElement.style.setProperty("--animation-speed", `${(scrollingSpeed * slowFactor * nodeWidth / contentWidth).toFixed(3)}s`);

}
/*------------------------Video play button------------------------------*/
function videoPlayInit() {
    if (document.querySelectorAll('[data-video-play-button]')) {
        let playButtons = document.querySelectorAll('[data-video-play-button]');
        Array.from(playButtons).forEach(function(playButton) {
            if (playButton) {
                videoPlayButtonClickEvent(playButton);
            }
        })
    }
}

function videoPlayButtonClickEvent(playButton) {
    if(playButton.closest('[data-video-main-wrapper]')){
        let parent_wrapper = playButton.closest('[data-video-main-wrapper]');
        let video_style = parent_wrapper.querySelector('video');
        let iframe_style = parent_wrapper.querySelector('iframe');
        playButton.addEventListener("click", function(event) {
            event.preventDefault();
            playButton.style.display = "none";
            let videoWrapper = parent_wrapper.querySelector('.video-content-wrapper');
            let videoTitle = parent_wrapper.querySelector('.video-title');
            parent_wrapper.querySelector('.video-thumbnail').style.display = "none";
            if (videoWrapper) {
                videoWrapper.style.display = "none";
            }
            if (videoTitle) {
                videoTitle.style.display = "none";
            }
            if (video_style) {
                video_style.style.display = "block";
                video_style.play();
            } else {
                if(iframe_style){
                    iframe_style.style.display = "block";
                }
               
            }
        })
    }
    
}
/*** End */

function imageCarousel(section = document) {
    let imageCarouselElements = section.querySelectorAll('[data-image-carousel]');
    Array.from(imageCarouselElements).forEach(function(imageCarouselElement) {
        imageCarouselElement.addEventListener('mouseover', function() {
            if (imageCarouselElement.classList.contains('active')) return false;
            let parentSection = imageCarouselElement.closest('.shopify-section');
            let activeItem = parentSection.querySelector(".images-carousel-content-item.active");
            let preId = activeItem.getAttribute("id");
            if (activeItem) {
                activeItem.classList.remove('active');
                imageCarouselElement.classList.add('active');
            }
            let currnetId = imageCarouselElement.getAttribute("id");
            let previousActives = parentSection.querySelectorAll(".images-carousel-img.active");
            Array.from(previousActives).forEach(function(previousActive){ 
                previousActiveIndex= previousActive.getAttribute("data-id");
                if(previousActiveIndex && previousActiveIndex != currnetId){
                    parentSection.querySelector(".images-carousel-img[data-id='"+previousActiveIndex+"']").classList.remove("active");
                    parentSection.querySelector(".images-carousel-img[data-id='"+previousActiveIndex+"']").classList.add("processing");
                    parentSection.querySelector(".images-carousel-img[data-id='"+previousActiveIndex+"']").style.zIndex = 2;
                }    
            })
            setTimeout(function(){
                Array.from(previousActives).forEach(function(previousActive){
                    previousActiveIndex= previousActive.getAttribute("data-id");
                    if(previousActiveIndex && previousActiveIndex != currnetId){
                        parentSection.querySelector(".images-carousel-img[data-id='"+previousActiveIndex+"']").classList.remove("processing");
                        parentSection.querySelector(".images-carousel-img[data-id='"+previousActiveIndex+"']").style.zIndex = 1;
                    }   
                })
            },300)

      
            let imageDetailsItem = parentSection.querySelector(".images-carousel-img[data-id='"+currnetId+"']")
            if(imageDetailsItem){
                imageDetailsItem.classList.add("active");
                imageDetailsItem.style.zIndex = 3;
            }
            let activeDescItem = parentSection.querySelector(".images-carousel-content-description.active");
            if (activeDescItem) {               
                if (preId != currnetId) {
                    activeDescItem.classList.remove('active');
                    activeDescItem.style.display='none';
                }
            }
            let currentActiveDesc = parentSection.querySelector('.images-carousel-content-description[data-id="' + currnetId + '"]');
            if (currentActiveDesc) {
                currentActiveDesc.classList.add('active')
                // setTimeout(function() {
                    currentActiveDesc.fadeIn(300)
                // }, 200)
            }
          
        })
    })
}

function customDropdownElements(section = document) {
    let customDropdowns = section.querySelectorAll('[data-custom-select]');
    Array.from(customDropdowns).forEach(function(dropdown) {
        dropdown.addEventListener('click', () => {
            DOMAnimations.slideToggle(dropdown.querySelector('[data-custom-select-summary]'), 300);
        });
        dropdown.onkeydown = function(e) {
            if (e.keyCode == 13 || e.keyCode == 32) {
                dropdown.click();
            }
        };
        section.addEventListener('click', (event) => {
            if (!dropdown.parentNode.contains(event.target)) {
                DOMAnimations.slideUp(dropdown.querySelector('[data-custom-select-summary]'), 300);
            }
        });
    });
}

function customDropdownElementsLocalization(section = document) {
    let customDropdowns = section.querySelectorAll('[data-details-head]');
    Array.from(customDropdowns).forEach(function(dropdown) {
        let parentSection=  dropdown.closest(".shopify-localization-form");
        if(dropdown.classList.contains('hover-event')){
            dropdown.addEventListener('mouseover', () => {
                if(dropdown.classList.contains("animation"))return false;
                dropdown.classList.add("animation")
                setTimeout(function(){
                    parentSection.querySelector("[data-details-select-summary]").style.opacity="1";
                    parentSection.querySelector("[data-details-select-summary]").style.transform="none";
                },100)
                parentSection.querySelector("[data-details-select-summary]").style.display="block"
            });

            dropdown.addEventListener('mouseleave', () => {
                setTimeout(function(){
                    parentSection.querySelector("[data-details-select-summary]").style.display="none"
                },100)
                parentSection.querySelector("[data-details-select-summary]").style.opacity="0";
                parentSection.querySelector("[data-details-select-summary]").style.transform="translate3d(0, 10%, 0)";
                dropdown.classList.remove("animation")
            });
          
            let mouseoverEvent = new MouseEvent("mouseover", {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                        });
                        let mouseleaveEvent = new MouseEvent("mouseleave", {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            });
                        
                dropdown.onkeydown = function(e) {
                    if (e.keyCode == 13 || e.keyCode == 32) {
                        if(dropdown.classList.contains("animation")){
                            dropdown.dispatchEvent(mouseleaveEvent);
                        }else{
                            dropdown.dispatchEvent(mouseoverEvent);
                        }
                    
                    }
                };
              
        }
        else{
            dropdown.addEventListener('click', () => {
                if(dropdown.classList.contains("animation")){
                    setTimeout(function(){
                        parentSection.querySelector("[data-details-select-summary]").style.display="none"
                    },300)
                    parentSection.querySelector("[data-details-select-summary]").style.opacity="0";
                    parentSection.querySelector("[data-details-select-summary]").style.transform="translate3d(0, 10%, 0)";
                    dropdown.classList.remove("animation")
    
                }else{
                    dropdown.classList.add("animation")
                    setTimeout(function(){
                        parentSection.querySelector("[data-details-select-summary]").style.opacity="1";
                        parentSection.querySelector("[data-details-select-summary]").style.transform="none";
                    },300)
                    parentSection.querySelector("[data-details-select-summary]").style.display="block"
                }
            });

            dropdown.onkeydown = function(e) {
                if (e.keyCode == 13 || e.keyCode == 32) {
                    dropdown.click();
                }
            };
        }
        section.addEventListener('click', (event) => {
            if (!dropdown.parentNode.contains(event.target)) {
                dropdown.classList.remove("animation")
                setTimeout(function(){
                    parentSection.querySelector("[data-details-select-summary]").style.display="none"
                },300)
                parentSection.querySelector("[data-details-select-summary]").style.opacity="0";
                parentSection.querySelector("[data-details-select-summary]").style.transform="translate3d(0, 10%, 0)";
                
            } 
        });
    });
}
function initMaps(section = document) {
    let mapSelectors = section.querySelectorAll('[data-map-container]');
    Array.from(mapSelectors).forEach(function(selector) {
        createMap(selector);
    })
}
var apiloaded = null;

function checkMapApi(selector, section = document) {
    let mapSelectors = section.querySelectorAll('[data-map-container]');
    let mapAddress = false;
    if (selector) {
        if (selector.getAttribute('data-location') != '' || selector.getAttribute('data-location') != null) {
            mapAddress = true
        }
    }
    Array.from(mapSelectors).forEach(function(selector) {
        if (selector.getAttribute('data-location') != '' || selector.getAttribute('data-location') != null) {
            mapAddress = true
        }
    })
    if (!mapAddress) return false;
    if (selector || mapSelectors.length > 0) {
        if (apiloaded === "loaded") {
            if (selector) {
                createMap(selector);
            } else {
                initMaps(section);
            }
        } else {

            if (apiloaded !== "loading") {
                apiloaded = "loading";
                if (
                    typeof window.google === "undefined" ||
                    typeof window.google.maps === "undefined"
                ) {
                    var script = document.createElement("script");
                    script.onload = function() {
                        apiloaded = "loaded";
                        if (selector) {
                            createMap(selector);
                        } else {
                            initMaps(section);
                        }
                    };
                    script.src = "https://maps.googleapis.com/maps/api/js?key=" + googleMapApiKey;
                    document.head.appendChild(script);
                }
            }
        }
    }
}
const createMarker = (map, position) => {
    return new google.maps.Marker({
        position: position,
        map: map
    });
};
const markers = [];
const updateMap = (map,latitude, longitude) => {
    map.setCenter({ lat: latitude, lng: longitude });
    map.setZoom(15);
    markers.forEach(marker => marker.setMap(null));
    const position = { lat: latitude, lng: longitude };
    const marker = createMarker(map, position);
    markers.push(marker);
};

function mapSidebarElementsInt(section = document) {
    var mapElements = section.querySelectorAll('.store-locator-content-item');
    Array.from(mapElements).forEach(function(mapElement) {
        if (mapElement.hasAttribute('data-store-heading')) return false;
        mapSidebarElements(mapElement);
    });
}

function mapSidebarElements(element, map, geocoder) {
    let parent = element.closest('.store-locator-box');
    element.addEventListener("click", (event) => {
        setTimeout(() => {
        var geocoder =new google.maps.Geocoder();
        let activeElement = parent.querySelector('.store-locator-content-item.active');
        let ativeImageElemnt = parent.querySelector('.store-locator-img.active');
        if (activeElement) {
            activeElement.classList.remove('active');
            element.classList.add('active');
        }
        let getMediaRef = element.getAttribute('data-media');
        let currentMedia = parent.querySelector('#' + getMediaRef);
        if (currentMedia) {
            if (ativeImageElemnt) {
                ativeImageElemnt.classList.remove('active');
                ativeImageElemnt.classList.add('hidden');
            }
            currentMedia.classList.remove('hidden');
            currentMedia.classList.add('active');
        }
        let currentLocation = element.getAttribute('data-map');
        let mapSelector = parent.querySelector('.store-locator-map');
        if (currentLocation != '') {
            if (mapSelector) {
                mapSelector.classList.remove('hidden')
            }
            if(googleMapApiKey != '' ){
                let geoDetail = getGeoDetails(geocoder, currentLocation);
                geoDetail.then(function(currentLocation) {
                    if (geoDetail != null) {
                            map = new google.maps.Map(mapSelector, {
                            center: {
                                lat: 0,
                                lng: 0,
                            },
                            zoom: 8,
                            });
                        updateMap(map,currentLocation[0], currentLocation[1]);
                    }
                })
            }

        } else {
            if (mapSelector) {
                mapSelector.classList.add('hidden')
            }
        }
    },500)
    })

}

function createMap(selector) {
    var geocoder =new google.maps.Geocoder();
    var address = jQuery(selector).data("location");
    var mapStyle = jQuery(selector).data("map-style");
    geocoder.geocode({ address: address }, function(results, status) {
        if (results != null) {
            var options = {
                zoom: 17,
                backgroundColor: "none",
                center: results[0].geometry.location,
                mapTypeId: mapStyle,
            };
            var map = (this.map = new google.maps.Map(selector, options));
            var center = (this.center = map.getCenter());
            var marker = new google.maps.Marker({
                map: map,
                position: map.getCenter(),
            });
            window.addEventListener("resize", function() {
                setTimeout(function() {
                    google.maps.event.trigger(map, "resize");
                    map.setCenter(center);
                }, 250);
            });
            let parentSection = selector.closest('.shopify-section');
            var details = parentSection.querySelectorAll('[data-store-details]');
            Array.from(details).forEach(function(element) {
                mapSidebarElements(element, map, geocoder)
            });
        }
    });
}
async function getGeoDetails(geocoder, address) {
    let getAddress = new Promise(function(resolve, reject) {
        geocoder.geocode({ 'address': address }, function(results, status) {
            if (status === 'OK') {
                resolve([results[0].geometry.location.lat(), results[0].geometry.location.lng()]);
            } else {
                reject(new Error('Couldnt\'t find the location ' + address));
            }
        })
    })
    return await getAddress;
}


function initBeforeAfter(section = document) {
    let cursors = section.querySelectorAll("[data-image-comparison-button]");
    setTimeout(() => {
        Array.from(cursors).forEach(function(cursor) {
            imageComparison(cursor);
        });
    }, 500);
}

function imageComparison(cursor){
    if (!cursor.offsetParent) {
        return false;
    }
    let layout='';
    let active = false;
    const parentSection = cursor.closest(".shopify-section");
    const imagWrapper =parentSection.querySelector(".image-comparison-wrapper"); 
    cursor.addEventListener('mousedown', function(){
        active = true;
        parentSection.classList.add('scrolling');
    });
    cursor.addEventListener('mouseup',function(){
        active = false;
        parentSection.classList.remove('scrolling');
    });
  
    parentSection.addEventListener('mousemove',function(e){
        if (!active) return;
        if(parentSection.querySelector(".image-comparison-wrapper") && parentSection.querySelector(".image-comparison-wrapper").getAttribute("data-layout") === "horizontal"){
            layout=parentSection.querySelector(".image-comparison-wrapper").getAttribute("data-layout");
       }
       let bounding=parentSection.getBoundingClientRect();
        const event = (e.touches && e.touches[0]) || e;
        let x = layout? event.pageX - (bounding.left + window.scrollX): event.pageY - (bounding.top + window.scrollY);           
        scrollIt(x,layout,parentSection);
    });


    cursor.addEventListener('touchstart', function(){
        active = true;
        parentSection.classList.add('scrolling');
    })

    cursor.addEventListener('touchend',function(){
        active = false;
        parentSection.classList.remove('scrolling');
    });

    parentSection.addEventListener('touchmove',function(e){
        if (!active) return;
        if(parentSection.querySelector(".image-comparison-wrapper")){
            layout=parentSection.querySelector(".image-comparison-wrapper").getAttribute("data-layout");
       }
       let bounding=parentSection.getBoundingClientRect();
        const event = (e.touches && e.touches[0]) || e;
        let x = layout? event.pageX - (bounding.left + window.scrollX): event.pageY - (bounding.top + window.scrollY);           
        scrollIt(x,layout,imagWrapper);
    });

    function scrollIt(x,layout,imagWrapper) {
        const distance = layout ? imagWrapper.clientWidth : imagWrapper.clientHeight;
        const max = distance - 20;
        const min = 20;
        const mouseX = Math.max(min, (Math.min(x, max)));
        const mousePercent = (mouseX * 100) / distance;
        parentSection.querySelector(".image-comparison-wrapper").style.setProperty('--percent', mousePercent + '%');
    }

 
}

function popupContentElements() {
    let popupElements = document.querySelectorAll("[data-popup-header]");
    let popupBody = document.querySelectorAll("[data-popup-body]");
    let closepopupElement = document.querySelectorAll("[data-popup-close]");
    Array.from(popupElements).forEach(function(element) {
        element.addEventListener("click", function(event) {
            event.preventDefault();
            let id = element.getAttribute("href");
            Array.from(popupBody).forEach(function(bodyElement) {
                bodyElement.classList.remove("show");
                bodyElement.style.display = "none";
            });
            if(element.hasAttribute("data-product-media")){
                let mediaId = element.getAttribute("id");
              
                let mediaParent = element.closest(".shopify-section").querySelector('.product-media-popup-content');
             
                let mediaPopId=mediaParent.querySelector("#"+mediaId);
                if (mediaId && mediaParent) {
                    let childCount = mediaParent.children.length;
                    let firstChild = mediaParent.firstChild;
                    if (childCount > 1) {
                        mediaParent.insertBefore(mediaPopId, firstChild)
                    }
                 
                }
              
            }
            document.querySelector("body").classList.add("no-scroll");
            if(id == '#sizeChart'){
                document.querySelector("body").classList.add("sizeChart-popup-open");
            }
            document.querySelector(id).style.display = "block";
            setTimeout(function() {
                document.querySelector(id).classList.add("show");
                if(element.hasAttribute("data-product-media")){
                    element.closest(".shopify-section").querySelector('.popup-content').scrollTop = 0;  
                }
            }, 300)

        })
    })

    Array.from(closepopupElement).forEach(function(closeElement) {
        closeElement.addEventListener("click", function(event) {
            event.preventDefault();
            document.querySelector("body").classList.remove("no-scroll");
            document.querySelector("body").classList.remove("sizeChart-popup-open");
           
            setTimeout(function() {
                closeElement.closest("[data-popup-body]").style.display = "none";
                if(closeElement.closest("[data-popup-body]").classList.contains("quick-popup")){
                    closeElement.closest("[data-popup-body]").querySelector('[data-quickview-content]').innerHTML='';
                } 
            }, 200)
            setTimeout(function() {
                closeElement.closest("[data-popup-body]").classList.remove("show");
            }, 300)
           
           
        })
    });

    if(document.querySelectorAll('[data-grid-quick-view-close]')){
        Array.from(document.querySelectorAll('[data-grid-quick-view-close]')).forEach(function(closequickgrid) {
            closequickgrid.addEventListener("click", function(event) {
               setTimeout(function(){
                closequickgrid.closest('[data-grid-quick-view]').classList.remove('quick-view-active')
               },400)
               setTimeout(function(){
                closequickgrid.closest('[data-grid-quick-view]').querySelector('[data-grid-quick-view-content]').innerHTML = '';
               },700)
            })
        })
    }
}

function slideToggleInt(section = document) {
    let slideElements = section.querySelectorAll("[data-slide-toggle]");
    Array.from(slideElements).forEach(function(element) {
        element.addEventListener('click', function(event) {
            event.preventDefault();
            let parent = element.closest('[data-slide-toggle-wrapper]');
            if (parent.classList.contains("active")) {
                parent.classList.remove('active');
            } else {
                parent.classList.add('active');
            }
            DOMAnimations.slideToggle(parent.querySelector("[data-slide-toggle-body]"), 300);
        })
    })
}

function hideBanner() {
    if (document.querySelector(".cookies-popup")) {
        setTimeout(function() {
            document.querySelector(".cookies-popup").classList.remove("show");
        }, 300)
        document.querySelector(".cookies-popup").style.display = "none"
    }
}

function showBanner() {
    if (document.querySelector(".cookies-popup")) {
        document.querySelector(".cookies-popup").style.display = "block"
        setTimeout(function() {
            document.querySelector(".cookies-popup").classList.add("show");
        }, 500)
    }
}

function handleAccept(e) {
    window.Shopify.customerPrivacy.setTrackingConsent(true, hideBanner),
        document.addEventListener("trackingConsentAccepted", function() {});
}

function handleDecline() {
    window.Shopify.customerPrivacy.setTrackingConsent(!1, hideBanner);
}

function initCookieBanner() {
    const userCanBeTracked = window.Shopify.customerPrivacy.userCanBeTracked(),
        userTrackingConsent = window.Shopify.customerPrivacy.getTrackingConsent();
    if (userCanBeTracked && userTrackingConsent === "no_interaction") {
        showBanner();
    }
}

function cookiesBanner() {
    window.Shopify.loadFeatures([{ name: "consent-tracking-api", version: "0.1" }], function(e) {
        if (e) throw e;
        initCookieBanner();
    });

}

function ageVerificationInit() {
    let ageVerificationContainer = document.querySelector('.age-verification-popup');
    if (ageVerificationContainer) {
        let ageVerifyWrapper = ageVerificationContainer.querySelector("[data-age-verification-container]");
        let ageDeclineWrapper = ageVerificationContainer.querySelector("[data-under-age-container]");
        let age_decline = ageVerificationContainer.querySelector("[data-under-age-button]");
        let age_accept = ageVerificationContainer.querySelector("[data-over-age-button]");
        let age_retry = ageVerificationContainer.querySelector("[data-age-decline-button]");
        let ageVerified = getCookie("ageVerified");
        if (ageVerified != 'true' && window.location.pathname.indexOf('/challenge') < 0) {
            ageVerificationContainer.classList.add('show');
            ageVerificationContainer.style.display = "block"
            document.querySelector('body').classList.add('no-scroll')
        }
        if (age_accept) {
            age_accept.addEventListener('click', function(event) {
                event.preventDefault();
                ageVerificationContainer.classList.remove('show');
                ageVerificationContainer.style.display = "none"
                document.querySelector('body').classList.remove('no-scroll');
                setCookie('ageVerified', 'true', 15)
            })
        }
        if (age_decline) {
            age_decline.addEventListener('click', function(event) {
                event.preventDefault();
                if (ageVerifyWrapper && ageDeclineWrapper) {
                    ageVerifyWrapper.classList.add('hidden');
                    ageDeclineWrapper.classList.remove('hidden');
                }
            })
        }
        if (age_retry) {
            age_retry.addEventListener('click', function(event) {
                event.preventDefault();
                if (ageVerifyWrapper && ageDeclineWrapper) {
                    ageDeclineWrapper.classList.add('hidden');
                    ageVerifyWrapper.classList.remove('hidden');
                }
            })
        }
    }
}


function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
function copyCouponcode() {
    let copyText = document.querySelector(".coupon-code-name-text");
    let textArea = document.createElement("textarea");
    textArea.value = copyText.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
    let copyelement = document.querySelector(".coupon-code-message");
    copyelement.textContent='Copied';
    setTimeout(function(){
        copyelement.textContent='';
    },1000)
  }

  /* hamburger nemu for mobile header */
function menuHamburgerEvent(section = document) {
    let hamburgerElements = section.querySelectorAll('[data-mobile-hamburger]');
    let mainheader = document.querySelector('header');
    let bodyElement = document.querySelector('body');
    let dropdownChildrens = document.querySelectorAll('[data-children-menu]');
    let stickyElement = 'false';
    if (mainheader && mainheader.hasAttribute("data-header-sticky")) {
        stickyElement = mainheader.getAttribute("data-header-sticky")
    }
    Array.from(hamburgerElements).forEach(function(hamburgerElement) {
        hamburgerElement.addEventListener("click", function(event) {
            event.preventDefault();           
            let timeout = 10;
            let  menubarElement = document.querySelector('[data-menu-drawer]');
            if (hamburgerElement.classList.contains('mobile-dock-link') && document.querySelector('.header').classList.contains('is-hidden')) {
                timeout = 850
                document.querySelector('.header').classList.remove('is-hidden')
            }
            if (stickyElement == 'false' && hamburgerElement.classList.contains("hamburger-toggler")) {
                if(document.querySelector('.header').classList.contains("is-sticky")){
                    document.querySelector('.header').classList.remove("is-sticky");
                    document.querySelector('.header').classList.remove("sticky-active");
                }
            }
            if (hamburgerElement.classList.contains('mobile-dock-link') && stickyElement == 'false') {
                document.querySelector('.header').classList.add("is-sticky");
                document.querySelector('.header').classList.add("sticky-active");   
            }
            setTimeout(() => {
             if(hamburgerElement.classList.contains("mobile-menu-item-inner")){
               if(hamburgerElement.closest(".mobile-menu-item").classList.contains("has-children")){
                hamburgerElement.closest(".mobile-menu-item").classList.add("show");
                }
             }
             if(hamburgerElement.classList.contains('hamburger-toggler')){                                                                                                                                                                                                      
                if (bodyElement.classList.contains('menu-open')) {
                    bodyElement.classList.remove('no-scroll', 'menu-open');
                    menubarElement.classList.remove('show');
                    Array.from(dropdownChildrens).forEach(function(dropdownChildren){
                        dropdownChildren.classList.remove('show');
                        setTimeout(() => {
                            if(dropdownChildren.querySelector('[data-submenu-items]')){
                                DOMAnimations.slideUp(dropdownChildren.querySelector('[data-submenu-items]'));
                            }
                        }, 300);
                    })
                } else {
                    bodyElement.classList.add('no-scroll', 'menu-open');
                    menubarElement.classList.add('show');
                } 
            
             }
            })
        });

        let closemobilemenu = document.querySelector("[data-mobile-hamburger-close]");
        if(closemobilemenu){
            closemobilemenu.addEventListener("click", function(event){
                let  menubarElement = document.querySelector('[data-menu-drawer]');
                bodyElement.classList.remove('no-scroll', 'menu-open');
                menubarElement.classList.remove('show');
                
                if(document.querySelector('.header').classList.contains("is-sticky")){
                    document.querySelector('.header').classList.remove("is-sticky");
                    document.querySelector('.header').classList.remove("sticky-active");
                  }
                Array.from(dropdownChildrens).forEach(function(dropdownChildren){
                    dropdownChildren.classList.remove('show');
                })
    
            })
        }
     
        
    })
    window.addEventListener("resize", function() {
        let  menubarElement = document.querySelector('[data-menu-drawer]');
        if (window.innerWidth > 991 && bodyElement.classList.contains('menu-open')) {
            bodyElement.classList.remove('menu-open', 'no-scroll');
            Array.from(dropdownChildrens).forEach(function(dropdownChildren){
                dropdownChildren.classList.remove('show');
            })
            menubarElement.classList.remove('show');
        }
    })
}
function mobileMenuitemsEvent() {
    let navBarbackElemets = document.querySelectorAll("[data-menu-navback]");
    let submenuDropdowns= document.querySelectorAll("[data-submenu-dropdown]");
    Array.from(navBarbackElemets).forEach(function(navBarbackElement) {
        navBarbackElement.addEventListener("click", function(event) {
            event.target.closest('.mobile-menu-item.show').classList.remove('show');
            let mobileItems = event.target.closest('.mobile-menu-item').querySelectorAll('.show[data-children-menu]')
            setTimeout(() => {
                Array.from(mobileItems).forEach(function(subMenu){
                    subMenu.classList.remove('show');
                    if(subMenu.querySelector('[data-submenu-items]')){
                        DOMAnimations.slideUp(subMenu.querySelector('[data-submenu-items]'));
                    }
                })
            }, 500);
        })
    })
    Array.from(submenuDropdowns).forEach(function(submenuDropdown){
        submenuDropdown.addEventListener("click", function(event) {
            let menuParent = event.target.closest('.mobile-submenu-item');
            let menuList = menuParent.querySelector(".mobile-grand-submenu");
            if (!menuParent.classList.contains('show')) {
              
                DOMAnimations.classToggle(menuParent, 'show');
                DOMAnimations.slideToggle(menuList);
            }else{
         
                DOMAnimations.slideToggle(menuList);
                setTimeout(function(){
                    DOMAnimations.classToggle(menuParent, 'show'); 
                },500)
            
            }
        })
    })
    /* ---dropDown menu mobile---*/
}
function headerNavigationPosition(section = document) {
    if (window.innerWidth < 992) return false;
    let allNavigations = section.querySelectorAll("[data-navigation-item]");
    Array.from(allNavigations).forEach(function(navItem) {
        navItem.classList.remove("left-menu");
        let windowSize = window.innerWidth - 200;
        let currentPosition = navItem.offsetLeft + navItem.clientWidth;
        if (navItem.querySelector(".nav-submenu.inner")) {
            currentPosition =currentPosition + navItem.querySelector(".nav-submenu.inner").clientWidth;
        }
        if (currentPosition >= windowSize) {
            navItem.classList.add("left-menu");
        }
    });
}

function productGiftOptions(section = document) {
    let giftCardWrappers = section.querySelectorAll('[data-gift-card-box]');
    Array.from(giftCardWrappers).forEach(function(giftCard) {
        let jsCheck = giftCard.querySelector('[data-js-gift-card-selector]')
        if (jsCheck) {
            jsCheck.disabled = false;
            Array.from(giftCard.querySelectorAll('[data-gift-input]')).forEach(function(input) {
              input.disabled = true;
            });
            jsCheck.addEventListener('click', function() {
                let giftCardContent = giftCard.querySelector('[data-gift-card-content]');
                if (jsCheck.checked) {
                    DOMAnimations.slideDown(giftCardContent, 500);
                    Array.from(giftCard.querySelectorAll('[data-gift-input]')).forEach(function(input) {
                      input.disabled = false;
                    });
                } else {
                    DOMAnimations.slideUp(giftCardContent, 500);
                    Array.from(giftCard.querySelectorAll('[data-gift-input]')).forEach(function(input) {
                      input.disabled = true;
                    });
                    let formErrorWrapper = giftCard.querySelector('.form-message__wrapper');
                    if (formErrorWrapper) {
                        formErrorWrapper.classList.add('hidden')
                        let formErrorMessage = formErrorWrapper.querySelector('.error-message');
                        if (formErrorMessage) {
                            formErrorMessage.innerHTML = '';
                        }
                    }
                }
            })
        }
        let noJsCheck = giftCard.querySelector('[data-no-js-gift-card-selector]')
        if (noJsCheck) {
            noJsCheck.disabled = true;
        }
    })
}
window.addEventListener("resize", (event) => {
    var sliders = jQuery('body').find('[data-slick]');
    if (sliders.length > 0 &&jQuery('body').find('[data-slick]').hasClass("slick-initialized")) {
        sliders.each(function(index) {
                jQuery(this).slick('resize');     
        });
    }
    fullHeightCalculate();   
});

function mobileCategoriesInit(section = document){
    if(document.querySelector("[data-mobile-categories-head]")){
        let mobileEement = document.querySelector("[data-mobile-categories-head]");
        let crossElements = document.querySelectorAll("[data-mobile-categories-close]");
        let closeElement =document.querySelector(".close-categories"); 
        
        let mobileMainContnet = document.querySelector("[data-mobile-categories-content]");
        mobileEement.addEventListener('click', function() {
            mobileEement.classList.add("hidden");
            mobileEement.closest(".mobile-categories-wrapper").classList.add("categories-active")
            document.querySelector("body").classList.add("no-scroll"); 
            closeElement.style.display="flex";
            mobileMainContnet.style.display = `block`;
            mobileMainContnet.classList.add("active")
        })
        Array.from(crossElements).forEach(function(element){
            element.addEventListener('click', function() {
                mobileEement.classList.remove("hidden");
                mobileEement.closest(".mobile-categories-wrapper").classList.remove("categories-active")
                document.querySelector("body").classList.remove("no-scroll"); 
                closeElement.style.display="none";
                mobileMainContnet.style.display = "none";
                mobileMainContnet.classList.remove("active")
            })
        })    
    }
}
function contentTabs(section = document){
    let tabHeads= document.querySelectorAll("[data-tabs-main-head]");
    Array.from(tabHeads).forEach(function(tabhead){
        tabhead.addEventListener('click',function(event){
            event.preventDefault();
            let tabId = tabhead.getAttribute("href");
            let parent =tabhead.closest(".tabbed-content");
            parent.querySelector(".tabbed-content-link.active").classList.remove("active")
            tabhead.classList.add("active");
            parent.querySelector(".tabbed-content-body-item.active").classList.remove("active")
            parent.querySelector(tabId).classList.add("active");
        })
    })
    
}
function spotLight(section = document){
    let spotlightitems =section.querySelectorAll("[data-spotlight-item]");
    Array.from(spotlightitems).forEach(function(spotlightitem){
        let parent =spotlightitem.closest(".spotlight-item");
        spotlightitem.addEventListener("click",function(){
            if(parent.querySelector("[data-spotlight-details].active")){
                parent.querySelector("[data-spotlight-details].active").classList.remove("active");   
            } 
            if(spotlightitem.closest(".spotlight-product-inner-item").classList.contains("active")){
                spotlightitem.closest(".spotlight-product-inner-item").classList.remove("active");
                if(spotlightitem.closest(".spotlight-product-item").querySelector("[data-spotlight-details].active")){
                    spotlightitem.closest(".spotlight-product-item").querySelector("[data-spotlight-details].active").classList.remove("active");
                }
                  
            }else{
                if(parent.querySelector(".spotlight-product-inner-item.active")){
                    parent.querySelector(".spotlight-product-inner-item.active").classList.remove("active");
                }
                spotlightitem.closest(".spotlight-product-inner-item").classList.add("active");
                spotlightitem.closest(".spotlight-product-item").querySelector("[data-spotlight-details]").classList.add("active")
            }
        })
        let closeSpotLight = spotlightitem.closest(".spotlight-product-item").querySelector("[data-spotlight-close]");
        if(closeSpotLight){
            closeSpotLight.addEventListener("click",function(){
                if(parent.querySelector("[data-spotlight-details].active")){
                    parent.querySelector("[data-spotlight-details].active").classList.remove("active"); 
                      
                } 
                if(parent.querySelector(".spotlight-product-inner-item.active")){
                    parent.querySelector(".spotlight-product-inner-item.active").classList.remove("active");
                }  
                
            })
        }  
    });

    let spotlightHoverItems = section.querySelectorAll("[data-single-spot-item]");
    Array.from(spotlightHoverItems).forEach(function(spotlightHoverItem){
        spotlightHoverItem.addEventListener("mouseover", function(event){
            if(spotlightHoverItem.querySelector("[data-spotlight-details]")){
                if(spotlightHoverItem.querySelector("[data-spotlight-details].active")){
                    return false;
                }
                spotlightHoverItem.querySelector("[data-spotlight-details]").classList.add("active") 
            }

        })

        spotlightHoverItem.addEventListener("mouseout", function(event){
            if(spotlightHoverItem.querySelector("[data-spotlight-details]")){
                if(spotlightHoverItem.querySelector("[data-spotlight-details].active")){
                    spotlightHoverItem.querySelector("[data-spotlight-details]").classList.remove("active")   
                }
               
            }

        })
    })

}

function mediaListItem(section = document){
    let mediaItems = section.querySelectorAll("[data-media-item]");
    Array.from(mediaItems).forEach(function(mediaItem){
        mediaItem.addEventListener("mouseover", function(){
            if(window.innerWidth < 1025) return false;
            if(mediaItem.classList.contains('active')) return false;
            let midHeight = window.pageYOffset + (window.innerHeight/2);
            const screenPartition = window.innerHeight/3;
            const screenPartitionOneStart = window.pageYOffset;
            const screenPartitionOneend = screenPartitionOneStart + screenPartition;
            const screenPartitionTwoStart = screenPartitionOneend + 1;
            const screenPartitionTwoend = screenPartitionOneend + screenPartition;
            const screenPartitionThreeStart = screenPartitionTwoend + 1;
            const screenPartitionThreeend = screenPartitionTwoend + screenPartition;
            const offsetTop = mediaItem.offsetTop + (mediaItem.clientHeight / 2); 


            mediaItem.classList.remove('position-bottom','position-top','position-center');
            mediaItem.classList.add('active');

            if (offsetTop <= screenPartitionOneend) {
                mediaItem.classList.add('position-top');
            } else if (offsetTop >= screenPartitionTwoStart && offsetTop <= screenPartitionTwoend){
                mediaItem.classList.add('position-center');
            } else if (offsetTop >= screenPartitionThreeStart){
                mediaItem.classList.add('position-bottom');
            }
        });
        mediaItem.addEventListener("mouseleave", function(){
            if(window.innerWidth < 1025) return false;
            mediaItem.classList.remove('active')
        });
    });
}
function productCardHoverInit(section = document) {
    let hoverelements = section.querySelectorAll(".product-card[data-options-hover]");
    Array.from(hoverelements).forEach(function (hoverelement) {
      if (hoverelement) {
            hoverelement.addEventListener("mouseover", function (element) {
                if (window.innerWidth > 1024) {
                const imageHeight = hoverelement.querySelector(".product-card-img").offsetHeight,
                    infoHeight = hoverelement.querySelector(".product-card-detail-info").offsetHeight,
                    hoverContent=hoverelement.querySelector(".product-options").offsetHeight;
                    if(hoverContent > infoHeight){
                        const difference = hoverContent-infoHeight;
                        heightExpanded = imageHeight + hoverContent+ difference;
                        const mainCardheight = hoverelement.offsetHeight;
                        if(mainCardheight<heightExpanded){
                            hoverelement.style.height = heightExpanded + "px"; 
                        }  
                    }  
                }
            });
            hoverelement.addEventListener("mouseleave", function (element) {
                if (window.innerWidth > 1024) {
                    hoverelement.style.height = null;
                }
            });
      }
    });
  }
class CollectionBanner extends HTMLElement{
    constructor(){
        super(); 
        Array.from(this.querySelectorAll('[data-coll-banner]')).map((collBanner) => {
            collBanner.addEventListener('mouseover', this.onMouseOverHandler.bind(this, collBanner));
        });

        this._initialRun();
        const resizeObserver = new ResizeObserver(() => this._initialRun());
        resizeObserver.observe(this);
    }
    _initialRun(){
        if(this.querySelectorAll('[data-coll-desc]')){
            Array.from(this.querySelectorAll('[data-coll-desc]')).map((item) => {
                item.closest('[data-coll-banner]').style.setProperty("--desc-height", `${item.getBoundingClientRect().height}px`);
            });
        }
        // this.buttonHeight = this.querySelector('[data-coll-button] a').getBoundingClientRect().height;
        // this.style.setProperty("--button-height", `${this.buttonHeight}px`);
    }
    onMouseOverHandler(collBanner) {
        if (collBanner.classList.contains('active')) return;
        console.log(this)
        Array.from(this.closest('section').querySelectorAll('[data-coll-banner]')).map((item) => {
            item.classList.remove('active');
        });
        collBanner.classList.add('active');
        if(this.closest('section').querySelector(`[data-bg-id="${collBanner.id}"]`).classList.contains('active')) return;
        Array.from(this.closest('section').querySelectorAll('[data-bg-id]')).map((bgitem) => {
            bgitem.classList.remove('active');
        });
        this.closest('section').querySelector(`[data-bg-id="${collBanner.id}"]`).classList.add('active')
    }
}
customElements.define('collection-banner', CollectionBanner);

class DeferredMedia extends HTMLElement {
    constructor() {
        super();
        if (this.classList.contains("autoplay-status-false")) {
            let loadBtn ='';
            if(this.closest(".product-media-item")){
                 loadBtn = this.closest(".product-media-item").querySelector('.js-load-media');
            }else{
                 loadBtn = this.closest(".shopify-section").querySelector('.js-load-media');
            }
        
            loadBtn.addEventListener('click', this.loadContent.bind(this));
        } else {
        this.addObserver();
        }
    }
    addObserver() {
        if ('IntersectionObserver' in window === false) return;
        const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
            // this.loadContent(false, false, 'observer');
            this.loadContent();
            observer.unobserve(this);
            }
        });
        }, { rootMargin: '0px 0px 1000px 0px' });
        observer.observe(this);
    }
    loadContent() {
        if(this.parentElement.classList.contains('media-banner-parallax')){
            this.style.position = 'absolute';
            this.parentElement.style.position = 'fixed';
          }
        
        const content = this.querySelector('template').content.firstElementChild.cloneNode(true);
        this.appendChild(content);
        if(this.querySelector('video') && this.querySelector('video').hasAttribute("data-autoplay") || this.querySelector('video') && this.querySelector('video').hasAttribute("autoplay")){
            this.querySelector('video').play();
            productCardHoverInit();
            if(this.closest(".product-media-item")){
                this.closest(".product-media-item").querySelector('.js-load-media').style.display='none'; 
            }
        }
        
    }
}
customElements.define('deferred-media', DeferredMedia);

function testimonialLoadMore(){
        let testimonialItems =document.querySelectorAll("[data-testimonial-load-more]");
        Array.from(testimonialItems).forEach(function(testimonialItem){
            if(testimonialItem){
                testimonialItem.addEventListener("click",function(){
                    let parentSection = testimonialItem.closest(".shopify-section");
                    let items = parentSection.querySelectorAll(".testimonials-slider-item.hidden-items");
                    Array.from(items).forEach(function(item,index){
                        if(item){
                            setTimeout(function(){
                                item.style.opacity="1";
                                item.style.transform="none";
                            },index+1*200)
                            item.style.display="block"
                        }  
                    })
                    setTimeout(function(){
                        testimonialItem.closest(".testimonials-load-more").style.setProperty('display', 'none', 'important')
                    },300)
                   
                })
            }

        })
}

    /*-------------tabbed-collections------------------ */
function tabbedCollection(section = document) {
    var bindAll = function() {
        var menuElements = document.querySelectorAll('[data-tab-filters]');

        Array.from(menuElements).forEach(function(menuElement){
            menuElement.addEventListener('click', change, false);
        })
 
    }
    var clear = function(section) {
        var menuElements = section.querySelectorAll('[data-tab-filters]');
        for (var i = 0; i < menuElements.length; i++) {
            menuElements[i].querySelector(".collection-tabs-header-link").classList.remove('active');
            var id = menuElements[i].getAttribute('data-tab-filters');
            document.getElementById(id).classList.remove('active');
            // let allElement = document.getElementById(id).querySelectorAll("[data-product-card]")

            if (section.querySelector('[data-id="' + id + '"]')) {
                section.querySelector('[data-id="' + id + '"]').classList.remove('active');
                let allElement = section.querySelector('[data-id="' + id + '"]').querySelectorAll(".product-card")
                    Array.from(allElement).forEach(function(item) {
                        item.classList.remove('aos-animate');
                    })
            }
            if(section.querySelector('[data-id-link="' + id + '"]')){
                section.querySelector('[data-id-link="' + id + '"]').classList.remove('active');
            }
            
        }
    }
    var change = function(e) {
        e.preventDefault();
        let section = e.currentTarget.closest(".collection-tabs");
        clear(section);
        e.currentTarget.querySelector(".collection-tabs-header-link").classList.add('active');
        var id = e.currentTarget.getAttribute('data-tab-filters');
        document.getElementById(id).classList.add('active');
        if (section.querySelector('[data-id="' + id + '"]')) {
            section.querySelector('[data-id="' + id + '"]').classList.add('active');
            let allElement =  section.querySelector('[data-id="' + id + '"]').querySelectorAll(".product-card")
            setTimeout(() => {
                Array.from(allElement).forEach(function(item) {
                    item.classList.add('aos-animate');
                })
            }, 300);
        }
        if(section.querySelector('[data-id-link="' + id + '"]')){
            section.querySelector('[data-id-link="' + id + '"]').classList.add('active');
        }
        $('.collection-tabs-products-content[id="' + id + '"]').slick('setPosition');
        if(animationStatus){
            if (AOS) { 
                AOS.refreshHard() 
            }
            }

    }
    bindAll();
}
function productImagehoverZoom(section = document){

    let clickElements = document.querySelectorAll("[data-zoom-hover]");
    Array.from(clickElements).forEach(function(element){
        element.addEventListener("click",function(){
            if(window.innerWidth>768){
                let image = element.querySelector('img');
                zoomOverlayCreate(image,element);
            }

        }) 
    })
    var zoomOverlayCreate = function(image,element) {
        let imageSrc='';
        if(image.closest("[data-media-inner]").classList.contains("main-image-first")){
            imageSrc=image.src;
          
        }else{
            imageSrc=image.getAttribute("data-original");
        }
        const OverlayElement = document.createElement("div");
        const overlayImage = document.createElement("img");
        overlayImage.setAttribute("src", `${imageSrc}`);
        if(image.closest("[data-zoom-hover]").classList.contains('image-zoom-overlay')){
            image.closest("[data-zoom-hover]").classList.remove("image-zoom-overlay");
            resetElement(image.closest("[data-zoom-hover]").querySelector('.zoom-image-hover')); 
        }else{
            let zoomRatio = 2;
           
            overlayImage.onload = () => {
                OverlayElement.setAttribute("class", "zoom-image-hover cursor-pointer zoom"),OverlayElement.style.backgroundImage = `url('${overlayImage.src}')`,OverlayElement.style.backgroundSize=`${overlayImage.width*zoomRatio}px`, OverlayElement.style.cursor = "zoom-out"
                image.closest("[data-media-inner]").insertBefore(OverlayElement,image.closest(".media-box"));
                image.closest("[data-zoom-hover]").classList.add("image-zoom-overlay");
                mouseEvent(image);
            }
        }
       
    }
    var mouseEvent=function(image){
    if(image.closest("[data-product-media]").querySelector('.zoom-image-hover')){
        let zoomElement= image.closest("[data-product-media]").querySelector('.zoom-image-hover');
        zoomElement.addEventListener("mousemove" ,function(event){
            zoomWithMedia(image,zoomElement,event);
        })

        zoomElement.addEventListener("mouseleave" ,function(event){
            resetElement(zoomElement);
        })
    }
       
    }
    var zoomWithMedia = function(image,overlayElement, event){
        let zoomer = event.currentTarget;

        event.offsetX ? offsetX = event.offsetX : offsetX = event.touches[0].pageX
        event.offsetY ? offsetY = event.offsetY : offsetX = event.touches[0].pageX
        x = offsetX/zoomer.offsetWidth*100
        y = offsetY/zoomer.offsetHeight*100
        overlayElement.style.backgroundPosition = x + '% ' + y + '%'
      

    }
    var resetElement =function(overlayElement){
        if(overlayElement){
            overlayElement.closest("[data-product-media]").classList.remove("image-zoom-overlay")
            overlayElement.remove()
        }
       
    }

}
function footerDropdownCheck() {
    let windowCenter = window.innerHeight / 2;
    if (document.querySelector('.footer-bottom-content')) {

        let elementScrollTop = document.querySelector('.footer-bottom-content').getBoundingClientRect().top;
        let customContents = document.querySelector('.footer-bottom-content').querySelectorAll(".custom-select-content")
        if (isOnScreen(document.querySelector('.footer-bottom-content'))) {
            Array.from(customContents).forEach(function(element){
                if (elementScrollTop < windowCenter) {
                    element.classList.add('bottom-position');
                    element.classList.remove('top-position');
                } else {
                    element.classList.add('top-position');
                    element.classList.remove('bottom-position')
                }
            })
            
        }
    }
}


function videoTextOverlay(){
    let windowCenter = window.innerHeight / 2;
    let textElements = document.querySelectorAll("[data-text-overlay-content]");
    Array.from(textElements).forEach(function(element){
        let elemetheight =element.closest(".video-text-overlay").querySelector(".video-text-overlay-media").getBoundingClientRect().height;
     let innerElements =element.querySelectorAll("[data-text-overlay-inner]");
        Array.from(innerElements).forEach(function(innerElement){
            let topSection = innerElement.closest('[data-text-overlay-content]')
            let elementScrollTop = innerElement.getBoundingClientRect().top;
            if (elementScrollTop < windowCenter) {
                if(innerElement.classList.contains('scrolled')) return;
                // if(topSection.querySelector(".scrolled")){
                //     topSection.querySelector(".scrolled").classList.remove('scrolled')
                // }
                
                innerElement.classList.add('scrolled');
            } else {
                innerElement.classList.remove('scrolled');
            }
    
        })
    })
}


document.addEventListener("DOMContentLoaded", function(section = document ){
    if(document.querySelector('header')){
        stickyHeaderInit(); 
    }
    videoTextOverlay();
    productImagehoverZoom();
    productCardHoverInit();
    menuHamburgerEvent();
    sliders();
    mobileCategoriesInit();
    customDropdownElements();
    customDropdownElementsLocalization();
    countdownClock();
    videoPlayInit();
    detailDisclouserInit();
    quickViewElements();
    quantitySelectors();
    updateCartNote();
    cartItemRemoveElements();
    stickyProductOptions();
    productVariantOption();
    getAddToCartElements();
    marqueeTextScroll();
    marqueeTextAutoplay();
    collapsiblecontentClose();
    imageCarousel();
    checkMapApi();
    mapSidebarElementsInt();
    initBeforeAfter();
    popupContentElements();
    colorSwatchesMediaChanged();
    productRecommendations();
    sideDrawerInt();
    cartDrawerNoteInit();
    fullHeightCalculate();
    slideToggleInt();
    cookiesBanner();
    ageVerificationInit();
    recentlyViewedProducts();
    shippingEstimates();
    mobileMenuitemsEvent();
    headerNavigationPosition();
    productGiftOptions();
    contentTabs();
    spotLight();
    testimonialLoadMore();
    mediaListItem();
    tabbedCollection();
    initStickyAddToCart();
    
    if(animationStatus){
        if (AOS) { 
          AOS.refreshHard() 
        }
      }

    if (document.querySelector('[data-parallax-banner]')) {
        new universalParallax().init({
            speed:10
        });
    }
}, false);

document.addEventListener("shopify:section:unload", function(section) {
    let target = section.target;
    if(target.querySelector('header')){
      setTimeout(function(){
        stickyHeaderInit(); 
        },600)
    }
});

document.addEventListener("shopify:section:load", function(section) {
    let target = section.target;
    let bodyElement = document.querySelector('body');
    let sliders = target.querySelectorAll('[data-slick]')
    Array.from(sliders).forEach(function(slider) {
        if (!slider.classList.contains('slick-initialized')) {
            slickSlider($(slider));
        }
    })
    
    if(document.querySelector("[data-dropdown-close]")){
        document.querySelector("[data-dropdown-close]").addEventListener("click", function(event){
            event.preventDefault();
            document.querySelector('[data-dropdown-body]').classList.remove("is-open")
        })
    }
    if(target.classList.contains('header')){
        if (bodyElement.classList.contains('menu-open')) {
            bodyElement.classList.remove('no-scroll', 'menu-open'); 
        } 
        if(target.querySelector('.menu-container')){
            menuDropdownInit(); 
            Array.from(document.querySelectorAll('.nav-menu')).forEach(function(menuitem,index){
                setTimeout(() => {
                    menuitem.classList.add("animation")
                }, (200 * (index + 1)));
            })
        }
    }
    if(target.querySelector('header') || target.classList.contains('mobile-dock')){
    }
    menuHamburgerEvent(target);
    if(target.querySelector('header')){
        mobileMenuitemsEvent();
        setTimeout(function(){
          stickyHeaderInit(); 
        },600)
        fullHeightCalculate();   
    }
    if(target.querySelector('announcement-bar')){
        fullHeightCalculate();   
    }
    if (target.querySelector('[data-parallax-banner]')) {
        new universalParallax().init({
            speed:10
        });
    }
    initMaps(target);
    videoPlayInit(target);
    countdownClock(target);
    videoTextOverlay(target);
    detailDisclouserInit(target);
    marqueeTextScroll(target);
    marqueeTextAutoplay(target);
    checkMapApi(target);
    mapSidebarElementsInt(target);
    initBeforeAfter(target);
    popupContentElements(target);
    colorSwatchesMediaChanged(target);
    productRecommendations(target);
    slideToggleInt(target);
    cookiesBanner(target);
    ageVerificationInit(target);
    recentlyViewedProducts(target);
    sideDrawerInt(target );
    customDropdownElements(target);
    customDropdownElementsLocalization(target);
    headerNavigationPosition(target);
    imageCarousel(target);
    shippingEstimates(target);
    mobileCategoriesInit(target);
    contentTabs(target);
    spotLight(target);
    testimonialLoadMore(target);
    mediaListItem(target);
    productCardHoverInit(target);
    videoPauseOnScroll();
    tabbedCollection(target);
    productImagehoverZoom(target);
    initStickyAddToCart(target)
    if(animationStatus){
        if (AOS) { 
          AOS.refreshHard() 
        }
      }
});

document.addEventListener("shopify:section:select", function (event) {
    let target = event.target;
    let bodyElement = document.querySelector('body');
    let sliders = target.querySelectorAll('[data-slick]')
    Array.from(sliders).forEach(function(slider) {
        if (!slider.classList.contains('slick-initialized')) {
            slickSlider($(slider));
        }
    })
    
    if(target.classList.contains('mobile-dock')){
        if(target.querySelector('.mobile-dock-bar')){
            target.querySelector('.mobile-dock-bar').classList.add('dock-active')
        }
    }
    if(document.querySelector("[data-dropdown-close]")){
        document.querySelector("[data-dropdown-close]").addEventListener("click", function(event){
            event.preventDefault();
            document.querySelector('[data-dropdown-body]').classList.remove("is-open")
        })
    }
    if(target.classList.contains('header')){
        if (bodyElement.classList.contains('menu-open')) {
            bodyElement.classList.remove('no-scroll', 'menu-open'); 
        } 
    }
    
    if(target.querySelector('header')){
        stickyHeaderInit();
        // menuHamburgerEvent();
    }
    // menuHamburgerEvent();
  
    
})

document.addEventListener("shopify:section:deselect", function (event) {
    let target = event.target;
    if(target.classList.contains('mobile-dock')){
        if(target.querySelector('.mobile-dock-bar')){
            target.querySelector('.mobile-dock-bar').classList.remove('dock-active')
        }
    }

});
window.addEventListener('scroll', function() {
    footerDropdownCheck();
    document.querySelectorAll(".youtube_video,.youtube-video,iframe[src*='www.youtube.com']").forEach((video) => {
        if (!isOnScreen(video) && video.getAttribute('data-autoplay') == 'false') {
            video.contentWindow.postMessage('{"event":"command","func":"' + "pauseVideo" + '","args":""}',"*");
        }
    });
   
    document.querySelectorAll(".vimeo_video,.vimeo-video, iframe[src*='player.vimeo.com']").forEach((video) => {
        if (!isOnScreen(video) && video.getAttribute('data-autoplay') == 'false') {
            video.contentWindow.postMessage('{"method":"pause"}', "*");
        }
    });
    document.querySelectorAll("video").forEach((video) => {
        if (!isOnScreen(video) && video.getAttribute('data-autoplay') == 'false') {
            video.pause();
        }
    });
    document.querySelectorAll("section").forEach((section) => {
        if (isOnScreen(section)) {
          
            if(section.classList.contains("before-after")){
                setTimeout(function(){
                    section.classList.add("section-in-view");
                    if(section.querySelector(".image-comparison-wrapper")){
                        section.querySelector(".image-comparison-wrapper").classList.add("animating")
                        setTimeout(function(){
                            section.querySelector(".image-comparison-wrapper").classList.remove("animating")
                        },1000)
                    }
                  
                },1000)
            }else{
                setTimeout(function(){
                section.classList.add("section-in-view");
                },500)
            } 
        }
        if (isOnScreen(section)) {
            videoTextOverlay()  
        } 
        
    });

    if(document.querySelector(".image-true") && document.querySelector(".mobile-categories-title")){
        document.querySelector(".mobile-categories-title").classList.add("hidden") 
    }
    
  
});



function videoPauseOnScroll(){
    let containerElements = document.querySelectorAll("[data-quickview-content]");
   
    Array.from(containerElements).forEach(function(containerElement){
        containerElement.addEventListener("scroll", function(element){
            document.querySelectorAll(".youtube_video,.youtube-video,iframe[src*='www.youtube.com']").forEach((video) => {
                if (!isOnScreen(video) && video.getAttribute('data-autoplay') == 'false') {
                    video.contentWindow.postMessage('{"event":"command","func":"' + "pauseVideo" + '","args":""}',"*");
                }
            });
           
            document.querySelectorAll(".vimeo_video,.vimeo-video, iframe[src*='player.vimeo.com']").forEach((video) => {
                if (!isOnScreen(video) && video.getAttribute('data-autoplay') == 'false') {
                    video.contentWindow.postMessage('{"method":"pause"}', "*");
                }
            });
            document.querySelectorAll("video").forEach((video) => {
                if (!isOnScreen(video) && video.getAttribute('data-autoplay') == 'false') {
                    video.pause();
                }
            });

        })
    })
}




window.addEventListener('scroll', debounce(function() {
    if(document.querySelector(".mobile-categories-title")){
        document.querySelector(".mobile-categories-title").classList.remove("hidden");
    } 
    
}))

document.addEventListener("shopify:block:select", function(block) {
    let target = block.target;
    let slider = target.closest('.slick-initialized');
    if (slider) {
        let slidesLength = parseInt(slider.dataset.slidesLength);
        let slidesToShow = $(slider).slick("slickGetOption","slidesToShow");
        let leastValue =  slidesLength - slidesToShow;
        let indexValue = parseInt(target.getAttribute("data-slide"));
        if(slidesToShow > 1 & indexValue > leastValue & window.innerWidth > 767){
            indexValue = Math.ceil(leastValue) 
        }
        $(slider).slick('slickGoTo', indexValue);
    }
   
  
    if (target.closest(".tabbed-content-wrapper")) {
        let dataId=target.getAttribute("href");
        let parent =target.closest(".tabbed-content-wrapper");
        parent.querySelector(".tabbed-content-link.active").classList.remove("active")
        target.classList.add("active");
        parent.querySelector(".tabbed-content-body-item.active").classList.remove("active")
        parent.querySelector(dataId).classList.add("active");
    
    }
    if(target.closest(".images-carousel")){
        let dataindex=target.getAttribute("data-id");
        Array.from(target.closest(".images-carousel").querySelectorAll(".images-carousel-content-item")).forEach(function(element){
            element.classList.remove("active");
            if(element.classList.contains("images-carousel-content-description")){
                element.fadeOut(100);
            }
          
        })
        document.querySelector("#"+dataindex).classList.add("active");
        document.querySelector(".images-carousel-content-item[data-id='"+dataindex+"']").classList.add("active");
        setTimeout(function() {
            document.querySelector(".images-carousel-content-item[data-id='"+dataindex+"']").fadeIn(300)
        }, 200)
       
    }
    if(target.classList.contains('hamburger-promotion')){
        if(document.querySelector('[data-hamburger-menu]')){        
            document.querySelector('[data-hamburger-menu]').dispatchEvent(new Event('click', { bubbles: true }));
        }
    }
    if(target.classList.contains('menu-item')){
        target.classList.add('hover')
    }
    if(animationStatus){
        if (AOS) { 
          AOS.refreshHard() 
        }
      }
})

document.addEventListener("shopify:block:deselect", function(block) {
    let target = block.target;
    if(target.classList.contains('hamburger-promotion')){
        if(document.querySelector('hamburger-menu.close-toggle')){        
            document.querySelector('hamburger-menu.close-toggle').dispatchEvent(new Event('click', { bubbles: true }));
        }
    }
    if(target.classList.contains('menu-item')){
        target.classList.remove('hover')
    }
    
})
class hamburgerMenu extends HTMLElement {
    constructor() {
        super();
        if(this.classList.contains('close-toggle')){
            this.addEventListener("click", this.hideMenu.bind(this));
            this.addEventListener("keydown", function(event) {
                if (event.key === "Enter") {
                  this.hideMenu();
                  stopFocusRotation();
                  if(previousFocusElement){
                      previousFocusElement.focus();
                      previousFocusElement = "";
                  }
                }
              }.bind(this));
        }else{
            this.addEventListener("click", this.showMenu.bind(this));
            this.addEventListener("keydown", function(event) {
                if (event.key === "Enter") {
                  this.showMenu();
                }
              }.bind(this));
            menuDropdownInit();
            
        }
    }
    hideMenu() {
        document.body.classList.remove('hamburger-open','no-scroll');
        Array.from(document.querySelectorAll('.nav-menu')).forEach(function(menuitem){
            menuitem.classList.remove("animation")
        })
        setTimeout(() => {  
            let activeMenus = document.querySelectorAll('.dropdown-detail.open');
            Array.from(activeMenus).forEach((el)=>{
                el.classList.remove('open')
            })
        }, 300);
    }
    showMenu() {
        document.body.classList.add('hamburger-open','no-scroll');
        setTimeout(() => {
            Array.from(document.querySelectorAll('.nav-menu')).forEach(function(menuitem,index){
                setTimeout(() => {
                    menuitem.classList.add("animation")
                }, (200 * (index + 1)));
            })
            if(previousFocusElement == ''){
                previousFocusElement = this;
            }
            if(document.querySelector('.menu-container')){
              focusElementsRotation(document.querySelector('.menu-container'));
            }
          }, 200);
    }
  }
  customElements.define("hamburger-menu", hamburgerMenu);

  function menuDropdownInit(){
    let menuElements = document.querySelectorAll('[data-menu-dropdown-item]');
    Array.from(menuElements).forEach((el)=>{
        el.addEventListener('click', function(e){
            e.preventDefault();
            if(el.closest('.dropdown-detail')){
                el.closest('.dropdown-detail').classList.add('open');
            }
        });
    });
    let menuHoverElements = document.querySelectorAll('[data-menu-hover]');
    Array.from(menuHoverElements).forEach((el)=>{
        el.addEventListener('mouseover', function(e){
            if(el.classList.contains('animated')) return false;
            if(el.querySelector('.nav-menu-link-deco') && document.querySelector(el.dataset.filter)){
                el.classList.add('animated');
                el.querySelector('.nav-menu-link-deco').style.filter = 'url('+el.dataset.filter+')';
                let svgFilter = document.querySelector(el.dataset.filter)
                if(svgFilter.querySelector('feTurbulence')){
                    let interval = setInterval(() => {
                        let randomValue = Math.random() * (0.9999 - 0.0001 + 1) + 0.0001;
                        svgFilter.querySelector('feTurbulence').setAttribute('baseFrequency',randomValue.toFixed(4));
                    }, 100);
                    
                    setTimeout(() => {
                        clearInterval(interval);
                        el.querySelector('.nav-menu-link-deco').style.filter = 'none';
                        svgFilter.querySelector('feTurbulence').setAttribute('baseFrequency',0)
                    }, 500);
                }
            }
        });
        el.addEventListener('mouseout', function(e){
            el.classList.remove('animated')
        });
    });
    let backElements = document.querySelectorAll('[data-menu-dropdown-back');
    Array.from(backElements).forEach((el)=>{
        el.addEventListener('click', function(e){
            e.preventDefault();
            if(el.closest('.dropdown-detail')){
                el.closest('.dropdown-detail').classList.remove('open');
            }
        });
    });
}

function fullHeightCalculate(){
    let fullHeight = 0;
    let announcementBar = document.querySelector('.announcement-bar');
    let header = document.querySelector('header');
    if(announcementBar){
        fullHeight += announcementBar.offsetHeight;
    }
    if(header && !header.classList.contains('transparent-true')){
        if(announcementBar){
            fullHeight += announcementBar.offsetHeight;
        }
      
    }
    document.querySelector('body').style.setProperty('--fullHeight', `${window.innerHeight - fullHeight}px`);
}

document.addEventListener('keydown', function(event) {
    if (event.keyCode == 27) {

        let activeDrawers = document.querySelectorAll('[side-drawer-body].show,.side-drawer.show,[data-search-wrapper].show,[data-popup-body].show,[data-dropdown-body].is-open');
        Array.from(activeDrawers).forEach(function(activeDrawer){
                setTimeout(() => {
                    document.querySelector("body").classList.remove("no-scroll");
                    document.querySelector("body").classList.remove("pickup-side-drawer-open");
                    document.querySelector("body").classList.remove("sizeChart-popup-open");
                    activeDrawer.classList.remove('show');
                    activeDrawer.classList.remove('is-open');
                }, 300);
                if(!activeDrawer.classList.contains('drawer-main')){
                    setTimeout(() => {
                        activeDrawer.style.display = "none";
                    }, 500)
                }
                stopFocusRotation();
                if(previousFocusElement){
                    previousFocusElement.focus();
                    previousFocusElement = "";
                }
        });

        let dropdowns = document.querySelectorAll('.custom-select-localization.animation');
        Array.from(dropdowns).forEach(function(dropdown){
            setTimeout(function(){
                dropdown.querySelector("[data-details-select-summary]").style.display="none"
            },100)
            dropdown.querySelector("[data-details-select-summary]").style.opacity="0";
            dropdown.querySelector("[data-details-select-summary]").style.transform="translate3d(0, 10%, 0)";
            dropdown.classList.remove("animation");
            stopFocusRotation();
            if(previousFocusElement){
                previousFocusElement.focus();
                previousFocusElement = "";
            }
        });

        let sorting = document.querySelector('[data-collection-sort]');
        if(sorting){
            DOMAnimations.slideUp(sorting.querySelector('[data-custom-select-summary]'), 300);
            
        }

    }
    if (event.keyCode == 13 || event.keyCode == 32){
       if(document.querySelector("#filterFormdropdown")){
        return false;
       } 
    }
});