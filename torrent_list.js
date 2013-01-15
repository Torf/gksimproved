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
var loadModule = false;
var torrent_list_authorized = ["/", "/browse/", "/sphinx/"];
if($.inArray(url.path[0], torrent_list_authorized) != -1) {
	loadModule = true;
}

if(loadModule) {
	var module = {name:"torrent_list"};
	var dbg = function(str) {
		_dbg("TorrentList", str);
	}

	dbg("[Init] Loading module");
	switch(url.path[0]) {
		case "/":
			url.path = "/browse/"
			module.buttons = "#sort";
			module.loading = "#pager_index";
			break;
		case "/browse/":
			module.buttons = "#sort p";
			module.loading = ".pager_align";
			break;
		case "/sphinx/":
			module.buttons = 'form[name="getpack"] div';
			module.loading = ".pager_align";
			break;
		default:
			dbg("[Init] Shouldn't load");
	}

	var endlessScrolling = opt.get(module.name, "endless_scrolling");;
	var scrollOffset = 260;
	var backTopButtonOffset = 100;
	var loadingPage = false;
	var nextPage = (url.params && url.params.page ? Number(url.params.page) + 1 : 1);
	var jOnScroll = function() {
		if(endlessScrolling && ! ignoreScrolling) {
			dbg("[EndlessScrolling] Scrolled");
			if((document.body.scrollTop + window.innerHeight > document.body.scrollHeight - scrollOffset) && !loadingPage) {
				dbg("[EndlessScrolling] Loading next page");
				loadingPage = true;

				var nextUrl = url;
				nextUrl.params = nextUrl.params ? nextUrl.params : {};
				nextUrl.params.page = nextPage;
				$(module.loading).before('<p class="pager_align" id="page_loading"><img src="' + chrome.extension.getURL("images/loading.gif") + '" /><br />Réticulation des méta-données de la page suivante</p>');
				grabPage(nextUrl, function(data) {
					torrentsTR = $(data).find("#torrent_list tr")
					dbg("[EndlessScrolling] Grab ended")
					if(torrentsTR && torrentsTR.length) {
						dbg("[EndlessScrolling] Got data - Inserting")
						$("#torrent_list").append(filterFL(torrentsTR, true));
						nextPage++;
						loadingPage = false;
						$("#page_loading").remove();
					}
					else {
						dbg("[EndlessScrolling] No more data");
						$("#page_loading").text("Plus rien en vue cap'tain !");
					}
				});
			}

			if(document.body.scrollTop > backTopButtonOffset) {
				$("#backTopButton").show();
			}
			else {
				$("#backTopButton").hide();
			}
		}
	};

	var filteringFL = opt.get(module.name, "filtering_fl");;
	var filterFL = function(data, removeHead) {
		if(!filteringFL) {
			return data;
		}

		dbg("[FLFilter] Scanning for FL");
		var hideNext = false;
		var odd = true;
		$(data).each(function() {
			if($(this).hasClass("head_torrent")) {
				// Remove head if ajax or already found
				if(removeHead) {
					$(this).hide();
				}
				else {
					removeHead = true;
				}
				return;
			}

			odd = !odd;

			if(odd && hideNext) {
				hideNext = false;
				$(this).hide();
				return;
			}

			if(!$(this).find("img[src*='freeleech.png']").length) {
				hideNext = true;
				$(this).hide();
			}
		});
		dbg("[FLFilter] Ended filtering");
		return data;
	};

	var torrentButtons = '<input id="filter_fl" type="checkbox" ' + (filteringFL ? 'checked="checked" ' : ' ') + '/> Afficher les FL uniquement | <input id="endless_scrolling" type="checkbox" ' + (endlessScrolling ? 'checked="checked" ' : ' ') + '/> Endless scrolling | ';

	dbg("[Init] Starting");
	// Adding buttons
	$(module.buttons).prepend(torrentButtons);

	// FreeLeech torrents filtering
	$("#filter_fl").change(function() {
		filteringFL = $(this).attr("checked") == "checked" ? true : false;
		dbg("[FilterFL] is " + filteringFL);
		opt.set(module.name, "filtering_fl", filteringFL);
		if(filteringFL) {
			filterFL($("#torrent_list tr"));
		}
		else {
			dbg("[FLFilter] Unfiltering FL");
			$("#torrent_list tr").show();
			dbg("[FLFilter] Ended unfiltering");
		}
	});
	filterFL($("#torrent_list tr"));

	// Endless scrolling
	$("#endless_scrolling").change(function() {
		endlessScrolling = $(this).attr("checked") == "checked" ? true : false;
		dbg("[EndlessScrolling] is " + endlessScrolling);
		opt.set(module.name, "endless_scrolling", endlessScrolling);
	});
	$(document).scroll(jOnScroll);

	dbg("[Init] Ready");
}