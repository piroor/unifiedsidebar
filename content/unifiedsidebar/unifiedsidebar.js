var UnifiedSidebarForVerticalTabbar = {
	resizing : false,
	resizingOffsetY : -1,
	height : -1,

	sizeBackup : null,
	sizeBackupTargets : [
		{ name : 'width',     default : '' },
		{ name : 'minWidth',  default : '0' },
		{ name : 'maxWidth',  default : 'none' },
		{ name : 'height',    default : '' },
		{ name : 'minHeight', default : '0' },
		{ name : 'maxHeight', default : 'none' }
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
		window.addEventListener('TreeStyleTabAutoHideStateChange', this, false);
		window.addEventListener('TreeStyleTabTabbarPositionChanged', this, false);
		this.sidebarBox.addEventListener('DOMAttrModified', this, false);
		this.sidebarHeader.addEventListener('mousedown', this, false);
		this.addPrefListener(this);

		this.height = this.getPref(this.PREF_HEIGHT);
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
		window.removeEventListener('TreeStyleTabAutoHideStateChange', this, false);
		window.removeEventListener('TreeStyleTabTabbarPositionChanged', this, false);
		this.sidebarBox.removeEventListener('DOMAttrModified', this, false);
		this.sidebarHeader.removeEventListener('mousedown', this, false);
		this.removePrefListener(this);

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

			case 'resize':
			case 'TreeStyleTabAutoHideStateChange':
				this.updateSize();
				return;

			case 'TreeStyleTabTabbarPositionChanged':
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
		this.setPref(this.PREF_HEIGHT, this.height);
		this.updateSize();
	},


	domains : [
		'verttabbar.', // VertTabbar https://addons.mozilla.org/firefox/addon/8045
		'extensions.tabkit.' // Tab Kit https://addons.mozilla.org/firefox/addon/5447
	],
	observe : function(aSubject, aTopic, aPrefName)
	{
		if (aTopic != 'nsPref:changed') return;

		switch (aPrefName)
		{
			case 'verttabbar.position':
			case 'extensions.tabkit.tabbarPosition':
				this.updateStyle();
				return;

			case 'extensions.tabkit.sidebarPosition': // top/bottom sidebar breaks the flexibility.
				if (this.getPref(aPrefName) != 1 || this.getPref(aPrefName) != 2) {
					this.setPref(aPrefName, 1);
				}
				return;

			default:
				return;
		}
	},


	isVertical : function(aTabBrowser)
	{
		var box = document.getAnonymousElementByAttribute(aTabBrowser.mTabContainer, 'class', 'tabs-frame') || // Tab Mix Plus
				aTabBrowser.mTabContainer.mTabstrip ||
				aTabBrowser.mTabContainer;
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
						var value = sidebarBox.style[aTarget.name] || '';
						sidebarBox.style[aTarget.name] = aTarget.default;
						return value;
					}),
					frame : this.sizeBackupTargets.map(function(aTarget) {
						var value = sidebarFrame.style[aTarget.name] || '';
						sidebarFrame.style[aTarget.name] = aTarget.default;
						return value;
					})
				};
			}
			sidebarBox.removeAttribute('width');
			sidebarBox.style.position = 'fixed';
			sidebarBox.style.mozBoxOrient = 'vertical';
			this.sidebarHeader.style.cursor = this.sidebarTitle.style.cursor = this.sidebarThrobber.style.cursor = 's-resize';
			this.sidebarSplitter.style.display = 'none';
			this.sidebarSplitter.nextSibling.removeAttribute('width');
		}
		else {
			if (this.sizeBackup) {
				this.sizeBackup.box.forEach(function(aValue, aIndex) {
					sidebarBox.style[this.sizeBackupTargets[aIndex].name] = aValue;
				}, this);
				this.sizeBackup.frame.forEach(function(aValue, aIndex) {
					sidebarFrame.style[this.sizeBackupTargets[aIndex].name] = aValue;
				}, this);
				this.sizeBackup = null;
			}
			sidebarBox.style.position = '';
			sidebarBox.style.mozBoxOrient = '';
			this.sidebarHeader.style.cursor = this.sidebarTitle.style.cursor = this.sidebarThrobber.style.cursor = '';
			this.sidebarSplitter.style.display = '';
		}
		this.updateSize();
	},

	updateSize : function()
	{
		var header = this.sidebarHeader;
		var sidebar = this.sidebarFrame;
		var sidebarBox = this.sidebarBox;

		var rootBox = document.documentElement.boxObject;
		var browserBox = gBrowser.boxObject;
		var strip = this.getTabStrip(gBrowser);
		var isFloating = window.getComputedStyle(strip, '').getPropertyValue('position') != 'static'

		if (this.isVertical(gBrowser) && !this.sidebarHidden) {

			sidebarBox.style.bottom = (rootBox.height - (browserBox.screenY - rootBox.screenY) - browserBox.height)+'px';

			let tabbarBox = gBrowser.mTabContainer.boxObject;
			let tabpanelsBox = gBrowser.mPanelContainer.boxObject;
			if (tabbarBox.screenX <= tabpanelsBox.screenX) {
				sidebarBox.style.left = (browserBox.screenX - rootBox.screenX)+'px';
				sidebarBox.style.right = 'auto';
			}
			else {
				sidebarBox.style.left = 'auto';
				sidebarBox.style.right = (rootBox.width - (browserBox.screenX - rootBox.screenX) - browserBox.width)+'px';
			}

			let width = gBrowser.mTabContainer.boxObject.width+'px';
			header.style.width = sidebar.style.width = sidebarBox.style.width = width;

			let height = this.height < 0 ? parseInt(browserBox.height / 2) : this.height ;
			let offset = parseInt(sidebarBox.style.bottom.replace('px', ''));

			strip.style.marginBottom = height+'px';
			if (isFloating) {
				let tabbarHeight = browserBox.height - height;
				strip.height = tabbarHeight+'px';
				gBrowser.tabContainer.height = tabbarHeight+'px';
			}

			sidebarBox.style.height = height+'px';
			sidebar.style.height = (height - header.boxObject.height)+'px';
		}
		else {
			sidebarBox.style.bottom = '';
			sidebarBox.style.left = '';

			header.style.width = sidebar.style.width = sidebarBox.style.width = '';

			strip.style.marginBottom = '';
			if (isFloating) {
				let tabbarHeight = browserBox.height;
				strip.height = tabbarHeight+'px';
				gBrowser.tabContainer.height = tabbarHeight+'px';
			}

			sidebarBox.style.height = '';
			sidebar.style.height = '';
		}
	}
};
UnifiedSidebarForVerticalTabbar.__proto__ = window['piro.sakura.ne.jp'].prefs;

window.addEventListener('DOMContentLoaded', UnifiedSidebarForVerticalTabbar, false);
