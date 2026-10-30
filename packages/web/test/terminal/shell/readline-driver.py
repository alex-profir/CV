# Drives real bash's readline (006 research R45): readline completes only in
# an interactive bash on a terminal, and Node can't open one without a native
# package. Reads a JSON job on stdin, { "cwd", "path", "disable", "setup",
# "lines": [...] }, and prints, for each line, the line and cursor after one
# Tab and the list two Tabs show, as JSON.
import json
import os
import pty
import re
import select
import struct
import sys
import fcntl
import termios

PROMPT = '<<PROMPT>>'
MARK = '\x18\x18'  # Ctrl+X Ctrl+X, bound below to print the line and cursor.


def read_until(fd, pattern, timeout=5.0):
    data = ''
    found = re.compile(pattern)
    while found.search(data) is None:
        ready, _, _ = select.select([fd], [], [], timeout)
        if not ready:
            raise RuntimeError('timed out waiting for %r, after %r' % (pattern, data[-300:]))
        data += os.read(fd, 65536).decode('utf-8', 'replace')
    return data


# What arrives until the terminal has been quiet for a moment.
def read_quiet(fd, quiet=0.15):
    data = ''
    while True:
        ready, _, _ = select.select([fd], [], [], quiet)
        if not ready:
            return data
        data += os.read(fd, 65536).decode('utf-8', 'replace')


def main():
    job = json.load(sys.stdin)
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(job['cwd'])
        env = {'HOME': job['home'], 'PATH': job['path'], 'INPUTRC': '/dev/null', 'HISTFILE': '/dev/null', 'LC_ALL': 'C', 'TERM': 'dumb', 'PS1': PROMPT, 'PS2': ''}
        os.execvpe(job['bash'], [job['bash'], '--norc', '--noprofile', '-i'], env)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 80, 0, 0))

    def send(text):
        os.write(fd, text.encode('utf-8'))

    read_until(fd, PROMPT)
    setup = ["bind 'set bell-style none'", "bind 'set page-completions off'", "bind 'set enable-bracketed-paste off'", "bind -x '\"\\C-x\\C-x\": echo -n \"<<$READLINE_LINE|$READLINE_POINT>>\"'"]
    setup += job.get('setup', [])
    if job['disable']:
        setup.append('enable -n %s' % ' '.join(job['disable']))
    for command in setup:
        send(command + '\n')
        read_until(fd, PROMPT)

    point = re.compile(r'<<((?:.|\n)*)\|(\d+)>>')
    results = []
    for line in job['lines']:
        send(line + '\t')
        read_quiet(fd)
        send(MARK)
        found = point.search(read_until(fd, point.pattern))
        send('\x05\x15')  # to the line's end, then empty the line
        read_quiet(fd)
        send(line + '\t\t')
        listed = read_quiet(fd)
        if 'possibilities?' in listed:
            send('n')
            read_quiet(fd)
        results.append({'line': line, 'after': found.group(1), 'cursor': int(found.group(2)), 'output': listed})
        send('\x05\x15')
        read_quiet(fd)
    json.dump(results, sys.stdout)
    os.close(fd)


main()
