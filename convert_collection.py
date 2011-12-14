import re

## mu = 'L: ((t&4096)?((t*(t^t%255)|(t>>4))>>1):(t>>3)|((t&8192)?t<<2:t)) R: t*(((t>>9)^((t>>9)-1)^1)%13)'
## m = re.match(r'L: (.*) R: (.*)',  mu)
## m.groups()[1]
#. 't*(((t>>9)^((t>>9)-1)^1)%13)'

text = open('music_formula_collection.txt').read()

def main():
    print """This is an automated mark-up of the <a
href="http://pelulamu.net/countercomplex/music_formula_collection.txt">
collection of oneliner music formulas</a> (version 2011-10-18)
by viznut, Converted by <code>convert_collection.py</code> at
<a href="https://github.com/darius/bytebeat">https://github.com/darius/bytebeat</a>.
(The conversion is bound to have gotten at least a few things wrong.)'"""
    for head, body in chunk_input(): 
        print '<h2>%s</h2>' % head.replace('=', '').strip()
        print '<ul>'
        for metadata, formula in body:
            author = date = url = rate = None
            rest = metadata[3:]
            if not rest.startswith('"'):
                author, rest = rest.split(None, 1)
            if rest.startswith('201'):
                date, rest = rest.split(None, 1)
            if rest.startswith('http'):
                wtf = rest.split(None, 1)
                if len(wtf) == 1:
                    url, rest = rest, ''
                elif len(wtf) == 2:
                    url, rest = wtf
                else:
                    assert False
            if rest.endswith('kHz'):
                parts = rest[:-3].split()
                rate, rest = parts[-1], ' '.join(parts[:-1])
                rate = {'44': 44.1, '11': 11.025}.get(rate, rate)
                rate = int(float(rate) * 1000)
            if rest.endswith('stereo'):
                 rest = rest[:-len('stereo')].strip()
                 code0, code1 = re.match(r'L: (.*) R: (.*)', formula).groups()
            else:
                code0, code1 = formula, None
            print '<li>'
            if url:
                print '<a href="%s">(source)</a> | ' % url
            print format_row(code0, code1, author, date, url, rate, rest)
        print '</ul>'

import cgi, urllib

def format_row(code0, code1, author, date, url, rate, rest):
    title = ' '.join(filter(None, [author, date, rest]))
    title = title or formula
    params = dict(code0=code0, title=title)
    if code1 is not None: params['code1'] = code1
    if rate is not None:  params['samplerate'] = str(rate)
    if url is not None:   params['source'] = url
    return ('<a href="http://wry.me/toys/bytebeat/?%s">%s</a>'
            % (my_urlencode(params), cgi.escape(title)))

def my_urlencode(params):
    def quote(x):
        return urllib.quote(x, safe='')
    return '&'.join('%s=%s' % (quote(k), quote(v))
                    for k, v in params.items())

def chunk_input():
    return chunkify(skip_head(text.splitlines()))

def skip_head(lines):
    lines = iter(lines)
    for line in lines:
        if line.startswith('==='):
            break
    yield line
    for line in lines:
        yield line

def chunkify(lines):
    head = next(lines)
    while True:
        body = []
        next_head = None

        while next_head is None:
            blank = next(lines, None)
            if blank is None:
                break
            assert blank == ''
            comment = next(lines)
            if comment.startswith('==='):
                next_head = comment
                break
            assert comment.startswith('//')
            formula = next(lines)
            body.append((comment, formula))

        yield head, body
        if next_head is None:
            break
        head = next_head

if __name__ == '__main__':
    main()

### main()
