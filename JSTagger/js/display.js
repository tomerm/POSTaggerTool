/**
 * 
 */
var display = (function() {
	var workArea, div, para, span;
	var getNum = function(sLine) {
		sLine = sLine.substring(sLine.indexOf("N") + 1);
		if (sLine.indexOf(" ") > 0) 
			sLine = sLine.substring(0, sLine.indexOf(" "));
		return parseInt(sLine);
	};
	var getAppControl = function(span, token) {
		var checkFeature = function(comboId, value, enabled) {
			var combo = document.querySelector("#" + comboId);
			var curInd = combo.selectedIndex;
			var isDisabled = !!enabled && enabled == "N";
			if (!value)
				value = "";
			else if (value.toLowerCase() == "not selected")
				value = "";
			value = value.trim();
			var isErr = (!!enabled && ((enabled == "N" && value.length != 0) || (enabled == "Y" && value.length == 0)));
			if (isDisabled && value.length == 0) {
				combo.selectedIndex = curInd;
				return -1;
			}
			for (var k = 1; k<combo.options.length; k++) {
				if (combo.options[k].text.toLowerCase() == value.toLowerCase()) {
					if (isErr && !isDisabled) {
						addMark(token,"R");
					}
					else if(isErr) {
						addMark(token,"P");
					}
					combo.selectedIndex = curInd;
					return k;
				}
			}
			if (comboId == "pos")
				addMark(token, "R");
			else if(isErr && !isDisabled)
				addMark(token,"R");
			else if(!isDisabled && value.length > 0)
				addMark(token,"R");
			else 
				addMark(token,"P");
			combo.selectedIndex = curInd;
			return -1;
		};
		var addMark = function(token, mark) {
			if (mark == "R" || token.appMark == "")
				token.appMark = mark;
		};
		token.appMark = "";
		var cForLemma = token.pos.toLowerCase() == "punctuation" || token.pos.toLowerCase() == "foreign" || token.pos.toLowerCase() == "symbol" ||
		token.pos.toLowerCase() == "literal" || token.pos.toLowerCase() == "unknown";
		if (token.lemma.length == 0 && !cForLemma)
			addMark(token,"R");
		else if(token.lemma.length > 0 && cForLemma)
			addMark(token,"P");
		var combo = document.querySelector("#pos");
		var curInd = combo.selectedIndex;
		var ind = checkFeature("pos", token.pos || "Y");
		combo.selectedIndex = curInd;
		if (ind < 0)
			return;
		var opt = combo.options[ind];
		checkFeature("inflection", token.inflection, opt.dataInflection || "N");
		checkFeature("gender", token.gender, opt.dataGender || "N");
		checkFeature("number", token.number, opt.dataNumber || "N");
		checkFeature("person", token.person, opt.dataPerson || "N");
		checkFeature("tence", token.tence, opt.dataTence || "N");
		checkFeature("voice", token.voice, opt.dataVoice || "N");
		checkFeature("elipsis", token.elipsis, opt.dataElipsis || "N");
		addMark(token,"G");
	};
	
	return {
		display: function(doc, firstLine, linesOnPage) {
			workArea = document.querySelector("#workArea");
			workArea.innerHTML = "";
			firstLine = Math.max(firstLine, 0);
			if (linesOnPage > doc.lines.length) {
				linesOnPage = doc.lines.length;
			}
			if (firstLine > doc.lines.length - linesOnPage) {
				firstLine = doc.lines.length - linesOnPage;
			}
			for (var i=firstLine; i < (firstLine + linesOnPage); i++) {
				var lineDiv = document.createElement("div");
				lineDiv.className = "linediv";
				var numDiv = document.createElement("div");
				numDiv.className = "linenum";
				numDiv.innerHTML = "" + (i + 1);
				lineDiv.appendChild(numDiv);
				var lineContentDiv = document.createElement("div");
				lineContentDiv.className = "linecontentdiv";
				div = document.createElement("div");
				div.className = "divtags";
				lineContentDiv.appendChild(div);
				para = document.createElement("p");
				para.className = "para";
				if (window.showBorders) {
					para.classList.toggle("showborder");
				}
				para.classList.toggle("N" + i);
				for (var j=0; j<doc.lines[i].tokens.length; j++) {
					var token = doc.lines[i].tokens[j];
					span = document.createElement("span");
					span.className = "token";
					if (window.showBorders) {
						span.classList.toggle("showborder");
					}
					if (token.userMark == "G")
						span.classList.toggle("usergreen");
					else if(token.userMark == "P")
						span.classList.toggle("userpink");
					else if(token.userMark == "R")
						span.classList.toggle("userred");
					getAppControl(span, token);
					if (token.appMark == "G")
						span.classList.toggle("appgreen");
					else if(token.appMark == "P")
						span.classList.toggle("apppink");
					else if(token.appMark == "R")
						span.classList.toggle("appred");						
					span.classList.toggle("N" + j);
					span.innerHTML = token.text;
					span.onclick = function(e) {
						var lineNum = getNum(e.target.parentNode.className);
						var tokenNum = getNum(e.target.className);
						setSpanInEdit(false);
						display.setActive(window.doc, lineNum, tokenNum);
						window.activeLine = lineNum;
						window.activeToken = tokenNum;
					};
					para.appendChild(span);
					if (!token.notSeparated)
						para.appendChild(document.createTextNode(" "));
				}
				lineContentDiv.appendChild(para);
				lineDiv.appendChild(lineContentDiv);
				workArea.appendChild(lineDiv);
			}
			return firstLine;
		},
		
		setActive: function(doc, lineNum, tokenNum) {
			var selectFeature = function(comboId, value, enabled) {
				var combo = document.querySelector("#" + comboId);
				var label = document.querySelector("#td" + comboId);
				var isDisabled = !!enabled && enabled == "N";
				if (!value || value.toLowerCase() == "not selected")
					value = "";
				else
					value = value.trim();
				var isErr = (!!enabled && ((enabled == "N" && value.length != 0) || (enabled == "Y" && value.length == 0)));
				combo.classList.remove("error");
				label.classList.remove("notinuse");
				if (isDisabled) {
					combo.setAttribute("disabled", true);
					label.classList.toggle("notinuse");
				}
				else {
					combo.removeAttribute("disabled");
				}
				for (var k = 1; k<combo.options.length; k++) {
					if (combo.options[k].text.toLowerCase() == value.toLowerCase()) {
						combo.selectedIndex = k;
						if (isErr) {
							combo.classList.toggle("error");
						}
						return combo;
					}
				}
				combo.selectedIndex = 0;
				if (isErr || comboId == "pos" || !isDisabled)
					combo.classList.toggle("error");
				return combo;
			};
			span = document.querySelector(".token.active");
			if (span) {
				span.classList.remove("active");
				if (span.classList.contains("insplit"))
					span.classList.remove("insplit");
			}
			var sel = ".para.N" + lineNum + " .token.N" + tokenNum;
			span = document.querySelector(sel);
			if (!span) {
				alert("Active span isn't found, selector: " + sel);
				return false;
			}
			if (lineNum < doc.lines.length - 1)
				span.scrollIntoView(true);
			span.classList.toggle("active");
			span.classList.remove("showborder");
			if (window.isActiveHighlighted) {
				span.classList.toggle("insplit");
			}
			if (window.showBorders) {
				span.classList.toggle("showborder");
			}
			span.classList.remove("usergreen");
			span.classList.remove("userpink");
			span.classList.remove("userred");
			span.classList.remove("appgreen");
			span.classList.remove("apppink");
			span.classList.remove("appred");
			var node = document.querySelector("#selectedText");
			node.value = span.innerHTML;
			node = document.querySelector("#lineNumber");
			node.value = "" + (lineNum + 1);
			node = document.querySelector("#textPosition");
			node.value = "" + (tokenNum + 1);
			node = document.querySelector("#textLength");
			node.value = span.textContent.length;
			doc.lines[lineNum].tokens[tokenNum].isActive = true;
			var token = doc.lines[lineNum].tokens[tokenNum];
			node = document.querySelector("#notsep");
			if (token.notSeparated) {
				node.checked = true;
			}
			else {
				node.checked = false;
			}
			if (token.userMark == "G")
				span.classList.toggle("usergreen");
			else if(token.userMark == "P")
				span.classList.toggle("userpink");
			else if(token.userMark == "R")
				span.classList.toggle("userred");
			getAppControl(span, token);
			if (token.appMark == "G")
				span.classList.toggle("appgreen");
			else if(token.appMark == "P")
				span.classList.toggle("apppink");
			else if(token.appMark == "R")
				span.classList.toggle("appred");						
			node = document.querySelector("#lemma");
			node.value = token.lemma;
			
			var cForLemma = token.pos.toLowerCase() == "punctuation" || token.pos.toLowerCase() == "foreign" || token.pos.toLowerCase() == "symbol" ||
			token.pos.toLowerCase() == "literal" || token.pos.toLowerCase() == "unknown";
			if (token.lemma.length == 0 && !cForLemma) {
				node.classList.toggle("error");
			}
			else
				node.classList.remove("error");
			node = document.querySelector("#vfh");
			node.value = token.vfh;
			node = document.querySelector("#vfl");
			node.value = token.vfl;
			var combo = selectFeature("pos", token.pos);			
			var opt = combo.options[combo.selectedIndex];
			if (combo.selectedIndex == 0) {
				token.posg = "Err";
			}
			else
				token.posg = "";
			selectFeature("inflection", token.inflection, opt.dataInflection || "N");
			selectFeature("gender", token.gender, opt.dataGender || "N");
			selectFeature("number", token.number, opt.dataNumber || "N");
			selectFeature("person", token.person, opt.dataPerson || "N");
			selectFeature("tence", token.tence, opt.dataTence || "N");
			selectFeature("voice", token.voice, opt.dataVoice || "N");
			selectFeature("elipsis", token.elipsis, opt.dataElipsis || "N");
			tsv.saveTokenIntoDB(db, doc, lineNum, tokenNum);
			//var parent = span.parentNode;
			//window.statusNode.innerHTML = parent.className + " ---- " + span.className;
			return true;
		}
	};
})(display || {});