/**
 * 
 */
var tsv = (function() {
	var Document = (function() {
		var Document = function(name, description) {
			this.name = name;
			this.description = description;
			this.lines = [];
		};
		return Document;
	})();
	
	var Line = (function() {
		var Line = function(text, doc) {
			this.text = text;
			this.document = doc;
			this.hasActiveToken = false;
			this.cancelled = false;
			this.tokens = [];
		};
		return Line;
	})();
	
	var Token = (function() {
		var Token = function(line, features) {
			this.text = features[0];
			this.line = line;
			this.lemma = features[1]; 
			this.vfh = features[2];
			this.vfl = features[3]; 
			this.posg = "";
			this.pos = features[4]; 
			this.inflection = features[5]; 
			this.gender = features[6]; 
			this.number = features[7];
			this.person = features[8]; 
			this.tence = features[9]; 
			this.voice = features[10]; 
			this.elipsis = features[11];
			this.notSeparated = false;
			this.isActive = false;
			this.isPostponed = false;
			this.userMark = "";
			this.appMark = "";
		};
		return Token;
	})();

	var onErr = function (tx, e) {
		  alert("There has been an error: " + e.message);
	};

	return {
		loadDocument: function(docName, desc, txt) {
			var mapFromWebAnno = function(features) {
				if (!isWebanno)
					return features;
				if (features[4] === "Common Noun") {  
					features[4] = "Noun";
				}
				else if(features[4] === "Letter Numeral") {
					feaures[4] = "Letter Number";
				}
				if (features[5].indexOf("clitic") == 0) {
					features[5] = features[5].split("_").join(" ");
					features[5] = features[5].replace("clitic", "Clitic:");
				}
				return features;
			};
			var aresult = txt.split(/\r?\n/);
			var isWebanno = aresult[0].indexOf("# webanno.custom.BDL_PartOfSpeech") >= 0;
			var isJSTagger = aresult[0].indexOf("# jstagger") >= 0;
			if (!(isWebanno || isJSTagger)) {
				alert("Wrong TSV format.");
				return;
			}
			var doc = window.doc = new Document(docName, desc);
			var line = null;
			var token;
			var row;
			var mText = "";
			var mLength = 0;			
			var features;
			for (var i=0; i < aresult.length; i++) {
				row = aresult[i];
				if (row.match(/^#text=/)) {
					if (line != null) {
						doc.lines.push(line);
					}
					line = new Line(row.substring(6).trim(), doc);
				}
				else if(row.match(/^\{*\d+-\d+\}*/)) {
					if (line == null) {
						alert("Wrong TSV format.");
						return null;						
					}
					if (row.match(/#multiple-tags/)) {
						mText = row.split(/\t/)[1];
						mLength = 0;
						continue;
					}
					if (row.match(/^\{\d+-\d+\}/)) {
						features =  row.split(/\t/);
						var ownLen = parseInt(features[0].substring(features[0].indexOf("-")+1, features[0].indexOf("}")));
						features.unshift(mText.substring(mLength, mLength + ownLen));
						mLength += ownLen;
						features[1] = features[1].substring(features[1].indexOf("}") + 1);
					}
					else {
						features = row.split(/\t/).slice(1);
					}
					for (var k=0; k<features.length; k++) {
						if (isWebanno && features[k].indexOf("webanno")>=0 || isJSTagger && features[k].indexOf("----") >=0) {
							features[k] = "";
						}
					}
					token = new Token(line, mapFromWebAnno(features));
					if (isWebanno && row.match(/^\{/) && i < aresult.length-1 && aresult[i+1].match(/^\{\d+-\d+\}/)) {
						token.notSeparated = true; 
					}
					else if(isJSTagger && features[12] == "N") {
						token.notSeparated = true;
					}
					if (isJSTagger && features[13]) {
						token.userMark = features[13]; 						
					}
					line.tokens.push(token);
				}
			}
			if (line) {
				doc.lines.push(line);
			}
			return doc;
		},

		loadPlainText: function(docname, desc, txt) {
			var bounds = [".","!","?",",","(",")",";","-","=","+"];
			for (var i = 0; i < 3; i++) {
				txt = txt.split(bounds[i]).join(bounds[i] + "\n");
			}
			var aresult = txt.split(/\r?\n/);
			var doc = window.doc = new Document(docname, desc);
			var line, token, row;
			var n = 0;
			for (var i=0; i < aresult.length; i++) {
				row = aresult[i].trim();
				if (row.length == 0)
					continue;
				for (var j =0; j < bounds.length; j++) {
					row = row.split(bounds[j]).join(" " + bounds[j] + " ");
				}
				row = row.replace(/\s+/g, ' ');
				line = new Line(row, doc);
				doc.lines.push(line);
				n++;
				var aTokens = row.split(" ");
				for (j = 0; j < aTokens.length; j++) {
					sToken = aTokens[j];
					if (sToken.length == 0)
						continue;
					token = new Token(line, ["","","","","","","","","","","",""]);
					token.text = sToken;
					doc.lines[n-1].tokens.push(token);
				}
			}
			return doc;
		},
		
		saveIntoDB: function(db, doc) {
			var i = 0, j = 0;
			db.transaction(function (tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS document (name, description, lines integer)', [], null, onErr);
				tx.executeSql('INSERT INTO document (name, description, lines) VALUES (?,?,?)', [doc.name, doc.description, doc.lines.length], null, onErr);
			});
			db.transaction(function (tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS lines (docname, linenumber, text, tokens integer)', [], null, onErr);
				for (i=0; i<doc.lines.length; i++) {
					tx.executeSql('INSERT INTO lines (docname, linenumber, text, tokens) VALUES (?,?,?,?)', [doc.name, tools.formatKey(i), doc.lines[i].text, 
					    doc.lines[i].tokens.length], null, onErr);
				}
			});
			db.transaction(function (tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS tokens (docname, linenumber, tokennumber, text, lemma, \
						vfh, vfl, posg, pos, inflection, gender, number, person, tence, voice, elipsis, usermark, appmark, notseparated, active, \
						postponed)', [], null, onErr);						
				for(i=0; i<doc.lines.length; i++) {
					for (j=0; j<doc.lines[i].tokens.length; j++) {
						var token = doc.lines[i].tokens[j];
						tx.executeSql('INSERT INTO tokens (docname, linenumber, tokennumber, text, lemma, vfh, vfl, posg, pos, inflection, \
								gender, number, person, tence, voice, elipsis, usermark, appmark, notseparated, active, postponed) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
								[doc.name, tools.formatKey(i), tools.formatKey(j), token.text, token.lemma, token.vfh, token.vfl, token.posg, token.pos, 
								 token.inflection, token.gender, token.number, token.person, token.tence, token.voice, token.elipsis, 
								 token.userMark, token.appMark, (token.notSeparated? "Y" : "N"), (token.isActive? "Y" : "N"), (token.isPostponed? "Y" : "N")],
								 null, onErr);
					}
				}
			});
		},
		
		saveTokenIntoDB: function(db, doc, linenum, tokennum) {
			var token = doc.lines[linenum].tokens[tokennum];
			db.transaction(function (tx) {
				tx.executeSql('UPDATE tokens SET active = "N" WHERE docname = ? AND active = "Y"', [doc.name], null, onErr);
				tx.executeSql('UPDATE tokens SET text = ?, lemma = ?, vfh = ?, vfl = ?, posg = ?, pos = ?, inflection = ?, \
						gender = ?, number = ?, person = ?, tence = ?, voice = ?, elipsis = ?, usermark = ?, appmark = ?, notseparated = ?, active = ?, postponed = ? \
						WHERE docname = ? AND linenumber = ? AND tokennumber = ?',
						[token.text, token.lemma, token.vfh, token.vfl, token.posg, token.pos, token.inflection, token.gender, token.number, token.person,
						 token.tence, token.voice, token.elipsis, token.userMark, token.appMark, (token.notSeparated? "Y" : "N"), (token.isActive? "Y" : "N"), 
						 (token.isPostponed? "Y" : "N"), doc.name, tools.formatKey(linenum), tools.formatKey(tokennum)], null, onErr);
			});
		},
		
		saveLineTokensIntoDB: function(db, doc, linenum) {
			var line = doc.lines[linenum];
			var lineText = tools.getPlainText(line);
			db.transaction(function (tx) {
				tx.executeSql('DELETE FROM tokens WHERE docname = ? AND linenumber = ?', [doc.name, tools.formatKey(linenum)], null, onErr);
				tx.executeSql('UPDATE lines SET text = ?, tokens = ? WHERE docname = ? AND linenumber = ?', [lineText, line.tokens.length, 
				             doc.name, tools.formatKey(linenum)], null, onErr); 
			});
			db.transaction(function (tx) {
				for (var j=0; j<line.tokens.length; j++) {
					var token = line.tokens[j];
					tx.executeSql('INSERT INTO tokens (docname, linenumber, tokennumber, text, lemma, vfh, vfl, posg, pos, inflection, \
							gender, number, person, tence, voice, elipsis, usermark, appmark, notseparated, active, postponed) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
							[doc.name, tools.formatKey(linenum), tools.formatKey(j), token.text, token.lemma, token.vfh, token.vfl, token.posg, token.pos, 
							 token.inflection, token.gender, token.number, token.person, token.tence, token.voice, token.elipsis, token.userMark,
							 token.appMark, (token.notSeparated? "Y" : "N"), (token.isActive? "Y" : "N"), (token.isPostponed? "Y" : "N")],
							 null, onErr);
				}
			});			
		},
		
		deleteLineFromDB: function(db, doc, linenum) {
			db.transaction(function (tx) {
				tx.executeSql('DELETE FROM tokens WHERE docname = ? AND linenumber = ?', [doc.name, tools.formatKey(linenum)], null, onErr);
				tx.executeSql('DELETE FROM lines WHERE docname = ? AND linenumber = ?', [doc.name, tools.formatKey(linenum)], null, onErr);
				tx.executeSql('UPDATE document SET lines = ? WHERE name = ?', [doc.lines.length, doc.name], null, onErr); 
			});
		},
		
		deleteDocumentFormDB: function(db, docname) {
			db.transaction(function (tx) {
				tx.executeSql('DELETE FROM tokens WHERE docname = ?', [docname], null, onErr);
				tx.executeSql('DELETE FROM lines WHERE docname = ?', [docname], null, onErr);
				tx.executeSql('DELETE FROM document WHERE name = ?', [docname], null, onErr); 
			});			
		},
		
		loadDocumentFromDB: function(docName) {
			var linesnum = 0, tokensnum = 0, i, j;
			var prevActiveLine = -1, prevActiveToken = -1;
			var tokensinline = [];
			window.statusNode.innerHTML = 'Load document "' + docName + "'...";
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM document WHERE name=?', [docName], function(tx, results) {
					var row = results.rows[0];
					window.doc = new Document(row.name, row.description);
					//alert("Create document " + row.name + " having lines: " + row.lines);
					linesnum = row.lines;
				}, onErr);
			});
			db.transaction(function(tx) {
				for (i = 0; i <linesnum; i++) {
					n = 0;
					tx.executeSql('SELECT * FROM lines WHERE docname=? AND linenumber=?', [docName, tools.formatKey(i)], function(tx, results) {
						var row = results.rows[0];
						var line = new Line(row.text, window.doc);
						window.doc.lines.push(line);
						tokensinline.push(row.tokens);
						//alert("Create line " + window.doc.lines.length + " having tokens: " + row.tokens);
					}, onErr);					
				}
			});			
			db.transaction(function(tx) {
				var n = 0; m = 0;
				for (i = 0; i<linesnum; i++) {
					for (j = 0; j<tokensinline[i]; j++) {
						tx.executeSql('SELECT * FROM tokens WHERE docname=? AND linenumber=? AND tokennumber=?', 
								[docName, tools.formatKey(i), tools.formatKey(j)], function(tx, results) {
							var row = results.rows[0];
							var features = ["","","","","","","","","","",""];
							var token = new Token(window.doc.lines[n], features);
							token.text = row.text;
							token.lemma = row.lemma;
							token.vfh = row.vfh;
							token.vfl = row.vfl;
							token.pos = row.pos;
							token.inflection = row.inflection;
							token.gender = row.gender;
							token.number = row.number;
							token.person = row.person;
							token.tence = row.tence;
							token.voice = row.voice;
							token.elipsis = row.elipsis;
							token.posg = row.posg;
							token.notSeparated = row.notseparated == "Y";
							token.isActive = row.active == "Y";
							if (token.isActive) {
								prevActiveLine = n;
								prevActiveToken = m;
							}
							token.isPostponed = row.postponed == "Y";
							token.userMark = row.usermark;
							token.appMark = row.appMark;
							window.doc.lines[n].tokens.push(token);
							tokensinline.push(row.tokens);
							m++;
							if (m == tokensinline[n]) {
								n++;
								m = 0;
								if ( n == linesnum) {
									window.statusNode.innerHTML = "";
									if (prevActiveLine >= 0 && prevActiveToken >= 0 && !(prevActiveLine == 0 && prevActiveToken == 0)) {
										/*
										var conf = confirm("Do you want to continue from the end of the previous session with this document?");
										if (!conf) {
											window.doc.lines[prevActiveLine].tokens[prevActiveToken].isActive = false;
											tsv.saveTokenIntoDB(window.db, window.doc, prevActiveLine, prevActiveToken);
											prevActiveLine = prevActiveToken = 0;
										}
										*/
									}
									else {
										prevActiveLine = prevActiveToken = 0;
									}
									var clinesOnPage = parseInt(window.linesOnPage);
									var cfirstLine = Math.min(prevActiveLine, Math.max(0, n - clinesOnPage));
									window.firstLine = display.display(window.doc, cfirstLine, clinesOnPage);
									window.activeLine = prevActiveLine;
									window.activeToken = prevActiveToken;
									display.setActive(window.doc, prevActiveLine, prevActiveToken);
								}
							}
						}, onErr);											
					}
				}
			});
		},
		
		getNewToken: function(linenum) {
			var token = new Token(linenum, ["","","","","","","","","","","",""]);
			token.text = "***חדש***";
			return token;
		},
		
		getNewLine: function(doc, linenum) {
			var line = new Line("***חדש***", doc);
			var token = new Token(linenum, ["","","","","","","","","","","",""]);
			token.text = "***חדש***";
			line.tokens.push(token);
			return line;
		},
		
		updateNotActiveToken: function(doc, linenum, tokennum) {
			var set = false;
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM tokens WHERE docname = ? AND active = 1', [doc.name], function(tx, results) {
					var row = results.rows[0];
					var fLineNum = parseInt(row.linenumber);
					var fTokenNum = parseInt(row.tokennumber);
					if (!(linenum == fLineNum && tokennum == fTokenNum)) {
						doc.lines[fLineNum].tokens[fTokenNum].isActive = false;
						tx.executeSql('UPDATE tokens SET active = 0 WHERE docname = ? AND active = 1', [doc.name], null, onErr);
					}
				}, null, onErr);
			});
		},
		
		exportDocument: function(fs, doc, path) {
			var addFeatures = function() {
				var txt = "";
				for (var k = 0; k < arguments.length; k++) {
					txt += (arguments[k]? arguments[k] : "----") + "\t";
				}
				return txt;
			}
			var result = "# jstagger	| Lemma	| VocFormHeb | VocFormLatin | Part Of Speech | Inflection | Gender | Number | Person | Tence | Voice | Elipsis \n";
			for (var i = 0; i < doc.lines.length; i++) {
				var line = doc.lines[i];
				var lineText = tools.getPlainText(line);
				result += "#id=" + (i + 1) + "\n";
				result += "#text=" + lineText + "\n";
				for (var j = 0; j < doc.lines[i].tokens.length; j++) {
					var token = doc.lines[i].tokens[j];
					result += "" + (i+1) + "-" + (j + 1) + "\t" + addFeatures(token.text, token.lemma, token.vfh, token.vfl, token.pos, token.inflection,
							token.gender, token.number, token.person, token.tence, token.voice, token.elipsis) + (token.notSeparated? "N" : "S") + 
							"\t" + token.userMark + "\n";
				}
				result += "\n";
			}
			fs.writeFileSync(path, result);
		},
		
		exportTextContent: function(fs, doc, path) {
			var result = "";
			for (var i = 0; i < doc.lines.length; i++) {
				for (var j = 0; j < doc.lines[i].tokens.length; j++) {
					result += doc.lines[i].tokens[j].text;
					if (!doc.lines[i].tokens[j].notSeparated)
						result += " ";
					if (j == doc.lines[i].tokens.length - 1 && i != doc.lines.length - 1) {
						result += "\r\n";
					}
				}
			}
			fs.writeFileSync(path, result);
		}
	};
})(tsv || {});