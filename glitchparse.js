glitchparse = {}
if (typeof exports !== 'undefined') glitchparse = exports

glitchparse.infix_of = function(glitch_url) {
  var stack = []
    , contents = /^glitch:\/\/[^!]*!(.*)/.exec(glitch_url)
    , push = function(x) { stack.push(x) }
    , pop = function() { return stack.pop() }
    , binop = function(op) {
        return function() { var b = pop(); push([pop(), op, b]) }
      }
    , ops = { a: function() { push('t') }
            , d: binop('*')
            , e: binop('/')     // XXX division by zero should give 0
            , f: binop('+')
            , g: binop('-')
            , h: binop('%')
            , k: binop('>>>')
            , n: binop('^')
            , m: binop('|')
            }

  // Iterate over the tokens using the string replace method.
  // XXX would be nice to notice unhandled data!
  contents[1].replace(/[0-9A-F]+|[a-u]|!/g, function(op) {
    if (/[a-u]/.test(op)) return ops[op]()
    if (op === '!') return
    return push(parseInt(op, 16))
  })

  return glitchparse.ast_to_js(pop())
}

glitchparse.ast_to_js = function(ast) {
  var reallyBigNumber = 100
  return glitchparse.ast_to_js_(ast, reallyBigNumber, undefined)
}

glitchparse.ast_to_js_ = function(ast, parentPrecedence, leftOrRight) {
  if (typeof ast === 'string' || typeof ast === 'number') return ast

  // binop case
  var op = ast[1]
    , precedence = glitchparse.binaryPrecedence(ast[1])
    , body = [ glitchparse.ast_to_js_(ast[0], precedence, 'left')
             , op
             , glitchparse.ast_to_js_(ast[2], precedence, 'right')
             ]
             .join(' ')

  if (precedence < parentPrecedence) return body

  // All operators we currently handle associate left-to-right.
  if (precedence === parentPrecedence && leftOrRight === 'left') return body

  // Parenthesize because parent operator has tighter precedence.
  return '(' + body + ')'
}

glitchparse.binaryPrecedence = function(op) {
  // <https://developer.mozilla.org/en/JavaScript/Reference/Operators/Operator_Precedence>
  var precedence = [ [ '.', '[]', 'new' ]
                   , [ '()' ]
                   , [ '++', '--' ]
                   , [ ]        // unary operators omitted because of conflict
                   , [ '*', '/', '%' ]
                   , [ '+', '-' ]
                   , [ '<<', '>>', '>>>' ]
                   , [ '<', '<=', '>', '>=', 'in', 'instanceof' ]
                   , [ '==', '!=', '===', '!==' ]
                   , [ '&' ]
                   , [ '^' ]
                   , [ '|' ]
                   , [ '&&' ]
                   , [ '||' ]
                   , [ ]     // '?:'
                   , [
                     // Assignment operators omitted because:
                     // 1. They don’t exist in glitch:// URLs
                     // 2. They associate right-to-left, unlike all
                     //    the operators we actually handle.
                     ]
                   , [ ',' ]
                   ]

  for (var ii = 0; ii < precedence.length; ii++) {
    if (precedence[ii].indexOf(op) !== -1) return ii
  }
}


glitchparse.test = function() {
  var starlost = 'glitch://starlost!aFFha1FFhn3d'
    , starlost_infix = '(t % 255 ^ t % 511) * 3'
    , assert = require('assert')
    , ast_to_js = glitchparse.ast_to_js
    , infix_of = glitchparse.infix_of

  assert.equal(ast_to_js('t'), 't')
  assert.equal(ast_to_js(['t', '^', 34]), 't ^ 34')
  assert.equal(ast_to_js([['t', '*', 4], '%', 128]), 't * 4 % 128')
  assert.equal(ast_to_js(['t', '*', [4, '%', 128]]), 't * (4 % 128)')
  assert.equal(infix_of(starlost), starlost_infix)
}

glitchparse.test()
