/**
 * main.js 
 */

var gui;
var db;
var appName;
var logNode;
var dbt;
var fs;
var config;
var statusNode, docNameNode;
var doc;
var curAction;
var comboId;
var linesOnPage = 10;
var firstLine = 0;
var activeLine = 0;
var activeToken = 0;
var activePanel = 0;
var spanInEdit = false;
var isBusy = false;
var isActiveHighlighted = false;
var userMarksShown = false, appMarksShown = false;
var showBorders = false; 
var defFontSize = 130;
var createStatement = 'CREATE TABLE IF NOT EXISTS $ (itemid, name)';
var selectStatement = 'SELECT * FROM $';
var insertStatement = 'INSERT INTO $ (itemid, name) VALUES (?,?)';
var dropStatement = 'DROP TABLE IF EXISTS $';

function initContent() {
	gui = require('nw.gui');
	var win = gui.Window.get();
	win.on("close", function() {
		endApp();
	});
	fs = require('fs');
	appName = gui.App.manifest.name;
	dataPath = gui.App.dataPath;
	logNode = document.getElementById('workPanel');
	document.getElementById('fileID').addEventListener('change', handleFileSelect, false);
	document.getElementById('tsvID').addEventListener('change', handleTsvFileSelect, false);
	document.getElementById('txtID').addEventListener('change', handleTxtFileSelect, false);
	document.getElementById('loadtsvID').addEventListener('change', handleSaveTsvFileSelect, false);
	document.getElementById('loadtxtID').addEventListener('change', handleSaveTxtFileSelect, false);
	statusNode = document.getElementById("status");
	docNameNode = document.getElementById("docname");	
	if (localStorage.jstlines)
		linesOnPage = parseInt(localStorage.jstlines);
	document.getElementById("pagelines").value = ("" + linesOnPage);
	if (localStorage.jstfontsize)
		defFontSize = parseInt(localStorage.jstfontsize);
	document.getElementById("fontsize").value = ("" + defFontSize);
	setFontSize(defFontSize);
	if (localStorage.jstactive)
		isActiveHighlighted = localStorage.jstactive === "true";
	if (localStorage.jstshowborders)
		showBorders = localStorage.jstshowborders === "true";
	if (localStorage.jstshowusermarks)
		userMarksShown = localStorage.jstshowusermarks === "true";
	var wArea = document.querySelector("#workArea");
	if (userMarksShown)
		wArea.classList.toggle("usermarks");
	else
		wArea.classList.remove("usermarks");
	if (localStorage.jstshowappmarks)
		appMarksShown = localStorage.jstshowappmarks === "true";
	if (appMarksShown)
		wArea.classList.toggle("appmarks");
	else
		wArea.classList.remove("appmarks");
	readDB();
}


function endApp() {
	localStorage.jstlines = "" + linesOnPage;
	localStorage.jstfontsize = "" + defFontSize;
	localStorage.jstactive = "" + isActiveHighlighted;
	localStorage.jstshowborders = "" + showBorders;
	localStorage.jstshowusermarks = "" + userMarksShown;
	localStorage.jstshowappmarks = "" + appMarksShown;	
	gui.App.quit();
}

function menuDropdown(node) {
	if (!hasValidSettings())
		return;
	var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
    	var openDropdown = dropdowns[i];
    	if (openDropdown.classList.contains('show-dropdown') && hasValidSettings()) {
    		openDropdown.classList.remove('show-dropdown');
    	}
    }
	while (node = node.nextSibling) {
		if (node.nodeType == 1)
			break;
	}
	node = node.firstChild;
	do {
		if (node.nodeType == 1)
			break;
	} while(node = node.nextSibling);
	
	node.classList.toggle("show-dropdown");
	document.getElementById("pagelines").value = ("" + linesOnPage);
	document.getElementById("fontsize").value = ("" + defFontSize);
}

window.onclick = function(event) {
	var active = document.activeElement;
	if (active.id === 'pagelines' || active.id === "fontsize") {
		return;
	}
	if (!event.target.matches('.dropdown-content') && !event.target.matches('.mainMenuItem')) {
		var dropdowns = document.getElementsByClassName("dropdown-content");
	    for (var i = 0; i < dropdowns.length; i++) {
	    	var openDropdown = dropdowns[i];
	    	if (openDropdown.classList.contains('show-dropdown') && hasValidSettings()) {
	    		openDropdown.classList.remove('show-dropdown');
	    		return;
	    	}
	    }
	}
};

document.addEventListener("keydown", function(event) {
	if (!doc)
		return;
	//var nodeID = event.target.id;
	var cfirstLine = parseInt(firstLine);
	var clinesOnPage = parseInt(linesOnPage);
	var cActiveLine = parseInt(activeLine);
	var cActiveToken = parseInt(activeToken);			

	if (event.which != 27 && event.which != 112 && !(event.which >=118 && event.which <= 123)) {
		if (spanInEdit) {
			if (event.target.tagName.toLowerCase() == "select")
				updateActive(cActiveLine, cActiveToken);
			return;
		}
	}

	switch (event.which) {
		case 33: //pageup
			if (cfirstLine != 0) {
				cfirstLine -= clinesOnPage;
				firstLine = display.display(doc, Math.max(cfirstLine, 0), clinesOnPage);
				cActiveLine = firstLine;
				cActiveToken = 0;
				if (display.setActive(doc, cActiveLine, cActiveToken)) {
					activeLine = cActiveLine;
					activeToken = cActiveToken;
				}				
			}
			break;
		case 34: //pagedown
			if (doc.lines.length > (cfirstLine + clinesOnPage)) {
				cfirstLine = cfirstLine + clinesOnPage;
				firstLine = display.display(doc, cfirstLine, clinesOnPage);
				cActiveLine = firstLine;
				cActiveToken = 0;
				if (display.setActive(doc, cActiveLine, cActiveToken)) {
					activeLine = cActiveLine;
					activeToken = cActiveToken;
				}				
			}
			break;
		case 36: //home
			cActiveToken = 0;
			if (event.ctrlKey) {
				cActiveLine = 0;
			}
			if (cActiveLine < cfirstLine)
				firstLine = display.display(doc, cActiveLine, clinesOnPage);
			if (display.setActive(doc, cActiveLine, cActiveToken)) {
				activeLine = cActiveLine;
				activeToken = cActiveToken;
			}				
			break;
		case 35: //end
			if (event.ctrlKey) {
				cActiveLine = doc.lines.length - 1;
			}
			if (cActiveLine >= (cfirstLine + clinesOnPage))
				firstLine = display.display(doc, Math.max(0, cActiveLine - clinesOnPage + 1), clinesOnPage);
			cActiveToken = doc.lines[cActiveLine].tokens.length - 1;
			if (display.setActive(doc, cActiveLine, cActiveToken)) {
				activeLine = cActiveLine;
				activeToken = cActiveToken;
			}				
			break;		
		case 37: //left
			cActiveToken++;
			if (cActiveToken >= doc.lines[cActiveLine].tokens.length) {
				cActiveToken = 0;
				cActiveLine++;
				if (cActiveLine >= doc.lines.length) {
					break;
				}
				else if(cActiveLine >= (cfirstLine + clinesOnPage)) {
					cfirstLine++;
					firstLine = display.display(doc, cfirstLine, clinesOnPage);
				}
			}
			if (display.setActive(doc, cActiveLine, cActiveToken)) {
				activeLine = cActiveLine;
				activeToken = cActiveToken;
			}
			break;
		case 39: //right
			cActiveToken--;
			if (cActiveToken < 0) {
				cActiveLine--;
				if (cActiveLine < 0) {
					break;
				}
				else if(cActiveLine < cfirstLine) {
					cfirstLine--;
					firstLine = display.display(doc, cfirstLine, clinesOnPage);
				}
				cActiveToken = doc.lines[cActiveLine].tokens.length - 1;
			}
			if (display.setActive(doc, cActiveLine, cActiveToken)) {
				activeLine = cActiveLine;
				activeToken = cActiveToken;
			}
			break;
		case 40: //down
			cActiveLine++;
			if (cActiveLine >= doc.lines.length) {
				break;
			}
			else if(cActiveLine >= (cfirstLine + clinesOnPage)) {
				cfirstLine++;
				firstLine = display.display(doc, cfirstLine, clinesOnPage);
			}
			cActiveToken = 0;
			if (display.setActive(doc, cActiveLine, cActiveToken)) {
				activeLine = cActiveLine;
				activeToken = cActiveToken;
			}
			break;
		case 38: //up
			cActiveLine--;
			if (cActiveLine < 0) {
				break;
			}
			else if(cActiveLine < cfirstLine) {
				cfirstLine--;
				firstLine = display.display(doc, cfirstLine, clinesOnPage);
			}			
			cActiveToken = 0;
			if (display.setActive(doc, cActiveLine, cActiveToken)) {
				activeLine = cActiveLine;
				activeToken = cActiveToken;
			}
			break;
		case 113: //F2 - edit token
			var nText = document.querySelector("#selectedText");
			setSpanInEdit(true);
			nText.focus();
			break;
		case 114: //F3 - insert from the left
			insertToken(cActiveLine, cActiveToken, true);
			break;
		case 115: //F4 - insert from the right
			insertToken(cActiveLine, cActiveToken, false);
			break;
		case 116: //F5 - delete token
			deleteToken(cActiveLine, cActiveToken);
			break;
		case 117: //F6 - split 
			splitToken(cActiveLine, cActiveToken);
			break;
		case 118: //F7 - delete line
			deleteCurrentLine(cActiveLine, cActiveToken);
			break;
		case 119: //f8 - insert line after current
			insertLineAfterCurrent(cActiveLine, cActiveToken);
			break;
		case 112: //F1 - go to next token
		case 120: //F9 - unmark		
		case 121: //F10 - mark red
		case 122: //F11 - mark pink
		case 123: //F12 - mark green
			if (event.which != 112) {
				doc.lines[cActiveLine].tokens[cActiveToken].userMark = event.which == 123? "G" : event.which == 122? "P" : event.which == 121? "R" : "";
				display.setActive(doc, cActiveLine, cActiveToken);
			}
			event.target.blur();
			setSpanInEdit(false);
			cActiveToken++;
			if (cActiveToken >= doc.lines[cActiveLine].tokens.length) {
				cActiveToken = 0;
				cActiveLine++;
				if (cActiveLine >= doc.lines.length) {
					break;
				}
				else if(cActiveLine >= (cfirstLine + clinesOnPage)) {
					cfirstLine++;
					firstLine = display.display(doc, cfirstLine, clinesOnPage);
				}
			}
			if (display.setActive(doc, cActiveLine, cActiveToken)) {
				activeLine = cActiveLine;
				activeToken = cActiveToken;
			}				
			break;
		case 27: //esc
			event.target.blur();
			setSpanInEdit(false);
			break;
		default:
			//alert(event.which);
			break;
	  }
});

function updateSpanText(aLine, aToken) {
	var node = document.querySelector("#selectedText");
	var txt = node.value.replace(/^\s+|\s+$/g,"");
	var sel = ".para.N" + aLine + " .token.N" + aToken;
	var span = document.querySelector(sel);
	span.innerHTML = txt;
	doc.lines[aLine].tokens[aToken].text = txt;
	if (doc.lines[aLine].tokens[aToken].notSeparated && txt.length > 1) {
		alert("Here?");
		var tNode = document.createTextNode(" ");
		if (span.nextSibling)
			span.parentNode.insertBefore(tNode, span.nextSibling);
		else
			span.parentNode.appendChild(tNode);
		doc.lines[aLine].tokens[aToken].notSeparated = false;
		alert("And here");
	}
	display.setActive(doc, aLine, aToken);
}

function deleteToken(aLine, aToken) {
	var sel = ".para.N" + aLine + " .token.N" + aToken;
	var span = document.querySelector(sel);
	var parent = span.parentNode;
	var cFirstLine = parseInt(firstLine);
	var cLinesOnPage = parseInt(linesOnPage);
	var notSeparated = doc.lines[aLine].tokens[aToken].notSeparated;
	doc.lines[aLine].tokens.splice(aToken, 1);
	if (doc.lines[aLine].tokens.length == 0) {
		doc.lines.splice(aLine, 1);
		//tsv.deleteLineFromDB(db, doc, aLine);
		if (doc.lines.length == 0) {
			var docName = doc.name;
			tsv.deleteDocumentFormDB(db, doc.name);
			clearScreen();
			alert('Document "' + docName + '" is removed from your DB');
			return;
		}
		updateScreenAfterLine(parent, aLine);
		tsv.deleteDocumentFormDB(db, doc.name);
		tsv.saveIntoDB(db, doc);
		if ((cFirstLine + cLinesOnPage) >= doc.lines.length) {
			cFirstLine = Math.max(0, (cFirstLine - 1));
		}
		activeLine = Math.max(0, (activeLine - 1));
		activeToken = 0;
		display.display(doc, cFirstLine, cLinesOnPage);
		display.setActive(doc, activeLine, activeToken);
		return;
	}
	if (!notSeparated)
		span.parentNode.removeChild(span.nextSibling);
	var node = span.nextSibling;
	span.parentNode.removeChild(span);
	if (node) {
		var oldNumber = aToken + 1;
		var newNumber = aToken;
		while (node) {
			if (node.nodeType == 1) {
				if (node.classList.contains("N" + oldNumber))
					node.classList.remove("N" + oldNumber);
				node.classList.toggle("N" + newNumber);
				oldNumber++;
				newNumber++;
			}
			node = node.nextSibling;
		}
	}
	else {
		aToken--;
		activeToken = aToken;
	}
	tsv.saveLineTokensIntoDB(db, doc, aLine);
	display.setActive(doc, aLine, aToken);
	window.isBusy = false;
}

function updateScreenAfterLine(oldPara, aLine) {
	if (aLine >= doc.lines.length) {
		return;
	}
	var linediv = oldPara.parentNode.parentNode;
	linediv.parentNode.removeChild(linediv);
	var wArea = document.querySelector("#workArea");
	var numDivs = wArea.querySelectorAll(".linenum");
	for (var i = 0; i < numDivs.length; i++) {
	    var linenumDiv = numDivs[i];
		var linenum = parseInt(linenumDiv.innerHTML);
		if (linenum < aLine)
			return;
		/*
		else if(linenum == aLine) {
			alert("Wrong line number!!!");
			return;
		}
		*/
		linenum--;
		linenumDiv.innerHTML = "" + linenum;
		var lineContent = linenumDiv.nextSibling;
		var para = lineContent.querySelector(".para");
		para.className = "para";
		para.classList.toggle("N" + linenum);
	}
}

function deleteCurrentLine(aLine, aToken) {
	if (doc.lines.length == 0)
		return;
	var cFirstLine = parseInt(firstLine);
	var cLinesOnPage = parseInt(linesOnPage);
	var sel = ".para.N" + aLine + " .token.N" + aToken;
	var span = document.querySelector(sel);
	var parent = span.parentNode;
	doc.lines.splice(aLine, 1);
	if (doc.lines.length == 0) {
		var docName = doc.name;
		tsv.deleteDocumentFormDB(db, doc.name);
		clearScreen();
		alert('Document "' + docName + '" is removed from your DB');
		return;
	}
	updateScreenAfterLine(parent, aLine);
	tsv.deleteDocumentFormDB(db, doc.name);
	tsv.saveIntoDB(db, doc);
	if ((cFirstLine + cLinesOnPage) >= doc.lines.length) {
		cFirstLine = Math.max(0, (cFirstLine - 1));
	}
	activeLine = Math.max(0, (activeLine - 1));
	activeToken = 0;
	display.display(doc, cFirstLine, cLinesOnPage);
	display.setActive(doc, activeLine, activeToken);
}

function insertLineAfterCurrent(aLine, aToken) {
	var aNewLine = tsv.getNewLine(doc, aLine);
	var cFirstLine = parseInt(firstLine);
	var cLinesOnPage = parseInt(linesOnPage);
	doc.lines.splice(aLine+1, 0, aNewLine);
	tsv.deleteDocumentFormDB(db, doc.name);
	tsv.saveIntoDB(db, doc);
	if (aLine == cFirstLine + cLinesOnPage)
		cFirstLine++;
	firstLine = display.display(doc, cFirstLine, cLinesOnPage);
	activeLine = aLine+1;
	activeToken = 0;
	display.setActive(doc, aLine+1, 0);
	var nText = document.querySelector("#selectedText");
	setSpanInEdit(true);
	nText.focus();
}

function insertToken(aLine, aToken, isNext, splitNotSeparate) {
	var token = tsv.getNewToken(aLine);
	var aNewToken = aToken + (isNext? 1 : 0);
	var sel = ".para.N" + aLine + " .token.N" + aToken;
	var span = document.querySelector(sel);
	var notSeparated = doc.lines[aLine].tokens[aToken].notSeparated;
	if (splitNotSeparate) {
		token.text = doc.lines[aLine].tokens[aToken].text.substring(0,1);
		token.notSeparated = true;
	}
	doc.lines[aLine].tokens.splice(aNewToken, 0, token);
	if (splitNotSeparate) {
		doc.lines[aLine].tokens[aNewToken + 1].text = doc.lines[aLine].tokens[aNewToken + 1].text.substring(1);
		span.innerHTML = doc.lines[aLine].tokens[aNewToken + 1].text;
	}	
	var newSpan = document.createElement("span");
	newSpan.className = "token";
	newSpan.classList.toggle("N" + aNewToken);
	newSpan.innerHTML = token.text;
	newSpan.onclick = newSpan.onblur = function(e) {
		var getNum = function(sLine) {
			sLine = sLine.substring(sLine.indexOf("N") + 1);
			if (sLine.indexOf(" ") > 0) 
				sLine = sLine.substring(0, sLine.indexOf(" "));
			return parseInt(sLine);
		};
		var lineNum = getNum(e.target.parentNode.className);
		var tokenNum = getNum(e.target.className);
		setSpanInEdit(false);
		display.setActive(window.doc, lineNum, tokenNum);
		window.activeLine = lineNum;
		window.activeToken = tokenNum;
	};
	if (!isNext) {
		span.parentNode.insertBefore(newSpan, span);
		if (!splitNotSeparate)
			span.parentNode.insertBefore(document.createTextNode(" "), span);
	}
	else {
		if (!span.nextSibling)
			span.parentNode.appendChild(newSpan);
		else
			span.parentNode.insertBefore(newSpan, span.nextSibling);
		if (!notSeparated)
			span.parentNode.insertBefore(document.createTextNode(" "), span.nextSibling);
	}
	var node = newSpan.nextSibling;
	var oldNumber = aNewToken; 
	while (node) {
		if (node.nodeType == 1) {
			if (node.classList.contains("N" + oldNumber))
				node.classList.remove("N" + oldNumber);
			oldNumber++;
			node.classList.toggle("N" + oldNumber);
		}
		node = node.nextSibling;
	}
	activeToken = aNewToken;
	display.setActive(doc, aLine, aNewToken);
	tsv.saveLineTokensIntoDB(db, doc, aLine);
	if (splitNotSeparate)
		return;
	var nText = document.querySelector("#selectedText");
	setSpanInEdit(true);
	nText.select();
	nText.focus();
}

function splitToken(aLine, aToken) {
	if (doc.lines[aLine].tokens[aToken].text.length > 1)
		insertToken(aLine, aToken, false, true);
}

function highlightActive() {
	if (!doc)
		return;
	var cActiveLine = parseInt(activeLine);
	var cActiveToken = parseInt(activeToken);			
	isActiveHighlighted = !isActiveHighlighted;
	display.setActive(doc, cActiveLine, cActiveToken);
}

function showHideBorders() {
	if (!doc)
		return;
	showBorders = !showBorders;
	var cfirstLine = parseInt(firstLine);
	var clinesOnPage = parseInt(linesOnPage);
	var cActiveLine = parseInt(activeLine);
	var cActiveToken = parseInt(activeToken);			
	display.display(doc, cfirstLine, clinesOnPage);
	display.setActive(doc, cActiveLine, cActiveToken);
}

function showUserMarks() {
	var wArea = document.querySelector("#workArea");
	if (!userMarksShown && appMarksShown)
		showAppMarks();
	userMarksShown = !userMarksShown;
	if (userMarksShown)
		wArea.classList.toggle("usermarks");
	else
		wArea.classList.remove("usermarks");
	var cfirstLine = parseInt(firstLine);
	var clinesOnPage = parseInt(linesOnPage);
	var cActiveLine = parseInt(activeLine);
	var cActiveToken = parseInt(activeToken);			
	display.display(doc, cfirstLine, clinesOnPage);
	display.setActive(doc, cActiveLine, cActiveToken);
}

function showAppMarks() {
	var wArea = document.querySelector("#workArea");
	if (!appMarksShown && userMarksShown)
		showUserMarks();
	appMarksShown = !appMarksShown;
	if (appMarksShown)
		wArea.classList.toggle("appmarks");
	else
		wArea.classList.remove("appmarks");
	var cfirstLine = parseInt(firstLine);
	var clinesOnPage = parseInt(linesOnPage);
	var cActiveLine = parseInt(activeLine);
	var cActiveToken = parseInt(activeToken);			
	display.display(doc, cfirstLine, clinesOnPage);
	display.setActive(doc, cActiveLine, cActiveToken);
}

function hasValidSettings() {
	var val = document.getElementById("pagelines").value;
	if (/^\d+$/.test(val)) {
		var n = parseInt(val);
		if (val > 0 && val < 11) {
			if (val != linesOnPage) {
				linesOnPage = val;
				firstLine = display.display(doc, firstLine, linesOnPage);
				activeLine = firstLine;
				activeToken = 0;
				display.setActive(doc, firstLine, 0);
			}
		}
		else
			return false;
	}
	else
		return false;
	
	val = document.getElementById("fontsize").value;
	if (/^\d+$/.test(val)) {
		var n = parseInt(val);
		if (n >= 100 && n <= 200) {
			if (n != defFontSize) {
				defFontSize = n;
				var wPanel = document.querySelector("#workPanel");
				wPanel.style.fontSize = "" + defFontSize + "%";
			}
			return true;
		}
	}
	return false;
}

function endSettings(e) {
	if (!e)
		e = window.event;
	if (e.which == '13') {
		var node = e.target.parentNode;
		node.focus();
		node.click();
		return false;
	}
}

function setFontSize(n) {
	var wPanel = document.querySelector("#workPanel");
	wPanel.style.fontSize = "" + n + "%";	
}

function loadTSV() {
	var tsvId = document.querySelector("#tsvID");
	tsvId.value = "";
	tsvId.click();
}

function loadTXT() {
	var txtId = document.querySelector("#txtID");
	txtId.value = "";
	txtId.click();
}

function saveTSV() {
	if (!doc) {
		alert("Load some document for export!");
		return;
	}
	var loadtsvId = document.querySelector("#loadtsvID");
	var docname = doc.name.replace(/_JST$/, "");
	loadtsvId.setAttribute("nwsaveas", docname + "_JST.tsv");
	loadtsvId.value = "";
	loadtsvId.click();	
}

function saveTXT() {
	if (!doc) {
		alert("Load some document for export!");
		return;
	}
	var loadtxtId = document.querySelector("#loadtxtID");
	loadtxtId.value = "";
	loadtxtId.click();	
}

function handleTsvFileSelect() {
	var fileinput = document.querySelector('input#tsvID[type=file]');
	var path = fileinput.value;
	var apath = path.split("\\").length - 1;
	var fName = path.split("\\")[apath].split(".")[0];
	statusNode.innerHTML = "Load annotated document from " + path + "...";
	var txt = fs.readFileSync(path, 'utf8');
	if (!txt) {
		statusNode.classList.toggle("show-error");
		statusNode.innerHTML = "Problem with reading file " + path;
		alert("File " + path + "doesn't exist or not readable");
		statusNode.classList.remove("show-error");
		statusNode.innerHTML = "";
		return;
	} else {
		loadDoc("loadtsv",txt,fName);
	}
	statusNode.innerHTML = "";
	fileinput.value = "";
	return;
}

function handleTxtFileSelect() {
	var fileinput = document.querySelector('input#txtID[type=file]');
	var path = fileinput.value;
	var apath = path.split("\\").length - 1;
	var fName = path.split("\\")[apath].split(".")[0];
	statusNode.innerHTML = "Load regular file from " + path + "...";
	var txt = fs.readFileSync(path, 'utf8');
	if (!txt) {
		statusNode.classList.toggle("show-error");
		statusNode.innerHTML = "Problem with reading file " + path;
		alert("File " + path + "doesn't exist or not readable");
		statusNode.classList.remove("show-error");
		statusNode.innerHTML = "";
		return;
	} else {
		loadDoc("loadtxt",txt,fName);
	}
	statusNode.innerHTML = "";
	fileinput.value = "";
	return;
}

function handleSaveTsvFileSelect() {
	var fileinput = document.querySelector('input#loadtsvID[type=file]');
	var path = fileinput.value;
	fs.stat(path, function(err, stat) {
	    if (!err || err.code == 'ENOENT') {
	    	statusNode.innerHTML = "Save annotated document into " + path + "...";
	        tsv.exportDocument(fs, doc, path);
	    } else {
			statusNode.classList.toggle("show-error");
			statusNode.innerHTML = "Problem with writing into the file " + path;
			alert("You can't write into the file " + path);
			statusNode.classList.remove("show-error");
	    }
		statusNode.innerHTML = "";
		fileinput.value = "";
	});
	return;
}

function handleSaveTxtFileSelect() {
	var fileinput = document.querySelector('input#loadtxtID[type=file]');
	var path = fileinput.value;
	fs.stat(path, function(err, stat) {
	    if (!err || err.code == 'ENOENT') {
	    	statusNode.innerHTML = "Save text content of the document into " + path + "...";
	        tsv.exportTextContent(fs, doc, path);
	    } else {
			statusNode.classList.toggle("show-error");
			statusNode.innerHTML = "Problem with writing into the file " + path;
			alert("You can't write into the file " + path);
			statusNode.classList.remove("show-error");
	    }
		statusNode.innerHTML = "";
		fileinput.value = "";
	});
	return;
}

function handleFileSelect(evt) {
	var fileinput = document.querySelector('input#fileID[type=file]');
	var path = fileinput.value;
	var group = "";
	var subgroup = "";
	var option;
	var result;
	statusNode.innerHTML = "Load configuration from " + path + "...";
	fs.readFile(path, 'utf8', function(err, txt) {
		  if (err) {
			  statusNode.classList.toggle("show-error");
			  statusNode.innerHTML = "Problem with reading file " + path;
			  alert("File " + path + "doesn't exist or not readable");
			  statusNode.classList.remove("show-error");
			  statusNode.innerHTML = "";
			  return;
		  }
		  else {
			  var aresult = txt.split(/\r?\n/);
			  for (var i =0; i<aresult.length; i++) {
				  result = aresult[i].trim();
				  if (result.length == 0) {
					  continue;
				  }
				  else if (result.substring(0,1) === "#") {
					  if (result.length == 0) {
						  group = "";
						  comboId = null;
					  }
					  else {
						  group = result.substring(1).toLowerCase();
						  count = 0;
						  comboId = document.getElementById(group);
						  if (!comboId) {
							  group = "";
						  }
						  else {
							  var opt = comboId.options[0];
							  comboId.innerHTML = "";
							  comboId.add(opt);
						  }
					  }
				  }
				  else if(group.length > 0) {
					  if (result.substring(0,1) === "+") {
						  var pos = result.indexOf("Group: ");
						  if (pos > 0) {
							  subgroup = result.substring(pos + 7);
							  pos = subgroup.indexOf("."); 
							  if (pos < 0) {
								  subgroup = "";
								  continue;
							  }
							  subgroup = subgroup.substring(0, pos);
						  }
						  continue;
					  }
					  else if (group === "pos") {
						  var subarr = aresult[i].split("|");
						  for (var k = 3; k < subarr.length; k++) {
							  subarr[k] = subarr[k].trim().length == 0? "N" : "Y";
						  }
						  option = document.createElement("option");
						  option.text = subarr[1];
						  option.dataTag = subarr[2];
						  option.dataPosg = subgroup;
						  option.dataInflection = subarr[3];
						  option.dataGender = subarr[5];
						  option.dataNumber = subarr[4];
						  option.dataPerson = subarr[6];
						  option.dataTence = subarr[7];
						  option.dataVoice = subarr[8];
						  option.dataElipsis = subarr[9];
						  comboId.add(option);
						  continue;
					  }
					  option = document.createElement("option");
					  option.text = result;
					  comboId.add(option);
				  }
			  }
		  }
	});
	statusNode.innerHTML = "";
	var tNames = ["inflection","inflection","gender","number","person","tence","voice","elipsis","groups","pos"];
    for (var i=0; i<tNames.length; i++) {
    	saveConfig(tNames[i]);
    }
}

function saveConfig(tableName) {
	var options = document.getElementById(tableName).options;
	db.transaction(function (tx) {
		var stmt = dropStatement.replace("$", tableName);
		tx.executeSql(stmt);
		
		if (tableName === "pos")
			tx.executeSql('CREATE TABLE IF NOT EXISTS pos (itemid, name, tag, posg, \
				  inflection, gender, number, person, tence, voice, elipsis)', 
				  [], null, onError);
		else {
			stmt = createStatement.replace("$", tableName);
			tx.executeSql(stmt, [], null, onError);
		}
		
		for (var i=1; i<options.length; i++) {
			if (tableName === "pos")
				tx.executeSql('INSERT INTO pos (itemid, name, tag, posg, inflection, gender, number, \
						person, tence, voice, elipsis) VALUES (?,?,?,?,?,?,?,?,?,?,?)', 
						[("" + (++count)),options[i].text,options[i].dataTag,options[i].dataPosg,options[i].dataInflection,
						 options[i].dataGender,options[i].dataNumber,options[i].dataPerson,options[i].dataTence,options[i].dataVoice,
						 options[i].dataElipsis], null, onError);
			else {
				  stmt = insertStatement.replace("$",tableName);
				  tx.executeSql(stmt, [("" + (++count)), options[i].text], null, onError);
			}
		}
	});
}

function readDB(debug) {
	
	if (!db)
		db = openDatabase('taggerd2', '1.0', 'BDLTagger DB', 5 * 1024 * 1024);
	
	if (debug) {
		db.transaction(function(tx) {
			if (debug == 1) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS document (name, description, lines integer)', [], null, onError);
			tx.executeSql('SELECT * FROM document', [], function(tx, results) {
				var len = results.rows.length, j;
				var str = "Lines from document DB: " + len + "\n";
				for (j = 0; j < len; j++) {
					var row = results.rows[j];
					str += "" + j + ". Name: " + row.name + ", lines: " + row.lines + "\n";
				}
				alert(str);
			}, onError);
			tx.executeSql('CREATE TABLE IF NOT EXISTS lines (docname, linenumber, text, tokens integer)', [], null, onError);
			tx.executeSql('SELECT * FROM lines', [], function(tx, results) {
				var len = results.rows.length, j;
				var str = "Lines from lines DB: " + len + "\n";
				for (j = 0; j < len; j++) {
					var row = results.rows[j];
					str += "" + j + ". " + row.text + "\n";
				}
				alert(str);
			}, onError);
			
			tx.executeSql('CREATE TABLE IF NOT EXISTS tokens (docname, linenumber, tokennumber, text, lemma, \
					vfh, vfl, posg, pos, inflection, gender, number, person, tence, voice, elipsis, usermark, appmark, notseparated, active, postponed)', [], null, onError);						
			tx.executeSql('SELECT * FROM tokens', [], function(tx, results) {
				var len = results.rows.length, j;
				var str = "Lines from tokensDB: " + len + "\n";
				for (j = 0; j < len; j++) {
					var row = results.rows[j];
					str += "" + j + ". " + row.text + "\n";
				}
				alert(str);
			}, onError);
			
			}
			else {
				if (confirm("Do you really want to delete all documents from your DB?")) {
					clearScreen();
					tx.executeSql('DROP TABLE IF EXISTS document');
					tx.executeSql('DROP TABLE IF EXISTS lines');
					tx.executeSql('DROP TABLE IF EXISTS tokens');
				}
			}
		});
		return;
	}
	
	var tNames = ["inflection", "gender", "number", "person", "tence",
		   			"voice", "elipsis", "groups", "pos" ];	
	for (var i=0; i<tNames.length; i++) {
		writeOptions(tNames[i]);
	}
}	

function writeOptions(tableName) {
	db.transaction(function(tx) {
		comboId = document.getElementById(tableName);
			if (tableName === "pos") {
				tx.executeSql('CREATE TABLE IF NOT EXISTS pos (itemid, name, tag, posg, \
						  inflection, gender, number, person, tence, voice, elipsis)', 
						  [], null, onError);
				tx.executeSql('SELECT * FROM pos', [],function(tx, results) {
					var len = results.rows.length, j;
					for (j = 0; j < len; j++) {
						var row = results.rows[j];
						var option = document.createElement("option");
						option.text = row.name;
						option.dataTag = row.tag;
						option.dataPosg = row.posg;
						option.dataInflection = row.inflection;
						option.dataGender = row.gender;
						option.dataNumber = row.number;
						option.dataPerson = row.person;
						option.dataTence = row.tence;
						option.dataVoice = row.voice;
						option.dataElipsis = row.elipsis;
						comboId.add(option);
					}
				}, onError);
			}
			else {
				var stmt1 = createStatement.replace("$",tableName);
				var stmt2 = selectStatement.replace("$",tableName);
				tx.executeSql(stmt1, [], null, onError);
				tx.executeSql(stmt2, [], function(tx, results) {
					var len = results.rows.length, j;
					for (j = 0; j < len; j++) {
						var row = results.rows[j];
						var option = document.createElement("option");
						option.text = row.name;
						comboId.add(option);
					}
				}, onError);
			}
	});
}

function setNotSelected(node) {
	var combo = document.querySelector("#" + node.name);
	var cActiveLine = parseInt(activeLine);
	var cActiveToken = parseInt(activeToken);			
	combo.selectedIndex = 0;
	if (node.name == "groups") {
		markPosGroup(combo);
		return;
	}
	if (doc) {
		doc.lines[cActiveLine].tokens[cActiveToken][node.name] = "";
		display.setActive(doc, cActiveLine, cActiveToken);
	}
}

function markPosGroup(node) {
	var group = node.options[node.selectedIndex].text;
	var posCombo = document.querySelector("#pos");
	for (var i = 1; i<posCombo.options.length; i++) {
		var option = posCombo.options[i];
		if (node.selectedIndex == 0) {
			option.className = "";
		}
		else if(option.dataPosg != group) {
			option.className = "outofgroup";
		}
		else {
			option.className = "";			
		}
	}
}

function updateActive(node) {
	if (!doc)
		return;
	var cActiveLine = parseInt(activeLine);
	var cActiveToken = parseInt(activeToken);			

	setSpanInEdit(true);
	if (node.options) {
		doc.lines[cActiveLine].tokens[cActiveToken][node.id] = node.selectedIndex? node.options[node.selectedIndex].text : "";
	}
	else {
		doc.lines[cActiveLine].tokens[cActiveToken][node.id == "selectedText"? "text" : node.id] = node.value;
		if (node.id == "selectedText")
			updateSpanText(cActiveLine, cActiveToken);
	}
	display.setActive(doc, cActiveLine, cActiveToken);
}

function updateNotSeparated(node) {
	if (!doc) {
		node.checked = false;
		return;
	}
	var cActiveLine = parseInt(activeLine);
	var cActiveToken = parseInt(activeToken);
	if (cActiveToken == doc.lines[cActiveLine].tokens.length-1) {
		node.checked = false;
		return;
	}	
	setSpanInEdit(true);
	doc.lines[cActiveLine].tokens[cActiveToken].notSeparated = node.checked;
	display.display(doc, firstLine, linesOnPage);
	display.setActive(doc, cActiveLine, cActiveToken);	
}


function loadDoc(cname, txt, fName) {
	db.transaction(function(tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS document (name, description, lines integer)', [], null, onError);
		tx.executeSql('SELECT * FROM document', [], function(tx, results) {
			var bResult = document.querySelector("#getresults");
			if (!cname)
				bResult.className = "listofdocuments";
			else
				bResult.className = cname;
			bResult.dataResults = [];
			bResult.dataDescs = [];
			bResult.dataTxt = "";
			bResult.fName = "";
			for (var i=0; i<results.rows.length; i++) {
				bResult.dataResults.push(results.rows[i].name);
				bResult.dataDescs.push(results.rows[i].description || "");
			}
			if (txt)
				bResult.dataTxt = txt;
			if (fName)
				bResult.fName = fName;
			bResult.click();
		}, onError);
	});
}

function createTsv(node) {
	createCustomPrompt(node, function(docName, description, text) {
		docNameNode.innerHTML = docName;
		window.doc = tsv.loadDocument(docName, description, text);
		tsv.saveIntoDB(window.db, window.doc);
		statusNode.innerHTML = "";
		window.firstLine = display.display(window.doc, (window.firstLine), (window.linesOnPage), window);
		window.activeLine = window.firstLine;
		window.activeToken = 0;
		display.setActive(window.doc, window.firstLine, 0);
	});
}

function createTxt(node) {
	createCustomPrompt(node, function(docName, description, text) {
		var cfirstLine = parseInt(window.firstLine);
		var clinesOnPage = parseInt(window.linesOnPage);
		docNameNode.innerHTML = docName;
		window.doc = tsv.loadPlainText(docName, description, text);
		tsv.saveIntoDB(window.db, window.doc);
		statusNode.innerHTML = "";
		window.firstLine = display.display(window.doc, cfirstLine, clinesOnPage);
		window.activeLine = window.firstLine;
		window.activeToken = 0;
		display.setActive(window.doc, window.firstLine, 0);
	});
}

function canGetResults(node) {
	if(node.className == "listofdocuments" || node.className == "removedocument") {
		if (!node.dataResults || node.dataResults.length == 0) {
			alert("Your DB doesn't contain any document yet.");
		}
		else {
			createCustomPrompt(node, function(docName) {
				if (node.className == "listofdocuments") {
					docNameNode.innerHTML = docName;
					tsv.loadDocumentFromDB(docName);
				}
				else
					tsv.deleteDocumentFormDB(window.db, docName);
			});
		}
	}
	else if (node.className == "loadtsv") {
		createTsv(node);
	}
	else
		createTxt(node);
}

function createCustomPrompt(node, callback) {
	    if(document.getElementById("customDialog")) 
	    	return;
	    var title = "", subtitle = "";
	    if (node.className == "listofdocuments") {
	    	title = "LOAD DOCUMENT";
	    	subtitle = "Choose your document from the list<br/>";
	    }
	    else if(node.className == "removedocument") {
	    	title = "REMOVE DOCUMENT";
	    	subtitle = "Choose your document from the list<br/>";	    	
	    }
	    else if(node.className == "loadtsv" || node.className == "loadtxt") {
	    	title = "CREATE DOCUMENT";
	    	subtitle = "Enter name and description of the document<br/>";
	    }
	    var mObj = document.querySelector("#mainPanel").appendChild(document.createElement("div"));
	    mObj.id = "customDialog";
	    mObj.style.position = "absolute";
	    mObj.style.boxShadow = "0px 8px 16px 0px rgba(0,0,0,0.9)";
	    mObj.style.display = "block";
	    mObj.style.width = "400px";
	    mObj.style.height = "300px";
	    mObj.style.left = "500px";
	    mObj.style.bottom = "400px";
	    mObj.style.textAlign = "center";
	    var alertObj = mObj.appendChild(document.createElement("div"));
	    alertObj.id = "alertBox";
	    var h1 = alertObj.appendChild(document.createElement("h1"));
	    h1.appendChild(document.createTextNode(title));
	    var msg = alertObj.appendChild(document.createElement("p"));
	    msg.innerHTML = subtitle;
	    if (node.className == "listofdocuments" || node.className == "removedocument") {
		    var combo = alertObj.appendChild(document.createElement("select"));
		    combo.style.width = "70%";
		    combo.onchange = function(e) {
		    	var dInfo = document.querySelector("#divinfo");
		    	if (e.target.selectedIndex == 0)
		    		dInfo.innerHTML = "";
		    	else
		    		dInfo.innerHTML = e.target.options[e.target.selectedIndex].value || "";
		    };
		    var option = document.createElement("option");
		    option.text = "Not selected";
		    combo.add(option);
		    for (var i=0; i<node.dataResults.length; i++) {
		    	option = document.createElement("option");
		    	option.text = node.dataResults[i];
		    	option.value = node.dataDescs[i];
		    	combo.add(option);
		    }
		    var divInfo = alertObj.appendChild(document.createElement("div"));
		    divInfo.style.paddingTop = "20px";
		    divInfo.style.width= "80%";
		    divInfo.style.fontSize = "small";
		    divInfo.id = "divinfo";
	    }
	    else {
	    	var cont = alertObj.appendChild(document.createElement("div"));
	    	cont.style.textAlign = "left";
	    	cont.style.width = "80%";
	    	cont.style.position = "absolute";
	    	cont.style.right = "40px";
	    	cont.style.top = "110px";
	    	var lab1 = cont.appendChild(document.createElement("div"));
	    	lab1.innerHTML = "Name of the document <span style='color: red;'>(required)</span>";
	    	var dInp1 = cont.appendChild(document.createElement("div"));
	    	var inp1 = dInp1.appendChild(document.createElement("input"));
	    	inp1.style.width = "100%";
	    	inp1.onchange = function() {lab3.innerHTML = "";};
	    	inp1.id = "inp1";
	    	if (node.fName)
	    		inp1.value = node.fName;
	    	var lab2 = cont.appendChild(document.createElement("div"));
	    	lab2.innerHTML = "Description of the document (optional)";
	    	lab2.style.marginTop = "7px";
	    	var dInp2 = cont.appendChild(document.createElement("div"));
	    	var inp2 = dInp2.appendChild(document.createElement("input"));
	    	inp2.style.width = "100%";
	    	inp2.id = "inp2";
	    	var lab3 = cont.appendChild(document.createElement("div"));
	    	lab3.style.marginTop = "10px";
	    	lab3.style.textAlign = "center";
	    	lab3.style.color = "red";
	    }
	    var divInfo = alertObj.appendChild(document.createElement("div"));
	    divInfo.style.paddingTop = "20px";
	    divInfo.style.width= "80%";
	    divInfo.style.fontSize = "small";
	    divInfo.id = "divinfo";
	    var div = alertObj.appendChild(document.createElement("div"));
	    div.className = node.className == "listofdocuments"? "dialogbtnpanel" : "dialogbtnpanel tsv";
	    var btnOK = div.appendChild(document.createElement("a"));
	    btnOK.id = "okBtn";
	    btnOK.className ="dialogbtn";
	    btnOK.appendChild(document.createTextNode(" OK! "));
	    btnOK.href = "#";
	    var btnCancel = div.appendChild(document.createElement("a"));
	    btnCancel.id = "cancelBtn";
	    btnCancel.appendChild(document.createTextNode("Cancel"));
	    btnCancel.href = "#";
	    btnCancel.className = "dialogbtn";
	    node.finalResult = [];
	    if (node.className == "listofdocuments" || node.className == "removedocument") {
		    btnCancel.focus();
		    btnOK.onclick = function() {
		    	if (combo.selectedIndex == 0) return;
		    	var docName = combo.options[combo.selectedIndex].text;
		    	document.querySelector("#mainPanel").removeChild(mObj);
		    	clearScreen();
	    		callback(docName);
		    };
	    }
	    else {
	    	inp1.focus();
	    	inp1.onkeydown = function (e) {
	    		if (e.which == 13)
	    			btnOK.click();
	    	};
		    btnOK.onclick = function() {
		    	if (!inp1.value || inp1.value.trim().length == 0) return;
		    	var docName = inp1.value.trim();
		    	for (var i=0; i<node.dataResults.length; i++) {
		    		if (docName.toLowerCase() == node.dataResults[i].toLowerCase()) {
		    			lab3.innerHTML = "Document with this name already exists.";
		    			return;
		    		}
		    	}
		    	var desc = inp2.value? inp2.value.trim() : "";
		    	document.querySelector("#mainPanel").removeChild(mObj);
		    	clearScreen();
		    	callback(docName, desc, node.dataTxt);
		    };	    	
	    }
	    btnCancel.onclick = function() {
	    	document.querySelector("#mainPanel").removeChild(mObj); 
	    };
}

function clearScreen() {
	var wPanel = document.querySelector("#workArea");
	firstLine = activeLine = activeToken = 0;
	statusNode.innerHTML = "";
	var nText = document.querySelector("#selectedText");
	setSpanInEdit(false);
	nText.classList.remove("updated");
	nText.value = "";
	wPanel.innerHTML = "";
	docNameNode.innerHTML = "";
	var combos = document.querySelectorAll("select");
	for (var i = 0; i < combos.length; i++) {
		combos[i].classList.remove("error");
		combos[i].classList.remove("outofgroup");
		combos[i].selectedIndex = 0;
		combos[i].removeAttribute("disabled");
	}
	var lemma = document.querySelector("#lemma");
	lemma.classList.remove("error");
	lemma.value = "";
	lemma = document.querySelector("#vfh");
	lemma.value = "";
	lemma = document.querySelector("#vfl");
	lemma.value = "";
	lemma = document.querySelector("#lineNumber");
	lemma.value = "";
	lemma = document.querySelector("#textPosition");
	lemma.value = "";
	lemma = document.querySelector("#textLength");
	lemma.value = "";
	lemma = document.querySelector("#notsep");
	lemma.checked = false;
	var nodes = document.querySelectorAll(".notinuse");
	for (i = 0; i < nodes.length; i++) {
		nodes[i].classList.remove("notinuse");
	}

	doc = null;
}

function setSpanInEdit(inedit) {
	if (spanInEdit == inedit)
		return;
	spanInEdit = inedit;
	var toolspanel = document.querySelector(".toolsPanel");
	if (inedit)
		toolspanel.classList.toggle("infocus");
	else
		toolspanel.classList.remove("infocus");
}

var onError = function (tx, e) {
	  alert("There has been an error: " + e.message);
};

var onSuccess = function (tx, r) {
	  alert("OK");
};
