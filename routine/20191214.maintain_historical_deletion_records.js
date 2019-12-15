﻿/*

2019/12/14 7:7:53	初版試營運: 維護討論頁之存廢討論紀錄與模板 {{Old vfd multi}}


TODO:
{{Multidel}}
Wikipedia:存廢覆核請求/存檔/*

 */

'use strict';

// Load CeJS library and modules.
require('../wiki loader.js');

CeL.run('application.net.wiki.template_functions');

/** {Object}wiki operator 操作子. */
const wiki = new Wikiapi;
// globalThis.use_language = 'zh';
use_language = 'zh';

const notification_template = 'Template:' + CeL.wiki.template_functions.Old_vfd_multi.main_name;
const start_date = '2008-08-12' /*&& '2008-11-22'*/;
const end_date = Date.now() /*&& Date.parse('2008-11-22')*/;

const FLAG_CHECKED = 'OK', FLAG_TO_ADD = 'need add', FLAG_TO_REMOVE = 'not found', FLAG_DUPLICATED = 'duplicated';
// deletion_flags_of_page[page_title]
// = [ {date:'',result:'',...,bot_checked:''}, ... ]
let deletion_flags_of_page = Object.create(null);
// pages_to_modify[page_title] = [ {date:'',result:'',...,bot_checked:''}, ... ]
const pages_to_modify = Object.create(null);

// ----------------------------------------------------------------------------

function for_each_page_including_vfd_template(page_data) {
	const item_list = CeL.wiki.template_functions.Old_vfd_multi.parse_page(page_data);
	if (item_list.length === 0) {
		CeL.warn('No Hat template found: ' + CeL.wiki.title_link_of(page_data));
		// console.log(page_data);
		return;
	}

	// TODO: 對於本來就針對說明頁的存廢討論紀錄，一樣會被歸類到主頁面去。
	const page_title = CeL.wiki.talk_page_to_main(/* item_list.page_title */ page_data.title);
	// delete item_list.page_title;
	const discussions = deletion_flags_of_page[page_title]
		|| (deletion_flags_of_page[page_title] = []);

	item_list.forEach((discussion) => {
		if (discussion.date)
			discussion.JDN = CeL.Julian_day(discussion.date.to_Date());
		discussions.push(discussion);
	});

	//CeL.info(page_title);
	//console.log(discussions);
}

async function check_deletion_page(JDN, page_data) {
	// Check if the main page does not exist.
	if ('missing' in page_data) {
		// The page is not exist now. No-need to add `notification_template`.
		return;
	}

	if (CeL.wiki.parse.redirect(page_data)) {
		// Should not create talk page when the main page is a redirect page.
		// e.g., [[326]]
		return;
	}

	const normalized_page_title = page_data.title;

	// CeL.info(CeL.wiki.title_link_of(page_data));
	if (false) {
		// NG: Check the talk page
		const page_title = CeL.wiki.to_talk_page(normalized_page_title);
		page_data = await wiki.page(page_title);
		// const item_list =
		// CeL.wiki.template_functions.Old_vfd_multi.parse_page(page_data);
	}

	const page_title = page_data.original_title || normalized_page_title;
	// assert: 同頁面在同一天內僅存在單一討論。
	const flags_of_page = this;
	// console.log(flags_of_page);
	let flags = flags_of_page[page_title], target;
	if (!flags && (flags = flags_of_page[KEY_page_list].convert_from[page_title])) {
		flags = flags_of_page[flags];
	}
	if (!flags) {
		CeL.error('check_deletion_page: Failed to get flags_of_page: ' + JSON.stringify(page_title));
		console.log(flags_of_page);
	}
	if (flags.result === 'r' && page_data.redirect_from === page_title) {
		// 不處理重定向來源已經過重定向的情況。
		// return;
	}

	const text_of_result = CeL.wiki.template_functions.Old_vfd_multi.text_of(flags.result, true);

	const discussions = deletion_flags_of_page[normalized_page_title]
		|| pages_to_modify[normalized_page_title]
		// 直接列入要改變的。
		|| (pages_to_modify[normalized_page_title] = []);
	// console.log(discussions);
	let bingo, need_modify;
	discussions.forEach((discussion) => {
		if (discussion.JDN !== JDN)
			return;
		if (bingo) {
			need_modify = 'duplicated';
			discussion.bot_checked = FLAG_DUPLICATED;
			return;
		}

		bingo = true;
		// 照理 flags.page 應已在 add_page() 設定。
		if (flags.page && discussion.page !== flags.page) {
			// using `flags.page` as anchor
			discussion.page = flags.page;
			need_modify = 'page';
		}

		if (discussion.hat_result !== flags.result) {
			discussion.hat_result = flags.result;
			if (discussion.result !== flags.result && discussion.result !== text_of_result) {
				discussion.result = text_of_result;
				need_modify = 'hat_result';
			}
		}
		if (discussion.target !== flags.target) {
			discussion.target = flags.target;
			need_modify = 'target';
		}
		// discussion.bot_checked = FLAG_CHECKED;
	});

	if (!bingo) {
		need_modify = 'add';
		CeL.debug('Add ' + CeL.wiki.title_link_of(normalized_page_title) + ' to pages_to_modify.', 1, 'check_deletion_page');
		discussions.push({
			date: CeL.Julian_day.to_Date(JDN).format('%Y/%2m/%2d'),
			// 就算沒設定 .page，{{Old vfd multi}} 也會預設為 page_title。
			page: flags.page /*|| page_title */,
			result: text_of_result,
			hat_result: text_of_result !== flags.result && flags.result,
			// bot_checked : FLAG_CHECKED,
			JDN
		});
		// console.log(discussions);
	}

	if (need_modify && deletion_flags_of_page[normalized_page_title]) {
		CeL.debug('Move ' + CeL.wiki.title_link_of(normalized_page_title) + ' to pages_to_modify: ' + need_modify, 1, 'check_deletion_page');
		delete deletion_flags_of_page[normalized_page_title];
		pages_to_modify[normalized_page_title] = discussions;
	}
}

const Hat_names = CeL.wiki.template_functions.Hat.names;
const KEY_title = Symbol('title');
const KEY_page_list = Symbol('page list');

async function check_deletion_discussion_page(page_data) {
	// console.log(page_data.wikitext);
	const parsed = page_data.parse();
	let page_list = [];
	const flags_of_page = Object.create(null);
	flags_of_page[KEY_title] = page_data.title;

	function add_page(title, section, flags) {
		title = title && title.toString();
		const page = CeL.wiki.normalize_title(title);
		if (!page)
			return;
		// 跳過無效的刪除請求：這些請求沒必要特別註記。
		if (flags.result in { ir: true, rr: true, sk: true, drep: true, nq: true, ne: true, rep: true })
			return;

		//console.log(section.section_title.link);
		// using `flags.page` as anchor
		flags.page = section.section_title.link[1];
		flags_of_page[page] = flags;
		page_list.push(page);
	}

	function for_each_section(section, index) {

		if (index === 0) {
			// Skip the first section
			return;
		}

		const flags = Object.create(null);
		section.each('template', (token) => {
			// {{Talkendh|處理結果}}
			if ((token.name in Hat_names) && (flags.result = token.parameters[1])) {
				if (token.parameters[2]) {
					flags.target = token.parameters[2];
				}
				// 僅以第一個有結論的為主。 e.g., [[Wikipedia:頁面存廢討論/記錄/2010/09/26#158]]
				return section.each.exit;
			}
		});

		if (!flags.result) {
			// Skip non-discussions
			return;
		}

		const section_title_text = section.section_title.join('').trim();
		// [[31]]天仍掛上 {{tl|fame}} 或 {{tl|notability}} 模板的[[WP:NOTE|條目]]
		// 30天仍排上 {{fame}} 或 {{importance}} 模板的條目
		// 30天仍掛上 {{tl|fame}} 或 {{tl|notability}} 模板的[[WP:NOTE|條目]]
		// 30天仍掛上 {{tl|Substub}}、{{tl|小小作品}} 或 {{tl|小小條目}} 模板的[[WP:NOTE|條目]]
		// 30天后仍掛有{{tl|notability}}模板的條目 30天后仍掛有{{tl|notability}}模板的條目
		// 過期小小作品 到期篩選的小小作品 台灣學校相關模板 一堆模板-5 又一堆模板 再一堆模板 废弃的化学信息框相关模板 一些年代条目
		// 關注度提刪 關注度到期 批量模板提刪 批量提刪
		if (// section.section_title.level <= 4 &&
			/天[後后]?仍[排掛][有上]|[過到]期.*作品|相[關关]模板|關注度|(?:一[堆些]|[幾\d]個|批量).*(?:模板|頁面|页面|條目|条目|列表|討論頁|讨论页|提刪)/.test(section_title_text)
			// 模板重定向 繁简重定向 一些外語重定向 绘文字重定向
			|| /重定向$/.test(section_title_text)
			|| /^(?:模板|頁面|页面|條目|条目|列表|討論頁|讨论页|提刪)$/.test(section_title_text)
		) {
			return;
		}

		// ----------------------------------------------------------

		flags.result = flags.result.toString();

		let title_to_delete;
		section.section_title.some((token) => {
			if (typeof token === 'string') {
				// 這會順便忽略 "-->", "->"
				return /[^,;:.'"\s→、\[\]\/\->「」『』…]/.test(token);
			}
			if (token.tag === 's' || token.tag === 'del') {
				return false;
			}
			return title_to_delete = token;
		});

		if (!title_to_delete && section.section_title.length === 1) {
			// e.g., ==<s>[[:AngelTalk]]</s>==
			title_to_delete = section.section_title[0];
		}

		if (title_to_delete && title_to_delete.is_link) {
			// e.g., [[Wikipedia:頁面存廢討論/記錄/2008/08/12]]
			if (!title_to_delete[0].toString().startsWith('Wikipedia:頁面存廢討論/'))
				add_page(title_to_delete[0], section, flags);
			return;
		}

		function for_Al(title_token) {
			const page_title_list = CeL.wiki.template_functions.zh_Al.parse(title_token);
			if (page_title_list && page_title_list.length > 0) {
				page_title_list.forEach((title) => add_page(title, section, flags));
				return true;
			}
		}
		if (for_Al(title_to_delete)) return;

		if (title_to_delete && title_to_delete.converted) {
			if (title_to_delete.converted.is_link) {
				// "====-{[[迪奥尼日·波尼亚托夫斯基]]}-===="
				add_page(title_to_delete.converted[0], section, flags);
				return;
			}
			if (Array.isArray(title_to_delete.converted)
				// == -{
				// {{al|Template:東鐵綫未來發展車站列表|Template:南北線車站列表|Template:南北綫車站列表}}
				// }- ==
				&& title_to_delete.converted.some(for_Al)) {
				return;
			}
		}

		// 去掉無效請求，或最終保留的：無傷大雅。
		if ((flags.result.toString().trim().toLowerCase() in { cc: true, ir: true, rr: true, rep: true, k: true, sk: true, os: true })
			// e.g., 提刪者撤回 提請者收回 請求無效 無效提名 重複提出，無效 全部重複／未到期，請求無效
			// 提案者重复提出，请求失效。见下。 改掛關注度模板，三十天後再議
			|| /[撤收]回|[無无失]效|未到期|天後再議|快速保留|速留/.test(flags.result)) {
			return;
		}

		const text_of_result = CeL.wiki.template_functions.Old_vfd_multi.text_of(flags.result);

		if (section.section_title.length === 1 && typeof section.section_title[0] === 'string') {
			CeL.log('check_deletion_discussion_page: ' + CeL.wiki.title_link_of(section.section_title.link[0]) + ' ' + section.section_title[0] + ': ' + text_of_result);
			return;
		}

		CeL.error('check_deletion_discussion_page: ' + CeL.wiki.title_link_of(section.section_title.link[0]) + ' 無法解析出欲刪除之頁面標題: ' + section_title_text);
		// console.log({ title, flags });
		// console.log(section.section_title);
	}
	parsed.each_section(for_each_section, {
		// Wikipedia:頁面存廢討論/記錄/2008/10/11
		// Wikipedia:頁面存廢討論/記錄/2018/06/26
		level_filter: [2, 3, 4]
	});
	page_list = page_list.unique();
	if (false) {
		CeL.info(CeL.wiki.title_link_of(page_data) + ': ' + page_list.length + ' discussions.');
		console.log(page_list);
	}

	flags_of_page[KEY_page_list] = page_list;
	// console.log(page_list);

	// console.log(page_data.title);
	const matched = page_data.title.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
	const JDN = CeL.Julian_day.from_YMD(matched[1], matched[2], matched[3], 'CE');
	await wiki.for_each_page(page_list, check_deletion_page.bind(flags_of_page, JDN), {
		// no warning like "wiki_API.work: 取得 10/11 個頁面，應有 1 個重複頁面。"
		no_warning: true,
		page_options: {
			// redirects: true,
			prop: 'info'
		}
	});
	// console.log(pages_to_modify);
}

// ----------------------------------------------------------------------------

let edit_count = 0;

function modified_notice_page(page_data, discussions) {
	if (CeL.wiki.parse.redirect(page_data)) {
		// Should not create talk page when the talk page is a redirect page.
		// e.g., [[Talk:405]]
		return Wikiapi.skip_edit;
	}

	const wikitext = CeL.wiki.template_functions.Old_vfd_multi.replace_by(page_data, discussions, {
		additional_parameters: 'hat_result|bot_checked'.split('|')
	});

	// console.log(this.summary);
	// console.log(page_data);
	CeL.info('modified_notice_page: Edit ' + CeL.wiki.title_link_of(page_data));
	//console.log(discussions);
	// console.log(wikitext);

	this.summary += ' 共' + discussions.length + '筆紀錄';
	edit_count++;
	return wikitext;
}

async function modify_pages() {
	for (let [page_title, discussions] of Object.entries(pages_to_modify)) {
		page_title = CeL.wiki.to_talk_page(page_title);
		discussions.forEach((discussion) => {
			// 清除不需要的屬性。
			delete discussion.JDN;
			if (discussion.hat_result === discussion.result)
				delete discussion.hat_result;
		});

		// ----------------------------
		if (false) {
			// only for debug
			const page_data = await wiki.page(page_title);
			if (CeL.wiki.parse.redirect(page_data)) {
				// Should not create talk page when the talk page is a redirect
				// page. e.g., [[Talk:405]]
				continue;
			}
			CeL.info('Edit ' + CeL.wiki.title_link_of(page_title));
			console.log(discussions);
			console.log(CeL.wiki.template_functions.Old_vfd_multi.replace_by(page_data, discussions));
			if (edit_count++ > 200) break;
			continue;
		}

		if (edit_count > 50) break;
		// ----------------------------

		try {
			await wiki.edit_page(page_title, function (page_data) {
				return modified_notice_page.call(this, page_data, discussions);
			}, {
				bot: 1,
				summary: '[[Wikipedia:机器人/申请/Cewbot/21|bot test]]: 維護討論頁之存廢討論紀錄與模板'
					+ CeL.wiki.title_link_of(notification_template)
			});
		} catch (e) {
			if (!e.from_string) {
				console.error(e);
			} else {
				// e.g., e === 'empty'
			}
		}
	}
}

// ----------------------------------------------------------------------------

async function main_process() {
	// const page_data = await wiki.page(notification_template);
	// console.log(page_data.wikitext);

	CeL.info('Get pages embeddedin ' + CeL.wiki.title_link_of(notification_template) + '...');
	let page_list = await wiki.embeddedin(notification_template);
	// 可能有重複頁面!
	page_list.append(await wiki.embeddedin('Article history'));
	await page_list.each(for_each_page_including_vfd_template);
	// console.log(deletion_flags_of_page);

	// ----------------------------------------------------

	CeL.info('Get all archived deletion discussions...');
	const vfd_page_list = [];
	// if (typeof end_date === 'string') end_date = end_date.to_Date();
	for (let date = new Date(start_date); date - end_date <= 0; date.setDate(date.getDate() + 1)) {
		// await check_deletion_page_of_date(JDN);
		vfd_page_list.push(date.format('Wikipedia:頁面存廢討論/記錄/%Y/%2m/%2d'));
	}

	if (vfd_page_list.length === 0) {
		CeL.warn('main_process: No archived deletion discussion to check!');
	} else {
		//console.log(vfd_page_list);
		await wiki.for_each_page(vfd_page_list, check_deletion_discussion_page);
	}

	// ----------------------------------------------------

	// free
	deletion_flags_of_page = null;

	// 跑到這邊約需要 2.5小時。
	CeL.info('Check ' + Object.keys(pages_to_modify).length + ' pages if need modify...');
	// console.log(pages_to_modify);
	CeL.write_file('historical_deletion_records.pages_to_modify.json', pages_to_modify);

	await modify_pages();

	// ----------------------------------------------------

	CeL.info((new Date).format() + '	' + Object.keys(pages_to_modify).length + ' pages done.');
}

(async () => {
	await wiki.login(user_name, user_password, use_language);
	// await wiki.login(null, null, use_language);
	await main_process();
})();