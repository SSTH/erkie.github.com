(function() {
function Asteroids() 
{
	if ( ! window.ASTEROIDS )
	{
		window.ASTEROIDS = {enemiesKilled: 0, currentLives: 3, currentScore: 0, highscore: 0, currentCombo: 1};
		
		if(('localStorage' in window) && window['localStorage'] !== null)
		{
			if(isNaN(localStorage[document.URL]))
			{
				window.ASTEROIDS.highscore = 0;
			}
			else
			{
				window.ASTEROIDS.highscore = parseInt(localStorage[document.URL]);
			}
		}
	}
		
	/*****************************************
	CLASS DECLARATIONS
	*****************************************/
	// Vector class.
	function Vector(x, y) {
		if ( typeof x == 'Object' ) {
			this.x = x.x;
			this.y = x.y;
		} else {
			this.x = x;
			this.y = y;
		}
	};
	Vector.prototype = {
		cp: function() {
			return new Vector(this.x, this.y);
		},
		
		mul: function(factor) {
			this.x *= factor;
			this.y *= factor;
			return this;
		},
		
		mulNew: function(factor) {
			return new Vector(this.x * factor, this.y * factor);
		},
		
		add: function(vec) {
			this.x += vec.x;
			this.y += vec.y;
			return this;
		},
		
		addNew: function(vec) {
			return new Vector(this.x + vec.x, this.y + vec.y);
		},
		
		sub: function(vec) {
			this.x -= vec.x;
			this.y -= vec.y;
			return this;
		},
		
		subNew: function(vec) {
			return new Vector(this.x - vec.x, this.y - vec.y);
		},
		
		// angle in radians
		rotate: function(angle) {
			var x = this.x, y = this.y;
			this.x = x * Math.cos(angle) - Math.sin(angle) * y;
			this.y = x * Math.sin(angle) + Math.cos(angle) * y;
			return this;
		},
		
		// angle still in radians
		rotateNew: function(angle) {
			return this.cp().rotate(angle);
		},
		
		// angle in radians... again
		setAngle: function(angle) {
			var l = this.len();
			this.x = Math.cos(angle) * l;
			this.y = Math.sin(angle) * l;
			return this;
		},
		
		// RADIANS
		setAngleNew: function(angle) {
			return this.cp().setAngle(angle);
		},
		
		setLength: function(length) {
			var l = this.len();
			if ( l ) this.mul(length / l);
			else this.x = this.y = length;
			return this;
		},
		
		setLengthNew: function(length) {
			return this.cp().setLength(length);
		},
		
		normalize: function() {
			var l = this.len();
			this.x /= l;
			this.y /= l;
			return this;
		},
		
		normalizeNew: function() {
			return this.cp().normalize();
		},
		
		angle: function() {
			return Math.atan2(this.y, this.x);
		},
		
		collidesWith: function(rect) {
			return this.x > rect.x && this.y > rect.y && this.x < rect.x + rect.width && this.y < rect.y + rect.height;
		},
		
		len: function() {
			var l = Math.sqrt(this.x * this.x + this.y * this.y);
			if ( l < 0.005 && l > -0.005) return 0;
			return l;
		},
		
		is: function(test) {
		
			return typeof test == 'object' && this.x == test.x && this.y == test.y;
		},
		
		toString: function() {
			return '[Vector(' + this.x + ', ' + this.y + ') angle: ' + this.angle() + ', length: ' + this.len() + ']';
		}
	};
	
	// Line class.
	function Line(p1, p2) {
		this.p1 = p1;
		this.p2 = p2;
	};	
	Line.prototype = {
		shift: function(pos) {
			this.p1.add(pos);
			this.p2.add(pos);
		},
		
		intersectsWithRect: function(rect) {
			var LL = new Vector(rect.x, rect.y + rect.height);
			var UL = new Vector(rect.x, rect.y);
			var LR = new Vector(rect.x + rect.width, rect.y + rect.height);
			var UR = new Vector(rect.x + rect.width, rect.y);
			
			if (
				this.p1.x > LL.x && this.p1.x < UR.x && this.p1.y < LL.y && this.p1.y > UR.y &&
				this.p2.x > LL.x && this.p2.x < UR.x && this.p2.y < LL.y && this.p2.y > UR.y
			) return true;

			if ( this.intersectsLine(new Line(UL, LL)) ) return true;
			if ( this.intersectsLine(new Line(LL, LR)) ) return true;
			if ( this.intersectsLine(new Line(UL, UR)) ) return true;
			if ( this.intersectsLine(new Line(UR, LR)) ) return true;
			return false;
		},
		
		intersectsLine: function(line2) {
			var v1 = this.p1, v2 = this.p2;
			var v3 = line2.p1, v4 = line2.p2;
			
			var denom = ((v4.y - v3.y) * (v2.x - v1.x)) - ((v4.x - v3.x) * (v2.y - v1.y));
			var numerator = ((v4.x - v3.x) * (v1.y - v3.y)) - ((v4.y - v3.y) * (v1.x - v3.x));
		
			var numerator2 = ((v2.x - v1.x) * (v1.y - v3.y)) - ((v2.y - v1.y) * (v1.x - v3.x));
			
			if ( denom == 0.0 ) {
				return false;
			}
			var ua = numerator / denom;
			var ub = numerator2 / denom;
			
			return (ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0);
		}
	};
	
	/**********************************************************************************/
	
	/*****************************************
	VAR DECLARATIONS
	*****************************************/
	
	var that = this;
	
	var isIE = !!window.ActiveXObject; // IE gets less performance-intensive
	var isIEQuirks = isIE && document.compatMode == "BackCompat";
	
	// configuration directives are placed in local variables
	var w = document.documentElement.clientWidth, h = document.documentElement.clientHeight;
	if ( isIEQuirks ) { w = document.body.clientWidth; h = document.body.clientHeight;}
	
	var playerWidth = 20, playerHeight = 30;
	
	var playerVerts = [[-1 * playerHeight/2, -1 * playerWidth/2], [-1 * playerHeight/2, playerWidth/2], [playerHeight/2, 0]];
	
	var ignoredTypes = ['HTML', 'HEAD', 'BODY', 'SCRIPT', 'TITLE', 'META', 'STYLE', 'LINK'];
	if ( window.ActiveXObject )
		ignoredTypes = ['HTML', 'HEAD', 'BODY', 'SCRIPT', 'TITLE', 'META', 'STYLE', 'LINK', 'SHAPE', 'LINE', 'GROUP', 'IMAGE', 'STROKE', 'FILL', 'SKEW', 'PATH', 'TEXTPATH', 'INS']; // Half of these are for IE g_vml
	var hiddenTypes = ['BR', 'HR'];
	
	var FPS = 50;
	
	// units/second
	var acc			  = 300;
	var maxSpeed	  = 600;
	var rotSpeed	  = 360; // one rotation per second
	var bulletSpeed	  = 700;
	var particleSpeed = 400;
	
	var timeBetweenFire = 150; // how many milliseconds between shots
	var timeBetweenBlink = 250; // milliseconds between enemy blink
	var timeBetweenEnemyUpdate = isIE ? 10000 : 2000;
	var bulletRadius = 2;
	var maxParticles = isIE ? 20 : 40;
	var maxBullets = isIE ? 10 : 20;
	
	// Current Timer until gameover.
	var currentTime = 60;
	
	// If ship is currently in a combo.
	var currentCombo = 1;
	var currentScore = 0;
	var inCombo = false;
	
	var currentLives = 3;
	
	var backColor = new Array(); // don't change this

	// Enter the colors you wish to use.  Follow the
	// pattern to use more colors.  The number in the
	// brackets [] is the number you will use in the
	// function call to pick each color.

	backColor[0] = '#000000';
	backColor[1] = '#00FF00';
	backColor[2] = '#0000FF';
	backColor[3] = '#FFFFFF';

	/**********************************************************************************/
	
	// Flames generated every 10 ms.
	this.flame = {r: [], y: []};
	
	// blink style
	this.toggleBlinkStyle = function () 
	{
		if (this.updated.blink.isActive) 
		{
			//removeClass(document.body, 'ASTEROIDSBLINK');
		} else 
		{
			addClass(document.body, 'ASTEROIDSBLINK');
		}

		this.updated.blink.isActive = !this.updated.blink.isActive;
	};

	addStylesheet(".ASTEROIDSBLINK .ASTEROIDSYEAHENEMY", "outline: 2px dotted red;");
	
	this.pos = new Vector(100, 100);
	this.lastPos = false;
	this.vel = new Vector(0, 0);
	this.dir = new Vector(0, 1);
	this.keysPressed = {};
	this.firedAt = false;
	this.updated = 
	{
		enemies: false, // if the enemy index has been updated since the user pressed B for Blink
		flame: new Date().getTime(), // the time the flame was last updated
		blink: {time: 0, isActive: false}
	};
	
	this.scrollPos = new Vector(0, 0);
	
	this.bullets = [];
	
	// Enemies lay first in this.enemies, when they are shot they are moved to this.dying
	this.enemies = [];
	this.dying = [];
	this.totalEnemies = 0;
	
	// Particles are created when something is shot
	this.particles = [];
	
	this.velocities = [];
	
	// things to shoot is everything textual and an element of type not specified in types AND not a navigation element (see further down)
	// NOTE: Edit later to change formatting of the enemies (size, movement type, etc.)
	function updateEnemyIndex() 
	{
	// Remove enemies that belong to the game that might have been added to the enemy list.
		for ( var i = 0, enemy; enemy = that.enemies[i]; i++ )
			removeClass(enemy, "ASTEROIDSYEAHENEMY");
			
		var all = document.body.getElementsByTagName('*');
		that.enemies = [];
		
		for ( var i = 0, el; el = all[i]; i++ ) 
		{
			// elements with className ASTEROIDSYEAH are part of the "game"
			if ( indexOf(ignoredTypes, el.tagName.toUpperCase()) == -1 && el.prefix != 'g_vml_' 
			&& hasOnlyTextualChildren(el) && el.className != "ASTEROIDSYEAH" && el.offsetHeight > 0 ) 
			{
				el.aSize = size(el);
				that.enemies.push(el);
				
				//generate a random velocity
				that.velocities.push({
					// random direction
					dir: (new Vector(Math.random() * 200 - 10, Math.random() * 200 - 10)).normalize()
				});
				
				addClass(el, "ASTEROIDSYEAHENEMY");
				
				// this is only for enemycounting
				if ( ! el.aAdded ) 
				{
					el.aAdded = true;
					that.totalEnemies++;
				}
			}
		}
	};
	
	updateEnemyIndex();
	
	// createFlames create the vectors for the flames of the ship
	var createFlames;
	// Create flames function.
	(function () 
	{
		var rWidth = playerWidth,
			rIncrease = playerWidth * 0.1,
			yWidth = playerWidth * 0.6,
			yIncrease = yWidth * 0.2,
			halfR = rWidth / 2,
			halfY = yWidth / 2,
			halfPlayerHeight = playerHeight / 2;

		createFlames = function () 
		{
			// Firstly create red flames
			that.flame.r = [[-1 * halfPlayerHeight, -1 * halfR]];
			that.flame.y = [[-1 * halfPlayerHeight, -1 * halfY]];

			for ( var x = 0; x < rWidth; x += rIncrease ) {
				that.flame.r.push([-random(2, 7) - halfPlayerHeight, x - halfR]);
			}

			that.flame.r.push([-1 * halfPlayerHeight, halfR]);
			
			// ... And now the yellow flames
			for ( var x = 0; x < yWidth; x += yIncrease ) {
				that.flame.y.push([-random(2, 7) - halfPlayerHeight, x - halfY]);
			}

			that.flame.y.push([-1 * halfPlayerHeight, halfY]);
		};
	}
	)();
	
	createFlames();
	
	/*
		Math operations
	*/
	
	function radians(deg) {
		return deg * 0.0174532925;
	};	
	function degrees(rad) {
		return rad * 57.2957795;
	};	
	function random(from, to) {
		return Math.floor(Math.random() * (to + 1) + from);
	};
	
	/*
		Misc operations
	*/
	
	// Find keystroke code.
	function code(name) {
		var table = {'up': 38, 'down': 40, 'left': 37, 'right': 39, 'esc': 27};
		if ( table[name] ) return table[name];
		return name.charCodeAt(0);
	};
	
	// Check if a vector is within bounds.
	function boundsCheck(vec) {
		if ( vec.x > w )
			vec.x = 0;
		else if ( vec.x < 0 )
			vec.x = w;
		
		if ( vec.y > h )
			vec.y = 0;
		else if ( vec.y < 0 )
			vec.y = h;	
	};
	
	// Check the size of the element.
	function size(element) {
		var el = element, left = 0, top = 0;
		do {
			left += el.offsetLeft || 0;
			top += el.offsetTop || 0;
			el = el.offsetParent;
		} while (el);
		return {x: left, y: top, width: element.offsetWidth || 10, height: element.offsetHeight || 10};
	};
	
	// Taken from:
	// http://www.quirksmode.org/blog/archives/2005/10/_and_the_winner_1.html
	function addEvent( obj, type, fn ) {
		if (obj.addEventListener)
			obj.addEventListener( type, fn, false );
		else if (obj.attachEvent) {
			obj["e"+type+fn] = fn;
			obj[type+fn] = function() { obj["e"+type+fn]( window.event ); }
			obj.attachEvent( "on"+type, obj[type+fn] );
		}
	}

	function removeEvent( obj, type, fn ) {
		if (obj.removeEventListener)
			obj.removeEventListener( type, fn, false );
		else if (obj.detachEvent) {
			obj.detachEvent( "on"+type, obj[type+fn] );
			obj[type+fn] = null;
			obj["e"+type+fn] = null;
		}
	}
	
	function arrayRemove(array, from, to) {
		var rest = array.slice((to || from) + 1 || array.length);
		array.length = from < 0 ? array.length + from : from;
		return array.push.apply(array, rest);
	};
	
	function applyVisibility(vis) {
		for ( var i = 0, p; p = window.ASTEROIDSPLAYERS[i]; i++ ) {
			p.gameContainer.style.visibility = vis;
		}
	}
	
	function changeBackground(whichColor){
		document.bgColor = backColor[whichColor-1];
	};
	
	// Find a specific element within an X and a Y
	function getElementFromPoint(x, y) {
		// hide canvas so it isn't picked up
		applyVisibility('hidden');

		var element = document.elementFromPoint(x, y);

		if ( ! element ) {
			applyVisibility('visible');
			return false;
		}

		if ( element.nodeType == 3 )
			element = element.parentNode;

		// show the canvas again, hopefully it didn't blink
		applyVisibility('visible');
		return element;
	};
	
	// Overlapping function.
	function isOverlapping(elm1, elm2) {
	  var pos_elm1 = AJS.absolutePosition(elm1);
	  var pos_elm2 = AJS.absolutePosition(elm2);
	  var top1 = pos_elm1.y;
	  var left1 = pos_elm1.x;
	  var right1 = left1 + elm1.offsetWidth;
	  var bottom1 = top1 + elm1.offsetHeight;
	  var top2 = pos_elm2.y;
	  var left2 = pos_elm2.x;
	  var right2 = left2 + elm2.offsetWidth;
	  var bottom2 = top2 + elm2.offsetHeight;
	 
	  var getSign = function(v) 
	  {
		if(v > 0) return "+";
		else if(v < 0) return "-";
		else return 0;
	  }

	  if ((getSign(top1 - bottom2) != getSign(bottom1 - top2)) &&
		  (getSign(left1 - right2) != getSign(right1 - left2)))
		return true; 
	  return false;
	}
	
	// Add particles at a loaction
	function addParticles(startPos) {
		var time = new Date().getTime();
		var amount = maxParticles;
		for ( var i = 0; i < amount; i++ ) 
		{
			that.particles.push({
				// random direction
				dir: (new Vector(Math.random() * 20 - 10, Math.random() * 20 - 10)).normalize(),
				pos: startPos.cp(),
				cameAlive: time
			});
		}
	};
	
	// Calculate score.
	function setScore() {
		that.lives.innerHTML = "Lives: " + window.ASTEROIDS.currentLives;
		that.highscore.innerHTML = "High Score: " + window.ASTEROIDS.highscore;
		that.combo.innerHTML = "Current Combo: " + window.ASTEROIDS.currentCombo;
		that.points.innerHTML = "Score: " + window.ASTEROIDS.currentScore;
		
		if(('localStorage' in window) && window['localStorage'] !== null)
		{
			if(window.ASTEROIDS.currentScore > window.ASTEROIDS.highscore)
			{
				window.ASTEROIDS.highscore = window.ASTEROIDS.currentScore;
				localStorage[document.URL] = window.ASTEROIDS.currentScore;
			}
		}
	};
	
	// Check if an element is a contexual element such as an image or header or such
	function hasOnlyTextualChildren(element) {
		if ( element.offsetLeft < -100 && element.offsetWidth > 0 && element.offsetHeight > 0 ) return false;
		if ( indexOf(hiddenTypes, element.tagName) != -1 ) return true;
		
		if ( element.offsetWidth == 0 && element.offsetHeight == 0 ) return false;
		for ( var i = 0; i < element.childNodes.length; i++ ) 
		{
			// <br /> doesn't count... and empty elements
			if (indexOf(hiddenTypes, element.childNodes[i].tagName) == -1
				&& element.childNodes[i].childNodes.length != 0) 
				return false;
		}
		return true;
	};
	
	// Return index of item from an array.
	function indexOf(arr, item, from){
		if ( arr.indexOf ) return arr.indexOf(item, from);
		var len = arr.length;
		for (var i = (from < 0) ? Math.max(0, len + from) : from || 0; i < len; i++){
			if (arr[i] === item) return i;
		}
		return -1;
	};
	
	// taken from MooTools Core
	function addClass(element, className) {
		if ( element.className.indexOf(className) == -1)
			element.className = (element.className + ' ' + className).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
	};
	
	// taken from MooTools Core
	function removeClass(element, className) {
		element.className = element.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1');
	};
	
	// Add style sheet, edit here for additional graphical methods.
	function addStylesheet(selector, rules) {
		var stylesheet = document.createElement('style');
		stylesheet.type = 'text/css';
		stylesheet.rel = 'stylesheet';
		stylesheet.id = 'ASTEROIDSYEAHSTYLES';
		try 
		{
			stylesheet.innerHTML = selector + "{" + rules + "}";
		} 
		catch ( e ) 
		{
			stylesheet.styleSheet.addRule(selector, rules);
		}
		document.getElementsByTagName("head")[0].appendChild(stylesheet);
	};
	
	function removeStylesheet(name) {
		var stylesheet = document.getElementById(name);
		if ( stylesheet ) 
		{
			stylesheet.parentNode.removeChild(stylesheet);
		}
	};
	
	/*****************************************
	GAME INIT
	*****************************************/
	
	this.gameContainer = document.createElement('div');
	this.gameContainer.className = 'ASTEROIDSYEAH';
	document.body.appendChild(this.gameContainer);
	
	this.canvas = document.createElement('canvas');
	this.canvas.setAttribute('width', w);
	this.canvas.setAttribute('height', h);
	this.canvas.className = 'ASTEROIDSYEAH';
	with ( this.canvas.style )
	{
		width = w + "px";
		height = h + "px";
		position = "fixed";
		top = "0px";
		left = "0px";
		bottom = "0px";
		right = "0px";
		zIndex = "10000";
	}
	
	// Is IE
	if ( typeof G_vmlCanvasManager != 'undefined' ) {
		this.canvas = G_vmlCanvasManager.initElement(this.canvas);
		if ( ! this.canvas.getContext ) {
			alert("So... you're using IE?  Please join me at http://github.com/erkie/erkie.github.com if you think you can help");
		}
	} else {
		if ( ! this.canvas.getContext ) {
			alert('This program does not yet support your browser. Please join me at http://github.com/erkie/erkie.github.com if you think you can help');
		}
	}
	
	// Add the mouse down function.
	addEvent(this.canvas, 'mousedown', function(e) {
		e = e || window.event;
		var message = document.createElement('span');
		message.style.position = 'absolute';
		message.style.border = '1px solid #999';
		message.style.background = 'white';
		message.style.color = "black";
		message.innerHTML = 'Press Esc to Quit.';
		
		document.body.appendChild(message);
		
		var x = e.pageX || (e.clientX + document.documentElement.scrollLeft);
		var y = e.pageY || (e.clientY + document.documentElement.scrollTop);
		message.style.left = x - message.offsetWidth/2 + 'px';
		message.style.top = y - message.offsetHeight/2 + 'px';
		
		setTimeout(function() {
			try {
				message.parentNode.removeChild(message);
			} catch ( e ) {}
		}, 1000);
	});
	
	// When window is resized, adjust the canvas.
	var eventResize = function() {
		if ( ! isIE ) {
			that.canvas.style.display = "none";
			
			w = document.documentElement.clientWidth;
			h = document.documentElement.clientHeight;
			
			that.canvas.setAttribute('width', w);
			that.canvas.setAttribute('height', h);
			
			with ( that.canvas.style ) {
				display = "block";
				width = w + "px";
				height = h + "px";
			}
		} 
		else 
		{
			w = document.documentElement.clientWidth;
			h = document.documentElement.clientHeight;
			
			if ( isIEQuirks ) {
				w = document.body.clientWidth;
				h = document.body.clientHeight;
			}
			
			that.canvas.setAttribute('width', w);
			that.canvas.setAttribute('height', h);
		}
	};
	addEvent(window, 'resize', eventResize);
	
	this.gameContainer.appendChild(this.canvas);
	this.ctx = this.canvas.getContext("2d");
	
	if(document.bgColor == backColor[0])
	{
		this.ctx.fillStyle = "white";
		this.ctx.strokeStyle = "white";
	}
	else
	{
		this.ctx.fillStyle = "black";
		this.ctx.strokeStyle = "black";
	}
	
	// navigation wrapper element
	// Create Document properties.
	if ( ! document.getElementById('ASTEROIDS-NAVIGATION') ) {
		this.navigation = document.createElement('div');
		this.navigation.id = "ASTEROIDS-NAVIGATION";
		this.navigation.className = "ASTEROIDSYEAH";
		with ( this.navigation.style ) {
			fontFamily = "Arial,sans-serif";
			position = "fixed";
			zIndex = "10001";
			bottom = "10px";
			right = "10px";
			textAlign = "right";
		}
		this.navigation.innerHTML = "(Press Esc To Quit.) ";
		
		this.gameContainer.appendChild(this.navigation);
		
		// lives
		this.lives = document.createElement('span');
		this.lives.id = 'ASTEROIDS-LIVES';
		this.lives.style.font = "28pt Arial, sans-serif";
		this.lives.style.fontWeight = "bold";
		this.lives.className = "ASTEROIDSYEAH";
		this.navigation.appendChild(this.lives);
		
		this.linebreak1 = document.createElement('br');
		this.navigation.appendChild(this.linebreak1);
		
		// highscore
		this.highscore = document.createElement('span');
		this.highscore.id = 'ASTEROIDS-HIGHSCORE';
		this.highscore.style.font = "28pt Arial, sans-serif";
		this.highscore.style.fontWeight = "bold";
		this.highscore.className = "ASTEROIDSYEAH";
		this.navigation.appendChild(this.highscore);
		
		this.linebreak3 = document.createElement('br');
		this.navigation.appendChild(this.linebreak3);
		
		// points
		this.points = document.createElement('span');
		this.points.id = 'ASTEROIDS-POINTS';
		this.points.style.font = "28pt Arial, sans-serif";
		this.points.style.fontWeight = "bold";
		this.points.className = "ASTEROIDSYEAH";
		this.navigation.appendChild(this.points);
		
		this.linebreak2 = document.createElement('br');
		this.navigation.appendChild(this.linebreak2);
		
		// combo
		this.combo = document.createElement('span');
		this.combo.id = 'ASTEROIDS-POINTS';
		this.combo.style.font = "28pt Arial, sans-serif";
		this.combo.style.fontWeight = "bold";
		this.combo.className = "ASTEROIDSYEAH";
		this.navigation.appendChild(this.combo);
	}
	else // Already created.
	{
		this.navigation = document.getElementById('ASTEROIDS-NAVIGATION');
		this.points = document.getElementById('ASTEROIDS-POINTS');
	}
	
	// Because IE quirks does not understand position: fixed we set to absolute and just reposition it everything frame
	if ( isIEQuirks ) {
		this.gameContainer.style.position =
			this.canvas.style.position =
			this.navigation.style.position 
				= "absolute";
	}
	
	setScore();
	
	// highscore link
	this.highscoreLink = document.createElement('a');
	this.highscoreLink.className = "ASTEROIDSYEAH";
	this.highscoreLink.style.display = "block";
	this.highscoreLink.href = '#';
	this.highscoreLink.innerHTML = "Reset Highscore?";
	this.navigation.appendChild(this.highscoreLink);
	
	// STUB change highscore to take from local.
	this.highscoreLink.onclick = function() 
	{
		localStorage[document.URL] = 0;
		window.ASTEROIDS.highscore = 0;
		return false;
	};
	
	// For ie
	if ( typeof G_vmlCanvasManager != 'undefined' ) {
		var children = this.canvas.getElementsByTagName('*');
		for ( var i = 0, c; c = children[i]; i++ )
			addClass(c, 'ASTEROIDSYEAH');
	}
	
	/*****************************************
	EVENT DECLARATIONS
	*****************************************/
	
	var eventKeydown = function(event) {
		event = event || window.event;
		that.keysPressed[event.keyCode] = true;
		
		switch ( event.keyCode ) {
			case code(' '):
				that.firedAt = 1;
			break;
		}
		
		// check here so we can stop propagation appropriately
		if ( indexOf([code('up'), code('down'), code('right'), code('left'), code(' '), code('B'), code('W'), code('A'), code('S'), code('D'), code('1')], event.keyCode) != -1 ) {
			if ( event.preventDefault )
				event.preventDefault();
			if ( event.stopPropagation)
				event.stopPropagation();
			event.returnValue = false;
			event.cancelBubble = true;
			return false;
		}
	};
	addEvent(document, 'keydown', eventKeydown);
	
	var eventKeypress = function(event) {
		event = event || window.event;
		if ( indexOf([code('up'), code('down'), code('right'), code('left'), code(' '), code('W'), code('A'), code('S'), code('D'), code('1')], event.keyCode || event.which) != -1 ) {
			if ( event.preventDefault )
				event.preventDefault();
			if ( event.stopPropagation )
				event.stopPropagation();
			event.returnValue = false;
			event.cancelBubble = true;
			return false;
		}
	};
	addEvent(document, 'keypress', eventKeypress);
	
	var eventKeyup = function(event) {
		event = event || window.event;
		that.keysPressed[event.keyCode] = false;

		if ( indexOf([code('up'), code('down'), code('right'), code('left'), code(' '), code('B'), code('W'), code('A'), code('S'), code('D'), code('1')], event.keyCode) != -1 ) {
			if ( event.preventDefault )
				event.preventDefault();
			if ( event.stopPropagation )
				event.stopPropagation();
			event.returnValue = false;
			event.cancelBubble = true;
			return false;
		}
	};
	addEvent(document, 'keyup', eventKeyup);
	
	/*****************************************
	CONTEXT OPERATIONS
	*****************************************/
	
	this.ctx.clear = function() {
		this.clearRect(0, 0, w, h);
	};
	
	this.ctx.clear();
	
	this.ctx.drawLine = function(xFrom, yFrom, xTo, yTo) {
		this.beginPath();
		this.moveTo(xFrom, yFrom);
		this.lineTo(xTo, yTo);
		this.lineTo(xTo + 1, yTo + 1);
		this.closePath();
		this.fill();
	};
	
	this.ctx.tracePoly = function(verts) {
		this.beginPath();
		this.moveTo(verts[0][0], verts[0][1]);
		for ( var i = 1; i < verts.length; i++ )
			this.lineTo(verts[i][0], verts[i][1]);
		this.closePath();
	};
	
	this.ctx.drawPlayer = function() {
		this.save();
		this.translate(that.pos.x, that.pos.y);
		this.rotate(that.dir.angle());
		this.tracePoly(playerVerts);
		this.fillStyle = "white";
		this.fill();
		this.tracePoly(playerVerts);
		this.stroke();
		this.restore();
	};
	
	var PI_SQ = Math.PI*2;
	
	this.ctx.drawBullets = function(bullets) 
	{
		for ( var i = 0; i < bullets.length; i++ ) 
		{
			if(document.bgColor == backColor[0])
			{
				this.fillStyle = "white";
			}
			this.beginPath();
			this.arc(bullets[i].pos.x, bullets[i].pos.y, bulletRadius, 0, PI_SQ, true);
			this.closePath();
			this.fill();
		}
	};
	
	var randomParticleColor = function() {
		return (['red', 'yellow'])[random(0, 1)];
	};
	
	this.ctx.drawParticles = function(particles) {
		var oldColor = this.fillStyle;
		
		for ( var i = 0; i < particles.length; i++ ) {
			this.fillStyle = randomParticleColor();
			this.drawLine(particles[i].pos.x, particles[i].pos.y, particles[i].pos.x - particles[i].dir.x * 10, particles[i].pos.y - particles[i].dir.y * 10);
		}
		
		this.fillStyle = oldColor;
	};
	
	this.ctx.drawFlames = function(flame) {
		this.save();
		
		this.translate(that.pos.x, that.pos.y);
		this.rotate(that.dir.angle());
		
		var oldColor = this.strokeStyle;
		this.strokeStyle = "red";
		this.tracePoly(flame.r);
		this.stroke();
		
		this.strokeStyle = "yellow";
		this.tracePoly(flame.y);
		this.stroke();
		
		this.strokeStyle = oldColor;
		this.restore();
	}
	
	/*****************************************
	UPDATE LOOP
	*****************************************/
	
	// Attempt to focus window if possible, so keyboard events are posted to us
	try {
		window.focus();
	} catch ( e ) {}
	
	addParticles(this.pos);
	addClass(document.body, 'ASTEROIDSYEAH');
	
	var isRunning = true;
	var lastUpdate = new Date().getTime();
	
	// Update Function
	this.update = function() {
		var forceChange = false;
		
		// ==
		// logic
		// ==
		var nowTime = new Date().getTime();
		var tDelta = (nowTime - lastUpdate) / 1000;
		
		// STUB countdown time by seconds.
		if(currentTime > 0 && tDelta > 0){
			currentTime--;
		}
		lastUpdate = nowTime;
		
		// update flame and timer if needed
		var drawFlame = false;
		if ( nowTime - this.updated.flame > 50 ) {
			createFlames();
			this.updated.flame = nowTime;
		}
		
		this.scrollPos.x = window.pageXOffset || document.documentElement.scrollLeft;
		this.scrollPos.y = window.pageYOffset || document.documentElement.scrollTop;
		
		// update player
		// move forward
		if ( (this.keysPressed[code('up')]) || (this.keysPressed[code('W')]) ) {
			this.vel.add(this.dir.mulNew(acc * tDelta));
			
			drawFlame = true;
		} 
		else {		
			// decrease speed of player
			this.vel.mul(0.96);
		}
		
		// rotate counter-clockwise
		if ( (this.keysPressed[code('left')]) || (this.keysPressed[code('A')]) ) {
			forceChange = true;
			this.dir.rotate(radians(rotSpeed * tDelta * -1));
		}
		
		// rotate clockwise
		if ( (this.keysPressed[code('right')]) || (this.keysPressed[code('D')]) ) {
			forceChange = true;
			this.dir.rotate(radians(rotSpeed * tDelta));
		}
		
		// fire
		if ( this.keysPressed[code(' ')] && nowTime - this.firedAt > timeBetweenFire ) 
		{
			this.bullets.unshift({
			'dir': this.dir.cp(), 
			'pos': this.pos.cp(), 
			'startVel': this.vel.cp(),
			'cameAlive': nowTime});
			
			this.firedAt = nowTime;
			
			if ( this.bullets.length > maxBullets ) 
			{
				this.bullets.pop();
			}
		}
		
		// Change color to Black.
		if ( this.keysPressed[code('1')] ) {
			changeBackground(1);

			//that.enemies = [];
			for ( var i = 0; i < this.enemies.length; i++ ) 
			{
				this.enemies[i].style.color = "white";
			}
			
			// Change color of image hues here.
		}
		
		// add blink
		if ( this.keysPressed[code('B')] ) 
		{
			if ( ! this.updated.enemies ) {
				updateEnemyIndex();
				this.updated.enemies = true;
			}
			
			forceChange = true;
			
			this.updated.blink.time += tDelta * 1000;
			if ( this.updated.blink.time > timeBetweenBlink ) {
				this.toggleBlinkStyle();
				this.updated.blink.time = 0;
			}
		} 
		else {
			this.updated.enemies = false;
		}
		
		if ( this.keysPressed[code('esc')] ) {
			destroy.apply(this);
			return;
		}
		
		// cap speed
		if ( this.vel.len() > maxSpeed ) {
			this.vel.setLength(maxSpeed);
		}
		
		// add velocity to player (physics)
		this.pos.add(this.vel.mulNew(tDelta));
		
		// check bounds X of player, if we go outside we scroll accordingly
		if ( this.pos.x > w ) {
			window.scrollTo(this.scrollPos.x + 50, this.scrollPos.y);
			this.pos.x = 0;
		} else if ( this.pos.x < 0 ) {
			window.scrollTo(this.scrollPos.x - 50, this.scrollPos.y);
			this.pos.x = w;
		}
		
		// check bounds Y
		if ( this.pos.y > h ) {
			window.scrollTo(this.scrollPos.x, this.scrollPos.y + h * 0.75);
			this.pos.y = 0;
		} else if ( this.pos.y < 0 ) {
			window.scrollTo(this.scrollPos.x, this.scrollPos.y - h * 0.75);
			this.pos.y = h;
		}
		
		// update positions of bullets
		for ( var i = this.bullets.length - 1; i >= 0; i-- ) 
		{
			// bullets should only live for 2 seconds
			if ( nowTime - this.bullets[i].cameAlive > 500 ) 
			{
				this.bullets.splice(i, 1);
				forceChange = true;
				window.ASTEROIDS.currentCombo = 1;
				continue;
			}
			
			var bulletVel = this.bullets[i].dir.setLengthNew(bulletSpeed * tDelta).add(this.bullets[i].startVel.mulNew(tDelta));
			
			this.bullets[i].pos.add(bulletVel);
			boundsCheck(this.bullets[i].pos);
			
			// check collisions
			var murdered = getElementFromPoint(this.bullets[i].pos.x, this.bullets[i].pos.y);
			
			// getElementFromPoint only gets element from point with upper right corner. We also shouldn't do an indexing search through the enemies
			// as it's already slow enough as it is!
			
			if (murdered && murdered.tagName && 
				indexOf(ignoredTypes, murdered.tagName.toUpperCase()) == -1 &&
				hasOnlyTextualChildren(murdered) && murdered.className == "ASTEROIDSYEAHENEMY") 
			{
				didKill = true;
				addParticles(this.bullets[i].pos);
				this.dying.push(murdered);
				this.bullets.splice(i, 1);
				window.ASTEROIDS.currentScore += window.ASTEROIDS.currentCombo * 10;
				window.ASTEROIDS.currentCombo++; //Increase the current combo rate.
				continue;
			}
		}
		
		// update ship collisions
		var shipHit = getElementFromPoint(this.pos.x, this.pos.y);
		if(shipHit && shipHit.tagName && indexOf(ignoredTypes, shipHit.tagName.toUpperCase()) == -1 
				&& hasOnlyTextualChildren(shipHit) && shipHit.className == "ASTEROIDSYEAHENEMY")
		{
			window.ASTEROIDS.currentLives--;
			addParticles(this.pos);
			
			if(window.ASTEROIDS.currentLives > 0)
			{
				this.pos.x = 100;
				this.pos.y = 100;
			}
			else
			{
				//this.highscoreLink.onclick();
				destroy.apply(this);
			}
		}

		for (var i = 0; i < this.enemies.length; i++ ) 
		{
			var objectVel = this.velocities[i].dir.setLengthNew(5 * tDelta);
			
			var currentPosition = new Vector(this.enemies[i].offsetLeft + Math.ceil(objectVel.x), this.enemies[i].offsetTop + Math.ceil(objectVel.y));
			boundsCheck(currentPosition);
			
			var newLeft = currentPosition.x + "px";
			var newTop = currentPosition.y + "px";
			this.enemies[i].style.position = "absolute";
			this.enemies[i].style.left = newLeft;
			this.enemies[i].style.top = newTop;
		}
			
		if (this.dying.length) {
			for ( var i = this.dying.length - 1; i >= 0; i-- ) {
				try {
					// If we have multiple spaceships it might have already been removed
					if ( this.dying[i].parentNode )
						window.ASTEROIDS.enemiesKilled++;

					this.dying[i].parentNode.removeChild(this.dying[i]);
				} catch ( e ) {}
			}

			this.dying = [];
		}
		
		setScore();
		

		// update particles position
		for ( var i = this.particles.length - 1; i >= 0; i-- ) {
			this.particles[i].pos.add(this.particles[i].dir.mulNew(particleSpeed * tDelta * Math.random()));
			
			if ( nowTime - this.particles[i].cameAlive > 1000 ) {
				this.particles.splice(i, 1);
				forceChange = true;
				continue;
			}
		}
		
		/*****************************************
		DRAW
		*****************************************/
		
		// Reposition the canvas area for IE quirks because it does not understand position: fixed
		if ( isIEQuirks ) {
			this.gameContainer.style.left =
				this.canvas.style.left = document.documentElement.scrollLeft + "px";
			this.gameContainer.style.top =
				this.canvas.style.top = document.documentElement.scrollTop + "px";
			
			this.navigation.style.right = "10px";
			this.navigation.style.top
				= document.documentElement.scrollTop + document.body.clientHeight - this.navigation.clientHeight - 10 + "px";
		}
		
		// clear
		if ( forceChange || this.bullets.length != 0 || this.particles.length != 0 || ! this.pos.is(this.lastPos) || this.vel.len() > 0 ) {
			this.ctx.clear();
			
			// draw player
			this.ctx.drawPlayer();
			
			// draw flames
			if ( drawFlame )
				this.ctx.drawFlames(that.flame);
			
			// draw bullets
			if (this.bullets.length) {
				this.ctx.drawBullets(this.bullets);
			}
			
			// draw particles
			if (this.particles.length) {
				this.ctx.drawParticles(this.particles);
			}
		}
		this.lastPos = this.pos;
	}
	
	// Start timer
	var updateFunc = function() {
		try {
			that.update.call(that);
		}
		catch (e) {
			clearInterval(interval);
			throw e;
		}
	};
	var interval = setInterval(updateFunc, 1000 / FPS);
	
	function destroy() {
		removeEvent(document, 'keydown', eventKeydown);
		removeEvent(document, 'keypress', eventKeypress);
		removeEvent(document, 'keyup', eventKeyup);
		removeEvent(window, 'resize', eventResize);
		isRunning = false;
		removeStylesheet("ASTEROIDSYEAHSTYLES");
		removeClass(document.body, 'ASTEROIDSYEAH');
		this.gameContainer.parentNode.removeChild(this.gameContainer);
	};
}


// Asteroids window main function. Do not touch.
if ( ! window.ASTEROIDSPLAYERS )
	window.ASTEROIDSPLAYERS = [];

if ( window.ActiveXObject && ! document.createElement('canvas').getContext ) {
	try {
		var xamlScript = document.createElement('script');
		xamlScript.setAttribute('type', 'text/xaml');
		xamlScript.textContent = '<?xml version="1.0"?><Canvas xmlns="http://schemas.microsoft.com/client/2007"></Canvas>';
		document.getElementsByTagName('head')[0].appendChild(xamlScript);
	} catch ( e ) {}

	var script = document.createElement("script");
	script.setAttribute('type', 'text/javascript');
	script.onreadystatechange = function() {
		if ( script.readyState == 'loaded' || script.readyState == 'complete' ) {
			if ( typeof G_vmlCanvasManager != "undefined" )
				window.ASTEROIDSPLAYERS[window.ASTEROIDSPLAYERS.length] = new Asteroids();
		}
	};
	script.src = "http://erkie.github.com/excanvas.js";
	document.getElementsByTagName('head')[0].appendChild(script);
}
else window.ASTEROIDSPLAYERS[window.ASTEROIDSPLAYERS.length] = new Asteroids();

})();
