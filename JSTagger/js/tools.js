/**
 * 
 */
var tools = (function() {
	return {
		formatKey: function(num,size) {
			if (!size) {
				size = 10;
			}
			var s = num + "";
			while (s.length < size) s = "0" + s;
			return s;
		},
		
		getPlainText: function(line) {
			var text = "";
			for (var i = 0; i < line.tokens.length; i++) {
				text += line.tokens[i].text;
				if (!line.tokens[i].notSeparated) {
					text += " ";
				}
			}
			return text.trim();
		}
	};
})();