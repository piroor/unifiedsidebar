/* ***** BEGIN LICENSE BLOCK ***** 
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Unified Sidebar.
 *
 * The Initial Developer of the Original Code is YUKI "Piro" Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2010-2016
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): YUKI "Piro" Hiroshi <piro.outsider.reflex@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ******/

var UnifiedSidebarForVerticalTabbar = {
	resizing : false,
	resizingOffsetY : -1,
	height : -1,

	sizeBackup : null,
	sizeBackupTargets : [
		{ name : 'width',     CSSName : 'width',      default : '' },
		{ name : 'minWidth',  CSSName : 'min-width',  default : '0' },
		{ name : 'maxWidth',  CSSName : 'max-width',  default : 'none' },
		{ name : 'height',    CSSName : 'height',     default : '' },
		{ name : 'minHeight', CSSName : 'min-height', default : '0' },
		{ name : 'maxHeight', CSSName : 'max-height', default : 'none' }
	],

	PREF_HEIGHT : 'extensions.unifiedsidebar@piro.sakura.ne.jp.height',

	get sidebarBox()
	{
		return document.getElementById('sidebar-box');
	},

	get sidebarHeader()
	{
		return document.getElementById('sidebar-header') || document.getElementsByTagName('sidebarheader')[0];
	},

	get sidebarTitle()
	{
		return document.getElementById('sidebar-title');
	},

	get sidebarThrobber()
	{
		return document.getElementById('sidebar-throbber');
	},

	get sidebarFrame()
	{
		return document.getElementById('sidebar');
	},

	get sidebarSplitter()
	{
		return document.getElementById('sidebar-splitter');
	},

	get sidebarHidden()
	{
		var box = this.sidebarBox;
		return box.hidden || box.collapsed;
	},

	getTabStrip : function(aTabBrowser) 
	{
		var strip = aTabBrowser.mStrip;
		return (strip && strip.localName == 'hbox') ?
				strip :
				aTabBrowser.tabContainer.parentNode;
	},


	init : function()
	{
		window.removeEventListener('DOMContentLoaded', this, false);

		window.addEventListener('load', this, false);
		window.addEventListener('unload', this, false);
		window.addEventListener('resize', this, false);
		this.sidebarBox.addEventListener('DOMAttrModified', this, false);
		this.sidebarHeader.addEventListener('mousedown', this, false);

		// for Tree Style Tab
		window.addEventListener('nsDOMTreeStyleTabTabbarPositionChanged', this, false);
		window.addEventListener('nsDOMTreeStyleTabTabbarRendered', this, false);

		// for TotalToolbar + Tree Style Tab on Firefox 4.0 or later
		var menu = document.getElementById('tt-toolbar-properties');
		if (menu) menu.addEventListener('command', this, false);

		this.prefs.addPrefListener(this);

		this.height = this.prefs.getPref(this.PREF_HEIGHT);
	},

	initWithDelay : function()
	{
		window.removeEventListener('load', this, false);
		this.updateStyle();
	},

	destroy : function()
	{
		window.removeEventListener('unload', this, false);
		window.removeEventListener('resize', this, false);
		this.sidebarBox.removeEventListener('DOMAttrModified', this, false);
		this.sidebarHeader.removeEventListener('mousedown', this, false);

		// for Tree Style Tab
		window.removeEventListener('nsDOMTreeStyleTabTabbarPositionChanged', this, false);
		window.removeEventListener('nsDOMTreeStyleTabTabbarRendered', this, false);

		// for TotalToolbar + Tree Style Tab on Firefox 4.0 or later
		var menu = document.getElementById('tt-toolbar-properties');
		if (menu) menu.removeEventListener('command', this, false);

		this.prefs.removePrefListener(this);

		this.endResize();
	},

	handleEvent : function(aEvent)
	{
		switch (aEvent.type)
		{
			case 'DOMContentLoaded':
				this.init();
				return;

			case 'load':
				this.initWithDelay();
				return;

			case 'unload':
				this.destroy();
				return;

			case 'command':
				// for Total Toolbar
			case 'resize':
				// for Tree Style Tab on Firefox 4.0 or later
				window.setTimeout(function(aSelf) {
					aSelf.updateSize();
				}, 0, this);
			case 'nsDOMTreeStyleTabTabbarRendered':
				this.updateSize();
				return;

			case 'nsDOMTreeStyleTabTabbarPositionChanged':
				this.updateStyle();
				return;

			case 'DOMAttrModified':
				if (
					aEvent.attrName == 'hidden' ||
					aEvent.attrName == 'collapsed' ||
					(!this.sidebarHidden && aEvent.attrName == 'sidebarcommand')
					)
					this.updateStyle();
				return;

			case 'mousedown':
				this.onMouseDown(aEvent);
				return;

			case 'mouseup':
				this.endResize();
				return;

			case 'mousemove':
				this.onMouseMove(aEvent);
				return;
		}
	},

	onMouseDown : function(aEvent)
	{
		if (this.isVertical(gBrowser))
			this.beginResize(aEvent);
	},

	onMouseMove : function(aEvent)
	{
		var sidebarBox = this.sidebarBox.boxObject;
		this.height = sidebarBox.screenY + sidebarBox.height - aEvent.screenY + this.resizingOffsetY;
		this.prefs.setPref(this.PREF_HEIGHT, this.height);
		this.updateSize();
	},


	domains : [
		'verttabbar.', // VertTabbar https://addons.mozilla.org/firefox/addon/8045
		'extensions.tabkit.', // Tab Kit https://addons.mozilla.org/firefox/addon/5447
		'extensions.tabutils.' // Tab Utilities https://addons.mozilla.org/firefox/addon/tab-utilities/
	],
	observe : function(aSubject, aTopic, aPrefName)
	{
		if (aTopic != 'nsPref:changed') return;

		switch (aPrefName)
		{
			case 'verttabbar.position':
			case 'extensions.tabkit.tabbarPosition':
			case 'extensions.tabutils.tabBarPosition':
				this.updateStyle();
				return;

			case 'extensions.tabkit.sidebarPosition': // top/bottom sidebar breaks the flexibility.
				if (this.prefs.getPref(aPrefName) != 1 ||
					this.prefs.getPref(aPrefName) != 2) {
					this.prefs.setPref(aPrefName, 1);
				}
				return;

			default:
				return;
		}
	},


	isVertical : function(aTabBrowser)
	{
		var box = document.getAnonymousElementByAttribute(aTabBrowser.tabContainer, 'class', 'tabs-frame') || // Tab Mix Plus
				aTabBrowser.tabContainer.mTabstrip ||
				aTabBrowser.tabContainer;
		return (box.getAttribute('orient') || window.getComputedStyle(box, '').getPropertyValue('-moz-box-orient')) == 'vertical';
	},

	beginResize : function(aEvent)
	{
		if (this.resizing) return;
		this.resizing = true;
		this.resizingOffsetY = aEvent.screenY - this.sidebarHeader.boxObject.screenY;
		window.addEventListener('mouseup', this, false);
		window.addEventListener('mousemove', this, false);
	},

	endResize : function()
	{
		if (!this.resizing) return;
		this.resizing = false;
		window.removeEventListener('mouseup', this, false);
		window.removeEventListener('mousemove', this, false);
	},

	updateStyle : function()
	{
		var sidebarBox = this.sidebarBox;
		var sidebarFrame = this.sidebarFrame;
		if (this.isVertical(gBrowser)) {
			if (!this.sizeBackup) {
				this.sizeBackup = {
					box : this.sizeBackupTargets.map(function(aTarget) {
						var style     = sidebarBox.style;
						var value     = style[aTarget.name] || '';
						var important = style.getPropertyPriority(aTarget.CSSName);
						style.setProperty(aTarget.CSSName, aTarget.default, 'important');
						return {
							value     : value,
							important : important
						};
					}),
					frame : this.sizeBackupTargets.map(function(aTarget) {
						var style     = sidebarFrame.style;
						var value     = style[aTarget.name] || '';
						var important = style.getPropertyPriority(aTarget.CSSName);
						style.setProperty(aTarget.CSSName, aTarget.default, 'important');
						return {
							value     : value,
							important : important
						};
					})
				};
			}
			sidebarBox.removeAttribute('width');
			sidebarBox.style.position = 'fixed';
			sidebarBox.style.mozBoxOrient = 'vertical';
			this.sidebarHeader.style.cursor = this.sidebarTitle.style.cursor = this.sidebarThrobber.style.cursor = 's-resize';
			this.sidebarSplitter.style.display = 'none';
			this.sidebarSplitter.nextSibling.removeAttribute('width');
			sidebarBox.setAttribute('unifiedsidebar-unified', true);
		}
		else {
			if (this.sizeBackup) {
				this.sizeBackup.box.forEach(function(aValue, aIndex) {
					sidebarBox.style.setProperty(
						this.sizeBackupTargets[aIndex].CSSName,
						aValue.value,
						aValue.important ? 'important' : ''
					);
				}, this);
				this.sizeBackup.frame.forEach(function(aValue, aIndex) {
					sidebarFrame.style.setProperty(
						this.sizeBackupTargets[aIndex].CSSName,
						aValue.value,
						aValue.important ? 'important' : ''
					);
				}, this);
				this.sizeBackup = null;
			}
			sidebarBox.style.position = '';
			sidebarBox.style.mozBoxOrient = '';
			this.sidebarHeader.style.cursor = this.sidebarTitle.style.cursor = this.sidebarThrobber.style.cursor = '';

			this.sidebarSplitter.style.display = '';
			sidebarBox.removeAttribute('unifiedsidebar-unified');
		}
		this.updateSize();
	},

	updateSize : function()
	{
		var header = this.sidebarHeader;
		var sidebar = this.sidebarFrame;
		var sidebarBox = this.sidebarBox;

		var rootBox = document.documentElement.boxObject;
		var browserBox = (
						document.getElementById('verticaltabs-box') ||  // Vertical Tabs ( https://addons.mozilla.org/firefox/addon/108862/ )
						('tabutils' in window) // Tab Utilities https://addons.mozilla.org/firefox/addon/tab-utilities/
					) ?
							document.getElementById('browser').boxObject :
							gBrowser.boxObject ;
		var strip = this.getTabStrip(gBrowser);
		var isFloating = window.getComputedStyle(strip, '').getPropertyValue('position') != 'static'

		if (this.isVertical(gBrowser) && !this.sidebarHidden) {
			sidebarBox.style.bottom = (rootBox.height - (browserBox.screenY - rootBox.screenY) - browserBox.height)+'px';

			let tabbarBox = gBrowser.tabContainer.boxObject;
			let tabpanelsBox = gBrowser.mPanelContainer.boxObject;
			if (tabbarBox.screenX <= tabpanelsBox.screenX) {
				sidebarBox.style.left = (browserBox.screenX - rootBox.screenX)+'px';
				sidebarBox.style.right = 'auto';
			}
			else {
				sidebarBox.style.left = 'auto';
				sidebarBox.style.right = (rootBox.width - (browserBox.screenX - rootBox.screenX) - browserBox.width)+'px';
			}

			let width = gBrowser.tabContainer.boxObject.width+'px';
			sidebarBox.style.width = width;

			let height = this.height < 0 ? parseInt(browserBox.height / 2) : this.height ;
			let offset = parseInt(sidebarBox.style.bottom.replace('px', ''));

			strip.style.marginBottom = height+'px';
			if (isFloating) { // Tree Style Tab
				let tabbarHeight = browserBox.height - height;
				strip.style.height = (strip.height = tabbarHeight)+'px';
				if (strip.treeStyleTabToolbarInnerBox)
					strip.treeStyleTabToolbarInnerBox.height = tabbarHeight;
				else
					gBrowser.tabContainer.height = tabbarHeight;
			}

			sidebarBox.style.height = height+'px';
			for (let aItem of sidebarBox.childNodes)
			{
				if (aItem != sidebar)
					height -= aItem.boxObject.height;
			}
			sidebar.style.height = height+'px';
		}
		else {
			sidebarBox.style.bottom = '';
			sidebarBox.style.left = '';

			sidebarBox.style.width = '';

			strip.style.marginBottom = '';
			if (isFloating && this.isVertical(gBrowser)) { // Tree Style Tab
				let tabbarHeight = browserBox.height;
				strip.style.height = (strip.height = tabbarHeight)+'px';
				if (strip.treeStyleTabToolbarInnerBox)
					strip.treeStyleTabToolbarInnerBox.height = tabbarHeight;
				else
					gBrowser.tabContainer.removeAttribute('height');
			}

			sidebarBox.style.height = '';
			sidebar.style.height = '';
		}
	}
};
(function() {
	var namespace = {};
	Components.utils.import('resource://unifiedsidebar-modules/prefs.js', namespace);
	UnifiedSidebarForVerticalTabbar.prefs = namespace.prefs;
})();

window.addEventListener('DOMContentLoaded', UnifiedSidebarForVerticalTabbar, false);
