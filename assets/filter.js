
let filterSortHtml = '';
var clearAllFilterButton = false,
    minPriceRange = '',
    maxPriceRang = '';  

window.addEventListener('load', (event) => {
    loadFiltercontent();
    filterTriggerOutside();
    removeFilter();
    window.addEventListener('scroll',(event) => {
        var scrollElement = document.querySelector("[data-scroll]");
        if (scrollElement) {
            infineScroll(scrollElement);
        }
    });
       
if(document.querySelector("[data-dropdown-close]")){
    document.querySelector("[data-dropdown-close]").addEventListener("click", function(event){
        event.preventDefault();
        document.querySelector('[data-dropdown-body]').classList.remove("is-open")
    })
}
});

window.addEventListener('resize',function(){
    if (window.innerWidth < 768) {
        if(document.querySelector("[data-dropdown-body].is-open")){
            document.querySelector("[data-dropdown-body].is-open").classList.remove("is-open");
          
        }
    }
    if(document.querySelector(".filter-side-drawer.show")){
        document.querySelector(".filter-side-drawer.show").classList.remove("show");
        document.querySelector(".filter-side-drawer").style.display="none";
        document.querySelector("body").classList.remove("no-scroll");
    }
  
    
})


function showMoreFilters() {
    var showMoreFilters = document.querySelectorAll('.filters-expand');
    if (showMoreFilters) {
        Array.from(showMoreFilters).forEach(function(showMoreFilter) {
            showMoreFilter.addEventListener("click", (e) => {
                e.preventDefault();
                if (showMoreFilter.classList.contains('active')) {
                    showMoreFilter.classList.remove('active');
                    showMoreFilter.closest(".filter-item").classList.remove("show-more-filter")
                    DOMAnimations.slideUp(showMoreFilter.parentNode.querySelector('.more-options'), 150);
                    showMoreFilter.querySelector('strong').textContent = showMoreText;
                } else {
                    showMoreFilter.classList.add('active');
                    showMoreFilter.closest(".filter-item").classList.add("show-more-filter")
                    DOMAnimations.slideDown(showMoreFilter.parentNode.querySelector('.more-options'), 150);
                    showMoreFilter.querySelector('strong').textContent = showLessText;
                }
            });

            let mouseoverEvent = new MouseEvent("mouseover", {
                bubbles: true,
                cancelable: true,
                view: window,
            });
                       
            showMoreFilter.onkeydown = function(e) {
                if (e.keyCode == 13 || e.keyCode == 32) {
                    showMoreFilter.dispatchEvent(mouseoverEvent); 
                    setTimeout(() => {
                        if(previousFocusElement == ''){
                            previousFocusElement = this;
                        }
                      
                        showMoreFilter.parentNode.querySelector('.more-options input').focus();
                        }, 500);
                   
                }
            };
        });
    }

}
function dropDownBar(sections = document) {
    if (document.querySelectorAll('[data-dropdown-head]')) {
        let dropdownHead = document.querySelectorAll('[data-dropdown-head]');
        Array.from(dropdownHead).forEach(function(dropdownHeadElement) {

            dropdownHeadElement.addEventListener("click", (e) => {
                e.preventDefault();
                let parent = dropdownHeadElement.closest('.shopify-section');
                let dropDown =  parent.querySelector("[data-dropdown-body]");
                if (parent.querySelector("[data-dropdown-body]").classList.contains("is-open")) {
                    parent.querySelector("[data-dropdown-body]").classList.remove("is-open");
                } else {
                    parent.querySelector("[data-dropdown-body]").classList.add("is-open");                    
                    setTimeout(() => {
                        previousFocusElement = dropdownHeadElement;
                        if(dropDown){
                            focusElementsRotation(dropDown);
                        }
                        }, 300);
                    
                }
                
              
            });
            let mouseoverEvent = new MouseEvent("mouseover", {
                bubbles: true,
                cancelable: true,
                view: window,
            });
                       
            dropdownHeadElement.onkeydown = function(e) {
                let parent = dropdownHeadElement.closest('.shopify-section');
                let dropDown =  parent.querySelector("[data-dropdown-body]");
                if (e.keyCode == 13 || e.keyCode == 32) {
                    dropDown.dispatchEvent(mouseoverEvent); 
                    setTimeout(() => {
                        if(previousFocusElement == ''){
                            previousFocusElement = this;
                        }
                        if(dropDown){
                            focusElementsRotation(dropDown);
                        }
                        }, 300);
                    }
            };
        });
    }
}

function applyFilters(status) {
    if( document.querySelector('[data-products-container]')){
        var section = document.querySelector('[data-products-container]');
        var parentSection=section.closest('.shopify-section');
        if (section) {
            var sectionId = section.dataset.id;
            const filterForm = document.querySelector('.main-products-wrapper');
            if (!filterForm) {
                return false;
            }
            let filterPriceItems = document.querySelectorAll(".filter-price-option-item");
            Array.from(filterPriceItems).forEach(function(filterPriceItem){
                let rangeInput = filterPriceItem.querySelectorAll(".filter-option-range-input input"),
                    priceInput = filterPriceItem.querySelectorAll(".filter-option-price-input input"),
                    range = filterPriceItem.querySelector(".price-progress-bar");
                    if(rangeInput.length > 0){
                        let priceGap = rangeInput[0].getAttribute('step');
                        priceInput.forEach((input) => {
                            input.addEventListener("change", (e) => {
                                let minPrice = parseInt(priceInput[0].value),
                                    maxPriceRange = parseInt(priceInput[1].getAttribute("data-max-value"));
                                if (minPrice > maxPriceRange) {
                                    minPrice = maxPriceRange;
                                    priceInput[0].value = minPrice;
                                }
        
                                getFilterData(input, sectionId)
                
                            });
                        });
                        rangeInput.forEach((input) => {
                            input.addEventListener("change", (event) => {
                                rangeSlider(input, event);
                                getFilterData(input, sectionId);
                
                            });
                            input.addEventListener("input", (event) => {
                                rangeSlider(input, event);
                            
                            });
                        });
                        var rangeSlider = function(input, event) {
                            let minVal = parseInt(rangeInput[0].value),
                                maxVal = parseInt(rangeInput[1].value);
                            minPriceRange = (minVal / rangeInput[0].max) * 100 + "%";
                            maxPriceRang = 100 - (maxVal / rangeInput[1].max) * 100 + "%";
                            if (maxVal - minVal < priceGap) {
                                if (event.target.className === "price-slider-range-min") {
                                    rangeInput[0].value = maxVal - priceGap;
                                } else {
                                    rangeInput[1].value = minVal + priceGap;
                                }
                            } else {
                                priceInput[0].value = minVal;
                                priceInput[1].value = maxVal;
                                range.style.left = minPriceRange;
                                range.style.right = maxPriceRang; 
                            }
                        }
                    }
            })

            if (window.innerWidth > 767) {
                let inputs = filterForm.querySelectorAll('input[type=checkbox]');
                Array.from(inputs).forEach(function(input) {
                    input.addEventListener("click", () => {
                        if (window.innerWidth > 767) {
                            getFilterData(input, sectionId)
                        }
                    });
                });
    
                if(parentSection.querySelector("#applyFilter")){
                    let applyButton = parentSection.querySelector("#applyFilter");
                    let fiterformids = document.querySelectorAll('#filterForm, #filterFormdropdown');
                    Array.from(fiterformids).forEach(function(fiterid){
                        fiterid.addEventListener('keydown', function(event) {
                            if (event.target.tagName.toLowerCase() === 'input' && event.key === 'Enter') {
                                event.preventDefault();
                            }
                        }); 
                    })


                    applyButton.addEventListener("click", (event) => {
                        event.preventDefault();
                        if (window.innerWidth > 767) {
                            setTimeout(function(){
                                if( parentSection.querySelector("[data-dropdown-body]")){
                                    parentSection.querySelector("[data-dropdown-body]").classList.remove("is-open");
                                }
                                if( parentSection.querySelector("[data-filter-drawer]")){
                                    parentSection.querySelector("[data-filter-drawer]").classList.remove("show");
                                    
                                }
                            },300);
                            setTimeout(function(){
                                if(parentSection.querySelector("[data-filter-drawer]")){
                                    parentSection.querySelector("[data-filter-drawer]").style.display='none';
                                }
                               
                            },500)
                            document.querySelector('body').classList.remove('no-scroll');
                        
                        }
                    })
                }
            } else {
                if(status == undefined){
                    Array.from(filterForm.querySelectorAll('form')).forEach(function(form){


                        form.addEventListener("submit", (e) => {
                            e.preventDefault();
                            getFilterData(form,sectionId);
                            setTimeout(function(){
                                if( parentSection.querySelector("[data-dropdown-body]")){
                                    parentSection.querySelector("[data-dropdown-body]").classList.remove("is-open");
                                }
                                if( parentSection.querySelector("[data-filter-drawer]")){
                                    parentSection.querySelector("[data-filter-drawer]").classList.remove("show");
                                    
                                }
                            },300);
                            setTimeout(function(){
                                parentSection.querySelector("[data-filter-drawer]").style.display='none';
                            },500)
                            document.querySelector('body').classList.remove('no-scroll');
                        }); 
                    });
                }
            }
        }
    }
}

function removeFilter(){
    var removeFilters = document.querySelectorAll('a.applied-filter-remove');
    var section = document.querySelector('[data-products-container]');
    if(section) {
        var sectionId = section.dataset.id;
        Array.from(removeFilters).forEach(function(removeFilter) {
            removeFilter.addEventListener("click", (event) => {
                event.preventDefault();
                if (removeFilter.hasAttribute('applied-filter-cross-all')) {
                    var _url = removeFilter.getAttribute('href');
                    getFilterData(removeFilter, sectionId, _url);
                    return false;
                } else {
                    var _url = removeFilter.getAttribute('href');
                    getFilterData(removeFilter, sectionId, _url);
                }
            });
        });
    }
}

function sortByOptions() {
    var section = document.querySelector('[data-products-container]');
    var sortBy = document.querySelectorAll('[name="sort_by"]');
    var sortLabels = document.querySelectorAll('[data-sort-option]');
    if (section) {
        var sectionId = section.dataset.id;
        Array.from(sortBy).forEach(function(sort) {
            sort.addEventListener("change", (e) => {
                let value = sort.getAttribute("data-name");
                Array.from(sortBy).forEach(function(sort) {
                    sort.parentNode.classList.remove('selected');
                })
                sort.parentNode.classList.add('selected');
                getFilterData(sort, sectionId);
                sort.closest(".filter-bar-right").querySelector(".custom-select-text").innerHTML = `<strong>${value}</strong>`;
            });
        });
        Array.from(sortLabels).forEach(function(label) {
            label.addEventListener("click", (e) => {
                triggerEvent(label)
            });
            label.addEventListener("keydown", (e) => {
                if (e.keyCode == 13 || e.keyCode == 32) {
                    triggerEvent(label)
                }
            });
        });
    }
}
function triggerEvent(label){
    label.parentNode.querySelector('input').checked = true;
    let changeEvent = new Event("change", {
        bubbles: true,
        cancelable: true,
        view: window,
    });
    label.parentNode.querySelector('input').dispatchEvent(changeEvent)
}
function fetchFilterData(url) {
    return fetch(url)
        .then(response => response.text())
}

function getFilterData(input, sectionId, remove) {

    let filterForm = input.closest('form');
    let url='';
    let _updateUrl='';
    if(input.getAttribute('form') == 'filterForm' && document.getElementById(input.getAttribute('form'))){
        filterForm = document.getElementById(input.getAttribute('form'));
    }
    
    if(filterForm || remove){
        let parentSection= input.closest(".shopify-section");
        if(filterForm){
            const formData = new FormData(filterForm);
            let searchParameters = new URLSearchParams(formData).toString();
             url = window.location.pathname + '?section_id=' + sectionId + '&' + searchParameters;
             _updateUrl = window.location.pathname + '?' + searchParameters
        }
        
        if (remove) {
            url = remove;
            _updateUrl = remove;
        }
        const html = fetchFilterData(url).then((responseText) => {
            const resultData = new DOMParser().parseFromString(responseText, 'text/html');
            var produtsHtml = resultData.querySelector('[data-products-container]');
            var produtsElement = document.querySelector('[data-products-container]');
            /* Result for the collection and search page */
            if (produtsHtml) {
                produtsElement.innerHTML = produtsHtml.innerHTML
                let quickviewElements = produtsElement.querySelectorAll("[data-quickview-action]");
                Array.from(quickviewElements).forEach(function (element) {
                    initQuickView(element);
                });
                colorSwatchesMediaChanged(produtsElement);
        
            }
            if(resultData.querySelector('[data-search-result-count]')){
                document.querySelector("[data-search-result-count]").textContent =resultData.querySelector('[data-search-result-count]').textContent;
            }

            if(resultData.querySelector("[data-sorting-content]")){
                document.querySelector("[data-sorting-content]").innerHTML=resultData.querySelector("[data-sorting-content]").innerHTML;
                sortByOptions();
             
            }
        /*------------ update filter sidebar --------------*/
            var currentFilterItems = document.querySelectorAll(".filter-item");
            var resultFilterItems=resultData.querySelectorAll(".filter-item");
            Array.from(resultFilterItems).forEach(function(filterItem,index) {
                let matchItem = currentFilterItems[index];
                if(matchItem.querySelector(".price-slider-range-min")){    
                    console.log(matchItem)
                    matchItem.querySelector(".filter-option-range-input").innerHTML=filterItem.querySelector('.filter-option-range-input').innerHTML;
                    matchItem.querySelector(".filter-option-price-input").innerHTML=filterItem.querySelector('.filter-option-price-input').innerHTML;
                    let rangeInput = matchItem.querySelectorAll(".filter-option-range-input input")
                    minVal = parseInt(rangeInput[0].value),
                    rangeselector=filterItem.querySelector('.price-progress-bar')
                    maxVal = parseInt(rangeInput[1].value);
                    minPriceRange=(minVal / rangeInput[0].max) * 100 + "%";
                    maxPriceRange=100 - (maxVal / rangeInput[1].max) * 100 + "%";
                    rangeselector.style.left = minPriceRange;
                    rangeselector.style.right = maxPriceRange;
                    matchItem.querySelector(".filter-option-price-slider").innerHTML=filterItem.querySelector('.filter-option-price-slider').innerHTML;
                }
                else{
                    matchItem.querySelector('.filter-option-list').innerHTML = filterItem.querySelector('.filter-option-list').innerHTML;
        
                    if(matchItem.classList.contains("show-more-filter")) {

                        let moreOption = matchItem.querySelector('.more-options');
                        if (moreOption) {
                            moreOption.style.display = 'block';
                            let moreOptionText = matchItem.querySelector('.filters-expand');
                            if (moreOptionText) {
                                moreOptionText.classList.add('active');
                                moreOptionText.querySelector('strong').textContent = showLessText;
        
                            } 
                        }
                    }
                }
            });  
            var sortByItem = document.querySelector('.hidden_sort_by');
            var resultSortByItem = resultData.querySelector('.sort-by-selected');
            if(sortByItem && resultSortByItem){
                sortByItem.value = resultSortByItem.value;
            }
           
            removeFilter();
            applyFilters('updated');
            customDropdownElements();
            showMoreFilters();
            sideDrawerInt();
            loadMoreCollection();
            productCardHoverInit();

            if(animationStatus){
                if (AOS) { 
                AOS.refreshHard() 
                }
            }
            triggered = false
            history.pushState({}, null, _updateUrl);
        
            
        });
    }
}
let triggered = false;
function infineScroll(scrollElement) {
    if (scrollElement && scrollElement.querySelector("a")) {
        var nextUrl = scrollElement.querySelector("a").getAttribute("href");
        if (isOnScreen(scrollElement) && (triggered == false)) {
            triggered = true;
            scrollElement.querySelector("a").remove();
            scrollElement.querySelector('.load').classList.remove('hidden');
            fetchFilterData(nextUrl).then((responseText) => {
                scrollElement.remove();
                const resultData = new DOMParser().parseFromString(responseText, 'text/html');
                var html = resultData.querySelector('[data-products-container]');
                if(html.querySelector('.applied-filters')){
                    html.removeChild(html.querySelector('.applied-filters'))
                }
                var elmnt = document.querySelector('[data-products-container]');
                /* Result for the collection and search page */
                if (html) {
                    elmnt.innerHTML += html.innerHTML
                    let quickviewElements = elmnt.querySelectorAll("[data-quickview-action]");
                    Array.from(quickviewElements).forEach(function(element) {
                        initQuickView(element);
                    });
                    colorSwatchesMediaChanged(elmnt);
                    triggered = false
                    loadMoreCollection();
                    productCardHoverInit();
                    if(animationStatus){
                        if (AOS) { 
                          AOS.refreshHard() 
                        }
                      }
                }
            })
        }
    }
}

function loadMoreCollection() {
    var loadmoreButton = document.querySelector(".collection-load-more");
    if (loadmoreButton) {
        loadmoreButton.addEventListener("click", (event) => {
            event.preventDefault();
            var scrollElement = document.querySelector("[data-load-more]");
            if (scrollElement) {
                infineScroll(scrollElement);

            }
        })
    }
}

function clearAllFilter(){
    var clearAllfilter=document.getElementById("clearAllFilterData");
    if(clearAllfilter){
        clearAllfilter.addEventListener("click", (e) => {
        e.preventDefault();
        var section = document.querySelector('[data-products-container]');
        if (section) {
            var sectionId = section.dataset.id;
            var _url = clearAllfilter.getAttribute('href');
            getFilterData(clearAllfilter,sectionId, _url);
        } 
        });
    }
}

function filterTriggerOutside() {
    let mouse_is_inside = false
    let elementList = document.querySelectorAll("[data-dropdown-filter],.drawer-main");
    Array.from(elementList).forEach(function (element) {
      element.addEventListener("mouseover", () => {
        mouse_is_inside = true;
      });
  
      element.addEventListener("mouseout", () => {
        mouse_is_inside = false;
      });
    });
  
    document.addEventListener("click", function () {
      if (!mouse_is_inside) {
        if(document.querySelector(".drawer-main")){
            if(document.querySelector(".drawer-main").classList.contains('is-open')){
                document.querySelector(".drawer-main").classList.remove('is-open');
            }
            
        } 
      }
   
    });
  
    document.addEventListener("keyup", function (event) {
      if (event.keyCode == 27) {
        if(document.querySelector(".drawer-main")){
            if(document.querySelector(".drawer-main").classList.contains('is-open')){
                document.querySelector(".drawer-main").classList.remove('is-open');
            }
            
        } 
      }
    });
  
   
}

function loadFiltercontent(){
    applyFilters();
    sortByOptions();
    showMoreFilters();
    dropDownBar();
    loadMoreCollection();
    clearAllFilter();
    filterTriggerOutside();
    removeFilter();
}
document.addEventListener('shopify:section:load', loadFiltercontent, false);