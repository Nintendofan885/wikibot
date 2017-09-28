﻿/*

Add topic list to talk page. 增加討論頁面主題列表。為議論增目錄。

node 20170915.topic_list.js use_language=zh &
node 20170915.topic_list.js use_language=zh-classical &
node 20170915.topic_list.js use_project=wikinews &


2017/9/10 22:31:46	開始計畫。
2017/9/16 12:33:6	初版試營運。
2017/9/24 13:56:48	use page_configurations
 完成。正式運用。


@see [[zh:模块:沙盒/逆襲的天邪鬼/talkpage]], [[User:WhitePhosphorus-bot/RFBA_Status]]



TODO:
Flow 的問題是不支援繁簡轉換，沒有在大流量頁面嘗試過。長篇內容是否合適Flow還真不清楚。排版還是不夠靈活。難以處理需要修訂版本刪除的編輯。
https://ja.wikipedia.org/wiki/Wikipedia:Bot%E4%BD%9C%E6%A5%AD%E4%BE%9D%E9%A0%BC
https://ja.wikipedia.org/wiki/Wikipedia:%E4%BA%95%E6%88%B8%E7%AB%AF
https://commons.wikimedia.org/wiki/Commons:Bots/Work_requests
https://zh.moegirl.org/Talk:%E8%AE%A8%E8%AE%BA%E7%89%88
https://zh-classical.wikipedia.org/wiki/%E7%B6%AD%E5%9F%BA%E5%A4%A7%E5%85%B8:%E6%9C%83%E9%A4%A8
https://zh.wikipedia.org/wiki/Wikipedia:%E4%BA%92%E5%8A%A9%E5%AE%A2%E6%A0%88/%E6%8A%80%E6%9C%AF
https://zh.wikipedia.org/wiki/Wikipedia:%E6%9C%BA%E5%99%A8%E4%BA%BA/%E4%BD%9C%E4%B8%9A%E8%AF%B7%E6%B1%82
https://zh.wikipedia.org/wiki/Wikipedia:%E6%9C%BA%E5%99%A8%E4%BA%BA/%E6%8F%90%E8%AE%AE
https://zh.wikipedia.org/wiki/Wikipedia:%E6%9C%BA%E5%99%A8%E4%BA%BA/%E7%94%B3%E8%AF%B7
https://en.wikipedia.org/wiki/Wikipedia:Bots/Requests_for_approval
https://en.wikipedia.org/wiki/Wikipedia:Bot_requests
https://zh.wikinews.org/wiki/Wikinews:%E8%8C%B6%E9%A6%86

TODO:
討論議題列表可以放在另外一頁，也可以在當前頁面中。
可以在 __TOC__ , __NEWSECTIONLINK__ 之後才開始檢查 main_talk_pages
相關發言者訂閱功能 via ping


archive
可以依照指示存檔到不同的page
	存檔可以用編號為主或者以日期,"丁酉年"為主
	可以自動把文字分到新的子頁面
存檔完可以留下索引，等到特定的日子/特定的天數之後再刪除
存檔完可以直接刪除，只留下oldid

 */

'use strict';

// Load CeJS library and modules.
require('./wiki loder.js');

/* eslint no-use-before-define: ["error", { "functions": false }] */
/* global CeL */
/* global Wiki */

var
/** {Object}wiki operator 操作子. */
wiki = Wiki(true),

// Will get page title from wikidata
botop_sitelinks = {
	enwiki : {
		title : 'Category:Wikipedia bot operators'
	}
},
// 一般用討論頁面設定
general_topic_page = '/topic list', general_page_columns = 'NO;title;replies;participants;last_user_set;last_admin_set', general_page_configuration = {
	zh : {
		topic_page : general_topic_page,
		heads : '! # !! 話題 !! <small>回應</small> !! <small title="參與討論人數">參與</small> !! 最新發言 !! data-sort-type="isoDate" | 最後更新 !! 管理員發言 !! data-sort-type="isoDate" | 管理員更新',
		columns : general_page_columns
	},
	'zh-classical' : {
		topic_page : general_topic_page,
		heads : '! data-sort-type="number" | 序 !! 議題 !! data-sort-type="number" | 覆 !! data-sort-type="number" | 參議 !! 末議者 !! data-sort-type="isoDate" | 新易 !! 有秩 !! data-sort-type="isoDate" | 有秩新易',
		columns : general_page_columns
	}
}[use_language],
//
page_configurations = {
	// 'jawiki:Wikipedia:Bot/使用申請 ' : {},
	'jawiki:Wikipedia:Bot作業依頼' : {
		topic_page : general_topic_page,
		heads : '! # !! 依頼 !! <small>返答</small> !! <small title="議論に参加する人数">人数</small> !! 最終更新者 !! data-sort-type="isoDate" | 最終更新日時 !! <small>Bot運用者更新</small> !! data-sort-type="isoDate" | <small>Bot運用者更新日時</small> || 進捗',
		columns : 'NO;title;replies;participants;last_user_set;last_botop_set;status',
		operators : {
			status : check_BOTREQ_status
		}
	},
	// 序號 Topics主題
	'zhwiki:Wikipedia:机器人/作业请求' : {
		topic_page : general_topic_page,
		heads : '! # !! 需求 !! 進度 !! <small>回應</small> !! <small title="參與討論人數">參與</small> !! 最新發言 !! data-sort-type="isoDate" | 最後更新 !! <small>最新機器人操作者</small> !! data-sort-type="isoDate" | <small>機器人操作者最後更新</small>',
		// first_user_set: 發起人與發起時間(Created)
		// last_user_set: 最後留言者與最後時間(Last editor) 最後編輯者+最後編輯於
		// last_admin_set: 特定使用者 special_users.admin 最後留言者與最後時間
		// last_BAG_set: 特定使用者 special_users.BAG 最後留言者與最後時間(Last BAG editor)
		// last_BAG_set: 最後BAG編輯者+BAG最後編輯於
		columns : 'NO;title;status;replies;participants;last_user_set;last_botop_set',
		operators : {
			// 議體進度狀態
			status : check_BOTREQ_status
		}
	},
	'zhwiki:Wikipedia:机器人/申请' : {
		topic_page : general_topic_page,
		heads : '! # !! 機器人申請 !! 進度 !! <small>回應</small> !! <small title="參與討論人數">參與</small> !! 最新發言 !! data-sort-type="isoDate" | 最後更新 !! <small>最新BAG</small> !! data-sort-type="isoDate" | <small>BAG最後更新</small>',
		columns : 'NO;title;status;replies;participants;last_user_set;last_BAG_set',
		transclusion_target : function(token) {
			if (token.name.startsWith(this.title + '/')) {
				return token.name;
			}
			// for zhwiki
			if (/^(?:維基百科|维基百科|Wikipedia|Project):(?:機器人|机器人)\/(?:申請|申请)\//i
					.test(token.name)) {
				return token.name;
			}

			if (token.name.startsWith('/') && token.name !== '/header') {
				return this.title + token.name;
			}
		},
		level_filter : [ 2, 3 ],
		section_filter : function(section) {
			// [[Wikipedia:机器人/申请/preload2]]
			// get bot name from link in section title.
			var bot_name = CeL.wiki.parse
					.user(section.section_title.toString());
			if (/bot/i.test(bot_name)) {
				section.bot_name = bot_name;
			}

			// 申請人。
			var applicants = section.applicants = [], exit = this.each.exit;
			// 尋找標題之外的第一個bot使用者連結。
			this.each.call(section, 'link', function(token) {
				var user_name = CeL.wiki.parse.user(token.toString());
				if (user_name) {
					if (/bot/i.test(user_name)) {
						if (!section.bot_name) {
							// 可能只是文章中的討論，因此不做設定。
							// section.bot_name = user_name;
						} else if (section.bot_name !== user_name) {
							CeL.warn(section.section_title.title + ': '
									+ section.bot_name + ' !== ' + user_name);
						}
					} else {
						applicants.push(user_name);
						return exit;
					}
				}
			});

			if (false) {
				console
						.log([ section.bot_name, applicants,
								section.section_title.toString(),
								section.section_title ]);
				console.log(section.toString());
			}
			return section.bot_name && applicants.length > 0;
		},
		twist_filter : {
			// 帶有審核意味的討論，審查者欄位應該去掉申請人。
			BAG : function(section, user_group_filter) {
				var new_filter = CeL.null_Object();
				for ( var user_name in user_group_filter) {
					if (!section.applicants.includes(user_name)
							&& section.bot_name !== user_name) {
						new_filter[user_name] = true;
					}
				}
				return new_filter;

				// for {Array}user_group_filter
				return user_group_filter.map(function(user_name) {
					return !section.applicants.includes(user_name);
				});
			}
		},
		operators : {
			title : function(section) {
				var title = section.section_title.title, attributes,
				//
				matched = title.match(/^(.+[^\d])(\d{1,3})$/);
				if (matched) {
					matched[1] = matched[1].trimEnd();
					attributes = data_sort_attributes(matched[1] + ' '
							+ (+matched[2]).pad(3))
							+ '| ';
					matched = matched[1] + ' <sup>' + matched[2] + '</sup>';
				} else {
					attributes = '';
					matched = title;
				}
				return attributes + '[[' + this.page.title + '#' + title + '|'
						+ matched + ']]';
			},
			bot_name : function(section) {
				return section.bot_name;
			},
			// 操作者/申請人
			applicants : function(section) {
				return section.applicants.join(', ');
			},
			status : check_BRFA_status
		}
	},
	'zhwiki:Wikipedia:互助客栈/消息' : general_page_configuration,
	'zhwiki:Wikipedia:互助客栈/方针' : general_page_configuration,
	'zhwiki:Wikipedia:互助客栈/技术' : general_page_configuration,
	'zhwiki:Wikipedia:互助客栈/求助' : general_page_configuration,
	'zhwiki:Wikipedia:互助客栈/条目探讨' : general_page_configuration,
	'zhwiki:Wikipedia:互助客栈/其他' : general_page_configuration,
	'zhwikinews:Wikinews:茶馆' : general_page_configuration,
	'zh_classicalwiki:維基大典:會館' : general_page_configuration
};

// ----------------------------------------------------------------------------

// CeL.set_debug(6);

// main talk pages **of this wiki**
var main_talk_pages = [], sub_page_to_main = CeL.null_Object();

Object.keys(page_configurations).forEach(function(wiki_and_page_title) {
	var matched = wiki_and_page_title.match(/^([^:]+):(.+)$/);
	if (matched[1] === CeL.wiki.site_name(wiki)) {
		main_talk_pages.push(matched[2]);
	}
});
if (main_talk_pages.length > 0) {
	CeL.info(main_talk_pages.length + ' page(s) to listen for '
			+ CeL.wiki.site_name(wiki) + ': '
			+ main_talk_pages.map(function(title) {
				return CeL.wiki.title_link_of(title);
			}).join(', '));
} else {
	CeL.error('No talk page to process for ' + CeL.wiki.site_name(wiki) + '!');
}

var special_users;
Wiki(false, 'en').page(botop_sitelinks.enwiki)
//
.data(function(entity) {
	botop_sitelinks = entity.sitelinks;

	get_special_users(function(_special_users) {
		special_users = _special_users;

		// 首先生成一輪。
		main_talk_pages.forEach(function(page_title) {
			wiki.page(page_title, pre_fetch_sub_pages);
		});
		// return;

		wiki.listen(pre_fetch_sub_pages, {
			// start : new Date,

			// 延遲時間: 檢測到未簽名的編輯後，機器人會等待 .delay，以使用戶可以自行補簽。
			// 若是等待時間過長，可能會有其他人插入留言回覆。 [[Special:Diff/45941555]]
			delay : '0m',
			filter : main_talk_pages,
			with_content : true,
			parameters : {
				// 跳過機器人所做的編輯。
				// You need the "patrol" or "patrolmarks" right to request the
				// patrolled flag.
				rcshow : '!bot',
				rcprop : 'title|ids|sizes|flags|user'
			},
			interval : '5s'
		});
	});
});

// ----------------------------------------------------------------------------

// 取得特定使用者名單(hash): 當使用者權限變更時必須重新執行程式！
function get_special_users(callback, options) {

	var special_users = CeL.null_Object(), full_group_name = {
		bureaucrat : 'bureaucrats',
		botop : 'bot operators',
		bot : 'bots',
		admin : 'administrators'
	};

	function note_special_users(group_name) {
		var user_name_list = Object.keys(special_users[group_name]).sort();
		CeL.log('All ' + user_name_list.length + ' '
				+ (full_group_name[group_name] || group_name) + ' confirmed: '
				+ user_name_list.join(', ') + '.');
	}

	function get_allusers(group_name, augroup) {
		// reset
		special_users[group_name] = CeL.null_Object();
		wiki.allusers(function(list) {
			if (list.next_index) {
				throw 'Too many users so we do not get full list of '
						+ group_name + '!';
			}
			// console.log(list);
			list.forEach(function(user_data) {
				if (group_name === 'bot' || !user_data.groups.includes('bot')) {
					special_users[group_name][user_data.name] = user_data;
				}
			});
			note_special_users(group_name);
		}, {
			augroup : augroup || group_name,
			auprop : 'groups',
			// The parameters "augroup" and "auexcludegroup" can not be used
			// together.
			// auexcludegroup : 'bot',
			limit : 'max'
		});
	}

	get_allusers('bot');
	get_allusers('bureaucrat', 'bureaucrat|steward|oversight');
	// 取得管理員列表
	// https://www.mediawiki.org/w/api.php?action=help&modules=query%2Ballusers
	get_allusers('admin', 'sysop|bureaucrat|steward|oversight');

	// [[WP:BAG]], [[Wikipedia:Bot Approvals Group]], [[維基百科:機器人審核小組]]
	// TODO: 這裡的篩選方法會把頁面中所有的使用者都納入這個群體，包括不活躍與離職的。
	wiki.page('Project:BAG', function(page_data) {
		var title = CeL.wiki.title_of(page_data),
		/**
		 * {String}page content, maybe undefined. 條目/頁面內容 = revision['*']
		 */
		content = CeL.wiki.content_of(page_data);

		if (!content) {
			// 行政員可利用[[Special:Makebot]]核可機器人權限。
			special_users.BAG = special_users.bureaucrat;
			special_users.no_BAG = true;
			return;
		}

		// reset
		special_users.BAG = CeL.null_Object()

		var user_hash = CeL.wiki.parse.user.all(content);
		for ( var user_name in user_hash) {
			if (user_name && !(user_name in special_users.bot)
					&& !/bot/i.test(user_name)) {
				special_users.BAG[user_name] = true;
			}
		}

		var matched,
		//
		PATTERN_template_user = /{{ *user *\| *([^#\|\[\]{}\/]+)/ig;

		while (matched = PATTERN_template_user.exec(content)) {
			var user_name = CeL.wiki.normalize_title(matched[1]);
			if (user_name && !(user_name in special_users.bot)
					&& !/bot/i.test(user_name)) {
				special_users.BAG[user_name] = true;
			}
		}

		note_special_users('BAG');
	}, {
		redirects : 1
	});

	var botop_page = botop_sitelinks[CeL.wiki.site_name(wiki)];
	if (botop_page && (botop_page = botop_page.title)) {
		// reset
		special_users.botop = CeL.null_Object();
		// TODO: {{bot|bot operator}}, {{Infobox bot}}
		wiki.categorymembers(botop_page, function(list) {
			if (list.next_index) {
				throw 'Too many users so we do not get full list!';
			}
			// console.log(list);
			var user_namespace = CeL.wiki.namespace('user');
			list.forEach(function(user_data) {
				if (user_data.ns !== user_namespace
						|| /[#\|\[\]{}\/]/.test(user_data.title)) {
					return;
				}
				var user_name = user_data.title.replace(/^[^:]+:/, '');
				if (user_name && !(user_name in special_users.bot)
						&& !/bot/i.test(user_name)) {
					special_users.botop[user_name] = user_data;
				}
			});
			note_special_users('botop');
		}, {
			limit : 'max'
		});
	}

	wiki.run(function() {
		// cache the special users
		CeL.fs_write('special_users.' + CeL.wiki.site_name(wiki) + '.json',
				JSON.stringify(special_users));
		callback(special_users);
	});
}

// ----------------------------------------------
// status functions

function check_BOTREQ_status(section) {
	var status, to_exit = this.each.exit;
	this.each.call(section, 'template', function(token) {
		if (token.name === '解決済み') {
			status = 'style="background-color:#dfd;" | ' + token.name;
			return to_exit;
		}
		if (token.name === 'BOTREQ') {
			// [[Template:BOTREQ]]
			status = (token[1] || '').toString().toLowerCase().trim();
			if (status === 'done' || status === '完了') {
				status = 'style="background-color:#dfd;" | ' + token;
			} else if (status) {
				status = token.toString();
			}

		} else if (token.name in {
			Doing : true,
			處理中 : true,
			Working : true,
			工作中 : true,

			// --------------

			'Partly done' : true,
			部分完成 : true,

			// --------------

			Done : true,
			完成 : true,
			済 : true,

			Completed : true,
			已完成 : true,
			完了 : true,

			Finish : true,

			// --------------

			Confirmed : true,
			確認 : true,
			已確認 : true
		}) {
			status = 'style="background-color:#dfd;" | ' + token;

		} else if (token.name in {
			Undone : true,
			'Not done' : true,
			未完成 : true,
			中止 : true,

			Withdrawn : true,
			撤回請求 : true,
			撤回 : true,

			Cancelled : true,
			取消 : true,
			已取消 : true,

			Declined : true,
			駁回 : true,
			'Thrown out' : true,
			却下 : true,

			Invalid : true,
			無效 : true
		}) {
			status = 'style="background-color:#fbb;" | ' + token;
		}
	});
	return status || '';
}

// [[Template:BAG_Tools]], [[Template:Status2]], [[Template:StatusBRFA]]
// 議體進度狀態(Status:Approved for trial/Trial complete/Approved/...)
function check_BRFA_status(section) {
	var status, to_exit = this.each.exit;
	this.each.call(section, 'template', function(token) {
		if (token.name in {
			BotTrial : true,
			BotExtendedTrial : true,
			BotOnHold : true
		}) {
			status = 'style="background-color:#cfc;" | ' + token;
		} else if (token.name in {
			BotTrialComplete : true,
			OperatorAssistanceNeeded : true,
			BAGAssistanceNeeded : true
		}) {
			status = 'style="background-color:#ffc;" | ' + token;
		} else if (token.name in {
			BotSpeedy : true,
			BotApproved : true
		}) {
			status = 'style="background-color:#ccf;" | ' + token;
		} else if (token.name in {
			BotWithdrawn : true,
			BotExpired : true,
			BotRevoked : true,
			BotDenied : true
		}) {
			status = 'style="background-color:#fcc;" | ' + token;
		} else if (token.name in {
			BotStatus : true,
			BotComment : true,
			BOTREQ : true
		}) {
			status = token.toString();
		}
	});
	// TODO: 提醒申請者
	return status || '';
}

// ----------------------------------------------

/** {Number}一整天的 time 值。should be 24 * 60 * 60 * 1000 = 86400000. */
var ONE_DAY_LENGTH_VALUE = new Date(0, 0, 2) - new Date(0, 0, 1);

// for 討論議題列表可以挑選欄位: (特定)使用者(最後)留言時間
function add_user_name_and_date_set(section, user_and_date_index) {
	var user = '', date = '', additional_attributes;
	if (user_and_date_index >= 0) {
		var days = (new Date - section.dates[user_and_date_index])
				/ ONE_DAY_LENGTH_VALUE;
		date = section.dates[user_and_date_index];
		if (true) {
			// 採用短日期格式。
			date = date.format('%Y-%2m-%2d %2H:%2M');
			// 因為不確定閱覽者的時區，因此不能夠再做進一步的處理，例如 CeL.date.indicate_date_time() 。
		} else {
			// 簽名的日期格式。
			date = CeL.wiki.parse.date.to_String(date, wiki);
		}
		var date_too_long = date.display_width() > 34;
		date = data_sort_attributes(section.dates[user_and_date_index]) + '| '
		//
		+ (date_too_long ? '<small>' + date + '</small>' : date);
		// 討論議題列表依狀態表現不同的顏色
		additional_attributes
		// 超過一個月: 深灰色
		= days > 31 ? 'style="background-color:#bbb;" '
		// 超過一禮拜到一個月: 淺灰色
		: days > 7 ? 'style="background-color:#ddd;" '
		// 最近1小時內: 淺綠色
		: 24 * days < 1 ? 'style="background-color:#efe;" '
		// 超過1小時到最近1日內: 淺藍色
		: days < 1 ? 'style="background-color:#eef;" ' : '';
		user = (additional_attributes ? '| ' : '') + '[[User:'
				+ section.users[user_and_date_index] + '|]]';
	} else {
		// 沒有發現此 user group 之發言。
		additional_attributes = 'style="background-color:#ffd;" | ';
	}

	return [ additional_attributes + user, additional_attributes + date ];
}

// 討論議題列表可以挑選欄位
var section_column_operators = {
	// function: .call(page_data, section, section_index)
	NO : function(section, section_index) {
		return local_number(section_index);
	},
	// 議題的標題
	title : function(section) {
		var title = section.section_title.title,
		// 當標題過長時，縮小標題字型。
		title_too_long = title.display_width() > 40;
		// 限制標題欄的寬度。
		return (title_too_long ? 'style="max-width: 20em;" | <small>' : '')
		//
		+ '[[' + this.page.title
		// 預防在遇到標題包含模板時，因為不能解析連模板最後產出的結果，連結會失效。
		// 但在包含{{para|p}}的情況下連結依然會失效。
		+ '#' + title + '|' + title + ']]' + (title_too_long ? '</small>' : '');
	},
	// 發言次數 discussions conversations
	discussions : function(section) {
		return local_number(section.users.length);
	},
	// 參與討論人數
	participants : function(section) {
		return local_number(section.users.unique().length);
	},
	// reply
	replies : function(section) {
		return local_number(section.replies, section.replies >= 1 ? ''
				: 'style="background-color:#fcc;"');
	},
	// word count
	words : function(section) {
		return CeL.count_word(section.toString());
	}
};

// [[en:Help:Sorting#Specifying_a_sort_key_for_a_cell]]
function data_sort_attributes(key) {
	var type;
	if (typeof key === 'number') {
		type = 'number';
	} else if (CeL.is_Date(key)) {
		type = 'isoDate';
		key = key.toISOString();
	}

	key = 'data-sort-value="' + key + '" ';
	if (type) {
		key = 'data-sort-type="' + type + '" ' + key;
	}
	return key;
}

function local_number(number, attributes) {
	if (use_language === 'zh-classical') {
		return (attributes ? attributes + ' ' : '')
				+ data_sort_attributes(number) + ' | '
				// None, N/A
				+ (number === 0 ? '無' : CeL.to_Chinese_numeral(number));
	}
	return (attributes ? attributes + ' | ' : '') + number;
}

var section_index_filter = CeL.wiki.parser.paser_prototype.each_section.index_filter;
function get_column_operators(page_configuration) {
	var column_operators = page_configuration.column_operators;
	if (Array.isArray(column_operators)) {
		return column_operators;
	}

	column_operators = page_configuration.columns.split(';');

	column_operators = column_operators.map(function(value_type) {
		var operator = page_configuration.operators
				&& page_configuration.operators[value_type]
				|| section_column_operators[value_type];
		if (operator) {
			return operator;
		}

		var matched = value_type.replace(/[ _]+/g, '_')
		// [ all, date type, user group filter, output type ]
		.match(/^(first|last)_(.*?)(?:_(set|name|date))?$/i),
		//
		user_group_name, user_group_filter;

		if (matched) {
			if (!matched[2] || matched[2].toLowerCase() === 'user') {
				user_group_name = 'user';
				// accept all users
				user_group_filter = true;
			} else {
				user_group_name = matched[2] in special_users
				// e.g., 'BAG'
				? matched[2] : matched[2].toLowerCase();
				user_group_filter = special_users[user_group_name];
			}
		}

		if (!user_group_filter) {
			throw 'get_column_operators: Unknown value type: ' + value_type;
		}

		var twist_filter = page_configuration.twist_filter
				&& page_configuration.twist_filter[user_group_name],
		//
		date_type = matched[1].toLowerCase(), output_type = matched[3]
				.toLowerCase();
		return function(section) {
			var index;
			if (date_type === 'last' && user_group_filter === true) {
				index = section.last_update_index;
			} else {
				index = section_index_filter(section,
						twist_filter ? twist_filter.call(this, section,
								user_group_filter) : user_group_filter,
						date_type);
			}

			return output_type === 'set' ? add_user_name_and_date_set(section,
					index)
			//
			: output_type === 'date' ? section.dates[index]
					: section.users[index];
		};
	});

	// cache
	page_configuration.column_operators = column_operators;
	return column_operators;
}

// ----------------------------------------------------------------------------

function pre_fetch_sub_pages(page_data, error) {
	if (page_data.title in sub_page_to_main) {
		// 更改了子頁面，得要重新處理主要頁面。
		wiki.page(sub_page_to_main[page_data.title], pre_fetch_sub_pages);
		return;
	}

	var parser = CeL.wiki.parser(page_data).parse();
	if (!parser) {
		return [
				CeL.wiki.edit.cancel,
				'No contents: ' + CeL.wiki.title_link_of(page_data)
						+ '! 沒有頁面內容！' ];
	}

	if (CeL.wiki.content_of(page_data) !== parser.toString()) {
		console.log(CeL.LCS(CeL.wiki.content_of(page_data), parser.toString(),
				'diff'));
		throw 'parser error';
	}

	var page_configuration = page_data.page_configuration
	//
	= page_configurations[CeL.wiki.site_name(wiki) + ':' + page_data.title];

	if (!page_configuration) {
		// for debug
		CeL.error('Can not get page_configuration for '
				+ CeL.wiki.site_name(wiki) + ':' + page_data.title);
	}

	if (!page_configuration.transclusion_target) {
		generate_topic_list(page_data);
		return;
	}

	var sub_pages_to_fetch = [], sub_pages_to_fetch_hash = CeL.null_Object();
	// check transclusions
	parser.each('transclusion', function(token, index, parent) {
		// page_title
		var page_title = page_configuration.transclusion_target.call(page_data,
				token);
		if (!page_title) {
			return;
		}

		page_title = CeL.wiki.normalize_title(page_title);
		token.index = index;
		token.parent = parent;
		sub_pages_to_fetch_hash[page_title] = token;
		sub_pages_to_fetch.push(page_title);
	}, false,
	// Only check the first level. 只檢查第一層之 transclusion。
	1);

	if (sub_pages_to_fetch.length === 0) {
		generate_topic_list(page_data);
		return;
	}

	CeL.debug(sub_pages_to_fetch.length + ' pages to load:\n'
			+ sub_pages_to_fetch.join('\n'), 1, 'pre_fetch_sub_pages');

	wiki.page(sub_pages_to_fetch, function(page_data_list) {
		// @see main_work @ wiki_API.prototype.work
		if (page_data_list.length !== sub_pages_to_fetch.length) {
			throw 'Fetch pages error!';
		}

		var transclusions = 0;
		// insert page contents and re-parse
		page_data_list.forEach(function(sub_page_data) {
			var title = sub_page_data.original_title || sub_page_data.title,
			//
			token = sub_pages_to_fetch_hash[title];
			if (!token) {
				throw '取得了未指定的頁面: ' + CeL.wiki.title_link_of(sub_page_data);
			}
			if (!(sub_page_data.title in sub_page_to_main)) {
				// 有嵌入其他議題/子頁面的，也得一併監視。
				main_talk_pages.push(sub_page_data.title);
				sub_page_to_main[sub_page_data.title] = page_data.title;
			}
			// 直接取代。
			token.parent[token.index] = '\n{{Transclusion start|' + title
					+ '}}\n' + CeL.wiki.content_of(sub_page_data)
					+ '\n{{Transclusion end|' + title + '}}\n';
			transclusions++;
		});

		if (transclusions > 0) {
			// re-parse
			CeL.wiki.parser(page_data, {
				wikitext : page_data.use_wikitext = parser.toString()
			}).parse();
		}
		generate_topic_list(page_data);
	}, {
		multi : true,
		redirects : 1
	});
}

// ----------------------------------------------------------------------------

function generate_topic_list(page_data) {
	var parser = CeL.wiki.parser(page_data),
	//
	page_configuration = page_data.page_configuration,
	// plainlinks
	section_table = [ '{| class="wikitable sortable collapsible"', '|-',
			page_configuration.heads ],
	//
	column_operators = get_column_operators(page_configuration),
	//
	topic_count = 0, new_topics = [];

	parser.each_section(function(section, section_index) {
		if (section_index === 0) {
			// 跳過頁首設定與公告區。
			return;
		}

		if (page_configuration.section_filter
				&& !page_configuration.section_filter.call(parser, section)) {
			return;
		}

		topic_count++;

		if (Date.now() - section.dates[section.last_update_index] < CeL
				.to_millisecond('1m')) {
			new_topics.push(section.section_title.title);
		}

		// console.log('#' + section.section_title);
		// console.log([ section.users, section.dates ]);
		var row = [];

		column_operators.forEach(function(operator) {
			var values = operator.call(parser, section, section_index);
			if (Array.isArray(values)) {
				row.append(values);
			} else {
				row.push(values);
			}
		});

		section_table.push('|-\n| ' + row.join(' || '));
	}, {
		get_users : true,
		level_filter : page_configuration.level_filter,
		// set options[KEY_SESSION] for parse_date()
		session : wiki
	});

	section_table.push('|}');

	// 討論議題列表放在另外一頁。
	var topic_page = page_configuration.topic_page;
	if (topic_page.startsWith('/')) {
		topic_page = page_data.title + topic_page;
	}

	if (0) {
		console.log(section_table.join('\n'));
		throw 'generate_topic_list: No edit';
	}

	wiki.page(topic_page)
	// TODO: CeL.wiki.array_to_table(section_table)
	.edit(section_table.join('\n'), {
		bot : 1,
		nocreate : 1,
		summary : 'generate topic list: '
		// -1: 跳過頁首設定與公告區。
		+ topic_count + ' topics'
		//
		+ (new_topics.length > 0 ? ', new: ' + new_topics.join('; ') : '')
	})
	// 更新主頁面。
	.purge(page_data.title);
}