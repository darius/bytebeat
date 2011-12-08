function jsFromRPN(string) {
    return translate(string.split(' '));
}

function translate(tokens) {
    var stack = [];
    for (var i = 0; i < tokens.length; ++i)
        simulate(tokens[i], stack);
    return stack[stack.length - 1];
}

function simulate(op, stack) {
    if (opTable[op])
        opTable[op](stack);
    else if (!isNaN(op))
        stack.push(op);  // It's a number
    else
        throw "Unknown op: " + op;
}

function literalOp(op) {
    return function(stack) {
        stack.push(op);
    };
}

function prefixOp(op) {
    return function(stack) {
        var z = stack.pop();
        stack.push('(' + op + z + ')');
    };
}

function infixOp(op) {
    return function(stack) {
        var z = stack.pop();
        var y = stack.pop();
        stack.push('(' + y + op + z + ')');
    };
}

function sub(stack) {
    var z = stack.pop();
    var y = stack.pop();
    stack.push(y + '[' + z + ']');
}

var opTable = {
    'sub': sub,
    't': literalOp('t'),
    '_': prefixOp('-'),
    '~': prefixOp('~'),
    '!': prefixOp('!'),
    '+': infixOp('+'),
    '-': infixOp('-'),
    '*': infixOp('*'),
    '/': infixOp('/'),
    '%': infixOp('%'),
    '&': infixOp('&'),
    '|': infixOp('|'),
    '^': infixOp('^'),
    '<<': infixOp('<<'),
    '>>': infixOp('>>'),
    '==': infixOp('==='),
    '!=': infixOp('!=='),
    '<':  infixOp('<'),
    '<=': infixOp('<='),
    '>=': infixOp('>='),
    '>':  infixOp('>'),
};
