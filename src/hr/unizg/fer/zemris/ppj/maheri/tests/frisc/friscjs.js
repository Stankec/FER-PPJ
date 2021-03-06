//
//  Helper functions 
//

var halfFlagSKR = 1;

/* Converts integer value to binary, specifying the length in bits of output */
function convertIntToBinary(value, numberOfDigits) {
  var retVal = new Array(numberOfDigits);
  
  for (var i=0; i<numberOfDigits; i++) {
    retVal[numberOfDigits-i-1] = (value & (1<<i)) ? 1 : 0; 
  }
  
  return retVal.join('');
}

/* Returns the integer represented by 'value'.
 * - value is a string of ones and zeroes. If it is empty or contains another digit, an exception is thrown.
 * - [signed=false] can be either true, false, 0 or 1. For any other value, an exception is thrown as it is 
 * likely a silent error. */
function convertBinaryToInt(value, signed) {
  if (value.length === 0) {
    throw "'value' must be nonempty";
  }

  var retVal = 0, bit;
  
  if (typeof signed === 'undefined') {
    signed = 0;
  }
  if (signed!==0 && signed!==1 && signed!==true && signed!==false) {
    throw "invalid 'signed' value " + signed.toString();
  }
  
  for (var i=0, numberOfBits=value.length; i<numberOfBits-signed; i++) {
    bit = value[numberOfBits - 1 - i];
    if (bit !== '0' && bit !== '1') {
      throw "invalid bit in binary string 'value' at position " + (numberOfBits - 1 - i) + ' (' + bit + ')';
    }
    // using Math.pow here since 'i' can be >30
    retVal += (value[numberOfBits - i - 1] === '1') * Math.pow(2, i);
  }
  
  return (signed && value[0] === '1') ? ( Math.pow(2, value.length-1) - retVal) * -1 : (retVal);
}

/* Returns a bit string representing bits from 'start' to 'end' (inclusive) of 'number'.
 * The bits are counted from right to left, i.e. the LSB is the bit 0.
 * The returned string contains bits with indices 'end', 'end'-1, ... 'start'.
 * - number is either a bit string or a number object that is converted into a
 * 32-bit bit string - otherwise, null is returned
 * - start is a valid 0-based index of the lowest requested bit
 * - end is a valid 0-based index of the highest requested bit */
function getBitString(number, start, end) {
  if (typeof number === 'string') {
    return number.substring(number.length - end - 1, number.length - start);
  } else if (typeof number === 'number') {
    return getBitString(convertIntToBinary(number, 32), start, end);
  } else {
    return null;
  }
}

/* Returns 'binaryString' sign-extended to 'numberOfBits' bits.
 * - binaryString is a string of ones and zeroes
 * - numberOfBits is the desired number of bits for the extended number. If
 * it is less than or eqaul to binaryString.length, binaryString is returned unchanged.
 * - [signed=false] is a flag signaling if binaryString is signed or unsigned */
function extend(binaryString, numberOfBits, signed) {
  var bit = signed ? binaryString[0] : '0';
  var len = binaryString.length;
  var prefix = '';

  for (var i=0; i<numberOfBits-len; i++) {
    prefix += bit;
  }
  
  return prefix + binaryString;
}

/* Returns the two's complement of 'value' with respect to the specified
 * 'mask' that must be an all ones bitmask defining the word size.
 *
 * - value is an integer
 * - mask is an all ones bitmask of word size bits */
function twosComplement(value, mask) {
  // 'mask' is defined as a bitmask instead of the word size as a number
  // because ((1<<i)-1) will not work if i==32 since (1<<32) is a no-op
  return (~value + 1) & mask;
}

/* Returns a string of length 'stringLength' of characters 'character'.
 *
 * - character is any character
 * - stringLength is a non-negative integer */

function generateStringOfCharacters(character, stringLength) {
  var retVal = [];
  
  if (typeof stringLength !== 'number' || stringLength < 0) {
    throw new Error('stringLength must be a non-negative integer');
  }

  for (var i=0; i<stringLength; i++) {
    retVal.push(character);
  }

  return retVal.join('');
}

var FRISC = function() {

  //
  //  FRISC memory component
  //

  var MEM = {
    /* Memory has size 256KB, i.e. from 0x00000000 to 0x0003FFFF */
    _size: 256*1024,
    _memory: [],

    /* Read 8-bit byte from a given address */
    readb: function(addr) { 
      if (addr < 0) {
        addr = convertBinaryToInt(convertIntToBinary(addr, 32), 0);
      }
      
      var ioUnit = IO.testMemoryOverlap(addr);

      if (ioUnit === null) {
        return 0xFF & this._memory[addr];
      } else {
        return 0xFF & ioUnit.readb(addr);
      }
    },
  
    /* Read 16-bit word from a given address */
    readw: function(addr) {
      if (addr < 0) {
        addr = convertBinaryToInt(convertIntToBinary(addr, 32), 0);
      }
      
      var ioUnit = IO.testMemoryOverlap(addr);

      if (ioUnit === null) {
        var v1 = (0xFF & this._memory[addr+0]) << 0;
        var v2 = (0xFF & this._memory[addr+1]) << 8;
        return v1 + v2
      } else {
        return 0xFFFF & ioUnit.readw(addr);
      }
    },
  
    /* Read 32-bit word from a given address */
    read: function(addr) {
      if (addr < 0) {
        addr = convertBinaryToInt(convertIntToBinary(addr, 32), 0);
      }
      
      var ioUnit = IO.testMemoryOverlap(addr);

      if (ioUnit === null) {
        var v1 = (0xFF & this._memory[addr+0]) << 0;
        var v2 = (0xFF & this._memory[addr+1]) << 8;
        var v3 = (0xFF & this._memory[addr+2]) << 16;
        var v4 = (0xFF & this._memory[addr+3]) << 24;

        return v1 + v2 + v3 + v4;
      } else {
        return 0xFFFFFFFF & ioUnit.read(addr);
      }
    },
  
    /* Write 8-bit byte to a given address */
    writeb: function(addr, val) {
      if (addr < 0) {
        addr = convertBinaryToInt(convertIntToBinary(addr, 32), 0);
      }
      
      var ioUnit = IO.testMemoryOverlap(addr);

      if (ioUnit === null) {
        this._memory[addr] = 0xFF & val;
      } else {
        ioUnit.writeb(addr, 0xFF & val);
      }

      if (typeof this.onMemoryWrite !== 'undefined') {
        this.onMemoryWrite(addr, 0xFF & val, 1);
      }
    },
    
    /* Write 16-bit word to a given address */
    writew: function(addr, val) {
      if (addr < 0) {
        addr = convertBinaryToInt(convertIntToBinary(addr, 32), 0);
      }
      
      var ioUnit = IO.testMemoryOverlap(addr);

      if (ioUnit === null) {
        this._memory[addr+0] = 0xFF & (val >> 0);
        this._memory[addr+1] = 0xFF & (val >> 8);
      } else {
        ioUnit.writew(addr, 0xFFFF & val);
      }

      if (typeof this.onMemoryWrite !== 'undefined') {
        this.onMemoryWrite(addr, 0xFFFF & val, 2);
      }
    },
    
    /* Write 32-bit word to a given address */
    write: function(addr, val) {
      if (addr < 0) {
        addr = convertBinaryToInt(convertIntToBinary(addr, 32), 0);
      }
      
      var ioUnit = IO.testMemoryOverlap(addr);

      if (ioUnit === null) {
        this._memory[addr+0] = 0xFF & (val >> 0);
        this._memory[addr+1] = 0xFF & (val >> 8);
        this._memory[addr+2] = 0xFF & (val >> 16);
        this._memory[addr+3] = 0xFF & (val >> 24);
      } else {
        ioUnit.write(addr, 0xFFFFFFFF & val);
      }
      
      if (typeof this.onMemoryWrite !== 'undefined') {
        this.onMemoryWrite(addr, 0xFFFFFFFF & val, 4);
      }
    },
    
    /* Reset memory to initial state */
    reset: function() {
      this._memory = [];
      
      for (var i=0; i<this._size; i++) {
        this._memory[i] = 0;
      }
    },
    
    /* Load memory with some program enocoded as string, byte by byte */
    loadByteString: function(str) {
      this.reset();
      
      if (this._size < str.length) {
        throw new Error('Memory too small to fit program.');
      }
 
      for (var i=0; i<str.length; i++) {
        this._memory[i] = str.charCodeAt(i);
      }
    },
    
    /* Load memory with some program, byte by byte */
    loadBytes: function(bytes) {
      this.reset();

      if (this._size < bytes.length) {
        throw new Error('Memory too small to fit program.');
      }
      
      for (var i=0; i<bytes.length; i++) {
        this._memory[i] = bytes[i];
      }
    },
    
    /* Load memory with some program, binary string by binary string */
    loadBinaryString: function(binaryStrings) {
      this.reset();

      if (this._size < binaryStrings.length) {
        throw new Error('Memory too small to fit program.');
      }
      
      for (var i=0; i<binaryStrings.length; i++) {
        this._memory[i] = parseInt(binaryStrings[i], 2);
      }
    }
  };
  
  //
  //  FRISC CPU component
  //
  var CPU = {
    // Internal state
    _r: {r0:0, r1:0, r2:0, r3:0, r4:0, r5:0, r6:0, r7:0, pc:0, sr:0, iif:1},
    _regMap: { '000' : 'r0', '001' : 'r1', '010' : 'r2', '011' : 'r3', '100' : 'r4', '101' : 'r5', '110' : 'r6', '111' : 'r7' },
    _f: {INT2:1024, INT1:512, INT0:256, GIE:128, EINT2:64, EINT1:32, EINT0:16, Z:8, V:4, C:2, N:1},
    _frequency : 1,

    // bitmasks
    _SIGN_BIT: 0x80000000,
    _NONSIGN_BITS: 0x7FFFFFFF,
    _WORD_BITS: 0xFFFFFFFF,
    _SHIFT_BITS: 0x0000001F,
    
    _setFlag: function(flag, value) {
      this._r.sr = value ? (this._r.sr | flag) : (this._r.sr & ~(flag));
    },
    
    _getFlag: function(flag) {
      return ((this._r.sr & flag) !== 0) + 0;
    },
    
    _testCond: function(cond) {
      var result = true;
      
      if (cond === '') {                // **** Unconditional   TRUE
        result = true;
      } else if (cond === '_N/M') {     // ******** N,M         N=1
        result = !!(this._getFlag(this._f.N));
      } else if (cond === '_NN/P') {    // ******** NN,P        N=0
        result = !(this._getFlag(this._f.N));
      } else if (cond === '_C/ULT') {   // ******** C,ULT       C=1
        result = !!(this._getFlag(this._f.C));
      } else if (cond === '_NC/UGE') {  // ******** NC,UGE      C=0
        result = !(this._getFlag(this._f.C));
      } else if (cond === '_V') {       // ******** V           V=1
        result = !!(this._getFlag(this._f.V));
      } else if (cond === '_NV') {      // ******** NV          V=0
        result = !(this._getFlag(this._f.V));
      } else if (cond === '_Z/EQ') {    // ******** Z,EQ        Z=1
        result = !!(this._getFlag(this._f.Z));
      } else if (cond === '_NZ/NE') {   // ******** NZ,NE       Z=0
        result = !(this._getFlag(this._f.Z));
      } else if (cond === '_ULE') {     // ******** ULE         C=1 ili Z=1
        result = !!(this._getFlag(this._f.C)) ||
                 !!(this._getFlag(this._f.Z));
      } else if (cond === '_UGT') {     // ******** UGT         C=0 i Z=0
        result = !(this._getFlag(this._f.C)) ||
                 !(this._getFlag(this._f.Z));
      } else if (cond === '_SLT') {     // ******** SLT         (N xor V)=1
        result = !!(this._getFlag(this._f.N)) !== 
                 !!(this._getFlag(this._f.V));
      } else if (cond === '_SLE') {     // ******** SLE         (N xor V)=1 ili Z=1
        result = (!!(this._getFlag(this._f.N)) !==
                  !!(this._getFlag(this._f.V))) ||
                  !!(this._getFlag(this._f.Z));
      } else if (cond === '_SGE') {     // ******** SGE         (N xor V)=0
        result = !!(this._getFlag(this._f.N)) ===
                 !!(this._getFlag(this._f.V));
      } else if (cond === '_SGT') {     // ******** SGT         (N xor V)=0 i Z=0
        result = (!!(this._getFlag(this._f.N)) ===
                  !!(this._getFlag(this._f.V))) && 
                   !(this._getFlag(this._f.Z));
      } else {
        throw new Error('Undefined test condition.');
      }
      
      return result;
    },
    
    _decode: function(statement) {
      var opCode = getBitString(statement, 27, 31);
      var op = this._instructionMap[opCode];
      var args = [];

      if (typeof op === 'undefined') {
        return { op : null, args : null };  
      }
      
      if (op === 'MOVE') {
        var src = getBitString(statement, 21, 21);
        
        if (src === '1') {
          src = 'sr';
        } else {
          src = getBitString(statement, 26, 26);
          
          if (src === '0') {
            src = getBitString(statement, 17, 19);
            src = this._regMap[src];
          } else {
            src = getBitString(statement, 0, 19);
            src = extend(src, 32, 1);
            src = convertBinaryToInt(src, 1);
          }
        }
        
        var dest = getBitString(statement, 20, 20);
        
        if (dest === '1') {
          dest = 'sr';
        } else {    
          dest = getBitString(statement, 23, 25);
          dest = this._regMap[dest];
        }
        
        args.push(src);
        args.push(dest);
      } else if (op === 'OR' || op === 'AND' || op === 'XOR' || op === 'ADD' || op === 'ADC' || op === 'SUB' || op === 'SBC' || op === 'ROTL' || op === 'ROTR' || op === 'SHL' || op === 'SHR' || op === 'ASHR') {
        var source1 = getBitString(statement, 20, 22);

        source1 = this._regMap[source1];
        
        var source2 = getBitString(statement, 26, 26);
        
        if (source2 === '0') {
          source2 = getBitString(statement, 17, 19); // Rx
          source2 = this._regMap[source2];
        } else {
          source2 = getBitString(statement, 0, 19); // number
          source2 = extend(source2, 32, 1);
          source2 = convertBinaryToInt(source2, 1);
        }
        
        var dest = getBitString(statement, 23, 25); // Rx
        dest = this._regMap[dest];
        
        args.push(source1);
        args.push(source2);
        args.push(dest);
      } else if (op === 'CMP') {
        var source1 = getBitString(statement, 20, 22);
        source1 = this._regMap[source1];
        
        var source2 = getBitString(statement, 26, 26);
        
        if (source2 === '0') {
          source2 = getBitString(statement, 17, 19); // Rx
          source2 = this._regMap[source2];
        } else {
          source2 = getBitString(statement, 0, 19); // number
          source2 = extend(source2, 32, 1);
          source2 = convertBinaryToInt(source2, 1);
        }
        
        args.push(source1);
        args.push(source2);
      } else if (op === 'JP' || op === 'CALL') {
        var cond = getBitString(statement, 22, 25);
        cond = this._conditionMap[cond];

        if (typeof cond === 'undefined') {
          args = null;
        } else {  
          var dest = getBitString(statement, 26, 26);
          
          if (dest === '0') {
            dest = getBitString(statement, 17, 19); // Rx
            dest = this._regMap[dest];
          } else {
            dest = getBitString(statement, 0, 19); // number
            dest = extend(dest, 32, 1);
            dest = convertBinaryToInt(dest, 1);
          }
          
          args.push(cond);
          args.push(dest);
        }
      } else if (op === 'JR') {
        var cond = getBitString(statement, 22, 25);
        cond = this._conditionMap[cond];
        
        if (typeof cond === 'undefined') {
          args = null;
        } else { 
          var dest = getBitString(statement, 0, 19); // number
          dest = extend(dest, 32, 1);
          dest = convertBinaryToInt(dest, 1);
        
          args.push(cond);
          args.push(dest);
        }
      } else if (op === 'RET') {     
        var cond = getBitString(statement, 22, 25);
        cond = this._conditionMap[cond];
        
        if (typeof cond === 'undefined') {
          args = null;
        } else {
          var isRETI = getBitString(statement, 0, 0) === '1' && getBitString(statement, 1, 1) === '0';
          var isRETN = getBitString(statement, 0, 0) === '1' && getBitString(statement, 1, 1) === '1';
          
          args.push(cond);
          args.push(isRETI);
          args.push(isRETN);
        }
      } else if (op === 'LOAD' || op === 'STORE' || op === 'LOADB' || op === 'STOREB' || op === 'LOADH' || op === 'STOREH') {
        var addr = getBitString(statement, 26, 26);
        var offset = 0;
        
        if (addr === '0') {
          addr = 0;
        } else {
          addr = getBitString(statement, 20, 22);
          addr = this._regMap[addr];
        }
        
        offset = getBitString(statement, 0, 19);
        offset = extend(offset, 32, 1);
        offset = convertBinaryToInt(offset, 1);
        
        var reg = getBitString(statement, 23, 25);
        reg = this._regMap[reg];
        
        args.push(reg);
        args.push(addr);
        args.push(offset);
      } else if (op === 'POP' || op === 'PUSH') {
        var reg = getBitString(statement, 23, 25);
        reg = this._regMap[reg];
        
        args.push(reg);
      } else if (op === 'HALT') {
        var cond = getBitString(statement, 22, 25);
        cond = this._conditionMap[cond];
        
        if (typeof cond === 'undefined') {
          args = null;
        } else {
          args.push(cond);
        }
      }
      
      return { op : op, args : args };  
    },

    // Simulates the addition 'v1'+'v2'+'v3' and stores the result in the 
    // register specified by 'dest' and updates flags.
    _ADD_three: function(v1, v2, v3, dest) {
      // the & just forces ToInt32 from ECMA-262
      // v1+v2+v3 can be represented exactly by Number as it is <=2^53
      // so there is no loss of precision
      var res = (v1+v2+v3) & this._WORD_BITS; 
      
      // calculate carry on the next-to-last bit
      var t1 = v1 & this._NONSIGN_BITS;
      var t2 = v2 & this._NONSIGN_BITS;
      var t3 = v3 & this._NONSIGN_BITS;
      // (t1+t2+t3) can't overflow 32 bits by construction of t1, t2 and t3
      var c_ntl = ((t1+t2+t3)>>31) & 1;
      
      // calculate carry on the last bit
      var b1 = (v1>>31) & 1;
      var b2 = (v2>>31) & 1;
      var b3 = (v3>>31) & 1;
      var c_last = b1+b2+b3+c_ntl>1 ? 1 : 0;
        
      this._setFlag(this._f.C, c_last);
      this._setFlag(this._f.V, c_ntl ^ c_last);
      this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
      this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);

      this._r[dest] = res;
      //print(" --> R'"+dest+"': "+res+" <-- ");
      //print(" --> "+this._r.r0+" <-- ");
    },

    _SUB_internal: function(src1, src2, carry, dest) {
      // do the three-way add with two's complements of src2 and the carry bit
      this._ADD_three(this._r[src1],
          twosComplement(typeof src2==='number' ? src2 : this._r[src2], this._WORD_BITS),
          twosComplement(carry, this._WORD_BITS),
          dest);
      // invert the carry bit so that C=1 indicates unsigned underflow
      // which makes it consistent with SBC
      this._setFlag(this._f.C, 1 - this._getFlag(this._f.C))
    },
    
    _i: {
      POP: function(dest) {
        this._r[dest] = MEM.read(this._r.r7 & ~(0x03));
        this._r.r7 += 4;
      },
      
      PUSH: function(src) {
        this._r.r7 -= 4;
        MEM.write(this._r.r7 & ~(0x03), this._r[src]);
      },
      
      ADD: function(src1, src2, dest) {        
        this._ADD_three(this._r[src1],
            typeof src2==='number' ? src2 : this._r[src2],
            0,
            dest);
      },
      
      ADC: function(src1, src2, dest) {
        this._ADD_three(this._r[src1],
            typeof src2==='number' ? src2 : this._r[src2],
            this._getFlag(this._f.C),
            dest);
      },
      
      SUB: function(src1, src2, dest) {
        this._SUB_internal(src1, src2, 0, dest);
      },
      
      SBC: function(src1, src2, dest) {
        this._SUB_internal(src1, src2, this._getFlag(this._f.C), dest);
      },
      
      CMP: function(src1, src2) {
        var res = this._r[src1] - (typeof src2 === 'number' ? src2 : this._r[src2]);
        
        this._setFlag(this._f.C, (res > this._WORD_BITS) + 0);
        this._setFlag(this._f.V, (res > this._WORD_BITS) + 0);
        this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
        this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);
      },
      
      AND:  function(src1, src2, dest) {
        var res = this._r[src1] & (typeof src2 === 'number' ? src2 : this._r[src2]);
        
        this._setFlag(this._f.C, 0);
        this._setFlag(this._f.V, 0);
        this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
        this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);
        
        this._r[dest] = res & this._WORD_BITS;     
      },
      
      OR:  function(src1, src2, dest) {
        var res = this._r[src1] | (typeof src2 === 'number' ? src2 : this._r[src2]);
        
        this._setFlag(this._f.C, 0);
        this._setFlag(this._f.V, 0);
        this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
        this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);
        
        this._r[dest] = res & this._WORD_BITS;     
      },
      
      XOR:  function(src1, src2, dest) {
        var res = this._r[src1] ^ (typeof src2 === 'number' ? src2 : this._r[src2]);
        
        this._setFlag(this._f.C, 0);
        this._setFlag(this._f.V, 0);
        this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
        this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);
        
        this._r[dest] = res & this._WORD_BITS;     
      },
      
      SHL: function(src1, src2, dest) {
        src2 = (typeof src2 === 'number' ? src2 : this._r[src2]);
        src2 = src2 & this._SHIFT_BITS;
        
        src1 = convertIntToBinary(this._r[src1], 32);
        src1 = src1 + generateStringOfCharacters('0', src2); 

        var carry = src2 === 0 ? 0 : (src1[src2-1] === '1' ? 1 : 0);
        var res = convertBinaryToInt(src1.substring(src2));

        this._setFlag(this._f.C, carry);
        this._setFlag(this._f.V, 0);
        this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
        this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);
        
        this._r[dest] = res & this._WORD_BITS; 
      },
      
      SHR: function(src1, src2, dest) {
        src2 = (typeof src2 === 'number' ? src2 : this._r[src2]);
        src2 = src2 & this._SHIFT_BITS;

        src1 = convertIntToBinary(this._r[src1], 32);
        src1 = generateStringOfCharacters('0', src2) + src1;

        var carry = src2 === 0 ? 0 : (src1[32] === '1' ? 1 : 0);
        var res = convertBinaryToInt(src1.substring(0, 32));
        
        this._setFlag(this._f.C, carry);
        this._setFlag(this._f.V, 0);
        this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
        this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);
        
        this._r[dest] = res & this._WORD_BITS; 
      },
      
      ASHR: function(src1, src2, dest) {
        src2 = (typeof src2 === 'number' ? src2 : this._r[src2]);
        src2 = src2 & this._SHIFT_BITS;

        src1 = convertIntToBinary(this._r[src1], 32);        
        src1 = generateStringOfCharacters(src1[0], src2) + src1;

        var carry = src2 === 0 ? 0 : (src1[32] === '1' ? 1 : 0);
        var res = convertBinaryToInt(src1.substring(0, 32));
        
        this._setFlag(this._f.C, carry);
        this._setFlag(this._f.V, 0);
        this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
        this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);
        
        this._r[dest] = res & this._WORD_BITS; 
      },
      
      ROTL: function(src1, src2, dest) {
        src2 = (typeof src2 === 'number' ? src2 : this._r[src2]);
        src2 = src2 & this._SHIFT_BITS;

        src1 = convertIntToBinary(this._r[src1], 32);
        var carry = src2 === 0 ? 0 : (src1[(src2-1)%32] === '1' ? 1 : 0);

        src2 = src2 % 32; 
        var res = convertBinaryToInt(src1.substring(src2) + src1.substring(0, src2));

        this._setFlag(this._f.C, carry);
        this._setFlag(this._f.V, 0);
        this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
        this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);
        
        this._r[dest] = res & this._WORD_BITS; 
      },
      
      ROTR: function(src1, src2, dest) {
        src2 = (typeof src2 === 'number' ? src2 : this._r[src2]);
        src2 = src2 & this._SHIFT_BITS;
        
        src1 = convertIntToBinary(this._r[src1], 32);
        var carry = src2 === 0 ? 0 : (src1[32-src2] === '1' ? 1 : 0);

        src2 = src2 % 32; 
        var res = convertBinaryToInt(src1.substring(32-src2) + src1.substring(0, 32-src2));

        this._setFlag(this._f.C, carry);
        this._setFlag(this._f.V, 0);
        this._setFlag(this._f.N, !!(res & this._SIGN_BIT) + 0);
        this._setFlag(this._f.Z, !(res & this._WORD_BITS) + 0);
        
        this._r[dest] = res & this._WORD_BITS; 
      },
      
      MOVE: function(src, dest) {
        if (src === 'sr') {
          this._r[dest] = this._r[src] & 0xFF; 
        } else if (dest === 'sr') {
          this._r[dest] = (typeof src === 'number' ? src : this._r[src]) & 0xFF; 
        } else {    
          this._r[dest] = (typeof src === 'number' ? src : this._r[src]); 
        }
      },
      
      LOAD: function(reg, addr, offset) {
        var destAddr = (typeof addr === 'string' ? this._r[addr] : 0) + (typeof offset === 'number' ? offset : 0);
        destAddr &= ~(0x03);
        this._r[reg] = MEM.read(destAddr);
      }, 
  
      LOADH: function(reg, addr, offset) {
        var destAddr = (typeof addr === 'string' ? this._r[addr] : 0) + (typeof offset === 'number' ? offset : 0);
        destAddr &= ~(0x01);
        this._r[reg] = MEM.readw(destAddr);
      }, 
      
      LOADB: function(reg, addr, offset) {
        var destAddr = (typeof addr === 'string' ? this._r[addr] : 0) + (typeof offset === 'number' ? offset : 0);
        this._r[reg] = MEM.readb(destAddr);
      }, 
      
      STORE: function(reg, addr, offset) {
        var destAddr = (typeof addr === 'string' ? this._r[addr] : 0) + (typeof offset === 'number' ? offset : 0);
        destAddr &= ~(0x03);
        MEM.write(destAddr, this._r[reg]);
      },
      
      STOREH: function(reg, addr, offset) {
        var destAddr = (typeof addr === 'string' ? this._r[addr] : 0) + (typeof offset === 'number' ? offset : 0);
        destAddr &= ~(0x01);
        MEM.writew(destAddr, this._r[reg]);
      },
      
      STOREB: function(reg, addr, offset) {
        var destAddr = (typeof addr === 'string' ? this._r[addr] : 0) + (typeof offset === 'number' ? offset : 0);
        MEM.writeb(destAddr, this._r[reg]);
      },
      
      JP: function(cond, dest) {
        if (this._testCond(cond)) {
          this._r.pc = ((typeof dest === 'string' ? this._r[dest] : dest) & ~(0x03)) - 4;
        }
      },
       
      JR: function(cond, dest) {
        if (this._testCond(cond)) {
          this._r.pc = ((this._r.pc + dest) & ~(0x03)) - 4;
        }
      },
      
      CALL: function(cond, dest) {
        if (this._testCond(cond)) {
          this._r.r7 -= 4;
          MEM.write(this._r.r7, this._r.pc & ~(0x03));
          this._r.pc = ((typeof dest === 'string' ? this._r[dest] : dest) & ~(0x03)) - 4;
        }
      },
      
      RET: function(cond, isRETI, isRETN) {
        if (this._testCond(cond)) {
          this._r.pc = MEM.read(this._r.r7) & ~(0x03);
          this._r.r7 += 4;
          
          if (isRETI) {
            this._setFlag(this._f.GIE, 1);
          } else if (isRETN) {
            this._r.iif = 1;
          }
        }
      },
      
      HALT: function(cond) {
        if (this._testCond(cond)) {
          this.stop();
        }
      }
    },
        
    acceptNonmaskableInterrupt: function() {
      IO.sendIack();
      this._r.iif = 1;
      this._r.r7 -= 4;
      MEM.write(this._r.r7 & ~(0x03), this._r.pc - 4);
      this._r.pc = MEM.read(12);
    },
    
    acceptMaskableInterrupt: function() {
      this._setFlag(this._f.GIE, 0);
      this._r.r7 -= 4;
      MEM.write(this._r.r7 & ~(0x03), this._r.pc - 4);
      this._r.pc = MEM.read(8);
    },
    
    acceptInterrupt: function() {
      this._setFlag(this._f.INT2, IO.testInterrupt(2));
      this._setFlag(this._f.INT1, IO.testInterrupt(1));
      this._setFlag(this._f.INT0, IO.testInterrupt(0));
    
      if (this._r.iif === 0) {
        return;
      } else {
        if (IO.testInterrupt(3)) {
          this.acceptNonmaskableInterrupt();
        } else {
          if (this._getFlag(this._f.GIE) === 0) {
            return;
          } else {            
            if ((this._getFlag(this._f.INT2) && this._getFlag(this._f.EINT2)) ||
                (this._getFlag(this._f.INT1) && this._getFlag(this._f.EINT1)) || 
                (this._getFlag(this._f.INT0) && this._getFlag(this._f.EINT0))) {
              this.acceptMaskableInterrupt();
            }
          }
        }
      }
    },
  
    run: function() {

      halfFlagSKR = 1;
      while (halfFlagSKR) { halfFlagSKR  = 0; this.performCycle(); }
    },
  
    pause: function() {
        halfFlagSKR = 0;
    },
  
    stop: function() {
        halfFlagSKR = 0;

        //print("  HALT! = "+this._r.r0+";  ");
        //ppjResult = this._r.r0

      if (typeof this.onStop !== 'undefined') {
        this.onStop();
      }
    },
  
    performCycle: function() {

      halfFlagSKR  = 1;
      //print("  YAY!  ");

      var instruction = MEM.read(this._r.pc);
      var decodedInstruction = this._decode(instruction);
      
      if (decodedInstruction.op !== null && decodedInstruction.args !== null) {
        if (typeof this.onBeforeExecute !== 'undefined') {
          this.onBeforeExecute(decodedInstruction);
        }

        this._i[decodedInstruction.op].apply(this, decodedInstruction.args);
        this._r.pc += 4;
        
        this.acceptInterrupt();
        
        if (typeof this.onAfterCycle !== 'undefined') {
          this.onAfterCycle();
        }
      } else {

        this.stop();

        throw new Error('undefined operation code or wrongly defined arguments');
      }
    },
  
    reset: function() {
      this._r = {r0:0, r1:0, r2:0, r3:0, r4:0, r5:0, r6:0, r7:0, pc:0, sr:0, iif:1};
    },
  
    _instructionMap: {
      '00000' : 'MOVE',
      '00001' : 'OR',
      '00010' : 'AND',
      '00011' : 'XOR',
      '00100' : 'ADD',
      '00101' : 'ADC',
      '00110' : 'SUB',
      '00111' : 'SBC',
      '01000' : 'ROTL',
      '01001' : 'ROTR',
      '01010' : 'SHL',
      '01011' : 'SHR',
      '01100' : 'ASHR',
      '01101' : 'CMP',
      // 01110 Not used
      // 01111 Not used
      '11000' : 'JP',
      '11001' : 'CALL',
      '11010' : 'JR',
      '11011' : 'RET',
      '10110' : 'LOAD',
      '10111' : 'STORE',
      '10010' : 'LOADB',
      '10011' : 'STOREB',
      '10100' : 'LOADH',
      '10101' : 'STOREH',
      '10000' : 'POP',
      '10001' : 'PUSH',
      '11111' : 'HALT'
    },
  
    _conditionMap : {
      '0000' : '',
      '0001' : '_N/M',
      '0010' : '_NN/P',
      '0011' : '_C/ULT',
      '0100' : '_NC/UGE',
      '0101' : '_V',
      '0110' : '_NV',
      '0111' : '_Z/EQ',
      '1000' : '_NZ/NE',
      '1001' : '_ULE',
      '1010' : '_UGT',
      '1011' : '_SLT',
      '1100' : '_SLE',
      '1101' : '_SGE',
      '1110' : '_SGT'
    }
  };
  
  //
  //  FRISC IO components
  //
  
  var IO = {
  
    // units stored in arrays by interrupt level
    _units : {
      interrupt : [[], [], [], []],
      noninterrupt : []
    },
    
    // if processor sends iack, find io unit hooked up to int3 and clear interrupt state
    sendIack: function() {
      if (typeof this._units.interrupt[3][0] !== 'undefined') {
        this._units.interrupt[3][0].interruptState = 0;
        this._units.interrupt[3][0].onStateChangeInternal();
      }
    },
    
    // test if any unit of level intLevel has signaled an interrupt
    testInterrupt: function(intLevel) {
      var intSet = 0;
      
      for (var i=0; i<this._units.interrupt[intLevel].length; i++) {
        intSet = intSet | this._units.interrupt[intLevel][i].interruptState;
      }
      
      return intSet;
    },

    // create FRISC CT io unit
    createFriscCtIoUnit: function(id, options) {
      var ioUnit = this.createIoUnit(id, options);
      
      if (typeof options.frequency === 'undefined') {
        throw new Error('FRISC CT unit must be defined with a frequency parameter.');
      }

      if (options.frequency < 1 || options.frequency > 10000) {
        throw new Error('FRISC CT unit must have frequency < 10000 and > 0.');
      }

      ioUnit.frequency = options.frequency;

      ioUnit.onStateChangeInternal = function(addr, val) {
        if (typeof ioUnit.onStateChange !== 'undefined' && ioUnit.onStateChange !== null) {
          ioUnit.onStateChange();
        }
      };

      ioUnit.determineLocationAndOffset = function(addr) {
        return { location : (addr - ioUnit.memMapAddrStart)/4, offset : (addr%4) };
      };

      ioUnit.readb = function(addr) {
        var val = ioUnit.read(addr);
        var loc = ioUnit.determineLocationAndOffset(addr);

        return 0xFF & (val >> loc.offset*8);
      };

      ioUnit.readw = function(addr) {
        var val = ioUnit.read(addr);
        var loc = ioUnit.determineLocationAndOffset(addr);

        return 0xFFFF & (val >> loc.offset*8);
      };

      ioUnit.read = function(addr) {
        var loc = ioUnit.determineLocationAndOffset(addr);

        if (loc.location === 0) {
          return ioUnit.dc;
        } else if (loc.location === 1) {
          return ioUnit.readyStatus;
        } else if (loc.location === 2 || loc.location === 3) {
          return 0;
        }
      };

      ioUnit.writeb = function(addr, val) {
        var loc = ioUnit.determineLocationAndOffset(addr);
        
        ioUnit.write(addr, val << loc.offset*8);
      };

      ioUnit.writew = function(addr, val) {
        var loc = ioUnit.determineLocationAndOffset(addr);

        ioUnit.write(addr, val << loc.offset*8);
      };

      ioUnit.write = function(addr, val) {
        var loc = ioUnit.determineLocationAndOffset(addr);

        if (loc.location === 0) {
          ioUnit.lr = 0xFFFF & val;
          ioUnit.dc = 0xFFFF & val;
        } else if (loc.location === 1) {
          ioUnit.cr = val;
          ioUnit.shouldInterrupt = ((ioUnit.cr & 0x01) !== 0)+0;
          ioUnit.shouldCount = ((ioUnit.cr & 0x02) !== 0)+0;
        } else if (loc.location === 2) {
          ioUnit.readyStatus = 0;
          ioUnit.interruptState = 0;
        } else if (loc.location === 3) {
          ioUnit.shouldEndBeSignaled = 0;
        }

        ioUnit.onStateChangeInternal(addr, val);
      };
      
      ioUnit.init = function() {
        ioUnit.counterThread = setInterval(function() {
          if (ioUnit.shouldCount === 1) {
            ioUnit.dc -= 1;
    
            if (ioUnit.dc === 0) {
              ioUnit.dc = ioUnit.lr;
    
              if (ioUnit.shouldEndBeSignaled === 0) {
                ioUnit.readyStatus = 1;
                ioUnit.shouldEndBeSignaled = 1;
    
                if (ioUnit.shouldInterrupt) {
                  ioUnit.interruptState = 1;
                }
              }
            }
  
            ioUnit.onStateChangeInternal();
          }
        }, 1 / ioUnit.frequency);
      };
        
      ioUnit.reset = function() {
        for (var i=0; i<ioUnit.memMapAddrCount*4; i+=1) {
          ioUnit._memory[i] = 0;
        }
  
        ioUnit.interruptState = 0;
        ioUnit.readyStatus = 0;
        ioUnit.cr = 0;
        ioUnit.lr = 0;
        ioUnit.dc = 0;
        ioUnit.shouldInterrupt = 0;
        ioUnit.shouldEndBeSignaled = 0;
        ioUnit.shouldCount = 0;

        ioUnit.onStateChangeInternal();
      };
      
      ioUnit.remove = function() {
        clearInterval(ioUnit.counterThread);
      };
      
      ioUnit.reset();

      return ioUnit;
    },
    
    // create FRISC PIO io unit
    createFriscPioIoUnit: function(id, options) {
      var ioUnit = this.createIoUnit(id, options);
      
      ioUnit.onStateChangeInternal = function(addr, val) {
        if (typeof ioUnit.onStateChange !== 'undefined' && ioUnit.onStateChange !== null) {
          ioUnit.onStateChange();
        }
      };
      
      ioUnit.determineLocationAndOffset = function(addr) {
        return { location : (addr - ioUnit.memMapAddrStart)/4, offset : (addr%4) };
      };

      ioUnit.readb = function(addr) {
        var val = ioUnit.read(addr);
        var loc = ioUnit.determineLocationAndOffset(addr);

        return 0xFF & (val >> loc.offset*8);
      };

      ioUnit.readw = function(addr) {
        var val = ioUnit.read(addr);
        var loc = ioUnit.determineLocationAndOffset(addr);

        return 0xFFFF & (val >> loc.offset*8);
      };

      ioUnit.read = function(addr) {
        var loc = ioUnit.determineLocationAndOffset(addr);

        if (loc.location === 0) {
          return ioUnit.readyStatus;
        } else if (loc.location === 1) {
          return 0xFF & ioUnit.dr;
        } else if (loc.location === 2 || loc.location === 3) {
          return 0;
        }
      };
      
      ioUnit.writeb = function(addr, val) {
        var loc = ioUnit.determineLocationAndOffset(addr);
        
        ioUnit.write(addr, val << loc.offset*8);
      };

      ioUnit.writew = function(addr, val) {
        var loc = ioUnit.determineLocationAndOffset(addr);

        ioUnit.write(addr, val << loc.offset*8);
      };

      ioUnit.write = function(addr, val) {
        var loc = ioUnit.determineLocationAndOffset(addr);

        if (loc.location === 0) {
          if (ioUnit.maskFollows === 1) {
            ioUnit.maskFollows = 0;
            
            ioUnit.mask = val;
          } else {
            ioUnit.cr = val;
            
            ioUnit.isInputMode = ((ioUnit.cr & 0x01) !== 0)+0;
            ioUnit.shouldInterrupt = ((ioUnit.cr & 0x02) !== 0)+0;
            ioUnit.transferMode = ((ioUnit.cr & 0x04) !== 0)+0;
            
            if (ioUnit.isInputMode === 1 && ioUnit.transferMode === 1) {
              ioUnit.maskFollows = ((ioUnit.cr & 0x08) !== 0)+0;
              ioUnit.activeBit = ((ioUnit.cr & 0x010) !== 0)+0;
              ioUnit.andOrOr = ((ioUnit.cr & 0x020) !== 0)+0;
            }
          }
        } else if (loc.location === 1) {
          ioUnit.dr = 0xFF & val;
        } else if (loc.location === 2) {
          ioUnit.readyStatus = 0;
          ioUnit.interruptState = 0;
        } else if (loc.location === 3) {
          ioUnit.shouldEndBeSignaled = 0;
        }

        ioUnit.onStateChangeInternal(addr, val);
      };
      
      ioUnit.init = function() {
        ioUnit.dataThread = setInterval(function() {
          if (ioUnit.isInputMode === 1) {
            if (ioUnit.transferMode === 0) {
              if (ioUnit.shouldEndBeSignaled === 0) {
                ioUnit.dr = 0xFF & parseInt(Math.random()*256);
                ioUnit.readyStatus = 1;
                
                if (ioUnit.shouldInterrupt === 1) {
                  ioUnit.interruptState = 1;
                }
                
                ioUnit.shouldEndBeSignaled = 1;
              }
            } else {
              if (ioUnit.shouldEndBeSignaled === 0) {
                ioUnit.dr = 0xFF & parseInt(Math.random()*256);
                
                var v = (ioUnit.activeBit === 0) ? (0xFF & ~dr) : dr;
                
                if (ioUnit.andOrOr === 1) {
                  v = ((v & ioUnit.mask) ^ ioUnit.mask) !== 0;
                } else {
                  v = (v & ioUnit.mask) !== 0;
                }
                
                if (v === true) {
                  ioUnit.readyStatus = 1;
                
                  if (ioUnit.shouldInterrupt === 1) {
                    ioUnit.interruptState = 1;
                  }
                
                  ioUnit.shouldEndBeSignaled = 1;
                }
              }
            }
          } else if (ioUnit.isInputMode === 0) {
            if (ioUnit.transferMode === 0) {
              if (ioUnit.shouldEndBeSignaled === 0) {
                ioUnit.readyStatus = 1;
                
                if (ioUnit.shouldInterrupt === 1) {
                  ioUnit.interruptState = 1;
                }
                
                ioUnit.shouldEndBeSignaled = 1;
              }        
            }
          }
          
          ioUnit.onStateChangeInternal();
        }, 1 / ioUnit.frequency);
      };
      
      ioUnit.reset = function() {
        ioUnit.isInputMode = null;
        ioUnit.shouldInterrupt = 0;
        ioUnit.transferMode = 0;
        ioUnit.maskFollows = 0;
        ioUnit.mask = 0;
        ioUnit.activeBit = 0;
        ioUnit.andOrOr = 0;
        ioUnit.dr = 0;
        ioUnit.cr = 0;
        ioUnit.readyStatus = 0;
        ioUnit.interruptState = 0;
        ioUnit.shouldEndBeSignaled = 0;
        
        ioUnit.onStateChangeInternal();
      };
      
      ioUnit.remove = function() {
        clearInterval(ioUnit.dataThread);
      };
      
      ioUnit.reset();
      
      return ioUnit;
    },

    // create FRISC DMA io unit
    createFriscDmaIoUnit: function(id, options) {
      var ioUnit = this.createGenericIoUnit(id, options);

      ioUnit.onStateChangeInternal = function(addr, val) {
        if (typeof ioUnit.onStateChange !== 'undefined' && ioUnit.onStateChange !== null) {
          ioUnit.onStateChange();
        }
      };
          
      ioUnit.determineLocationAndOffset = function(addr) {
        return { location : (addr - ioUnit.memMapAddrStart)/4, offset : (addr%4) };
      };

      ioUnit.readb = function(addr) {
        var val = ioUnit.read(addr);
        var loc = ioUnit.determineLocationAndOffset(addr);

        return 0xFF & (val >> loc.offset*8);
      };

      ioUnit.readw = function(addr) {
        var val = ioUnit.read(addr);
        var loc = ioUnit.determineLocationAndOffset(addr);

        return 0xFFFF & (val >> loc.offset*8);
      };

      ioUnit.read = function(addr) {
        var loc = ioUnit.determineLocationAndOffset(addr);

        if (loc.location === 0) {
          return ioUnit.srcAddr;
        } else if (loc.location === 1) {
          return ioUnit.destAddr;
        } else if (loc.location === 2) {
          return ioUnit.counter;
        } else if (loc.location === 3) {
          return ioUnit.readyStatus;
        } else if (loc.location === 4) {
          return 0;
        } else if (loc.location === 5) {
          return 0;
        }
      };

      ioUnit.writeb = function(addr, val) {
        var loc = ioUnit.determineLocationAndOffset(addr);
        
        ioUnit.write(addr, val << loc.offset*8);
      };

      ioUnit.writew = function(addr, val) {
        var loc = ioUnit.determineLocationAndOffset(addr);

        ioUnit.write(addr, val << loc.offset*8);
      };
      
      ioUnit.write = function(addr, val) {
        var loc = ioUnit.determineLocationAndOffset(addr);

        if (loc.location === 0) {
          ioUnit.srcAddr = val;
        } else if (loc.location === 1) {
          ioUnit.destAddr = val;
        } else if (loc.location === 2) {
          ioUnit.counter = val;
        } else if (loc.location === 3) {
          ioUnit.cr = val;
          ioUnit.shouldInterrupt = ((ioUnit.cr & 0x01) !== 0)+0;
          ioUnit.transferMode = ((ioUnit.cr & 0x02) !== 0)+0;
          ioUnit.srcType = ((ioUnit.cr & 0x04) !== 0)+0;
          ioUnit.destType = ((ioUnit.cr & 0x08) !== 0)+0;
        } else if (loc.location === 4) {
          if (ioUnit.transferMode === 0) {  // halting
            while (ioUnit.counter > 0) {
              ioUnit.transferData();
            }
            
            ioUnit.readyStatus = 1;  
            if (ioUnit.shouldInterrupt) {
              ioUnit.interruptState = 1;
            }
          } else { // cycle stealing
            var freq = CPU._frequency;
            
            if (ioUnit.counter > 0) {
              ioUnit.transferData();
            }
            
            if (ioUnit.counter === 0) {
              ioUnit.readyStatus = 1;  
              if (ioUnit.shouldInterrupt) {
                ioUnit.interruptState = 1;
              }
            } else {              
              ioUnit.counterThread = setInterval(function() {
                if (ioUnit.counter > 0) {
                  ioUnit.transferData();
                } else {
                  ioUnit.readyStatus = 1;  
                  if (ioUnit.shouldInterrupt) {
                    ioUnit.interruptState = 1;
                  }
                  clearInterval(ioUnit.counterThread);
                  ioUnit.counterThread = null;
                }
                
                ioUnit.onStateChangeInternal();
              }, 1 / freq);
            }
          }          
        } else if (loc.location === 5) {
          ioUnit.readyStatus = 0;
          ioUnit.interruptState = 0;
        }

        ioUnit.onStateChangeInternal(addr, val);
      };
      
      ioUnit.transferData = function() {
        var val = MEM.read(ioUnit.srcAddr);
        MEM.write(ioUnit.destAddr, val);
        
        if (ioUnit.srcType === 0) {
          ioUnit.srcAddr += 4;
        }
        
        if (ioUnit.destType === 0) {
          ioUnit.destAddr += 4;
        }
        
        ioUnit.counter -= 1;
      };
      
      ioUnit.init = function() {
      };
      
      ioUnit.reset = function() {
        for (var i=0; i<ioUnit.memMapAddrCount*4; i+=1) {
          ioUnit._memory[i] = 0;
        }
  
        ioUnit.interruptState = 0;
        ioUnit.readyStatus = 0;
        ioUnit.counter = 0;
        ioUnit.cr = 0;
        ioUnit.shouldInterrupt = 0;
        ioUnit.transferMode = 0;
        ioUnit.srcType = 0;
        ioUnit.destType = 0;
        ioUnit.srcAddr = 0;
        ioUnit.destAddr = 0;
        
        if (ioUnit.counterThread !== null) {
          clearInterval(ioUnit.counterThread);
          ioUnit.counterThread = null;
        }

        ioUnit.onStateChangeInternal();
      };
      
      ioUnit.remove = function() {
      };

      ioUnit.reset();

      return ioUnit;
    },

    // create generic FRISC io unit through which the end-user can simulate data send and receive
    createGenericIoUnit: function(id, options) {
      var ioUnit = this.createIoUnit(id, options);
      
      ioUnit.onStateChangeInternal = function(addr, val) {
        if (typeof ioUnit.onStateChange !== 'undefined') {
          ioUnit.onStateChange();
        }
      };

      ioUnit.readb = function(addr) {
        return 0xFF & this._memory[addr-this.memMapAddrStart];
      };

      ioUnit.readw = function(addr) {
        var v1 = (0xFF & this._memory[addr+0-this.memMapAddrStart]) << 0;
        var v2 = (0xFF & this._memory[addr+1-this.memMapAddrStart]) << 8;

        return v1 + v2;
      };

      ioUnit.read = function(addr) {
        var v1 = (0xFF & this._memory[addr+0-this.memMapAddrStart]) << 0;
        var v2 = (0xFF & this._memory[addr+1-this.memMapAddrStart]) << 8;
        var v3 = (0xFF & this._memory[addr+2-this.memMapAddrStart]) << 16;
        var v4 = (0xFF & this._memory[addr+3-this.memMapAddrStart]) << 24;

        return v1 + v2 + v3 + v4;
      };

      ioUnit.writeb = function(addr, val) {
        this._memory[addr-this.memMapAddrStart] = 0xFF & val;

        ioUnit.onStateChangeInternal(addr, val);
      };

      ioUnit.writew = function(addr, val) {
        this._memory[addr+0-this.memMapAddrStart] = 0xFF & (val >> 0);
        this._memory[addr+1-this.memMapAddrStart] = 0xFF & (val >> 8);

        ioUnit.onStateChangeInternal(addr, val);
      };

      ioUnit.write = function(addr, val) {
        this._memory[addr+0-this.memMapAddrStart] = 0xFF & (val >> 0);
        this._memory[addr+1-this.memMapAddrStart] = 0xFF & (val >> 8);
        this._memory[addr+2-this.memMapAddrStart] = 0xFF & (val >> 16);
        this._memory[addr+3-this.memMapAddrStart] = 0xFF & (val >> 24);

        ioUnit.onStateChangeInternal(addr, val);
      };
      
      ioUnit.init = function() {
      };
      
      ioUnit.reset = function() {
        for (var i=0; i<ioUnit.memMapAddrCount*4; i+=1) {
          ioUnit._memory[i] = 0;
        }
  
        ioUnit.interruptState = 0;

        ioUnit.onStateChangeInternal();
      };
      
      ioUnit.remove = function() {
      };
      
      ioUnit.reset();

      return ioUnit;
    },
    
    // generic code for creating all io units
    createIoUnit: function(id, options) {
      if (typeof options.memMapAddrCount !== 'undefined' &&
          options.memMapAddrCount < 0) {
        throw new Error('Number of memory mapped locations must be non-negative.');
      } else if (typeof options.memMapAddrCount === 'undefined') {
        options.memMapAddrCount = 0;
      }
      
      if (typeof options.memMapAddrStart !== 'undefined' &&
          options.memMapAddrStart < 0) {
        throw new Error('Memory mapping for io unit is out of addressable memory range.');
      } else 
      if (typeof options.memMapAddrStart === 'undefined' &&
                 options.memMapAddrCount === 0) {
        throw new Error('Memory mapping for io unit must be defined.');
      } else if (typeof options.memMapAddrStart === 'undefined') {
        options.memMapAddrStart = parseInt("0FFFF0000", 16);
      }
           
      if (options.memMapAddrStart % 4 !== 0) {
        throw new Error('Memory mapping for io unit must start from an address that is divisible by 4.');
      }
      
      if (typeof options.intLevel !== 'undefined' &&
          (options.intLevel < 0 || options.intLevel > 3)) {
        throw new Error('IO unit must have interrupt level of 0, 1, 2 or 3.');
      } else if (typeof options.intLevel === 'undefined') {
        options.intLevel = null;
      }

      var ioUnit = {
        id : id,
        _memory : [],
        memMapAddrCount : options.memMapAddrCount,
        memMapAddrStart : options.memMapAddrStart,
        intLevel : options.intLevel,
        interruptState : 0
      };
      
      for (var i=0; i<options.memMapAddrCount*4; i+=1) {
        ioUnit._memory[i] = 0;
      }
      
      return ioUnit;
    },
      
    // add io unit to the system and initialize unit  
    addIoUnit: function(ioUnit) {
      // provjeriti da se memorijske lokacije ne preklapaju
      var mappedUnit = this.testMemoryOverlap(ioUnit.memMapAddrStart);
      
      if (mappedUnit !== null) {
        throw new Error('Memory mapping of IO unit overlaps with already connected IO unit:' + mappedUnit.id);
      }
      
      mappedUnit = this.testMemoryOverlap(ioUnit.memMapAddrStart + ioUnit.memMapAddrCount*4 - 1);
      
      if (mappedUnit !== null) {
        throw new Error('Memory mapping of IO unit overlaps with already connected IO unit:' + mappedUnit.id);
      }
      
      // provjeriti da nemaju isti id
      if (this.getIoUnit(ioUnit.id) !== null) {
        throw new Error('IO unit with same id already exists.');
      }
      
      if (ioUnit.intLevel !== null) {
        // zabraniti da ima vise od jedne jedinice spojene na INT3
        if (ioUnit.intLevel === 3 && this._units.interrupt[3].length > 0) {
          throw new Error('There can only be one io unit connected to INT3.');
        } else {
          this._units.interrupt[ioUnit.intLevel].push(ioUnit);
        }
      } else {
        this._units.noninterrupt.push(ioUnit);
      }
      
      ioUnit.init();
    },
    
    getIoUnit: function(id) {
      for (var i=0; i<this._units.interrupt.length; i++) {
        for (var j=0; j<this._units.interrupt[i].length; j++) {
          if (id === this._units.interrupt[i][j].id) {
            return this._units.interrupt[i][j];
          }
        }
      }
      
      for (var i=0; i<this._units.noninterrupt.length; i++) {
        if (id === this._units.noninterrupt[i].id) {
          return this._units.noninterrupt[i];
        }
      }
      
      return null;
    },

    getIoUnits: function() {
      var ioUnits = [];

      for (var i=0; i<this._units.interrupt.length; i++) {
        for (var j=0; j<this._units.interrupt[i].length; j++) {
          ioUnits.push(this._units.interrupt[i][j].id);
        }
      }
      
      for (var i=0; i<this._units.noninterrupt.length; i++) {
        if (id === this._units.noninterrupt[i].id) {
          ioUnits.push(this._units.noninterrupt[i].id);
        }
      }
      
      return ioUnits;
    },
    
    removeIoUnit: function(id) {
      var ioUnit = this.getIoUnit(id);
      
      ioUnit.remove();
      
      var unitArray = ioUnit.intLevel === null ? 
                      this._units.noninterrupt : 
                      this._units.interrupt[ioUnit.intLevel];

      for (var i=0; i<unitArray.length; i++) {
        if (unitArray[i].id === ioUnit.id) {
          unitArray.splice(i, 1);
          break;
        }
      }
    },
    
    generateInterrupt: function(id) {
      var ioUnit = this.getIoUnit(id);
      
      ioUnit.interruptState = 1;
    },
    
    setState: function(id, addr, data) {
      var ioUnit = this.getIoUnit(id);
      
      ioUnit._memory[addr + ioUnit.offset] = data;
    },
    
    // test if memory address memAddr overlaps with existing io units
    testMemoryOverlap: function(memAddr) {
      for (var i=0; i<this._units.interrupt.length; i++) {
        for (var j=0; j<this._units.interrupt[i].length; j++) {
          if (memAddr >= this._units.interrupt[i][j].memMapAddrStart && 
              (memAddr <= (this._units.interrupt[i][j].memMapAddrStart +
              this._units.interrupt[i][j].memMapAddrCount*4))) {
            return this._units.interrupt[i][j];
          }
        }
      }
      
      for (var i=0; i<this._units.noninterrupt.length; i++) {
        if (memAddr >= this._units.noninterrupt[i].memMapAddrStart && 
            (memAddr <= (this._units.noninterrupt[i].memMapAddrStart +
            this._units.noninterrupt[i].memMapAddrCount*4))) {
          return this._units.noninterrupt[i];
        }
      }
      
      return null;
    }
  };

  return {MEM : MEM, CPU : CPU, IO : IO};
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports.FRISC = FRISC;
  module.exports.util = {
    convertIntToBinary: convertIntToBinary, 
    convertBinaryToInt: convertBinaryToInt,
    getBitString: getBitString,
    extend: extend,
    twosComplement: twosComplement,
    generateStringOfCharacters: generateStringOfCharacters
  };
} else if (typeof document !== 'undefined' && typeof document.window !== 'undefined') {
  document.window.FRISC = FRISC;
}


//
//  FRISC Assembly
//

var frisc_asm = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */

  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }

  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "instructions_main": parse_instructions_main,
        "instructions": parse_instructions,
        "newline": parse_newline,
        "instruction_or_end": parse_instruction_or_end,
        "instruction_end": parse_instruction_end,
        "instruction": parse_instruction,
        "label": parse_label,
        "operationPart": parse_operationPart,
        "operation": parse_operation,
        "regaddr": parse_regaddr,
        "sraddr": parse_sraddr,
        "immaddr": parse_immaddr,
        "absaddr_mem": parse_absaddr_mem,
        "rinaddr": parse_rinaddr,
        "rinaddroff": parse_rinaddroff,
        "delimiter": parse_delimiter,
        "moveop_name": parse_moveop_name,
        "aluop_name": parse_aluop_name,
        "cmpop_name": parse_cmpop_name,
        "nonjmpop_name": parse_nonjmpop_name,
        "jmpop_name": parse_jmpop_name,
        "memop_name": parse_memop_name,
        "stackop_name": parse_stackop_name,
        "orgop_name": parse_orgop_name,
        "dwop_name": parse_dwop_name,
        "equop_name": parse_equop_name,
        "dsop_name": parse_dsop_name,
        "endop_name": parse_endop_name,
        "baseop_name": parse_baseop_name,
        "dwhbop_name": parse_dwhbop_name,
        "flag_name": parse_flag_name,
        "aluop": parse_aluop,
        "cmpop": parse_cmpop,
        "moveop": parse_moveop,
        "uprop": parse_uprop,
        "flag": parse_flag,
        "memop": parse_memop,
        "stackop": parse_stackop,
        "orgop": parse_orgop,
        "dwop": parse_dwop,
        "equop": parse_equop,
        "dsop": parse_dsop,
        "endop": parse_endop,
        "baseop": parse_baseop,
        "dwhbop": parse_dwhbop,
        "commentPart": parse_commentPart,
        "whitespace": parse_whitespace,
        "register": parse_register,
        "number": parse_number,
        "base": parse_base,
        "numberWithoutBase": parse_numberWithoutBase
      };

      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "instructions_main";
      }

      var pos = 0;
      var reportFailures = 0;
      var rightmostFailuresPos = 0;
      var rightmostFailuresExpected = [];

      function padLeft(input, padding, length) {
        var result = input;

        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }

        return result;
      }

      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;

        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }

        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }

      function matchFailed(failure) {
        if (pos < rightmostFailuresPos) {
          return;
        }

        if (pos > rightmostFailuresPos) {
          rightmostFailuresPos = pos;
          rightmostFailuresExpected = [];
        }

        rightmostFailuresExpected.push(failure);
      }

      function parse_instructions_main() {
        var result0;
        var pos0;

        pos0 = pos;
        result0 = parse_instructions();
        if (result0 !== null) {
          result0 = (function(offset, ins) {
            var instrs = [];
            var machinecode = [];
            var unknownlabels = [];

            for (var i=0; i<ins.length; i++) {
              if (typeof ins[i][0].op !== "undefined" && ins[i][0].op !== "") {
                instrs.push(ins[i][0]);
              }
            }

            function replaceLabel(element, baseValueForDiff) {
              if (element.type === "label") {
                var labelValue = labels[element.value];

                if (typeof labelValue !== "undefined") {
                  element.type = "num";
                  element.value = (typeof baseValueForDiff === 'undefined') ?
                                  labelValue : (labelValue - baseValueForDiff);
                } else {
                  unknownlabels.push(element.value);
                  element.value = null;
                }
              }
            }

            // replace labels
            for (var i=0; i<instrs.length; i++) {
              if (instrs[i].op in aluops || instrs[i].op in cmpops || instrs[i].op in moveops) {
                replaceLabel(instrs[i].alusrc2);
              } else if (instrs[i].op in jmpops) {
                if (instrs[i].op === "JR") {
                  replaceLabel(instrs[i].addr, instrs[i].curloc);
                } else {
                  replaceLabel(instrs[i].addr);
                }
              } else if (instrs[i].op in memops) {
                replaceLabel(instrs[i].mem);
              } else if (instrs[i].op in dwhbops) {
                var vals = [];

                for (var j=0; j<instrs[i].values.length; j++) {
                  replaceLabel(instrs[i].values[j]);
                  vals.push(instrs[i].values[j].value);
                }

                instrs[i].values = vals;
              }
            }

            // check if all labels are defined
            if (unknownlabels.length > 0) {
              throw new Error("Unknown labels: " + unknownlabels.toString());
            }

            // generate machine code
            for (var i=0; i<instrs.length; i++) {
              generateMachineCode(instrs[i]);
              machinecode.push(instrs[i]);
            }

            // generate memory model
            var mem = [];

            var writeToMemory = function(bitString, startPosition, memoryArray) {
              if (bitString.length % 8 !== 0) {
                throw new Error("Memory string has wrong length");
              }

              var elems = bitString.match(/.{8}/g);

              for (var i=0; i<elems.length; i++) {
                memoryArray[startPosition+i] = elems[elems.length - i - 1];
              }

              return startPosition + elems.length;
            };

            for (var opCount=0, memCount=0; opCount<machinecode.length; ) {
              if (typeof machinecode[opCount].curloc === "undefined") {
                opCount++;
              } else {
                if (machinecode[opCount].curloc > memCount) {
                  memCount = writeToMemory("00000000", memCount, mem);
                } else {
                  if (typeof machinecode[opCount].machineCode === "string") {
                    memCount = writeToMemory(machinecode[opCount].machineCode, memCount, mem);
                  } else {
                    for (var j=0; j<machinecode[opCount].machineCode.length; j++) {
                      memCount = writeToMemory(machinecode[opCount].machineCode[j], memCount, mem);
                    }
                  }
                  opCount += 1;
                }
              }
            }

            return { ast : machinecode, mem : mem};
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_instructions() {
        var result0, result1, result2;
        var pos0, pos1, pos2;

        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        result1 = parse_instruction_or_end();
        if (result1 !== null) {
          result2 = (function(offset) { linecounter++; return true;})(pos) ? "" : null;
          if (result2 !== null) {
            result1 = [result1, result2];
          } else {
            result1 = null;
            pos = pos2;
          }
        } else {
          result1 = null;
          pos = pos2;
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            pos2 = pos;
            result1 = parse_instruction_or_end();
            if (result1 !== null) {
              result2 = (function(offset) { linecounter++; return true;})(pos) ? "" : null;
              if (result2 !== null) {
                result1 = [result1, result2];
              } else {
                result1 = null;
                pos = pos2;
              }
            } else {
              result1 = null;
              pos = pos2;
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          pos2 = pos;
          reportFailures++;
          if (input.length > pos) {
            result2 = input.charAt(pos);
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("any character");
            }
          }
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              if (input.length > pos) {
                result2 = input.charAt(pos);
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("any character");
                }
              }
            }
          } else {
            result1 = null;
          }
          reportFailures--;
          if (result1 === null) {
            result1 = "";
          } else {
            result1 = null;
            pos = pos2;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, ins) {
              return ins;
            })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_newline() {
        var result0;

        if (input.charCodeAt(pos) === 10) {
          result0 = "\n";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\n\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 2) === "\r\n") {
            result0 = "\r\n";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\r\\n\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 13) {
              result0 = "\r";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\r\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 2) === "\n\r") {
                result0 = "\n\r";
                pos += 2;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"\\n\\r\"");
                }
              }
            }
          }
        }
        return result0;
      }

      function parse_instruction_or_end() {
        var result0, result1;
        var pos0, pos1;

        pos0 = pos;
        result0 = parse_instruction_end();
        if (result0 !== null) {
          result0 = (function(offset, i) { var ins = i; ins.line = linecounter-1; return {}})(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          result0 = parse_instruction();
          if (result0 !== null) {
            result1 = parse_newline();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, i) { var ins = i; ins.line = linecounter; return ins;})(pos0, result0[0]);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }

      function parse_instruction_end() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1, pos2;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_label();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_endop();
            if (result2 !== null) {
              result3 = parse_commentPart();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                pos2 = pos;
                result4 = parse_newline();
                if (result4 !== null) {
                  result5 = [];
                  if (input.length > pos) {
                    result6 = input.charAt(pos);
                    pos++;
                  } else {
                    result6 = null;
                    if (reportFailures === 0) {
                      matchFailed("any character");
                    }
                  }
                  while (result6 !== null) {
                    result5.push(result6);
                    if (input.length > pos) {
                      result6 = input.charAt(pos);
                      pos++;
                    } else {
                      result6 = null;
                      if (reportFailures === 0) {
                        matchFailed("any character");
                      }
                    }
                  }
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos2;
                  }
                } else {
                  result4 = null;
                  pos = pos2;
                }
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, l, o, c) {
              return o;
            })(pos0, result0[0], result0[2], result0[3]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_instruction() {
        var result0, result1, result2;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_label();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_operationPart();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_commentPart();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, l, o, c) {
            if (o === null || o === "") {
              if (l !== null && l !== "") {
                addLabel(l, curloc);
              }
              return {};
            }

            if (!(o.op in dwops || o.op in equops || o.op in endops)) {
              curloc = curloc % 4 === 0 ? curloc : curloc + (4-curloc%4);
            }

            if (l !== null && l !== "") {
              if (!(o.op in baseops || o.op in endops || o.op in orgops || o.op in equops)) {
                addLabel(l, curloc);
              } else if (o.op in equops) {
                addLabel(l, o.value);
              }
            }

            o.curloc = curloc;

            if (o.op in aluops || o.op in cmpops || o.op in moveops || o.op in jmpops || o.op in rethaltops || o.op in memops || o.op in stackops) {
              curloc += 4;
            } else if (o.op in orgops) {
              if (o.value < curloc) {
                var err = new Error("ORG op must not point to previous addresses.");
                err.line = linecounter;
                err.column = 1;
                throw err;
              }

              curloc = o.value;
            } else if (o.op in dwops) {
              curloc += o.values.length;
            } else if (o.op in equops) {
              curloc = curloc;
            } else if (o.op in endops) {
              curloc = curloc;
            } else if (o.op in dsops) {
              curloc += o.value;
            } else if (o.op in dwhbops) {
              curloc += o.size*o.values.length;
            }

            if (o.op in baseops) {
              defaultBase = o.value;
            }

            if (o.op in endops || o.op in equops || o.op in orgops || o.op in baseops) {
              return {};
            } else {
              return o;
            }
          })(pos0, result0[0], result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_label() {
        var result0, result1, result2;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        if (/^[a-zA-Z]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z]");
          }
        }
        if (result0 !== null) {
          result1 = [];
          if (/^[0-9a-zA-Z_]/.test(input.charAt(pos))) {
            result2 = input.charAt(pos);
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[0-9a-zA-Z_]");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (/^[0-9a-zA-Z_]/.test(input.charAt(pos))) {
              result2 = input.charAt(pos);
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[0-9a-zA-Z_]");
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, first, rest) {
            return first + rest.join("");
          })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_operationPart() {
        var result0, result1;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result1 = parse_whitespace();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_whitespace();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = parse_operation();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, o) {return o;})(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_operation() {
        var result0;

        result0 = parse_dwhbop();
        if (result0 === null) {
          result0 = parse_baseop();
          if (result0 === null) {
            result0 = parse_dsop();
            if (result0 === null) {
              result0 = parse_equop();
              if (result0 === null) {
                result0 = parse_dwop();
                if (result0 === null) {
                  result0 = parse_orgop();
                  if (result0 === null) {
                    result0 = parse_stackop();
                    if (result0 === null) {
                      result0 = parse_memop();
                      if (result0 === null) {
                        result0 = parse_uprop();
                        if (result0 === null) {
                          result0 = parse_moveop();
                          if (result0 === null) {
                            result0 = parse_cmpop();
                            if (result0 === null) {
                              result0 = parse_aluop();
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }

      function parse_regaddr() {
        var result0;
        var pos0;

        pos0 = pos;
        result0 = parse_register();
        if (result0 !== null) {
          result0 = (function(offset, value) { return {type : "reg", value : value}; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_sraddr() {
        var result0, result1;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        if (/^[sS]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[sS]");
          }
        }
        if (result0 !== null) {
          if (/^[rR]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[rR]");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, value) { return {type : "sr", value : "sr"}; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_immaddr() {
        var result0;
        var pos0;

        pos0 = pos;
        result0 = parse_label();
        if (result0 !== null) {
          result0 = (function(offset, value) { return {type : "label", value : value}; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          result0 = parse_number();
          if (result0 !== null) {
            result0 = (function(offset, value) { return {type : "num", value : value}; })(pos0, result0);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }

      function parse_absaddr_mem() {
        var result0, result1, result2;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 40) {
          result0 = "(";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"(\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_label();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 41) {
              result2 = ")";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\")\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, value) { return {type : "label", value : value}; })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.charCodeAt(pos) === 40) {
            result0 = "(";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"(\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_number();
            if (result1 !== null) {
              if (input.charCodeAt(pos) === 41) {
                result2 = ")";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\")\"");
                }
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, value) { return {type : "num", value : value}; })(pos0, result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }

      function parse_rinaddr() {
        var result0, result1, result2;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 40) {
          result0 = "(";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"(\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_regaddr();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 41) {
              result2 = ")";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\")\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, value) { return value; })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_rinaddroff() {
        var result0, result1, result2, result3;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 40) {
          result0 = "(";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"(\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_register();
          if (result1 !== null) {
            result2 = parse_numberWithoutBase();
            if (result2 === null) {
              result2 = "";
            }
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 41) {
                result3 = ")";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\")\"");
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, reg, val) {
              return {type : "regoff", value : reg, offset : val === "" ? 0 : val };
            })(pos0, result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_delimiter() {
        var result0, result1, result2, result3;
        var pos0;

        pos0 = pos;
        result0 = [];
        result1 = parse_whitespace();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_whitespace();
        }
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 44) {
            result1 = ",";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\",\"");
            }
          }
          if (result1 !== null) {
            result2 = [];
            result3 = parse_whitespace();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_whitespace();
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }

      function parse_moveop_name() {
        var result0;

        if (input.substr(pos, 4) === "MOVE") {
          result0 = "MOVE";
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"MOVE\"");
          }
        }
        return result0;
      }

      function parse_aluop_name() {
        var result0;

        if (input.substr(pos, 2) === "OR") {
          result0 = "OR";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"OR\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 3) === "AND") {
            result0 = "AND";
            pos += 3;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"AND\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 3) === "XOR") {
              result0 = "XOR";
              pos += 3;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"XOR\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 3) === "ADD") {
                result0 = "ADD";
                pos += 3;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"ADD\"");
                }
              }
              if (result0 === null) {
                if (input.substr(pos, 3) === "ADC") {
                  result0 = "ADC";
                  pos += 3;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"ADC\"");
                  }
                }
                if (result0 === null) {
                  if (input.substr(pos, 3) === "SUB") {
                    result0 = "SUB";
                    pos += 3;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"SUB\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.substr(pos, 3) === "SBC") {
                      result0 = "SBC";
                      pos += 3;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"SBC\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.substr(pos, 4) === "ROTL") {
                        result0 = "ROTL";
                        pos += 4;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"ROTL\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.substr(pos, 4) === "ROTR") {
                          result0 = "ROTR";
                          pos += 4;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"ROTR\"");
                          }
                        }
                        if (result0 === null) {
                          if (input.substr(pos, 3) === "SHL") {
                            result0 = "SHL";
                            pos += 3;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"SHL\"");
                            }
                          }
                          if (result0 === null) {
                            if (input.substr(pos, 3) === "SHR") {
                              result0 = "SHR";
                              pos += 3;
                            } else {
                              result0 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"SHR\"");
                              }
                            }
                            if (result0 === null) {
                              if (input.substr(pos, 4) === "ASHR") {
                                result0 = "ASHR";
                                pos += 4;
                              } else {
                                result0 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"ASHR\"");
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }

      function parse_cmpop_name() {
        var result0;

        if (input.substr(pos, 3) === "CMP") {
          result0 = "CMP";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"CMP\"");
          }
        }
        return result0;
      }

      function parse_nonjmpop_name() {
        var result0;

        if (input.substr(pos, 4) === "RETI") {
          result0 = "RETI";
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"RETI\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 4) === "RETN") {
            result0 = "RETN";
            pos += 4;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"RETN\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 3) === "RET") {
              result0 = "RET";
              pos += 3;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"RET\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 4) === "HALT") {
                result0 = "HALT";
                pos += 4;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"HALT\"");
                }
              }
            }
          }
        }
        return result0;
      }

      function parse_jmpop_name() {
        var result0;

        if (input.substr(pos, 2) === "JP") {
          result0 = "JP";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"JP\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 4) === "CALL") {
            result0 = "CALL";
            pos += 4;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"CALL\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 2) === "JR") {
              result0 = "JR";
              pos += 2;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"JR\"");
              }
            }
          }
        }
        return result0;
      }

      function parse_memop_name() {
        var result0;

        if (input.substr(pos, 5) === "LOADB") {
          result0 = "LOADB";
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"LOADB\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 6) === "STOREB") {
            result0 = "STOREB";
            pos += 6;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"STOREB\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 5) === "LOADH") {
              result0 = "LOADH";
              pos += 5;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"LOADH\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 6) === "STOREH") {
                result0 = "STOREH";
                pos += 6;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"STOREH\"");
                }
              }
              if (result0 === null) {
                if (input.substr(pos, 4) === "LOAD") {
                  result0 = "LOAD";
                  pos += 4;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"LOAD\"");
                  }
                }
                if (result0 === null) {
                  if (input.substr(pos, 5) === "STORE") {
                    result0 = "STORE";
                    pos += 5;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"STORE\"");
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }

      function parse_stackop_name() {
        var result0;

        if (input.substr(pos, 3) === "POP") {
          result0 = "POP";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"POP\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 4) === "PUSH") {
            result0 = "PUSH";
            pos += 4;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"PUSH\"");
            }
          }
        }
        return result0;
      }

      function parse_orgop_name() {
        var result0;

        if (input.substr(pos, 4) === "`ORG") {
          result0 = "`ORG";
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"`ORG\"");
          }
        }
        return result0;
      }

      function parse_dwop_name() {
        var result0;

        if (input.substr(pos, 3) === "`DW") {
          result0 = "`DW";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"`DW\"");
          }
        }
        return result0;
      }

      function parse_equop_name() {
        var result0;

        if (input.substr(pos, 4) === "`EQU") {
          result0 = "`EQU";
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"`EQU\"");
          }
        }
        return result0;
      }

      function parse_dsop_name() {
        var result0;

        if (input.substr(pos, 3) === "`DS") {
          result0 = "`DS";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"`DS\"");
          }
        }
        return result0;
      }

      function parse_endop_name() {
        var result0;

        if (input.substr(pos, 4) === "`END") {
          result0 = "`END";
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"`END\"");
          }
        }
        return result0;
      }

      function parse_baseop_name() {
        var result0;

        if (input.substr(pos, 5) === "`BASE") {
          result0 = "`BASE";
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"`BASE\"");
          }
        }
        return result0;
      }

      function parse_dwhbop_name() {
        var result0;

        if (input.substr(pos, 2) === "DW") {
          result0 = "DW";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"DW\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 2) === "DH") {
            result0 = "DH";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"DH\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 2) === "DB") {
              result0 = "DB";
              pos += 2;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"DB\"");
              }
            }
          }
        }
        return result0;
      }

      function parse_flag_name() {
        var result0;

        if (input.charCodeAt(pos) === 77) {
          result0 = "M";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"M\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 2) === "NN") {
            result0 = "NN";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"NN\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 2) === "NV") {
              result0 = "NV";
              pos += 2;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"NV\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 2) === "NZ") {
                result0 = "NZ";
                pos += 2;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"NZ\"");
                }
              }
              if (result0 === null) {
                if (input.substr(pos, 2) === "NE") {
                  result0 = "NE";
                  pos += 2;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"NE\"");
                  }
                }
                if (result0 === null) {
                  if (input.substr(pos, 2) === "NC") {
                    result0 = "NC";
                    pos += 2;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"NC\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 78) {
                      result0 = "N";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"N\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 80) {
                        result0 = "P";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"P\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 67) {
                          result0 = "C";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"C\"");
                          }
                        }
                        if (result0 === null) {
                          if (input.substr(pos, 3) === "ULT") {
                            result0 = "ULT";
                            pos += 3;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"ULT\"");
                            }
                          }
                          if (result0 === null) {
                            if (input.substr(pos, 3) === "UGE") {
                              result0 = "UGE";
                              pos += 3;
                            } else {
                              result0 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"UGE\"");
                              }
                            }
                            if (result0 === null) {
                              if (input.charCodeAt(pos) === 86) {
                                result0 = "V";
                                pos++;
                              } else {
                                result0 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"V\"");
                                }
                              }
                              if (result0 === null) {
                                if (input.charCodeAt(pos) === 90) {
                                  result0 = "Z";
                                  pos++;
                                } else {
                                  result0 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\"Z\"");
                                  }
                                }
                                if (result0 === null) {
                                  if (input.substr(pos, 2) === "EQ") {
                                    result0 = "EQ";
                                    pos += 2;
                                  } else {
                                    result0 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\"EQ\"");
                                    }
                                  }
                                  if (result0 === null) {
                                    if (input.substr(pos, 3) === "ULE") {
                                      result0 = "ULE";
                                      pos += 3;
                                    } else {
                                      result0 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\"ULE\"");
                                      }
                                    }
                                    if (result0 === null) {
                                      if (input.substr(pos, 3) === "UGT") {
                                        result0 = "UGT";
                                        pos += 3;
                                      } else {
                                        result0 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\"UGT\"");
                                        }
                                      }
                                      if (result0 === null) {
                                        if (input.substr(pos, 3) === "SLT") {
                                          result0 = "SLT";
                                          pos += 3;
                                        } else {
                                          result0 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\"SLT\"");
                                          }
                                        }
                                        if (result0 === null) {
                                          if (input.substr(pos, 3) === "SLE") {
                                            result0 = "SLE";
                                            pos += 3;
                                          } else {
                                            result0 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\"SLE\"");
                                            }
                                          }
                                          if (result0 === null) {
                                            if (input.substr(pos, 3) === "SGE") {
                                              result0 = "SGE";
                                              pos += 3;
                                            } else {
                                              result0 = null;
                                              if (reportFailures === 0) {
                                                matchFailed("\"SGE\"");
                                              }
                                            }
                                            if (result0 === null) {
                                              if (input.substr(pos, 3) === "SGT") {
                                                result0 = "SGT";
                                                pos += 3;
                                              } else {
                                                result0 = null;
                                                if (reportFailures === 0) {
                                                  matchFailed("\"SGT\"");
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }

      function parse_aluop() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_aluop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_regaddr();
            if (result2 !== null) {
              result3 = parse_delimiter();
              if (result3 !== null) {
                result4 = parse_regaddr();
                if (result4 === null) {
                  result4 = parse_immaddr();
                }
                if (result4 !== null) {
                  result5 = parse_delimiter();
                  if (result5 !== null) {
                    result6 = parse_regaddr();
                    if (result6 !== null) {
                      result0 = [result0, result1, result2, result3, result4, result5, result6];
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, alusrc1, alusrc2, aludest) {
              return { op : op, optype : 'aluop', alusrc1 : alusrc1, alusrc2 : alusrc2, aludest : aludest };
            })(pos0, result0[0], result0[2], result0[4], result0[6]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_cmpop() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_cmpop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_regaddr();
            if (result2 !== null) {
              result3 = parse_delimiter();
              if (result3 !== null) {
                result4 = parse_regaddr();
                if (result4 === null) {
                  result4 = parse_immaddr();
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, alusrc1, alusrc2) {
              return { op : op, optype : 'cmpop', alusrc1 : alusrc1, alusrc2 : alusrc2 };
            })(pos0, result0[0], result0[2], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_moveop() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_moveop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_regaddr();
            if (result2 === null) {
              result2 = parse_sraddr();
              if (result2 === null) {
                result2 = parse_immaddr();
              }
            }
            if (result2 !== null) {
              result3 = parse_delimiter();
              if (result3 !== null) {
                result4 = parse_regaddr();
                if (result4 === null) {
                  result4 = parse_sraddr();
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, alusrc2, aludest) {
              return { op : op, optype : 'moveop', alusrc2 : alusrc2, aludest : aludest };
            })(pos0, result0[0], result0[2], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_uprop() {
        var result0, result1, result2, result3;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_jmpop_name();
        if (result0 !== null) {
          result1 = parse_flag();
          if (result1 !== null) {
            result3 = parse_whitespace();
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                result3 = parse_whitespace();
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result3 = parse_immaddr();
              if (result3 === null) {
                result3 = parse_rinaddr();
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, fl, addr) {
              return { op : op, optype : 'jmpop', flag : fl, addr : addr};
            })(pos0, result0[0], result0[1], result0[3]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          result0 = parse_nonjmpop_name();
          if (result0 !== null) {
            result1 = parse_flag();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, op, fl) {
                return { op : op, optype : 'rethaltop', flag : fl};
              })(pos0, result0[0], result0[1]);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }

      function parse_flag() {
        var result0, result1;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 95) {
          result0 = "_";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"_\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_flag_name();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, fl) {return fl;})(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          result0 = "";
          if (result0 !== null) {
            result0 = (function(offset, fl) {return fl;})(pos0, result0);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }

      function parse_memop() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_memop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_regaddr();
            if (result2 !== null) {
              result3 = parse_delimiter();
              if (result3 !== null) {
                result4 = parse_rinaddroff();
                if (result4 === null) {
                  result4 = parse_absaddr_mem();
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, reg, mem) {
              return { op : op, optype : 'memop', reg : reg, mem : mem };
            })(pos0, result0[0], result0[2], result0[4]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_stackop() {
        var result0, result1, result2;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_stackop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_regaddr();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, reg) {
              return { op : op, optype : 'stackop', reg : reg };
            })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_orgop() {
        var result0, result1, result2;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_orgop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_number();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, value) {
              return { op : op, optype : 'orgop', value : value };
            })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_dwop() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1, pos2, pos3;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_dwop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            pos2 = pos;
            result3 = parse_number();
            if (result3 !== null) {
              pos3 = pos;
              if (input.charCodeAt(pos) === 44) {
                result4 = ",";
                pos++;
              } else {
                result4 = null;
                if (reportFailures === 0) {
                  matchFailed("\",\"");
                }
              }
              if (result4 !== null) {
                result5 = [];
                result6 = parse_whitespace();
                while (result6 !== null) {
                  result5.push(result6);
                  result6 = parse_whitespace();
                }
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos3;
                }
              } else {
                result4 = null;
                pos = pos3;
              }
              if (result4 === null) {
                result4 = "";
              }
              if (result4 !== null) {
                result3 = [result3, result4];
              } else {
                result3 = null;
                pos = pos2;
              }
            } else {
              result3 = null;
              pos = pos2;
            }
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                pos2 = pos;
                result3 = parse_number();
                if (result3 !== null) {
                  pos3 = pos;
                  if (input.charCodeAt(pos) === 44) {
                    result4 = ",";
                    pos++;
                  } else {
                    result4 = null;
                    if (reportFailures === 0) {
                      matchFailed("\",\"");
                    }
                  }
                  if (result4 !== null) {
                    result5 = [];
                    result6 = parse_whitespace();
                    while (result6 !== null) {
                      result5.push(result6);
                      result6 = parse_whitespace();
                    }
                    if (result5 !== null) {
                      result4 = [result4, result5];
                    } else {
                      result4 = null;
                      pos = pos3;
                    }
                  } else {
                    result4 = null;
                    pos = pos3;
                  }
                  if (result4 === null) {
                    result4 = "";
                  }
                  if (result4 !== null) {
                    result3 = [result3, result4];
                  } else {
                    result3 = null;
                    pos = pos2;
                  }
                } else {
                  result3 = null;
                  pos = pos2;
                }
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, values) {
              var vals = [];

              for (var i=0; i<values.length; i++) {
                vals.push(values[i][0]);
              }

              return { op : op, optype : 'dwop', values : vals };
            })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_equop() {
        var result0, result1, result2;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_equop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_number();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, value) {
              return { op : op, optype : 'equop', value : value };
            })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_dsop() {
        var result0, result1, result2;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_dsop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_number();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, value) {
              return { op : op, optype : 'dsop', value : value };
            })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_endop() {
        var result0;
        var pos0;

        pos0 = pos;
        result0 = parse_endop_name();
        if (result0 !== null) {
          result0 = (function(offset, op) { return { op : op, optype : 'endop'}; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_baseop() {
        var result0, result1, result2;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_baseop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_base();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, base) {
              return { op : op, optype : 'baseop', value : base};
            })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_dwhbop() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1, pos2, pos3;

        pos0 = pos;
        pos1 = pos;
        result0 = parse_dwhbop_name();
        if (result0 !== null) {
          result2 = parse_whitespace();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_whitespace();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            pos2 = pos;
            result3 = parse_immaddr();
            if (result3 !== null) {
              pos3 = pos;
              if (input.charCodeAt(pos) === 44) {
                result4 = ",";
                pos++;
              } else {
                result4 = null;
                if (reportFailures === 0) {
                  matchFailed("\",\"");
                }
              }
              if (result4 !== null) {
                result5 = [];
                result6 = parse_whitespace();
                while (result6 !== null) {
                  result5.push(result6);
                  result6 = parse_whitespace();
                }
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos3;
                }
              } else {
                result4 = null;
                pos = pos3;
              }
              if (result4 === null) {
                result4 = "";
              }
              if (result4 !== null) {
                result3 = [result3, result4];
              } else {
                result3 = null;
                pos = pos2;
              }
            } else {
              result3 = null;
              pos = pos2;
            }
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                pos2 = pos;
                result3 = parse_immaddr();
                if (result3 !== null) {
                  pos3 = pos;
                  if (input.charCodeAt(pos) === 44) {
                    result4 = ",";
                    pos++;
                  } else {
                    result4 = null;
                    if (reportFailures === 0) {
                      matchFailed("\",\"");
                    }
                  }
                  if (result4 !== null) {
                    result5 = [];
                    result6 = parse_whitespace();
                    while (result6 !== null) {
                      result5.push(result6);
                      result6 = parse_whitespace();
                    }
                    if (result5 !== null) {
                      result4 = [result4, result5];
                    } else {
                      result4 = null;
                      pos = pos3;
                    }
                  } else {
                    result4 = null;
                    pos = pos3;
                  }
                  if (result4 === null) {
                    result4 = "";
                  }
                  if (result4 !== null) {
                    result3 = [result3, result4];
                  } else {
                    result3 = null;
                    pos = pos2;
                  }
                } else {
                  result3 = null;
                  pos = pos2;
                }
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, values) {
              var vals = [];

              for (var i=0; i<values.length; i++) {
                vals.push(values[i][0]);
              }

              var size = op === "DW" ? 4 : (op === "DH" ? 2 : 1);

              return { op : op, optype : 'dwhbop', values : vals, size : size};
            })(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_commentPart() {
        var result0, result1, result2, result3;
        var pos0, pos1;

        pos0 = pos;
        result0 = [];
        result1 = parse_whitespace();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_whitespace();
        }
        if (result0 !== null) {
          pos1 = pos;
          if (input.charCodeAt(pos) === 59) {
            result1 = ";";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\";\"");
            }
          }
          if (result1 !== null) {
            result2 = [];
            if (/^[^\n]/.test(input.charAt(pos))) {
              result3 = input.charAt(pos);
              pos++;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("[^\\n]");
              }
            }
            while (result3 !== null) {
              result2.push(result3);
              if (/^[^\n]/.test(input.charAt(pos))) {
                result3 = input.charAt(pos);
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("[^\\n]");
                }
              }
            }
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos1;
            }
          } else {
            result1 = null;
            pos = pos1;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }

      function parse_whitespace() {
        var result0;

        if (input.charCodeAt(pos) === 32) {
          result0 = " ";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\" \"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 9) {
            result0 = "\t";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\t\"");
            }
          }
        }
        return result0;
      }

      function parse_register() {
        var result0, result1;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        if (/^[rR]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[rR]");
          }
        }
        if (result0 !== null) {
          if (/^[0-7]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[0-7]");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, regnum) {
            return parseInt(regnum, 10);
          })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (/^[sS]/.test(input.charAt(pos))) {
            result0 = input.charAt(pos);
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("[sS]");
            }
          }
          if (result0 !== null) {
            if (/^[pP]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[pP]");
              }
            }
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset) {
              return 7; // SP == R7
            })(pos0);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }

      function parse_number() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;

        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        if (input.charCodeAt(pos) === 37) {
          result0 = "%";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"%\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_base();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 32) {
              result3 = " ";
              pos++;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\" \"");
              }
            }
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                if (input.charCodeAt(pos) === 32) {
                  result3 = " ";
                  pos++;
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\" \"");
                  }
                }
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos2;
            }
          } else {
            result0 = null;
            pos = pos2;
          }
        } else {
          result0 = null;
          pos = pos2;
        }
        if (result0 === null) {
          result0 = "";
        }
        if (result0 !== null) {
          if (/^[+\-]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[+\\-]");
            }
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            if (/^[0-9]/.test(input.charAt(pos))) {
              result2 = input.charAt(pos);
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[0-9]");
              }
            }
            if (result2 !== null) {
              result3 = [];
              if (/^[0-9a-hA-H]/.test(input.charAt(pos))) {
                result4 = input.charAt(pos);
                pos++;
              } else {
                result4 = null;
                if (reportFailures === 0) {
                  matchFailed("[0-9a-hA-H]");
                }
              }
              while (result4 !== null) {
                result3.push(result4);
                if (/^[0-9a-hA-H]/.test(input.charAt(pos))) {
                  result4 = input.charAt(pos);
                  pos++;
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("[0-9a-hA-H]");
                  }
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, b, p, first, rest) {
            var d = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"];
            var base = (b === "") ? defaultBase : b[1];
            var digits = [first].concat(rest)
            for (var i=0; i<digits.length; i++) {
              var found = false;
              for (var j=0; j<base; j++) {
                if (digits[i].toLowerCase() === d[j]) {
                  found = true;
                  break;
                }
              }

              if (!found) {
                return null;
              }
            }

            var prefix = p === "-" ? -1 : 1;
            return prefix*parseInt(digits.join(""), base);
          })(pos0, result0[0], result0[1], result0[2], result0[3]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_base() {
        var result0;
        var pos0;

        pos0 = pos;
        if (/^[bBoOdDhH]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[bBoOdDhH]");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, b) {
            b = b.toLowerCase();

            if(b === "b") {
              return 2;
            } else if (b === "o") {
              return 8;
            } else if (b === "d") {
              return 10;
            } else if (b === "h") {
              return 16;
            }
          })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }

      function parse_numberWithoutBase() {
        var result0, result1, result2, result3;
        var pos0, pos1;

        pos0 = pos;
        pos1 = pos;
        if (/^[+\-]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[+\\-]");
          }
        }
        if (result0 !== null) {
          if (/^[0-9]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[0-9]");
            }
          }
          if (result1 !== null) {
            result2 = [];
            if (/^[0-9a-hA-H]/.test(input.charAt(pos))) {
              result3 = input.charAt(pos);
              pos++;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("[0-9a-hA-H]");
              }
            }
            while (result3 !== null) {
              result2.push(result3);
              if (/^[0-9a-hA-H]/.test(input.charAt(pos))) {
                result3 = input.charAt(pos);
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("[0-9a-hA-H]");
                }
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, p, first, rest) {
            return (p === "-" ? -1 : 1) * parseInt( first + rest.join(""), defaultBase);
          })(pos0, result0[0], result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }


      function cleanupExpected(expected) {
        expected.sort();

        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }

      function computeErrorPosition() {
        /*
         * The first idea was to use |String.split| to break the input up to the
         * error position along newlines and derive the line and column from
         * there. However IE's |split| implementation is so broken that it was
         * enough to prevent it.
         */

        var line = 1;
        var column = 1;
        var seenCR = false;

        for (var i = 0; i < Math.max(pos, rightmostFailuresPos); i++) {
          var ch = input.charAt(i);
          if (ch === "\n") {
            if (!seenCR) { line++; }
            column = 1;
            seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            line++;
            column = 1;
            seenCR = true;
          } else {
            column++;
            seenCR = false;
          }
        }

        return { line: line, column: column };
      }


        var defaultBase = 16;
        var curloc = 0;
        var labels = {};
        var instructions = [];
        var instruction = {};
        var linecounter = 1;

        var moveops = {
          "MOVE"   : "00000"
        };

        var aluops = {
          "OR"     : "00001",
          "AND"    : "00010",
          "XOR"    : "00011",
          "ADD"    : "00100",
          "ADC"    : "00101",
          "SUB"    : "00110",
          "SBC"    : "00111",
          "ROTL"   : "01000",
          "ROTR"   : "01001",
          "SHL"    : "01010",
          "SHR"    : "01011",
          "ASHR"   : "01100"
        };

        var cmpops = {
          "CMP"    : "01101"
        };
          // 01110 Not used
          // 01111 Not used

        var rethaltops = {
          "RET"    : "11011",
          "RETI"   : "11011",
          "RETN"   : "11011",
          "HALT"   : "11111"
        };

        var jmpops = {
          "JP"     : "11000",
          "CALL"   : "11001",
          "JR"     : "11010"
        };

        var memops = {
          "LOAD"   : "10110",
          "STORE"  : "10111",
          "LOADB"  : "10010",
          "STOREB" : "10011",
          "LOADH"  : "10100",
          "STOREH" : "10101"
        };

        var stackops = {
          "POP"    : "10000",
          "PUSH"   : "10001"
        };

        var orgops = {
          "`ORG" : ""
        };

        var dwops = {
          "`DW" : ""
        };

        var equops = {
          "`EQU" : ""
        };

        var dsops = {
          "`DS" : ""
        };

        var endops = {
          "`END" : ""
        };

        var baseops = {
          "`BASE" : ""
        };

        var dwhbops = {
          "DW" : "",
          "DH" : "",
          "DB" : ""
        };

        var flags = {
          ""   : "0000",
          "N"  : "0001",   "M"   : "0001",
          "NN" : "0010",   "P"   : "0010",
          "C"  : "0011",   "ULT" : "0011",
          "NC" : "0100",   "UGE" : "0100",
          "V"  : "0101",
          "NV" : "0110",
          "Z"  : "0111",   "EQ"  : "0111",
          "NZ" : "1000",   "NE"  : "1000",

          "ULE"  : "1001",
          "UGT"  : "1010",
          "SLT"  : "1011",
          "SLE"  : "1100",
          "SGE"  : "1101",
          "SGT"  : "1110"
        };

        var allops = {
          aluop : aluops, moveop : moveops, cmpop : cmpops, memop : memops, stackop : stackops,
          jmpop : jmpops, rethaltop : rethaltops, equop : equops, dwop : dwops, orgop : orgops, dsop : dsops,
          endop : endops, dwhbop : dwhbops, baseop : baseops
        };

        var addLabel = function(label, value) {
          label = label.trim();

          if (typeof labels[label] === 'undefined') {
            labels[label] = value;
          } else {
            var err = new Error("Existing label: " + label);
            err.line = linecounter;
            err.column = 1;
            throw err;
          }
        };

        var generateMachineCode = function(node) {
          if (typeof node === 'undefined' || typeof node.op === 'undefined' || typeof node.optype === 'undefined' ||
              typeof allops[node.optype] === 'undefined' || typeof allops[node.optype][node.op] === 'undefined') {
            throw new Error("Undefined instruction, operation or operation type." + JSON.stringify(node));
          }

          var machineCode = null;

          if (node.optype in {cmpop : null, aluop : null, moveop : null, memop : null, stackop : null, jmpop : null, rethaltop: null}) {
            // set opcode
            machineCode = "00000000000000000000000000000000".split("");
            setBits(machineCode, 27, 31, allops[node.optype][node.op]);
          } else {
            machineCode = [];
          }

          switch(node.optype) {
            case 'cmpop':
            case 'aluop':
              if (node.optype === 'aluop') {
                setBits(machineCode, 23, 25, convertIntToBinary(node.aludest.value, 3));
              }
              setBits(machineCode, 20, 22, convertIntToBinary(node.alusrc1.value, 3));

              if (node.alusrc2.type === "reg") {
                setBits(machineCode, 26, 26, "0");
                setBits(machineCode, 17, 19, convertIntToBinary(node.alusrc2.value, 3));
                setBits(machineCode, 0, 16, "00000000000000000");
              } else {
                setBits(machineCode, 26, 26, "1");
                setBits(machineCode, 0, 19, convertIntToBinary(node.alusrc2.value, 20));
              }

              break;
            case 'moveop':
              if (node.aludest.type === "reg" && (node.alusrc2.type === "reg" || node.alusrc2.type === "num")) {
                // Kada je odredi?te op?i registar, a izvor op?i registar ili podatak:
                setBits(machineCode, 23, 25, convertIntToBinary(node.aludest.value, 3));
                setBits(machineCode, 20, 22, "000");
                if (node.alusrc2.type === "reg") {
                  setBits(machineCode, 26, 26, "0");
                  setBits(machineCode, 17, 19, convertIntToBinary(node.alusrc2.value, 3));
                } else {
                  setBits(machineCode, 26, 26, "1");
                  setBits(machineCode, 0, 19, convertIntToBinary(node.alusrc2.value, 20));
                }
              } else if (node.aludest.type === "sr") {
                // Kada je odredi?te registar SR:
                setBits(machineCode, 20, 22, "001");
                if (node.alusrc2.type === "reg") {
                  setBits(machineCode, 26, 26, "0");
                  setBits(machineCode, 17, 19, convertIntToBinary(node.alusrc2.value, 3));
                } else {
                  setBits(machineCode, 26, 26, "1");
                  setBits(machineCode, 0, 19, convertIntToBinary(node.alusrc2.value, 20));
                }
              } else if (node.alusrc2.type === "sr") {
                // Kada je izvor registar SR:
                setBits(machineCode, 20, 22, "010");
                setBits(machineCode, 23, 25, convertIntToBinary(node.aludest.value, 3));
                setBits(machineCode, 0, 19, "00000000000000000000");
              }

              break;
            case 'jmpop':
              setBits(machineCode, 20, 21, "00");
              setBits(machineCode, 22, 25, flags[node.flag]);
              if (node.addr.type === "num") {
                setBits(machineCode, 26, 26, "1");
                setBits(machineCode, 0, 19, convertIntToBinary(node.addr.value, 20));
              } else {
                setBits(machineCode, 26, 26, "0");
                setBits(machineCode, 17, 19, convertIntToBinary(node.addr.value, 3));
              }
              break;
            case 'rethaltop':
              setBits(machineCode, 22, 25, flags[node.flag]);
              if (node.op === 'RET') {
                setBits(machineCode, 0, 0, "0");
                setBits(machineCode, 1, 1, "0");
              } else if (node.op === 'RETI') {
                setBits(machineCode, 0, 0, "1");
                setBits(machineCode, 1, 1, "0");
              } else if (node.op === 'RETN') {
                setBits(machineCode, 0, 0, "1");
                setBits(machineCode, 1, 1, "1");
              }

              break;
            case 'memop':
              setBits(machineCode, 23, 25, convertIntToBinary(node.reg.value, 3));
              if (node.mem.type === "regoff") {
                setBits(machineCode, 26, 26, "1");
                setBits(machineCode, 20, 22, convertIntToBinary(node.mem.value, 3));
                setBits(machineCode, 0, 19, convertIntToBinary(node.mem.offset, 20));
              } else {
                setBits(machineCode, 26, 26, "0");
                setBits(machineCode, 0, 19, convertIntToBinary(node.mem.value, 20));
              }
              break;
            case 'stackop':
              setBits(machineCode, 23, 25, convertIntToBinary(node.reg.value, 3));
              break;
            case 'dwop':
              for (var i=0; i<node.values.length; i++) {
                machineCode.push(convertIntToBinary(node.values[i], 8));
              }
              break;
            case 'dsop':
              for (var i=0; i<node.value; i++) {
                machineCode.push(convertIntToBinary(0, 8));
              }
              break;
            case 'dwhbop':
              for (var i=0; i<node.values.length; i++) {
                machineCode.push(convertIntToBinary(node.values[i], node.size*8));
              }
              break;
          }
          if (node.optype in {cmpop : null, aluop : null, moveop : null, memop : null, stackop : null, jmpop : null, rethaltop : null}) {
            node.machineCode = machineCode.join("");
          } else {
            node.machineCode = machineCode;
          }
        };

        var setBits = function(oldBits, from, to, newBits) {
          var len = oldBits.length;

          for (var i=0; i<from-to+1 || i<newBits.length; i++) {
            oldBits[len-to-1+i] = newBits[i];
          }

          return oldBits;
        };

        /* Converts integer value to binary, specifying the length in bits of output */
        function convertIntToBinary(value, numberOfBits) {
          var retVal = new Array(numberOfBits);

          for (var i=0; i<numberOfBits; i++) {
            retVal[numberOfBits-i-1] = (Math.pow(2, i) & value) ? 1 : 0;
          }

          return retVal.join("");
        }


      var result = parseFunctions[startRule]();

      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos !== input.length) {
        var offset = Math.max(pos, rightmostFailuresPos);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = computeErrorPosition();

        throw new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
      }

      return result;
    },

    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };

  /* Thrown when a parser encounters a syntax error. */

  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;

      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }

      foundHumanized = found ? quote(found) : "end of input";

      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }

    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };

  result.SyntaxError.prototype = Error.prototype;

  return result;
})();

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = frisc_asm;
}
