var selector = {
    searchButton: '[data-search-button]',
    searchBar: '[data-search-wrapper]',
    serachResult: '[data-search-body]',
    searchInput: '[data-search-input]',
    searchForm: '[data-search-form]',
    serachRecent: '[data-recent-search-result]',
    searchClose: '[data-search-close]',
    searchRecentSuggestion: '[data-recent-suggestion]',
    clearRecentSearch: '[data-clear-recent]',
    searchTabItems: '[data-search-tab]',
    clearInputContent:'[data-clear-input]'
};
let searchForm = document.querySelectorAll(selector.searchForm);
let searchRecentSuggestion = document.querySelectorAll(selector.searchRecentSuggestion);
let formURl = searchurl;
Array.from(searchForm).forEach(function(form) {
    formURl = form.getAttribute('action');
    form.addEventListener("submit", function(event) {
        const form = event.target;
        const formFields = form.elements;
        const searchTerm = formFields.q.value;
        if (searchTerm.replace(/\s/g, '').length > 0) {
            setRecentSearch(searchTerm);
        }
    });
});

let searchSelectors = document.querySelectorAll(selector.searchButton);
var searchBar = document.querySelector(selector.searchBar);
if (searchSelectors) {
    Array.from(searchSelectors).forEach(function(element) {
        element.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelector("body").classList.add("no-scroll");
            setTimeout(() => {
                searchBar.style.display = 'flex';
            }, 200);
            setTimeout(() => {
                searchBar.classList.add('show');
            }, 300);
          
            setTimeout(()=>{
                if(previousFocusElement == ''){
                    previousFocusElement = element;
                }
                focusElementsRotation(searchBar);
            },1000)

            if(document.querySelectorAll(selector.searchInput)){
                Array.from(document.querySelectorAll(selector.searchInput)).forEach(function(item) {
                    setTimeout(() => {
                        item.focus();
                    },1000)
                })
                
            }
            setRecentSearchOnBody();
            searchResult(document.querySelector(selector.searchInput).value = '');
          
        });
    })
}

function setRecentSearchOnBody() {
    if(document.querySelectorAll(selector.serachRecent)){
        Array.from(document.querySelectorAll(selector.serachRecent)).forEach(function(queryItem) {
            if(getRecentSearch() && queryItem) {
                console.log('recent', getRecentSearch())
                queryItem.innerHTML = getRecentSearch();
                clearRecentSearch();
            }else{
                document.querySelector('[data-header-seach-body] [data-recent-suggestion]').innerHTML = ''
            }
        })
    }
}

let searchCloses = document.querySelectorAll(selector.searchClose);
if (searchCloses) {
    Array.from(searchCloses).forEach(function(seachClose) {
        seachClose.addEventListener("click", (e) => {
            e.preventDefault();
            if (searchBar.classList.contains('show')) {
                document.querySelector("body").classList.remove("no-scroll");
                setTimeout(() => {
                    searchBar.classList.remove('show');
                }, 500);
                setTimeout(() => {
                    searchBar.style.display = "none";
                }, 700)
                stopFocusRotation();
                previousFocusElement.focus();
                previousFocusElement = "";
            }
        });
    })
}
// search input 
var searchTyping;
if (document.querySelectorAll(selector.searchInput)) {
    Array.from(document.querySelectorAll(selector.searchInput)).forEach(function(inputItem) {
        if(inputItem.classList.contains('header-group-search')){
            
            inputItem.addEventListener("click", (event) => {
                event.preventDefault();
                setRecentSearchOnBody();
                inputItem.closest('[data-header-searchbox]').querySelector('[data-header-seach-body]').classList.add('open');
              
            });
        }
        inputItem.addEventListener("keyup", (event) => {
            event.preventDefault();
            clearTimeout(searchTyping);
            if (searchRecentSuggestion) {
                Array.from(searchRecentSuggestion).forEach(function(searchsuggestionItem) {
                    searchsuggestionItem.classList.add("hidden");
                })
               
            }
            searchTyping = setTimeout(function() {
                let searchTerm = inputItem.value;
                if (searchTerm.replace(/\s/g, '').length > 0) {
                    setRecentSearch(searchTerm);
                }
                console.log('searchTerm', searchTerm)
                searchResult(searchTerm);
            }, 500)
        });
    })
}

if(document.querySelectorAll(selector.clearInputContent)){
    Array.from(document.querySelectorAll(selector.clearInputContent)).forEach(function(clearInput) {
        clearInput.addEventListener("click", (event) => {
            clearInput.closest('form').querySelector(selector.searchInput).value = '';
            let searchTerm = clearInput.closest('form').querySelector(selector.searchInput).value;
            if(clearInput.classList.contains('header-searchbar-clear')){
                clearInput.closest('[data-header-searchbox]').querySelector('[data-header-seach-body]').classList.remove('open');
            }
            searchResult(searchTerm);
        })
    })
}
// searchResult funtion
var searchResult = function(searchTerm) {
     
        let resultContainer = document.querySelectorAll(selector.serachResult);
        let recentContainer = document.querySelector(selector.serachRecent);
        if (searchTerm == '' && searchRecentSuggestion) {
            Array.from(searchRecentSuggestion).forEach(function(searchsuggestionItem) {
                console.log(searchsuggestionItem)
                searchsuggestionItem.classList.remove("hidden");
            })
        }

        if (searchTerm.replace(/\s/g, '').length > 0) {
            if(resultContainer){
                Array.from(resultContainer).forEach(function(resultContainerItem) {
                    resultContainerItem.innerHTML = preLoaderIcon;
                })
            }
            setTimeout(() => {
                fetch(formURl + "/suggest?section_id=predictive-search&q=" + searchTerm + "&resources[type]=product,article,query,collection,page&resources[limit]=8&resources[limit_scope]=each")
                    .then((response) => {
                        return response.text();
                    })
                    .then((result) => {
                        let searchresults = new DOMParser().parseFromString(result, 'text/html');
                        if(resultContainer){
                            Array.from(resultContainer).forEach(function(appendResultItem) {
                                appendResultItem.innerHTML = searchresults.querySelector('#shopify-section-predictive-search').innerHTML;
                            })
                        }
                        if (getRecentSearch() && resultContainer) {
                            if (recentContainer) {
                                recentContainer.innerHTML = getRecentSearch();
                            }
                            clearRecentSearch();
                            searchTabs();
                            if(animationStatus){
                                if (AOS) { 
                                    AOS.refreshHard() 
                                }
                            }
                        }
                    })
            }, 10);
        } else {
            Array.from(resultContainer).forEach(function(appendResultItem) {
                appendResultItem.innerHTML = '';
            })
           
            if (getRecentSearch() && recentContainer) {
                recentContainer.innerHTML = getRecentSearch();
                searchTabs();
                clearRecentSearch();
                if(animationStatus){
                    if (AOS) { 
                      AOS.refreshHard() 
                    }
                  }
            }

        }
    }
    // set recent search item in the local storage
var setRecentSearch = function(sarchItem) {
    var localStorageValue = JSON.parse(localStorage.getItem("recent-search-items")) || [];
    if (localStorageValue.length > 0) {
        if (localStorageValue.indexOf(sarchItem) < 0) {
            if (localStorageValue.length >= 20) {
                localStorageValue.shift();
            }
            localStorageValue.push(sarchItem)
            localStorage.setItem("recent-search-items", JSON.stringify(localStorageValue));
        }
    } else {
        localStorageValue.push(sarchItem);
        localStorage.setItem("recent-search-items", JSON.stringify(localStorageValue));
    }
}
var clearRecentSearch = function() {
        if (document.querySelectorAll(selector.clearRecentSearch)) {
            Array.from(document.querySelectorAll(selector.clearRecentSearch)).forEach(function(clearRecentButton) {
                clearRecentButton.addEventListener('click', function() {
                    localStorage.removeItem("recent-search-items");
                    if(clearRecentButton.closest('[data-header-seach-body]')){
                        clearRecentButton.closest('[data-header-seach-body]').querySelector('[data-recent-suggestion]').innerHTML = '';
                    }else{
                        document.querySelector(selector.serachRecent).innerHTML = '';
                    }
                })
            })

        }
    }
    // get recent serach name;
var getRecentSearch = function() {
    let recentHtml = '';
    if (localStorage.getItem("recent-search-items")) {
        let localStorageValue = JSON.parse(localStorage.getItem("recent-search-items"));
        if (localStorageValue.length > 0) {
            recentHtml = '<h6 class="predictive-search-heading">'+recentHeading+' <button type="button" class="clear-search" data-clear-recent>'+clearbtnRecent+'</button></h6> <ul class="list-inline predictive-search-popular-list">'
            localStorageValue.reverse();
            Array.from(localStorageValue).forEach(function(recent, index) {
                if (recent != '') {
                    recentHtml += '<li class="predictive-search-popular-item"><a class="predictive-search-popular-link" href="'+searchurl+'?q=' + recent + '">' + recent + '</a></li>'
                }
            })
            recentHtml += '</ul>';
        }
    }

    return recentHtml;
}

function searchTabs() {
    var bindAll = function() {
        var menuElements = document.querySelectorAll(selector.searchTabItems);
        for (var i = 0; i < menuElements.length; i++) {
            menuElements[i].addEventListener('click', change, false);
            menuElements[i].addEventListener('keydown',function(e){ 
                if (e.keyCode == 13 || e.keyCode == 32) {
                  change(e);
                }
            }, false);
        }
    }

    var clear = function() {
        var menuElements = document.querySelectorAll(selector.searchTabItems);
        for (var i = 0; i < menuElements.length; i++) {
            menuElements[i].classList.remove('active');
            var id = menuElements[i].getAttribute('data-results');
            menuElements[i].closest('[data-search-body]').querySelector(`[data-content="${id}"]`).classList.remove('active');
           
        }
    }

    var change = function(e) {
        clear();
        e.target.closest(selector.searchTabItems).classList.add('active');
        var id = e.currentTarget.getAttribute('data-results');
        console.log(e)
        e.target.closest('[data-search-body]').querySelector(`[data-content="${id}"]`).classList.add('active');
      
    }
    bindAll();
}


let isMouseHover = false
let elementsToFind = document.querySelectorAll("[data-header-seach-body], [data-header-search-form]");
Array.from(elementsToFind).forEach(function(searchPopoverArea) {
    searchPopoverArea.addEventListener("mouseleave", function (event) {
        isMouseHover = false
        console.log(isMouseHover)
    });
      searchPopoverArea.addEventListener("mouseover", function (event) {
        isMouseHover = true
        console.log(isMouseHover)
    });
})
document.querySelector('body').addEventListener("click", function(){
    if(!isMouseHover){
        if(document.querySelector('[data-header-seach-body]')){
            document.querySelector('[data-header-seach-body]').classList.remove('open');
        }
    }
})
