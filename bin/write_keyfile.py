#!/usr/bin/python2

# Script to write RSA key file from env

import os
import sys

if __name__ == '__main__':
    key = os.environ['SSH_TUNNEL_KEY']

    type, blob = key.split(':', 1)

    out = '-----BEGIN %s PRIVATE KEY-----\n' % type
    for n in range(0, ((len(blob) - 1) / 64) + 1):
        out += blob[n*64:(n*64)+64] + '\n'
    out += '-----END %s PRIVATE KEY-----\n' % type

    f = open(sys.argv[1], 'w')
    f.write(out)
    f.close()
