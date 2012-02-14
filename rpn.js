"use strict";

function jsFromRPN(string) {
    try {
        return jsFromRPNSource(string);
    } catch (err) {
        return jsFromURI(string);
    }
}

function jsFromRPNSource(string) {
    return translate(string.match(/\S+/g));

    function translate(tokens) {
        var stack = makeCyclicStack();
        for (var i = 0; i < tokens.length; ++i)
            simulate(tokens[i], opTable, stack);
        return stack.compile();
    }
}

function jsFromURI(string) {
    var stack = makeCyclicStack();
    var chars = string.substr(string.search(/!/) + 1).split('');
    for (var i = 0; i < chars.length; ) {
        var literal = '';
        while (i < chars.length && chars[i].match(/[0123456789ABCDEF]/))
            literal += chars[i++];
        if (literal !== '')
            stack.push(parseInt(literal, 16));
        else if (chars[i] === '.' || chars[i] === '!')
            ++i;
        else
            simulate(chars[i++], shortOpTable, stack);
    }
    return stack.compile();
}

function makeCyclicStack() {
    var stmts = [];
    var mask = 0xFF;
    var sp = -1;

    function S() { 
        return 'this.S[' + (sp & mask) + ']';
    }
    function pop() {
        var result = S();
        --sp;
        return result;
    }
    function push(expr) {
        ++sp;
        stmts.push(S() + ' = ' + expr + ',');
    }
    return {
        compile: function() {
            if (sp < 0)
                return '0';
            return ('((this.S ? 0 : this.S = new Array(256)), '
                    + stmts.concat(pop() + ')').join(' '));
        },
        pick: function() {
            push('this.S[(' + (sp-1) + '-' + pop() + ')&' + mask + ']');
        },
        push: push,
        pop: pop,
    };
}

function simulate(op, table, stack) {
    if (table[op])
        table[op](stack);
    else if (!isNaN(op))
        stack.push(0xFFFFFFFF & op);  // It's a number
    else
        throw "Unknown op: " + op;
}

function literalOp(op) {
    return function(stack) {
        stack.push(op);
    };
}

// XXX use e|0 or e>>>0, depending on if we want signed or unsigned

function masked(e) {
    return '(' + e + ')>>>0';
}
function unmasked(e) {
    return '(' + e + ')';
}

function prefixOp(op, masker) {
    return function(stack) {
        var z = stack.pop();
        stack.push(masker(op + z));
    };
}

function infixOp(op, masker) {
    return function(stack) {
        var z = stack.pop();
        var y = stack.pop();
        stack.push(masker(y + op + z));
    };
}

function infixRel(op) {
    return function(stack) {
        var z = stack.pop();
        var y = stack.pop();
        stack.push('(' + y + op + z + ' ? 0xFFFFFFFF : 0)');
    };
}

// Based on http://paste.ubuntu.com/733764/
// and http://paste.ubuntu.com/733829/
var opTable = {
    't': literalOp('t'),
    'drop': function(stack) {
        stack.pop();
    },

    '*': infixOp('*', masked),
    '/': function(stack) {
        var z = stack.pop();
        var y = stack.pop();
        stack.push('(' + z + '?(' + y+'/'+z + ')>>>0:0)');
    },
    '+': infixOp('+', masked),
    '-': infixOp('-', masked),
    '%': function(stack) {
        var z = stack.pop();
        var y = stack.pop();
        stack.push('(' + z + '?(' + y+'%'+z + ')>>>0:0)');
    },

    '<<': infixOp('<<', unmasked),  // XXX JS only looks at low 5 bits of count
    '>>': infixOp('>>>', unmasked), // XXX JS only looks at low 5 bits of count
    '&': infixOp('&', unmasked),
    '|': infixOp('|', unmasked),
    '^': infixOp('^', unmasked),
    '~': prefixOp('~', unmasked),

    'dup': function(stack) {
        var z = stack.pop();
        stack.push(z);
        stack.push(z);
    },
    'pick': function(stack) {
        stack.pick();
    },
    'swap': function(stack) {
        var z = stack.pop();
        var y = stack.pop();
        stack.push(z);
        stack.push(y);
    },

    '>': infixRel('>'),
    '<': infixRel('<'),
    '=': infixRel('==='),
};

https://github.com/erlehmann/libglitch/blob/master/FORMAT-draft-erlehmann
var shortOpTable = {
    'a': opTable['t'],
    'c': opTable['drop'],

    'd': opTable['*'],
    'e': opTable['/'],
    'f': opTable['+'],
    'g': opTable['-'],
    'h': opTable['%'],

    'j': opTable['<<'],
    'k': opTable['>>'],
    'l': opTable['&'],
    'm': opTable['|'],
    'n': opTable['^'],
    'o': opTable['~'],

    'p': opTable['dup'],
    'q': opTable['pick'],
    'r': opTable['swap'],

    's': opTable['<'],
    't': opTable['>'],
    'u': opTable['='],
};
