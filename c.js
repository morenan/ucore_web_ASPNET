// Write your Javascript code.
		var rec = new Object();
		// ==================================================================================
		// 	User Interface
		// ==================================================================================
		var board 	 = document.getElementById("board");
		board.style.color = "#FFFFFF";
		board.style.fontFamily = "Courier";
		board.style.fontSize = 16;
		
		var ui = new Object();
		
		var line = 0, column = 0;
		var text = "", cmd = "";
		var ctrl_active = false;
		var pause_active = false;
		document.onkeypress = function(event) {
			event = (event != null) ? event : window.event;
			if (pause_active) {
				pause_active = false;
				ui.printAll(ui.rem_txt);
				return;	
			}
			if (!ctrl_active) return;
			if (event.keyCode == 13) {
				if (++line > 40) 
					text = text.slice(text.indexOf("<br>")+4);
				text = text + cmd + "<br>";
				board.innerHTML = text;
				if (cmd.slice(0, 4) == "load")
					ui.load(cmd.slice(5));
				else if (cmd.slice(0, 4) == "save")
					ui.save(cmd.slice(5));
				else if (cmd == "compile") 
					ui.compile();
				else 
					ui.usage();
				cmd = "";
				column = 0;
			} else if (event.keyCode == 8 && column > 0) {
				cmd = cmd.slice(0, cmd.length-1);
				board.innerHTML = text + cmd;
				column -= 1;
			} else if (event.charCode) {
				cmd += String.fromCharCode(event.charCode);
				board.innerHTML = text + cmd;
				column += 1;
			}
		}
		function print(str) {
			var s_tmp = "";
			for (var i = 0 ; i < str.length ; i++)
				if (str[i] == ' ') s_tmp += "&nbsp;";
	 	   else if (str[i] == '\t')s_tmp += "&nbsp;&nbsp;&nbsp;&nbsp;";
	 	   else if (str[i] == '$') {
	 	   			if (i > 0 && str[i-1] == '\'' && i+1 < str.length && str[i+1] == '\'')
	 	   				s_tmp += "EOF";
	 	   			else
	 	   				s_tmp += " ";
	 	   	}  
		   else s_tmp += str[i];
			text = text + s_tmp;
			board.innerHTML = text;
		}
		function println(str) {
			if (arguments[1] != null) {
				alert(arguments[1]);
				str = "<a color="+arguments[1]+">"+str+"</a>";
			}
			if (++line > 38) 
				text = text.slice(text.indexOf("<br>")+4);
			var s_tmp = "";
			for (var i = 0 ; i < str.length ; i++)
				if (str[i] == ' ') s_tmp += "&nbsp;";
	 	   else if (str[i] == '\t')s_tmp += "&nbsp;&nbsp;&nbsp;&nbsp;";
	 	   else if (str[i] == '$') {
	 	   			if (i > 0 && str[i-1] == '\'' && i+1 < str.length && str[i+1] == '\'')
	 	   				s_tmp += "EOF";
	 	   			else
	 	   				s_tmp += " ";
	 	   	}  
		   else s_tmp += str[i];
			text = text + s_tmp + "<br>";
			board.innerHTML = text;
			cmd = "";
			column = 0;
		}
		function parseHex(word) {
			var ret = 0;
			for (var i = 2 ; i < word.length ; i++)
				if (/[0-9]/.test(word.slice(i, i+1))) 
					ret = (ret<<4)+String.fromCharCode(word[i])-String.fromCharCode('0');
				else if (/[A-F]/.test(word.slice(i, i+1)))
					ret = (ret<<4)+String.fromCharCode(word[i])-String.fromCharCode('A')+10;
				else
					ret = (ret<<4)+String.fromCharCode(word[i])-String.fromCharCode('a')+10;
			return ret;
		}
		function totext(ibin) {
			return String.fromCharCode((ibin>>24)&255) + 
				   String.fromCharCode((ibin>>16)&255) +
				   String.fromCharCode((ibin>>8) &255) +
				   String.fromCharCode(ibin      &255);
		}
		// ==================================================================================
		// 	Reverse words
		// ==================================================================================
		var rw = new Array("if", "then", "else", "do", "while", "for", 		  		   // condition structure
			   	  		   "switch", "case", "default",								   // switch structure
			      		   "break", "continue", "return", 					 		   // pause
			      		   "void", "char", "short", "int", "long", "float", "double",  // basic datatype
			      		   "class", "struct", "typename",                              // something defined
			      		   "const", "static", "unsigned", 				  			   // attribute
			      		   "public", "private", "protected",						   // security
						   "uchar", "ushort", "uint"								   // unsigned datatype      		   
		);
		// ==================================================================================
		// 	keywords
		// ==================================================================================
		var op = new Array("+", "-", "*", "/", "%", "&", "|", "^", "!", "~", 
						   "<", ">", "?", ":", ",");								   // operator keyword
		var op_up = new Array("++", "--", "!", "~", "*", "-");						   // previous operator
		var op_us = new Array("++", "--");											   // succeed operator
		var op_b =  new Array("+", "-", "*", "/", "%", ",",
							  "&", "|", "^", "&&", "||", "<", ">", "<<", ">>");	       // binary operator
		var op_as = new Array("=", "+=", "-=", "*=", "/=", "%=",
							  "<<=", ">>=", "|=", "&=", "^=");						   // assign operator
		var op_r = {};														   		   // operator priority
		var op_t = {};																   // operator token for etree
		var op_rt = {};																   // operator label for token
		var op_st = {};																   // operator structure type
		var br = new Array("(", ")", "[", "]", "{", "}", 
						   "\'", "\'", "\"", "\"", "/*", "*/"); 					   // bracket
		var insts = new Array(
			"HALT","ENT","LEV","JMP","JMPI","JSR","JSRA","LEA","LEAG","CYC","MCPY","MCMP","MCHR","MSET",
			"LL","LLS","LLH","LLC","LLB","LLD","LLF","LG","LGS","LGH","LGC","LGB","LGD","LGF","LX","LXS","LXH","LXC","LXB","LXD","LXF","LI","LHI","LIF",
			"LBL","LBLS","LBLH","LBLC","LBLB","LBLD","LBLF","LBG","LBGS","LBGH","LBGC","LBGB","LBGD","LBGF","LBX","LBXS","LBXH","LBXC","LBXB","LBXD","LBXF","LBI","LBHI","LBIF","LBA","LBAD",
			"SL","SLH","SLB","SLD","SLF","SG","SGH","SGB","SGD","SGF","SX","SXH","SXB","SXD","SXF",
			"ADDF","SUBF","MULF","DIVF","ADD","ADDI","ADDL","SUB","SUBI","SUBL","MUL","MULI","MULL","DIV","DIVI","DIVL","DVU","DVUI","DVUL","MOD","MODI","MODL","MDU","MDUI","MDUL",
			"AND","ANDI","ANDL","OR","ORI","ORL","XOR","XORI","XORL","SHL","SHLI","SHLL","SHR","SHRI","SHRL","SRU","SRUI","SRUL","EQ","EQF","NE","NEF",
			"LT","LTU","LTF","GE","GEU","GEF","BZ","BZF","BNZ","BNZF","BE","BEF","BNE","BNEF","BLT","BLTU","BLTF","BGE","BGEU","BGEF",
			"CID","CUD","CDI","CDU","CLI","STI","RTI","BIN","BOUT","NOP","SSP","PSHA","PSHI","PSHF","PSHB","POPB","POPF","POPA","IVEC","PDIR","SPAG","TIME","LVAD","TRAP","LUSP","SUSP","LCL","LCA","PSHC","POPC","MSIZ","PSHG","POPG",
			"NET1","NET2","NET3","NET4","NET5","NET6","NET7","NET8","NET9",
			"POW","ATN2","FABS","ATAN","LOG","LOGT","EXP","FLOR","CEIL","HYPO","SIN","COS","TAN","ASIN","ACOS","SINH","COSH","TANH","SQRT","FMOD","IDLE"
		);
		var i_id = {};
		
	  	op_t["+"] = "ADD";
	  	op_t["-"] = "SUB";
	  	op_t["*"] = "MULT";
	  	op_t["/"] = "DIV";
	  	op_t["%"] = "MOD";
	  	op_t["&"] = "AND";
	  	op_t["|"] = "OR";
	  	op_t["^"] = "XOR";
	  	op_t["!"] = "NETZ";
	  	op_t["~"] = "NOT";
	  	op_t["<"] = "LESS";
	  	op_t[">"] = "MORE";
	  	op_t["="] = "ASSIGN";
	  	op_t["?"] = "IF";
	  	op_t[":"] = "ELSE";
	  	//op_t[","] = "NEXT";
	  	op_t["=="] = "EQUAL";
	  	op_t["!="] = "NOTEQUAL";
	  	op_t["<="] = "NOTMORE";
	  	op_t[">="] = "NOTLESS";
	  	op_t["<<"] = "SLL";
	  	op_t[">>"] = "SRL";
	  	op_t[">>>"] = "SRA"; 
	  	op_t["||"] = "BOOLOR";
	  	op_t["&&"] = "BOOLAND";
	  	op_t["++"] = "INC";
	  	op_t["--"] = "DEC";
	  	op_t["."] = "NUMBER";
	  	op_t["->"] = "PNUMBER";
	  	op_t["+="] = op_t["="] + op_t["+"];
	  	op_t["-="] = op_t["="] + op_t["-"];
	  	op_t["*="] = op_t["="] + op_t["*"];
	  	op_t["/="] = op_t["="] + op_t["/"];
	  	op_t["&="] = op_t["="] + op_t["&"];
	  	op_t["|="] = op_t["="] + op_t["|"];
	  	op_t["%="] = op_t["="] + op_t["%"];
	  	op_t["<<="] = op_t["="] + op_t["<<"];
	  	op_t[">>="] = op_t["="] + op_t[">>"];
	  	
	  	for (var key in op_t)
	  		op_rt[op_t[key]] = key;
	  	for (var i = 0 ; i < insts.length ; i++)
	  		i_id[insts[i]] = i;
	  	op_rt["REVERSE"] = "-";  
	  	
	  	op_st["ADD"]  = op_st["SUB"]   = op_st["MULT"]    = op_st["DIV"]     = op_st["MOD"] 
	  = op_st["AND"]  = op_st["OR"]    = op_st["XOR"]     = op_st["BOOLAND"] = op_st["BOOLOR"]
	  = op_st["SLL"]  = op_st["SRL"]   = op_st["SRA"]
	  = op_st["LESS"] = op_st["MORE"]  = op_st["NOTLESS"] = op_st["NOTMORE"] 
	  = op_st["EQUAL"] = op_st["NOTEQUAL"] = "BINARY";
	  	op_st["NETZ"] = op_st["NOT"]   = op_st["CONV"]    = op_st["PADDR"]   
	  = op_st["ADDR"] = op_st["REVERSE"] = "UNITL";
	  	op_st["OFFSET"] = "UNITR"; 
	  	op_st["INC"]  = op_st["DEC"] = "UNITLR";
	  	op_st["ASSIGN"]   = op_st[op_t["+="]] = op_st[op_t["-="]]  = op_st[op_t["*="]]
	  = op_st[op_t["&="]] = op_st[op_t["|="]] = op_st[op_t["^="]]  = op_st[op_t["%="]]
	  = op_st[op_t["/="]] = op_st[op_t["<<="]] = op_st[op_t[">>="]] = "BINARY";
	  	op_st["NUMBER"] = op_st["PNUMBER"] = "BINARY";
	  	op_st["IF"] = "IF";
	  	op_st["ELSE"] = "ELSE";
	  	
	  	op_r["NUMBER"] = op_r["PNUMBER"] = 0;
		op_r["OFFSET"] = 0;
		op_r["NEGA"]   = op_r["INC"]   = op_r["DEC"]  = op_r["NETZ"]
	  = op_r["PADDR"]  = op_r["NOT"]   = op_r["ADDR"] = op_r["REVERSE"] = op_r["CONV"] = 2;
	    op_r["MULT"]   = op_r["DIV"]   = op_r["MOD"] = 3;
	    op_r["ADD"]    = op_r["SUB"] = 4;
	    op_r["SLL"]	   = op_r["SRL"]   = op_r["SRA"] = 5;
	    op_r["LESS"]   = op_r["MORE"]  = op_r["NOTLESS"] = op_r["NOTMORE"] = 6;
	    op_r["EQUAL"]  = op_r["NOTEQUAL"] = 7; 
	    op_r["AND"] = 8;
	    op_r["XOR"] = 9;
	    op_r["OR"] = 10;
	    op_r["BOOLAND"] = 11;
	    op_r["BOOLOR"] = 12;
		op_r["IF"] = op_r["ELSE"] = 13;
		op_r["ASSIGN"]    = op_r[op_t["+="]]  = op_r[op_t["-="]]  = op_r[op_t["*="]]
	  = op_r[op_t["&="]]  = op_r[op_t["|="]]  = op_r[op_t["^="]]  = op_r[op_t["%="]]
	  = op_r[op_t["/="]]  = op_r[op_t["<<="]] = op_r[op_t[">>="]] = 14;
	  	op_r["NEXT"] = 15;
	  	
	  	function l_bracket(ch) {
	  		for (var i = 0 ; i < br.length ; i += 2) 
	  			if (br[i] == ch) return true;
	  		return false;
	  	}
	  	function r_bracket(ch) {
	  		for (var i = 1 ; i < br.length ; i += 2) 
	  			if (br[i] == ch) return true;
	  		return false;
	  	}
	  	
		// ==================================================================================
		// 	Record
		// ==================================================================================
		var ADDR_CONST = 0x4000, ADDR_STATIC = 0x6000;
		
		rec.filename = "";
		rec.text = "";
		rec.t_line = null;
		rec.t_column = null;
		rec.labels = {};
		rec.types = {};
		rec.vars = {};
		rec.addr_ct = {};
		rec.sizeof = {};
		rec.loops = {};
		rec.swits = {};
		rec.stack_sz = {};
		rec.brackets = 0;
		rec.error_ct = 0;
		rec.c_data = "";
		rec.typedef = {};
		rec.initialize = function() {
			this.types = {};
			this.vars = {};
			this.addr_ct = {};
			this.sizeof = {};
			this.loops = {};
			this.swits = {};
			this.stack_sz = {};
			this.typedef = {};
			this.brackets = 0;
			this.error_ct = 0;
			this.sizeof["bool"] = this.sizeof["char"] = this.sizeof["uchar"] = 1;
			this.sizeof["short"] = this.sizeof["ushort"] = 2;
			this.sizeof["int"] = this.sizeof["uint"] = 4;
			this.sizeof["long"] = this.sizeof["ulong"] = 8;
			this.sizeof["void"] = 1;
			this.sizeof["float"] = 4;
			this.sizeof["double"] = 8;
			this.addr_ct[""] = 0;
			this.c_data = "";
		}
		rec.clone = function() {
			var rec_c = new Object();
			rec_c.filename = "";
			rec_c.text = "";
			rec_c.t_line = null;
			rec_c.t_column = null;
			
			rec_c.types = this.types;
			rec_c.vars = this.vars;
			rec_c.addr_ct = this.addr_ct;
			rec_c.sizeof = this.sizeof;
			rec_c.loops = this.loops;
			rec_c.swits = this.swits;
			rec_c.stack_sz = this.stack_sz;
			rec_c.brackets = this.brackets;
			rec_c.error_ct = this.error_ct;
			rec_c.c_data = this.c_data;
			rec_c.typedef = this.typedef;
			
			rec_c.setType = this.setType;
			rec_c.getType = this.getType;
			rec_c.isStructtype = this.isStructtype;
			rec_c.setVariable = this.setVariable;
			rec_c.getVariable = this.getVariable;
			rec_c.createBracket = this.createBracket;
			rec_c.setText = this.setText;
			rec_c.printl = this.printl;
			return rec_c;
		}
		rec.setType = function(et) {
			this.types[et.name] = et;
		}
		rec.getType = function(name) {
			for (var i = 12 ; i < 19 ; i++)
				if (name == rw[i]) {
					var ret = new Object();
					ret.type = "basic";
					ret.name = name;
					ret.text = null;
					return ret;
				}
			for (var i = 28 ; i < 31 ; i++)
				if (name == rw[i]) {
					var ret = new Object();
					ret.type = "basic";
					ret.name = name;
					ret.text = null;
					return ret;
				}
			while (this.typedef[name])
				name = this.typedef[name];
			return this.types[name];
		}
		rec.isStructtype = function(name) {
			return (this.types[name] != null);
		}
		rec.setVariable = function(et, prev) {
			this.vars[prev+et.name] = et;
		}
		rec.getSwitch	= function(name) {
			//println("getSwitch name="+name);
			var i = 0, j = name.lastIndexOf("::");
			if (j != -1)
				i = name.lastIndexOf("::", j-1)+2; 
			if (i == 1) i = 0;
			return (this.swits[name]!=null) ? this.swits[name] : (j == -1 ? null : this.getSwitch(name.slice(0, i)+name.slice(j+2)));
		}
		rec.getLoop		= function(name) {
			var i = 0, j = name.lastIndexOf("::");
			if (j != -1)
				i = name.lastIndexOf("::", j-1)+2; 
			if (i == 1) i = 0;
			return (this.loops[name]!=null) ? this.loops[name] : (j == -1 ? null : this.getLoop(name.slice(0, i)+name.slice(j+2)));
		}
		rec.getVariable = function(name) {
			var i = 0, j = name.lastIndexOf("::");
			if (j != -1)
				i = name.lastIndexOf("::", j-1)+2; 
			if (i == 1) i = 0;
			return (this.vars[name]!=null) ? this.vars[name] : (j == -1 ? null : this.getVariable(name.slice(0, i)+name.slice(j+2)));
		}
		rec.setLabel = function(et, prev) {
			this.labels[prev+et.name] = et;
		} 
		rec.getLabel = function(name) {
			var i = 0, j = name.lastIndexOf("::");
			if (j != -1)
				i = name.lastIndexOf("::", j-1)+2; 
			if (i == 1) i = 0;
			return (this.labels[name]!=null) ? this.labels[name] : (j == -1 ? null : this.getLabel(name.slice(0, i)+name.slice(j+2)));
		}
		rec.createBracket = function() {
			return "b" + (++this.brackets);
		}
		rec.getStackSize = function(prev) {
			var i = prev.indexOf("::");
			return (i != -1) ? this.stack_sz[prev.slice(0, i+2)] : 0; 
		}
		rec.setText = function(text) {
			//println("setText b1");
			this.text = text;
			this.t_line = new Array(text.length);
			this.t_column = new Array(text.length);
			this.t_line[0] = 1;
			this.t_column[0] = 1;
			//println("setText b2 length="+text.length);
			for (var i = 0 ; i < text.length-1; i++)
				switch (this.text[i]) {
					case '\n' : 
						this.t_line[i+1] = this.t_line[i]+1;
						this.t_column[i+1] = 1;
						break;
					default :
						this.t_line[i+1] = this.t_line[i];
						this.t_column[i+1] = this.t_column[i]+1;
						break;
				}
		}
		rec.printl = function(id) {
			var label_id = 0;
			while (id > 0 && this.text[id-1] != '\n') {
				id--; label_id++;
			}
			var end = id;
			while (end < this.text.length && this.text[end] != '\n') end++;
			var ltxt = this.text.slice(id, end), label = "";
			println(ltxt);
			for (var i = 0 ; i < ltxt.length ; i++)
				if (i == label_id)
					label += '^';
				else if (ltxt[i] != ' ' && ltxt[i] != '\t')
					label += ' ';
				else
					label += ltxt[i];
			println(label);
		}
		// ==================================================================================
		// 	Word Analysis
		// ==================================================================================
		var w_ana = new Object();
		w_ana.text = "";
		w_ana.rec = rec;
		w_ana.error = function(id, msg) {
			this.rec.error_ct++;
			println(this.rec.filename + " [" + this.rec.t_line[id] + "," + this.rec.t_column[id] + "] : " + msg);
			this.rec.printl(id);
			var et = new Object();
			et.msg = msg;
			et.type = "error";
			et.end = this.text.length;
			alert("error");
			return et;
		}
		w_ana.spaceskip = function(start) {
			var i = start;
			while (true) {
				for ( ; this.text[i] == ' ' || this.text[i] == '\t' || this.text[i] == '\n'; i++) ;
				if (this.text.slice(i, i+2) == "//") {
					i = this.text.indexOf('\n', i)+1;
					continue;
				}
				if (this.text.slice(i, i+2) == "/*") {
					i = this.text.indexOf("*/", i)+2;
					continue;
				}
				break;
			}
			return i;
		}
		w_ana.alphaskip = function(start) {
			var i;
			for (i = start ; /[0-9A-Za-z_]/.test(this.text.slice(i, i+1)) ; i++);
			return i;
		}
		w_ana.isEndCode = function(ch, type) {
			switch (type) {
				case "expr" : return (ch==')')||(ch==']')||(ch==';')||(ch==',')||(ch=='}');
				case "stmt" : return (ch==';');
				case "para" : case "c_code" : return (ch=='}');
				default : return ch==null;
			}
		}
		w_ana.getEnd = function(et) {
			return (et.next != null) ? this.getEnd(et.next) : et.end;
		}
		w_ana.getVEnd = function(et) {
			return (et.v_next != null) ? this.getVEnd(et.v_next) : et.end;
		}
		w_ana.empty_tree = function(end) {
			var et = new Object();
			et.type = "empty";
			et.end = end;
			return et;
		}
		w_ana.analysis = function(start, prev, type) {
			var et = new Object();
			var i = start, j = start, k = start;
			var word = null;
			if (start >= this.text.length)
				return empty_tree(this.text.length);
			if (type != "string" && type != "char")
				i = this.spaceskip(i);
			if (this.text.slice(i, i+2) == "//") {
				i = this.text.indexOf("\n", i);
				if (i == -1) return this.error(this.text.length, "expected '\\n'"); 
				return this.analysis(i+1, prev, type);
			}
			if (this.text.slice(i, i+2) == "/*") {
				i = this.text.indexOf("*/", i); 
				if (i == -1) return this.error(this.text.length, "expected '*/'");
				return this.analysis(i+2, prev, type);
			}
			if (i >= this.text.length)
				return empty_tree(this.text.length);
			//println("word analysis start=" + i + ", prev=" + prev + ", type=" + type + " head=" + this.text[i]+" length="+this.text.length);
			switch (type) {
				case "code" :
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					j = this.spaceskip(j);
					switch (word) {
						case "struct" :
							et 		= this.analysis(j, 		  prev, "class");
							if (et.type == "error")
								return et;
							et.next = this.analysis(et.end+1, prev, "code");
							if (et.next.type == "error")
								return et.next;
							this.rec.setType(et);
							return et;
						case "enum" :
							et.type = "enum";
							if (this.text[j] != '{') 
								return this.error(j, "expected '{' after 'enum'");
							et.text = this.analysis(j+1, prev, "enum");
							if (et.text.type == "error")
								return et.text;
							et.end = this.spaceskip(this.getEnd(et.text)+1);
							if (this.text[et.end] != ';')
								return this.error(et.end, "expected ';'");
							et.next = this.analysis(et.end+1, prev, "code");
							if (et.next.type == "error")
								return et.next;
							return et;
						case "typedef" :
							et.type = "typedef";
							et.value = this.analysis(j, prev, "typedef");
							if (et.value.type == "error")
								return et.value;
							et.end = et.value.end;
							et.next = this.analysis(et.end+1, prev, "code");
							if (et.next.type == "error")
								return et.next;
							return et;
						case "unsigned" :
							et = this.analysis(j, prev, "code");
							if (et.type == "error")
								return et;
							et.s_type = "u" + et.s_type;
							et.next = this.analysis(et.end+1, prev, "code");
							if (et.next.type == "error")
								return et.next;
							return et;
						case "" :
							//alert("code text[j]="+this.text[j]);
							switch (this.text[j]) {
								case "$" : return this.empty_tree(j);
								case "#" : 
									if (this.text.slice(j+1, j+8) == "include") {
										i = this.spaceskip(j+8);
										if (this.text[i] != '<') 
											return this.error(i, "#include expects \"FILENAME\" or \\<FILENAME\\>");
										for (j=++i ; this.text[j] != '>' ; j++) ;
										word = this.text.slice(i, j);
										et.type = "include";
										et.filename = word;
										et.text = ui.analysis(this.rec, word);
										if (et.text.type == "error")
											return et.text;
										et.end = j;
										et.next = this.analysis(j+1, prev, "code");
										if (et.next.type == "error")
											return et.next;
										return et;
									}
									i = j; j = this.alphaskip(j+1); word = this.text.slice(i, j);
									return this.error(i, "invalid preprocessing directive "+word);
								default :  return this.error(j, "Synatx error at '" + this.text[j] + "'");
							}
						default : 
							if (this.text[j] == '(') {
								/*
								if (this.rec.getVariable(prev+word) != null)
									et = this.rec.getVariable(prev+word);
								else {*/
									et.type = "func";
									et.s_type = "int";
									et.name = word;
									this.rec.setVariable(et, prev);
								//}
								et.reg = this.analysis(j+1, prev+et.name+"::", "f_reg");
								if (et.reg.type == "error")
									return et.reg;
								for (var er = et.reg ; er != null ; er = er.next) {
									if (er.type == "empty") continue;
									if (er.type == "va_list_args")
										this.rec.vars[prev+et.name+"::"+er.type] = er;
									else
										this.rec.setVariable(er, prev+et.name+"::");
								}
								i = (et.reg != null) ? this.spaceskip(this.getEnd(et.reg)+1) : this.spaceskip(this.spaceskip(j+1)+1);
								switch (this.text[i]) {
									case ';' : 
										et.text = this.empty_tree(i); et.end = i; 
										return this.analysis(i+1, prev, "code");
									case '{' : et.text = this.analysis(i+1, prev+et.name+"::", "para"); et.end = this.getEnd(et.text)+1; break;
									default  : return this.error(i, "Synatx error at '" + this.text[i] + "'");
								}
								if (et.text.type == "error")
									return et.text;
								et.next = this.analysis(this.getEnd(et.text)+1, prev, "code");
								if (et.next.type == "error")
									return et.next;
								return et;
							}
							et = this.analysis(j, prev, "type");
							if (et.type == "error")
								return et;
							for (var ev = et ; ev != null && ev.type != "empty" ; ev = ev.v_next) 
								ev.s_type = word + ev.s_type;
							//println("type end at " + et.end + " text="+this.text[et.end]);
							if (this.rec.getType(word) == null) {
								var tmp = et.end;
								et = this.error(i, "'" + word + "' uncleared");
								et.end = tmp;
							}
							// skip prenonance
							if (et.type == "func" && this.text[et.end] == ';') {
								//alert("skip");
								return this.analysis(this.getVEnd(et)+1, prev, "code");
							}
							et.next = this.analysis(this.getVEnd(et)+1, prev, "code");
							if (et.next.type == "error")
								return et.next;
							return et;
					}
				case "typedef" :
					et.type = "typedef";
					et.s_type2 = "";
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					if (word == "unsigned") {
						et.s_type2 = "u";
						i = this.spaceskip(j);
						j = this.alphaskip(i);
						word = this.text.slice(i, j);
					}
					et.s_type2 += word;
					i = this.spaceskip(j);
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					et.s_type1 = word;
					this.rec.typedef[et.s_type1] = et.s_type2;
					if (this.text[j] != ';')
						return this.error(j, "expected ';'");
					et.end = j;
					return et; 
				case "para" :
					if (this.text[i] == '}') 
						return this.empty_tree(i);
					et 		= this.analysis(i,        prev, "stmt");
					if (et.type == "empty")
						return et;
					if (et.type == "error") {
						if (et.msg == "Synatx error at '$'")
							return this.error(i, "expected '}'");
						var b_ct = 1;
						for (j = i ; b_ct > 0 ; j++) {
							if (this.text[j] == '$') break;
							if (this.text[j] == '\"') b_ct = b_ct^(1<<14);
							if (this.text[j] == '\'') b_ct = b_ct^(1<<15);
							if (l_bracket(this.text[j])) b_ct++;
							if (r_bracket(this.text[j])) b_ct--;
							if (b_ct <= 0) break;
						}
						if (this.text[j] != '}')
							return this.error(j, "expected '}'");
						return this.empty_tree(j);
					}
					et.next = this.analysis(this.getVEnd(et)+1, prev, "para");
					if (et.next.type == "error")
						return et.next;
					return et;
				case "stmt" :
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					j = this.spaceskip(j);
					//println("type=stmt word="+word+" i="+i+" j="+j+" text[j]="+this.text[j]);
					switch (word) {
						case "" :
							switch (this.text[j]) {
								case '{': 
									et.type = "para";
									et.bracket = this.rec.createBracket();
									et.text = this.analysis(j+1, prev+et.bracket+"::", "para");
									if (et.text.type == "error")
										return et.text;
									et.end = this.getEnd(et.text);
									if (this.text[et.end] != '}')
										return this.error(et.end, "Synatx error at '" + this.text[et.end] + "'");
									return et;
								case '}': case ';':
									return this.empty_tree(j);
								case '#' :
									if (this.text.slice(j+1, j+10) == "forcecall") {
										i = this.spaceskip(j+10);
										if (this.text[i] != '(')
											return this.error(i, "#forcecall expects '('");
										j = this.alphaskip(i+1);
										if (this.text[j] != ')')
											return this.error(j, "#forcecall expects ')'");
										word = this.text.slice(i+1, j);
										et.type = "forcecall";
										et.call = word;
										et.end = j;
										return et;
									}
								default:
									return this.analysis(i, prev, "expr");
							}
						case "static":
							et = this.analysis(j, "", "stmt");
							return et;		
						case "goto" :
							et.type = "goto";
							i = j, j = this.alphaskip(j);
							et.label = this.text.slice(i, j);
							if (this.text[j] != ';')
								return this.error(j, "expected ';' after 'goto'");
							et.end = j;
							return et;
						case "va_list" :
							et.type = "var";
							et.s_type = "void*";
							i = j, j = this.alphaskip(j);
							et.name = this.text.slice(i, j);
							if (this.text[j] != ';')
								return this.error(j, "expected ';' after 'va_list'");
							et.value = new Object();
							et.value.type = "va_list";
							this.rec.setVariable(et, prev);
							et.end = j;
							return et;
						case "unsigned" :
							et = this.analysis(j, prev, "stmt");
							if (et.type == "error")
								return et;
							et.s_type = "u" + et.s_type;
							return et;
						case "struct" :
							return this.analysis(j, prev, "class");
						case "if" :
							et.type = "if";
							if (this.text[j] == '(') 
								et.cond = this.analysis(j+1, prev, "expr");
							else
								return this.error(j, "Expected '(' after 'if'");
							if (et.cond.type == "error")
								return et.cond;
							i = this.spaceskip(et.cond.end+1);
							et.stmt = this.analysis(i, prev, "stmt");
							if (et.stmt.type == "error")
								return et.stmt;
							i = this.spaceskip(et.stmt.end+1);
							if (this.text.slice(i, i+4) == "else") {
								et.e_stmt = this.analysis(i+5, prev, "stmt");
								et.end = et.e_stmt.end;
							} else {
								et.e_stmt = this.empty_tree(et.stmt.end);
								et.end = et.stmt.end;
							}
							if (et.e_stmt.type == "error") 
								return et.e_stmt;
							return et;
						case "while" :
							et.type = "while";
							if (this.text[j] == '(') 
								et.cond = this.analysis(j+1, prev, "expr");
							else
								return this.error(i, "Expected '(' after 'while'");
							if (et.cond.type == "error")
								return et.cond;
							i = this.spaceskip(et.cond.end+1);
							et.stmt = this.analysis(i, prev, "stmt");
							if (et.stmt.type == "error")
								return et.stmt;
							et.end = et.stmt.end;
							return et;
						case "for" :
							et.type = "for";
							if (this.text[j] == '(')
								et.s_expr = this.analysis(j+1, prev, "expr");
							else
								return this.error(j, "Expected '(' after 'for'");
							if (et.s_expr.type == "error")
								return et.s_expr;
							i = et.s_expr.end;
							if (this.text[i] == ';')
								et.c_expr = this.analysis(i+1, prev, "expr");
							else
								return this.error(i, "Synatx error at '" + this.text[i] + "'");
							if (et.c_expr.type == "error")
								return et.c_expr;
							i = et.c_expr.end;
							if (this.text[i] == ';')
								et.e_expr = this.analysis(i+1, prev, "expr");
							else	
								return this.error(i, "Synatx error at '" + this.text[i] + "'");
							if (et.e_expr.type == "error")
								return et.e_expr;
							i = et.e_expr.end;
							if (this.text[i] != ')')  
								return this.error(i, "Synatx error at '" + this.text[i] + "'");
							et.stmt = this.analysis(i+1, prev, "stmt");
							if (et.stmt.type == "error")
								return et.stmt;
							et.end = et.stmt.end;
							return et;
						case "switch" :
							if (this.text[j] != '(')
								return this.error(j, "expect '(' after 'switch'");
							et.type = "switch";
							et.expr = this.analysis(j+1, prev, "expr");
							j = this.spaceskip(et.expr.end+1);
							if (this.text[j] != '{')
								return this.error(j, "expect '{' after 'switch'");
							et.bracket = this.rec.createBracket();
							et.text = this.analysis(j+1, prev+et.bracket+"::", "s_code");
							//println("type=switch br="+et.bracket);
							//alert("switch text end");
							if (et.text.type == "error")
								return et.text;
							et.end = this.getEnd(et.text);
							return et;
						case "return" :
							et.type = "return";
							if (j == ';') {
								et.value = this.empty_tree(j);
								et.end = j;
								return et;
							}
							et.value = this.analysis(j, prev, "expr");
							et.end = et.value.end;
							return et;
						case "break" :
							et.type = "break";
							et.end = j;
							return et;
						case "continue" :
							et.type = "continue";
							et.end = j;
							return et;
						case "asm" :
							et.type = "asm";
							if (this.text[j] != '(')
								return this.error(j, "Expected '(' after 'asm'");
							i = this.spaceskip(j+1); j = i;
							while (/[A-Z0-9]/.test(this.text.slice(j, j+1))) j++;
							et.inst = this.text.slice(i, j);
							switch (this.text[j]) {
								case ')' : et.imme = 0; et.end = this.spaceskip(j+1); return et;
								case ',' : break;
								default  : return this.error(j, "synatx at '"+this.text[j]+"'");
							}
							i = this.spaceskip(j+1); j = i;
							et.imme = this.analysis(j, prev, "const");
							j = this.spaceskip(et.imme.end+1);
							switch (this.text[j]) {
								case ')' : et.end = this.spaceskip(j+1); return et;
								default  : return this.error(j, "expected ')'");
							}
						default :
							if (this.text[j] == ':') {
								et.type = "label";
								et.name = word;
								et.end = j;
								this.rec.setLabel(et, prev);
								return et;
							}
							if (this.rec.getType(word) != null && this.rec.getVariable(prev+word) == null) {
								et = this.analysis(j, prev, "type");
								if (et.type == "error") 
									return et;
								for (var ev = et ; ev != null && ev.type != "empty" ; ev = ev.v_next) 
									ev.s_type = word + ev.s_type;
								return et;
							}
							return this.analysis(i, prev, "expr");
					}
				case "const" :
					if (this.text[i] == '\'')
						return this.analysis(i+1, prev, "char");
					if (this.text[i] == '"')
						return this.analysis(i+1, prev, "string");
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					if (word.length == 0)
						return this.error(i, "expected constant");	
					if (word.search("^[0-9]+$") != -1) {
						et = new Object();
						et.type = "CONST";
						et.s_type = "int";
						et.value = parseInt(word);
					} else if (word.search("^[0-9]+/.[0-9]+$") != -1) {
						et = new Object();
						et.type = "CONST";
						et.s_type = "float";
						et.value = parseFloat(word);	
					} else if (word.search("^0x[0-9a-fA-F]+$") != -1) {
						et = new Object();
						et.type = "CONST";
						et.s_type = "int";
						et.value = parseInt(word, 16);
					} else {
						var v = this.rec.getVariable(prev+word);
						if (v != null && v.type == "enum") {
							et = new Object();
							et.type = "CONST";
							et.s_type = "int";
							et.value = v.value;
						} else {
							var tmp = et.end;
							et = this.error(i, "'" + word + "' is not a constant");
							et.end = tmp;
						}
					}
					//j = this.alphaskip(j);
					et.end = i+word.length-1;
					return et;
				case "array" :
					et = this.analysis(i, prev, "expr");
					if (et.type == "error")
						return et;
					switch (this.text[et.end]) {
						case ',' : et.next = this.analysis(et.end+1, prev, "array"); break;
						case '}' : et.next = this.empty_tree(et.end); break;
						default : return this.error(et.end, "synatx error at '"+this.text[et.end]+"'");
					}
					if (et.next.type == "error")
						return et.next;
					return et;
				case "sizeof" :
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					j = this.spaceskip(j);
					if (word == "struct") {
						i = j; j = this.alphaskip(j);
						word = this.text.slice(i, j);
						j = this.spaceskip(j);
					}
					if (this.rec.getType(word) != null) {
						if (this.text[j] != ')') 
							return this.error(j, "expected ')' after 'sizeof'");
						et = new Object();
						et.type = "typename";
						et.name = word;
						et.end = j;
						return et;
					}
					return this.analysis(i, prev, "expr");
				case "expr" : case "exprwc" : case "exprcase" :
					var e_start = i;
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					j = this.spaceskip(j);
					var exprs = new Array();
					var isnumber = false;
					while (true) {
						et = new Object();
						//println("type=expr word="+word+" i="+i+" j="+j+" text[j]="+this.text[j]+" b1");
						if (word != "") {
							if (word == "va_start") {
								et.type = "va_start";
								if (this.text[j] != '(')
									return this.error(j, "syntax at '"+this.text[j]+"'");
								i = this.spaceskip(j+1);
								j = this.alphaskip(i);
								et.va_list = this.text.slice(i, j);
								if (this.text[j] != ',')
									return this.error(j, "syntax at '"+this.text[j]+"'");
								i = this.spaceskip(j+1);
								j = this.alphaskip(i);
								et.larg = this.text.slice(i, j);
								j = this.spaceskip(j);
								if (this.text[j] != ')')
									return this.error(j, "syntax at '"+this.text[j]+"'");
								et.end = j;
								j = this.spaceskip(j+1);
								exprs.push(et);
							} else if (word == "va_arg") {
								et.type = "va_arg";
								if (this.text[j] != '(')
									return this.error(j, "syntax at '"+this.text[j]+"'");
								i = this.spaceskip(j+1);
								j = this.alphaskip(i);
								et.va_list = this.text.slice(i, j);
								if (this.text[j] != ',')
									return this.error(j, "syntax at '"+this.text[j]+"'");
								i = this.spaceskip(j+1);
								j = this.alphaskip(i);
								et.s_type = this.text.slice(i, j);
								j = this.spaceskip(j);
								while (this.text[j] == '*') {
									et.s_type += "*";
									j = this.spaceskip(j+1);
								}
								if (this.text[j] != ')')
									return this.error(j, "syntax at '"+this.text[j]+"'");
								et.end = j;
								j = this.spaceskip(j+1);
								exprs.push(et);
							} else if (word == "sizeof") {
								et.type = "sizeof";
								if (this.text[j] != '(')
									return this.error(j, "syntax at '"+this.text[j]+"'");
								et.value = this.analysis(j+1, prev, "sizeof");
								if (et.value.type == "error")
									return et.value;
								et.end = et.value.end;
								if (this.text[et.end] != ')')
									return this.error(et.end, "syntax at '"+this.text[j]+"'");
								j = this.spaceskip(et.end+1);
								exprs.push(et);
							} else if (word.search("^[0-9]+$") != -1) {
								j = i+word.length;
								if (this.text[j] == '.') {
									j = this.alphaskip(j+1);
									word = this.text.slice(i, j);
									j = this.spaceskip(j);
									//println("float word="+word);
									if (word.search("^[0-9]+.[0-9]+$") != -1) {
										et.name = word;
										et.type = "CONST";
										et.s_type = "float";
										et.value = parseFloat(word);
										et.end = i+word.length-1;	
										exprs.push(et);
									} else 
										this.error(j, "synatx error at '.'");
								} else {
									j = this.spaceskip(j);
									et.name = word;
									et.type = "CONST";
									et.s_type = "int";
									et.value = parseInt(word);
									et.end = i+word.length-1;
									exprs.push(et);
								}
							} else if (word.search("^0x[0-9a-fA-F]+$") != -1) {
								et.name = word;
								et.type = "CONST";
								et.s_type = "int";
								et.value = parseHex(word);
								et.end = i+word.length-1;
								exprs.push(et);
							} else if (/[A-Za-z_]/.test(word.slice(0, 1))) {
								if (this.text[j] == '(') {
									et.name = word;
									et.value = this.rec.getVariable(prev+word);
									if (!isnumber && et.value == null) {
										if (this.rec.getType(word) != null) {
											et.type = "CONV";
											et.s_type = word;
											et.end = i+word.length;
										} else
											return this.error(i, "'" + word + "' uncleared");
										exprs.push(et);
									} else {
										et.type = "FUNC";
										et.reg = this.analysis(j+1, prev, "fc_reg");
										if (et.reg.type == "error") 
											return et.reg;
										et.end = this.getEnd(et.reg);
										j = this.spaceskip(et.end+1);
										exprs.push(et);
									}
								} else if (word == "struct" || this.rec.getType(word) != null) {
									if (word == "struct") {
										i = j;
										j = this.alphaskip(j);
										word = this.text.slice(i, j);
										j = this.spaceskip(j);
									}
									while (this.text[j] == '*') {
										word += '*';
										j = this.spaceskip(j+1);
									}
									et.name = word;
									et.type = "CONV";
									et.s_type = word;
									et.end = j;
									exprs.push(et);
								} else {
									et.name = word;
									et.type = "VAR";
									et.value = this.rec.getVariable(prev+word);
									et.end = j;
									exprs.push(et);
								}
							} else
								return this.error(j, "'" + word + "' uncleared");	
						}
						//println("type=expr word="+word+" i="+i+" j="+j+" text[j]="+this.text[j]+" b2");
						/*
						if (this.text.slice(j, j+2) == "//") {
							j = this.text.indexOf("\n", j);
							if (j == -1) return this.error(this.text.length, "expected '\\n'"); 
							j = this.spaceskip(j+1);
							if (this.isEndCode(this.text[j], "expr")) break;
							return this.error(j, "syntax error at '"+this.text[j]+"'");
						}
						*/
						
						if (this.text[j] == '.' || this.text.slice(j, j+2) == "->") {
							//println("isnumber");
							isnumber = true;
						} else
							isnumber = false;
						if (this.isEndCode(this.text[j], "expr")) break;
						if (type == "exprcase" && this.text[j] == ':') break;
						et = new Object();
						switch (this.text[j]) {
							case '(' :
								// perhaps type convert?
								i = j;
								j = this.alphaskip(i+1);
								word = this.text.slice(i+1, j);
								j = this.spaceskip(j);
								//et = new Object();
								et.s_type = word;
								while (this.text[j] == '*') { 
									et.s_type = et.s_type + "*";
									j = this.spaceskip(j+1);
								}
								if (this.text[j] == ')' && this.rec.getType(word) != null) {
									//alert("CONV" + et.s_type);
									et.name = et.s_type;
									et.type = "CONV";
									//et.s_type = word;
									et.end = j;
									i = et.end+1;
									exprs.push(et);
									break;
								}
								j = i;
								// others situation 
								et = this.analysis(j+1, prev, "expr");
								i = et.end+1;
								et.name = this.text.slice(j+1, i);
								exprs.push(et);
								break;
							case '\'' :
								et = this.analysis(j+1, prev, "char");
								i = et.end+1; 
								et.name = this.text.slice(j+1, i);
								exprs.push(et);
								break;
							case '\"' :
								et = this.analysis(j+1, prev, "string");
								i = et.end+1;
								et.name = this.text.slice(j+1, i);
								exprs.push(et);
								break;
							case '[' :
								et.type = "OFFSET";
								et.value = this.analysis(j+1, prev, "expr");
								if (et.value.type == "error")
									return et.value;
								et.end = et.value.end;
								i = et.end+1;
								et.name = this.text.slice(j+1, i);
								exprs.push(et);
								break;
							case '{' :
								et.type = "ARRAY";
								et.text = this.analysis(j+1, prev, "array");
								et.end = this.getEnd(et.text);
								i = et.end+1;
								et.name = this.text.slice(j+1, i);
								exprs.push(et);
								break;
							default :
								et.name = this.text.slice(j, j+3);
								op_type = op_t[this.text.slice(j, j+3)];
								if (op_type == null) {
									et.name = this.text.slice(j, j+2);
									op_type = op_t[this.text.slice(j, j+2)];
								} else if (i < j+3) 
									i = j+3;
								if (op_type == null) {
									et.name = this.text.slice(j, j+1);
									op_type = op_t[this.text.slice(j, j+1)];
								} else if (i < j+2)
									i = j+2;
								if (op_type == null) 
									return this.error(j, "unknown operator at '" + this.text[j] + "'");
								else if (i < j+1)
									i = j+1;
								et.type = op_type;
								et.end = i;
								exprs.push(et);
								break;
						}
						//println("type=expr word="+word+" i="+i+" j="+j+" text[j]="+this.text[j]+" b3");
						if (et.type == "error") 
							return et;
						i = this.spaceskip(i);
						/*
						if (this.text[i] == '.' || this.text.slice(i, i+1) == "->") {
							j = i; break;
						}
						*/
						if (this.isEndCode(this.text[i], "expr")) {
							j = i; break;
						}
						j = this.alphaskip(i);
						word = this.text.slice(i, j);
						j = this.spaceskip(j);
					}
					//println("end at j="+j+" text[j]="+this.text[j]);
					//for (var i = 0 ; i < exprs.length ; i++) 
					//	println("type="+exprs[i].type+" name="+exprs[i].name);
					//alert("PAUSE");
					if (exprs.length == 1 && exprs[0].type == "CONV") {
						exprs[0].end = j;
						return exprs[0];
					}
					et = new Object();
					et.start = e_start;
					et.type = "expr";
					et.text = exprs;
					et.end = j;
					et.name = this.text.slice(et.start, et.end);
					if (type == "expr" && this.text[et.end] == ',') {
						et.next = this.analysis(et.end+1, prev, "expr");
						et.end = et.next.end;
						if (et.next.type == "error")
							return et.next;
					}
					return et;
				case "string" :
					et.value = "";
					for (j = i; this.text[j] != '"' ; j++) 
						et.value += this.text[j];
					et.type = "string";
					et.end = j;
					return et;
				case "char" :
					et.value = "";
					for (j = i; this.text[j] != '\'' ; j++) 
						et.value += this.text[j];
					et.value = et.value.charCodeAt(0);
					et.type = "char";
					et.end = j;
					return et;
				case "class" :
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					j = this.spaceskip(j);
					if (this.rec.getType(word)) {
						et = this.analysis(j, prev, "type");
						for (var ev = et ; ev != null && ev.type != "empty" ; ev = ev.v_next) 
							ev.s_type = word + ev.s_type;
						this.rec.setVariable(et, prev);
						return et;
					}
					if (this.text[j] == '{') {
						et.type = "class";
						et.name = word;
						this.rec.setType(et, prev);
						et.text = this.analysis(j+1, prev+word+"::", "c_code");
						if (et.text.type == "error")
							return et.text;
						et.end = this.spaceskip(this.getEnd(et.text)+1);
						//println("class end="+this.text[et.end]);
						return et;
					}
					var s_type = word;
					while (this.text[j] == '*') {
						s_type += '*'; 
						j = this.spaceskip(j+1);
					}
					i = j; j = this.alphaskip(i);
					word = this.text.slice(i, j);
					j = this.spaceskip(j);
					switch (this.text[j]) {
						case '=' : 
							et.type = "var";
							et.name = word;
							et.s_type = "";
							et.value = this.analysis(j+1, prev, "expr");
							if (et.value.type == "error")
								return et.value;
							et.end = et.value.end;
							this.rec.setVariable(et, prev);
							switch (this.text[et.end]) {
								case ',' : et.v_next = this.analysis(et.end+1, prev, "type"); break;
								case ';' : et.v_next = this.empty_tree(et.end); break;
								default  : return this.error(i, "Synatx error at '" + this.text[i] + "'");
							}
							if (et.v_next != null && et.v_next.type == "error")
								return et.v_next;
							for (var ev = et ; ev != null && ev.type != "empty" ; ev = ev.v_next) 
								ev.s_type = s_type + ev.s_type;
							return et;
						case ';' :
							et.type = "var";
							et.s_type = s_type;
							et.name = word;
							et.value = this.empty_tree(j);
							et.end = j;
							this.rec.setVariable(et, prev);
							return et;
						case ',' :
							et.type = "var";
							et.s_type = s_type;
							et.name = word;
							et.value = this.empty_tree(j);
							et.end = j;
							this.rec.setVariable(et, prev);
							et.v_next = this.analysis(j+1, prev, "type");
							if (et.v_next.type == "error")
								return et.v_next;
							for (var ev = et ; ev != null && ev.type != "empty" ; ev = ev.v_next) {
								ev.s_type = s_type + ev.s_type;
							}
							return et;
					}
					return this.error(j, "Synatx error at '" + this.text[j] + "'");
				case "c_code" :
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					j = this.spaceskip(j);
					//println("type=c_code j="+j+" word="+word);
					switch (word) {
						case "" :
							switch (this.text[j]) {
								case "}" : return this.empty_tree(j);
								//case "#" : return this.error(j, "No support with #include / #define");
								default  : return this.error(j, "Synatx error at '" + this.text[j] + "'");
							}
						case "struct" :
							return this.analysis(j, prev, "c_code");
						default : 
							if (this.rec.getType(word) != null) {
								et = this.analysis(j, prev, "type");
								if (et.type == "error")
									return et;
								for (var ev = et ; ev != null && ev.type != "empty" ; ev = ev.v_next) 
									ev.s_type = word + ev.s_type;
								et.next = this.analysis(this.getVEnd(et)+1, prev, "c_code");
								if (et.next.type == "error")
									return et.next;
								return et;
							} else
								return this.error(i, "'" + word + "' uncleared");
					}
				case "s_code" :
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					j = this.spaceskip(j);
					//println("type=s_code word="+word+" text[j]="+this.text[j]);
					switch (word) {
						case "" :
							if (this.text[j] == '}')
								return this.empty_tree(j);
							return this.error(j, "Synatx error at '" + this.text[i] + "'");
						case "case" :
							et.type = "case";
							et.value = this.analysis(j, prev, "exprcase");
							if (et.value.type == "error")
								return et.value;
							et.end = et.value.end;
							//println("type=case end="+et.end+" text[end]="+this.text[et.end]);
							if (this.text[et.end] != ':')
								return this.error(et.end, "expected ':' after 'case'");
							break;
						case "default" :
							if (this.text[j] != ':')
								return this.error(j, "expected ':' after 'default'");
							et.type = "default";
							et.end = j;
							break;
						default : 
							et = this.analysis(i, prev, "stmt");
							if (et.type == "error") 
								return et;
							if (et.type == "var" || et.type == "func") {
								var tmp = et.end;
								et = this.error(j, "a label can only be part of a statement and a declaration is not a statement");
								et.end = tmp;
							}
							break;
					}
					et.next = this.analysis(this.getVEnd(et)+1, prev, "s_code");
					if (et.next.type == "error")
						return et.next;
					return et;
				case "enum" :
					j = this.alphaskip(i);
					if (this.text[j] == '}') 
						return this.empty_tree(j);
					word = this.text.slice(i, j);
					et.type = "enum";
					et.parent = prev;
					et.s_type = "uint";
					et.name = word;
					et.end = this.spaceskip(j);
					this.rec.setVariable(et, prev);
					if (this.text[et.end] == '=') {
						et.value = this.analysis(et.end+1, prev, "exprwc");
						if (et.value.type == "error")
							return et.value;
						et.end = et.value.end;
						//alert("enum " + word + " end="+this.text[et.end]);
					}
					switch (this.text[et.end]) {
						case ',' : 
							et.next = this.analysis(et.end+1, prev, "enum");
							if (et.next.type == "error")
								return et.next;
							return et;
						case '}' :
							et.next = this.empty_tree(et.end);
							return et;
						default :
							return this.error(et.end, "synatx at '"+this.text[et.end]+"'");
					}
				case "type" :
					et.s_type = "";
					while (this.text[i] == '*') {
						et.s_type += "*";
						i = this.spaceskip(i+1);
					}
					if (/[A-Za-z_]/.test(this.text.slice(i, i+1)) == false) {
						if (this.text[i] == '(') {
							et.type = "func_p";
							j = this.spaceskip(i+1);
							if (this.text[j] != '*')
								return this.error(j, "Synatx error at '" + this.text[j] + "'");
							i = this.spaceskip(j+1);
							j = this.alphaskip(i);
							word = this.text.slice(i, j);
							j = this.spaceskip(j);
							if (this.text[j] != ')')
								return this.error(j, "expected ')'");
							j = this.spaceskip(j+1);
							switch (this.text[j]) {
								case '(' : 
									et.args = this.analysis(j+1, prev, "fp_args"); 
									j = this.spaceskip(this.getEnd(et.args)+1); 
									break;
								default  : 
									return this.error(j, "Synatx error at '" + this.text[j] + "'");
							}
							switch (this.text[j]) {
								case '=' :
									et.value = this.analysis(j+1, prev, "expr");
									et.end = et.value.end;
									return et;
								case ';':
									et.value = this.empty_tree(j);
									et.end = j;
									return et;
								default :
									return this.error(j, "Synatx error at '" + this.text[j] + "'");
							}
						}
						return this.error(i, "Synatx error at '" + this.text[i] + "'");
					}
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					j = this.spaceskip(j);
					//println("type=type word=" + word + " text[j]=" + this.text[j]);
					// perhaps array
					if (this.text[j] == '[') {
						et.s_type = et.s_type + "*";
						et.length = this.analysis(j+1, prev, "expr");
						j = et.length.end+1;
					}
					switch (this.text[j]) {
						case '=' : 
							et.type = "var";
							et.name = word;
							et.value = this.analysis(j+1, prev, "exprwc");
							if (et.value.type == "error")
								return et.value;
							et.end = et.value.end;
							this.rec.setVariable(et, prev);
							switch (this.text[et.end]) {
								case ',' : et.v_next = this.analysis(et.end+1, prev, "type"); break;
								case ';' : et.v_next = this.empty_tree(et.end); break;
								default  : return this.error(i, "Synatx error at '" + this.text[i] + "'");
							}
							if (et.v_next != null && et.v_next.type == "error")
								return et.v_next;
							return et;
						case ';' :
							et.type = "var";
							et.name = word;
							et.value = this.empty_tree(j);
							et.end = j;
							if (et.name == "dp")
								alert("var name="+et.name+" word="+word+" type="+et.s_type);
							this.rec.setVariable(et, prev);
							return et;
						case ',' :
							et.type = "var";
							et.name = word;
							et.value = this.empty_tree(j);
							et.end = j;
							this.rec.setVariable(et, prev);
							et.v_next = this.analysis(j+1, prev, "type");
							if (et.v_next.type == "error")
								return et.v_next;
							return et;
						case '(' :
							/*
							if (this.rec.getVariable(prev+word) != null)
								et = this.rec.getVariable(prev+word);
							else {*/
								et.type = "func";
								et.name = word;
								this.rec.setVariable(et, prev);
							//}
							et.reg = this.analysis(j+1, prev+et.name+"::", "f_reg");
							if (et.reg.type == "error")
								return et.reg;
							for (var er = et.reg ; er != null ; er = er.next) {
								if (er.type == "empty") continue;
								if (er.type == "va_list_args")
									this.rec.vars[prev+et.name+"::"+er.type] = er;
								else
									this.rec.setVariable(er, prev+et.name+"::");
							}
							i = (et.reg != null) ? this.spaceskip(this.getEnd(et.reg)+1) : this.spaceskip(this.spaceskip(j+1)+1);
							switch (this.text[i]) {
								case ';' : et.text = this.empty_tree(i); et.end = i; break;
								case '{' : et.text = this.analysis(i+1, prev+et.name+"::", "para"); et.end = this.getEnd(et.text)+1; break;
								default  : return this.error(i, "Synatx error at '" + this.text[i] + "'");
							}
							if (et.text.type == "error")
								return et.text;
							return et;
						case '[' :
							et.type = "var_a";
							et.name = word;
							et.s_type += "*";
							this.rec.setVariable(et, prev);
							j = this.spaceskip(j+1);
							if (this.text[j] == ']') {
								et.type = "var";
								et.end = this.spaceskip(j+1);
							} else {
								et.size = this.analysis(j+1, prev, "expr");
								if (et.size.type == "error")
									return et.size;
								et.end = this.spaceskip(et.size.end+1);
							}
							return et;
						default :
							return this.error(j, "Synatx error at '" + this.text[j] + "'");
					}
				case "f_reg" :
					var b_ct = 1;
					for (j = i ; b_ct > 0 ; j++) {
						if (this.text[j] == '$') break;
						if (this.text[j] == '\"') b_ct = b_ct^(1<<14);
						if (this.text[j] == '\'') b_ct = b_ct^(1<<15);
						if (l_bracket(this.text[j])) b_ct++;
						if (r_bracket(this.text[j]) || (this.text[j] == ',' && b_ct == 1)) b_ct--;
						//println("text="+this.text[j]+" b_ct="+b_ct);
						if (b_ct <= 0) break;
					}
					if (this.text[j] != ')' && this.text[j] != ',')
						return this.error(j, "Synatx error at '" + this.text[j] + "'");
					if (this.text.slice(i, i+3) == "...") {
						et.type = "va_list_args";
						et.name = "va_list_args";
						et.s_type = "void*";
						et.end = j;
						if (this.text[j] != ')')
							return this.error(j, "expected ')' at the end of function arguments");
						return et;
					}
					et.type = "f_reg";
					if (j == i)
						return this.empty_tree(j);
					k = this.alphaskip(i);
					word = this.text.slice(i, k);
					k = this.spaceskip(k);
					if (this.text[k] == ',' || this.text[k] == ')') {
						et.s_type = "int";
						et.name = word;
						switch (this.text[j]) {
							case "," :
								et.next = this.analysis(k+1, prev, "f_reg");
								if (et.next.type == "error")
									return et.next;
								et.end = et.next.end;
								return et;
							case ")" :
								et.next = this.empty_tree(j);
								et.end = k;
								return et;
						}
					}
					if (word.length == 0) 
						return this.empty_tree(j);
					if (word == "struct") {
						i = k, k = this.alphaskip(k);
						word = this.text.slice(i, k);
						k = this.spaceskip(k);
					}
					if (this.rec.getType(word) == null)
						et = this.error(i, "'" + et.s_type + "' uncleared");
					while (this.text[k] == '*') {
						word += "*";
						k = this.spaceskip(k+1);
					}
					et.s_type = word;
					//println("type=f_reg word=" + word + " i=" + i + " j=" + j + " k=" + k); 
					if (/[A-Za-z_]/.test(word.slice(0, 1)) == false) 
						return this.error(k, "Synatx error at '" + this.text[k] + "'");
					if (/[A-Za-z_]/.test(this.text.slice(k, k+1)) == false) 
						return this.error(k, "Synatx error at '" + this.text[k] + "'");
					i = k; k = j-1;
					while (this.text[k] == ' ') k--;
					et.name = this.text.slice(i, k+1);
					switch (this.text[j]) {
						case "," :
							et.next = this.analysis(j+1, prev, "f_reg");
							if (et.next.type == "error")
								return et.next;
							et.end = et.next.end;
							return et;
						case ")" :
							et.next = this.empty_tree(j);
							et.end = j;
							return et;
						default :
							return this.error(j, "Synatx error at '" + this.text[j] + "'");
					}
				case "fc_reg" :
					var b_ct = 1;
					for (j = i ; b_ct > 0 ; j++) {
						if (this.text[j] == '\"') b_ct = b_ct^(1<<14);
						if (this.text[j] == '\'') b_ct = b_ct^(1<<15);
						if (l_bracket(this.text[j])) b_ct++;
						if (r_bracket(this.text[j]) || (this.text[j] == ',' && b_ct == 1)) b_ct--;
						//println("text="+this.text[j]+" b_ct="+b_ct);
						if (b_ct <= 0) break;
					}
					if (this.text[j] != ')' && this.text[j] != ',')
						return this.error(j, "Synatx error at '" + this.text[j] + "'");
					if (j == i)
						return this.empty_tree(j);
					var tmp = this.text[j]; 
					this.text[j] = ')';
					et = this.analysis(i, prev, "expr");
					if (et.type == "error") 
						return et;
					this.text[j] = tmp;
					switch (this.text[j]) {
						case "," : et.next = this.analysis(j+1, prev, "fc_reg"); break;
						case ")" : et.next = this.empty_tree(j); break;
						default  : return this.error(j, "Synatx error at '" + this.text[j] + "'");
					}
					if (et.next.type == "error")
						return et.next;
					return et;
				case "fp_reg" :
					j = this.alphaskip(i);
					word = this.text.slice(i, j);
					et.type = "fp_reg";
					et.s_type = word;
					j = this.spaceskip(j);
					switch (this.text[j]) {
						case ',' : et.next = this.analysis(j+1, prev, "fp_reg"); break;
						case ')' : et.next = this.empty_tree(j); break;
						default  : return this.error(j, "Synatx error at '" + this.text[j] + "'");
					}
					if (et.next.type == "error")
						return et.next;
					return et;
				default:
					return this.empty_tree(start);
			}
		}
		// ==================================================================================
		// 	Grammer Analysis
		// ==================================================================================
		g_ana = new Object();
		g_ana.rec = rec;
		g_ana.error = function(id, msg) {
			this.rec.error_ct++;
			println(this.rec.filename + " [" + this.rec.t_line[id] + "," + this.rec.t_column[id] + "] : " + msg);
			this.rec.printl(id);
			alert("error");
			return false;
		}
		g_ana.sizeof = function(type) {
			if (type[type.length-1] == '*')
				return 4;
			return this.rec.sizeof[type];
		}
		g_ana.getType = function(et, prev) {
			var oper, type1, type2;
			if (et.s_type != null)
				return et.s_type;
			if (et.type == "expr")
				return this.getType(et.exprTree, prev);
			if (et.type.slice(0, 5) == "expr_") {
				switch (et.type.slice(5)) {
					case "CONST" : return et.s_type;
					case "VAR" : case "FUNC" : return et.value.s_type;
					case "char" : return "char";
					case "string" : return "char*";
				}  
				//println(et.op_st);
				switch (et.op_st) {
					case "UNITL" : case "UNITR" :
						type1 = this.getType(et.value, prev);
						switch (et.type.slice(5)) {
							case "PADDR" : case "OFFSET" : return type1.slice(0, type1.length-1);
							case "NETZ"   : return "bool";
							case "CONV" : return et.s_type;
							default : return type1;
						}
					case "BINARY" : case "IF" :
						type1 = this.getType(et.value1, prev);
						type2 = this.getType(et.value2, prev);
						if (type1 == "float" || type1 == "double") {
							if (type2 == "double") return "double";
							return type1;
						}
						if (type2 == "float" || type2 == "double") {
							if (type1 == "double") return "double";
							return type2;
						}
						if (type1 == "long") return "long";
						if (type2 == "long") return "long";
						if (type1 == "int") return "int";
						if (type2 == "int") return "int";
						if (type1 == "short") return "short";
						if (type2 == "short") return "short";
						if (type1 == "char") return "char";
						if (type2 == "char") return "char";
						return "bool";
					default :
						return "void";
				}
			}
			return "void";
		}
		g_ana.convTo = function(et, s_type) {
			ec = new Object();
			ec.name = et.name;
			ec.type = "expr_CONV";
			ec.op_st = "UNITL";
			ec.s_type = s_type;
			ec.value = et;
			ec.end = et.end;
			return ec;
		}
		g_ana.convType = function(type1, type2) {
			if (type1 == "uint") return this.convType("int", type2);
			if (type2 == "uint") return this.convType(type1, "int");
			if (type1 == "ushort") return this.convType("short", type2);
			if (type2 == "ushort") return this.convType(type1, "short");
			if (type1 == "uchar") return this.convType("char", type2);
			if (type2 == "uchar") return this.convType(type1, "char");
			
			//println("convType type1="+type1+" type2="+type2);
			if (type1 == "void*" && this.rec.isStructtype(type2))
				return true;
			if (type2 == "bool")
				return true;
			switch (type1) {
				case "int" : 
					if (type2[type2.length-1] == '*')
						return true;
				case "short" : case "long" :
					if (type2 == "float")
						return true;
					if (type2 == "double")
						return true;
				case "char" : case "bool" :
					switch (type2) {
						case "char" : case "bool" : case "short" : case "int" : case "long" :
							return true;
						default :
							return false;
					}
				case "float" : case "double" :
					switch (type2) {
						case "short" : case "int" : case "long" : case "float" : case "double" :
							return true;
						default :
							return false;
					}
				default :
					if (type1[type1.length-1] == '*') {
						if (type2 == "int")
							return true;
						if (type2[type2.length-1] == '*')
							return true;
					}
					if (this.rec.isStructtype(type1)) 
						return (type1 == type2);
					return false;	
			}
		}
		g_ana.create_exprTree = function(exprs, l, r) {
			//println("create exprTree l="+l+" r="+r);
			var et = new Object();
			if (l > r) {
				et.type = "empty";
				et.end = exprs[l].end;
				return et;
			}
			if (l == r) {
				if (exprs[l].type.slice(0, 4) != "expr") {
					exprs[l].op_st = op_st[exprs[l].type];
					exprs[l].type = "expr_" + exprs[l].type;
				}
				return exprs[l];
			}
			var opt = null, opt_i = -1;
			for (var i = l ; i <= r ; i++)		
				if (op_r[exprs[i].type] != null && (opt == null || op_r[opt.type] < op_r[exprs[i].type]
				|| op_r[opt.type] == 0 && op_r[exprs[i].type] == 0)) {
					opt = exprs[i]; opt_i = i;
				}
			if (opt.type == "OFFSET")
				et.offset = opt.value;
			if (opt.type == "CONV")
				et.s_type = opt.s_type;
			et.end = opt.end;
			et.type = "expr_" + opt.type;
			//println("opt_i="+opt_i+" opt_type="+opt.type+" ST="+op_st[opt.type]);
			switch (op_st[opt.type]) {
				case "UNITL" : 
					et.op_st = "UNITL";
					et.value = this.create_exprTree(exprs, opt_i+1, r);
					if (et.value.type == "empty")
						this.error(opt.end, "expected expression after '" + this.rec.text[opt.end] + "' token");
					return et;
				case "UNITR" : 
					et.op_st = "UNITR";
					et.value = this.create_exprTree(exprs, l, opt_i-1); 
					if (et.value.type == "empty")
						this.error(opt.end, "expected expression before '" + this.rec.text[opt.end] + "' token"); 
					return et;
				case "UNITLR" : 
					if (opt_i == l) {
						et.op_st = "UNITL";
						et.value = this.create_exprTree(exprs, l+1, r);
						if (et.value.type == "empty")
							this.error(opt.end, "expected expression after '" + this.rec.text[opt.end] + "' token"); 
					} else if (opt_i == r) {
						et.op_st = "UNITR"; 
						et.value = this.create_exprTree(exprs, l, r-1);
						if (et.value.type == "empty")
							this.error(opt.end, "expected expression before '" + this.rec.text[opt.end] + "' token"); 
					} else
						this.error(opt.end, "expected ';' after '" + this.rec.text[opt.end] + "'");
					return et;
				case "BINARY" : 
					if (opt.type == "ADD" && opt_i == l)
						return this.create_exprTree(exprs, l+1, r); 
					et.op_st = "BINARY";
					et.value1 = this.create_exprTree(exprs, l, opt_i-1);
					et.value2 = this.create_exprTree(exprs, opt_i+1, r);
					if (et.value1.type == "empty")
						this.error(opt.end, "expected expression before '" + this.rec.text[opt.end] + "' token");
					if (et.value2.type == "empty")
						this.error(opt.end, "expected expression after '" + this.rec.text[opt.end] + "' token");
					return et;
				case "IF" :
					et.op_st = "IF";
					et.cond = this.create_exprTree(exprs, l, opt_i-1);
					for (var i = opt_i+2 ; i <= r ; i++)
						if (exprs[i].type == "ELSE") {
							et.value1 = this.create_exprTree(exprs, opt_i+1, i-1);
							et.value2 = this.create_exprTree(exprs, i+1, r);
							if (et.cond.type == "empty")
								this.error(opt.end, "expected expression before '" + this.rec.text[opt.end] + "' token");
							if (et.value1.type == "empty")
								this.error(exprs[i].end, "expected expression before '" + this.rec.text[exprs[i].end] + "' token");
							if (et.value2.type == "empty")
								this.error(exprs[i].end, "expected expression after '" + this.rec.text[exprs[i].end] + "' token");
							return et;
						}
					return this.error(opt.end, "expected ':'");
				case "ELSE" :
					et.op_st = "IF";
					for (var i = opt_i-2 ; i >= l ; i--)
						if (exprs[i].type == "IF") {
							et.cond = this.create_exprTree(exprs, l, i-1);
							et.value1 = this.create_exprTree(exprs, i+1, opt_i-1);
							et.value2 = this.create_exprTree(exprs, opt_i+1, r);
							if (et.cond.type == "empty")
								this.error(exprs[i].end, "expected expression before '" + this.text[exprs[i].end] + "' token");
							if (et.value1.type == "empty")
								this.error(opt.end, "expected expression before '" + this.text[opt.end] + "' token");
							if (et.value2.type == "empty")
								this.error(opt.end, "expected expression after '" + this.text[opt.end] + "' token");
							return et;
						}
					return this.error(opt.end, "expected '?'");
				default :
					return this.error(opt.end, "unknown operator");
			}
		}

		g_ana.create = function(prev, type, value1, value2, end) {
			println("create type="+type);
			et = new Object();
			et.type = type;
			et.end = end;
			if (type.slice(0, 5) == "expr_") {
				et.op_st = op_st[type.slice(5)];
				switch (op_st[type.slice(5)]) {
					case "BINARY" :
						et.value1 = value1;
						et.value2 = value2;
						break; 
					default :
						et.value = value1;
						break;
				}
				switch (type.slice(5)) {
					case "CONST" :
						et.s_type = "uint";
						//this.solve(et, prev);
						break;
					default :
						break;
				}
			}
			this.analysis(et, prev);
			return et;
		}
		
		g_ana.analysis = function(et, prev) {
			//println("analysis type="+et.type+" prev="+prev+" op_st="+et.op_st+" name="+et.name+" start");
			var e = null, swit = null, loop = null, s_prev = null;
			if (et.type.slice(0, 5) == "expr_") {	
				switch (et.op_st) {
					 case "IF" :
					 	this.analysis(et.cond, prev);
					 	if (!this.convType(et.cond.s_type, "bool")) {  
					 		this.error(et.end, "could not convert '"+et.cond.name+"' from '"+et.s_type+"' to 'bool'"); break;
					 	}
					 	if (et.cond.s_type != "bool")
					 		et.cond = this.convTo(et.cond, "bool");
					 case "BINARY" : 
					 	if (et.type == "expr_NUMBER") {
					 		this.analysis(et.value1, prev);
					 		if (!this.rec.isStructtype(et.value1.s_type)) {
					 			this.error(et.value1.end, "fixed-point types not supported for this target");
					 			et.s_type = "error"; break;
					 		}
					 		this.analysis(et.value2, et.value1.s_type+"::");
					 		//if (et.value2.type != "expr_VAR") 
					 		//	this.error(et.value2.end, "expected struct number after variable '"+et.value1.name+"'");
					 		et.s_type = et.value2.s_type; 
					 		break;
					 	}
					 	if (et.type == "expr_PNUMBER") {
					 		this.analysis(et.value1, prev);
					 		if (et.value1.s_type[et.value1.s_type.length-1] != '*') {
					 			this.error(et.value1.end, "invalid type argument of '->' (have '"+et.value1.s_type+"')");
					 			et.s_type = "error"; break;
					 		}
					 		var s_type_p = et.value1.s_type.slice(0, et.value1.s_type.length-1);
					 		if (!this.rec.isStructtype(s_type_p)) {
					 			this.error(et.value1.end, "request for member '"+et.value2.name+"' in something not a structure or union");
					 			et.s_type = "error"; break;
					 		}
					 		//println("PNUMBER type="+s_type_p);
					 		this.analysis(et.value2, s_type_p+"::");
					 		//if (et.value2.type != "expr_VAR") 
					 		//	this.error(et.value2.end, "expected struct number after '"+et.value1.name+"'");
					 		et.s_type = et.value2.s_type; 
					 		break;
					 	}
					 	this.analysis(et.value1, prev);
					 	this.analysis(et.value2, prev);
					 	
					 	if (et.value1.s_type == "error") {
					 		et.s_type = "error"; break;
					 	}
					 	if (et.value2.s_type == "error") {
					 		et.s_type = "error"; break;
					 	}
					 	if (et.type.slice(5, 9) == "BOOL") {
					 		if (this.rec.isStructtype(et.value1.s_type) ||
					 			this.rec.isStructtype(et.value2.s_type)) {
					 			this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
					 								" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");
					 			et.s_type = "error"; break;
					 		}
					 		if (this.convType(et.value1.s_type, "bool")) 
					 			et.value1 = this.convTo(et.value1, "bool");
					 		else {
					 			this.error(et.end, "could not convert '"+et.value1.name+"' from '"+et.value1.s_type+"' to 'bool'"); break;
					 		}
					 		if (this.convType(et.value2.s_type, "bool"))
					 			et.value2 = this.convTo(et.value2, "bool");
					 		else {
					 			this.error(et.end, "could not convert '"+et.value2.name+"' from '"+et.value2.s_type+"' to 'bool'"); break;
					 		}
							et.s_type = "bool"; break;
						}
						if (et.type.slice(5) == "EQUAL" ||
							et.type.slice(5) == "NOTEQUAL") {
							if (this.rec.isStructtype(et.value1.s_type) ||
					 			this.rec.isStructtype(et.value2.s_type)) {
					 			this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
					 								" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");
					 			et.s_type = "error"; break;
					 		}
					 		et.s_type = "bool"; break;	
						}
					 	if (this.rec.isStructtype(et.value1.s_type) ||
					 		this.rec.isStructtype(et.value2.s_type)) {
					 		switch (et.type.slice(5)) {
					 			case "ASSIGN" : case "IF" :
					 				if (et.value1.s_type != et.value2.s_type) {
					 					this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
					 					" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");
					 					et.s_type = "error";
					 				} else 
					 					et.s_type = et.value1.s_type;
					 				break;
					 			default :
					 				this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
					 				" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");
					 				et.s_type = "error";
					 				break;
					 		}
					 	} else if (et.value1.s_type[et.value1.s_type.length-1] == '*' ||
					 			   et.value2.s_type[et.value2.s_type.length-1] == '*') {
					 		if (et.value1.s_type[et.value1.s_type.length-1] == '*' &&
					 			et.value2.s_type[et.value2.s_type.length-1] == '*') {
					 			switch (et.type.slice(5)) {
					 				case "ASSIGN" :
					 					et.s_type = et.value1.s_type; break;
					 				case "LESS" : case "MORE" : case "NOTLESS" : case "NOTMORE" : case "EQUAL" : case "NOTEQUAL" :
					 					et.s_type = "bool"; break;
					 				case "ADD" : case "SUB" :
					 					et.s_type = et.value1.s_type; break;
					 				default :
					 					//this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
					 					//" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");
					 					et.s_type = "uint"; 
					 					break;
					 			}
							} else if (et.value1.s_type == "int" || et.value2.s_type == "int" ||
									   et.value1.s_type == "uint" || et.value2.s_type == "uint") {
								if (et.value1.s_type != "int" && et.value1.s_type != "uint")
									et.s_type = et.value1.s_type;
								if (et.value2.s_type != "int" && et.value2.s_type != "uint")
									et.s_type = et.value2.s_type;
								switch (et.type.slice(5)) {
									case "ADD" : case "SUB":
										break;
									case "ASSIGN" : case "ASSIGNADD" : case "ASSIGNSUB" :
										//if (et.value2.s_type != "int" && et.value2.s_type != "uint")
										//	this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
					 					//	" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");
					 					et.s_type = et.value1.s_type;
										break;
									default :
										//this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
					 					//" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");
					 					//et.s_type = "error";
										break;
								}
							} else { 
								this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
					 			" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");		
								et.s_type = "error";
							}
					 	} else if (et.value1.s_type == "float" || et.value1.s_type == "double" ||
					 			   et.value2.s_type == "float" || et.value2.s_type == "double") {
					 		switch (et.type.slice(5)) {
					 			case "SLL" : case "SRL" : case "SRA" : 
					 			case "AND" : case "OR"  : case "NOT" : case "XOR" : 
					 			case "MOD" :
					 				et.s_type = "int";
					 			case "ASSIGN" :
					 				if (!this.convType(et.value2.s_type, et.value1.s_type)) 
					 					this.error(et.end, "incompatible types when initializing type '"+et.value1.s_type+
					 					"' using type '"+et.value2.s_type+"'");
					 				et.s_type = et.value1.s_type;
					 				if (et.value2.s_type != et.s_type)
					 					et.value2 = this.convTo(et.value2, et.s_type);
					 				break;
					 			default :
					 				if (et.type.slice(5, 11) == "ASSIGN") {
					 					switch (et.type.slice(11)) {
					 						case "SLL" : case "SRL" : case "AND" : case "OR" : case "XOR" : case "MOD" :
					 							et.s_type = et.value1.s_type;
					 							this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
					 							" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");
					 							break;
					 						default :
					 							et.s_type = et.value1.s_type;
					 							if (et.value2.s_type != et.s_type)
					 								et.value2 = this.convTo(et.value2, et.s_type);
					 							break;
					 					}
					 					break;
					 				}
					 				if (et.value1.s_type == "double" || et.value2.s_type == "double")
					 					et.s_type = "double";
					 				if (et.value1.s_type == "float" || et.value2.s_type == "float")
					 					et.s_type = "float";
					 				if (et.value1.s_type != et.s_type)
										et.value1 = this.convTo(et.value1, et.s_type);
									if (et.value2.s_type != et.s_type)
										et.value2 = this.convTo(et.value1, et.s_type);
					 				break;
					 		}
					 	} else if (et.type.slice(5, 9) == "BOOL") {
					 		et.s_type = "bool";
					 		if (et.value1.s_type != "bool")
					 			et.value1 = this.convTo(et.value1, "bool");
					 		if (et.value2.s_type != "bool")
					 			et.value2 = this.convTo(et.value2, "bool");
						} else {
							if (this.sizeof(et.value1.s_type) > this.sizeof(et.value2.s_type))
								et.s_type = et.value1.s_type;
							if (this.sizeof(et.value1.s_type) < this.sizeof(et.value2.s_type))
								et.s_type = et.value2.s_type;
							if (this.sizeof(et.value1.s_type) == this.sizeof(et.value2.s_type)) {
								switch (this.sizeof(et.value1.s_type)) {
									case 1: et.s_type = "char";  break;
									case 2: et.s_type = "short"; break;
									case 4: et.s_type = "int";   break;
									case 8: et.s_type = "long";  break;
									default : 
										this.error(et.end, "invalid operands to binary "+op_rt[et.type.slice(5)]+
						 				" (have '"+et.value1.s_type+"' and '"+et.value2.s_type+"')");
										et.s_type = "error";
										break;
								}
							}
							if (et.value1.s_type != et.s_type)
								et.value1 = this.convTo(et.value1, et.s_type);
							if (et.value2.s_type != et.s_type)
								et.value2 = this.convTo(et.value2, et.s_type);
						}
						break;
					case "UNITL" : case "UNITR" : case "UNITLR" :
						this.analysis(et.value, prev);
						if (et.value.s_type == "error") {
							et.s_type = "error"; break;
						}
						switch (et.type.slice(5)) {
							case "INC" : case "DEC" :
								if (this.rec.isStructtype(et.value.s_type)) {
									this.error(et.end, "wrong type argument to increment");
									et.s_type = "error";
								}
								et.s_type = et.value.s_type;
								break;
							case "PADDR" :
								if (et.value.s_type[et.value.s_type.length-1] != '*') {
									this.error(et.end, "invalid type argument of unary '*' (have '"+et.value.s_type+"')");
									et.s_type = "error";
								} else 
									et.s_type = et.value.s_type.slice(0, et.value.s_type.length-1);
								break;
							case "ADDR" :
								et.s_type = et.value.s_type + "*";
								break;
							case "OFFSET" :
								this.analysis(et.offset, prev);
								if (et.offset.s_type != "error")
									if (et.offset.s_type != "int") {
										if (!this.convType(et.offset.s_type, "int"))
											this.error(et.offset.end, "array subscript is not an integer");
										et.offset = this.convTo(et.offset, "int");
									}
								if (et.value.s_type[et.value.s_type.length-1] != '*') {
									this.error(et.end, "subscripted value is neither array nor pointer nor vector");
									et.s_type == "error";
								} else 
									et.s_type = et.value.s_type.slice(0, et.value.s_type.length-1);
								break;
							case "NETZ" :
								if (this.rec.isStructtype(et.value.s_type)) {
									this.error(et.end, "used struct type value where scalar is required");
									et.s_type = "error";
								} else
									et.s_type = "bool";
								break;
							case "NOT" :
								if (this.rec.isStructtype(et.value.s_type)) {
									this.error(et.end, "used struct type value where scalar is required");
									et.s_type = "error";
								} else if (et.value.s_type == "double" || et.value.s_type == "float") {
									this.error(et.end, "wrong type argument to bit-complement");
									et.s_type = "error";
								} else 
									et.s_type = "bool";
								break;
							case "CONV" :
								//println("conv name="+et.value.name+" type1="+et.value.s_type+" type2="+et.s_type);
								if (!this.convType(et.value.s_type, et.s_type)) {
									this.error(et.end, "cannot convert '"+et.value.s_type+"'to '"+et.s_type+"'");
									et.s_type = "error";
								}
								break;
							case "REVERSE" :
								if (et.value.s_type[et.value.s_type.length-1] == '*' ||
								this.rec.isStructtype(et.value.s_type)) {
									this.error(et.end, "invalid type argument of unary '-' (have '"+et.value.s_type+"')");
									et.s_type = "error"; break;
								}
								et.s_type = et.value.s_type;
								break;
							default:
								et.s_type = "void";
								break;
						}
						break;
					default :
						switch (et.type.slice(5)) {
							case "VAR" : 
								if (et.value == null) {
									et.value = this.rec.getVariable(prev+et.name);
									if (et.value == null) {
										this.error(et.end, "uncleared '"+et.name+"'");
										et.s_type = "error"; break;
									}
									//println("get var name="+et.name+" type="+et.s_type);
								}
								//println("var name="+et.value.name+" s_type="+et.value.s_type);	
								et.s_type = et.value.s_type; 
								break;
							case "FUNC" : 
								//println("func name = " + et.value.name+" begin");
								if (et.value == null) {
									et.value = this.rec.getVariable(prev+et.name);
									if (et.value == null) {
										this.error(et.end,"uncleared '"+et.name+"'");
										et.s_type = "error"; break;
									}
								}
								et.s_type = et.value.s_type; 
								var reg1 = et.value.reg;
								var reg2 = et.reg;
								while (reg2 != null) {
									//println("reg2 type="+reg2.type);
									this.analysis(reg2, prev);
									if (reg2.next != null) 
										reg2.next.prev = reg2;
									else
										et.reg_end = reg2; 
									reg2 = reg2.next;
								}
								//println("func name = "+et.value.name+" reg_end="+et.reg_end.type);
								reg2 = et.reg;
								while (reg1 != null && reg2 != null) {
									if (reg1.type == "empty" && reg2.type == "empty")
										break;
									if (reg1.type != "empty" && reg2.type == "empty"
									&&  reg1.type != "va_list_args") {
										this.error(reg2.end, "too few arguments to function '"+et.value.name+"'");
										this.error(reg1.end, "declared here");
										break;
									}
									if (reg1.type == "empty" && reg2.type != "empty") {
										this.error(reg2.end, "too many arguments to function '"+et.value.name+"'");
										this.error(reg1.end, "declared here");
										break;
									}
									type1 = reg1.s_type;
									type2 = this.getType(reg2, prev);
									//println("reg1="+reg1.name+" type="+type1+" reg2="+reg2.name+" type="+type2);
									if (reg1.type == "va_list_args") {
										reg2 = reg2.next; continue;
									} else if (type2 != "error" && !this.convType(type2, type1)) {
										this.error(reg2.end, "expected '"+type1+"' but argument is of type '"+type2+"'");
										this.error(reg1.end, "declared here");
									}
									if (reg1.type != "va_list_args")
										reg1 = reg1.next;
									reg2 = reg2.next;
								}
								if (reg1 == null && reg2 != null && reg2.type != "empty") {
									this.error(reg2.end, "too few arguments to function '"+et.value.name+"'");
									this.error(et.value.reg.end, "declared here");
								}
								if (reg1 != null && reg2 == null && reg1.type != "empty") {
									if (reg1.type == "va_list_args") break;
									this.error(et.reg.end, "too many arguments to function '"+et.value.name+"'");
									this.error(reg1.end, "declared here");
								}
								break;
							case "ARRAY" : 
								for (var e = et.text ; e != null ; e = e.next)
									this.analysis(e, prev);
								et.s_type = "void*"; 
							break;
							case "CONST" : break;
							case "char" : et.s_type = "char"; break;
							case "string" : 
								et.c_addr = ADDR_CONST+this.rec.c_data.length; 
								this.rec.c_data += et.value+"\0";
								et.s_type = "char*"; break;
							case "sizeof" :
								et.s_type = "uint"; break;			
							case "va_start" :
								et.larg_var = this.rec.getVariable(prev+et.larg);
								if (et.larg_var == null)
									this.error(et.end, "undefined argument '" +et.larg+"'");
								et.va_list_var = this.rec.getVariable(prev+et.va_list);
								if (et.va_list_var == null)
									this.error(et.end, "undefined va_list '"+et.va_list+"'");
								et.s_type = "void*";
								break;
							case "va_arg" :
								et.va_list_var = this.rec.getVariable(prev+et.va_list);
								if (et.va_list_var == null)
									this.error(et.end, "undefined va_list '"+et.va_list+"'");
								//alert("va_arg s_type="+et.s_type);
								//et.s_type = "void*";
								break;
							default : et.s_type = "void"; break;
						}
						break;
				}
				if (et.s_type != "error") 
					switch (et.type.slice(5)) {
						case "LESS" : case "MORE" : case "NOTLESS" : case "NOTMORE" : case "EQUAL" : case "NOTEQUAL" :
							et.s_type = "bool";
					}
				//println("analysis type="+et.type+" prev="+prev+" end s_type="+et.s_type+" op_st="+et.op_st+" end");
				return;
			} 
			switch (et.type) {
				case "class" :
					s_prev = prev+et.name+"::";
					this.rec.addr_ct[s_prev] = 0;
					this.analysis(et.text, s_prev);
					//println("class first_sizeof="+this.sizeof(et.text.s_type));
					var e = et.text ;
					var h = e;
					for ( ; e != null ; e = e.v_next ? e.v_next : (h=h.next)) {
						if (e.type == "empty") continue;
						e.addr = -e.addr-this.sizeof(et.text.s_type);
					}
					this.rec.sizeof[s_prev.slice(0, s_prev.length-2)] = -this.rec.addr_ct[s_prev];
					break;
				case "var" :
					this.analysis(et.value, prev);
					if (et.value.type != "empty") {
						type1 = et.s_type;
						type2 = this.getType(et.value, prev);
						//println("var type1="+type1+" type2="+type2);
						if (type1 != "error" && type2 != "error" && !this.convType(type2, type1)) {
							//println(et.value.name);	
							this.error(et.end, "could not convert '"+et.value.name+"' from '"+type2+"' to '"+type1+"'");
						}
					}
					et.instack = (prev == "" ? false : true);
					this.rec.addr_ct[prev] += this.sizeof(et.s_type);
					et.addr = this.rec.addr_ct[prev];
					//println("var name="+et.name+" addr="+et.addr);
					if (et.v_next != null) 
						this.analysis(et.v_next, prev);
					break;
				case "func" :
					//println("func name = " + et.name);
					s_prev = prev+et.name+"::";
					this.rec.addr_ct[s_prev] = 4;
					for (e = et.reg ; e != null && e.type != "empty" ; e = e.next) {
						//println("e.type="+e.type);
						if (e.type == "va_list_args") {
							e.instack = true;
							e.addr = this.rec.addr_ct[s_prev];
							break;
						}
						e.instack = true;
						e.addr = this.rec.addr_ct[s_prev]; 
						this.rec.addr_ct[s_prev] += this.sizeof(e.s_type);
					}
					this.rec.addr_ct[s_prev] = 0;
					this.rec.stack_sz[s_prev] = 0;
					//println("func arg end s_prev="+s_prev+" stack_sz="+this.rec.stack_sz[s_prev]+" "+this.rec.addr_ct[s_prev]);
					this.analysis(et.text, s_prev);
					//println("analysis end");
					this.rec.stack_sz[s_prev] = Math.max(this.rec.stack_sz[s_prev], this.rec.addr_ct[s_prev]);
					for (e = et.reg ; e != null && e.type != "empty" ; e = e.next)
						e.addr += this.rec.getStackSize(s_prev);
					//println("func name="+et.name+" s_prev="+s_prev+" stack_sz="+this.rec.stack_sz[s_prev]+" "+this.rec.getStackSize(s_prev));
					break;
				case "para" :
					this.rec.addr_ct[prev+et.bracket+"::"] = this.rec.addr_ct[prev];
					this.rec.stack_sz[prev+et.bracket+"::"] = 0;
					this.analysis(et.text, prev+et.bracket+"::");
					this.rec.stack_sz[prev] = Math.max(this.rec.stack_sz[prev], this.rec.stack_sz[prev+et.bracket+"::"]);
					break;
				case "expr" :
					if (et.text.length == 0) {
						et.type = "empty"; break ;
					}
					//println("expr =>");
					for (var i = 0 ; i < et.text.length ; i++) {
						if (et.text[i].type == "MULT" && (i==0 || op_st[et.text[i-1].type] != null))
							et.text[i].type = "PADDR"; 
						else if (et.text[i].type == "AND"  && (i==0 || op_st[et.text[i-1].type] != null))
						  	et.text[i].type = "ADDR";
						else if (et.text[i].type == "SUB"  && (i==0 || op_st[et.text[i-1].type] != null))
						  	et.text[i].type = "REVERSE";
						//println("i="+i+" type="+et.text[i].type+" name="+et.text[i].name);
					}
					for (var i = 0 ; i < et.text.length ; i++) {
						if (et.text[i].type == "CONV" && (i==et.text.length-1 || op_st[et.text[i+1].type] != null)) {
							et.text[i].type = "VAR";
							et.text[i].name = et.text[i].s_type;
						}
					}
					var tmp = this.rec.error_ct;
					et.exprTree = this.create_exprTree(et.text, 0, et.text.length-1);
					if (this.rec.error_ct == tmp) {
						this.analysis(et.exprTree, prev);
						et.s_type = et.exprTree.s_type;
					} else
						et.s_type = "error";
					break;
				case "if" :
					this.analysis(et.cond,   prev);
					this.analysis(et.stmt,   prev);
					this.analysis(et.e_stmt, prev);
					type1 = this.getType(et.cond, prev);
					if (type1 != "error") {
						if (!this.convType(type1, "bool"))
							this.error(et.cond.end, "could not convert '"+et.cond.name+"' from '"+type1+"' to 'bool'");
						if (type1 != "bool")
							et.cond = this.convTo(et.cond, "bool");
					}
					break;
				case "while" :
					if (et.stmt.bracket != null) {
						s_prev = prev+et.stmt.bracket+"::";
						this.rec.loops[s_prev]=et;
					}
					this.rec.loops[s_prev]=et;
					this.analysis(et.cond,   prev);
					this.analysis(et.stmt,   prev);
					type1 = this.getType(et.cond, prev);
					if (type1 != "error") {
						if (!this.convType(type1, "bool"))
							this.error(et.cond.end, "could not convert '"+et.cond.name+"' from '"+type1+"' to 'bool'");
						if (type1 != "bool")
							et.cond = this.convTo(et.cond, "bool");
					}
					break;
				case "for" :
					if (et.stmt.bracket != null) {
						s_prev = prev+et.stmt.bracket+"::";
						this.rec.loops[s_prev]=et;
					}
					this.analysis(et.s_expr, prev);
					this.analysis(et.c_expr, prev);
					this.analysis(et.e_expr, prev);
					this.analysis(et.stmt, prev);
					type1 = this.getType(et.c_expr, prev);
					if (type1 != "error") {
						if (!this.convType(type1, "bool"))
							this.error(et.c_expr.end, "could not convert '"+et.c_expr.name+"' from '"+type1+"' to 'bool'");
						if (type1 != "bool")
							et.c_expr = this.convTo(et.c_expr, "bool");
					}
					break;
				case "switch" :
					et.cases = {};
					s_prev = prev+et.bracket+"::";
					this.rec.addr_ct[s_prev] = this.rec.addr_ct[prev];
					this.rec.stack_sz[s_prev] = 0;
					this.rec.swits[s_prev] = et;
					this.analysis(et.expr, prev);
					this.analysis(et.text, s_prev);
					this.rec.stack_sz[s_prev] = Math.max(this.rec.stack_sz[s_prev], this.rec.addr_ct[s_prev]);
					if (et.def == null) et.def = et.next;
					break;
				case "case" :
					this.analysis(et.value, prev);
					this.solve(et.value, prev);
					swit = this.rec.getSwitch(prev);
					//println("swit.case = " + swit.cases);
					if (swit == null) {
						this.error(et.end, "case label not within a switch statement"); 
						break;
					}
					//println("case value="+et.value.value);
					if (swit.cases[et.value.value] != null) {
						this.error(et.end, "duplicate case value");
						this.error(swit.cases[et.value.value].end, "previously used here");
						break;
					}
					swit.cases[et.value.value] = et;
					type1 = this.getType(swit.expr, prev);
					type2 = this.getType(et.value,  prev);
					//println("case type1="+type1+" type2="+type2);
					if (type1 != "error" && type2 != "error" && !this.convType(type1, type2))
						this.error(et.end, "could not convert '"+et.value.name+"' from '"+type2+"' to '"+type1+"'");
					break;
				case "default" :
					swit = this.rec.swits[prev];
					if (swit == null) {
						this.error(et.end, "default label not within a switch statement"); break;
					}
					swit.def = et;
					break;
				case "break" :
					swit = this.rec.getSwitch(prev);
					loop = this.rec.getLoop(prev);
					if (swit == null && loop == null) {
						this.error(et.end, "break statement not within loop or switch"); break;
					}
					if (swit != null) {
						if (swit.next == null) {
							swit.next = new Object();
							swit.next.type = "empty";
							swit.next.end = swit.end;
						}
						et.b_point = swit.next;
					} else {
						if (loop.next == null) {
							loop.next = new Object();
							loop.next.type = "empty";
							loop.next.end = swit.end;
						}
						et.b_point = loop.next;
					}
					break;
				case "continue" :
					swit = this.rec.getSwitch(prev);
					loop = this.rec.getLoop(prev);
					if (swit == null && loop == null) {
						this.error(et.end, "continue statement not within loop or switch"); break;
					}
					if (swit != null) {
						if (swit.next == null) {
							swit.next = new Object();
							swit.next.type = "empty";
							swit.next.end = swit.end;
						}
						et.c_point = swit.next;
					} else {
						if (loop.type == "for")
							et.c_point = loop.e_stmt;
						else
							et.c_point = loop.cond;
					}
					break;
				case "return" :
					this.analysis(et.value, prev);
					break;
				case "asm" :
					if (i_id[et.inst] == null)
						this.error(et.end, "undefined instruction '"+et.inst+"'");
					break;
				case "va_list" :
					et.s_type = "void*";
					break;
				case "enum" :
					var enum_map = {};
					var enum_count = 0;
					for (var ev = et.text ; ev != null ; ev = ev.next) { 
						if (ev.type == "empty") break;
						if (ev.value == null) {
							while (enum_map[enum_count] != null) enum_count++;
							ev.value = enum_count;
							this.rec.setVariable(ev, ev.parent);
						} else if (ev.value.type == "expr") {
							this.analysis(ev.value, prev);
							this.solve(ev.value, prev);
							ev.value = ev.value.value;
							this.rec.setVariable(ev, ev.parent);
						}
						enum_map[ev.value] = ev.value;
					}
					et.s_type = "void";
					break;
				case "forcecall" :
					println("forcecall " + et.call);
					et.type = "expr_FUNC";
					et.value = this.rec.getVariable(et.call);
					et.reg = new Object();
					et.reg.type = "empty";
					et.reg_end = et.reg;
					et.s_type = et.value.s_type;
					break;
				default :
					break;
			}
			if (et.s_type == null)
				et.s_type = "void";
			//println("analysis type="+et.type+" prev="+prev+" end");
			if (et.next != null) {
				//println("analysis next");
				this.analysis(et.next, prev);
			}
		}
		g_ana.solve = function(et, prev) {
			//println("solve type="+et.type);
			if (et.type == "expr") {
				this.solve(et.exprTree, prev);
				et.value = et.exprTree.value;
				return ;
			}
			if (et.type.slice(0, 5) == "expr_") {	
				switch (et.op_st) {
					 case "BINARY" :
					 	this.solve(et.value1, prev);
					 	this.solve(et.value2, prev);
					 	switch (et.type.slice(5)) {
					 		case "ADD" :
					 			et.value = et.value1.value + et.value2.value; break;
					 		case "SUB" :
					 			et.value = et.value1.value - et.value2.value; break;
					 		case "MULT" :
					 			et.value = et.value1.value * et.value2.value; break;
					 		case "DIV" :
					 			et.value = et.value1.value / et.value2.value; break;
					 		case "MOD" :
					 			et.value = et.value1.value / et.value2.value; break;
					 		case "AND" :
					 			et.value = et.value1.value & et.value2.value; break;
					 		case "OR" :
					 			et.value = et.value1.value | et.value2.value; break;
					 		case "XOR" :
					 			et.value = et.value1.value | et.value2.value; break;
					 		default :
					 			et.value = 0; break;
					 	}
					 	break;
					 case "UNITL" :
					 	this.solve(et.value, prev);
					 	switch (et.type.slice(5)) {
					 		case "NEGA" :
					 			et.value = -et.value.value; break;
					 		case "NOT" :
					 			et.value = ~et.value.value; break;
					 		case "NETZ" :
					 			if (et.value.value == 0)
					 				et.value = 1;
					 			else
					 				et.value = 0;
					 			break;
					 		default :
					 			et.value = et.value.value; break;
					 	}
					 	break;
					 case "UNITR" :
					 	et.value = et.value.value; break;
					 default :
					 	switch (et.type.slice(5)) {
					 		case "VAR" :
					 			if (et.value.value == null) {
					 				if (et.value.type == "enum") {
					 					//println("get enum : " + et.value.parent+et.value.name);
					 					et.value = this.rec.getVariable(et.value.parent+et.value.name);
					 				}
					 			}
					 			et.value = et.value.value;
					 			//println("get const = "+et.value);
					 			break;
					 		default :
					 			break;
					 	}
					 	break;
				}
			} 
		}
		// ==================================================================================
		// 	Instruction generate
		// ==================================================================================
		
		var i_gen = new Object();
		i_gen.rec = rec;
		i_gen.insts = new Array();
		i_gen.inst_g = function(type, imme, cmt="") {
			var inst = new Object();
			inst.type = type;
			inst.imme = imme;
			inst.cmt = cmt;
			this.insts.push(inst);
		}
		i_gen.sizeof = function(type) {
			if (type[type.length-1] == '*') return 4;
			return this.rec.sizeof[type];
		}
		i_gen.spaceskip = function(text, start) {
			var i;
			for (i = start ; text[i] == ' ' || text[i] == '\t' || text[i] == '\n'; i++) ;
			return i;
		}
		i_gen.alphaskip = function(text, start) {
			var i;
			for (i = start ; /[0-9A-Za-z_]/.test(text.slice(i, i+1)) ; i++);
			return i;
		}
		i_gen.divtable = function(kvs, def, l, r, s_type) {
			println("divtable l="+l+" r="+r);
			var insts = null;
			if (l == r) {
				this.inst_g("LBI", kvs[l].key);
				if (s_type == "float" || s_type == "double")
					this.inst_g("BEF", kvs[l].value);
				else
					this.inst_g("BE", kvs[l].value);
				this.inst_g("JMP", def);
			} else if (r-l == 1) {
				this.inst_g("LBI", kvs[l].key);
				if (s_type == "float" || s_type == "double")
					this.inst_g("BEF", kvs[l].value);
				else
					this.inst_g("BE", kvs[l].value);
				this.inst_g("LBI", kvs[r].key);
				if (s_type == "float" || s_type == "double")
					this.inst_g("BEF", kvs[r].value);
				else
					this.inst_g("BE", kvs[r].value);
				this.inst_g("JMP", def);
			} else {
				var mid = (l+r)>>1, inst = new Object();
				this.inst_g("LBI", kvs[mid].key);
				if (s_type == "float" || s_type == "double") {
					this.inst_g("BEF", kvs[l].value);
					inst.type = "BLTF";
				} else {
					this.inst_g("BE", kvs[l].value);
					inst.type = "BLT"; 
				}
				inst.imme = this.insts.length; this.insts.push(inst);
				this.divtable(kvs, def, mid+1, r, s_type);
			 	inst.imme = (this.insts.length-inst.imme)<<2;
			 	this.divtable(kvs, def, l, mid-1, s_type);
			}
			return insts;
		}
		i_gen.generate = function(et, prev, sp_offset = 0, g_next=true) {
			//println("generate type="+et.type+" prev="+prev+" op_st="+et.op_st+" sp_offset="+sp_offset+" begin");
			if (et.type != "var") 
				et.addr = this.insts.length;
			switch (et.type) {
				case "include" :
					insts = this.generate(et.text, prev, sp_offset);
					break;
				case "func" :
					this.inst_g("ENT", -this.rec.getStackSize(prev+et.name+"::"), "func "+et.name+" entry"); 
					this.generate(et.text, prev+et.name+"::");
					this.inst_g("LEV", this.rec.getStackSize(prev+et.name+"::"));
					break;
				case "para" :
					this.generate(et.text, prev+et.bracket+"::", sp_offset); 
					break;
				case "var" :
					if (et.value.type != "empty") {
						if (et.value.type == "expr" && et.value.exprTree.type == "expr_ARRAY") {
							var e1 = this.rec.getType(et.s_type).text;
							var e2 = et.value.exprTree.text;
							var h1 = e1, h2 = e2;
							while (e1 != null && e2 != null) {
								if (e1.type != "empty" && e2.type != "empty") { 
									this.generate(e2, prev, sp_offset);
									this.save(et, prev, e1.addr);  
								}
								e1 = e1.v_next ? e1.v_next : (h1=h1.next);
								e2 = e2.v_next ? e2.v_next : (h2=h2.next);
							}
							break;
						}
						this.generate(et.value, prev, sp_offset);
						this.save(et, prev);
					}
					if (et.v_next != null)
						this.generate(et.v_next, prev, sp_offset);
					break;
				case "if" :
					this.generate(et.cond, prev);
					if (et.e_stmt.type != "empty") {
						this.inst_g("BZ", et.e_stmt, "if (!("+et.cond.name+")) b to else stmt");
						this.generate(et.stmt, prev, sp_offset);
						this.inst_g("JMP", et.next, "b to next stmt");
						this.generate(et.e_stmt, prev, sp_offset);
					} else {
						this.inst_g("BZ", et.next, "if (!("+et.cond.name+")) b to else stmt");
						this.generate(et.stmt, prev, sp_offset);
					}
					break;
				case "while" :
					this.inst_g("JMP", et.cond, "while : b to condition checking");
					this.generate(et.stmt, prev, sp_offset);
					this.generate(et.cond, prev, sp_offset);
					this.inst_g("BNZ", et.stmt, "while : if ("+et.cond.name+") continue loop");
					break;
				case "for" :
					this.generate(et.s_expr, prev, sp_offset);
					this.inst_g("JMP", et.c_expr, "for : b to condition checking");
					//println("b1");
					this.generate(et.stmt,   prev, sp_offset);
					this.generate(et.e_expr, prev, sp_offset);
					this.generate(et.c_expr, prev, sp_offset);
					//println("b2");
					this.inst_g("BNZ", et.stmt, "for : if ("+et.c_expr.name+") continue loop");
					break;
				case "return" :
					this.generate(et.value, prev, sp_offset);
					this.inst_g("LEV", this.rec.getStackSize(prev), "return "+et.value.name);
					break;
				case "break" :
					this.inst_g("JMP", et.b_point, "break");
					break;
				case "continue" :
					this.inst_g("JMP", et.c_point, "continue");
					break;
				case "expr" :
					this.generate(et.exprTree, prev, sp_offset);
					break;
				case "switch" :
					var kvs = new Array();
					var kv = null;
					for (var key in et.cases) {
						kv = new Object(); 
						kv.key = key.value;
						kv.value = et.cases[key];
						kvs.push(kv);
					}
					for (var i = 1 ; i < kvs.length ; i++)
						for (var j = i ; j > 0 && kvs[j-1].key > kvs[j].key ; j--) {
							kv = kvs[j]; kvs[j] = kvs[j-1]; kvs[j-1] = kv;
						}
					insts = this.generate(et.expr, prev, sp_offset);
					if (kvs.length > 0) 
						this.divtable(kvs, et.def, 0, kvs.length-1, et.expr.s_type);
					this.generate(et.text, prev+et.bracket+"::", sp_offset);
					break;
				case "asm" :
					this.inst_g(et.inst, et.imme, "asm");
					break;
				default :
					if (et.type.slice(0, 5) == "expr_") {
						switch (et.op_st) {
							case "BINARY" :
								insts = new Array();
								if (et.type == "expr_NUMBER") {
									this.generate_n(et.value2, et.value1);
									break;
								}
								if (et.type == "expr_PNUMBER") {
									this.generate(et.value1, prev, sp_offset);
									this.generate_p(et.value2);
									break;
								}
								if (et.type.slice(5) == "BOOLAND") {
									this.generate(et.value1, prev, sp_offset);
									var inst = new Object(); inst.type = "BZ"; inst.imme = this.insts.length; this.insts.push(inst);
									this.generate(et.value2, prev, sp_offset);
									inst.imme = (this.insts.length-inst.imme)<<2;
									break;
								}
								if (et.type.slice(5) == "BOOLOR") {
									this.generate(et.value1, prev, sp_offset);
									var inst = new Object(); inst.type = "BNZ"; inst.imme = this.insts.length; this.insts.push(inst);
									this.generate(et.value2, prev, sp_offset);
									inst.imme = (this.insts.length-inst.imme)<<2;
									break;
								}
								var sp_delta = 0;
								if (et.type.slice(5) == "ASSIGN") {
									this.generate(et.value2, prev, sp_offset);
									this.save(et.value1, prev, sp_offset); 
									break;
								}
								sp_delta = this.pushSP(et.value1, prev);
								sp_offset += sp_delta;
								this.generate(et.value2, prev, sp_offset);
								if (et.value2.s_type == "float" || et.value2.s_type == "double") {
									if (et.type.slice(5) == "MORE" || et.type.slice(5) == "NOTMORE") {
										this.inst_g("POPG", 0, "pop "+et.value1.name+" to rg");
										if (et.type.slice(5) == "MORE")
											this.inst_g("LTF", 0, et.name);
										else
											this.inst_g("GEF", 0, et.name);
										break;
									}
									this.inst_g("LBAD", 0);
									this.inst_g("POPF", 0);
									switch (et.type.slice(5)) {
										case "ADD" :
											this.inst_g("ADDF", 0, et.name); break;
										case "ASSIGNADD" :	
											this.inst_g("ADDF", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "SUB" :
											this.inst_g("SUBF", 0, et.name); break;
										case "ASSIGNSUB" :	
											this.inst_g("SUBF", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "MULT" :
											this.inst_g("MULF", 0, et.name); break;
										case "ASSIGNMULT" :	
											this.inst_g("MULF", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "DIV" :
											this.inst_g("DIVF", 0, et.name); break;
										case "ASSIGNDIV" :	
											this.inst_g("DIVF", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "LESS" :
											this.inst_g("LTF",  0, et.name); break;
										case "NOTLESS" :
											this.inst_g("GEF",  0, et.name); break;
										case "EQUAL" :
											this.inst_g("EQF",  0, et.name); break;
										case "NOTEQUAL" :
											this.inst_g("NEF",  0, et.name); break;
									}
								} else {
									if (et.type.slice(5) == "MORE" || et.type.slice(5) == "NOTMORE") {
										this.inst_g("POPB", 0, "pop " + et.value1.name + " to rb");
										if (et.type.slice(5) == "MORE")
											this.inst_g("LT", 0, et.name);
										else
											this.inst_g("GE", 0, et.name);
										break;
									}
									this.inst_g("LAB",  0);
									this.inst_g("POPA", 0);
									switch (et.type.slice(5)) {
										case "ADD" :
											this.inst_g("ADD", 0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNADD" :	
											this.inst_g("ADD", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "SUB" :
											this.inst_g("SUB", 0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNSUB" :	
											this.inst_g("SUB", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "MULT" :
											this.inst_g("MUL", 0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNMULT" :	
											this.inst_g("MUL", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "DIV" :
											this.inst_g("DIV", 0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNDIV" :
											this.inst_g("DIV", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "AND" :
											this.inst_g("AND", 0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNAND" :
											this.inst_g("AND", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "OR" :
											this.inst_g("OR",  0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNOR" :
											this.inst_g("OR",  0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "XOR" :
											this.inst_g("XOR", 0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNXOR" :	
											this.inst_g("XOR", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "SLL" :
											this.inst_g("SHL", 0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNSLL" :	
											this.inst_g("SHL", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "SRL" :
											this.inst_g("SRU", 0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNXOR" :	
											this.inst_g("SRU", 0, et.name); this.save(et.value1, prev, sp_offset); break;
										case "SRA" :
											this.inst_g("SHR", 0, et.name); this.conv("int", et.s_type); break;
										case "ASSIGNSRA" :	
											this.inst_g("SHR", 0, et.name); this.save(et.value1, prev, sp_offset); break;
									}
								}
								sp_offset -= sp_delta;
								break;
							case "UNITL" : case "UNITR" : case "UNITLR" :
								if (et.type.slice(5) != "ADDR")
									insts = this.generate(et.value, prev);
								switch (et.type.slice(5)) {
									case "NETZ" :
										this.inst_g("LBI", 0); this.inst_g("NE", 0, et.name); break;
									case "NOT" :
										this.inst_g("LBI", 0); this.inst_g("XOR", 0, et.name); this.conv("int", et.s_type); break;
									case "CONV" :
										this.conv(et.value.s_type, et.s_type); break;
									case "PADDR" :
										this.load_a(et); break;
									case "ADDR" :
										this.addr(et.value, prev, sp_offset); break;
									case "OFFSET" :
										this.inst_g("LBL", 0);
										this.generate(et.offset, prev);
										this.inst_g("MULI", this.sizeof(et.s_type));
										this.inst_g("ADD", 0, "the address of "+et.name);
										this.load_a(et);
									case "INC" :
										this.inst_g("ADDI", 1, et.name);
										this.save(et.value, prev, sp_offset);
										if (et.op_st == "UNITR")
											this.inst_g("SUBI", 1);
										break;
									case "DEC" :
										this.inst_g("SUBI", 1, et.name);
										this.save(et.value, prev, sp_offset);
										if (et.op_st == "UNITR")
											this.inst_g("ADDI", 1);
										break;
									case "REVERSE" :
										this.inst_g("LBA", 0);
										this.inst_g("LI",  0);
										this.inst_g("SUB", 0);
										this.conv("int", et.type);
										break; 
									default :
										break;
								}
								break;
							default :
								switch (et.type.slice(5)) {
									case "VAR" : 
										if (!et.value.instack)
											this.load_g(et.value.addr, et.s_type);
										else
											this.load_s(et.value.addr+sp_offset, et.s_type);
										break;
									case "FUNC" :
										insts = new Array();
										var ct = 0;
										for (var er = et.reg_end.prev ; er != null ; ct += 8, er = er.prev)
											this.pushSP(er, prev);
										this.inst_g("JSR", et.value);
										this.inst_g("ENT", ct);
										break;
									case "CONST" :
										this.load_i(et.value, et.s_type);
										break;
									case "char" : 
										this.load_i(et.value, et.s_type);
										break;
									case "string" :
										this.load_i(et, et.s_type);
										break;
									default :
										break;
								}
								break;
						}
					}
					break;
			}
			//println("generate type="+et.type+" prev="+prev+" end");
			if (g_next && et.next != null) {
				//println("generate next");
				this.generate(et.next, prev);
			}
			return insts;
		}
		
		i_gen.pushSP = function(et, prev, sp_offset=0) {
			this.generate(et, prev, sp_offset, false);
			switch (et.s_type) {
				case "float" : case "double" : this.inst_g("PSHF", 0); return 8;
				default : this.inst_g("PSHA", 0); return 4;
			}
		}
		i_gen.generate_n = function(number, struct, sp_offset, offset=0) {
			switch (number.type) {
				case "expr_VAR" :
					if (!struct.value.instack)
						this.load_g(number.addr+offset, number.s_type);
					else
						this.load_s(struct.addr+number.addr+offset+sp_offset, number.s_type);
					break;
				case "expr_NUMBER" :
					this.generate_n(number.value2, struct, offset+number.value1.addr);
					break;
				case "expr_PNUMBER" :
					if (!struct.value.instack)
						this.load_g(number.value1.addr+offset, number.s_type);
					else
						this.load_s(struct.addr+number.value1.addr+offset, number.s_type);
					this.generate_p(number.value2, offset);
					break;
				default :
					break;
			}	
		}
		i_gen.generate_p = function(number, offset=0) {
			println("generate_p type="+number.type);
			switch (number.type) {
				case "expr_VAR" :
					this.load_a(number, number.addr);
					break;
				case "expr_NUMBER" :
					this.generate_p(number.value2, offset+number.value1.addr);
					break;
				case "expr_PNUMBER" :
					this.load_a(number, number.value1.addr);
					this.generate_p(number.value2, offset);
					break;
				default :
					break;
			}
		}
		
		i_gen.addr = function(et, prev, sp_offset=0) {
			println("addr type="+et.type);
			switch (et.type) {
				case "expr_VAR" :
					if (!et.value.instack)
						this.inst_g("LI", et.addr, "get " + et.name + "addr");
					else
						this.inst_g("LI", et.addr+sp_offset, "get " + et.name + "addr");
					break;
				case "expr_OFFSET" :
					var delta = this.pushSP(et.offset, prev);
					this.addr(et.value, prev, sp_offset+delta);
					this.inst_g("ADDF", 0, "offset");
					this.inst_g("ENT", delta);
					break;
				case "expr_NUMBER" :
					this.addr(et.value1, prev, sp_offset);
					this.inst_g("ADDI", et.value2.addr, "number addr");
					break;
				case "expr_PNUMBER" :
					this.generate(et.value1, prev, sp_offset);
					this.inst_g("ADDI", et.value2.addr, "number addr");
					break;
				default :
					break;
			}
		}
		
		i_gen.load_g = function(addr, s_type) {
			//println("load_g addr="+addr+" s_type="+s_type);
			switch (s_type) {
				case "float" : case "double" :
					this.inst_g("LGD", addr); break;
				case "int" : case "uint" :
					this.inst_g("LG", addr);  break;
				case "short" : case "ushort" :
					this.inst_g("LG", addr); this.inst_g("ADDI", 0x00ffff); break;
				case "char" : case "uchar" :
					this.inst_g("LG", addr); this.inst_g("ADDI", 0x0000ff); break;
				case "bool" :
					this.inst_g("LG", addr); this.inst_g("ADDI", 0x000001); break;
				default :
					this.inst_g("LG", addr);  break;
			}
		}
		i_gen.load_s = function(addr, s_type) {
			//println("load_s addr="+addr+" s_type="+s_type);
			switch (s_type) {
				case "float" : case "double" :
					this.inst_g("LLD", addr); break;
				case "int" : case "uint" :
					this.inst_g("LL", addr);  break;
				case "short" : case "ushort" :
					this.inst_g("LL", addr); this.inst_g("ADDI", 0x00ffff); break;
				case "char" : case "uchar" :
					this.inst_g("LL", addr); this.inst_g("ADDI", 0x0000ff); break;
				case "bool" :
					this.inst_g("LL", addr); this.inst_g("ADDI", 0x000001); break;
				default :
					this.inst_g("LL", addr);  break;
			}
		}
		i_gen.load_a = function(et, offset=0) {
			println("load_a et="+et+" s_type="+et.s_type);
			this.inst_g("LX", offset);
			this.conv("int", et.s_type);	
		}
		i_gen.load_i = function(value, s_type) {
			switch (s_type) {
				case "float" : case "double" :
					this.inst_g("LIF", value); 
					break;
				default :
					this.inst_g("LI", value);
					this.conv("int", s_type);
					break;
			}
		}
		i_gen.save = function(et, prev, sp_offset=0) {
			println("save type="+et.type+" prev="+prev+" sp_offset="+sp_offset);
			switch (et.type) {
				case "expr_VAR" :
					if (!et.value.instack)
						this.save_g(et.addr, et.s_type);
					else
						this.save_s(et.addr+sp_offset, et.s_type);
					break;
				case "expr_PADDR" :
					this.inst_g("LBA", 0);
					this.generate(et.value, prev); 
					this.save_a(et.s_type);
					break;
				case "expr_NUMBER" :
					this.save_n(et.value2, et.value1, sp_offset);
					break;
				case "expr_PNUMBER" :
					this.inst_g("LBA", 0);
					println("b3");
					this.generate(et.value1, prev, sp_offset);
					println("b4");
					this.save_p(et.value2);
					break;
				default:
					break;
			}
			println("save type="+et.type+" prev="+prev+" end");
		}
		i_gen.save_g = function(addr, s_type) {
			switch (s_type) {
				case "float" : case "double" :
					this.inst_g("SGD", addr); break;
				case "int" : case "uint" :
					this.inst_g("SG",  addr); break;
				case "short" : case "ushort" :
					this.inst_G("SGH", addr); break;
				case "char" : case "uchar" : case "bool" :
					this.inst_g("SGB", addr); break;
				default :
					this.inst_g("SG", addr);  break;
			}
		}
		i_gen.save_s = function(addr, s_type) {
			switch (s_type) {
				case "float" : case "double" :
					this.inst_g("SLD", addr); break;
				case "int" : case "uint" :
					this.inst_g("SG",  addr); break;
				case "short" : case "ushort" :
					this.inst_G("SLH", addr); break;
				case "char" : case "uchar" : case "bool" :
					this.inst_g("SLB", addr); break;
				default :
					this.inst_g("SG", addr);  break;
			}
		}
		i_gen.save_n = function(number, struct, sp_offset, offset=0) {
			//println("save_n number="+number.type+" struct="+struct.type+" sp_offset="+sp_offset);
			switch (number.type) {
				case "expr_VAR" :
					if (!struct.value.instack)
						this.save_g(number.addr+offset, number.s_type);
					else
						this.save_s(struct.addr+number.addr+offset+sp_offset, number.s_type);
					break;
				case "expr_NUMBER" :
					this.save_n(number.value2, struct, offset+number.value1.addr);
					break;
				case "expr_PNUMBER" :
					if (!struct.value.instack)
						this.save_g(number.value1.addr+offset, et.s_type);
					else
						this.save_s(struct.addr+number.value1.addr+offset, et.s_type);
					this.save_p(number.value2, offset);
					break;
				default :
					break;
			}	
		}
		i_gen.save_p = function(number, offset=0) {
			//println("save_p type="+number.type);
			switch (number.type) {
				case "expr_VAR" :
					this.save_a(number, number.addr);
					break;
				case "expr_NUMBER" :
					this.save_p(number.value2, offset+number.value1.addr);
					break;
				case "expr_PNUMBER" :
					this.load_a(number, number.value1.addr);
					this.save_p(number.value2, offset);
					break;
				default :
					break;
			}
		}
		i_gen.save_a = function(et, offset=0) {
			//println("save_a s_type="+et.s_type);
			this.inst_g("PSHB", 0);
			this.inst_g("LBA", 0);
			this.inst_g("POPA", 0);
			switch (et.s_type) {
				case "int" :   this.inst_g("SX", offset); break;
				case "short" : this.inst_g("SXH", offset); break;
				case "bool" : 
				case "char" :  this.inst_g("SXB", offset); break;
				case "float" : this.inst_g("SXF", offset); break;
				case "double": this.inst_g("SXD", offset); break;
				default : break;
			} 
		}
		
		i_gen.conv = function(type1, type2) {
			if (type1 == "float" || type1 == "double") {
				switch (type2) {
					case "float" : case "double" : break;
					default :	
						if (type[0] == 'u') {
							this.inst_g("CDU", 0); this.conv("uint", type2);
						} else {
							this.inst_g("CDI", 0); this.conv("int", type2);
						}
						break;
				}
			}
			if (type1 == "int" || type1 == "uint") {
				switch (type2) {
					case "int" : case "uint" : break;
					case "short" : case "ushort" : this.inst_g("ANDI", 0x00ffff); break;
					case "char" : case "uchar" : this.inst_g("ANDI", 0x0000ff); break;
					case "bool" : this.inst_g("ANDI", 0x000001); break;
					case "float" : case "double" : this.inst_g("CID", 0); break;
					default : break;
				}
			}
			if (type1 == "short") {
				switch (type2) {
					case "int" : this.inst_g("SHLI", 16); this.inst_g("SHRI", 16); break; 
					case "char" : case "uchar" : this.inst_g("ANDI", 0x0000ff); break;
					case "bool" : this.inst_g("ANDI", 0x000001); break;
					default : this.conv("uint", type2); break;
				}
			}
			if (type1 == "ushort") {
				switch (type2) {
					case "char" : case "uchar" : this.inst_g("ANDI", 0x0000ff); break;
					case "bool" : this.inst_g("ANDI", 0x000001); break;
					default : this.conv("uint", type2); break;
				}
			}
			if (type1 == "char") {
				switch (type2) {
					case "int" : this.inst_g("SHLI", 16); this.inst_g("SHRI", 16); break; 
					case "short" : this.conv("char", "int"); this.inst_g("ANDI", 0x0000ff); break;
					case "bool" : this.inst_g("ANDI", 0x000001); break;
					default : this.conv("uint", type2); break;
				}
			}
			if (type1 == "uchar") {
				switch (type2) {
					case "bool" : this.inst_g("ANDI", 0x000001); break;
					default : this.conv("uint", type2); break;
				}
			}
			if (type1 == "bool" || type1[type1.length-1] == '*') 
				this.conv("uint", type2);
		}
		i_gen.find_main = function() {
			this.main = this.rec.getVariable("main");
			if (this.main.type == "func") return this.main;
			this.main = null;
			println("error : undefined reference to `main'");
			this.rec.error_ct++;
			return this.main;
		}
		i_gen.determine_pc = function(insts) {
			var inst = null;
			while (this.rec.c_data.length&3) this.rec.c_data += ' ';
			this.hdr = new Object();
			this.hdr.magic = 0xC0DEF00D;
			this.hdr.bss   = this.rec.addr_ct[""];
			this.hdr.entry = this.main.addr;
			this.hdr.flags = (this.insts.length+4)<<2;
			this.bss_base = this.hdr.flags+(4+this.rec.c_data.length)+4;
			// func_list
			this.func_cnt = "";
			for (var key in this.rec.vars) {
				var et = this.rec.vars[key];
				if (et.type == "func") {
					this.bss_base += 8 + et.name.length;
					this.func_cnt += totext(et.addr) + totext(et.name.length) + et.name;
				}
			}
			// det pc
			this.cnt = totext(this.hdr.magic) + totext(this.hdr.bss) 
					 + totext(this.hdr.entry) + totext(this.hdr.flags);
			for (var pc = 0 ; pc < this.insts.length ; pc++) {	
				inst = this.insts[pc];
				if (inst == null) {
					inst = new Object();
					inst.type = "NOP";
					inst.imme = 0;
					this.insts[pc] = inst;
				}
				if (typeof inst.imme == "object") {
					println("imme = "+inst.imme);
					inst.imme = (inst.imme.addr-pc)<<2;
				}
				if (inst.type.slice(0, 2) == "LG" ||
					inst.type.slice(0, 2) == "SG")
						inst.imme += (this.bss_base - pc)<<2;
				switch (inst.type) {
					case "LEAG" : 
						inst.imme += (this.bss_base - pc)<<2;
				}
				var ibin = (inst.imme<<8) | i_id[inst.type]; 
				this.cnt += totext(ibin);
			}
			this.cnt += totext(this.rec.c_data.length) + this.rec.c_data;
			this.cnt += this.func_cnt;
		}
		// ==================================================================================
		// 	User interface
		// ==================================================================================
		ui.rec = rec;
		ui.w_ana = w_ana;
		ui.g_ana = g_ana;
		ui.i_gen = i_gen;
		ui.xmlHttp = new XMLHttpRequest();
		ui.xmlHttp.onreadystatechange = function() {
			//println("readyState="+this.readyState+" "+"status="+this.status);
			if (this.readyState==4) {
				if (this.status==0) {
    				ui.rec.setText(this.responseText+'$');
    				ui.w_ana.text = ui.rec.text;
					println("Complete reading '" + ui.rec.filename + "'");
					if (ui.b_ls) 
						ui.printAll(ui.rec.text);
					else if (!ui.isCompile)
						ui.input_active();
				} else {
					println("Error occors while reading '" + ui.rec.filename + "'");
					switch (this.status) {
						case 500 : println("HTTP 500.Error processing request."); break;
						case 404 : println("Cannot find '" + ui.rec.filename + "'"); break;
						default : break;
					}
					if (ui.isCompile) 
						rec.error_ct++;
					else
						ui.input_active();
				}
			}
		}
		ui.load = function(para) {
			ui.input_paused();
			var i = para.indexOf(" ");
			if (i == -1) i = para.length;
			var filename = para.slice(0, i);
			para = para.slice(i);
			var word = "";
			this.b_ls = false;
			while (para.length != 0) {
				var i = para.indexOf(" ", 1);
				if (i == -1) i = para.length;
				word = para.slice(1, i);
				para = para.slice(i);
				if (word == "-ls") this.b_ls = true;
			}
			this.loadfile(filename);
		}
		ui.loadfile = function(filename) {
			this.rec.filename = filename;
			this.xmlHttp.open("GET", filename, false);
			this.xmlHttp.send(null);
		}
		ui.analysis = function(rec_o, filename) {
			//alert("analysis " + filename);
			this.rec = rec_o.clone();
			this.w_ana.rec = this.rec;
			this.g_ana.rec = this.rec;
			this.loadfile(filename);
			var et = this.w_ana.analysis(0, "", "code");
			if (!this.rec.error_ct) 
				this.g_ana.analysis(et, "");
			rec_o.c_data = this.rec.c_data;
			rec_o.error_ct = this.rec.error_ct;
			this.rec = rec_o;
			this.w_ana.text = this.rec.text;
			this.w_ana.rec = this.rec;
			this.g_ana.rec = this.rec;
			return et;
		}
		ui.compile = function() {
			this.isCompile = true;
			ui.input_paused();
			this.rec.initialize();
			this.w_ana.text = this.rec.text;
			var et = this.w_ana.analysis(0, "", "code");
			alert("analysis");
			if (this.rec.error_ct > 0) {
				println("Compile was paused at " + this.rec.error_ct + " error(s) totally.");
				ui.input_active(); return;
			}
			this.g_ana.analysis(et, "");
			if (this.rec.error_ct > 0) {
				println("Compile was paused at " + this.rec.error_ct + " error(s) totally.");
				ui.input_active(); return;
			}
			alert("find_main");
			var main = this.i_gen.find_main();
			if (this.rec.error_ct > 0) {
				println("Compile was paused at " + this.rec.error_ct + " error(s) totally.");
				ui.input_active(); return;
			}
			alert("generate");
			this.i_gen.generate(et, "");
			this.i_gen.determine_pc(insts);
			if (this.savefile != null)
				this.saveinst(this.savefile);
			else
				this.printinst();
			this.isCompile = false;
		}
		ui.save = function(filename) {
			ui.input_paused();
			this.savefile = filename;
			ui.input_active();
		}
		ui.conv_i = function(imme, bit=16) {
			return (imme&((1<<bit)-1));
		}
		ui.saveinst = function(filename, insts) {
			asp_btr.Text = this.savefile;
			alert(asp_btr.Text);
			asp_ctr.Text = this.i_gen.cnt;
			alert(asp_ctr.Text.length);
			asp_btr.click();
    	}
    	ui.printinst = function(insts) {
    		var display = "";
    		for (var i = 0 ; i < i_gen.insts.length ; i++) 
    			display += i_gen.insts[i].type + " " + i_gen.insts[i].imme + "   " + i_gen.insts[i].cmt + "\n";
			ui.printAll(display);
    	}
		ui.input_paused = function() {
			ctrl_active = false;
		}
		ui.input_active = function() {
			ctrl_active = true;
			print("uComplier >> ");	
		}
		ui.pause = function() {
			pause_active = true;
			println("Press ANYKEY to continue...");
		}
		ui.printAll = function(text) {
			var l_ct = 0, l_txt = null;
			while (text.length > 0) {
				if (pause_active) continue;
				i = text.indexOf("\n");
				if (i == -1) i = text.length;
				l_txt = text.slice(0, i);
				text = text.slice(i+1);
				println(l_txt);
				if (++l_ct > 35) {
					l_ct = 0; this.rem_txt = text; this.pause(); return ;
				}
			}
			this.rem_txt = "";
			ui.input_active();
		}
		ui.usage = function() {
			ui.input_paused();
			println("Usage : load filepath [-ls] : Load the c source code");
			println("           -ls : Print the code on the webpage screen.");
			println("        save filepath : Target the instruction code file's path(seem as 'Execute file')");
			println("        compile [-o [filepath]] : Compile the c code, and generate the instruction code");
			println("           -o [filepath] : Save the assemble. Print it when filepath is ignored.");
			ui.input_active();
		}
		println("Ucore C complier v1.0 (uComplier)");
		println("                                     Made by Morenan");
		ui.usage();
