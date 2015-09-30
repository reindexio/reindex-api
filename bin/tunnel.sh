#!/bin/bash

# Script to run an ssh tunnel to compose

set -e
set -o xtrace

KEYFILE=`mktemp`

python2 bin/write_keyfile.py $KEYFILE

AUTOSSH_DEBUG=1 autossh -f -M 0 -N \
  -i $KEYFILE \
  -p $SSH_TUNNEL_PORT \
  -o "ServerAliveInterval 60" \
  -o "ServerAliveCountMax 3" \
  -o StrictHostKeyChecking=no \
  -o ExitOnForwardFailure=yes \
  $SSH_TUNNEL_FORWARDS \
  $SSH_TUNNEL_TARGET
