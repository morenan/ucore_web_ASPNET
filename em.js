
// ========================================================================================================
//	v9-cpu emulater (web version)
//	=======================================================================================================
//	registers
var reg = new Object();
reg.initialize = function() {
	this.a = this.b = this.c = 0;
	this.f = this.g = 0.0;
	this.sp = 0;
	this.pc = 0;
	this.tsp = 0;
	this.flags = 0;
}

//  memory
var mem = new Object();
mem.datas = new Int32Array(MEM_SZ);
mem.get = function(addr) {
	switch (addr&3) {
		case 0 : return this.datas[addr>>2];
		case 1 : return (this.datas[addr>>2]>>8)  | (this.datas[(addr>>2)+1]&255);
		case 2 : return (this.datas[addr>>2]>>16) | (this.datas[(addr>>2)+1]&65535);
		case 3 : return (this.datas[addr>>2]>>24) | (this.datas[(addr>>2)+1]&((65535<<8)|255)) ;
	}
}
mem.set = function(value, addr, size) {
	switch (addr&3) {
		case 0 : 
			this.datas[addr>>2] -= this.datas[addr>>2] & ((1<<size)-1);
			this.datas[addr>>2] += value & ((1<<size)-1);
			break;
		case 1 :
			if (size <= 24) {
				this.datas[addr>>2] -= this.datas[addr>>2] & (((1<<size)-1)<<8);
				this.datas[addr>>2] += (value & ((1<<size)-1))<<8;
			} else {
				this.datas[addr>>2] -= this.datas[addr>>2] & (((1<<24)-1)<<8);
				this.datas[addr>>2] += (value & ((1<<24)-1))<<8;
				this.datas[(addr>>2)+1] -= this.datas[addr>>2] & ((1<<(size-24))-1);
				this.datas[(addr>>2)+1] += value & (1<<(size-24)-1);
			}
			break;
		case 2 :
			if (size <= 16) {
				this.datas[addr>>2] -= this.datas[addr>>2] & (((1<<size)-1)<<16);
				this.datas[addr>>2] += (value & ((1<<size)-1))<<16;
			} else {
				this.datas[addr>>2] -= this.datas[addr>>2] & (((1<<16)-1)<<16);
				this.datas[addr>>2] += (value & ((1<<24)-1))<<16;
				this.datas[(addr>>2)+1] -= this.datas[addr>>2] & ((1<<(size-16))-1);
				this.datas[(addr>>2)+1] += value & (1<<(size-16)-1);
			}
			break;
		case 2 :
			if (size <= 8) {
				this.datas[addr>>2] -= this.datas[addr>>2] & (((1<<size)-1)<<24);
				this.datas[addr>>2] += (value & ((1<<size)-1))<<24;
			} else {
				this.datas[addr>>2] -= this.datas[addr>>2] & (((1<<8)-1)<<24);
				this.datas[addr>>2] += (value & ((1<<8)-1))<<24;
				this.datas[(addr>>2)+1] -= this.datas[addr>>2] & ((1<<(size-8))-1);
				this.datas[(addr>>2)+1] += value & (1<<(size-8)-1);
			}
			break;
	}
}

//	cpu
var cpu = new Object();
cpu.reg = reg;
cpu.mem = mem;
cpu.active = 0;
cpu.halt = 0;
cpu.fatal = function() {
	printf("processor halted! cycle = %u pc = %08x ir = %08x sp = %08x a = %d b = %d c = %d trap = %u\n", 
		this.cycle + ((this.xpc - this.xcycle)>>2), this.xpc - this.tpc, this.ir, this.xsp - this.tsp, 
		this.reg.ra, this.reg.rb, this.reg.rc, this.reg.trapG());
	this.active = 0;
	this.halt = 1;
}
cpu.exce = function() {
	if (!this.reg.ienaG()) {
		println("exception in interrupt handler"); 
		return this.fatal(); 
	}
	this.itrp();
}
cpu.itrp = function() {
	this.reg.xsp -= this.reg.tsp; this.reg.tsp = this.reg.fsp = 0;
    if (this.reg.userG()) { 
    	this.reg.usp = this.reg.xsp; 
    	this.reg.xsp = this.reg.ssp; 
    	this.reg.userS(0); 
    	this.reg.trapS(USER); 
    }
    this.mem.vset(this.reg.xpc - this.reg.tpc, this.reg.xsp -= 8, 32, 0);
    if (this.mem.exce) {
    	println("kstack fault!"); 
    	return this.fatal();
    }
    this.mem.vset(this.reg.trapG(), this.reg.xsp -= 8, 32, 0);
    if (this.mem.exce) {
    	println("kstack fault!"); 
    	return this.fatal();
    }
    this.xcycle += this.ivec + this.tpc - this.xpc;
    this.xpc = this.mem.get(this.ivec + this.tpc, 32);
    this.fixpc();
}
cpu.fixpc = function() {
	var mget = this.mem.vget(this.xpc-this.tpc, 32, 0);
	if (this.mem.exce) {
		this.reg.trapS(TRAP_FIPAGE); 
		return this.exce();
	}
	this.xcycle -= this.tpc;
	this.xcycle += this.tpc = this.xpc = mget;
	this.fpc = (this.xpc+4096) & (-4096);
}
cpu.step = function() {
	this.inst = this.mem.get(this.reg.xpc);
	this.reg.xpc += 4;
	this.iid = this.inst&255;
	this.iim = this.inst>>8;
	switch (this.iid) {
		case 0x00 : this.active = 0; this.halt = 1; break;											// HALT
		case 0x01 : this.reg.sp += this.iim; break;													// ENT
		case 0x02 : this.xpc = this.mem.vget(this.reg.sp); this.reg.sp += this.iimf+8; break;		// LEV
		case 0x03 : this.xpc += this.iim; break;													// JMP
		case 0x04 : this.xpc += this.iim + this.reg.rfa>>2; break;									// JMPI
		case 0x05 : this.mem.push(this.reg.pc); this.reg.pc += this.iim; break;						// JSR
		case 0x06 : this.mem.push(this.reg.pc); this.reg.pc += this.reg.ra; break; 					// JSRA	
		case 0x07 : this.reg.ra = this.reg.sp + this.iim; break;									// LEA
		case 0x08 : this.reg.ra = this.rag.pc + this.iim; break;									// LEAG
		case 0x09 : this.reg.ra = this.cycle + (this.xpc-this.xcycle)/4; break;						// CYC	
		case 0x0A : this.mem.mcpy(); break;															// MCPY
		case 0x0B : this.mem.mcmp(); break;															// MCMP
		case 0x0C : this.mem.mchr(); break;															// MCHR
		case 0x0D : this.mem.mset(); break;															// MSET
		case 0x0E : this.reg.ra = this.mem.vget(this.reg.sp+this.iim, 32, 0); break;				// LL
		case 0x0F : this.reg.ra = this.mem.vget(this.reg.sp+this.iim, 16, 1); break;				// LLS
		case 0x10 : this.reg.ra = this.mem.vget(this.reg.sp+this.iim, 16, 0); break;				// LLH
		case 0x11 : this.reg.ra = this.mem.vget(this.reg.sp+this.iim, 8,  1); break;				// LLC
		case 0x12 : this.reg.ra = this.mem.vget(this.reg.sp+this.iim, 8,  0); break;				// LLB
		case 0x13 : this.reg.rf = this.mem.fget(this.reg.sp+this.iim, 32, 1); break;				// LLD
		case 0x14 : this.reg.rf = this.mem.fget(this.reg.sp+this.iim, 64, 1); break;				// LLF
		case 0x15 : this.reg.ra = this.mem.vget(this.reg.pc+this.iim, 32, 0); break;				// LG
		case 0x16 : this.reg.ra = this.mem.vget(this.reg.pc+this.iim, 16, 1); break;				// LGS
		case 0x17 : this.reg.ra = this.mem.vget(this.reg.pc+this.iim, 16, 0); break;				// LGH
		case 0x18 : this.reg.ra = this.mem.vget(this.reg.pc+this.iim, 8,  1); break;				// LGC
		case 0x19 : this.reg.ra = this.mem.vget(this.reg.pc+this.iim, 8,  0); break;				// LGB
		case 0x1A : this.reg.rf = this.mem.fget(this.reg.pc+this.iim, 32, 1); break;				// LGD
		case 0x1B : this.reg.rf = this.mem.fget(this.reg.pc+this.iim, 64, 1); break;				// LGF
		case 0x1C : this.reg.ra = this.mem.vget(this.reg.ra+this.iim, 32, 0); break;				// LX
		case 0x1D : this.reg.ra = this.mem.vget(this.reg.ra+this.iim, 16, 1); break;				// LXS
		case 0x1E : this.reg.ra = this.mem.vget(this.reg.ra+this.iim, 16, 0); break;				// LXH
		case 0x1F : this.reg.ra = this.mem.vget(this.reg.ra+this.iim, 8,  1); break;				// LXC
		case 0x20 : this.reg.ra = this.mem.vget(this.reg.ra+this.iim, 8,  0); break;				// LXB
		case 0x21 : this.reg.rf = this.mem.fget(this.reg.ra+this.iim, 32, 1); break;				// LXD
		case 0x22 : this.reg.rf = this.mem.fget(this.reg.ra+this.iim, 64, 1); break;				// LXF
		case 0x23 : this.reg.ra = this.imm; break;													// LI
		case 0x24 : this.reg.ra = (this.reg.ra<<24) | (this.iim&255); break;						// LHI
		case 0x25 : this.reg.rf = this.mem.cid(this.iim); break;									// LIF
		case 0x26 : this.reg.rb = this.mem.vget(this.reg.sp+this.iim, 32, 0); break;				// LBL
		case 0x27 : this.reg.rb = this.mem.vget(this.reg.sp+this.iim, 16, 1); break;				// LBLS
		case 0x28 : this.reg.rb = this.mem.vget(this.reg.sp+this.iim, 16, 0); break;				// LBLH
		case 0x29 : this.reg.rb = this.mem.vget(this.reg.sp+this.iim, 8,  1); break;				// LBLC
		case 0x2A : this.reg.rb = this.mem.vget(this.reg.sp+this.iim, 8,  0); break;				// LBLB
		case 0x2B : this.reg.rg = this.mem.fget(this.reg.sp+this.iim, 32, 1); break;				// LBLD
		case 0x2C : this.reg.rg = this.mem.fget(this.reg.sp+this.iim, 64, 1); break;				// LBLF
		case 0x2D : this.reg.rb = this.mem.vget(this.reg.pc+this.iim, 32, 0); break;				// LBG
		case 0x2E : this.reg.rb = this.mem.vget(this.reg.pc+this.iim, 16, 1); break;				// LBGS
		case 0x2F : this.reg.rb = this.mem.vget(this.reg.pc+this.iim, 16, 0); break;				// LBGH
		case 0x30 : this.reg.rb = this.mem.vget(this.reg.pc+this.iim, 8,  1); break;				// LBGC
		case 0x31 : this.reg.rb = this.mem.vget(this.reg.pc+this.iim, 8,  0); break;				// LBGB
		case 0x32 : this.reg.rg = this.mem.fget(this.reg.pc+this.iim, 32, 1); break;				// LBGD
		case 0x33 : this.reg.rg = this.mem.fget(this.reg.pc+this.iim, 64, 1); break;				// LBGF
		case 0x34 : this.reg.rb = this.mem.vget(this.reg.ra+this.iim, 32, 0); break;				// LBX
		case 0x35 : this.reg.rb = this.mem.vget(this.reg.ra+this.iim, 16, 1); break;				// LBXS
		case 0x36 : this.reg.rb = this.mem.vget(this.reg.ra+this.iim, 16, 0); break;				// LBXH
		case 0x37 : this.reg.rb = this.mem.vget(this.reg.ra+this.iim, 8,  1); break;				// LBXC
		case 0x38 : this.reg.rb = this.mem.vget(this.reg.ra+this.iim, 8,  0); break;				// LBXB
		case 0x39 : this.reg.rg = this.mem.fget(this.reg.ra+this.iim, 32, 1); break;				// LBXD
		case 0x3A : this.reg.rg = this.mem.fget(this.reg.ra+this.iim, 64, 1); break;				// LBXF
		case 0x3B : this.reg.rb = this.imm; break;													// LBI
		case 0x3C : this.reg.rb = (this.reg.ra<<24) | (this.iim&255); break;						// LBHI
		case 0x3D : this.reg.rg = this.mem.cid(this.iim); break;									// LBIF
		case 0x3E : this.reg.rb = this.reg.ra; break;												// LBA
		case 0x3F : this.reg.rg = this.reg.rf; break;												// LBAD
		case 0x40 : this.mem.vset(this.reg.ra, this.reg.sp+this.imm, 32, 0); break;					// SL
		case 0x41 : this.mem.vset(this.reg.ra, this.reg.sp+this.imm, 16, 0); break;					// SLH
		case 0x42 : this.mem.vset(this.reg.ra, this.reg.sp+this.imm, 8,  0); break;					// SLB
		case 0x43 : this.mem.fset(this.reg.rf, this.reg.sp+this.imm, 32, 1); break;					// SLD
		case 0x44 : this.mem.fset(this.reg.rf, this.reg.sp+this.imm, 64, 1); break;					// SLF
		case 0x45 : this.mem.vset(this.reg.ra, this.reg.pc+this.imm, 32, 0); break;					// SG
		case 0x46 : this.mem.vset(this.reg.ra, this.reg.pc+this.imm, 16, 0); break;					// SGH
		case 0x47 : this.mem.vset(this.reg.ra, this.reg.pc+this.imm, 8,  0); break;					// SGB
		case 0x48 : this.mem.fset(this.reg.rf, this.reg.pc+this.imm, 32, 1); break;					// SGD
		case 0x49 : this.mem.fset(this.reg.rf, this.reg.pc+this.imm, 64, 1); break;					// SGF
		case 0x4A : this.mem.vset(this.reg.ra, this.reg.rb+this.imm, 32, 0); break;					// SX
		case 0x4B : this.mem.vset(this.reg.ra, this.reg.rb+this.imm, 16, 0); break;					// SXH
		case 0x4C : this.mem.vset(this.reg.ra, this.reg.rb+this.imm, 8,  0); break;					// SXB
		case 0x4D : this.mem.fset(this.reg.rf, this.reg.rb+this.imm, 32, 1); break;					// SXD
		case 0x4E : this.mem.fset(this.reg.rf, this.reg.rb+this.imm, 64, 1); break;					// SXF
		case 0x4F : this.reg.rf += this.reg.rg; break;												// ADDF
		case 0x50 : this.reg.rf -= this.reg.rg; break;												// SUBF
		case 0x51 : this.reg.rf *= this.reg.rg; break;												// MULF
		case 0x52 : this.reg.rf /= this.reg.rg; break;												// DIVF
		case 0x53 : this.reg.ra += this.reg.rb; break;												// ADD
		case 0x54 : this.reg.ra += this.imm; break;													// ADDI
		case 0x55 : this.reg.ra += this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// ADDL
		case 0x56 : this.reg.ra -= this.reg.rb; break;												// SUB
		case 0x57 : this.reg.ra -= this.imm; break;													// SUBI
		case 0x58 : this.reg.ra -= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// SUBL
		case 0x59 : this.reg.ra *= this.reg.rb; break;												// MUL
		case 0x5A : this.reg.ra *= this.imm; break;													// MULI
		case 0x5B : this.reg.ra *= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// MULL
		case 0x5C : this.reg.ra /= this.reg.rb; break;												// DIV
		case 0x5D : this.reg.ra /= this.imm; break;													// DIVI
		case 0x5E : this.reg.ra /= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// DIVL
		case 0x5F : this.reg.ra >>>= 0; this.reg.ra /= this.reg.rb>>>0; break;						// DVU
		case 0x60 : this.reg.ra >>>= 0; this.reg.ra /= this.imm>>>0; break;							// DVUI
		case 0x61 : this.reg.ra >>>= 0; this.reg.ra /= this.mem.vget(this.reg.sp+this.imm, 32, 1)>>>0; break; // DVUL
		case 0x62 : this.reg.ra %= this.reg.rb; break;												// MOD
		case 0x63 : this.reg.ra %= this.imm; break;													// MODI
		case 0x64 : this.reg.ra %= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// MODL
		case 0x65 : this.reg.ra >>>= 0; this.reg.ra %= this.reg.rb>>>0; break;						// MDU
		case 0x66 : this.reg.ra >>>= 0; this.reg.ra %= this.imm>>>0; break;							// MDUI
		case 0x67 : this.reg.ra >>>= 0; this.reg.ra %= this.mem.vget(this.reg.sp+this.imm, 32, 1)>>>0; break; // MDUL
		case 0x68 : this.reg.ra &= this.reg.rb; break;												// AND
		case 0x69 : this.reg.ra &= this.imm; break;													// ANDI
		case 0x6A : this.reg.ra &= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// ANDL
		case 0x6B : this.reg.ra |= this.reg.rb; break;												// OR
		case 0x6C : this.reg.ra |= this.imm; break;													// ORI
		case 0x6D : this.reg.ra |= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// ORL
		case 0x6E : this.reg.ra ^= this.reg.rb; break;												// XOR
		case 0x6F : this.reg.ra ^= this.imm; break;													// XORI
		case 0x70 : this.reg.ra ^= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// XORL
		case 0x71 : this.reg.ra <<= this.reg.rb; break;												// SHL
		case 0x72 : this.reg.ra <<= this.imm; break;												// SHLI
		case 0x73 : this.reg.ra <<= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// SHLL
		case 0x74 : this.reg.ra >>= this.reg.rb; break;												// SHR
		case 0x75 : this.reg.ra >>= this.imm; break;												// SHRI
		case 0x76 : this.reg.ra >>= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// SHRL
		case 0x77 : this.reg.ra >>>= this.reg.rb; break;											// SRU
		case 0x78 : this.reg.ra >>>= this.imm; break;												// SRUI
		case 0x79 : this.reg.ra >>>= this.mem.vget(this.reg.sp+this.imm, 32, 1); break;				// SRUL
		case 0x7A : this.reg.ra = this.reg.ra == this.reg.rb ? 1 : 0; break;						// EQ
		case 0x7B : this.reg.ra = this.reg.rf == this.reg.rg ? 1 : 0; break;						// EQF
		case 0x7C : this.reg.ra = this.reg.ra != this.reg.rb ? 1 : 0; break;						// NE
		case 0x7D : this.reg.ra = this.reg.rf != this.reg.rg ? 1 : 0; break;						// NEF
		case 0x7E : this.reg.ra = this.reg.ra < this.reg.rb ? 1 : 0; break;							// LT
		case 0x7F : this.reg.ra = (this.reg.ra>>>0) < (this.reg.rb>>>0) ? 1 : 0; break;				// LTU
		case 0x80 : this.reg.ra = this.reg.rf < this.reg.rg ? 1 : 0; break;							// LTF
		case 0x81 : this.reg.ra = this.reg.ra >= this.reg.rb ? 1 : 0; break;						// GE
		case 0x82 : this.reg.ra = (this.reg.ra>>>0) >= (this.reg.rb>>>0) ? 1 : 0; break;			// GEU
		case 0x83 : this.reg.ra = this.reg.rf >= this.reg.rg ? 1 : 0; break;						// GEF
		case 0x84 : this.reg.pc += this.reg.ra == 0 ? this.imm : 0; break;							// BZ
		case 0x85 : this.reg.pc += this.reg.rf == 0 ? this.imm : 0; break;							// BZF
		case 0x86 : this.reg.pc += this.reg.ra != 0 ? this.imm : 0; break;							// BNZ
		case 0x87 : this.reg.pc += this.reg.rf != 0 ? this.imm : 0; break;							// BNZF
		case 0x88 : this.reg.pc += this.reg.ra == this.reg.rb ? this.imm : 0; break;				// BE
		case 0x89 : this.reg.pc += this.reg.rf == this.reg.rg ? this.imm : 0; break;				// BEF
		case 0x8A : this.reg.pc += this.reg.ra != this.reg.rb ? this.imm : 0; break;				// BNEZ
		case 0x8B : this.reg.pc += this.reg.rf != this.reg.rg ? this.imm : 0; break;				// BNEF
		case 0x8C : this.reg.pc += this.reg.ra < this.reg.rb ? this.imm : 0; break;					// BLT
		case 0x8D : this.reg.pc += this.reg.ra>>>0 < this.reg.rb>>>0 ? this.imm : 0; break;			// BLTU
		case 0x8E : this.reg.pc += this.reg.rf < this.reg.rg ? this.imm : 0; break;					// BLTF
		case 0x8F : this.reg.pc += this.reg.ra >= this.reg.rb ? this.imm : 0; break;				// BGE
		case 0x90 : this.reg.pc += this.reg.ra>>>0 >= this.reg.rb>>>0 ? this.imm : 0; break;		// BGEU
		case 0x91 : this.reg.pc += this.reg.rf >= this.reg.rg ? this.imm : 0; break;				// BGEF
		case 0x92 : this.reg.rf = this.mem.cid(this.reg.ra); break;									// CID
		case 0x93 : this.reg.rf = this.mem.cud(this.reg.ra); break;									// CUD
		case 0x94 : this.reg.ra = this.mem.cdi(this.reg.rf); break;									// CDI
		case 0x95 : this.reg.ra = this.mem.cdu(this.reg.rf); break;									// CDU
		case 0x96 : 																				// CLI
			if (this.reg.userG()) {this.reg.trapS(TRAP_FPRIV); break;}
			this.reg.ra = this.reg.ienaG(); this.reg.ienaS(0); break;						
		case 0x97 :																					// STI
			if (this.reg.userG()) {this.reg.trapS(TRAP_FPRIV); break;}
			if (this.ipend) {this.reg.trapS(this.ipend & -this.ipend); this.ipend ^= this.reg.trapG(); this.ienaS(0); return this.interrupt(); } 
			this.ienaS(1); break; 
		case 0x98 :																					// RTI
			if (this.reg.userG()) { this.reg.trapS(trap_FPRIV); break; }
      		this.reg.xsp -= this.reg.tsp; this.reg.tsp = this.reg.fsp = 0;
      		this.t = this.mem.vget(this.reg.xsp);
      		if (this.mem.exce) {
      			println("RTI kstack fault"); return this.fatal();
      		}
      		this.reg.xsp += 8;
      		this.xcycle += (this.reg.pc = this.mem.vget(this.reg.xsp) + this.reg.tpc) - (this.reg.xpc>>>0);
      		if (this.mem.exce) {
      			println("RTI kstack fault"); return this.fatal();
      		}
      		this.reg.xsp += 8;
      		this.reg.xpc = this.reg.pc;
      		if (this.t & USER) {
      			this.reg.ssp = this.reg.xsp; this.reg.xsp = this.reg.usp; this.reg.userS(1);
      		}
      		if (!this.reg.ienaG()) {
      			if (this.ipend) {this.reg.trapS(this.ipend & -this.ipend); this.ipend ^= this.reg.trapG(); this.ienaS(0); return this.interrupt();}
      			this.reg.ienaS(1);
      		}
      		return this.fixpc();
      	case 0x99 :																					// BIN
      	 	if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; } 
      		this.reg.ra = this.kbchar; this.kbchar = -1; break;  // XXX
      	case 0x9A :
      		if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; } 
      		if (this.reg.ra != 1) { println("bad write a="+a); return this.fatal(); }
      		this.ui.write(this.reg.ra, this.reg.rb, 1); break; 
      		if (this.t & USER) { 
      			this.reg.ssp = this.reg.xsp; 
      			this.reg.xsp = this.reg.usp; 
      			this.reg.userS(1);
      		}
      		if (!this.reg.ienaG()) { 
      			if (this.ipend) { this.reg.trapS(this.ipend & -this.ipend); this.ipend ^= this.reg.trapG(trap); return this.interrupt(); } 
      			this.reg.ienaS(1); 
      		}
      		return this.fixpc();
      	case 0x9b : break;																			// NOP
      	case 0x9c : 																				// SSP
      		this.reg.xsp = this.reg.ra; 
      		this.reg.tsp = this.reg.fsp = 0; 
      		return this.fixsp();
      		break;
      	case 0x9D :	this.mem.push(this.reg.ra, 32, 1); break;										// PSHA
      	case 0x9E :	this.mem.push(this.iim,	   32, 1); break;										// PSHI
      	case 0x9F :	this.mem.push(this.reg.rf, 64, 1); break;										// PSHF
      	case 0xA0 :	this.mem.push(this.reg.rb, 32, 1); break;										// PSHB
      	case 0xA1 : this.reg.rb = this.mem.pop(32, 1); break;										// POPB
      	case 0xA2 : this.reg.rf = this.mem.pop(64, 1); break;										// POPF
      	case 0xA3 : this.reg.ra = this.mem.pop(32, 1); break;										// POPA
      	case 0xA4 : 																				// IVEC
      		if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; } 
      		this.ivec = this.reg.ra; break;
      	case 0xA5 ; 																				// PDIR
      		if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; } 
      		if (this.reg.ra > memsz) { this.reg.trapS(TRAP_FMEM); break; } 
      		this.pdir = (this.mem + this.reg.ra) & -4096; 
      		this.flush(); 
      		this.reg.fsp = 0; return this.fixpc(); // set page directory
      	case 0xA6 :																					// SPAG
      		if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; } 
      		if (this.reg.ra && !this.pdir) { this.reg.trapS(TRAP_FMEM); break; } 
      		this.paging = this.reg.ra; 
      		this.flush(); 
      		this.reg.fsp = 0; 
      		return this.fixpc(); // enable paging
      	case 0xA7 :																					// TIME
      		if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; }
       		if (this.ir>>8) { dprintf(2,"timer%d=%u timeout=%u\n", this.ir>>8, this.timer, this.timeout); continue; }    // XXX undocumented feature!
       		this.timeout = this.reg.ra; break; // XXX cancel pending interrupts if disabled?
      	case 0xA8 :																					// LVAD
      		if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; } 
      		this.reg.ra = this.vadr; break;
      	case 0xA9 :																					// TRAP
      		this.reg.trapS(TRAP_FSYS); break;
      	case 0xAA :																					// LUSP
      		if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; } 
      		this.reg.ra = this.reg.usp; break;
      	case 0xAB :																					// SUSP
      		if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; } 
      		this.reg.usp = this.reg.ra; break;
      	case 0xAC :																					// LCL
      		this.reg.rc = this.mem.vget(this.reg.sp+this.iim, 32, 0); break;							
      	case 0xAD :																					// LCA
      		this.reg.rc = this.reg.ra; break;
      	case 0xAE :																					// PSHC
      		this.mem.push(this.reg.rc, 32, 1); break;
      	case 0xAF :																					// POPC
      		this.reg.rc = this.mem.pop(32, 1); break;
      	case 0xB0 :																					// MSIZ
      		if (this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; } 
      		this.reg.ra = this.memsz; break;
      	case 0xB1 :																					// PSHG
      		this.mem.push(this.reg.rg, 64, 1); break;
      	case 0xB2 :																					// POPG
      		this.reg.rg = this.mem.pop(64, 1); break;
      	case 0xBC :																					// POW
      		this.reg.rf = Math.pow(this.reg.rf, this.reg.rg); break;
      	case 0xBD :																					// ATAN2
      		this.reg.rf = Math.atan2(this.reg.rf, this.reg.rg); break;
      	case 0xBE :																					// FABS
      		this.reg.rf = Math.abs(this.reg.rf); break;
      	case 0xBF :																					// ATAN
      		this.reg.rf = Math.atan(this.reg.rf); break;
      	case 0xC0 :																					// LOG
      		this.reg.rf = Math.log(this.reg.rf); break;
      	case 0xC1 :																					// LOGT
      		this.reg.rf = Math.log(this.reg.rf)/Math.log(10); break;								
      	case 0xC2 :																					// EXP	
      		this.reg.rf = Math.exp(this.reg.rf); break;
      	case 0xC3 :																					// FLOR
      		this.reg.rf = Math.floor(this.reg.rf); break;
      	case 0xC4 :																					// CEIL
      		this.reg.rd = Math.ceil(this.reg.rf); break;
      	case 0xC5 :																					// HYPO
      		this.reg.rf = Math.hypo(this.reg.rf, this.reg.rg); break;
      	case 0xC6 :																					// SIN
      		this.reg.rf = Math.sin(this.reg.rf); break;
      	case 0xC7 :																					// COS
      		this.reg.rf = Math.cos(this.reg.rf); break;
      	case 0xC8 :																					// TAN
      		this.reg.rf = Math.tan(this.reg.rf); break;
      	case 0xC9 :																					// ASIN
      		this.reg.rf = Math.asin(this.reg.rf); break;
      	case 0xCA :																					// ACOS
      		this.reg.rf = Math.acos(this.reg.rf); break;
      	case 0xCB :																					// SINH
      		this.reg.rf = Math.sinh(this.reg.rf); break;
      	case 0xCC :																					// COSH
      		this.reg.rf = Math.cosh(this.reg.rf); break;
      	case 0xCD :																					// TANH
      		this.reg.rf = Math.tanh(this.reg.rf); break;
      	case 0xCE :																					// SQRT
      		this.reg.rf = Math.sqrt(this.reg.rf); break;
      	case 0xCF :																					// FMOD
      		this.reg.rf = Math.fmod(this.reg.rf, this.reg.rg); break;
      	case 0xD1 :																					// IDLE
      		if ( this.reg.userG()) { this.reg.trapS(TRAP_FPRIV); break; }
      		if (!this.reg.ienaG()) { this.reg.trapS(TRAP_FINST); break; } // XXX this will be fatal !!!
      		for (;;) {
        		this.pfd.fd = 0;
				this.pfd.events = POLLIN;
				if (this.poll(this.pfd, 1, 0) == 1 && this.read(0, this.ch, 1) == 1) {
					this.kbchar = this.ch;
					if (this.kbchar == '`') { 
						println("ungraceful exit. cycle = %u\n", 
							this.cycle + (this.xpc - this.xcycle)>>2); 
						this.active = 0; 
						this.halt = 1;
						return; 
					}
				  	this.reg.trapS(TRAP_FKEYBD);
				  	this.reg.ienaS(0);
				  	return this.interrupt();
				}
				this.cycle += this.delta;
				if (this.timeout) {
					this.timer += this.delta;
					if (this.timer >= this.timeout) { // XXX  // any interrupt actually!
						this.timer = 0;
				    	this.reg.trapS(TRAP_FTIMER);
				    	this.reg.ienaS(0);
				    	return this.interrupt();
				  	}
				}
			}
	}
}

var ui = new Object();
ui.getcmd = function(cmd) {
	var i = cmd.indexOf(" ");
	var cmdH = i != -1 ? cmd.slice(0, i) : cmd;
	if (i != -1) cmd = cmd.slice(i+1);
	switch (cmdH) {
		case 'c' : 
			
		case 'b' :
			
		case 'p' :
			
		case 'x' :
			
		case 's' :
			this.cpu.step();
			break;
		case 'i' :
	}
}

