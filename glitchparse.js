/*
 * Convert glitch:// URLs from glitched and GlitchMachine into infix JS.
 *
 * Remaining problems:
 * I haven’t yet implemented PUT DROP LSHIFT NOT PICK < > == (bcjoqstu).
 *
 * Of those, PUT and PICK are very tricky. < > == are moderately
 * tricky.
 *
 * Division isn’t quite right.  glitch:// division by zero generates
 * 0, either via / or %.  JS generates NaN.  The difference is only
 * relevant if the value is then transformed in a way that would cause
 * a 0 division result to generate a non-zero sample, and not always
 * even then.
 *
 * Worse, division generates fractions in JS, while glitch:// is
 * all-unsigned-32-bit-values.  The difference in this case is only
 * relevant if there’s a path for those fractional bits to make their
 * way into the output.  Any bitwise operation will discard them, and
 * most arithmetic operations merely preserve them: addition and
 * subtraction of integers, division by numbers greater than 1, and
 * multiplication by numbers between -1 and 1.  The only way for those
 * fractional bits to escape and cause havoc is addition or subtraction
 * of another number with fractional bits, division by a number less than
 * 1, or multiplication by a number greater than 1.  In those cases, the
 * division result can be explicitly truncated using ~~, if it matters.
 * Annotating parse tree nodes to keep track of which ones have possible
 * fractional parts would be sufficient to avoid the majority of these
 * cases, since division results are most commonly fed immediately to
 * a bitwise operator.
 *
 * Glitchparse doesn’t always take advantage of associativity of
 * associative operators to avoid unnecessary parens.  For example,
 * glitch://cube!aadad is correctly translated to t * t * t, but the
 * exactly equivalent glitch://cube!aaadd is translated to t * (t * t),
 * with superfluous parentheses.
 */

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
    , nextVar = 'a'
    , seqExpressions = []
    , defineVar = function(expr) {
        var varName = nextVar
        nextVar = String.fromCharCode(nextVar.charCodeAt(0) + 1)
        // XXX handle more than a few vars by changing name!
        seqExpressions.push(varName + ' = ' + glitchparse.ast_to_js(expr))
        return varName
      }
    , ops = { a: function() { push('t') }
            , d: binop('*')
              // XXX There are two big problems with division.  First,
              // glitch:// division and modulo yield 0 on division by
              // zero, not NaN.  Second, JS division doesn’t truncate;
              // it yields fractions.
            , e: binop('/')
            , f: binop('+')
            , g: binop('-')
            , h: binop('%')
            , k: binop('>>>')
            , l: binop('&')
            , m: binop('|')
            , n: binop('^')
            , p: function() { var v = defineVar(pop()); push(v); push(v) }
            , r: function() { var a = pop(); var b = pop(); push(a); push(b) }
            }

  if (!contents) throw Error("Can't parse " + glitch_url)

  // Iterate over the tokens using the string replace method.
  // XXX would be nice to notice unhandled data!
  contents[1].replace(/[0-9A-F]+|[a-u!.]/g, function(op) {
    if (/[a-u]/.test(op)) return ops[op]()
    if (op === '!' || op === '.' ) return
    return push(parseInt(op, 16))
  })

  if (stack.length !== 1) throw Error("Multiple things left on stack")
  seqExpressions.push(glitchparse.ast_to_js(pop()))
  return seqExpressions.join(', ')
}

glitchparse.ast_to_js = function(ast) {
  //console.log(require('sys').inspect(ast, 0, 20))
  var reallyBigNumber = 100
  return glitchparse.ast_to_js_(ast, reallyBigNumber, undefined)
}

glitchparse.ast_to_js_ = function(ast, parentPrecedence, leftOrRight) {
  if (typeof ast === 'string' || typeof ast === 'number') return ast

  if (typeof ast === 'undefined') throw Error("Stack underflow!")

  // Binop case.  So far we don’t have unary operators.
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
