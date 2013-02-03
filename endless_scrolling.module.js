// This file is part of GKSimproved.

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
modules.endless_scrolling = {
	name: "endless_scrolling",
	dText: "Endless scrolling",
	pages: [
		{ path_name: "/", options: { 
			loading: '#pager_index', path: '/browse/', domExtract: "#torrent_list tr", domInsertion: "#torrent_list"
		} },
		{ path_name: "/browse/", options: { 
			loading: '.pager_align', domExtract: "#torrent_list tr", domInsertion: "#torrent_list" , lastPage: ".pager_align", pageModifier: -1
		} },
		{ path_name: "/sphinx/", options: { 
			loading: '.pager_align', domExtract: "#torrent_list tr", domInsertion: "#torrent_list", canSuggest: true, lastPage: ".pager_align", pageModifier: -1
		} },
		{ path_name: "/forums.php", params: { action: 'viewforum' }, options: { 
			loading: '.thin table', loadingAfter: true, domExtract: 'tbody tr', domInsertion: '.thin tr:last', insertAfter: true, scrollOffset: 180, stopInsertBottomOffset: 100, lastPage: '.linkbox:nth(2)', lastPageRegex: /\[(\d+)\]\s*$/, endOfStream: 'No posts to display!'
		} },
		{ path_name: "/forums.php", params: { action: 'viewtopic' }, options: { 
			loading: '.thin table:last', loadingAfter: true, domExtract: '.thin table', domInsertion: '.thin table:last', insertAfter: true, scrollOffset: 600, stopInsertBottomOffset: 100, lastPage: '.linkbox:first', lastPageRegex: /\[(\d+)\]\s*$/
		} },
		{ path_name: "/m/peers/snatched", options: { 
			loading: '.pager_align', lastPage: ".pager_align:first", domExtract: ".table100 tbody tr", domInsertion: ".table100 tbody", cancelQ: true, pageModifier: -1
		} },
		{ path_name: "/logs/", options: { 
			loading: '.pager_align', lastPage: '.pager_align', domExtract: "tbody tr", domInsertion: "tbody", pageModifier: -1
		} },
		{ path_name: "/req/", options: { 
			loading: '.pager_align', lastPage: '.pager_align', domExtract: "#requests_list tbody tr:not(:first)", domInsertion: "#requests_list tbody", pageModifier: -1
		} },
		{ path_name: "/m/images/", options: {
			loading: '.pager_align', lastPage: '.pager_align', domExtract: "#imageslist div", domInsertion: "#imageslist", cancelQ: true, pageModifier: -1
		} }
	
	],
	loaded: false,
	loadModule: function(mOptions) {
		this.loaded = true;
		var module_name = this.name;
		var dbg = function(str) {
			_dbg(module_name, str);
		};

		dbg("[Init] Loading module");
		// Loading all functions used

		var maxPage = false;
		var getMaxPage = function() {
			if(!mOptions.lastPage) {
				return;
			}

			var pagesList = $(mOptions.lastPage);
			if(!pagesList.length || !pagesList.text().match(/\S/)) {
				maxPage = true;
			}
			else {
				var lastPageRegex = mOptions.lastPageRegex ? mOptions.lastPageRegex : /(\d+) ?$/;
				var lastPageMatch = pagesList.text().match(lastPageRegex);
				if(!lastPageMatch) {
					maxPage = true
				}
				else {
					maxPage = Number(lastPageMatch[1]) + (mOptions.pageModifier ? mOptions.pageModifier : 0);
				}
			}
		};

		var defaultScrollOffset = 200;
		var backTopButtonOffset = 100;
		var loadingPage = false;
		var wentToPageBottom = false;
		var nextPage = (url.params && url.params.page ? Number(url.params.page) + 1 : 2 + (mOptions.pageModifier ? mOptions.pageModifier : 0));
		var jOnScroll = function() {
			if(!opt.get(module_name, "endless_scrolling") || ignoreScrolling || avoidEndlessScrolling) {
				return;
			}

			if(document[$.browser.mozilla ? "documentElement" : "body"].scrollTop > backTopButtonOffset) {
				$("#backTopButton").show();
			}
			else {
				$("#backTopButton").hide();
			}

			if(maxPage !== false && (maxPage === true || nextPage > maxPage)) {
				return;
			}

			if(opt.get(module_name, "pause_scrolling") && document[$.browser.mozilla ? "documentElement" : "body"].scrollTop + window.innerHeight >= document.documentElement.scrollHeight) {
				dbg("[EndlessScrolling] Stop inserting, got to page bottom");
				wentToPageBottom = true;
			}

			dbg("[EndlessScrolling] Scrolled");
			if((document[$.browser.mozilla ? "documentElement" : "body"].scrollTop + window.innerHeight > document.documentElement.scrollHeight - (mOptions.scrollOffset ? mOptions.scrollOffset : defaultScrollOffset)) && !loadingPage) {
				dbg("[EndlessScrolling] Loading next page");
				loadingPage = true;

				var nextUrl = url;
				nextUrl.path = mOptions.path ? mOptions.path : nextUrl.path;
				nextUrl.params = nextUrl.params ? nextUrl.params : {};
				nextUrl.cancelQ = (mOptions.cancelQ ? mOptions.cancelQ : (nextUrl.cancelQ ? nextUrl.cancelQ : false));
				nextUrl.params.page = nextPage;
				var loadingP = '<p class="pager_align page_loading"><img src="' + chrome.extension.getURL("images/loading.gif") + '" /><br />Réticulation des méta-données de la page suivante</p>';
				if(mOptions.loadingAfter) {
					$(mOptions.loading).after(loadingP);
				}
				else {
					$(mOptions.loading).before(loadingP);
				}
				grabPage(nextUrl, function(data) {
					insertionData = $(data).find(mOptions.domExtract)
					dbg("[EndlessScrolling] Grab ended")
					if(insertionData && insertionData.length && !(mOptions.endOfStream && insertionData.text().indexOf(mOptions.endOfStream) != -1)) {
						insertAjaxData(insertionData);
					}
					else {
						dbg("[EndlessScrolling] No more data");
						$(".page_loading").text("Plus rien en vue cap'tain !");
					}
				});
			}
		};

		var insertAjaxData = function(data) {
			if(wentToPageBottom) {
				dbg("[EndlessScrolling] Waiting for user confirmation in order to insert more");
				$(".page_loading").html('<a href="#" class="resume_endless_scrolling">Reprendre l\'endless scrolling</a>');
				$(".resume_endless_scrolling").click(function(e) {
					wentToPageBottom = false;
					e.preventDefault();
					insertAjaxData(data);
					return false;
				});
				return;
			}
			dbg("[EndlessScrolling] Got data - Inserting");
			if(mOptions.insertAfter) {
				$(mOptions.domInsertion).after(data);
			}
			else {
				$(mOptions.domInsertion).append(data);
			}
			nextPage++;
			loadingPage = false;
			$(".page_loading").remove();
			$(document).trigger("endless_scrolling_insertion_done");
			dbg("[EndlessScrolling] Ended");
		};

		dbg("[Init] Starting");
		// Execute functions

		getMaxPage();
		dbg("[endless_scrolling] url relative pages : " + (url.params && url.params.page ? url.params.page : 0) + "/" + maxPage);
		$(document).scroll(jOnScroll);

		var generateTooltip = function() {
			return modules[module_name].pages.map(function(page){
				return page.path_name + (page.params ? '?' + $.map(page.params, function(value, query) {
					return query + '=' + value;
				}).join('&') : '');
			}).join('\n');
		};
		opt.setData(module_name, "endless_scrolling", "tooltip", generateTooltip());

		dbg("[Init] Ready");
	},
};