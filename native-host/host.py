#!/usr/bin/env python3
# host.py - very small native messaging host example (Linux/macOS). Reads a length-prefixed JSON from stdin.
import sys, struct, json

def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    length = struct.unpack('I', raw_length)[0]
    data = sys.stdin.buffer.read(length).decode('utf-8')
    return json.loads(data)

def send_message(msg):
    s = json.dumps(msg).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(s)))
    sys.stdout.buffer.write(s)
    sys.stdout.buffer.flush()

if __name__ == '__main__':
    while True:
        msg = read_message()
        if msg is None: break
        # Echo for demo. A real host would forward to a local model binary / HTTP endpoint and return results.
        response = {"echo": msg}
        send_message(response)
