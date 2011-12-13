text = open('music_formula_collection.txt').read()

def main():
    print """This is an automated markup of the <a
href="http://pelulamu.net/countercomplex/music_formula_collection.txt">
collection of oneliner music formulas</a> version 2011-10-18,
apparently by viznut, Converted by <code>convert_collection.py</code>
at <a href="https://github.com/darius/bytebeat">https://github.com/darius/bytebeat</a>.
The conversion is bound to have got some things wrong: e.g. the one
stereo entry is certainly broken because I haven't coded a converter
for that case.  '"""
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
                rate = rest[:-3].split()[-1]
                rate = {'44': 44.1, '11': 11.025}.get(rate, rate)
                rate = int(float(rate) * 1000)
                rest = ' '.join(rest[:-3].split()[:-1])
            print '<li>'
            if url:
                print '<a href="%s">(source)</a> | ' % url
            print format_row(formula, author, date, url, rate, rest)
        print '</ul>'

import cgi, urllib

def format_row(formula, author, date, url, rate, rest):
    title = ' '.join(filter(None, [author, date, rest]))
    title = title or formula
    params = dict(code0=formula, title=title)
    if rate is not None:
        params['samplerate'] = str(rate)
    return ('<a href="http://wry.me/toys/bytebeat/?%s">%s</a>'
            % (urllib.urlencode(params),
               cgi.escape(title)))


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
